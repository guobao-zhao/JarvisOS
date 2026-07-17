import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js"
import type { JarvisMemorySupervisorStatus } from "../../preload/types"

function initialStatus(): JarvisMemorySupervisorStatus {
  return {
    phase: "booting",
    healthy: false,
    baseURL: "http://127.0.0.1:19828",
    outboxDir: "",
    project: "current",
    llmWikiAppPath: "/Applications/LLM Wiki.app",
    startedByJarvisOS: false,
    lastCheckedAt: 0,
    events: [
      {
        id: "boot-init",
        at: Date.now(),
        level: "info",
        message: "Kernel: JarvisOS interface initializing",
      },
    ],
  }
}

const phaseProgress: Record<JarvisMemorySupervisorStatus["phase"], number> = {
  booting: 12,
  checking: 38,
  launching: 58,
  degraded: 78,
  ready: 100,
}

const phaseLabel: Record<JarvisMemorySupervisorStatus["phase"], string> = {
  booting: "BOOTING",
  checking: "CHECKING BRAIN",
  launching: "LAUNCHING LLM-WIKI",
  degraded: "DEGRADED READY",
  ready: "SYSTEM STABLE",
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("zh-CN", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export function JarvisBootSequence(props: { mode?: "full" | "overlay"; onComplete?: () => void }) {
  const [status, setStatus] = createSignal<JarvisMemorySupervisorStatus>(initialStatus())
  const [closing, setClosing] = createSignal(false)
  const mode = () => props.mode ?? "full"
  const progress = createMemo(() => phaseProgress[status().phase])
  const stable = createMemo(() => status().phase === "ready" || status().phase === "degraded")
  const events = createMemo(() => status().events.slice(-9))

  onMount(() => {
    let completeTimer: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = window.api.jarvisMemorySupervisorSubscribe((next) => {
      setStatus(next)
      if ((next.phase === "ready" || next.phase === "degraded") && props.onComplete && !completeTimer) {
        completeTimer = setTimeout(() => {
          setClosing(true)
          props.onComplete?.()
        }, mode() === "full" ? 900 : 2400)
      }
    })
    void window.api.jarvisMemorySupervisorStart().then(setStatus).catch(() => undefined)
    void window.api.jarvisMemorySupervisorStatus().then(setStatus).catch(() => undefined)

    onCleanup(() => {
      unsubscribe()
      if (completeTimer) clearTimeout(completeTimer)
    })
  })

  return (
    <div
      class="jarvis-boot fixed inset-0 z-[80] overflow-hidden bg-[#030607] text-cyan-50"
      classList={{
        "jarvis-boot--overlay": mode() === "overlay",
        "jarvis-boot--closing": closing(),
      }}
    >
      <div class="jarvis-boot__grid" />
      <div class="jarvis-boot__scan" />
      <div class="jarvis-boot__core" aria-hidden="true">
        <div class="jarvis-boot__ring jarvis-boot__ring--outer" />
        <div class="jarvis-boot__ring jarvis-boot__ring--middle" />
        <div class="jarvis-boot__ring jarvis-boot__ring--inner" />
        <div class="jarvis-boot__reactor">
          <span>{Math.round(progress())}</span>
        </div>
      </div>

      <section class="jarvis-boot__console">
        <div class="jarvis-boot__header">
          <div>
            <div class="jarvis-boot__eyebrow">JARVIS OS BOOT SEQUENCE</div>
            <h1>JarvisOS</h1>
          </div>
          <div class="jarvis-boot__phase" classList={{ "jarvis-boot__phase--stable": stable() }}>
            {phaseLabel[status().phase]}
          </div>
        </div>

        <div class="jarvis-boot__progress" aria-label="JarvisOS boot progress">
          <div style={{ width: `${progress()}%` }} />
        </div>

        <div class="jarvis-boot__status-grid">
          <div>
            <span>Brain Gateway</span>
            <strong>{status().healthy ? "ONLINE" : status().phase === "launching" ? "STARTING" : "CHECKING"}</strong>
          </div>
          <div>
            <span>Model Router</span>
            <strong>READY</strong>
          </div>
          <div>
            <span>Memory Store</span>
            <strong>{status().outboxDir ? "RESOLVED" : "PENDING"}</strong>
          </div>
          <div>
            <span>Runtime</span>
            <strong>{stable() ? "STABLE" : "LOADING"}</strong>
          </div>
        </div>

        <div class="jarvis-boot__logs" role="log" aria-live="polite">
          <For each={events()}>
            {(event) => (
              <div class={`jarvis-boot__log jarvis-boot__log--${event.level}`}>
                <time>{formatTime(event.at)}</time>
                <span>{event.message}</span>
                <Show when={event.detail}>
                  {(detail) => <small>{detail()}</small>}
                </Show>
              </div>
            )}
          </For>
          <Show when={stable()}>
            <div class="jarvis-boot__stable">
              系统稳定运行 · 各核心组件已加载 · 记忆大脑 {status().healthy ? "已接入" : "本地同源降级"}
            </div>
          </Show>
        </div>
      </section>
    </div>
  )
}
