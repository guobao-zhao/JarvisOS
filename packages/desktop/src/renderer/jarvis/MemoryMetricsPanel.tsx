import { createSignal, onCleanup, onMount } from "solid-js"
import type { JarvisMetricsSnapshot } from "../../preload/types"

interface MetricRowProps {
  label: string
  value: string
  sub?: string
  percent: number
  color: string
}

function MetricRow(props: MetricRowProps) {
  return (
    <div class="flex flex-col gap-1">
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-200/70">
          {props.label}
        </span>
        <div class="flex flex-col items-end">
          <span class="text-[12px] font-bold text-white">{props.value}</span>
          {props.sub && <span class="text-[9px] text-cyan-200/40">{props.sub}</span>}
        </div>
      </div>
      <div class="h-1 w-full rounded-full bg-white/5 overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, Math.max(0, props.percent))}%`, "background-color": props.color, opacity: 0.75 }}
        />
      </div>
    </div>
  )
}

export function MemoryMetricsPanel() {
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

  const memory = () => snapshot()?.memory
  const recalls = () => memory()?.totalRecalls ?? 0
  const avgLatency = () => memory()?.avgLatencyMs ?? 0
  const lastLatency = () => memory()?.lastLatencyMs ?? 0
  const totalHits = () => memory()?.totalHits ?? 0
  const hitRate = () => memory()?.hitRate ?? 0

  return (
    <div class="pointer-events-auto relative w-64 rounded-[22px] p-[1px] opacity-80 shadow-[0_0_40px_rgba(245,158,11,0.08)] transition-opacity hover:opacity-100">
      <div class="absolute inset-0 rounded-[22px] bg-gradient-to-br from-amber-300/20 via-amber-500/10 to-transparent opacity-80 blur-[1px]" />
      <div class="absolute inset-0 rounded-[22px] bg-gradient-to-tr from-amber-400/15 via-white/5 to-amber-300/10" />

      <div class="relative z-10 flex w-full flex-col rounded-[21px] bg-[#070c0e]/75 p-4 backdrop-blur-md">
        <div class="absolute left-4 right-4 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

        <div class="mb-3 flex items-center justify-between">
          <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-200 text-shadow-cyan">
            记忆
          </div>
          <div class="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
        </div>

        <div class="space-y-3">
          <MetricRow
            label="召回延迟"
            value={`${avgLatency()}ms`}
            sub={`上次 ${lastLatency()}ms`}
            percent={Math.min(100, avgLatency() / 20)}
            color="#f59e0b"
          />
          <MetricRow
            label="命中率"
            value={`${hitRate().toFixed(0)}%`}
            sub={`${totalHits()} 命中 / ${recalls()} 次召回`}
            percent={hitRate()}
            color="#34d399"
          />
        </div>
      </div>
    </div>
  )
}
