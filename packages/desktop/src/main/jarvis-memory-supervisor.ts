import { execFile } from "node:child_process"
import { stat } from "node:fs/promises"

import { BrowserWindow } from "electron"

import { loadMemoryConfig } from "@jarvis-os/memory"
import { prepareJarvisMemoryEnv } from "./jarvis-memory"

export type JarvisMemorySupervisorPhase =
  | "booting"
  | "checking"
  | "launching"
  | "ready"
  | "degraded"

export type JarvisMemorySupervisorEvent = {
  id: string
  at: number
  level: "info" | "success" | "warning" | "error"
  message: string
  detail?: string
}

export type JarvisMemorySupervisorStatus = {
  phase: JarvisMemorySupervisorPhase
  healthy: boolean
  baseURL: string
  outboxDir: string
  project: string
  llmWikiAppPath: string
  startedByJarvisOS: boolean
  lastCheckedAt: number
  events: JarvisMemorySupervisorEvent[]
}

type HealthSnapshot = {
  ok: boolean
  reason?: string
}

const LLM_WIKI_APP_PATH = "/Applications/LLM Wiki.app"
const MAX_EVENTS = 80

let status: JarvisMemorySupervisorStatus = {
  phase: "booting",
  healthy: false,
  baseURL: loadMemoryConfig().baseURL,
  outboxDir: loadMemoryConfig().outboxDir,
  project: loadMemoryConfig().project,
  llmWikiAppPath: LLM_WIKI_APP_PATH,
  startedByJarvisOS: false,
  lastCheckedAt: 0,
  events: [],
}

let bootPromise: Promise<JarvisMemorySupervisorStatus> | null = null

function broadcast() {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue
    win.webContents.send("jarvis:memory-supervisor-update", status)
  }
}

function update(patch: Partial<JarvisMemorySupervisorStatus>) {
  status = { ...status, ...patch }
  broadcast()
}

function log(level: JarvisMemorySupervisorEvent["level"], message: string, detail?: string) {
  status = {
    ...status,
    events: [
      ...status.events,
      {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        at: Date.now(),
        level,
        message,
        detail,
      },
    ].slice(-MAX_EVENTS),
  }
  broadcast()
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function checkHealth(baseURL: string, token: string): Promise<HealthSnapshot> {
  try {
    const res = await fetch(`${baseURL}/api/v1/health`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(2200),
    })
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` }
    return { ok: true }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}

async function launchLLMWiki() {
  if (process.platform !== "darwin") {
    throw new Error("LLM Wiki auto-launch is currently configured for macOS")
  }

  await stat(LLM_WIKI_APP_PATH)

  await new Promise<void>((resolve, reject) => {
    execFile("open", [LLM_WIKI_APP_PATH], (error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

async function pollUntilHealthy(baseURL: string, token: string, timeoutMs: number): Promise<HealthSnapshot> {
  const started = Date.now()
  let last: HealthSnapshot = { ok: false, reason: "not checked" }
  while (Date.now() - started < timeoutMs) {
    last = await checkHealth(baseURL, token)
    if (last.ok) return last
    await delay(900)
  }
  return last
}

async function runBootSequence(): Promise<JarvisMemorySupervisorStatus> {
  log("info", "Kernel: JarvisOS runtime online")
  log("info", "Memory Supervisor: loading credential vault")
  await prepareJarvisMemoryEnv()

  let config = loadMemoryConfig()
  update({
    phase: "checking",
    baseURL: config.baseURL,
    outboxDir: config.outboxDir,
    project: config.project,
    lastCheckedAt: Date.now(),
  })
  log("info", "LLM-wiki: checking brain gateway", config.baseURL)

  let health = await checkHealth(config.baseURL, config.token)
  if (!health.ok) {
    update({ phase: "launching", lastCheckedAt: Date.now() })
    log("warning", "LLM-wiki: gateway unavailable, launching desktop brain", health.reason)
    try {
      await launchLLMWiki()
      update({ startedByJarvisOS: true })
      log("info", "LLM-wiki: launch signal accepted", LLM_WIKI_APP_PATH)
    } catch (error) {
      update({ phase: "degraded", healthy: false, lastCheckedAt: Date.now() })
      log("error", "LLM-wiki: launch failed", error instanceof Error ? error.message : String(error))
      return status
    }

    health = await pollUntilHealthy(config.baseURL, config.token, 15_000)
  }

  if (!health.ok) {
    update({ phase: "degraded", healthy: false, lastCheckedAt: Date.now() })
    log("warning", "Memory Supervisor: degraded mode, using canonical local store", health.reason)
    return status
  }

  await prepareJarvisMemoryEnv()
  config = loadMemoryConfig()
  update({
    phase: "ready",
    healthy: true,
    baseURL: config.baseURL,
    outboxDir: config.outboxDir,
    project: config.project,
    lastCheckedAt: Date.now(),
  })
  log("success", "LLM-wiki: brain gateway ready", config.baseURL)
  log("success", "Brain path: canonical memory store resolved", config.outboxDir)
  log("success", "System stable: memory graph and fallback store aligned")
  return status
}

export function startJarvisMemorySupervisor(): Promise<JarvisMemorySupervisorStatus> {
  if (!bootPromise) {
    bootPromise = runBootSequence()
  }
  return bootPromise
}

export function getJarvisMemorySupervisorStatus(): JarvisMemorySupervisorStatus {
  return status
}
