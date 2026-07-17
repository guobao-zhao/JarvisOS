import { contextBridge, ipcRenderer, webUtils } from "electron"
import type {
  ElectronAPI,
  JarvisGrowthPromotionDecision,
  JarvisGrowthReport,
  JarvisIntelligenceBriefing,
  JarvisMemorySearchResponse,
  JarvisMemorySupervisorStatus,
  JarvisMemoryWriteResponse,
  JarvisMemoryDiagnostics,
  JarvisMetricsSnapshot,
  JarvisMigrationImportResult,
  JarvisMigrationPreview,
  JarvisModelConfigDraft,
  JarvisModelConfigSnapshot,
  JarvisModelConnectionResult,
  JarvisModelDecision,
  JarvisModelProfileDraft,
  JarvisModelRole,
  JarvisModelRoutingConfigDraft,
  JarvisModelRoutingConfigSnapshot,
  JarvisStreamChatOptions,
  JarvisStreamChatMessage,
  JarvisToolMetric,
  WslServersEvent,
} from "./types"
import type { UpdaterState } from "@opencode-ai/app/updater"

const updaterCallbacks = new Set<(state: UpdaterState) => void>()
let updaterState: UpdaterState | undefined
let updaterSubscription: Promise<void> | undefined
const updaterHandler = (_: unknown, state: UpdaterState) => {
  updaterState = state
  updaterCallbacks.forEach((callback) => callback(state))
}

