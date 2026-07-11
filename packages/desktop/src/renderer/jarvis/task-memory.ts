import type { MemoryDocument } from "@jarvis-os/memory"
import type { TaskSession } from "./Store"

export function extractTaskMemoryDocument(task: TaskSession): MemoryDocument {
  const now = Date.now()

  const conversationText = task.messages
    .map((m) => `${m.role === "user" ? "宝哥" : "Jarvis"}: ${m.content}`)
    .join("\n\n")

  const summary = task.messages.length <= 2
    ? conversationText
    : `任务：${task.title}\n\n${conversationText.slice(0, 1500)}`

  return {
    id: task.id,
    source: "task",
    title: task.title || "未命名任务",
    content: summary,
    tags: ["task", "jarvis-os"],
    createdAt: task.createdAt,
    updatedAt: now,
  }
}
