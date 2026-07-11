import type { IpcMainEvent } from "electron"
import { createToolRegistry, MemorySkill, type ToolRegistry, type ToolUsageMetric } from "@jarvis-os/tools"

import { getKimiCredentials } from "./jarvis-credential"
import { recordLLMCall } from "./jarvis-metrics"
import { prepareJarvisMemoryEnv } from "./jarvis-memory"

export interface StreamChatMessage {
  role: "user" | "assistant" | "system" | "tool"
  content: string
  tool_call_id?: string
}

interface ToolCallFunction {
  name?: string
  arguments?: string
}

interface StreamedToolCall {
  id: string
  type: "function"
  function: ToolCallFunction
}

interface ChatCompletionChunk {
  choices?: Array<{
    delta?: {
      role?: string
      content?: string | null
      tool_calls?: Array<Partial<StreamedToolCall> & { index?: number }>
    }
    finish_reason?: string | null
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

function parseSseLine(line: string): ChatCompletionChunk | null {
  const trimmed = line.trim()
  if (!trimmed || !trimmed.startsWith("data:")) return null
  const data = trimmed.slice(5).trim()
  if (data === "[DONE]") return null
  try {
    return JSON.parse(data) as ChatCompletionChunk
  } catch {
    return null
  }
}

function toOpenAITools(registry: ToolRegistry): Array<{
  type: "function"
  function: { name: string; description: string; parameters: unknown }
}> {
  return registry.list().map((def) => ({
    type: "function" as const,
    function: {
      name: def.name,
      description: def.description,
      parameters: def.inputSchema,
    },
  }))
}

function accumulateToolCalls(
  calls: Map<number, StreamedToolCall>,
  deltas: Array<Partial<StreamedToolCall> & { index?: number }>,
): void {
  for (const delta of deltas) {
    const index = delta.index ?? 0
    let existing = calls.get(index)
    if (!existing) {
      existing = {
        id: delta.id ?? "",
        type: "function",
        function: {},
      }
      calls.set(index, existing)
    }
    if (delta.id) existing.id = delta.id
    if (delta.type) existing.type = delta.type as "function"
    if (delta.function) {
      if (delta.function.name) {
        existing.function.name = (existing.function.name ?? "") + delta.function.name
      }
      if (delta.function.arguments) {
        existing.function.arguments = (existing.function.arguments ?? "") + delta.function.arguments
      }
    }
  }
}

const toolsReady = prepareJarvisMemoryEnv()
  .then(() => {
    const registry = createToolRegistry()
    MemorySkill.register(registry)
    return registry
  })
  .catch((err) => {
    console.error("[jarvis-llm] failed to prepare tools:", err)
    throw err
  })

export async function getToolUsageMetrics(): Promise<readonly ToolUsageMetric[]> {
  const registry = await toolsReady
  return Array.from(registry.getUsageMetrics().values())
}

export async function handleJarvisStreamChat(event: IpcMainEvent, messages: StreamChatMessage[]) {
  const creds = await getKimiCredentials()
  const sender = event.sender
  const registry = await toolsReady

  if (!creds) {
    sender.send("jarvis:stream-chat:error", "Kimi credentials not found")
    return
  }

  const MAX_TOOL_ROUNDS = 3
  let toolRounds = 0
  let currentMessages = [...messages]

  while (toolRounds <= MAX_TOOL_ROUNDS) {
    const roundStart = performance.now()
    const inputChars = currentMessages.reduce((sum, m) => sum + m.content.length, 0)

    try {
      const response = await fetch(`${creds.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${creds.apiKey}`,
        },
        body: JSON.stringify({
          model: "kimi-k2-0711-preview",
          messages: currentMessages,
          stream: true,
          tools: toOpenAITools(registry),
          tool_choice: "auto",
        }),
      })

      if (!response.ok) {
        const body = await response.text().catch(() => "")
        void recordLLMCall({
          durationMs: Math.round(performance.now() - roundStart),
          success: false,
          error: `Kimi API ${response.status}`,
          model: "kimi-k2-0711-preview",
          inputChars,
          outputChars: 0,
          toolRounds,
        })
        sender.send("jarvis:stream-chat:error", `Kimi API ${response.status}: ${body}`)
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        void recordLLMCall({
          durationMs: Math.round(performance.now() - roundStart),
          success: false,
          error: "Response body is not readable",
          model: "kimi-k2-0711-preview",
          inputChars,
          outputChars: 0,
          toolRounds,
        })
        sender.send("jarvis:stream-chat:error", "Response body is not readable")
        return
      }

      const decoder = new TextDecoder()
      let buffer = ""
      let assistantContent = ""
      const toolCalls = new Map<number, StreamedToolCall>()
      let lastUsage: ChatCompletionChunk["usage"]

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          const chunk = parseSseLine(line)
          if (!chunk) continue
          const delta = chunk.choices?.[0]?.delta
          if (delta?.content) {
            assistantContent += delta.content
            sender.send("jarvis:stream-chat:delta", delta.content)
          }
          if (delta?.tool_calls) {
            accumulateToolCalls(toolCalls, delta.tool_calls)
          }
          if (chunk.usage) {
            lastUsage = chunk.usage
          }
        }
      }

      void recordLLMCall({
        durationMs: Math.round(performance.now() - roundStart),
        success: true,
        model: "kimi-k2-0711-preview",
        inputChars,
        outputChars: assistantContent.length,
        inputTokens: lastUsage?.prompt_tokens,
        outputTokens: lastUsage?.completion_tokens,
        totalTokens: lastUsage?.total_tokens,
        toolRounds,
      })

      const calls = Array.from(toolCalls.values())
        .filter((c) => c.id && c.function.name)
        .sort((a, b) => {
          // Map keys are lost; rely on id order is fine for small arrays
          return a.id.localeCompare(b.id)
        })

      if (calls.length === 0) {
        sender.send("jarvis:stream-chat:done")
        return
      }

      // Append the assistant message that requested tools
      currentMessages.push({
        role: "assistant",
        content: assistantContent,
        tool_calls: calls.map((c) => ({
          id: c.id,
          type: c.type,
          function: {
            name: c.function.name!,
            arguments: c.function.arguments ?? "{}",
          },
        })),
      } as any)

      // Execute tools and append results
      for (const call of calls) {
        let resultText = ""
        try {
          const args = call.function.arguments ? JSON.parse(call.function.arguments) : {}
          const result = await registry.execute(call.function.name!, args)
          resultText = JSON.stringify(result)
          registry.recordUsage(call.function.name!, result.ok ? "hit" : "miss")
        } catch (err) {
          resultText = JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) })
          registry.recordUsage(call.function.name!, "error")
        }
        currentMessages.push({
          role: "tool",
          content: resultText,
          tool_call_id: call.id,
        })
      }

      toolRounds += 1
      // Continue loop so the model can see tool results and respond
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error("[jarvis-llm] chat loop error:", error)
      void recordLLMCall({
        durationMs: Math.round(performance.now() - roundStart),
        success: false,
        error: message,
        model: "kimi-k2-0711-preview",
        inputChars,
        outputChars: 0,
        toolRounds,
      })
      sender.send("jarvis:stream-chat:error", message)
      return
    }
  }

  sender.send("jarvis:stream-chat:done")
}
