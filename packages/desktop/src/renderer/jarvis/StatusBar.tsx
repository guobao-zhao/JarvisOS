import { createSignal, onCleanup, onMount } from "solid-js"
import { jarvisStore, type JarvisStatus } from "./Store"

const statusLabels: Record<JarvisStatus, string> = {
  idle: "就绪",
  listening: "聆听中",
  thinking: "思考中",
  speaking: "播报中",
}

const statusColors: Record<JarvisStatus, string> = {
  idle: "text-status-idle",
  listening: "text-status-listening",
  thinking: "text-status-thinking",
  speaking: "text-status-speaking",
}

export function StatusBar() {
  const [now, setNow] = createSignal(new Date())

  onMount(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    onCleanup(() => clearInterval(timer))
  })

  const timeString = () => {
    const d = now()
    return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <header class="flex items-center justify-between px-6 py-3 border-b border-border-subtle bg-background-base/80 backdrop-blur [-webkit-app-region:drag] [app-region:drag]">
      <div class="flex items-center gap-3 [-webkit-app-region:no-drag] [app-region:no-drag]">
        <div class="w-2 h-2 rounded-full bg-accent-primary animate-pulse">
        </div>
      </div>

      <div class="flex items-center gap-4 text-sm [-webkit-app-region:no-drag] [app-region:no-drag]">
        <span class={`font-medium ${statusColors[jarvisStore.status]}`}>
          {statusLabels[jarvisStore.status]}
        </span>
        <span class="text-text-tertiary tabular-nums">{timeString()}</span>
      </div>
    </header>
  )
}
