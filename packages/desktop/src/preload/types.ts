import type { DesktopMenuAction } from "@opencode-ai/app/desktop-menu"
import type { WslServersPlatform } from "@opencode-ai/app/wsl/types"
import type { UpdaterState } from "@opencode-ai/app/updater"
export type {
  WslDistroProbe,
  WslInstalledDistro,
  WslJob,
  WslOnlineDistro,
  WslOpencodeCheck,
  WslRuntimeCheck,
  WslServerConfig,
  WslServerItem,
  WslServerRuntime,
  WslServersEvent,
  WslServersState,
} from "@opencode-ai/app/wsl/types"

export type ServerReadyData = {
  url: string
  username: string | null
  password: string | null
}

export type WslServersAPI = WslServersPlatform
export type UpdaterAPI = {
  subscribe: (cb: (state: UpdaterState) => void) => Promise<() => void>
  check: () => Promise<UpdaterState>
  install: () => Promise<void>
}

export type LinuxDisplayBackend = "wayland" | "auto"
export type TitlebarTheme = {
  mode: "light" | "dark"
}
export type FatalRendererError = {
  error: string
  url: string
  version?: string
  platform: string
  os?: string
}

export type JarvisStreamChatMessage = {
  role: "user" | "assistant" | "system"
  content: string
}

export type JarvisModelProviderType = "openai-compatible"
export type JarvisModelRole = "daily" | "designer" | "worker" | "reviewer" | "fallback"

export type JarvisModelConfigDraft = {
  providerType: JarvisModelProviderType
  baseURL: string
  apiKey?: string
  modelID: string
}

export type JarvisModelConfigSnapshot = {
  providerType: JarvisModelProviderType
  baseURL: string
  modelID: string
  hasApiKey: boolean
}

export type JarvisModelProfileDraft = {
  id: string
  label: string
  providerType: JarvisModelProviderType
  baseURL: string
  apiKey?: string
  modelID: string
}

export type JarvisModelProfileSnapshot = {
  id: string
  label: string
  providerType: JarvisModelProviderType
  baseURL: string
  modelID: string
  hasApiKey: boolean
}

export type JarvisModelRoutingConfigDraft = {
  version: 2
  profiles: JarvisModelProfileDraft[]
  roleBindings: Record<JarvisModelRole, string>
}

export type JarvisModelRoutingConfigSnapshot = {
  version: 2
  profiles: JarvisModelProfileSnapshot[]
  roleBindings: Record<JarvisModelRole, string>
}

export type JarvisWorkPhase =
  | "chat"
  | "triage"
  | "clarify"
  | "design"
  | "plan"
  | "execute"
  | "verify"
  | "debug"
  | "review"

export type JarvisModelDecision = {
  id: string
  taskId?: string
  phase: JarvisWorkPhase
  selectedRole: JarvisModelRole
  selectedModelId: string
  reason: string
  confidence: number
  overrideable: boolean
  createdAt: number
}

export type JarvisModelConnectionResult =
  | { ok: true; status: number; latencyMs: number; modelID: string }
  | { ok: false; status?: number; latencyMs: number; modelID: string; error: string }

export type MemorySource =
  | "conversation"
  | "intelligence"
  | "user_manual"
  | "task"
  | "insight"
  | "growth"

export type MemoryDocument = {
  id: string
  source: MemorySource
  title: string
  content: string
  tags: string[]
  createdAt: number
  updatedAt: number
  relations?: string[]
}

export type MemoryHit = {
  id: string
  title: string
  content: string
  score: number
  source: MemorySource
  path?: string
}

export type JarvisMemorySearchResponse =
  | { ok: true; hits: MemoryHit[] }
  | { ok: false; error: string }

export type JarvisMemoryWriteResponse =
  | { ok: true }
  | { ok: false; error: string }

export type JarvisSystemMetricsSnapshot = {
  timestamp: number
  cpu: { percent: number; cores: number }
  memory: { usedPercent: number; usedGB: number; totalGB: number }
  loadAvg: number
  history: { cpu: number[]; memory: number[] }
}

