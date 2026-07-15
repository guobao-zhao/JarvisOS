import { createSignal, For, onCleanup, onMount, Show } from "solid-js"
import type { JarvisGrowthReport } from "../../preload/types"

function emptyReport(): JarvisGrowthReport {
  return {
    generatedAt: Date.now(),
    sourceRoot: "",
    totals: {
      discovered: 0,
      classified: 0,
      sandboxPassed: 0,
      sandboxFailed: 0,
      promotionReady: 0,
      highRisk: 0,
    },
    suggestions: [],
    risks: [],
    nextActions: [],
  }
}

function Stat(props: { label: string; value: number; color: string }) {
  return (
    <div>
      <div class="text-lg font-bold" style={{ color: props.color }}>{props.value}</div>
      <div class="text-[9px] uppercase tracking-wider text-cyan-200/45">{props.label}</div>
    </div>
  )
}

export function GrowthPanel() {
  const [report, setReport] = createSignal<JarvisGrowthReport>(emptyReport())
  const [isScanning, setIsScanning] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  const [sourceRootInput, setSourceRootInput] = createSignal("")
  const [sourceRootError, setSourceRootError] = createSignal<string | null>(null)
  const [lastPromotionDecision, setLastPromotionDecision] = createSignal<string | null>(null)
  const [promotionError, setPromotionError] = createSignal<string | null>(null)

  onMount(() => {
    window.api.jarvisGrowthReport().then((next) => {
      setReport(next)
      setSourceRootInput(next.sourceRoot)
    }).catch((reason) => setError(String(reason)))
    const unsubscribe = window.api.jarvisGrowthSubscribe((next) => {
      setReport(next)
      setSourceRootInput(next.sourceRoot)
    })
    onCleanup(unsubscribe)
  })

  async function applySourceRoot() {
    setSourceRootError(null)
    try {
      const value = sourceRootInput().trim()
      const report = await window.api.jarvisGrowthSetSourceRoot(value.length > 0 ? value : null)
      setReport(report)
    } catch (reason) {
      setSourceRootError(String(reason))
    }
  }

  async function scan() {
    setIsScanning(true)
    setError(null)
    try {
      setReport(await window.api.jarvisGrowthScan())
    } catch (reason) {
      setError(String(reason))
    } finally {
      setIsScanning(false)
    }
  }

  const recommended = () => report().suggestions.filter((item) => item.recommended).slice(0, 3)

  return (
    <section class="pointer-events-auto flex w-64 flex-col gap-3 text-white/90">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <div class="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
          <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-200 text-shadow-cyan">
            成长
          </div>
        </div>
        <button
          type="button"
          class="rounded border border-emerald-300/30 px-2 py-1 text-[10px] font-bold text-emerald-100 transition hover:border-emerald-200/70 disabled:opacity-50"
          onClick={scan}
          disabled={isScanning()}
        >
          {isScanning() ? "扫描中" : "扫描"}
        </button>
      </div>

      <div class="grid grid-cols-4 gap-2">
        <Stat label="发现" value={report().totals.discovered} color="#22d3ee" />
        <Stat label="分类" value={report().totals.classified} color="#a78bfa" />
        <Stat label="晋升" value={report().totals.promotionReady} color="#34d399" />
        <Stat label="风险" value={report().totals.highRisk} color="#f59e0b" />
      </div>

      <Show when={error()}>
        {(message) => <p class="line-clamp-2 text-[10px] text-red-200/80">{message()}</p>}
      </Show>

      <div class="space-y-1.5">
        <div class="text-[9px] uppercase tracking-widest text-cyan-200/50">Source Root</div>
        <input
          class="jarvis-growth-source-input"
          value={sourceRootInput()}
          placeholder="/Users/Zhuanz/Jarvis"
          onInput={(event) => setSourceRootInput(event.currentTarget.value)}
        />
        <button
          type="button"
          class="rounded border border-cyan-300/30 px-2 py-1 text-[10px] font-bold text-cyan-100 transition hover:border-cyan-200/70"
          onClick={applySourceRoot}
        >
          Set Source
        </button>
        <Show when={sourceRootError()}>
          {(message) => <div class="text-[10px] text-red-200/80">{message()}</div>}
        </Show>
      </div>

      <Show when={report().profile}>
        {(profile) => (
          <div class="space-y-1">
            <div class="text-[9px] uppercase tracking-widest text-cyan-200/50">Profile</div>
            <div class="text-[10px] text-white/70">Focus: {profile().focusAreas.join(" / ") || "none"}</div>
            <div class="text-[10px] text-white/70">{profile().promotionReadyCount} ready · {profile().highRiskCount} high risk</div>
          </div>
        )}
      </Show>

      <For each={report().reminders ?? []}>
        {(reminder) => <div class={`text-[10px] ${reminder.level === "warning" ? "text-amber-200/80" : "text-cyan-200/80"}`}>{reminder.title}: {reminder.message}</div>}
      </For>

      <For each={report().challenges ?? []}>
        {(challenge) => <div class="text-[10px] text-white/60">{challenge.title}: {challenge.question}</div>}
      </For>

      <Show when={recommended().length > 0}>
        <div class="space-y-1.5">
          <div class="text-[9px] uppercase tracking-widest text-emerald-200/50">晋升建议</div>
          <For each={recommended()}>
            {(suggestion) => (
              <div class="flex items-center justify-between gap-2">
                <p class="truncate text-[10px] text-white/70">{suggestion.title}</p>
                <button
                  type="button"
                  class="rounded border border-emerald-300/30 px-1.5 py-0.5 text-[9px] font-bold text-emerald-100 transition hover:border-emerald-200/70 disabled:opacity-50"
                  disabled={!suggestion.recommended}
                  onClick={async () => {
                    setPromotionError(null)
                    try {
                      const decision = await window.api.jarvisGrowthApprovePromotion(suggestion.assetId)
                      setLastPromotionDecision(decision.reason)
                    } catch (reason) {
                      setPromotionError(String(reason))
                    }
                  }}
                >
                  Approve
                </button>
              </div>
            )}
          </For>
          <Show when={promotionError()}>
            {(message) => <div class="text-[10px] text-red-200/80">{message()}</div>}
          </Show>
          <Show when={lastPromotionDecision()}>
            {(message) => <div class="text-[10px] text-emerald-200/80">{message()}</div>}
          </Show>
        </div>
      </Show>

      <Show when={report().risks.length > 0}>
        <div class="space-y-1.5">
          <div class="text-[9px] uppercase tracking-widest text-amber-200/50">风险</div>
          <For each={report().risks.slice(0, 2)}>{(risk) => <p class="line-clamp-2 text-[10px] text-white/60">{risk}</p>}</For>
        </div>
      </Show>

      <Show when={report().nextActions.length > 0}>
        <div class="space-y-1.5">
          <div class="text-[9px] uppercase tracking-widest text-cyan-200/50">下一步</div>
          <For each={report().nextActions.slice(0, 2)}>{(action) => <p class="line-clamp-2 text-[10px] text-white/60">{action}</p>}</For>
        </div>
      </Show>

      <div class="h-px w-full bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent" />
    </section>
  )
}
