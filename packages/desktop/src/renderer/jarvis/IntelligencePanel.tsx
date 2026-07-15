import { createSignal, For, onCleanup, onMount, Show } from "solid-js"
import type { JarvisIntelligenceBriefing } from "../../preload/types"

export function IntelligencePanel() {
  const [briefing, setBriefing] = createSignal<JarvisIntelligenceBriefing | null>(null)
  const [error, setError] = createSignal<string | null>(null)

  async function loadBriefing() {
    setError(null)
    try {
      setBriefing(await window.api.jarvisIntelligenceBriefing())
    } catch (reason) {
      setError(String(reason))
    }
  }

  onMount(() => {
    void loadBriefing()
    const unsubscribe = window.api.jarvisIntelligenceSubscribe((next) => setBriefing(next))
    onCleanup(unsubscribe)
  })

  return (
    <section class="jarvis-panel jarvis-panel--intelligence">
      <div class="jarvis-panel-title">Intelligence</div>
      <button type="button" onClick={loadBriefing}>Refresh</button>
      <Show when={error()}>
        {(message) => <div class="text-[10px] text-red-200/80">{message()}</div>}
      </Show>
      <Show when={briefing()}>
        {(value) => (
          <>
            <div class="text-[11px] text-cyan-100/80">{value().summary}</div>
            <For each={value().items}>
              {(item) => (
                <article class="mt-2 rounded border border-cyan-300/20 p-2">
                  <div class="text-[11px] font-bold text-cyan-100">{item.title}</div>
                  <pre class="whitespace-pre-wrap text-[10px] text-white/60">{item.excerpt}</pre>
                </article>
              )}
            </For>
          </>
        )}
      </Show>
    </section>
  )
}