export type JarvisLLMMetricsSnapshot = {
  currentModel: string | null
  totalCalls: number
  totalErrors: number
  errorRate: number
  avgLatencyMs: number
  lastLatencyMs: number
  avgInputChars: number
  avgOutputChars: number
  totalTokens: number
  lastTotalTokens: number
  avgInputTokens: number
  avgOutputTokens: number
  history: number[]
}

export type JarvisMemoryMetricsSnapshot = {
  totalRecalls: number
  avgLatencyMs: number
  lastLatencyMs: number
  totalHits: number
  hitRate: number
  history: number[]
}

export type JarvisMetricsSnapshot = {
  system: JarvisSystemMetricsSnapshot | null
  llm: JarvisLLMMetricsSnapshot | null
  memory: JarvisMemoryMetricsSnapshot | null
}

export type JarvisToolMetric = {
  toolName: string
  skillName: string
  callCount: number
  hitCount: number
  missCount: number
  errorCount: number
  avgLatencyMs: number
  lastUsedAt: number
}

export type JarvisGrowthReportTotals = {
  discovered: number
  classified: number
  sandboxPassed: number
  sandboxFailed: number
  promotionReady: number
  highRisk: number
}

export type JarvisGrowthSuggestion = {
  assetId: string
  title: string
  recommended: boolean
  reason: string
  risk: string
  action: string
}

export type JarvisGrowthProfile = {
  focusAreas: string[]
  safeCapabilityCount: number
  highRiskCount: number
  promotionReadyCount: number
}

export type JarvisGrowthReminder = {
  id: string
  level: "info" | "warning"
  title: string
  message: string
}

export type JarvisGrowthChallenge = {
  id: string
  title: string
  question: string
  evidence: string[]
}

export type JarvisGrowthReport = {
  generatedAt: number
  sourceRoot: string
  totals: JarvisGrowthReportTotals
  suggestions: JarvisGrowthSuggestion[]
  risks: string[]
  nextActions: string[]
  profile?: JarvisGrowthProfile
  reminders?: JarvisGrowthReminder[]
  challenges?: JarvisGrowthChallenge[]
}

export type JarvisGrowthPromotionDecision = {
  assetId: string
  approved: boolean
  decidedAt: number
  promotedToolName?: string
  reason: string
}

export type JarvisIntelligenceBriefing = {
  generatedAt: number
  sources: string[]
  summary: string
  items: { title: string; sourcePath: string; excerpt: string }[]
}

export type JarvisMigrationCandidate = {
  sourcePath: string
  title: string
  source: MemorySource
  tags: string[]
}

export type JarvisMigrationPreview = {
  root: string
  candidates: JarvisMigrationCandidate[]
  skipped: string[]
}

export type JarvisMigrationImportResult = {
  imported: number
  skipped: number
}

