import { createSignal, For, Index, onCleanup, onMount, Show } from "solid-js"
import { JarvisCore } from "@/components/hud/core"
import type { JSX } from "solid-js"
import type {
  JarvisGrowthReport,
  JarvisMetricsSnapshot,
  JarvisModelConnectionResult,
  JarvisModelDecision,
  JarvisModelProfileDraft,
  JarvisModelRole,
  JarvisModelRoutingConfigDraft,
  JarvisModelRoutingConfigSnapshot,
  JarvisToolMetric,
} from "../../preload/types"
import { jarvisStore } from "./Store"
import { MemoryOrb } from "./MemoryOrb"
import { VoiceOrb } from "./VoiceOrb"
import { MigrationPanel } from "./MigrationPanel"

type Accent = "cyan" | "amber" | "violet" | "emerald"

type HubMode = "idle" | "listening" | "thinking" | "speaking" | "recalling" | "scanning"
type ModelConnectionState = "idle" | "checking" | "healthy" | "error"
type ProfileTestState = "idle" | "checking" | "healthy" | "error"

const accentColors: Record<Accent, string> = {
  cyan: "#5ef6ff",
  amber: "#fbbf24",
  violet: "#8b5cf6",
  emerald: "#34d399",
}

const modeLabels: Record<HubMode, string> = {
  idle: "STANDBY",
  listening: "LISTENING",
  thinking: "THINKING",
  speaking: "SPEAKING",
  recalling: "RECALLING",
  scanning: "SCANNING",
}

