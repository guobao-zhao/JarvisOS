import { app, BrowserWindow } from "electron"
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import type { JarvisIntelligenceBriefing } from "../preload/types"

type IntelligenceSource = {
  title: string
  sourcePath: string
  kind: "local" | "remote"
  fetchUrl?: string
}

type IntelligenceState = {
  briefing: JarvisIntelligenceBriefing | null
  root: string
  signature: string
}

const DEFAULT_JARVIS_ROOT = "/Users/Zhuanz/Jarvis"
const DEFAULT_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000

const LOCAL_INTEL_FILES = [
  "docs/dreams/2026-07-13.md",
  ".ai/skills/intel-ai-frontier/SKILL.md",
  ".ai/skills/intel-tech-community/SKILL.md",
  ".ai/skills/intel-world-events/SKILL.md",
]

const REMOTE_INTEL_SOURCES = [
  {
    title: "AI Frontier",
    sourcePath: "https://openai.com/news/rss.xml",
  },
  {
    title: "Tech Community",
    sourcePath: "https://github.blog/feed/",
  },
  {
    title: "World Events",
    sourcePath: "https://feeds.bbci.co.uk/news/world/rss.xml",
  },
] satisfies ReadonlyArray<Pick<IntelligenceSource, "title" | "sourcePath">>

const state: IntelligenceState = {
  briefing: null,
  root: process.env.JARVIS_INTELLIGENCE_ROOT ?? DEFAULT_JARVIS_ROOT,
  signature: "",
}

let refreshTimer: ReturnType<typeof setInterval> | null = null

function briefingPath(): string {
  return join(app.getPath("userData"), "jarvis", "intelligence", "latest.json")
}

function historyPath(): string {
  return join(app.getPath("userData"), "jarvis", "intelligence", "history.jsonl")
}

function normalizeText(content: string): string {
  return content
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function excerpt(content: string): string {
  const lines = normalizeText(content)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  return lines.slice(0, 8).join("\n").slice(0, 700)
}

function uniqueItems(items: JarvisIntelligenceBriefing["items"]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = `${item.sourcePath}:${item.title}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function readLocalSources(root: string): Promise<JarvisIntelligenceBriefing["items"]> {
  const items: JarvisIntelligenceBriefing["items"] = []

  for (const relativePath of LOCAL_INTEL_FILES) {
    try {
      const content = await readFile(join(root, relativePath), "utf8")
      items.push({
        title: relativePath.split("/").pop() ?? relativePath,
        sourcePath: join(root, relativePath),
        excerpt: excerpt(content),
      })
    } catch {
      // Missing local intel files are expected on fresh installs.
    }
  }

  return items
}

async function fetchWithTimeout(url: string, timeoutMs = 10_000): Promise<Response | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { signal: controller.signal })
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function readRemoteSources(): Promise<JarvisIntelligenceBriefing["items"]> {
  const items: JarvisIntelligenceBriefing["items"] = []

  for (const source of REMOTE_INTEL_SOURCES) {
    const response = await fetchWithTimeout(source.sourcePath)
    if (!response?.ok) continue
    const text = await response.text().catch(() => "")
    if (!text.trim()) continue
    items.push({
      title: source.title,
      sourcePath: source.sourcePath,
      excerpt: excerpt(text),
    })
  }

  return items
}

async function saveBriefing(briefing: JarvisIntelligenceBriefing): Promise<void> {
  const filePath = briefingPath()
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(briefing, null, 2)}\n`, "utf8")
  await appendFile(historyPath(), `${JSON.stringify(briefing)}\n`, "utf8").catch(() => undefined)
}

function buildSignature(briefing: JarvisIntelligenceBriefing): string {
  return [
    briefing.sources.length,
    briefing.items.length,
    briefing.items.map((item) => `${item.title}:${item.sourcePath}:${item.excerpt.slice(0, 80)}`).join("|"),
  ].join("::")
}

function broadcastBriefing(briefing: JarvisIntelligenceBriefing): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue
    win.webContents.send("jarvis:intelligence-update", briefing)
  }
}

async function createBriefing(root: string): Promise<JarvisIntelligenceBriefing> {
  const [localItems, remoteItems] = await Promise.all([readLocalSources(root), readRemoteSources()])
  const items = uniqueItems([...localItems, ...remoteItems])

  return {
    generatedAt: Date.now(),
    sources: items.map((item) => item.sourcePath),
    summary:
      items.length === 0
        ? "No local intelligence files found."
        : `Loaded ${items.length} intelligence sources (${localItems.length} local, ${remoteItems.length} remote).`,
    items,
  }
}

async function refreshInternal(root: string): Promise<JarvisIntelligenceBriefing> {
  const briefing = await createBriefing(root)
  state.briefing = briefing
  state.signature = buildSignature(briefing)
  await saveBriefing(briefing)
  broadcastBriefing(briefing)
  return briefing
}

export async function getJarvisIntelligenceBriefing(): Promise<JarvisIntelligenceBriefing> {
  if (state.briefing) return state.briefing

  try {
    const loaded = JSON.parse(await readFile(briefingPath(), "utf8")) as JarvisIntelligenceBriefing
    state.briefing = loaded
    state.signature = buildSignature(loaded)
    return loaded
  } catch {
    return refreshInternal(state.root)
  }
}

export async function refreshJarvisIntelligenceBriefing(): Promise<JarvisIntelligenceBriefing> {
  return refreshInternal(state.root)
}

export function initJarvisIntelligence(options: { root?: string; refreshIntervalMs?: number } = {}): void {
  state.root = resolve(options.root ?? process.env.JARVIS_INTELLIGENCE_ROOT ?? DEFAULT_JARVIS_ROOT)

  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }

  void getJarvisIntelligenceBriefing().catch(() => undefined)
  void refreshJarvisIntelligenceBriefing().catch(() => undefined)

  const refreshIntervalMs = options.refreshIntervalMs ?? Number(process.env.JARVIS_INTELLIGENCE_REFRESH_MS ?? DEFAULT_REFRESH_INTERVAL_MS)
  refreshTimer = setInterval(() => {
    void refreshJarvisIntelligenceBriefing().catch(() => undefined)
  }, Number.isFinite(refreshIntervalMs) && refreshIntervalMs > 0 ? refreshIntervalMs : DEFAULT_REFRESH_INTERVAL_MS)
  refreshTimer.unref()

  app.once("will-quit", () => {
    if (refreshTimer) clearInterval(refreshTimer)
    refreshTimer = null
  })
}
