import { createSignal, For, Show } from "solid-js"
import type { JarvisMigrationImportResult, JarvisMigrationPreview } from "../../preload/types"

export function MigrationPanel() {
  const [root, setRoot] = createSignal("/Users/Zhuanz/Jarvis")
  const [preview, setPreview] = createSignal<JarvisMigrationPreview | null>(null)
  const [result, setResult] = createSignal<JarvisMigrationImportResult | null>(null)
  const [error, setError] = createSignal<string | null>(null)

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
      <input value={root()} onInput={(event) => setRoot(event.currentTarget.value)} />
      <button type="button" onClick={loadPreview}>Preview</button>
      <button type="button" disabled={!preview()} onClick={runImport}>Import</button>
      <Show when={error()}>{(message) => <div class="text-[10px] text-red-200/80">{message()}</div>}</Show>
      <Show when={preview()}>
        {(value) => (
          <div class="text-[10px] text-white/65">
            {value().candidates.length} candidates
            <For each={value().candidates.slice(0, 6)}>
              {(item) => (
                <div>
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
