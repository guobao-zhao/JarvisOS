import type { MetricsService } from "../types"

export interface MemoryRecallRecord {
  readonly durationMs: number
  readonly hitCount: number
  readonly query?: string
}

export interface MemoryMetricsSnapshot {
  readonly totalRecalls: number
  readonly avgLatencyMs: number
  readonly lastLatencyMs: number
  readonly totalHits: number
  readonly hitRate: number
  readonly history: readonly number[]
}

const HISTORY_LIMIT = 30

export async function recordMemoryRecall(service: MetricsService, record: MemoryRecallRecord): Promise<void> {
  const now = Date.now()
  await service.record({
    category: "memory",
    name: "recall",
    value: record.durationMs,
    unit: "ms",
    timestamp: now,
    metadata: {
      hitCount: record.hitCount,
      queryLength: record.query?.length ?? 0,
    },
  })
}

export async function getMemoryMetricsSnapshot(service: MetricsService): Promise<MemoryMetricsSnapshot> {
  const events = await service.query({ category: "memory", name: "recall", limit: HISTORY_LIMIT })
  const rows = events.map((e) => ({
    latency: e.value,
    hitCount: Number(e.metadata?.hitCount ?? 0),
  }))

  const totalRecalls = rows.length
  const totalHits = rows.reduce((sum, r) => sum + r.hitCount, 0)
  const totalLatency = rows.reduce((sum, r) => sum + r.latency, 0)

  return {
    totalRecalls,
    avgLatencyMs: totalRecalls > 0 ? Math.round(totalLatency / totalRecalls) : 0,
    lastLatencyMs: rows[rows.length - 1]?.latency ?? 0,
    totalHits,
    hitRate: totalRecalls > 0 ? (totalHits / totalRecalls) * 100 : 0,
    history: rows.map((r) => r.latency),
  }
}
