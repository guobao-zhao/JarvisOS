import { createEffect, createSignal, onCleanup, onMount } from "solid-js"
import { currentMessage, dismiss, isVisible, startObserving, stopObserving } from "./consciousness"

const TYPING_INTERVAL_MS = 45
const HOLD_DURATION_MS = 5500

export function ConsciousnessPanel() {
  const [displayedText, setDisplayedText] = createSignal("")
  let typingTimer: ReturnType<typeof setInterval> | null = null
  let holdTimer: ReturnType<typeof setTimeout> | null = null

  onMount(() => {
    startObserving()
  })

  createEffect(() => {
    const msg = currentMessage()
    if (!msg) {
      setDisplayedText("")
      return
    }

    if (typingTimer) clearInterval(typingTimer)
    if (holdTimer) clearTimeout(holdTimer)
    setDisplayedText("")

    const target = msg.text
    let index = 0
    typingTimer = setInterval(() => {
      index += 1
      setDisplayedText(target.slice(0, index))
      if (index >= target.length) {
        if (typingTimer) clearInterval(typingTimer)
        typingTimer = null
        holdTimer = setTimeout(() => {
          dismiss()
        }, HOLD_DURATION_MS)
      }
    }, TYPING_INTERVAL_MS)
  })

  onCleanup(() => {
    if (typingTimer) clearInterval(typingTimer)
    if (holdTimer) clearTimeout(holdTimer)
    stopObserving()
  })

  return (
    <div
      class={`pointer-events-none fixed left-[16%] top-1/2 z-[80] max-w-sm -translate-y-1/2 transition-opacity duration-300 ${
        isVisible() ? "opacity-100" : "opacity-0"
      }`}
    >
      <div class="relative overflow-hidden rounded-[22px] border border-cyan-400/50 bg-[#05090a]/92 p-5 shadow-[0_0_60px_rgba(0,219,231,0.22)] backdrop-blur-sm">
        <div class="absolute left-5 right-5 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent" />
        <div class="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#00f2ff] text-shadow-cyan">
          JARVIS // CORE
        </div>
        <div class="whitespace-pre-wrap break-words text-lg font-semibold leading-relaxed text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          {displayedText()}
          <span class="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-cyan-300" />
        </div>
      </div>
    </div>
  )
}
