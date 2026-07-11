import { createSignal, onCleanup, onMount } from "solid-js"
import type { JarvisToolMetric } from "../../preload/types"

function RingGauge(props: { value: number; label: string }) {
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

function SegmentBar(props: { value: number; color?: string }) {
  const total = 10
  const active = () => Math.min(total, Math.max(0, Math.round(props.value * total)))

  return (
    <div class="jarvis-segment-bar">
      {Array.from({ length: total }, (_, i) => (
        <div
          classList={{ active: i < active() }}
          style={
            i < active() && props.color
              ? { "background-color": props.color, "box-shadow": `0 0 6px ${props.color}` }
              : undefined
          }
        />
      ))}
    </div>
  )
}

export function ToolsPanel() {
  const [metrics, setMetrics] = createSignal<JarvisToolMetric[]>([])

  onMount(() => {
    let mounted = true
    const fetchMetrics = async () => {
      const data = await window.api.jarvisToolMetrics()
      if (mounted) setMetrics(data)
    }
    fetchMetrics()
    const timer = setInterval(fetchMetrics, 2000)
    onCleanup(() => {
      mounted = false
      clearInterval(timer)
    })
  })

  const totalCalls = () => metrics().reduce((sum, m) => sum + m.callCount, 0)
  const totalHits = () => metrics().reduce((sum, m) => sum + m.hitCount, 0)
  const activeTools = () => metrics().filter((m) => m.callCount > 0).length
  const hitRate = () => (totalCalls() === 0 ? 0 : (totalHits() / totalCalls()) * 100)

  const topTools = () =>
    [...metrics()]
      .filter((m) => m.callCount > 0)
      .sort((a, b) => b.callCount - a.callCount)
      .slice(0, 5)

  const maxCalls = () => Math.max(1, ...topTools().map((m) => m.callCount))

  return (
    <div class="pointer-events-auto flex w-64 flex-col gap-4 text-white/90">
      <div class="flex items-center gap-2">
        <div class="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f0ff]" />
        <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-200 text-shadow-cyan">
          工具库
        </div>
      </div>

      <div class="flex items-center gap-3">
        <RingGauge value={hitRate()} label="命中率" />
        <div class="flex flex-1 flex-col gap-2">
          <div>
            <div class="text-[9px] text-cyan-200/50 uppercase tracking-wider">调用次数</div>
            <div class="text-lg font-bold text-white">{totalCalls()}</div>
          </div>
          <div>
            <div class="text-[9px] text-cyan-200/50 uppercase tracking-wider">活跃工具</div>
            <div class="text-lg font-bold text-white">{activeTools()}</div>
          </div>
        </div>
      </div>

      <div class="space-y-2.5">
        {topTools().map((tool) => (
          <div class="space-y-1">
            <div class="flex items-center justify-between text-[10px]">
              <span class="max-w-[90px] truncate uppercase tracking-wider text-cyan-200/80">
                {tool.toolName}
              </span>
              <span class="text-[10px] font-bold text-cyan-200/60">{tool.callCount}</span>
            </div>
            <SegmentBar value={tool.callCount / maxCalls()} />
          </div>
        ))}
        {topTools().length === 0 && (
          <div class="text-[10px] text-cyan-200/30 pt-1">暂无调用记录</div>
        )}
      </div>

      <div class="h-px w-full bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />

      <div class="text-[9px] text-cyan-200/40 uppercase tracking-widest">
        工具库 · 实时命中统计
      </div>
    </div>
  )
}
