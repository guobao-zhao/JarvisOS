import { describe, expect, test } from "bun:test"
import { resolveChatCompletionsURL, testModelConnection } from "./jarvis-model-connection"
import type { JarvisModelConfig } from "./jarvis-vault"

const config: JarvisModelConfig = {
  providerType: "openai-compatible",
  baseURL: "https://example.test/v1/",
  apiKey: "test-key",
  modelID: "test-model",
}

describe("testModelConnection", () => {
  test("normalizes Kimi Coding shortcut into the Moonshot OpenAI-compatible endpoint", () => {
    expect(resolveChatCompletionsURL("https://api.kimi.com/coding")).toBe("https://api.moonshot.cn/v1/chat/completions")
  })

  test("keeps a full chat completions endpoint unchanged", () => {
    expect(resolveChatCompletionsURL("https://proxy.example.test/v1/chat/completions")).toBe("https://proxy.example.test/v1/chat/completions")
  })

  test("checks an OpenAI-compatible chat completion endpoint with the configured model", async () => {
    let captured: { url: string; init: RequestInit } | null = null
    const result = await testModelConnection(config, {
      timeoutMs: 100,
      fetch: async (url, init) => {
        captured = { url: String(url), init: init ?? {} }
        return new Response(JSON.stringify({ choices: [{ message: { content: "pong" } }] }), { status: 200 })
      },
    })

    expect(result.ok).toBe(true)
    expect(captured?.url).toBe("https://example.test/v1/chat/completions")
    expect(captured?.init.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer test-key",
    })
    expect(JSON.parse(String(captured?.init.body))).toMatchObject({
      model: "test-model",
      messages: [{ role: "user", content: "ping" }],
      stream: false,
    })
  })

  test("returns the provider error without throwing", async () => {
    const result = await testModelConnection(config, {
      timeoutMs: 100,
      fetch: async () => new Response("bad key", { status: 401 }),
    })

    expect(result).toMatchObject({ ok: false, error: "模型接口 401: bad key" })
  })
})
