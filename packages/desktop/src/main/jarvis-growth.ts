import { app, BrowserWindow, Notification } from "electron"
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import {
  appendGrowthReport,
  approvePromotionSuggestion,
  createGrowthService,
  loadLatestGrowthReport,
  saveGrowthReport,
  type GrowthReport,
  type PromotionDecision,
} from "@jarvis-os/growth"
import { write as writeLog } from "./logging"
import { recordGrowthReport } from "./jarvis-metrics"

type GrowthConfig = {
  sourceRoot: string | null
}

let latestReport: GrowthReport | null = null
let defaultSourceRoot: string | null = null
let refreshTimer: ReturnType<typeof setInterval> | null = null
let lastNotificationSignature = ""

const DEFAULT_REFRESH_INTERVAL_MS = 30 * 60 * 1000

function latestReportPath(): string {
  return join(app.getPath("userData"), "jarvis", "growth", "latest.json")
}

function historyReportPath(): string {
  return join(app.getPath("userData"), "jarvis", "growth", "history.jsonl")
}

function promotionDecisionsPath(): string {
  return join(app.getPath("userData"), "jarvis", "growth", "promotions.jsonl")
}

function configPath(): string {
  return join(app.getPath("userData"), "jarvis", "growth", "config.json")
}

async function appendPromotionDecision(decision: PromotionDecision): Promise<void> {
  const filePath = promotionDecisionsPath()
  await mkdir(dirname(filePath), { recursive: true })
  await appendFile(filePath, `${JSON.stringify(decision)}\n`, "utf8")
}

function signatureFor(report: GrowthReport): string {
  return [
    report.sourceRoot,
    report.totals.discovered,
    report.totals.classified,
    report.totals.sandboxPassed,
    report.totals.sandboxFailed,
    report.totals.promotionReady,
    report.totals.highRisk,
    report.reminders?.map((reminder) => reminder.id).join(",") ?? "",
    report.challenges?.map((challenge) => challenge.id).join(",") ?? "",
    report.suggestions.slice(0, 5).map((suggestion) => `${suggestion.assetId}:${suggestion.recommended}`).join(","),
  ].join("|")
}

function broadcastGrowthReport(report: GrowthReport): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue
    win.webContents.send("jarvis:growth-update", report)
  }
}

function maybeNotifyGrowthReport(report: GrowthReport): void {
  const signature = signatureFor(report)
  if (signature === lastNotificationSignature) return
  lastNotificationSignature = signature

  if (report.totals.discovered === 0 && report.totals.promotionReady === 0 && report.totals.highRisk === 0) {
    return
  }

  const reminder = report.reminders?.[0]
  const challenge = report.challenges?.[0]
  const body =
    reminder?.message ??
    challenge?.question ??
    `发现 ${report.totals.discovered} 项资产，${report.totals.promotionReady} 项可晋升，${report.totals.highRisk} 项高风险。`

  new Notification({
    title: "Jarvis Growth",
    body,
  }).show()
}

async function loadGrowthConfig(): Promise<GrowthConfig | null> {
  try {
    return JSON.parse(await readFile(configPath(), "utf8")) as GrowthConfig
  } catch {
    return null
  }
}

async function saveGrowthConfig(config: GrowthConfig): Promise<void> {
  const filePath = configPath()
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(config, null, 2)}\n`, "utf8")
}

async function persistGrowthReport(report: GrowthReport): Promise<void> {
  await saveGrowthReport(latestReportPath(), report)
  await appendGrowthReport(historyReportPath(), report)
  await recordGrowthReport(report).catch((error) => {
    writeLog("growth", "failed to record growth metrics", { error }, "warn")
  })
}

export function initJarvisGrowth(options: { sourceRoot?: string; refreshIntervalMs?: number } = {}): void {
  const envRoot = options.sourceRoot ?? process.env.JARVIS_GROWTH_SOURCE_ROOT ?? null
  defaultSourceRoot = envRoot ? resolve(envRoot) : null

  void loadLatestGrowthReport(latestReportPath())
    .then((report) => {
      if (!report) return
      latestReport = report
      if (!defaultSourceRoot && report.sourceRoot) {
        defaultSourceRoot = resolve(report.sourceRoot)
      }
      lastNotificationSignature = signatureFor(report)
      broadcastGrowthReport(report)
    })
    .catch((error) => {
      writeLog("growth", "failed to load persisted growth report", { error }, "warn")
    })

  void loadGrowthConfig()
    .then((config) => {
      if (!config?.sourceRoot) return
      if (!defaultSourceRoot) defaultSourceRoot = resolve(config.sourceRoot)
    })
    .catch((error) => {
      writeLog("growth", "failed to load growth config", { error }, "warn")
    })

  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }

  const refreshIntervalMs = options.refreshIntervalMs ?? Number(process.env.JARVIS_GROWTH_REFRESH_MS ?? DEFAULT_REFRESH_INTERVAL_MS)
  if (Number.isFinite(refreshIntervalMs) && refreshIntervalMs > 0) {
    refreshTimer = setInterval(() => {
      void scanJarvisGrowth().catch((error) => writeLog("growth", "scheduled growth scan failed", { error }, "warn"))
    }, refreshIntervalMs)
    refreshTimer.unref()
  }

  app.once("will-quit", () => {
    if (refreshTimer) clearInterval(refreshTimer)
    refreshTimer = null
  })
}

export async function setGrowthSourceRoot(sourceRoot: string | null): Promise<GrowthReport> {
  defaultSourceRoot = sourceRoot ? resolve(sourceRoot) : null
  latestReport = null
  await saveGrowthConfig({ sourceRoot: defaultSourceRoot })
  if (!defaultSourceRoot) {
    const report = getGrowthReport()
    broadcastGrowthReport(report)
    return report
  }
  return scanJarvisGrowth()
}

export function getGrowthReport(): GrowthReport {
  return (
    latestReport ?? {
      generatedAt: Date.now(),
      sourceRoot: defaultSourceRoot ?? "",
      totals: {
        discovered: 0,
        classified: 0,
        sandboxPassed: 0,
        sandboxFailed: 0,
        promotionReady: 0,
        highRisk: 0,
      },
      assets: [],
      scores: [],
      suggestions: [],
      risks: defaultSourceRoot ? [] : ["Growth sourceRoot is not configured."],
      nextActions: defaultSourceRoot ? ["运行 Growth 扫描。"] : ["设置 JARVIS_GROWTH_SOURCE_ROOT 后运行 Growth 扫描。"],
    }
  )
}

export async function scanJarvisGrowth(): Promise<GrowthReport> {
  if (!defaultSourceRoot) {
    const report = getGrowthReport()
    broadcastGrowthReport(report)
    return report
  }

  const service = createGrowthService({ sourceRoot: defaultSourceRoot })
  latestReport = await service.scan()
  await persistGrowthReport(latestReport)
  await saveGrowthConfig({ sourceRoot: defaultSourceRoot })
  broadcastGrowthReport(latestReport)
  maybeNotifyGrowthReport(latestReport)
  return latestReport
}

export async function approveGrowthPromotion(assetId: string): Promise<PromotionDecision> {
  const report = getGrowthReport()
  const suggestion = report.suggestions.find((item) => item.assetId === assetId)
  if (!suggestion) {
    return {
      assetId,
      approved: false,
      decidedAt: Date.now(),
      reason: "Promotion suggestion was not found in the latest Growth report.",
    }
  }

  const decision = approvePromotionSuggestion(suggestion)
  await appendPromotionDecision(decision)
  return decision
}
