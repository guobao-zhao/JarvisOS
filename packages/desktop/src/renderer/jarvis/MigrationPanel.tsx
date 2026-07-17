import { createSignal, For, Show } from "solid-js"
import type { JarvisMemoryDiagnostics, JarvisMigrationImportResult, JarvisMigrationPreview } from "../../preload/types"

export function MigrationPanel() {
  const [root, setRoot] = createSignal("/Users/Zhuanz/Jarvis")
  const [preview, setPreview] = createSignal<JarvisMigrationPreview | null>(null)
  const [result, setResult] = createSignal<JarvisMigrationImportResult | null>(null)
  const [diagnostics, setDiagnostics] = createSignal<JarvisMemoryDiagnostics | null>(null)
  const [error, setError] = createSignal<string | null>(null)
  const isExpectedPilot = () => preview()?.candidates.length === 21
  const testQuery = "jproduct-service multi-price 人数维度为什么要按人数过滤"

  async function loadPreview() {
    setError(null)
    setResult(null)
    try {
      setPreview(await window.api.jarvisMigrationPreview(root()))
    } catch (reason) {
      setError(String(reason))
    }
  }

  async function runImport() {
    setError(null)
    try {
      setResult(await window.api.jarvisMigrationImport(root()))
    } catch (reason) {
      setError(String(reason))
    }
  }

  async function testRecall() {
    setError(null)
    try {
      setDiagnostics(await window.api.jarvisMemoryDiagnostics(testQuery))
    } catch (reason) {
      setError(String(reason))
    }
  }

  return (
    <section class="jarvis-panel jarvis-panel--migration">
      <div class="jarvis-panel-title">Jarvis Migration</div>
      <label class="block space-y-1.5">
        <span class="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">旧 Jarvis 根目录</span>
        <input
          class="jarvis-model-input"
          value={root()}
          onInput={(event) => setRoot(event.currentTarget.value)}
        />
      </label>
      <div class="mt-3 grid grid-cols-3 gap-2">
        <button type="button" class="jarvis-mini-button" onClick={loadPreview}>Preview</button>
        <button type="button" class="jarvis-mini-button" disabled={!preview() || !isExpectedPilot()} onClick={runImport}>Import</button>
        <button type="button" class="jarvis-mini-button" onClick={testRecall}>Test Recall</button>
      </div>
      <Show when={error()}>{(message) => <div class="text-[10px] text-red-200/80">{message()}</div>}</Show>
      <Show when={preview()}>
        {(value) => (
          <div class="mt-3 space-y-2 text-[10px] text-white/65">
            <div
              class="rounded border px-3 py-2"
              classList={{
                "border-emerald-300/20 bg-emerald-500/10 text-emerald-100": isExpectedPilot(),
                "border-red-400/25 bg-red-500/10 text-red-100": !isExpectedPilot(),
              }}
            >
              {value().candidates.length} candidates
              <Show when={!isExpectedPilot()}>
                <div class="mt-1 leading-relaxed">
                  当前不是 Phase 1 白名单预览。请重启 JarvisOS 后重新 Preview；正确结果应为 21 candidates。
                </div>
              </Show>
            </div>
            <For each={value().candidates.slice(0, 6)}>
              {(item) => (
                <div class="truncate">
                  {item.project ? `${item.project} / ` : ""}{item.title}
                  {" · "}{item.kind}
                  {item.domain ? ` · ${item.domain}` : ""}
                  {" · "}{item.verification}
                </div>
              )}
            </For>
          </div>
        )}
      </Show>
      <Show when={result()}>
        {(value) => <div class="text-[10px] text-emerald-200/80">Imported {value().imported}, skipped {value().skipped}</div>}
      </Show>
      <Show when={diagnostics()}>
        {(value) => (
          <div class="mt-3 space-y-2 rounded border border-cyan-300/20 bg-cyan-500/10 p-3 text-[10px] leading-relaxed text-cyan-50/80">
            <div class="font-bold uppercase tracking-[0.16em] text-cyan-200">Memory Diagnostics</div>
            <div>LLM-wiki: {value().health.ok ? "ok" : "unavailable"} · writable: {String(value().health.writable)}</div>
            <Show when={value().health.reason}>
              {(reason) => <div class="text-red-100/80">reason: {reason()}</div>}
            </Show>
            <div>outbox: {value().config.outboxDir}</div>
            <div>project: {value().config.project} · local docs: {value().localDocCount}</div>
            <div class="mt-2 font-semibold text-cyan-100">effective hits</div>
            <For each={value().effectiveHits.slice(0, 3)}>
              {(hit) => <div class="truncate">{hit.title} · {hit.source} · {Math.round(hit.score * 100)}%</div>}
            </For>
            <div class="mt-2 font-semibold text-cyan-100">local fallback hits</div>
            <For each={value().localHits.slice(0, 3)}>
              {(hit) => <div class="truncate">{hit.title} · {hit.source} · {Math.round(hit.score * 100)}%</div>}
            </For>
          </div>
        )}
      </Show>
    </section>
  )
}
