import { join } from "node:path"
import { createMetricsService } from "@jarvis-os/metrics"
import type { MetricsService } from "@jarvis-os/metrics"
import {
  getLLMMetricsSnapshot,
  recordLLMCall as recordLLMCallCollector,
  type LLMCallRecord,
  type LLMMetricsSnapshot,
} from "@jarvis-os/metrics/collectors/llm"
import {
  getMemoryMetricsSnapshot,
  recordMemoryRecall as recordMemoryRecallCollector,
  type MemoryRecallRecord,
  type MemoryMetricsSnapshot,
} from "@jarvis-os/metrics/collectors/memory"
import {
  createSystemCollector,
  type SystemMetricsSnapshot,
} from "@jarvis-os/metrics/collectors/system"

export interface JarvisMetricsSnapshot {
  system: SystemMetricsSnapshot | null
  llm: LLMMetricsSnapshot | null
  memory: MemoryMetricsSnapshot | null
}

export interface JarvisMetricsInitOptions {
  userDataPath: string
  onUpdate?: (snapshot: JarvisMetricsSnapshot) => void
}

let service: MetricsService | null = null
let latestSnapshot: JarvisMetricsSnapshot = { system: null, llm: null, memory: null }
let stopCollector: (() => void) | null = null
let onUpdateCallback: ((snapshot: JarvisMetricsSnapshot) => void) | null = null

function updateAndBroadcast(partial: Partial<JarvisMetricsSnapshot>) {
  latestSnapshot = { ...latestSnapshot, ...partial }
  onUpdateCallback?.(latestSnapshot)
}

export async function initJarvisMetrics(options: JarvisMetricsInitOptions): Promise<void> {
  if (service) return

  onUpdateCallback = options.onUpdate ?? null
  service = createMetricsService({ filename: join(options.userDataPath, "metrics.db") })
  await service.ensureSchema()

  const collector = createSystemCollector(service, {
    intervalMs: 2000,
    historyLimit: 60,
    onSnapshot: (snapshot) => updateAndBroadcast({ system: snapshot }),
  })

  stopCollector = collector.start()
}

export async function recordLLMCall(record: LLMCallRecord): Promise<void> {
  if (!service) return
  await recordLLMCallCollector(service, record)
  const snapshot = await getLLMMetricsSnapshot(service)
  updateAndBroadcast({ llm: snapshot })
}

export async function recordMemoryRecall(record: MemoryRecallRecord): Promise<void> {
  if (!service) return
  await recordMemoryRecallCollector(service, record)
  const snapshot = await getMemoryMetricsSnapshot(service)
  updateAndBroadcast({ memory: snapshot })
}

export function getMetricsSnapshot(): JarvisMetricsSnapshot {
  return latestSnapshot
}

export function stopJarvisMetrics(): void {
  if (stopCollector) {
    stopCollector()
    stopCollector = null
  }
  service = null
  latestSnapshot = { system: null, llm: null, memory: null }
  onUpdateCallback = null
}