export type ElectronAPI = {
  killSidecar: () => Promise<void>
  installCli: () => Promise<string>
  awaitInitialization: () => Promise<ServerReadyData>
  wslServers: WslServersAPI
  updater: UpdaterAPI
  consumeInitialDeepLinks: () => Promise<string[]>
  getDefaultServerUrl: () => Promise<string | null>
  setDefaultServerUrl: (url: string | null) => Promise<void>
  getDisplayBackend: () => Promise<LinuxDisplayBackend | null>
  setDisplayBackend: (backend: LinuxDisplayBackend | null) => Promise<void>
  parseMarkdownCommand: (markdown: string) => Promise<string>
  checkAppExists: (appName: string) => Promise<boolean>
  resolveAppPath: (appName: string) => Promise<string | null>
  storeGet: (name: string, key: string) => Promise<string | null>
  storeSet: (name: string, key: string, value: string) => Promise<void>
  storeDelete: (name: string, key: string) => Promise<void>
  storeClear: (name: string) => Promise<void>
  storeKeys: (name: string) => Promise<string[]>
  storeLength: (name: string) => Promise<number>

  getWindowCount: () => Promise<number>
  getWindowID: () => Promise<string>
  onMenuCommand: (cb: (id: string) => void) => () => void
  onDeepLink: (cb: (urls: string[]) => void) => () => void

  jarvisStreamChat: (
    messages: JarvisStreamChatMessage[],
    callbacks: {
      onDelta: (delta: string) => void
      onError: (error: string) => void
      onDone: () => void
    },
  ) => () => void

  jarvisMemorySearch: (
    query: string,
    options?: { topK?: number; source?: MemorySource; includeContent?: boolean },
  ) => Promise<JarvisMemorySearchResponse>
  jarvisMemoryWrite: (doc: MemoryDocument) => Promise<JarvisMemoryWriteResponse>
  jarvisModelConfigGet: () => Promise<JarvisModelConfigSnapshot | null>
  jarvisModelConfigSave: (config: JarvisModelConfigDraft) => Promise<JarvisModelConfigSnapshot>
  jarvisModelConnectionTest: (config: JarvisModelConfigDraft) => Promise<JarvisModelConnectionResult>
  jarvisModelRoutingConfigGet: () => Promise<JarvisModelRoutingConfigSnapshot | null>
  jarvisModelRoutingConfigSave: (config: JarvisModelRoutingConfigDraft) => Promise<JarvisModelRoutingConfigSnapshot>
  jarvisModelProfileConnectionTest: (profile: JarvisModelProfileDraft) => Promise<JarvisModelConnectionResult>

  jarvisMetricsSnapshot: () => Promise<JarvisMetricsSnapshot>
  jarvisMetricsSubscribe: (cb: (snapshot: JarvisMetricsSnapshot) => void) => () => void

  jarvisToolMetrics: () => Promise<JarvisToolMetric[]>
  jarvisGrowthReport: () => Promise<JarvisGrowthReport>
  jarvisGrowthScan: () => Promise<JarvisGrowthReport>
  jarvisGrowthSetSourceRoot: (sourceRoot: string | null) => Promise<JarvisGrowthReport>
  jarvisGrowthApprovePromotion: (assetId: string) => Promise<JarvisGrowthPromotionDecision>
  jarvisGrowthSubscribe: (cb: (report: JarvisGrowthReport) => void) => () => void
  jarvisIntelligenceBriefing: () => Promise<JarvisIntelligenceBriefing>
  jarvisIntelligenceSubscribe: (cb: (briefing: JarvisIntelligenceBriefing) => void) => () => void
  jarvisMigrationPreview: (root: string) => Promise<JarvisMigrationPreview>
  jarvisMigrationImport: (root: string) => Promise<JarvisMigrationImportResult>

  openDirectoryPicker: (opts?: {
    multiple?: boolean
    title?: string
    defaultPath?: string
  }) => Promise<string | string[] | null>
  openFilePicker: (opts?: {
    multiple?: boolean
    title?: string
    defaultPath?: string
    extensions?: string[]
  }) => Promise<{ token: string; files: { path: string; name: string; size: number }[] } | null>
  readPickedFile: (token: string, path: string) => Promise<ArrayBuffer>
  releasePickedFiles: (token: string) => Promise<void>
  getPathForFile: (file: File) => string
  saveFilePicker: (opts?: { title?: string; defaultPath?: string }) => Promise<string | null>
  openLink: (url: string) => void
  openPath: (path: string, app?: string) => Promise<void>
  readClipboardImage: () => Promise<{ buffer: ArrayBuffer; width: number; height: number } | null>
  showNotification: (title: string, body?: string) => void
  getWindowFocused: () => Promise<boolean>
  setWindowFocus: () => Promise<void>
  showWindow: () => Promise<void>
  relaunch: () => void
  getZoomFactor: () => Promise<number>
  setZoomFactor: (factor: number) => Promise<void>
  getPinchZoomEnabled: () => Promise<boolean>
  setPinchZoomEnabled: (enabled: boolean) => Promise<void>
  onPinchZoomEnabledChanged: (cb: (enabled: boolean) => void) => () => void
  onZoomFactorChanged: (cb: (factor: number) => void) => () => void
  setTitlebar: (theme: TitlebarTheme) => Promise<void>
  runDesktopMenuAction: (action: DesktopMenuAction) => Promise<void>
  setBackgroundColor: (color: string) => Promise<void>
  exportDebugLogs: () => Promise<string>
  recordFatalRendererError: (error: FatalRendererError) => Promise<void>
}
