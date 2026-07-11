import { describe, expect, it } from "bun:test"
import { LLMWikiClient } from "../client"
import type { MemoryClientConfig } from "../config"

describe("LLMWikiClient", () => {
  const baseConfig: MemoryClientConfig = {
    baseURL: "http://127.0.0.1:19828",
    token: "test-token",
    project: "current",
    outboxDir: "",
  }

  it("returns health=false when fetch fails", async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async () => {
      throw new Error("connection refused")
    }) as unknown as typeof fetch
    const client = new LLMWikiClient(baseConfig)
    const health = await client.health()
    globalThis.fetch = originalFetch
    expect(health.ok).toBe(false)
    expect(health.writable).toBe(false)
  })

  it("calls search endpoint with query and topK", async () => {
    let captured: { url: string; body: unknown } | undefined

    const originalFetch = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      captured = { url: input.toString(), body: init?.body ? JSON.parse(init.body as string) : undefined }
      return new Response(JSON.stringify({ results: [{ id: "m1", title: "t", content: "c", score: 0.9, source: "conversation" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }) as unknown as typeof fetch

    const client = new LLMWikiClient(baseConfig)
    const hits = await client.search("hello", { topK: 3, includeContent: true })

    globalThis.fetch = originalFetch

    expect(hits.length).toBe(1)
    expect(hits[0].id).toBe("m1")
    expect(captured?.url).toContain("/api/v1/projects/current/search")
    expect(captured?.body).toEqual({ query: "hello", topK: 3, includeContent: true })
  })
})
