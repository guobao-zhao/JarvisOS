import { afterEach, describe, expect, it } from "bun:test"
import { createMemoryService } from "../service"

const envKeys = ["LLM_WIKI_BASE_URL", "LLM_WIKI_API_TOKEN", "LLM_WIKI_PROJECT", "JARVIS_MEMORY_OUTBOX"] as const
const originalEnv = new Map<string, string | undefined>()

function isolateMemoryEnv() {
  for (const key of envKeys) {
    originalEnv.set(key, process.env[key])
    delete process.env[key]
  }
  process.env.LLM_WIKI_BASE_URL = "http://127.0.0.1:1"
  process.env.JARVIS_MEMORY_OUTBOX = ""
}

afterEach(() => {
  for (const key of envKeys) {
    const value = originalEnv.get(key)
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  originalEnv.clear()
})

describe("createMemoryService", () => {
  it("is not writable when env is missing", async () => {
    isolateMemoryEnv()
    const service = createMemoryService()
    const health = await service.health()
    expect(health.writable).toBe(false)
  })
})
