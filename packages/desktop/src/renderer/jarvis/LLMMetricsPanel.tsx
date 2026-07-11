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

export function LLMMetricsPanel() {
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

  const llm = () => snapshot()?.llm
  const calls = () => llm()?.totalCalls ?? 0
  const errors = () => llm()?.totalErrors ?? 0
  const errorRate = () => llm()?.errorRate ?? 0
  const avgLatency = () => llm()?.avgLatencyMs ?? 0
  const lastLatency = () => llm()?.lastLatencyMs ?? 0
  const avgIn = () => llm()?.avgInputChars ?? 0
  const avgOut = () => llm()?.avgOutputChars ?? 0

  return (
    <div class="pointer-events-auto relative w-64 rounded-[22px] p-[1px] opacity-80 shadow-[0_0_40px_rgba(139,92,246,0.08)] transition-opacity hover:opacity-100">
      <div class="absolute inset-0 rounded-[22px] bg-gradient-to-br from-violet-300/20 via-violet-500/10 to-transparent opacity-80 blur-[1px]" />
      <div class="absolute inset-0 rounded-[22px] bg-gradient-to-tr from-violet-400/15 via-white/5 to-violet-300/10" />

      <div class="relative z-10 flex w-full flex-col rounded-[21px] bg-[#070c0e]/75 p-4 backdrop-blur-md">
        <div class="absolute left-4 right-4 top-0 h-[1px] bg-gradient-to-r from-transparent via-violet-400/60 to-transparent" />

        <div class="mb-3 flex items-center justify-between">
          <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-violet-200 text-shadow-cyan">
            模型
          </div>
          <div class="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_6px_#8b5cf6]" />
        </div>

        <div class="space-y-3">
          <MetricRow
            label="平均延迟"
            value={`${avgLatency()}ms`}
            sub={`上次 ${lastLatency()}ms`}
            percent={Math.min(100, avgLatency() / 50)}
            color="#8b5cf6"
          />
          <MetricRow
            label="错误率"
            value={`${errorRate().toFixed(0)}%`}
            sub={`${errors()} / ${calls()} 次调用`}
            percent={errorRate()}
            color="#ef4444"
          />
          <MetricRow
            label="平均字符"
            value={`${avgIn()}/${avgOut()}`}
            sub="输入 / 输出 字符"
            percent={Math.min(100, (avgIn() + avgOut()) / 20)}
            color="#22d3ee"
          />
        </div>
      </div>
    </div>
  )
}