function emptyGrowthReport(): JarvisGrowthReport {
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

const modelRoles: JarvisModelRole[] = ["daily", "designer", "worker", "reviewer", "fallback"]

const roleLabels: Record<JarvisModelRole, string> = {
  daily: "日常聊天",
  designer: "澄清设计",
  worker: "执行干活",
  reviewer: "校验复盘",
  fallback: "兜底模型",
}

function defaultRoutingDraft(): JarvisModelRoutingConfigDraft {
  return {
    version: 2,
    profiles: [
      {
        id: "kimi-default",
        label: "Kimi Default",
        providerType: "openai-compatible",
        baseURL: "https://api.moonshot.cn/v1",
        apiKey: "",
        modelID: "kimi-k2-0711-preview",
      },
    ],
    roleBindings: {
      daily: "kimi-default",
      designer: "kimi-default",
      worker: "kimi-default",
      reviewer: "kimi-default",
      fallback: "kimi-default",
    },
  }
}

function compactModelName(model: string) {
  if (model.length <= 18) return model
  return `${model.slice(0, 15)}...`
}

function createProfileId() {
  return `profile-${Date.now().toString(36)}`
}

function routingDraftFromSnapshot(config: JarvisModelRoutingConfigSnapshot): JarvisModelRoutingConfigDraft {
  return {
    version: 2,
    profiles: config.profiles.map((profile) => ({ ...profile, apiKey: "" })),
    roleBindings: config.roleBindings,
  }
}

function summarizeConnection(result: JarvisModelConnectionResult): { state: ModelConnectionState; text: string; detail: string } {
  if (result.ok) {
    return {
      state: "healthy",
      text: "畅通",
      detail: `延迟 ${result.latencyMs}ms · ${result.modelID}`,
    }
  }

  return {
    state: "error",
    text: "异常",
    detail: result.error,
  }
}

function modelConnectionTone(state: ModelConnectionState): Accent {
  if (state === "healthy") return "emerald"
  if (state === "checking") return "violet"
  if (state === "error") return "amber"
  return "cyan"
}

function PulseCard(props: {
  title: string
  label: string
  value: string
  sub: string
  accent: Accent
  class?: string
  children?: JSX.Element
}) {
  const color = () => accentColors[props.accent]

  return (
    <section class={`jarvis-holo-card jarvis-holo-card--${props.accent} ${props.class ?? ""}`}>
      <div class="jarvis-holo-card__beam" />
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="jarvis-holo-card__dot" style={{ "background-color": color(), "box-shadow": `0 0 12px ${color()}` }} />
          <span class="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">{props.title}</span>
        </div>
        <span class="text-[9px] uppercase tracking-[0.18em] text-white/35">{props.label}</span>
      </div>
      <div class="mt-3 flex items-end justify-between gap-4">
        <div>
          <div class="font-mono text-2xl font-semibold leading-none" style={{ color: color(), "text-shadow": `0 0 18px ${color()}` }}>
            {props.value}
          </div>
          <div class="mt-1 max-w-44 truncate text-[10px] text-white/45">{props.sub}</div>
        </div>
        <div class="jarvis-holo-card__glyph" style={{ "border-color": color() }} />
      </div>
      <Show when={props.children}>
        <div class="mt-3">{props.children}</div>
      </Show>
    </section>
  )
}

function MicroBar(props: { value: number; color: string; label: string }) {
  const percent = () => `${Math.min(100, Math.max(0, props.value))}%`
  return (
    <div class="space-y-1">
      <div class="flex justify-between text-[9px] uppercase tracking-[0.14em] text-white/35">
        <span>{props.label}</span>
        <span>{Math.round(props.value)}%</span>
      </div>
      <div class="h-1 overflow-hidden rounded-full bg-white/5">
        <div class="h-full rounded-full transition-all duration-700" style={{ width: percent(), "background-color": props.color, "box-shadow": `0 0 10px ${props.color}` }} />
      </div>
    </div>
  )
}

export function HolographicHub() {
  const [metrics, setMetrics] = createSignal<JarvisMetricsSnapshot | null>(null)
  const [tools, setTools] = createSignal<JarvisToolMetric[]>([])
  const [growth, setGrowth] = createSignal<JarvisGrowthReport>(emptyGrowthReport())
  const [routingConfig, setRoutingConfig] = createSignal<JarvisModelRoutingConfigSnapshot | null>(null)
  const [routingDraft, setRoutingDraft] = createSignal<JarvisModelRoutingConfigDraft>(defaultRoutingDraft())
  const [latestDecision, setLatestDecision] = createSignal<JarvisModelDecision | null>(null)
  const [modelStatus, setModelStatus] = createSignal<{ state: ModelConnectionState; text: string; detail: string }>({
    state: "checking",
    text: "检测中",
    detail: "正在读取模型配置",
  })
  const [modelDialogOpen, setModelDialogOpen] = createSignal(false)
  const [migrationDialogOpen, setMigrationDialogOpen] = createSignal(false)
  const [profileTesting, setProfileTesting] = createSignal<string | null>(null)
  const [profileTestResult, setProfileTestResult] = createSignal<Record<string, { state: ProfileTestState; text: string }>>({})
  const [modelSaving, setModelSaving] = createSignal(false)
  const [modelError, setModelError] = createSignal<string | null>(null)
  const [toolError, setToolError] = createSignal<string | null>(null)
  const [metricsError, setMetricsError] = createSignal<string | null>(null)
  const [growthError, setGrowthError] = createSignal<string | null>(null)
  const [isScanning, setIsScanning] = createSignal(false)

  onMount(() => {
    let mounted = true
    const fetchTools = async () => {
      try {
        const data = await window.api.jarvisToolMetrics()
        if (mounted) {
          setTools(data)
          setToolError(null)
        }
      } catch (reason) {
        if (mounted) setToolError(String(reason))
      }
    }

    window.api.jarvisMetricsSnapshot().then((snapshot) => {
      if (mounted) {
        setMetrics(snapshot)
        setMetricsError(null)
      }
    }).catch((reason) => {
      if (mounted) setMetricsError(String(reason))
    })
    window.api.jarvisGrowthReport().then((report) => {
      if (mounted) {
        setGrowth(report)
        setGrowthError(null)
      }
    }).catch((reason) => {
      if (mounted) setGrowthError(String(reason))
    })
    void fetchTools()

    const loadRouting = async () => {
      try {
        const config = await window.api.jarvisModelRoutingConfigGet()
        if (!mounted) return
        if (!config) {
          setRoutingConfig(null)
          setRoutingDraft(defaultRoutingDraft())
          setModelStatus({ state: "idle", text: "未配置", detail: "点击配置模型" })
          return
        }
        setRoutingConfig(config)
        setRoutingDraft(routingDraftFromSnapshot(config))
        const fallbackId = config.roleBindings.daily || config.roleBindings.fallback
        const profile = config.profiles.find((item) => item.id === fallbackId) ?? config.profiles[0]
        if (!profile) {
          setModelStatus({ state: "idle", text: "未配置", detail: "点击配置模型" })
          return
        }
        const draft = { ...profile, apiKey: "" }
        setModelStatus({ state: "checking", text: "检测中", detail: `${profile.modelID} · 正在校验连接` })
        const result = await window.api.jarvisModelProfileConnectionTest(draft)
        if (!mounted) return
        setModelStatus(summarizeConnection(result))
      } catch (reason) {
        if (mounted) {
          setModelStatus({ state: "error", text: "异常", detail: String(reason) })
        }
      }
    }
    void loadRouting()

    const unsubscribe = window.api.jarvisMetricsSubscribe((snapshot) => setMetrics(snapshot))
    const unsubscribeDecision = window.api.jarvisModelDecisionSubscribe((decision) => setLatestDecision(decision))
    const timer = setInterval(fetchTools, 2500)

    onCleanup(() => {
      mounted = false
      clearInterval(timer)
      unsubscribe()
      unsubscribeDecision()
    })
  })

  async function scanGrowth() {
    setIsScanning(true)
    setGrowthError(null)
    try {
      setGrowth(await window.api.jarvisGrowthScan())
    } catch (reason) {
      setGrowthError(String(reason))
    } finally {
      setIsScanning(false)
    }
  }

  async function testProfile(profile: JarvisModelProfileDraft) {
    setModelError(null)
    setProfileTesting(profile.id)
    setProfileTestResult((current) => ({ ...current, [profile.id]: { state: "checking", text: "测试中" } }))
    try {
      const result = await window.api.jarvisModelProfileConnectionTest(profile)
      const summary = summarizeConnection(result)
      setProfileTestResult((current) => ({ ...current, [profile.id]: { state: summary.state === "healthy" ? "healthy" : "error", text: summary.detail } }))
      setModelStatus(summarizeConnection(result))
    } catch (reason) {
      setModelStatus({ state: "error", text: "异常", detail: String(reason) })
      setProfileTestResult((current) => ({ ...current, [profile.id]: { state: "error", text: String(reason) } }))
      setModelError(String(reason))
    } finally {
      setProfileTesting(null)
    }
  }

  async function saveRoutingConfig() {
    setModelError(null)
    setModelSaving(true)
    try {
      const saved = await window.api.jarvisModelRoutingConfigSave(routingDraft())
      setRoutingConfig(saved)
      setRoutingDraft(routingDraftFromSnapshot(saved))
      const fallbackId = saved.roleBindings.daily || saved.roleBindings.fallback
      const profile = saved.profiles.find((item) => item.id === fallbackId) ?? saved.profiles[0]
      if (profile) {
        const result = await window.api.jarvisModelProfileConnectionTest({ ...profile, apiKey: "" })
        setModelStatus(summarizeConnection(result))
      }
      setModelDialogOpen(false)
    } catch (reason) {
      setModelError(String(reason))
      setModelStatus({ state: "error", text: "异常", detail: String(reason) })
    } finally {
      setModelSaving(false)
    }
  }

  function openModelDialog() {
    setModelError(null)
    setModelDialogOpen(true)
  }

  function updateProfile(profileId: string, patch: Partial<JarvisModelProfileDraft>) {
    setRoutingDraft((current) => ({
      ...current,
      profiles: current.profiles.map((profile) => profile.id === profileId ? { ...profile, ...patch } : profile),
    }))
  }

  function updateRoleBinding(role: JarvisModelRole, profileId: string) {
    setRoutingDraft((current) => ({
      ...current,
      roleBindings: {
        ...current.roleBindings,
        [role]: profileId,
      },
    }))
  }

  function addProfile() {
    const id = createProfileId()
    setRoutingDraft((current) => ({
      ...current,
      profiles: [
        ...current.profiles,
        {
          id,
          label: "New Model",
          providerType: "openai-compatible",
          baseURL: "https://api.openai.com/v1",
          apiKey: "",
          modelID: "gpt-4.1",
        },
      ],
    }))
  }

  function removeProfile(profileId: string) {
    setRoutingDraft((current) => {
      if (current.profiles.length <= 1) return current
      const profiles = current.profiles.filter((profile) => profile.id !== profileId)
      const fallbackId = profiles[0]?.id ?? profileId
      const roleBindings = { ...current.roleBindings }
      for (const role of modelRoles) {
        if (roleBindings[role] === profileId) roleBindings[role] = fallbackId
      }
      return { ...current, profiles, roleBindings }
    })
  }

  const system = () => metrics()?.system
  const cpu = () => system()?.cpu.percent ?? 0
  const memory = () => system()?.memory.usedPercent ?? 0
  const load = () => system()?.loadAvg ?? 0
  const llm = () => metrics()?.llm
  const llmLatency = () => llm()?.avgLatencyMs ?? 0
  const llmError = () => llm()?.errorRate ?? 0
  const selectedProfile = () => {
    const decision = latestDecision()
    if (decision) return routingDraft().profiles.find((profile) => profile.id === decision.selectedModelId || profile.modelID === decision.selectedModelId)
    const dailyId = routingDraft().roleBindings.daily || routingDraft().roleBindings.fallback
    return routingDraft().profiles.find((profile) => profile.id === dailyId) ?? routingDraft().profiles[0]
  }
  const model = () => compactModelName(latestDecision()?.selectedModelId ?? selectedProfile()?.modelID ?? llm()?.currentModel ?? "standby")
  const modelPulseText = () => latestDecision() ? roleLabels[latestDecision()!.selectedRole] : modelStatus().text
  const modelPulseDetail = () => {
    const decision = latestDecision()
    if (!decision) return `${modelStatus().detail} · ${Math.round(llmError())}% error · ${llm()?.lastTotalTokens ?? 0} tokens`
    return `${decision.phase} · ${decision.reason} · ${Math.round(decision.confidence * 100)}%`
  }
  const modelAccent = () => modelConnectionTone(modelStatus().state)
  const memoryMetrics = () => metrics()?.memory
  const hitRate = () => memoryMetrics()?.hitRate ?? 0
  const recalls = () => memoryMetrics()?.totalRecalls ?? 0
  const hits = () => memoryMetrics()?.totalHits ?? 0
  const totalToolCalls = () => tools().reduce((sum, item) => sum + item.callCount, 0)
  const activeTools = () => tools().filter((item) => item.callCount > 0).length
  const toolHitRate = () => {
    const calls = totalToolCalls()
    if (calls === 0) return 0
    return (tools().reduce((sum, item) => sum + item.hitCount, 0) / calls) * 100
  }
  const growthTotals = () => growth().totals
  const activeTasks = () => jarvisStore.taskSessions.filter((task) => task.status === "active").length
  const hubMode = (): HubMode => {
    if (isScanning()) return "scanning"
    if (jarvisStore.isRecallingMemories) return "recalling"
    return jarvisStore.status
  }
  const coreActive = () => hubMode() !== "idle"

  return (
    <div class="pointer-events-none fixed inset-0 z-20 overflow-hidden">
      <div class="jarvis-hub-bg" classList={{ [`jarvis-hub-bg--${hubMode()}`]: true }} />
      <div class="jarvis-hub-scanline" />

      <div class="jarvis-hub-topline" classList={{ [`jarvis-hub-topline--${hubMode()}`]: true }}>
        <span>JARVIS OS</span>
        <span class="jarvis-hub-mode">{modeLabels[hubMode()]}</span>
        <span>{activeTasks()} ACTIVE TASKS</span>
      </div>

      <div
        class="jarvis-hub-core"
        classList={{
          "jarvis-hub-core--active": coreActive(),
          "jarvis-hub-core--scanning": isScanning(),
          [`jarvis-hub-core--${hubMode()}`]: true,
        }}
      >
        <div class="jarvis-hub-orbit jarvis-hub-orbit--outer" />
        <div class="jarvis-hub-orbit jarvis-hub-orbit--middle" />
        <div class="jarvis-hub-orbit jarvis-hub-orbit--inner" />
        <div class="jarvis-hub-satellite jarvis-hub-satellite--system" />
        <div class="jarvis-hub-satellite jarvis-hub-satellite--memory" />
        <div class="jarvis-hub-satellite jarvis-hub-satellite--growth" />
        <JarvisCore showControl={false} active={coreActive()} />
        <div class="pointer-events-auto absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2">
          <VoiceOrb />
        </div>
        <div class="absolute left-1/2 top-[10%] z-20 -translate-x-1/2 scale-75 opacity-90">
          <MemoryOrb />
        </div>
      </div>

      <div class="jarvis-hub-node jarvis-hub-node--left-top">
        <PulseCard title="Tool Matrix" label="capability" value={`${Math.round(toolHitRate())}%`} sub={`${totalToolCalls()} calls · ${activeTools()} active`} accent="cyan">
          <MicroBar label="hit integrity" value={toolHitRate()} color="#5ef6ff" />
          <Show when={toolError()}>
            {(message) => <div class="mt-2 line-clamp-2 text-[10px] text-red-200/80">{message()}</div>}
          </Show>
        </PulseCard>
      </div>

      <div class="jarvis-hub-node jarvis-hub-node--right-top">
        <PulseCard title="System Pulse" label="runtime" value={`${Math.round(cpu())}%`} sub={`${memory().toFixed(1)}% memory · load ${load().toFixed(2)}`} accent="cyan">
          <div class="grid grid-cols-2 gap-2">
            <MicroBar label="memory" value={memory()} color="#34d399" />
            <MicroBar label="load" value={Math.min(100, load() * 20)} color="#fbbf24" />
          </div>
          <Show when={metricsError()}>
            {(message) => <div class="mt-2 line-clamp-2 text-[10px] text-red-200/80">{message()}</div>}
          </Show>
        </PulseCard>
      </div>

      <div class="jarvis-hub-node jarvis-hub-node--right-mid">
        <div
          class="pointer-events-auto"
          role="button"
          tabIndex={0}
          onClick={openModelDialog}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              openModelDialog()
            }
          }}
        >
          <PulseCard
            title="Model Pulse"
            label={model()}
            value={modelPulseText()}
            sub={modelPulseDetail()}
            accent={modelAccent()}
          >
            <MicroBar label="latency pressure" value={Math.min(100, llmLatency() / 50)} color={accentColors[modelAccent()]} />
          </PulseCard>
        </div>
      </div>

      <div class="jarvis-hub-node jarvis-hub-node--left-mid">
        <PulseCard title="Memory Pulse" label="recall" value={`${Math.round(hitRate())}%`} sub={`${hits()} hits · ${recalls()} recalls`} accent="amber">
          <MicroBar label="recall signal" value={hitRate()} color="#fbbf24" />
        </PulseCard>
      </div>

      <div class="jarvis-hub-node jarvis-hub-node--right-bottom">
        <PulseCard title="Growth Engine" label={isScanning() ? "scanning" : "evolution"} value={`${growthTotals().promotionReady}`} sub={`${growthTotals().discovered} discovered · ${growthTotals().highRisk} risk`} accent="emerald">
          <div class="grid grid-cols-4 gap-2 text-center text-[9px] text-white/55">
            <div><div class="font-mono text-sm text-cyan-200">{growthTotals().discovered}</div><div>发现</div></div>
            <div><div class="font-mono text-sm text-violet-200">{growthTotals().classified}</div><div>分类</div></div>
            <div><div class="font-mono text-sm text-emerald-200">{growthTotals().promotionReady}</div><div>晋升</div></div>
            <div><div class="font-mono text-sm text-amber-200">{growthTotals().highRisk}</div><div>风险</div></div>
          </div>
          <Show when={growthError()}>
            {(message) => <div class="mt-2 line-clamp-2 text-[10px] text-red-200/80">{message()}</div>}
          </Show>
          <button
            type="button"
            class="pointer-events-auto mt-3 w-full rounded border border-emerald-300/30 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100 transition hover:border-emerald-200/70 disabled:opacity-50"
            onClick={scanGrowth}
            disabled={isScanning()}
          >
            {isScanning() ? "Scanning" : "Scan Growth"}
          </button>
          <button
            type="button"
            class="pointer-events-auto mt-2 w-full rounded border border-cyan-300/30 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-100 transition hover:border-cyan-200/70"
            onClick={() => setMigrationDialogOpen(true)}
          >
            Open Migration
          </button>
        </PulseCard>
      </div>

      <div class="jarvis-hub-node jarvis-hub-node--left-bottom">
        <PulseCard title="Task Field" label="action" value={`${activeTasks()}`} sub={`${jarvisStore.taskSessions.length} total sessions`} accent="emerald">
          <For each={jarvisStore.taskSessions.filter((task) => task.status === "active").slice(0, 2)}>
            {(task) => <div class="truncate text-[10px] text-white/45">{task.title || "新任务"}</div>}
          </For>
          <Show when={activeTasks() === 0}>
            <div class="text-[10px] text-white/35">standby for command</div>
          </Show>
        </PulseCard>
      </div>

      <Show when={modelDialogOpen()}>
        <div class="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-sm" onClick={() => setModelDialogOpen(false)}>
          <div class="max-h-[86vh] w-full max-w-[860px] overflow-y-auto rounded-[18px] border border-white/10 bg-[#070c0e]/95 p-5 text-white shadow-[0_0_60px_rgba(0,0,0,0.45)]" onClick={(event) => event.stopPropagation()}>
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200/70">Model Command Center</div>
                <div class="mt-1 text-lg font-semibold text-white">多模型路由</div>
              </div>
              <div class="text-right">
                <div class="text-[10px] uppercase tracking-[0.18em] text-white/40">{modelStatus().text}</div>
                <div class="mt-1 max-w-72 text-[11px] leading-relaxed text-white/55">{modelStatus().detail}</div>
              </div>
            </div>

            <div class="mt-5 grid gap-4 lg:grid-cols-[1fr_260px]">
              <div class="space-y-3">
                <Index each={routingDraft().profiles}>
                  {(profile) => {
                    const saved = () => routingConfig()?.profiles.find((item) => item.id === profile().id)
                    const result = () => profileTestResult()[profile().id]
                    return (
                      <section class="jarvis-model-profile-card">
                        <div class="flex items-start justify-between gap-3">
                          <div>
                            <input
                              class="jarvis-model-input text-sm font-semibold"
                              value={profile().label}
                              onInput={(event) => updateProfile(profile().id, { label: event.currentTarget.value })}
                            />
                            <div class="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/35">{profile().id}</div>
                          </div>
                          <div class="flex items-center gap-2">
                            <button type="button" class="jarvis-mini-button" onClick={() => testProfile(profile())} disabled={profileTesting() === profile().id || modelSaving()}>
                              {profileTesting() === profile().id ? "Testing" : "Test"}
                            </button>
                            <button type="button" class="jarvis-mini-button jarvis-mini-button--danger" onClick={() => removeProfile(profile().id)} disabled={routingDraft().profiles.length <= 1 || modelSaving()}>
                              Remove
                            </button>
                          </div>
                        </div>
                        <div class="mt-3 grid gap-3 md:grid-cols-2">
                          <label class="block space-y-1.5">
                            <span class="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Base URL</span>
                            <input class="jarvis-model-input" value={profile().baseURL} onInput={(event) => updateProfile(profile().id, { baseURL: event.currentTarget.value })} />
                          </label>
                          <label class="block space-y-1.5">
                            <span class="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Model ID</span>
                            <input class="jarvis-model-input" value={profile().modelID} onInput={(event) => updateProfile(profile().id, { modelID: event.currentTarget.value })} />
                          </label>
                        </div>
                        <label class="mt-3 block space-y-1.5">
                          <span class="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">API Key</span>
                          <input
                            type="password"
                            class="jarvis-model-input"
                            value={profile().apiKey ?? ""}
                            placeholder={saved()?.hasApiKey ? "已保存，留空则沿用" : "请输入"}
                            onInput={(event) => updateProfile(profile().id, { apiKey: event.currentTarget.value })}
                          />
                        </label>
                        <Show when={result()}>
                          {(item) => (
                            <div
                              class="mt-3 rounded border px-3 py-2 text-[11px]"
                              classList={{
                                "border-emerald-300/25 bg-emerald-500/10 text-emerald-100": item().state === "healthy",
                                "border-red-400/20 bg-red-500/10 text-red-100": item().state === "error",
                                "border-violet-300/25 bg-violet-500/10 text-violet-100": item().state === "checking",
                              }}
                            >
                              {item().text}
                            </div>
                          )}
                        </Show>
                      </section>
                    )
                  }}
                </Index>
                <button type="button" class="jarvis-mini-button w-full" onClick={addProfile} disabled={modelSaving()}>
                  Add Profile
                </button>
              </div>

              <section class="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <div class="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200/70">Role Binding</div>
                <div class="mt-3 space-y-3">
                  <For each={modelRoles}>
                    {(role) => (
                      <label class="block space-y-1.5">
                        <span class="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">{roleLabels[role]}</span>
                        <select class="jarvis-model-input" value={routingDraft().roleBindings[role]} onChange={(event) => updateRoleBinding(role, event.currentTarget.value)}>
                          <Index each={routingDraft().profiles}>
                            {(profile) => <option value={profile().id}>{profile().label || profile().modelID}</option>}
                          </Index>
                        </select>
                      </label>
                    )}
                  </For>
                </div>
                <Show when={latestDecision()}>
                  {(decision) => (
                    <div class="mt-4 rounded border border-cyan-300/20 bg-cyan-500/10 px-3 py-2 text-[11px] leading-relaxed text-cyan-50/80">
                      当前决策：{decision().phase} 使用 {roleLabels[decision().selectedRole]} / {decision().selectedModelId}
                      <br />
                      {decision().reason}
                    </div>
                  )}
                </Show>
              </section>
            </div>

            <Show when={modelError()}>
              {(message) => <div class="mt-3 rounded border border-red-400/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-100">{message()}</div>}
            </Show>

            <div class="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                class="rounded border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/70 transition hover:border-white/25"
                onClick={() => {
                  setRoutingDraft(routingConfig() ? routingDraftFromSnapshot(routingConfig()!) : defaultRoutingDraft())
                  setProfileTestResult({})
                }}
              >
                Reset
              </button>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="rounded border border-emerald-300/30 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100 transition hover:border-emerald-200/70 disabled:opacity-50"
                  onClick={saveRoutingConfig}
                  disabled={profileTesting() !== null || modelSaving()}
                >
                  {modelSaving() ? "Saving" : "Save"}
                </button>
                <button
                  type="button"
                  class="rounded border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/60 transition hover:border-white/25"
                  onClick={() => setModelDialogOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </Show>

      <Show when={migrationDialogOpen()}>
        <div class="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-sm" onClick={() => setMigrationDialogOpen(false)}>
          <div class="max-h-[86vh] w-full max-w-[720px] overflow-y-auto rounded-[18px] border border-white/10 bg-[#070c0e]/95 p-5 text-white shadow-[0_0_60px_rgba(0,0,0,0.45)]" onClick={(event) => event.stopPropagation()}>
            <div class="mb-4 flex items-start justify-between gap-4">
              <div>
                <div class="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200/70">Migration Control</div>
                <div class="mt-1 text-lg font-semibold text-white">旧 Jarvis 迁移试点</div>
              </div>
              <button
                type="button"
                class="rounded border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/60 transition hover:border-white/25"
                onClick={() => setMigrationDialogOpen(false)}
              >
                Close
              </button>
            </div>
            <MigrationPanel />
          </div>
        </div>
      </Show>
    </div>
  )
}
