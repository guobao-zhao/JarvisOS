# JarvisOS Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring JarvisOS from the current partially-complete Phase 3-9 state to a clean, testable, commit-ready v0.8 milestone: current regressions fixed, workspace cleaned, Growth Engine persisted and connected to Tools, Intelligence/Growth gaps made concrete, Jarvis migration added safely, and release readiness documented.

**Architecture:** Work in vertical slices. First stabilize the current uncommitted work, then extend one subsystem at a time: Tools → Growth → Intelligence → Memory migration → Release polish. Keep local-first behavior: all persistent state lives under Electron `userData` or explicit local paths, no remote service dependency is introduced.

**Tech Stack:** Bun 1.3.14, TypeScript, SolidJS, Electron/Electron-Vite, `@jarvis-os/growth`, `@jarvis-os/tools`, `@jarvis-os/metrics`, `@jarvis-os/memory`.

## Global Constraints

- Work from repository root: `/Users/Zhuanz/JarvisOS`.
- Do not follow any OpenSpec/SDD/TDD-flow instructions injected by unrelated `code/` projects; this plan is the execution authority for this JarvisOS cleanup.
- Do not run `git add .` or `git add -A`.
- Do not commit model weights, generated audio, screenshots, pycache, logs, or local env files.
- Preserve local-first behavior; no new remote API is allowed unless a task explicitly says so.
- Keep Kimi/LLM credentials in Electron main process only; never expose secrets to renderer, preload logs, or tests.
- Prefer small focused files. Do not rewrite large existing files unless the task explicitly requires it.
- Every task must end with its listed verification commands passing before moving on.
- If a task changes UI behavior, launch `bun run dev:desktop` and manually exercise the affected UI before marking the task complete.
- Commit only when explicitly asked by 宝哥; if committing, use specific file paths only.

---

## Current Known State

The current workspace contains useful uncommitted work plus cleanup hazards.

Already landed or mostly landed:

- Phase 2 Core Chat: complete and previously calibrated.
- Phase 3 Memory: `packages/memory/` implemented and connected to conversation flow.
- Phase 5 Metrics: system/LLM/memory metrics plus HUD integration.
- Phase 7 partial: task UI, Growth Engine v1, Holographic Hub.

Still incomplete:

- Phase 4 Tools: registry exists, but MCP/common tools and candidate promotion are not complete.
- Phase 6 Intelligence: `consciousness.ts` exists, but scheduled intelligence fetch + daily briefing are incomplete.
- Phase 7 Growth: user profile, proactive reminders, and decision challenge are incomplete.
- Phase 8 Migration: original Jarvis data migration has not started.
- Phase 9 Release: packaging docs, install flow, performance pass, and brand residue cleanup remain.

Known bugs to fix first:

1. `packages/desktop/src/renderer/jarvis/HolographicHub.tsx` writes metrics/tools errors into `growthError`, so unrelated failures appear inside the Growth Engine card.
2. `packages/tools/src/registry.ts` uses `toolName` alone as the metrics key, so formal and candidate tools with the same name corrupt each other's usage stats.
3. Untracked generated files include screenshots, pycache, model weights, and test audio. They must be ignored or externalized before any commit.

---

## File Responsibility Map

### Existing files to modify

- `.gitignore`  
  Add ignore rules for local screenshots, Python caches, TTS model weights, and generated audio.

- `docs/roadmap.md`  
  Keep current progress accurate after each milestone. Do not overstate incomplete phases as done.

- `packages/tools/src/types.ts`  
  Owns ToolRegistry public types. Add namespace information for usage metrics and candidate/formal execution where needed.

- `packages/tools/src/registry.ts`  
  Owns formal/candidate tool registration, execution, and metrics recording.

- `packages/tools/src/__tests__/registry.test.ts`  
  Owns behavior tests for tool registry metrics and candidate isolation.

- `packages/desktop/src/renderer/jarvis/HolographicHub.tsx`  
  Owns central HUD cards and error rendering. Split errors by source.

- `packages/desktop/src/preload/types.ts`  
  Owns renderer-visible API types. Add only safe types here.

- `packages/desktop/src/preload/index.ts`  
  Owns IPC wrappers exposed to renderer.

- `packages/desktop/src/main/ipc.ts`  
  Owns Electron IPC handlers.

- `packages/desktop/src/main/jarvis-growth.ts`  
  Owns Growth service lifecycle in main process. Add persistence, source-root updates, and promotion orchestration here.

- `packages/metrics/src/collectors/growth.ts`  
  Owns Growth report metric recording.

- `packages/growth/src/assets.ts`  
  Owns Growth domain types.

- `packages/growth/src/service.ts`  
  Owns scan pipeline: discover → classify → sandbox → evaluate → suggest → next actions.

- `packages/growth/src/promotion.ts`  
  Owns promotion recommendation rules.

- `packages/growth/src/__tests__/*.test.ts`  
  Owns Growth behavior tests.

### New files to create

- `packages/growth/src/store.ts`  
  JSONL/JSON persistence for Growth reports and promotion decisions. Pure package code; no Electron dependency.

- `packages/growth/src/__tests__/store.test.ts`  
  Tests Growth report persistence and loading.

- `packages/growth/src/profile.ts`  
  Derives a small user profile signal from local Memory/Growth data without remote calls.

- `packages/growth/src/__tests__/profile.test.ts`  
  Tests user profile derivation.

- `packages/growth/src/reminders.ts`  
  Computes proactive reminders from task sessions, Growth risks, and stale roadmap items.

- `packages/growth/src/__tests__/reminders.test.ts`  
  Tests reminder calculation.

- `packages/growth/src/challenge.ts`  
  Produces decision-challenge prompts from risky suggestions or large changes.

- `packages/growth/src/__tests__/challenge.test.ts`  
  Tests decision challenge generation.

- `packages/desktop/src/main/jarvis-migration.ts`  
  Read-only migration scanner for original Jarvis docs/memory. It must not modify original Jarvis files.

- `packages/desktop/src/renderer/jarvis/MigrationPanel.tsx`  
  Minimal UI panel to preview migration candidates and trigger import.

- `packages/desktop/src/main/jarvis-intelligence.ts`  
  Local scheduled intelligence snapshot store. No network fetch in this milestone; it reads existing local Jarvis intel files and exposes a briefing.

- `packages/desktop/src/renderer/jarvis/IntelligencePanel.tsx`  
  Minimal panel showing latest local intelligence snapshot and daily briefing text.

- `docs/release/jarvisos-v0.8-checklist.md`  
  Human release checklist for packaging, manual smoke test, and known limitations.

---

## Execution Order

Do tasks in this exact order. Do not parallelize tasks that touch the same files.

1. Workspace safety cleanup.
2. Tool metrics namespace fix.
3. Holographic Hub error-source fix.
4. Growth report persistence.
5. Growth source-root configuration.
6. Candidate promotion approval path.
7. Growth user profile/reminders/decision challenge primitives.
8. Local intelligence briefing.
9. Read-only Jarvis migration preview/import.
10. Release polish and final verification.

---

### Task 1: Workspace Safety Cleanup

**Files:**
- Modify: `.gitignore`
- Review only: untracked files under repository root

**Interfaces:**
- Consumes: current dirty workspace.
- Produces: clean ignore policy preventing generated artifacts from accidental commits.

- [ ] **Step 1: Inspect untracked files**

Run:

```bash
git -C /Users/Zhuanz/JarvisOS ls-files --others --exclude-standard
```

Expected current hazards include:

```text
.claude-jarvisos-hub-after.png
.claude-jarvisos-hub.png
tools/f5-tts/__pycache__/f5tts_server.cpython-311.pyc
tools/f5-tts/pretrained_models/F5TTS_Base/model_1200000.pt
tools/f5-tts/pretrained_models/vocos/pytorch_model.bin
tools/f5-tts/test_en.wav
tools/f5-tts/test_en_fast.wav
tools/f5-tts/test_zh.wav
tools/f5-tts/test_zh_fast.wav
```