const api: ElectronAPI = {
  killSidecar: () => ipcRenderer.invoke("kill-sidecar"),
  installCli: () => ipcRenderer.invoke("install-cli"),
  awaitInitialization: () => ipcRenderer.invoke("await-initialization"),
  wslServers: {
    getState: () => ipcRenderer.invoke("wsl-servers-get-state"),
    subscribe: (cb) => {
      const handler = (_: unknown, event: WslServersEvent) => cb(event)
      ipcRenderer.on("wsl-servers-event", handler)
      void ipcRenderer.invoke("wsl-servers-subscribe")
      return () => {
        ipcRenderer.removeListener("wsl-servers-event", handler)
        void ipcRenderer.invoke("wsl-servers-unsubscribe")
      }
    },
    probeRuntime: () => ipcRenderer.invoke("wsl-servers-probe-runtime"),
    refreshDistros: () => ipcRenderer.invoke("wsl-servers-refresh-distros"),
    installWsl: () => ipcRenderer.invoke("wsl-servers-install-wsl"),
    installDistro: (name) => ipcRenderer.invoke("wsl-servers-install-distro", name),
    probeAddable: (distros) => ipcRenderer.invoke("wsl-servers-probe-addable", distros),
    installOpencode: (name) => ipcRenderer.invoke("wsl-servers-install-opencode", name),
    openTerminal: (name) => ipcRenderer.invoke("wsl-servers-open-terminal", name),
    addServer: (distro) => ipcRenderer.invoke("wsl-servers-add", distro),
    removeServer: (id) => ipcRenderer.invoke("wsl-servers-remove", id),
    startServer: (id) => ipcRenderer.invoke("wsl-servers-start", id),
  },
  updater: {
    subscribe: async (cb) => {
      updaterCallbacks.add(cb)
      if (updaterState) cb(updaterState)
      if (!updaterSubscription) {
        ipcRenderer.on("updater-state", updaterHandler)
        updaterSubscription = ipcRenderer.invoke("updater-subscribe")
      }
      await updaterSubscription
      return () => {
        updaterCallbacks.delete(cb)
        if (updaterCallbacks.size > 0) return
        ipcRenderer.removeListener("updater-state", updaterHandler)
        updaterSubscription = undefined
        void ipcRenderer.invoke("updater-unsubscribe")
      }
    },
    check: () => ipcRenderer.invoke("updater-check"),
    install: () => ipcRenderer.invoke("updater-install"),
  },
  consumeInitialDeepLinks: () => ipcRenderer.invoke("consume-initial-deep-links"),
  getDefaultServerUrl: () => ipcRenderer.invoke("get-default-server-url"),
  setDefaultServerUrl: (url) => ipcRenderer.invoke("set-default-server-url", url),
  getDisplayBackend: () => ipcRenderer.invoke("get-display-backend"),
  setDisplayBackend: (backend) => ipcRenderer.invoke("set-display-backend", backend),
  parseMarkdownCommand: (markdown) => ipcRenderer.invoke("parse-markdown", markdown),
  checkAppExists: (appName) => ipcRenderer.invoke("check-app-exists", appName),
  resolveAppPath: (appName) => ipcRenderer.invoke("resolve-app-path", appName),
  storeGet: (name, key) => ipcRenderer.invoke("store-get", name, key),
  storeSet: (name, key, value) => ipcRenderer.invoke("store-set", name, key, value),
  storeDelete: (name, key) => ipcRenderer.invoke("store-delete", name, key),
  storeClear: (name) => ipcRenderer.invoke("store-clear", name),
  storeKeys: (name) => ipcRenderer.invoke("store-keys", name),
  storeLength: (name) => ipcRenderer.invoke("store-length", name),

  getWindowCount: () => ipcRenderer.invoke("get-window-count"),
  getWindowID: () => ipcRenderer.invoke("get-window-id"),
  onMenuCommand: (cb) => {
    const handler = (_: unknown, id: string) => cb(id)
    ipcRenderer.on("menu-command", handler)
    return () => ipcRenderer.removeListener("menu-command", handler)
  },
  onDeepLink: (cb) => {
    const handler = (_: unknown, urls: string[]) => cb(urls)
    ipcRenderer.on("deep-link", handler)
    return () => ipcRenderer.removeListener("deep-link", handler)
  },

  jarvisStreamChat: (messages: JarvisStreamChatMessage[], callbacks, options?: JarvisStreamChatOptions) => {
    const deltaHandler = (_: unknown, delta: string) => callbacks.onDelta(delta)
    const errorHandler = (_: unknown, error: string) => callbacks.onError(error)
    const doneHandler = () => callbacks.onDone()

    ipcRenderer.on("jarvis:stream-chat:delta", deltaHandler)
    ipcRenderer.on("jarvis:stream-chat:error", errorHandler)
    ipcRenderer.on("jarvis:stream-chat:done", doneHandler)

    ipcRenderer.send("jarvis:stream-chat", messages, options)

    return () => {
      ipcRenderer.removeListener("jarvis:stream-chat:delta", deltaHandler)
      ipcRenderer.removeListener("jarvis:stream-chat:error", errorHandler)
      ipcRenderer.removeListener("jarvis:stream-chat:done", doneHandler)
    }
  },

  jarvisMemorySearch: (query, options) =>
    ipcRenderer.invoke("jarvis:memory-search", query, options) as Promise<JarvisMemorySearchResponse>,

  jarvisMemoryWrite: (doc) =>
    ipcRenderer.invoke("jarvis:memory-write", doc) as Promise<JarvisMemoryWriteResponse>,
  jarvisMemoryDiagnostics: (query) =>
    ipcRenderer.invoke("jarvis:memory-diagnostics", query) as Promise<JarvisMemoryDiagnostics>,
  jarvisMemorySupervisorStatus: () =>
    ipcRenderer.invoke("jarvis:memory-supervisor-status") as Promise<JarvisMemorySupervisorStatus>,
  jarvisMemorySupervisorStart: () =>
    ipcRenderer.invoke("jarvis:memory-supervisor-start") as Promise<JarvisMemorySupervisorStatus>,
  jarvisMemorySupervisorSubscribe: (cb) => {
    const handler = (_: unknown, status: JarvisMemorySupervisorStatus) => cb(status)
    ipcRenderer.on("jarvis:memory-supervisor-update", handler)
    void ipcRenderer.invoke("jarvis:memory-supervisor-subscribe")
    return () => {
      ipcRenderer.removeListener("jarvis:memory-supervisor-update", handler)
    }
  },
  jarvisModelConfigGet: () => ipcRenderer.invoke("jarvis:model-config-get") as Promise<JarvisModelConfigSnapshot | null>,
  jarvisModelConfigSave: (config: JarvisModelConfigDraft) =>
    ipcRenderer.invoke("jarvis:model-config-save", config) as Promise<JarvisModelConfigSnapshot>,
  jarvisModelConnectionTest: (config: JarvisModelConfigDraft) =>
    ipcRenderer.invoke("jarvis:model-connection-test", config) as Promise<JarvisModelConnectionResult>,
  jarvisModelRoutingConfigGet: () =>
    ipcRenderer.invoke("jarvis:model-routing-config-get") as Promise<JarvisModelRoutingConfigSnapshot | null>,
  jarvisModelRoutingConfigSave: (config: JarvisModelRoutingConfigDraft) =>
    ipcRenderer.invoke("jarvis:model-routing-config-save", config) as Promise<JarvisModelRoutingConfigSnapshot>,
  jarvisModelProfileConnectionTest: (profile: JarvisModelProfileDraft) =>
    ipcRenderer.invoke("jarvis:model-profile-connection-test", profile) as Promise<JarvisModelConnectionResult>,
  jarvisModelDecisionHistory: (taskId?: string) =>
    ipcRenderer.invoke("jarvis:model-decision-history", taskId) as Promise<JarvisModelDecision[]>,
  jarvisModelOverrideTask: (taskId: string, role: JarvisModelRole | null) =>
    ipcRenderer.invoke("jarvis:model-override-task", taskId, role) as Promise<void>,
  jarvisModelDecisionSubscribe: (cb) => {
    const handler = (_: unknown, decision: JarvisModelDecision) => cb(decision)
    ipcRenderer.on("jarvis:model-decision", handler)
    return () => {
      ipcRenderer.removeListener("jarvis:model-decision", handler)
    }
  },

  jarvisMetricsSnapshot: () =>
    ipcRenderer.invoke("jarvis:metrics-snapshot") as Promise<JarvisMetricsSnapshot>,

  jarvisMetricsSubscribe: (cb) => {
    const handler = (_: unknown, snapshot: JarvisMetricsSnapshot) => cb(snapshot)
    ipcRenderer.on("jarvis:metrics-update", handler)
    return () => {
      ipcRenderer.removeListener("jarvis:metrics-update", handler)
    }
  },

  jarvisToolMetrics: () => ipcRenderer.invoke("jarvis:tool-metrics") as Promise<JarvisToolMetric[]>,

  jarvisGrowthReport: () => ipcRenderer.invoke("jarvis:growth-report") as Promise<JarvisGrowthReport>,
  jarvisGrowthScan: () => ipcRenderer.invoke("jarvis:growth-scan") as Promise<JarvisGrowthReport>,
  jarvisGrowthSetSourceRoot: (sourceRoot) =>
    ipcRenderer.invoke("jarvis:growth-set-source-root", sourceRoot) as Promise<JarvisGrowthReport>,
  jarvisGrowthApprovePromotion: (assetId) =>
    ipcRenderer.invoke("jarvis:growth-approve-promotion", assetId) as Promise<JarvisGrowthPromotionDecision>,
  jarvisGrowthSubscribe: (cb) => {
    const handler = (_: unknown, report: JarvisGrowthReport) => cb(report)
    ipcRenderer.on("jarvis:growth-update", handler)
    return () => {
      ipcRenderer.removeListener("jarvis:growth-update", handler)
    }
  },
  jarvisIntelligenceBriefing: () =>
    ipcRenderer.invoke("jarvis:intelligence-briefing") as Promise<JarvisIntelligenceBriefing>,
  jarvisIntelligenceSubscribe: (cb) => {
    const handler = (_: unknown, briefing: JarvisIntelligenceBriefing) => cb(briefing)
    ipcRenderer.on("jarvis:intelligence-update", handler)
    return () => {
      ipcRenderer.removeListener("jarvis:intelligence-update", handler)
    }
  },
  jarvisMigrationPreview: (root) => ipcRenderer.invoke("jarvis:migration-preview", root) as Promise<JarvisMigrationPreview>,
  jarvisMigrationImport: (root) => ipcRenderer.invoke("jarvis:migration-import", root) as Promise<JarvisMigrationImportResult>,

  openDirectoryPicker: (opts) => ipcRenderer.invoke("open-directory-picker", opts),
  openFilePicker: (opts) => ipcRenderer.invoke("open-file-picker", opts),
  readPickedFile: (token, path) => ipcRenderer.invoke("read-picked-file", token, path),
  releasePickedFiles: (token) => ipcRenderer.invoke("release-picked-files", token),
  getPathForFile: (file) => webUtils.getPathForFile(file),
  saveFilePicker: (opts) => ipcRenderer.invoke("save-file-picker", opts),
  openLink: (url) => ipcRenderer.send("open-link", url),
  openPath: (path, app) => ipcRenderer.invoke("open-path", path, app),
  readClipboardImage: () => ipcRenderer.invoke("read-clipboard-image"),
  showNotification: (title, body) => ipcRenderer.send("show-notification", title, body),
  getWindowFocused: () => ipcRenderer.invoke("get-window-focused"),
  setWindowFocus: () => ipcRenderer.invoke("set-window-focus"),
  showWindow: () => ipcRenderer.invoke("show-window"),
  relaunch: () => ipcRenderer.send("relaunch"),
  getZoomFactor: () => ipcRenderer.invoke("get-zoom-factor"),
  setZoomFactor: (factor) => ipcRenderer.invoke("set-zoom-factor", factor),
  getPinchZoomEnabled: () => ipcRenderer.invoke("get-pinch-zoom-enabled"),
  setPinchZoomEnabled: (enabled) => ipcRenderer.invoke("set-pinch-zoom-enabled", enabled),
  onPinchZoomEnabledChanged: (cb) => {
    const handler = (_: unknown, enabled: boolean) => cb(enabled)
    ipcRenderer.on("pinch-zoom-enabled-changed", handler)
    return () => ipcRenderer.removeListener("pinch-zoom-enabled-changed", handler)
  },
  onZoomFactorChanged: (cb) => {
    const handler = (_: unknown, factor: number) => cb(factor)
    ipcRenderer.on("zoom-factor-changed", handler)
    return () => ipcRenderer.removeListener("zoom-factor-changed", handler)
  },
  setTitlebar: (theme) => ipcRenderer.invoke("set-titlebar", theme),
  runDesktopMenuAction: (action) => ipcRenderer.invoke("run-desktop-menu-action", action),
  setBackgroundColor: (color: string) => ipcRenderer.invoke("set-background-color", color),
  exportDebugLogs: () => ipcRenderer.invoke("export-debug-logs"),
  recordFatalRendererError: (error) => ipcRenderer.invoke("record-fatal-renderer-error", error),
}

contextBridge.exposeInMainWorld("api", api)
