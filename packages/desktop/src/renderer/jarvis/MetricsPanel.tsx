import { createSignal, onCleanup, onMount } from "solid-js"
import type { JarvisMetricsSnapshot } from "../../preload/types"

interface StatusRowProps {
  label: string
  value: string
  sub?: string
  percent: number
  color: string
}

function StatusRow(props: StatusRowProps) {
  return (
    <div class="space-y-1">
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-200/70">
          {props.label}
        </span>
        <div class="flex flex-col items-end">
          <span class="text-[12px] font-bold text-white" style={{ color: props.color }}>
            {props.value}
          </span>
          {props.sub && <span class="text-[9px] text-cyan-200/40">{props.sub}</span>}
        </div>
      </div>
      <div class="h-1 w-full rounded-full bg-white/5 overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(100, Math.max(0, props.percent))}%`,
            "background-color": props.color,
            opacity: 0.8,
          }}
        />
      </div>
    </div>
  )
}

function RingGauge(props: { value: number; label: string; sub?: string }) {
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const offset = () => circumference * (1 - Math.min(100, Math.max(0, props.value)) / 100)

  return (
    <div class="relative flex h-20 w-20 items-center justify-center">
      <svg class="jarvis-neural-ring h-full w-full" viewBox="0 0 80 80">
        <circle class="jarvis-neural-ring-track" cx="40" cy="40" r={radius} />
        <circle
          class="jarvis-neural-ring-value"
          cx="40"
          cy="40"
          r={radius}
          stroke-dasharray={String(circumference)}
          stroke-dashoffset={String(offset())}
        />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <span class="text-sm font-bold text-[#00f2ff]">{props.value.toFixed(0)}%</span>
        <span class="text-[8px] uppercase tracking-wider text-cyan-200/50">{props.label}</span>
      </div>
    </div>
  )
}

export function MetricsPanel() {
  const [snapshot, setSnapshot] = createSignal<JarvisMetricsSnapshot | null>(null)

  onMount(() => {
    let mounted = true
    window.api.jarvisMetricsSnapshot().then((s) => {
      if (mounted && s) setSnapshot(s)
    })
    const unsubscribe = window.api.jarvisMetricsSubscribe((s) => setSnapshot(s))
    onCleanup(() => {
      mounted = false
      unsubscribe()
    })
  })

  const system = () => snapshot()?.system
  const cpu = () => system()?.cpu.percent ?? 0
  const mem = () => system()?.memory.usedPercent ?? 0
  const load = () => system()?.loadAvg ?? 0
  const cores = () => system()?.cpu.cores ?? 1
  const usedGB = () => system()?.memory.usedGB ?? 0
  const totalGB = () => system()?.memory.totalGB ?? 0

  const llm = () => snapshot()?.llm
  const calls = () => llm()?.totalCalls ?? 0
  const errors = () => llm()?.totalErrors ?? 0
  const errorRate = () => llm()?.errorRate ?? 0
  const avgLLMLatency = () => llm()?.avgLatencyMs ?? 0
  const lastLLMLatency = () => llm()?.lastLatencyMs ?? 0
  const avgIn = () => llm()?.avgInputChars ?? 0
  const avgOut = () => llm()?.avgOutputChars ?? 0
  const currentModel = () => llm()?.currentModel ?? "—"
  const totalTokens = () => llm()?.totalTokens ?? 0
  const lastTotalTokens = () => llm()?.lastTotalTokens ?? 0
  const avgInputTokens = () => llm()?.avgInputTokens ?? 0
  const avgOutputTokens = () => llm()?.avgOutputTokens ?? 0

  const memory = () => snapshot()?.memory
  const recalls = () => memory()?.totalRecalls ?? 0
  const avgMemoryLatency = () => memory()?.avgLatencyMs ?? 0
  const lastMemoryLatency = () => memory()?.lastLatencyMs ?? 0
  const totalHits = () => memory()?.totalHits ?? 0
  const hitRate = () => memory()?.hitRate ?? 0

  return (
    <div class="pointer-events-auto flex w-64 flex-col gap-5 text-white/90">
      {/* System */}
      <section>
        <div class="mb-2 flex items-center gap-2">
          <div class="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f0ff]" />
          <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-200 text-shadow-cyan">
            系统
          </div>
        </div>
        <div class="flex items-center gap-3">
          <RingGauge value={cpu()} label="CPU" sub="核心负载" />
          <div class="flex flex-1 flex-col gap-2.5">
            <StatusRow
              label="内存"
              value={`${mem().toFixed(1)}%`}
              sub={`${usedGB().toFixed(1)}/${totalGB().toFixed(1)} GB`}
              percent={mem()}
              color="#34d399"
            />
            <StatusRow
              label="负载"
              value={load().toFixed(2)}
              percent={Math.min(100, (load() / Math.max(1, cores())) * 100)}
              color="#f59e0b"
            />
          </div>
        </div>
      </section>

      {/* Divider */}
      <div class="h-px w-full bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />

      {/* Model */}
      <section>
        <div class="mb-2 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <div class="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_6px_#8b5cf6]" />
            <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-violet-200 text-shadow-cyan">
              模型
            </div>
          </div>
          <div class="max-w-[90px] truncate text-[9px] text-violet-200/60" title={currentModel()}>
            {currentModel()}
          </div>
        </div>
        <div class="flex items-center gap-3">
          <RingGauge value={errorRate()} label="错误率" sub={`${errors()}/${calls()}`} />
          <div class="flex flex-1 flex-col gap-2.5">
            <StatusRow
              label="平均延迟"
              value={`${avgLLMLatency()}ms`}
              sub={`上次 ${lastLLMLatency()}ms`}
              percent={Math.min(100, avgLLMLatency() / 50)}
              color="#8b5cf6"
            />
            <StatusRow
              label="当前消耗"
              value={`${lastTotalTokens()} tokens`}
              sub={`输入 ${avgInputTokens()} / 输出 ${avgOutputTokens()}`}
              percent={Math.min(100, lastTotalTokens() / 100)}
              color="#22d3ee"
            />
          </div>
        </div>
      </section>

      {/* Divider */}
      <div class="h-px w-full bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />

      {/* Memory */}
      <section>
        <div class="mb-2 flex items-center gap-2">
          <div class="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
          <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-200 text-shadow-cyan">
            记忆
          </div>
        </div>
        <div class="flex items-center gap-3">
          <RingGauge value={hitRate()} label="命中率" sub={`${totalHits()} 命中`} />
          <div class="flex flex-1 flex-col gap-2.5">
            <StatusRow
              label="召回延迟"
              value={`${avgMemoryLatency()}ms`}
              sub={`上次 ${lastMemoryLatency()}ms`}
              percent={Math.min(100, avgMemoryLatency() / 20)}
              color="#f59e0b"
            />
            <StatusRow
              label="命中/召回"
              value={`${totalHits()}/${recalls()}`}
              sub="命中次数"
              percent={hitRate()}
              color="#34d399"
            />
          </div>
        </div>
      </section>
    </div>
  )
}
