import type { IpcMainEvent } from "electron"
import { getKimiCredentials } from "./jarvis-credential"

export interface StreamChatMessage {
  role: "user" | "assistant"
  content: string
}

function parseSseLine(line: string): { content?: string } | null {
  const trimmed = line.trim()
  if (!trimmed || !trimmed.startsWith("data:")) return null
  const data = trimmed.slice(5).trim()
  if (data === "[DONE]") return null
  try {
    const chunk = JSON.parse(data) as {
      choices?: { delta?: { content?: string | null } }[]
    }
    const content = chunk.choices?.[0]?.delta?.content
    return content ? { content } : null
  } catch {
    return null
  }
}

export async function handleJarvisStreamChat(event: IpcMainEvent, messages: StreamChatMessage[]) {
  const creds = await getKimiCredentials()
  const sender = event.sender

  if (!creds) {
    sender.send("jarvis:stream-chat:error", "Kimi credentials not found")
    return
  }

  try {
    const response = await fetch(`${creds.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creds.apiKey}`,
      },
      body: JSON.stringify({
        model: "kimi-k2-0711-preview",
        messages,
        stream: true,
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => "")
      sender.send("jarvis:stream-chat:error", `Kimi API ${response.status}: ${body}`)
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      sender.send("jarvis:stream-chat:error", "Response body is not readable")
      return
    }

    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""

      for (const line of lines) {
        const delta = parseSseLine(line)
        if (delta?.content) {
          sender.send("jarvis:stream-chat:delta", delta.content)
        }
      }
    }

    sender.send("jarvis:stream-chat:done")
  } catch (error) {
    sender.send("jarvis:stream-chat:error", error instanceof Error ? error.message : String(error))
  }
}
