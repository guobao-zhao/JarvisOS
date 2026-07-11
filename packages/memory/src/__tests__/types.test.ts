import { describe, expect, it } from "bun:test"
import type { MemoryService } from "../index"

describe("Memory types", () => {
  it("MemoryService has search", () => {
    const _service: MemoryService = {
      health: async () => ({
        ok: true,
        authConfigured: true,
        projectResolved: true,
        writable: true,
      }),
      search: async () => [],
      read: async () => null,
      write: async () => {},
    }
    expect(_service.search).toBeDefined()
  })
})
