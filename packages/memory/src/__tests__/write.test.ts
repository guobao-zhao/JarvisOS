import { mkdir, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { describe, expect, it } from "bun:test"
import { LLMWikiClient } from "../client"
import type { MemoryClientConfig } from "../config"
import { readMemoryDoc, writeMemoryDoc } from "../write"

describe("write/read memory docs", () => {
  const baseConfig: MemoryClientConfig = {
    baseURL: "http://127.0.0.1:19828",
    token: "",
    project: "current",
    outboxDir: "",
  }

  it("fails to write when outboxDir is empty", async () => {
    const client = new LLMWikiClient(baseConfig)
    const result = await writeMemoryDoc(
      {
        id: "m1",
        source: "conversation",
        title: "t",
        content: "body",
        tags: [],
        createdAt: 1,
        updatedAt: 1,
      },
      client,
      "",
    )
    expect(result.ok).toBe(false)
  })

  it("writes markdown and reads it back", async () => {
    const outbox = join(import.meta.dir, "..", "..", "tmp-test-outbox")
    await rm(outbox, { recursive: true, force: true })
    await mkdir(outbox, { recursive: true })

    const originalFetch = globalThis.fetch
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })) as unknown as typeof fetch

    const client = new LLMWikiClient(baseConfig)
    const doc = {
      id: "m2",
      source: "conversation" as const,
      title: "Hello",
      content: "world",
      tags: ["a", "b"],
      createdAt: 1000,
      updatedAt: 2000,
      relations: ["m1"],
    }

    const result = await writeMemoryDoc(doc, client, outbox)
    expect(result.ok).toBe(true)

    const read = await readMemoryDoc("m2", outbox)
    expect(read).not.toBeNull()
    expect(read?.id).toBe("m2")
    expect(read?.title).toBe("Hello")
    expect(read?.content).toBe("world")
    expect(read?.tags).toEqual(["a", "b"])
    expect(read?.relations).toEqual(["m1"])

    globalThis.fetch = originalFetch
    await rm(outbox, { recursive: true, force: true })
  })
})
