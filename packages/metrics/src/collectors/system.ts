import * as os from "node:os"
import type { MetricEvent, MetricsService } from "../types"

export interface SystemMetricsSnapshot {
  readonly timestamp: number
  readonly cpu: {
    readonly percent: number
    readonly cores: number
  }
  readonly memory: {
    readonly usedPercent: number
    readonly usedGB: number
    readonly totalGB: number
  }
  readonly loadAvg: number
  readonly history: {
    readonly cpu: readonly number[]
    readonly memory: readonly number[]
  }
}

export interface SystemCollectorOptions {
  readonly intervalMs?: number
  readonly historyLimit?: number
  readonly onSnapshot?: (snapshot: SystemMetricsSnapshot) => void
}

interface CpuSnapshot {
  readonly idle: number
  readonly total: number
}

function readCpuTotals(): CpuSnapshot {
  let idle = 0
  let total = 0
  for (const cpu of os.cpus()) {
    idle += cpu.times.idle
    for (const value of Object.values(cpu.times)) {
      total += value
    }
  }
  return { idle, total }
}

function computeCpuPercent(previous: CpuSnapshot, current: CpuSnapshot): number {
  const idleDelta = current.idle - previous.idle
  const totalDelta = current.total - previous.total
  if (totalDelta <= 0) return 0
  const percent = (1 - idleDelta / totalDelta) * 100
  return Math.min(100, Math.max(0, percent))
}

function formatMetric(category: string, name: string, value: number, unit?: string): Omit<MetricEvent, "id"> {
  return {
    category,
    name,
    value,
    unit,
    timestamp: Date.now(),
  }
}

export function createSystemCollector(service: MetricsService, options: SystemCollectorOptions = {}) {
  const intervalMs = options.intervalMs ?? 2000
  const historyLimit = options.historyLimit ?? 60
  let previousCpu: CpuSnapshot = readCpuTotals()
  let timer: ReturnType<typeof setInterval> | null = null
  let running = false

  async function collect(): Promise<SystemMetricsSnapshot> {
    const now = Date.now()
    const currentCpu = readCpuTotals()
    const cpuPercent = computeCpuPercent(previousCpu, currentCpu)
    previousCpu = currentCpu

    const total = os.totalmem()
    const free = os.freemem()
    const used = total - free
    const usedPercent = total > 0 ? (used / total) * 100 : 0
    const loadAvg = os.loadavg()[0] ?? 0

    const [cpuHistory, memoryHistory] = await Promise.all([
      service.history("system", "cpu.percent", historyLimit),
      service.history("system", "memory.used_percent", historyLimit),
    ])

    // Record the new samples after fetching history so the next cycle sees them.
    await Promise.all([
      service.record(formatMetric("system", "cpu.percent", cpuPercent, "%")),
      service.record(formatMetric("system", "memory.used_percent", usedPercent, "%")),
      service.record(formatMetric("system", "memory.used_gb", used / 1024 ** 3, "GB")),
      service.record(formatMetric("system", "memory.total_gb", total / 1024 ** 3, "GB")),
      service.record(formatMetric("system", "loadavg.1m", loadAvg)),
    ])

    return {
      timestamp: now,
      cpu: { percent: Math.round(cpuPercent * 10) / 10, cores: os.cpus().length },
      memory: {
        usedPercent: Math.round(usedPercent * 10) / 10,
        usedGB: Math.round((used / 1024 ** 3) * 100) / 100,
        totalGB: Math.round((total / 1024 ** 3) * 100) / 100,
      },
      loadAvg: Math.round(loadAvg * 100) / 100,
      history: {
        cpu: cpuHistory.map((h) => h.value),
        memory: memoryHistory.map((h) => h.value),
      },
    }
  }

  function start() {
    if (running) return () => {}
    running = true

    // Kick off an initial collection immediately.
    void collect().then((snapshot) => options.onSnapshot?.(snapshot))

    timer = setInterval(() => {
      void collect().then((snapshot) => options.onSnapshot?.(snapshot))
    }, intervalMs)

    return () => {
      if (timer) clearInterval(timer)
      timer = null
      running = false
    }
  }

  return { start, collect }
}