- [ ] **Step 2: Add ignore rules**

Append this exact block to `.gitignore` if equivalent rules are not already present:

```gitignore
# JarvisOS local verification artifacts
.claude-*.png

# Python local caches
__pycache__/
*.py[cod]

# Local TTS model/runtime artifacts
tools/**/pretrained_models/
tools/**/*.wav
```

- [ ] **Step 3: Verify artifacts are ignored**

Run:

```bash
git -C /Users/Zhuanz/JarvisOS status --short --ignored | grep -E 'claude-jarvisos|pretrained_models|__pycache__|test_.*\.wav' || true
```

Expected: these files appear as ignored (`!!`) or no longer appear in normal `git status --short`.

- [ ] **Step 4: Confirm real source files remain visible**

Run:

```bash
git -C /Users/Zhuanz/JarvisOS status --short | grep -E 'packages/growth|jarvis-growth|HolographicHub|GrowthPanel|collectors/growth|tools/f5-tts/f5tts_server.py|tools/cosyvoice' || true
```

Expected: source files such as `packages/growth/...`, `jarvis-growth.ts`, `HolographicHub.tsx`, `GrowthPanel.tsx`, `tools/f5-tts/f5tts_server.py`, and `tools/cosyvoice/` are still visible if they are intended source files.

- [ ] **Step 5: Do not delete artifacts unless 宝哥 asks**

No deletion is required for this task. The deliverable is ignore safety.

---

### Task 2: Tool Metrics Namespace Fix

**Files:**
- Modify: `packages/tools/src/types.ts`
- Modify: `packages/tools/src/registry.ts`
- Modify: `packages/tools/src/__tests__/registry.test.ts`

**Interfaces:**
- Consumes: `ToolRegistry.register`, `registerCandidate`, `execute`, `executeCandidate`, `recordUsage`, `getUsageMetrics`.
- Produces: `ToolNamespace = "formal" | "candidate"`; `ToolUsageMetric.namespace`; metrics keys `formal:<name>` and `candidate:<name>`.

- [ ] **Step 1: Write failing tests for namespace isolation**

Add these tests to `packages/tools/src/__tests__/registry.test.ts`:

```ts
  it("keeps formal and candidate metrics separate when names collide", async () => {
    const registry = createToolRegistry()
    registry.register({
      definition: {
        name: "echo",
        description: "formal echo",
        inputSchema: { type: "object" },
      },
      skillName: "formal-skill",
      handler: async () => ({ ok: true, value: "formal" }),
    })
    registry.registerCandidate({
      definition: {
        name: "echo",
        description: "candidate echo",
        inputSchema: { type: "object" },
      },
      skillName: "candidate-skill",
      handler: async () => ({ ok: false, error: "candidate miss" }),
    })

    await registry.execute("echo", {})
    await registry.executeCandidate("echo", {})

    const metrics = registry.getUsageMetrics()
    expect(metrics.get("formal:echo")?.namespace).toBe("formal")
    expect(metrics.get("formal:echo")?.skillName).toBe("formal-skill")
    expect(metrics.get("formal:echo")?.hitCount).toBe(1)
    expect(metrics.get("formal:echo")?.missCount).toBe(0)
    expect(metrics.get("candidate:echo")?.namespace).toBe("candidate")
    expect(metrics.get("candidate:echo")?.skillName).toBe("candidate-skill")
    expect(metrics.get("candidate:echo")?.hitCount).toBe(0)
    expect(metrics.get("candidate:echo")?.missCount).toBe(1)
  })

  it("records explicit candidate usage without polluting formal metrics", () => {
    const registry = createToolRegistry()
    registry.register({
      definition: {
        name: "search",
        description: "formal search",
        inputSchema: { type: "object" },
      },
      skillName: "formal-search",
      handler: async () => ({ ok: true }),
    })
    registry.registerCandidate({
      definition: {
        name: "search",
        description: "candidate search",
        inputSchema: { type: "object" },
      },
      skillName: "candidate-search",
      handler: async () => ({ ok: true }),
    })

    registry.recordUsage("search", "hit", "candidate")

    const metrics = registry.getUsageMetrics()
    expect(metrics.get("candidate:search")?.callCount).toBe(1)
    expect(metrics.get("candidate:search")?.hitCount).toBe(1)
    expect(metrics.get("formal:search")).toBeUndefined()
  })
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
cd /Users/Zhuanz/JarvisOS && bun test ./packages/tools/src/__tests__/registry.test.ts
```

Expected: FAIL because `namespace` and the third `recordUsage` parameter do not exist yet.

- [ ] **Step 3: Update public types**

Change `packages/tools/src/types.ts` so the relevant definitions become:

```ts
export type ToolStatus = "hit" | "miss" | "error"
export type ToolNamespace = "formal" | "candidate"

export interface ToolUsageMetric {
  toolName: string
  namespace: ToolNamespace
  skillName: string
  callCount: number
  hitCount: number
  missCount: number
  errorCount: number
  avgLatencyMs: number
  lastUsedAt: number
}

export interface ToolRegistry {
  /** 注册一个正式工具。 */
  register(tool: ToolRegistration): void
  /** 注册一个候选工具。候选工具只供 Growth 沙箱显式调用。 */
  registerCandidate(tool: ToolRegistration): void
  /** 列出当前可用的所有正式工具定义。 */
  list(): ToolDefinition[]
  /** 列出候选工具定义。 */
  listCandidates(): ToolDefinition[]
  /** 执行指定正式工具。 */
  execute(name: string, args: unknown): Promise<ToolResult>
  /** 执行指定候选工具。 */
  executeCandidate(name: string, args: unknown): Promise<ToolResult>
  /** 记录一次工具调用结果，用于命中率统计。 */
  recordUsage(name: string, status: ToolStatus, namespace?: ToolNamespace): void
  /** 获取工具使用统计。 */
  getUsageMetrics(): ReadonlyMap<string, ToolUsageMetric>
}
```

- [ ] **Step 4: Update registry implementation**

In `packages/tools/src/registry.ts`, import `ToolNamespace` and replace metric creation/execution logic with namespace-aware keys.

Use this exact helper shape:

```ts
  function metricKey(namespace: ToolNamespace, name: string): string {
    return `${namespace}:${name}`
  }

  function ensureMetric(namespace: ToolNamespace, name: string, skillName: string): ToolUsageMetric {
    const key = metricKey(namespace, name)
    const existing = metrics.get(key)
    if (existing) return existing
    const fresh: ToolUsageMetric = {
      toolName: name,
      namespace,
      skillName,
      callCount: 0,
      hitCount: 0,
      missCount: 0,
      errorCount: 0,
      avgLatencyMs: 0,
      lastUsedAt: 0,
    }
    metrics.set(key, fresh)
    return fresh
  }
```

Change `executeFrom` signature to:

```ts
  async function executeFrom(
    namespace: ToolNamespace,
    map: Map<string, RegisteredTool>,
    name: string,
    args: unknown,
  ): Promise<ToolResult> {
```

Inside `executeFrom`, replace both `ensureMetric(name, tool.skillName)` calls with:

```ts
const metric = ensureMetric(namespace, name, tool.skillName)
```

Change the returned methods to:

```ts
    execute(name, args) {
      return executeFrom("formal", tools, name, args)
    },

    executeCandidate(name, args) {
      return executeFrom("candidate", candidateTools, name, args)
    },

    recordUsage(name, status, namespace = "formal") {
      const map = namespace === "formal" ? tools : candidateTools
      const tool = map.get(name)
      const metric = tool ? ensureMetric(namespace, name, tool.skillName) : ensureMetric(namespace, name, "unknown")
      metric.callCount += 1
      metric.lastUsedAt = Date.now()
      if (status === "hit") metric.hitCount += 1
      else if (status === "miss") metric.missCount += 1
      else if (status === "error") metric.errorCount += 1
    },
```

