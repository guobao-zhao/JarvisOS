import { describe, expect, it } from "bun:test"
import { createMemoryService } from "../service"

describe("createMemoryService", () => {
  it("is not writable when env is missing", async () => {
    const service = createMemoryService()
    const health = await service.health()
    expect(health.writable).toBe(false)
  })
})
