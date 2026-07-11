import { createSignal } from "solid-js"
import type { JarvisMetricsSnapshot } from "../../preload/types"
import { sendUserMessage } from "./send-message"
import { jarvisActions, jarvisStore } from "./Store"
import { streamChat } from "./LLM"
import { voiceAPI } from "./Voice"

export interface ConsciousnessMessage {
  text: string
  speak?: boolean
}

const [currentMessage, setCurrentMessage] = createSignal<ConsciousnessMessage | null>(null)
const [isVisible, setIsVisible] = createSignal(false)

let queue: ConsciousnessMessage[] = []
let presenting = false
let observeTimer: ReturnType<typeof setInterval> | null = null
const lastSpokenAt: Record<string, number> = {}

// Threshold latches: only alert when crossing from normal into high,
// so we don't repeat the same warning every observation cycle.
let wasHighCpu = false
let wasHighMemory = false
let wasHighLLMError = false
let wasHighLLMLatency = false
let wasLowMemoryHit = false

const COOLDOWN_MS = 120_000

function canSpeak(category: string): boolean {
  const now = Date.now()
  if (!lastSpokenAt[category] || now - lastSpokenAt[category] > COOLDOWN_MS) {
    lastSpokenAt[category] = now
    return true
  }
  return false
}

function presentNext() {
  if (presenting || queue.length === 0) return
  presenting = true
  const next = queue.shift()!
  setCurrentMessage(next)
  setIsVisible(true)
  if (next.speak) {
    voiceAPI.speak(next.text)
  }
}

export function say(text: string, speak = false) {
  queue.push({ text, speak })
  presentNext()
}

export function dismiss() {
  setIsVisible(false)
  setTimeout(() => {
    setCurrentMessage(null)
    presenting = false
    presentNext()
  }, 400)
}

export { currentMessage, isVisible }

function isGreeting(text: string): boolean {
  return /^\s*(贾维斯|Jarvis|JARVIS)[\s，,。！?.!]*$/i.test(text.trim())
}

async function findDuplicateTask(text: string): Promise<string | null> {
  const activeIds = new Set(jarvisStore.taskSessions.filter((t) => t.status === "active").map((t) => t.id))
  const descriptions = jarvisStore.taskDescriptions.filter((d) => activeIds.has(d.taskId))
  if (descriptions.length === 0) return null

  const messages = [
    {
      role: "system" as const,
      content:
        "你是 Jarvis，宝哥的私人智能管家。请判断用户的新输入是否和已有任务描述列表中的某个任务语义相近。\n只返回 JSON，格式：{\"taskId\": \"...\"} 或 {\"taskId\": null}。不要解释。",
    },
    {
      role: "user" as const,
      content: `已有任务描述：\n${JSON.stringify(descriptions.map((d) => ({ taskId: d.taskId, description: d.description })), null, 2)}\n\n新输入："${text}"`,
    },
  ]

  let json = ""
  await streamChat(
    messages,
    (delta) => {
      json += delta
    },
    () => {
      // ignore errors
    },
  )

  try {
    const cleaned = json.replace(/```json/g, "").replace(/```/g, "").trim()
    const result = JSON.parse(cleaned) as { taskId?: string | null }
    const taskId = result.taskId
    if (taskId && activeIds.has(taskId)) return taskId
  } catch {
    // ignore parse errors
  }
  return null
}

export async function processUserInput(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return

  if (isGreeting(trimmed)) {
    jarvisActions.setIsListening(false)
    voiceAPI.stopRecognition()
    jarvisActions.setStatus("idle")
    say("宝哥，我在。", true)
    jarvisActions.resetInput()
    return
  }

  const duplicateTaskId = await findDuplicateTask(trimmed)
  if (duplicateTaskId) {
    jarvisActions.setIsListening(false)
    voiceAPI.stopRecognition()
    jarvisActions.expandTask(duplicateTaskId)
    say("宝哥，这个任务胶囊和你现在要做的事情很接近，要不要先看看它？", true)
    jarvisActions.resetInput()
    return
  }

  await sendUserMessage(trimmed)
}

function checkObservations(): ConsciousnessMessage[] {
  const messages: ConsciousnessMessage[] = []
  const snapshot = window.api.jarvisMetricsSnapshot
    ? (window.api.jarvisMetricsSnapshot() as Promise<JarvisMetricsSnapshot>)
    : null

  const activeTasks = jarvisStore.taskSessions.filter((t) => t.status === "active")
  if (activeTasks.length > 3 && canSpeak("too-many-tasks")) {
    messages.push({
      text: `宝哥，当前有 ${activeTasks.length} 个任务在跑，建议先集中处理一个。`,
      speak: true,
    })
  }

  void snapshot?.then((s) => {
    const system = s.system
    if (system) {
      const cpuHigh = system.cpu.percent > 80
      if (cpuHigh && !wasHighCpu && canSpeak("high-cpu")) {
        say("宝哥，CPU 负载有点高，注意一下。", true)
      }
      wasHighCpu = cpuHigh

      const memoryHigh = system.memory.usedPercent > 90
      if (memoryHigh && !wasHighMemory && canSpeak("high-memory")) {
        say("宝哥，内存占用很高，建议留意系统状态。", true)
      }
      wasHighMemory = memoryHigh
    }

    const llm = s.llm
    if (llm) {
      const llmErrorHigh = llm.totalCalls > 5 && llm.errorRate > 20
      if (llmErrorHigh && !wasHighLLMError && canSpeak("high-llm-error")) {
        say("宝哥，最近模型调用失败率偏高，我记录一下。", true)
      }
      wasHighLLMError = llmErrorHigh

      const llmLatencyHigh = llm.avgLatencyMs > 3000
      if (llmLatencyHigh && !wasHighLLMLatency && canSpeak("high-llm-latency")) {
        say("宝哥，模型响应有点慢，可能需要等一下。", true)
      }
      wasHighLLMLatency = llmLatencyHigh
    }

    const memory = s.memory
    if (memory) {
      const memoryHitLow = memory.totalRecalls > 5 && memory.hitRate < 30
      if (memoryHitLow && !wasLowMemoryHit && canSpeak("low-memory-hit")) {
        say("宝哥，最近记忆命中率偏低，关键事情我可以帮你记下来。", true)
      }
      wasLowMemoryHit = memoryHitLow
    }
  })

  return messages
}

export function startObserving(intervalMs = 30_000) {
  if (observeTimer) return
  observeTimer = setInterval(() => {
    const observations = checkObservations()
    for (const msg of observations) {
      say(msg.text, msg.speak)
    }
  }, intervalMs)
}

export function stopObserving() {
  if (observeTimer) {
    clearInterval(observeTimer)
    observeTimer = null
  }
}