- [ ] **Step 5: Run registry tests**

Run:

```bash
cd /Users/Zhuanz/JarvisOS && bun test ./packages/tools/src/__tests__/registry.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run typecheck**

Run:

```bash
bun run --cwd /Users/Zhuanz/JarvisOS typecheck
```

Expected: all tasks pass.

---

### Task 3: Holographic Hub Error Source Fix

**Files:**
- Modify: `packages/desktop/src/renderer/jarvis/HolographicHub.tsx`

**Interfaces:**
- Consumes: `window.api.jarvisToolMetrics`, `jarvisMetricsSnapshot`, `jarvisGrowthReport`, `jarvisGrowthScan`.
- Produces: separate error states for tools, system metrics, and Growth.

- [ ] **Step 1: Replace the single error signal**

In `HolographicHub.tsx`, replace:

```ts
  const [growthError, setGrowthError] = createSignal<string | null>(null)
```

with:

```ts
  const [toolError, setToolError] = createSignal<string | null>(null)
  const [metricsError, setMetricsError] = createSignal<string | null>(null)
  const [growthError, setGrowthError] = createSignal<string | null>(null)
```

- [ ] **Step 2: Set the correct error source**

In `fetchTools`, replace the catch body:

```ts
        if (mounted) setGrowthError(String(reason))
```

with:

```ts
        if (mounted) setToolError(String(reason))
```

In `jarvisMetricsSnapshot().catch`, replace:

```ts
      if (mounted) setGrowthError(String(reason))
```

with:

```ts
      if (mounted) setMetricsError(String(reason))
```

Keep `jarvisGrowthReport().catch` writing to `setGrowthError`.

- [ ] **Step 3: Clear the right error source on success**

After successful tool metrics load, set tool error to null:

```ts
        if (mounted) {
          setTools(data)
          setToolError(null)
        }
```

After successful metrics snapshot load, set metrics error to null:

```ts
      if (mounted) {
        setMetrics(snapshot)
        setMetricsError(null)
      }
```

After successful Growth report load, set growth error to null:

```ts
      if (mounted) {
        setGrowth(report)
        setGrowthError(null)
      }
```

- [ ] **Step 4: Render each error in the matching card**

In the `Tool Matrix` card, add this below the `MicroBar`:

```tsx
          <Show when={toolError()}>
            {(message) => <div class="mt-2 line-clamp-2 text-[10px] text-red-200/80">{message()}</div>}
          </Show>
```

In the `System Pulse` card, add this below the grid:

```tsx
          <Show when={metricsError()}>
            {(message) => <div class="mt-2 line-clamp-2 text-[10px] text-red-200/80">{message()}</div>}
          </Show>
```

Leave the existing `growthError` rendering inside the `Growth Engine` card.

- [ ] **Step 5: Verify typecheck**

Run:

```bash
bun run --cwd /Users/Zhuanz/JarvisOS typecheck
```

Expected: PASS.

- [ ] **Step 6: Manually verify UI**

Run:

```bash
cd /Users/Zhuanz/JarvisOS && bun run dev:desktop
```

Expected manual checks:

- Holographic Hub renders.
- Growth Engine card still has `Scan Growth` button.
- Tool Matrix card displays tool metrics or its own error.
- System Pulse card displays system metrics or its own error.
- Metrics/tool failures no longer appear in Growth Engine card.

---

### Task 4: Growth Report Persistence

**Files:**
- Create: `packages/growth/src/store.ts`
- Create: `packages/growth/src/__tests__/store.test.ts`
- Modify: `packages/growth/src/index.ts`
- Modify: `packages/desktop/src/main/jarvis-growth.ts`

**Interfaces:**
- Consumes: `GrowthReport`.
- Produces:
  - `saveGrowthReport(filePath: string, report: GrowthReport): Promise<void>`
  - `loadLatestGrowthReport(filePath: string): Promise<GrowthReport | null>`
  - `appendGrowthReport(historyPath: string, report: GrowthReport): Promise<void>`

- [ ] **Step 1: Write store tests**

Create `packages/growth/src/__tests__/store.test.ts`:

```ts
import { describe, expect, it } from "bun:test"
import { mkdtemp, rm, readFile } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import type { GrowthReport } from "../assets"
import { appendGrowthReport, loadLatestGrowthReport, saveGrowthReport } from "../store"

const report = (generatedAt: number): GrowthReport => ({
  generatedAt,
  sourceRoot: "/tmp/jarvis",
  totals: {
    discovered: 1,
    classified: 1,
    sandboxPassed: 1,
    sandboxFailed: 0,
    promotionReady: 1,
    highRisk: 0,
  },
  assets: [],
  scores: [],
  suggestions: [],
  risks: [],
  nextActions: ["review promotion candidates"],
})

