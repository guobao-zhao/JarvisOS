import type { MemoryDocument, MemorySource } from "@jarvis-os/memory"
import type { Message } from "./Store"

export function extractMemoryDocuments(messages: Message[]): MemoryDocument[] {
  const now = Date.now()
  const lastUser = messages.findLast((m) => m.role === "user")
  const lastAssistant = messages.findLast((m) => m.role === "assistant")
  if (!lastUser || !lastAssistant) return []

  const docs: MemoryDocument[] = []

  docs.push({
    id: `conv-${lastUser.id}`,
    source: "conversation" as MemorySource,
    title: `对话：${lastUser.content.slice(0, 40)}`,
    content: `用户问：${lastUser.content}\n\nJarvis答：${lastAssistant.content.slice(0, 500)}`,
    tags: ["auto-extract"],
    createdAt: now,
    updatedAt: now,
  })

  return docs
}
