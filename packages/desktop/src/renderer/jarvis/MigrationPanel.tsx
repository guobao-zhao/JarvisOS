import { createSignal, For, Show } from "solid-js"
import type { JarvisMigrationImportResult, JarvisMigrationPreview } from "../../preload/types"

export function MigrationPanel() {
  const [root, setRoot] = createSignal("/Users/Zhuanz/Jarvis")
  const [preview, setPreview] = createSignal<JarvisMigrationPreview | null>(null)
  const [result, setResult] = createSignal<JarvisMigrationImportResult | null>(null)
  const [error, setError] = createSignal<string | null>(null)
  const isExpectedPilot = () => preview()?.candidates.length === 21

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
      <div class="mt-3 grid grid-cols-2 gap-2">
        <button type="button" class="jarvis-mini-button" onClick={loadPreview}>Preview</button>
        <button type="button" class="jarvis-mini-button" disabled={!preview() || !isExpectedPilot()} onClick={runImport}>Import</button>
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
    </section>
  )
}
