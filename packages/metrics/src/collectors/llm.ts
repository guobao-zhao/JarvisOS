import type { MetricsService } from "../types"

export interface LLMCallRecord {
  readonly durationMs: number
  readonly success: boolean
  readonly error?: string
  readonly model?: string
  readonly inputChars: number
  readonly outputChars: number
  readonly inputTokens?: number
  readonly outputTokens?: number
  readonly totalTokens?: number
  readonly toolRounds?: number
}

export interface LLMMetricsSnapshot {
  readonly currentModel: string | null
  readonly totalCalls: number
  readonly totalErrors: number
  readonly errorRate: number
  readonly avgLatencyMs: number
  readonly lastLatencyMs: number
  readonly avgInputChars: number
  readonly avgOutputChars: number
  readonly totalTokens: number
  readonly lastTotalTokens: number
  readonly avgInputTokens: number
  readonly avgOutputTokens: number
  readonly history: readonly number[]
}

const HISTORY_LIMIT = 30

export async function recordLLMCall(service: MetricsService, record: LLMCallRecord): Promise<void> {
  const now = Date.now()
  await Promise.all([
    service.record({
      category: "llm",
      name: "request",
      value: record.durationMs,
      unit: "ms",
      timestamp: now,
      metadata: {
        success: record.success,
        error: record.error,
        model: record.model,
        inputChars: record.inputChars,
        outputChars: record.outputChars,
        inputTokens: record.inputTokens,
        outputTokens: record.outputTokens,
        totalTokens: record.totalTokens,
        toolRounds: record.toolRounds,
      },
    }),
    service.record({
      category: "llm",
      name: record.success ? "success" : "error",
      value: 1,
      unit: "count",
      timestamp: now,
    }),
  ])
}

export async function getLLMMetricsSnapshot(service: MetricsService): Promise<LLMMetricsSnapshot> {
  const events = await service.query({ category: "llm", name: "request", limit: HISTORY_LIMIT })
  const rows = events.map((e) => ({
    latency: e.value,
    success: e.metadata?.success !== false,
    inputChars: Number(e.metadata?.inputChars ?? 0),
    outputChars: Number(e.metadata?.outputChars ?? 0),
    inputTokens: Number(e.metadata?.inputTokens ?? 0),
    outputTokens: Number(e.metadata?.outputTokens ?? 0),
    totalTokens: Number(e.metadata?.totalTokens ?? 0),
    model: typeof e.metadata?.model === "string" ? e.metadata.model : null,
  }))

  const totalCalls = rows.length
  const totalErrors = rows.filter((r) => !r.success).length
  const totalLatency = rows.reduce((sum, r) => sum + r.latency, 0)
  const totalInputChars = rows.reduce((sum, r) => sum + r.inputChars, 0)
  const totalOutputChars = rows.reduce((sum, r) => sum + r.outputChars, 0)
  const totalTokens = rows.reduce((sum, r) => sum + r.totalTokens, 0)
  const totalInputTokens = rows.reduce((sum, r) => sum + r.inputTokens, 0)
  const totalOutputTokens = rows.reduce((sum, r) => sum + r.outputTokens, 0)

  return {
    currentModel: rows[0]?.model ?? null,
    totalCalls,
    totalErrors,
    errorRate: totalCalls > 0 ? (totalErrors / totalCalls) * 100 : 0,
    avgLatencyMs: totalCalls > 0 ? Math.round(totalLatency / totalCalls) : 0,
    lastLatencyMs: rows[0]?.latency ?? 0,
    avgInputChars: totalCalls > 0 ? Math.round(totalInputChars / totalCalls) : 0,
    avgOutputChars: totalCalls > 0 ? Math.round(totalOutputChars / totalCalls) : 0,
    totalTokens,
    lastTotalTokens: rows[0]?.totalTokens ?? 0,
    avgInputTokens: totalCalls > 0 ? Math.round(totalInputTokens / totalCalls) : 0,
    avgOutputTokens: totalCalls > 0 ? Math.round(totalOutputTokens / totalCalls) : 0,
    history: rows.map((r) => r.latency).reverse(),
  }
}
