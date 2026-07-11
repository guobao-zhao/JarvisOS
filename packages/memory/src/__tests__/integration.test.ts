import { describe, expect, it } from "bun:test"
import { createMemoryService } from "../service"

describe("Memory integration", () => {
  const token = process.env.LLM_WIKI_API_TOKEN

  // NOTE: LLM-wiki ingests source files asynchronously and may not index them
  // immediately. For a stable E2E assertion we write directly into the wiki
  // directory, which is searchable as soon as the file exists.
  it.skipIf(!token)("writes a doc and recalls it via search", async () => {
    process.env.LLM_WIKI_PROJECT = "512a27a3-3b7f-43af-aa6a-1a7b73cf5287"
    process.env.JARVIS_MEMORY_OUTBOX =
      "/Users/Zhuanz/Jarvis/memory/Jarvis记忆系统/Jarvis/wiki/jarvisos-memory"

    const service = createMemoryService()
    const health = await service.health()
    expect(health.ok).toBe(true)
    expect(health.writable).toBe(true)

    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const doc = {
      id: `e2e-${unique}`,
      source: "conversation" as const,
      title: `E2E 测试 ${unique}`,
      content: `宝哥说：我叫宝哥-${unique}`,
      tags: ["e2e"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    await service.write(doc)

    // Direct wiki writes are searchable almost immediately.
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const hits = await service.search(`宝哥-${unique}`, { topK: 5, includeContent: true })
    const matched = hits.find((h) => h.content.includes(`宝哥-${unique}`))
    expect(matched).toBeDefined()
  }, 30_000)
})