describe("Growth report store", () => {
  it("saves and loads the latest report", async () => {
    const dir = await mkdtemp(join(tmpdir(), "jarvis-growth-store-"))
    try {
      const file = join(dir, "latest.json")
      await saveGrowthReport(file, report(100))
      const loaded = await loadLatestGrowthReport(file)
      expect(loaded?.generatedAt).toBe(100)
      expect(loaded?.totals.promotionReady).toBe(1)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it("returns null when latest report does not exist", async () => {
    const dir = await mkdtemp(join(tmpdir(), "jarvis-growth-store-"))
    try {
      const loaded = await loadLatestGrowthReport(join(dir, "missing.json"))
      expect(loaded).toBeNull()
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it("appends reports as json lines", async () => {
    const dir = await mkdtemp(join(tmpdir(), "jarvis-growth-store-"))
    try {
      const file = join(dir, "history.jsonl")
      await appendGrowthReport(file, report(100))
      await appendGrowthReport(file, report(200))
      const content = await readFile(file, "utf8")
      const lines = content.trim().split("\n")
      expect(lines).toHaveLength(2)
      expect(JSON.parse(lines[1])?.generatedAt).toBe(200)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
cd /Users/Zhuanz/JarvisOS && bun test ./packages/growth/src/__tests__/store.test.ts
```

Expected: FAIL because `../store` does not exist.

- [ ] **Step 3: Implement Growth store**

Create `packages/growth/src/store.ts`:

```ts
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import type { GrowthReport } from "./assets"

async function ensureParent(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true })
}

export async function saveGrowthReport(filePath: string, report: GrowthReport): Promise<void> {
  await ensureParent(filePath)
  await writeFile(filePath, `${JSON.stringify(report, null, 2)}\n`, "utf8")
}

export async function loadLatestGrowthReport(filePath: string): Promise<GrowthReport | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as GrowthReport
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return null
    throw error
  }
}

export async function appendGrowthReport(historyPath: string, report: GrowthReport): Promise<void> {
  await ensureParent(historyPath)
  await appendFile(historyPath, `${JSON.stringify(report)}\n`, "utf8")
}
```

- [ ] **Step 4: Export store functions**

Add to `packages/growth/src/index.ts`:

```ts
export * from "./store"
```

- [ ] **Step 5: Persist reports from Electron main**

Modify `packages/desktop/src/main/jarvis-growth.ts`:

1. Import app/path and store helpers:

```ts
import { app } from "electron"
import { join, resolve } from "node:path"
import { appendGrowthReport, createGrowthService, loadLatestGrowthReport, saveGrowthReport, type GrowthReport } from "@jarvis-os/growth"
```

2. Replace the existing path import:

```ts
import { resolve } from "node:path"
```

with the combined import above.

3. Add module-level paths:

```ts
function latestReportPath(): string {
  return join(app.getPath("userData"), "jarvis", "growth", "latest.json")
}

function historyReportPath(): string {
  return join(app.getPath("userData"), "jarvis", "growth", "history.jsonl")
}
```

4. In `initJarvisGrowth`, after setting `defaultSourceRoot`, load persisted latest report without blocking startup:

```ts
  void loadLatestGrowthReport(latestReportPath()).then((report) => {
    latestReport = report
  }).catch((error) => {
    writeLog("growth", "failed to load persisted growth report", { error }, "warn")
  })
```

5. In `scanJarvisGrowth`, after `latestReport = await service.scan()`, persist it:

```ts
  await saveGrowthReport(latestReportPath(), latestReport)
  await appendGrowthReport(historyReportPath(), latestReport)
```

- [ ] **Step 6: Run Growth tests**

Run:

```bash
cd /Users/Zhuanz/JarvisOS && bun test ./packages/growth/src/__tests__/*.test.ts
```

Expected: PASS.

- [ ] **Step 7: Run typecheck**

Run:

```bash
bun run --cwd /Users/Zhuanz/JarvisOS typecheck
```

Expected: PASS.

---

### Task 5: Growth Source Root Configuration

**Files:**
- Modify: `packages/desktop/src/main/jarvis-growth.ts`
- Modify: `packages/desktop/src/main/ipc.ts`
- Modify: `packages/desktop/src/preload/types.ts`
- Modify: `packages/desktop/src/preload/index.ts`
- Modify: `packages/desktop/src/renderer/jarvis/GrowthPanel.tsx`
- Modify: `packages/desktop/src/renderer/jarvis/HolographicHub.tsx` only if the GrowthPanel is not visible elsewhere.

**Interfaces:**
- Produces renderer API:
  - `jarvisGrowthSetSourceRoot(sourceRoot: string | null): Promise<JarvisGrowthReport>`

- [ ] **Step 1: Add main-process setter**

In `packages/desktop/src/main/jarvis-growth.ts`, add:

```ts
export function setGrowthSourceRoot(sourceRoot: string | null): GrowthReport {
  defaultSourceRoot = sourceRoot ? resolve(sourceRoot) : null
  latestReport = null
  return getGrowthReport()
}
```

- [ ] **Step 2: Add IPC handler**

In `packages/desktop/src/main/ipc.ts`, update import:

```ts
import { getGrowthReport, scanJarvisGrowth, setGrowthSourceRoot } from "./jarvis-growth"
```

Add handler near existing Growth handlers:

```ts
  ipcMain.handle("jarvis:growth-set-source-root", (_event: IpcMainInvokeEvent, sourceRoot: string | null) =>
    setGrowthSourceRoot(sourceRoot),
  )
```

- [ ] **Step 3: Add preload type**

In `packages/desktop/src/preload/types.ts`, add to `ElectronAPI`:

```ts
  jarvisGrowthSetSourceRoot: (sourceRoot: string | null) => Promise<JarvisGrowthReport>
```

- [ ] **Step 4: Add preload implementation**

In `packages/desktop/src/preload/index.ts`, add near Growth APIs:

```ts
  jarvisGrowthSetSourceRoot: (sourceRoot) =>
    ipcRenderer.invoke("jarvis:growth-set-source-root", sourceRoot) as Promise<JarvisGrowthReport>,
```

- [ ] **Step 5: Add UI control**

In `packages/desktop/src/renderer/jarvis/GrowthPanel.tsx`, add a local source-root input and setter. If the file already has a report state, reuse it. The interaction must do this:

```tsx
const [sourceRootInput, setSourceRootInput] = createSignal("")
const [sourceRootError, setSourceRootError] = createSignal<string | null>(null)

async function applySourceRoot() {
  setSourceRootError(null)
  try {
    const value = sourceRootInput().trim()
    const report = await window.api.jarvisGrowthSetSourceRoot(value.length > 0 ? value : null)
    setGrowth(report)
  } catch (reason) {
    setSourceRootError(String(reason))
  }
}
```

Render these controls in the panel:

```tsx
<input
  class="jarvis-growth-source-input"
  value={sourceRootInput()}
  placeholder="/Users/Zhuanz/Jarvis"
  onInput={(event) => setSourceRootInput(event.currentTarget.value)}
/>
<button type="button" onClick={applySourceRoot}>Set Source</button>
<Show when={sourceRootError()}>
  {(message) => <div class="text-[10px] text-red-200/80">{message()}</div>}
</Show>
```

Use existing CSS classes if available. If no matching class exists, add minimal styling to `packages/desktop/src/renderer/jarvis/index.css`:

```css
.jarvis-growth-source-input {
  width: 100%;
  border: 1px solid rgb(94 246 255 / 0.28);
  border-radius: 8px;
  background: rgb(3 10 24 / 0.72);
  color: rgb(224 242 254);
  padding: 6px 8px;
  font-size: 11px;
  outline: none;
}
```

- [ ] **Step 6: Verify typecheck and UI**

Run:

```bash
bun run --cwd /Users/Zhuanz/JarvisOS typecheck
cd /Users/Zhuanz/JarvisOS && bun run dev:desktop
```

Expected manual checks:

- Enter `/Users/Zhuanz/Jarvis` as Growth source root.
- Click Set Source.
- Click Scan Growth.
- Growth totals update and no longer require `JARVIS_GROWTH_SOURCE_ROOT` env var.

---

### Task 6: Candidate Promotion Approval Path

**Files:**
- Modify: `packages/growth/src/assets.ts`
- Modify: `packages/growth/src/promotion.ts`
- Modify: `packages/growth/src/__tests__/service.test.ts`
- Modify: `packages/desktop/src/main/jarvis-growth.ts`
- Modify: `packages/desktop/src/main/ipc.ts`
- Modify: `packages/desktop/src/preload/types.ts`
- Modify: `packages/desktop/src/preload/index.ts`
- Modify: `packages/desktop/src/renderer/jarvis/GrowthPanel.tsx`

**Interfaces:**
- Produces:
  - `PromotionDecision`
  - `approveGrowthPromotion(assetId: string): Promise<PromotionDecision>` exposed through IPC
  - Approval records persisted under Electron `userData/jarvis/growth/promotions.jsonl`

- [ ] **Step 1: Add promotion decision type**

Add to `packages/growth/src/assets.ts`:

```ts
export interface PromotionDecision {
  readonly assetId: string
  readonly approved: boolean
  readonly decidedAt: number
  readonly promotedToolName?: string
  readonly reason: string
}
```

- [ ] **Step 2: Add approval helper**

In `packages/growth/src/promotion.ts`, add:

```ts
import type { PromotionDecision, PromotionSuggestion } from "./assets"

export function approvePromotionSuggestion(
  suggestion: PromotionSuggestion,
  now: () => number = Date.now,
): PromotionDecision {
  if (!suggestion.recommended) {
    return {
      assetId: suggestion.assetId,
      approved: false,
      decidedAt: now(),
      reason: "Promotion suggestion is not recommended.",
    }
  }

  return {
    assetId: suggestion.assetId,
    approved: true,
    decidedAt: now(),
    promotedToolName: suggestion.title,
    reason: suggestion.reason,
  }
}
```

If `promotion.ts` already imports these types, merge imports instead of duplicating them.

- [ ] **Step 3: Add behavior test**

Create or update `packages/growth/src/__tests__/promotion.test.ts` with:

```ts
import { describe, expect, it } from "bun:test"
import type { PromotionSuggestion } from "../assets"
import { approvePromotionSuggestion } from "../promotion"

describe("promotion approval", () => {
  it("approves recommended suggestions", () => {
    const suggestion: PromotionSuggestion = {
      assetId: "asset-1",
      title: "memory_search",
      recommended: true,
      reason: "safe and mature",
      risk: "low",
      action: "promote",
    }

    const decision = approvePromotionSuggestion(suggestion, () => 123)

    expect(decision.approved).toBe(true)
    expect(decision.assetId).toBe("asset-1")
    expect(decision.promotedToolName).toBe("memory_search")
    expect(decision.decidedAt).toBe(123)
  })

  it("rejects non-recommended suggestions", () => {
    const suggestion: PromotionSuggestion = {
      assetId: "asset-2",
      title: "write_shell",
      recommended: false,
      reason: "high risk",
      risk: "high",
      action: "observe",
    }

    const decision = approvePromotionSuggestion(suggestion, () => 456)

    expect(decision.approved).toBe(false)
    expect(decision.promotedToolName).toBeUndefined()
    expect(decision.decidedAt).toBe(456)
  })
})
```

- [ ] **Step 4: Persist promotion decisions in main process**

In `packages/desktop/src/main/jarvis-growth.ts`, import:

```ts
import { appendFile, mkdir } from "node:fs/promises"
import { dirname } from "node:path"
import { approvePromotionSuggestion, type PromotionDecision } from "@jarvis-os/growth"
```

Add path helper:

```ts
function promotionDecisionsPath(): string {
  return join(app.getPath("userData"), "jarvis", "growth", "promotions.jsonl")
}
```

Add append helper:

```ts
async function appendPromotionDecision(decision: PromotionDecision): Promise<void> {
  const filePath = promotionDecisionsPath()
  await mkdir(dirname(filePath), { recursive: true })
  await appendFile(filePath, `${JSON.stringify(decision)}\n`, "utf8")
}
```

Add exported function:

```ts
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
```

- [ ] **Step 5: Expose approval over IPC**

In `packages/desktop/src/main/ipc.ts`, update import:

```ts
import { approveGrowthPromotion, getGrowthReport, scanJarvisGrowth, setGrowthSourceRoot } from "./jarvis-growth"
```

Add handler:

```ts
  ipcMain.handle("jarvis:growth-approve-promotion", (_event: IpcMainInvokeEvent, assetId: string) =>
    approveGrowthPromotion(assetId),
  )
```

- [ ] **Step 6: Add preload types and wrapper**

In `packages/desktop/src/preload/types.ts`, add:

```ts
export type JarvisGrowthPromotionDecision = {
  assetId: string
  approved: boolean
  decidedAt: number
  promotedToolName?: string
  reason: string
}
```

Add to `ElectronAPI`:

```ts
  jarvisGrowthApprovePromotion: (assetId: string) => Promise<JarvisGrowthPromotionDecision>
```

In `packages/desktop/src/preload/index.ts`, import the type and add:

```ts
  jarvisGrowthApprovePromotion: (assetId) =>
    ipcRenderer.invoke("jarvis:growth-approve-promotion", assetId) as Promise<JarvisGrowthPromotionDecision>,
```

- [ ] **Step 7: Add UI approval action**

In `GrowthPanel.tsx`, for each recommended suggestion, render an approval button:

```tsx
<button
  type="button"
  disabled={!suggestion.recommended}
  onClick={async () => {
    const decision = await window.api.jarvisGrowthApprovePromotion(suggestion.assetId)
    setLastPromotionDecision(decision.reason)
  }}
>
  Approve
</button>
```

Add a `lastPromotionDecision` signal and render it:

```tsx
const [lastPromotionDecision, setLastPromotionDecision] = createSignal<string | null>(null)

<Show when={lastPromotionDecision()}>
  {(message) => <div class="text-[10px] text-emerald-200/80">{message()}</div>}
</Show>
```

- [ ] **Step 8: Verify tests and typecheck**

Run:

```bash
cd /Users/Zhuanz/JarvisOS && bun test ./packages/growth/src/__tests__/*.test.ts ./packages/tools/src/__tests__/registry.test.ts
bun run --cwd /Users/Zhuanz/JarvisOS typecheck
```

Expected: PASS.

---

### Task 7: Growth Profile, Reminders, and Decision Challenge Primitives

**Files:**
- Create: `packages/growth/src/profile.ts`
- Create: `packages/growth/src/reminders.ts`
- Create: `packages/growth/src/challenge.ts`
- Create: `packages/growth/src/__tests__/profile.test.ts`
- Create: `packages/growth/src/__tests__/reminders.test.ts`
- Create: `packages/growth/src/__tests__/challenge.test.ts`
- Modify: `packages/growth/src/index.ts`
- Modify: `packages/growth/src/assets.ts`
- Modify: `packages/growth/src/service.ts`
- Modify: `packages/desktop/src/renderer/jarvis/HolographicHub.tsx` or `GrowthPanel.tsx`

**Interfaces:**
- Produces:
  - `GrowthProfile`
  - `GrowthReminder`
  - `DecisionChallenge`
  - `createGrowthProfile(report: GrowthReport): GrowthProfile`
  - `createGrowthReminders(report: GrowthReport): GrowthReminder[]`
  - `createDecisionChallenges(report: GrowthReport): DecisionChallenge[]`

- [ ] **Step 1: Add types**

Add to `packages/growth/src/assets.ts`:

```ts
export interface GrowthProfile {
  readonly focusAreas: readonly string[]
  readonly safeCapabilityCount: number
  readonly highRiskCount: number
  readonly promotionReadyCount: number
}

export interface GrowthReminder {
  readonly id: string
  readonly level: "info" | "warning"
  readonly title: string
  readonly message: string
}

export interface DecisionChallenge {
  readonly id: string
  readonly title: string
  readonly question: string
  readonly evidence: readonly string[]
}
```

Extend `GrowthReport`:

```ts
  readonly profile?: GrowthProfile
  readonly reminders?: readonly GrowthReminder[]
  readonly challenges?: readonly DecisionChallenge[]
```

- [ ] **Step 2: Implement profile**

Create `packages/growth/src/profile.ts`:

```ts
import type { GrowthProfile, GrowthReport } from "./assets"

export function createGrowthProfile(report: GrowthReport): GrowthProfile {
  const tagCounts = new Map<string, number>()
  for (const asset of report.assets) {
    for (const tag of asset.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
  }

  const focusAreas = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([tag]) => tag)

  return {
    focusAreas,
    safeCapabilityCount: report.assets.filter((asset) => asset.kind === "capability" && asset.riskLevel === "low").length,
    highRiskCount: report.totals.highRisk,
    promotionReadyCount: report.totals.promotionReady,
  }
}
```

- [ ] **Step 3: Implement reminders**

Create `packages/growth/src/reminders.ts`:

```ts
import type { GrowthReminder, GrowthReport } from "./assets"

export function createGrowthReminders(report: GrowthReport): GrowthReminder[] {
  const reminders: GrowthReminder[] = []

  if (report.totals.highRisk > 0) {
    reminders.push({
      id: "growth-high-risk-review",
      level: "warning",
      title: "Review high-risk Growth assets",
      message: `${report.totals.highRisk} high-risk assets need manual review before they can influence JarvisOS behavior.`,
    })
  }

  if (report.totals.promotionReady > 0) {
    reminders.push({
      id: "growth-promotion-review",
      level: "info",
      title: "Approve mature candidate tools",
      message: `${report.totals.promotionReady} candidate capabilities are ready for human approval.`,
    })
  }

  if (report.totals.discovered === 0) {
    reminders.push({
      id: "growth-source-root-empty",
      level: "warning",
      title: "Configure Growth source root",
      message: "Growth did not discover Jarvis assets. Set the source root to the original Jarvis repository and scan again.",
    })
  }

  return reminders
}
```

- [ ] **Step 4: Implement decision challenge**

Create `packages/growth/src/challenge.ts`:

```ts
import type { DecisionChallenge, GrowthReport } from "./assets"

export function createDecisionChallenges(report: GrowthReport): DecisionChallenge[] {
  const challenges: DecisionChallenge[] = []
  const risky = report.suggestions.filter((suggestion) => suggestion.risk.includes("高风险"))
  if (risky.length > 0) {
    challenges.push({
      id: "growth-risk-boundary",
      title: "Risk boundary check",
      question: "Should these high-risk capabilities remain outside the formal Tools registry until they have explicit safety wrappers?",
      evidence: risky.slice(0, 3).map((suggestion) => `${suggestion.title}: ${suggestion.risk}`),
    })
  }

  const ready = report.suggestions.filter((suggestion) => suggestion.recommended)
  if (ready.length >= 3) {
    challenges.push({
      id: "growth-promotion-batch-size",
      title: "Promotion batch size check",
      question: "Should promotion happen one capability at a time instead of approving the full batch?",
      evidence: ready.slice(0, 5).map((suggestion) => suggestion.title),
    })
  }

  return challenges
}
```

- [ ] **Step 5: Wire primitives into service**

In `packages/growth/src/service.ts`, import:

```ts
import { createDecisionChallenges } from "./challenge"
import { createGrowthProfile } from "./profile"
import { createGrowthReminders } from "./reminders"
```

After creating `report`, replace the return with:

```ts
      const withNextActions = { ...report, nextActions: createGrowthNextActions(report) }
      return {
        ...withNextActions,
        profile: createGrowthProfile(withNextActions),
        reminders: createGrowthReminders(withNextActions),
        challenges: createDecisionChallenges(withNextActions),
      }
```

- [ ] **Step 6: Export modules**

Add to `packages/growth/src/index.ts`:

```ts
export * from "./profile"
export * from "./reminders"
export * from "./challenge"
```

- [ ] **Step 7: Add tests**

Create `packages/growth/src/__tests__/profile.test.ts`:

```ts
import { describe, expect, it } from "bun:test"
import type { GrowthReport } from "../assets"
import { createGrowthProfile } from "../profile"

const report: GrowthReport = {
  generatedAt: 1,
  sourceRoot: "/tmp",
  totals: { discovered: 2, classified: 2, sandboxPassed: 1, sandboxFailed: 0, promotionReady: 1, highRisk: 1 },
  assets: [
    { id: "a", sourcePath: "a", sourceSystem: "jarvis", kind: "capability", title: "A", summary: "A", tags: ["memory"], riskLevel: "low", status: "promotion_ready", createdAt: 1, updatedAt: 1 },
    { id: "b", sourcePath: "b", sourceSystem: "jarvis", kind: "process", title: "B", summary: "B", tags: ["memory", "flow"], riskLevel: "high", status: "classified", createdAt: 1, updatedAt: 1 },
  ],
  scores: [],
  suggestions: [],
  risks: [],
  nextActions: [],
}

describe("Growth profile", () => {
  it("summarizes focus areas and risk counts", () => {
    const profile = createGrowthProfile(report)
    expect(profile.focusAreas[0]).toBe("memory")
    expect(profile.safeCapabilityCount).toBe(1)
    expect(profile.highRiskCount).toBe(1)
    expect(profile.promotionReadyCount).toBe(1)
  })
})
```

Create `packages/growth/src/__tests__/reminders.test.ts`:

```ts
import { describe, expect, it } from "bun:test"
import type { GrowthReport } from "../assets"
import { createGrowthReminders } from "../reminders"

const baseReport = (overrides: Partial<GrowthReport>): GrowthReport => ({
  generatedAt: 1,
  sourceRoot: "/tmp",
  totals: { discovered: 1, classified: 1, sandboxPassed: 0, sandboxFailed: 0, promotionReady: 0, highRisk: 0 },
  assets: [],
  scores: [],
  suggestions: [],
  risks: [],
  nextActions: [],
  ...overrides,
})

describe("Growth reminders", () => {
  it("warns about high risk assets", () => {
    const reminders = createGrowthReminders(baseReport({ totals: { discovered: 1, classified: 1, sandboxPassed: 0, sandboxFailed: 0, promotionReady: 0, highRisk: 2 } }))
    expect(reminders.some((item) => item.id === "growth-high-risk-review")).toBe(true)
  })

  it("warns when no assets are discovered", () => {
    const reminders = createGrowthReminders(baseReport({ totals: { discovered: 0, classified: 0, sandboxPassed: 0, sandboxFailed: 0, promotionReady: 0, highRisk: 0 } }))
    expect(reminders.some((item) => item.id === "growth-source-root-empty")).toBe(true)
  })
})
```

Create `packages/growth/src/__tests__/challenge.test.ts`:

```ts
import { describe, expect, it } from "bun:test"
import type { GrowthReport } from "../assets"
import { createDecisionChallenges } from "../challenge"

describe("decision challenges", () => {
  it("challenges high-risk promotions", () => {
    const report: GrowthReport = {
      generatedAt: 1,
      sourceRoot: "/tmp",
      totals: { discovered: 1, classified: 1, sandboxPassed: 0, sandboxFailed: 1, promotionReady: 0, highRisk: 1 },
      assets: [],
      scores: [],
      suggestions: [{ assetId: "a", title: "write-skill", recommended: false, reason: "risk", risk: "高风险能力，不能自动晋升。", action: "observe" }],
      risks: [],
      nextActions: [],
    }

    const challenges = createDecisionChallenges(report)
    expect(challenges[0]?.id).toBe("growth-risk-boundary")
  })
})
```

- [ ] **Step 8: Surface in UI minimally**

In `GrowthPanel.tsx`, render `growth.profile`, `growth.reminders`, and `growth.challenges` if present. Use simple sections:

```tsx
<Show when={growth().profile}>
  {(profile) => (
    <section>
      <div>Focus: {profile().focusAreas.join(" / ") || "none"}</div>
      <div>{profile().promotionReadyCount} ready · {profile().highRiskCount} high risk</div>
    </section>
  )}
</Show>

<For each={growth().reminders ?? []}>
  {(reminder) => <div class={`jarvis-growth-reminder jarvis-growth-reminder--${reminder.level}`}>{reminder.title}: {reminder.message}</div>}
</For>

<For each={growth().challenges ?? []}>
  {(challenge) => <div class="jarvis-growth-challenge">{challenge.title}: {challenge.question}</div>}
</For>
```

- [ ] **Step 9: Verify**

Run:

```bash
cd /Users/Zhuanz/JarvisOS && bun test ./packages/growth/src/__tests__/*.test.ts
bun run --cwd /Users/Zhuanz/JarvisOS typecheck
```

Expected: PASS.

---

### Task 8: Local Intelligence Briefing

**Files:**
- Create: `packages/desktop/src/main/jarvis-intelligence.ts`
- Create: `packages/desktop/src/renderer/jarvis/IntelligencePanel.tsx`
- Modify: `packages/desktop/src/main/ipc.ts`
- Modify: `packages/desktop/src/preload/types.ts`
- Modify: `packages/desktop/src/preload/index.ts`
- Modify: `packages/desktop/src/renderer/jarvis/RightSidebar.tsx`

**Interfaces:**
- Produces renderer API:
  - `jarvisIntelligenceBriefing(): Promise<JarvisIntelligenceBriefing>`

- [ ] **Step 1: Add preload type**

In `packages/desktop/src/preload/types.ts`, add:

```ts
export type JarvisIntelligenceBriefing = {
  generatedAt: number
  sources: string[]
  summary: string
  items: { title: string; sourcePath: string; excerpt: string }[]
}
```

Add to `ElectronAPI`:

```ts
  jarvisIntelligenceBriefing: () => Promise<JarvisIntelligenceBriefing>
```

- [ ] **Step 2: Implement local briefing reader**

Create `packages/desktop/src/main/jarvis-intelligence.ts`:

```ts
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import type { JarvisIntelligenceBriefing } from "../preload/types"

const DEFAULT_JARVIS_ROOT = "/Users/Zhuanz/Jarvis"

const LOCAL_INTEL_FILES = [
  "docs/dreams/2026-07-13.md",
  ".ai/skills/intel-ai-frontier/SKILL.md",
  ".ai/skills/intel-tech-community/SKILL.md",
  ".ai/skills/intel-world-events/SKILL.md",
]

function excerpt(content: string): string {
  return content.split("\n").filter((line) => line.trim().length > 0).slice(0, 6).join("\n").slice(0, 700)
}

export async function getJarvisIntelligenceBriefing(root = process.env.JARVIS_INTELLIGENCE_ROOT ?? DEFAULT_JARVIS_ROOT): Promise<JarvisIntelligenceBriefing> {
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

  return {
    generatedAt: Date.now(),
    sources: items.map((item) => item.sourcePath),
    summary: items.length === 0 ? "No local intelligence files found." : `Loaded ${items.length} local intelligence sources.`,
    items,
  }
}
```

- [ ] **Step 3: Add IPC and preload wrapper**

In `packages/desktop/src/main/ipc.ts`, import:

```ts
import { getJarvisIntelligenceBriefing } from "./jarvis-intelligence"
```

Add handler:

```ts
  ipcMain.handle("jarvis:intelligence-briefing", () => getJarvisIntelligenceBriefing())
```

In `packages/desktop/src/preload/index.ts`, import `JarvisIntelligenceBriefing` type and add:

```ts
  jarvisIntelligenceBriefing: () =>
    ipcRenderer.invoke("jarvis:intelligence-briefing") as Promise<JarvisIntelligenceBriefing>,
```

- [ ] **Step 4: Create panel**

Create `packages/desktop/src/renderer/jarvis/IntelligencePanel.tsx`:

```tsx
import { createSignal, For, onMount, Show } from "solid-js"
import type { JarvisIntelligenceBriefing } from "../../preload/types"

export function IntelligencePanel() {
  const [briefing, setBriefing] = createSignal<JarvisIntelligenceBriefing | null>(null)
  const [error, setError] = createSignal<string | null>(null)

  async function loadBriefing() {
    setError(null)
    try {
      setBriefing(await window.api.jarvisIntelligenceBriefing())
    } catch (reason) {
      setError(String(reason))
    }
  }

  onMount(() => {
    void loadBriefing()
  })

  return (
    <section class="jarvis-panel jarvis-panel--intelligence">
      <div class="jarvis-panel-title">Intelligence</div>
      <button type="button" onClick={loadBriefing}>Refresh</button>
      <Show when={error()}>
        {(message) => <div class="text-[10px] text-red-200/80">{message()}</div>}
      </Show>
      <Show when={briefing()}>
        {(value) => (
          <>
            <div class="text-[11px] text-cyan-100/80">{value().summary}</div>
            <For each={value().items}>
              {(item) => (
                <article class="mt-2 rounded border border-cyan-300/20 p-2">
                  <div class="text-[11px] font-bold text-cyan-100">{item.title}</div>
                  <pre class="whitespace-pre-wrap text-[10px] text-white/60">{item.excerpt}</pre>
                </article>
              )}
            </For>
          </>
        )}
      </Show>
    </section>
  )
}
```

- [ ] **Step 5: Mount panel in sidebar**

In `packages/desktop/src/renderer/jarvis/RightSidebar.tsx`, import and render:

```tsx
import { IntelligencePanel } from "./IntelligencePanel"
```

Place it below existing Growth/Task panels:

```tsx
<IntelligencePanel />
```

- [ ] **Step 6: Verify**

Run:

```bash
bun run --cwd /Users/Zhuanz/JarvisOS typecheck
cd /Users/Zhuanz/JarvisOS && bun run dev:desktop
```

Expected manual checks:

- Right sidebar shows Intelligence panel.
- Refresh loads local intel excerpts if `/Users/Zhuanz/Jarvis` exists.
- Fresh install without those files shows `No local intelligence files found.` without crashing.

---

### Task 9: Read-Only Jarvis Migration Preview and Import

**Files:**
- Create: `packages/desktop/src/main/jarvis-migration.ts`
- Create: `packages/desktop/src/renderer/jarvis/MigrationPanel.tsx`
- Modify: `packages/desktop/src/main/ipc.ts`
- Modify: `packages/desktop/src/preload/types.ts`
- Modify: `packages/desktop/src/preload/index.ts`
- Modify: `packages/desktop/src/renderer/jarvis/RightSidebar.tsx`

**Interfaces:**
- Produces renderer API:
  - `jarvisMigrationPreview(root: string): Promise<JarvisMigrationPreview>`
  - `jarvisMigrationImport(root: string): Promise<JarvisMigrationImportResult>`

- [ ] **Step 1: Add preload types**

In `packages/desktop/src/preload/types.ts`, add:

```ts
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
```

Add to `ElectronAPI`:

```ts
  jarvisMigrationPreview: (root: string) => Promise<JarvisMigrationPreview>
  jarvisMigrationImport: (root: string) => Promise<JarvisMigrationImportResult>
```

- [ ] **Step 2: Implement migration scanner**

Create `packages/desktop/src/main/jarvis-migration.ts`:

```ts
import { readdir, readFile } from "node:fs/promises"
import { basename, join, relative } from "node:path"
import type { MemoryDocument } from "../preload/types"
import type { JarvisMigrationCandidate, JarvisMigrationImportResult, JarvisMigrationPreview } from "../preload/types"
import { handleJarvisMemoryWrite } from "./jarvis-memory"

const MIGRATION_DIRS = ["docs/context", "docs/dreams", "docs/projects"]

async function collectMarkdownFiles(root: string, relativeDir: string): Promise<string[]> {
  const dir = join(root, relativeDir)
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const files: string[] = []
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    const relativePath = relative(root, fullPath)
    if (entry.isDirectory()) files.push(...await collectMarkdownFiles(root, relativePath))
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(fullPath)
  }
  return files
}

function sourceForPath(path: string): MemoryDocument["source"] {
  if (path.includes("/dreams/")) return "intelligence"
  if (path.includes("/projects/")) return "insight"
  return "user_manual"
}

function tagsForPath(root: string, path: string): string[] {
  const parts = relative(root, path).split("/").filter(Boolean)
  return ["migration", ...parts.slice(0, -1)]
}

export async function previewJarvisMigration(root: string): Promise<JarvisMigrationPreview> {
  const files = (await Promise.all(MIGRATION_DIRS.map((dir) => collectMarkdownFiles(root, dir)))).flat()
  const candidates: JarvisMigrationCandidate[] = files.map((file) => ({
    sourcePath: file,
    title: basename(file, ".md"),
    source: sourceForPath(file),
    tags: tagsForPath(root, file),
  }))

  return { root, candidates, skipped: [] }
}

export async function importJarvisMigration(root: string): Promise<JarvisMigrationImportResult> {
  const preview = await previewJarvisMigration(root)
  let imported = 0
  let skipped = 0

  for (const candidate of preview.candidates) {
    const content = await readFile(candidate.sourcePath, "utf8").catch(() => null)
    if (!content || content.trim().length === 0) {
      skipped += 1
      continue
    }

    const now = Date.now()
    await handleJarvisMemoryWrite({
      id: `migration:${candidate.sourcePath}`,
      source: candidate.source,
      title: candidate.title,
      content,
      tags: candidate.tags,
      createdAt: now,
      updatedAt: now,
      relations: [],
    })
    imported += 1
  }

  return { imported, skipped }
}
```

- [ ] **Step 3: Add IPC and preload wrappers**

In `packages/desktop/src/main/ipc.ts`, import:

```ts
import { importJarvisMigration, previewJarvisMigration } from "./jarvis-migration"
```

Add handlers:

```ts
  ipcMain.handle("jarvis:migration-preview", (_event: IpcMainInvokeEvent, root: string) => previewJarvisMigration(root))
  ipcMain.handle("jarvis:migration-import", (_event: IpcMainInvokeEvent, root: string) => importJarvisMigration(root))
```

In `packages/desktop/src/preload/index.ts`, import the new types and add:

```ts
  jarvisMigrationPreview: (root) => ipcRenderer.invoke("jarvis:migration-preview", root) as Promise<JarvisMigrationPreview>,
  jarvisMigrationImport: (root) => ipcRenderer.invoke("jarvis:migration-import", root) as Promise<JarvisMigrationImportResult>,
```

- [ ] **Step 4: Add migration panel**

Create `packages/desktop/src/renderer/jarvis/MigrationPanel.tsx`:

```tsx
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
              {(item) => <div>{item.title} · {item.source}</div>}
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
```

- [ ] **Step 5: Mount panel in sidebar**

In `RightSidebar.tsx`, import and render:

```tsx
import { MigrationPanel } from "./MigrationPanel"
```

Place it after Intelligence panel:

```tsx
<MigrationPanel />
```

- [ ] **Step 6: Verify no original Jarvis files are modified**

Run before manual import:

```bash
git -C /Users/Zhuanz/Jarvis status --short
```

Record output.

Run app:

```bash
cd /Users/Zhuanz/JarvisOS && bun run dev:desktop
```

Manual checks:

- Preview `/Users/Zhuanz/Jarvis`.
- Candidate count appears.
- Import writes into JarvisOS memory path only.

Run after import:

```bash
git -C /Users/Zhuanz/Jarvis status --short
```

Expected: original Jarvis repo status is unchanged from before import.

- [ ] **Step 7: Typecheck**

Run:

```bash
bun run --cwd /Users/Zhuanz/JarvisOS typecheck
```

Expected: PASS.

---

### Task 10: Release Polish and Final Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/roadmap.md`
- Create: `docs/release/jarvisos-v0.8-checklist.md`
- Review: `packages/desktop/package.json`
- Review: repository for OpenCode/OpenCode branding residue

**Interfaces:**
- Produces a truthful release checklist and updated roadmap.

- [ ] **Step 1: Find branding residue**

Run:

```bash
cd /Users/Zhuanz/JarvisOS && grep -R "OpenCode\|opencode" -n README.md packages/desktop/package.json packages/desktop/src/main docs 2>/dev/null | head -100
```

Expected: Some `opencode` identifiers may remain for protocol/app-id compatibility. User-facing README/package text should say JarvisOS unless intentionally preserving upstream package internals.

- [ ] **Step 2: Update README truthfully**

In `README.md`, ensure these points are present and truthful:

```md
## JarvisOS v0.8 status

JarvisOS is a local-first desktop AI operating system for Jarvis. Current capabilities include Core Chat, Memory recall/write, Metrics HUD, Tools registry foundation, Growth Engine scanning, local intelligence briefing, and read-only Jarvis migration preview/import.

Known incomplete areas:
- MCP-backed Tools library expansion
- Fully automated intelligence collection
- Production packaging and installer signing
- Voice latency and model download UX
```

Do not claim Phase 8/9 are complete unless Task 9 and packaging verification are actually done.

- [ ] **Step 3: Update roadmap status**

In `docs/roadmap.md`, update the phase table after completed tasks:

- Phase 4 remains 🟡 unless MCP/common tools are truly implemented.
- Phase 6 becomes 🟡 with local intelligence briefing, not full scheduled intelligence.
- Phase 7 remains 🟡 with Growth profile/reminders/challenges primitives, not full autonomous proactivity.
- Phase 8 becomes 🟡 only if migration preview/import works; otherwise remains 🔲.
- Phase 9 remains 🟡 until installer/package verification is done.

- [ ] **Step 4: Create release checklist**

Create `docs/release/jarvisos-v0.8-checklist.md`:

```md
# JarvisOS v0.8 Release Checklist

## Automated checks

- [ ] `bun run --cwd /Users/Zhuanz/JarvisOS typecheck`
- [ ] `cd /Users/Zhuanz/JarvisOS && bun test ./packages/growth/src/__tests__/*.test.ts ./packages/tools/src/__tests__/registry.test.ts ./packages/memory/src/__tests__/*.test.ts`
- [ ] `cd /Users/Zhuanz/JarvisOS && bun --cwd packages/desktop build`

## Manual desktop smoke test

- [ ] Launch with `cd /Users/Zhuanz/JarvisOS && bun run dev:desktop`
- [ ] Core Chat accepts a text message and renders a streamed assistant response.
- [ ] HUD renders System Pulse, Memory Pulse, Tool Matrix, Growth Engine, and Task Field.
- [ ] Growth source root can be set to `/Users/Zhuanz/Jarvis`.
- [ ] Growth scan completes and persists latest report.
- [ ] Candidate promotion approval writes a local decision record.
- [ ] Intelligence panel loads local intel excerpts or shows a safe empty state.
- [ ] Migration panel previews candidates from `/Users/Zhuanz/Jarvis`.
- [ ] Migration import does not modify files in `/Users/Zhuanz/Jarvis`.
- [ ] Voice controls render without blocking text chat.

## Files that must not be committed

- [ ] `.claude-*.png`
- [ ] `tools/**/pretrained_models/`
- [ ] `tools/**/*.wav`
- [ ] `__pycache__/`
- [ ] `.env` or `.env.local`

## Known limitations for v0.8

- MCP Tools library is still a foundation, not complete automation.
- Intelligence is local-file briefing, not full scheduled web collection.
- Growth promotion is approval recording, not automatic code installation.
- Packaging/signing requires a separate release pass.
```

- [ ] **Step 5: Run automated verification**

Run:

```bash
bun run --cwd /Users/Zhuanz/JarvisOS typecheck
cd /Users/Zhuanz/JarvisOS && bun test ./packages/growth/src/__tests__/*.test.ts ./packages/tools/src/__tests__/registry.test.ts ./packages/memory/src/__tests__/*.test.ts
cd /Users/Zhuanz/JarvisOS && bun --cwd packages/desktop build
```

Expected:

- Typecheck passes.
- Tests pass.
- Desktop build passes.

If `bun --cwd packages/desktop build` fails because of an existing upstream packaging/build issue unrelated to changed files, record exact failure in `docs/release/jarvisos-v0.8-checklist.md` under `Known build issue` and do not claim release readiness.

- [ ] **Step 6: Final git safety check**

Run:

```bash
git -C /Users/Zhuanz/JarvisOS status --short
git -C /Users/Zhuanz/JarvisOS diff --name-only HEAD
```

Expected:

- No generated artifacts listed for commit.
- Only source/docs/config files from this plan are visible.

---

## Final Review Checklist for the Executor

Before telling 宝哥 the work is complete, provide evidence:

```text
Typecheck: PASS/FAIL, command used
Tests: PASS/FAIL, command used
Desktop build: PASS/FAIL/SKIPPED, command used and reason if skipped
Manual UI smoke: PASS/FAIL, flows exercised
Original Jarvis repo modified by migration: NO/YES, git status evidence
Generated artifacts excluded from commit: YES/NO, git status evidence
```

Do not say “done”, “fixed”, or “complete” unless the evidence above is available.

## Suggested Commit Groups If 宝哥 Asks To Commit

Use separate commits, with specific file paths only:

1. `fix(jarvisos): isolate tool and hub error metrics`
   - `.gitignore`
   - `packages/tools/src/types.ts`
   - `packages/tools/src/registry.ts`
   - `packages/tools/src/__tests__/registry.test.ts`
   - `packages/desktop/src/renderer/jarvis/HolographicHub.tsx`

2. `feat(jarvisos): persist growth reports and approvals`
   - `packages/growth/src/store.ts`
   - `packages/growth/src/promotion.ts`
   - `packages/growth/src/assets.ts`
   - `packages/growth/src/index.ts`
   - `packages/growth/src/__tests__/store.test.ts`
   - `packages/growth/src/__tests__/promotion.test.ts`
   - `packages/desktop/src/main/jarvis-growth.ts`
   - Growth IPC/preload/UI files

3. `feat(jarvisos): add local intelligence and migration panels`
   - Intelligence files
   - Migration files
   - RightSidebar/preload/ipc updates

4. `docs(jarvisos): update roadmap and release checklist`
   - `README.md`
   - `docs/roadmap.md`
   - `docs/release/jarvisos-v0.8-checklist.md`

Do not commit `tools/**/pretrained_models/`, `tools/**/*.wav`, `.claude-*.png`, pycache, or `.env*`.
