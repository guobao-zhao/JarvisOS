import { describe, expect, it } from "bun:test"
import type { MemoryDocument, MemoryService } from "../index"

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

  it("supports growth memory documents", () => {
    const doc: MemoryDocument = {
      id: "growth-report-1",
      source: "growth",
      title: "Growth report",
      content: "JarvisOS learned one candidate capability.",
      tags: ["growth"],
      createdAt: 1,
      updatedAt: 1,
    }

    expect(doc.source).toBe("growth")
  })
})
