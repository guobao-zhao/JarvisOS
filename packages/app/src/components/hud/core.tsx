import { createSignal, For, onMount, Show, type Component } from "solid-js"
import "./core.css"

/**
 * J.A.R.V.I.S. HUD Core
 *
 * 复刻 /Users/Zhuanz/.kimi_openclaw/workspace/jarvis_hud.html 中的核心圆环组件，
 * 作为 JarvisOS HUD 界面的视觉锚点。
 */
interface JarvisCoreProps {
  showControl?: boolean
  active?: boolean
}

export const JarvisCore: Component<JarvisCoreProps> = (props) => {
  const [internalRunning, setInternalRunning] = createSignal(false)
  const [middleTicks, setMiddleTicks] = createSignal<number[]>([])
  const [outerTicks, setOuterTicks] = createSignal<number[]>([])

  onMount(() => {
    setMiddleTicks(Array.from({ length: 60 }, (_, i) => i))
    setOuterTicks(Array.from({ length: 120 }, (_, i) => i))
  })

  const isRunning = () => (props.active !== undefined ? props.active : internalRunning())
  const toggleTask = () => setInternalRunning((prev) => !prev)

  return (
    <div class="jarvis-core">
      {/* Decorative data text */}
      <div class="jarvis-core__data jarvis-core__data--left">SYS.OPTICAL.V.2.1</div>
      <div class="jarvis-core__data jarvis-core__data--right">JARVIS.PROTOCOL</div>

      {/* Outer Ring (rotating) */}
      <div class="jarvis-core__ring jarvis-core__ring--outer">
        <For each={outerTicks()}>
          {(i) => (
            <div
              class="jarvis-core__tick-outer"
              classList={{
                "jarvis-core__tick-outer--major": i % 10 === 0,
              }}
              style={{ transform: `rotate(${i * 3}deg)` }}
            />
          )}
        </For>
        <div class="jarvis-core__node jarvis-core__node--north" />
        <div class="jarvis-core__node jarvis-core__node--east" />
        <div class="jarvis-core__node jarvis-core__node--south" />
        <div class="jarvis-core__node jarvis-core__node--west" />
      </div>

      {/* Middle Ring */}
      <div class="jarvis-core__ring jarvis-core__ring--middle">
        <For each={middleTicks()}>
          {(i) => (
            <div
              class="jarvis-core__tick"
              classList={{
                "jarvis-core__tick--major": i % 5 === 0,
              }}
              style={{ transform: `rotate(${i * 6}deg)` }}
            />
          )}
        </For>
        <div class="jarvis-core__progress-arc" />
        <div class="jarvis-core__status-dot jarvis-core__status-dot--1" />
        <div class="jarvis-core__status-dot jarvis-core__status-dot--2" />
        <div class="jarvis-core__status-dot jarvis-core__status-dot--3" />
      </div>

      {/* Inner Dashed Ring */}
      <div class="jarvis-core__ring jarvis-core__ring--inner" />

      {/* Center Text */}
      <div class="jarvis-core__center-text">J.A.R.V.I.S.</div>

      {/* Semicircle (bottom arc) */}
      <div class="jarvis-core__semicircle" classList={{ "jarvis-core__semicircle--active": isRunning() }} />

      {/* Control Panel */}
      <Show when={props.showControl !== false}>
        <div class="jarvis-core__control">
          <div class="jarvis-core__status-indicator">
            <div
              class="jarvis-core__status-light"
              classList={{ "jarvis-core__status-light--active": isRunning() }}
            />
            <span>{isRunning() ? "PROCESSING" : "STANDBY"}</span>
          </div>
          <button type="button" class="jarvis-core__btn" onClick={toggleTask}>
            {isRunning() ? "STOP TASK" : "START TASK"}
          </button>
        </div>
      </Show>
    </div>
  )
}

export default JarvisCore
