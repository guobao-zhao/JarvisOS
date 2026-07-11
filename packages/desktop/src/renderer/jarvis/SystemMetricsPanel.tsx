import { createSignal, onCleanup, onMount } from "solid-js"
import type { JarvisMetricsSnapshot } from "../../preload/types"

interface StatusRowProps {
  label: string
  value: string
  color: string
  percent: number
}

function StatusRow(props: StatusRowProps) {
  return (
    <div class="space-y-1.5">
      <div class="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-cyan-200/70">
        <span>{props.label}</span>
        <span style={{ color: props.color }}>{props.value}</span>
      </div>
      <div class="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, Math.max(0, props.percent))}%`, "background-color": props.color, opacity: 0.8 }}
        />
      </div>
    </div>
  )
}

function RingGauge(props: { value: number; label: string; sub: string }) {
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const offset = () => circumference * (1 - Math.min(100, Math.max(0, props.value)) / 100)

  return (
    <div class="relative flex h-24 w-24 items-center justify-center">
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
        <span class="text-lg font-bold text-[#00f2ff]">{props.value.toFixed(0)}%</span>
        <span class="text-[8px] uppercase tracking-wider text-cyan-200/50">{props.label}</span>
      </div>
    </div>
  )
}

export function SystemMetricsPanel() {
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

  return (
    <div class="pointer-events-auto relative w-64 rounded-[22px] p-[1px] opacity-80 shadow-[0_0_40px_rgba(0,219,231,0.08)] transition-opacity hover:opacity-100">
      <div class="absolute inset-0 rounded-[22px] bg-gradient-to-br from-cyan-300/20 via-cyan-500/10 to-transparent opacity-80 blur-[1px]" />
      <div class="absolute inset-0 rounded-[22px] bg-gradient-to-tr from-cyan-400/15 via-white/5 to-cyan-300/10" />

      <div class="relative z-10 flex w-full flex-col rounded-[21px] bg-[#070c0e]/75 p-4 backdrop-blur-md">
        <div class="absolute left-4 right-4 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

        <div class="mb-3 flex items-center justify-between">
          <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-200 text-shadow-cyan">
            系统
          </div>
          <div class="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f0ff]" />
        </div>

        <div class="flex items-center gap-4">
          <RingGauge value={cpu()} label="CPU" sub="核心负载" />
          <div class="flex flex-1 flex-col gap-3">
            <StatusRow
              label="内存"
              value={`${mem().toFixed(1)}%`}
              color="#34d399"
              percent={mem()}
            />
            <StatusRow
              label="负载"
              value={load().toFixed(2)}
              color="#f59e0b"
              percent={Math.min(100, (load() / cores()) * 100)}
            />
            <StatusRow
              label="用量"
              value={`${usedGB().toFixed(1)}/${totalGB().toFixed(1)} GB`}
              color="#22d3ee"
              percent={mem()}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
