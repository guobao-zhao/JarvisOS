import type { JarvisModelConfig } from "./jarvis-vault"

export type JarvisModelConnectionResult =
  | { ok: true; status: number; latencyMs: number; modelID: string }
  | { ok: false; status?: number; latencyMs: number; modelID: string; error: string }

export type JarvisModelConnectionTestOptions = {
  fetch?: typeof fetch
  timeoutMs?: number
}

function normalizeBaseURL(baseURL: string) {
  return baseURL.trim().replace(/\/+$/, "")
}

export function resolveChatCompletionsURL(baseURL: string) {
  const normalized = normalizeBaseURL(baseURL)
  const parsed = new URL(normalized)

  if (parsed.hostname === "api.kimi.com" && parsed.pathname === "/coding") {
    return "https://api.moonshot.cn/v1/chat/completions"
  }

  if (parsed.pathname.endsWith("/chat/completions")) {
    return parsed.toString()
  }

  return `${normalized}/chat/completions`
}

function buildRequestBody(config: JarvisModelConfig) {
  return {
    model: config.modelID,
    messages: [{ role: "user", content: "ping" }],
    stream: false,
  }
}

export async function testModelConnection(
  config: JarvisModelConfig,
  options: JarvisModelConnectionTestOptions = {},
): Promise<JarvisModelConnectionResult> {
  const fetchImpl = options.fetch ?? globalThis.fetch
  const timeoutMs = options.timeoutMs ?? 10_000
  const startedAt = performance.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(resolveChatCompletionsURL(config.baseURL), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(buildRequestBody(config)),
      signal: controller.signal,
    })

    const latencyMs = Math.round(performance.now() - startedAt)
    if (!response.ok) {
      const body = await response.text().catch(() => "")
      return {
        ok: false,
        status: response.status,
        latencyMs,
        modelID: config.modelID,
        error: `模型接口 ${response.status}: ${body || response.statusText}`,
      }
    }

    return {
      ok: true,
      status: response.status,
      latencyMs,
      modelID: config.modelID,
    }
  } catch (error) {
    const latencyMs = Math.round(performance.now() - startedAt)
    const message = error instanceof Error ? error.message : String(error)
    const timeoutMessage = message.toLowerCase().includes("aborted") || message.toLowerCase().includes("timeout")
      ? "模型连接测试超时"
      : message
    return {
      ok: false,
      latencyMs,
      modelID: config.modelID,
      error: timeoutMessage,
    }
  } finally {
    clearTimeout(timeout)
  }
}
