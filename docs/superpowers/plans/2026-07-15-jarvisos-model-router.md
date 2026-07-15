# JarvisOS Model Router Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build JarvisOS intelligent model routing so Jarvis can choose GPT/Kimi by work phase, report the decision to the user, and allow correction.

**Architecture:** Keep credentials and routing decisions in Electron main process. Extend the current model vault from one config to profile-based role bindings, add a deterministic `ModelRouter`, route chat/tool execution through the selected role, and broadcast model decision events to the Solid renderer for HUD and task timeline display.

**Tech Stack:** Electron main/preload bridge, Solid renderer, TypeScript, `bun:test`, `electron-store`, `safeStorage`, existing JarvisOS `jarvis-llm`, `jarvis-model-config`, `jarvis-vault`, `HolographicHub`, and `TaskPanel`.

## Global Constraints

- API Key stays in Electron main process and `safeStorage`; renderer receives snapshots with `hasApiKey`, never plaintext keys.
- Old single-model `modelConfig` must migrate automatically to v2 profiles and role bindings.
- First version uses explainable rules, not an LLM classifier.
- Every model switch must create a decision event with `phase`, `role`, `modelID`, `reason`, and `confidence`.
- User overrides must beat automatic routing for the current task or current phase.
- If a chosen role is missing or unhealthy, route to `fallback`; if fallback is unavailable, return a clear model configuration error.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `packages/desktop/src/main/jarvis-vault.ts` | Store and migrate model routing config, encrypt profile API keys. |
| `packages/desktop/src/main/jarvis-model-config.ts` | Main-process profile CRUD, role binding, connection test, effective config lookup by role. |
| `packages/desktop/src/main/jarvis-model-router.ts` | Pure routing rules, decision event creation, task override handling. |
| `packages/desktop/src/main/jarvis-llm.ts` | Use `ModelRouter` before chat calls; record model role/phase metrics. |
| `packages/desktop/src/main/ipc.ts` | Add IPC for routing config, decisions, overrides, and subscriptions. |
| `packages/desktop/src/preload/types.ts` | Renderer-visible model profile, routing, decision, and override types. |
| `packages/desktop/src/preload/index.ts` | Expose new model routing IPC and decision subscription. |
| `packages/desktop/src/renderer/jarvis/HolographicHub.tsx` | Replace single model dialog with Model Command Center and Model Pulse decision state. |
| `packages/desktop/src/renderer/jarvis/TaskPanel.tsx` | Show task-local model decision timeline and basic override actions. |
| `packages/desktop/src/main/jarvis-vault.test.ts` | Migration and encrypted profile storage tests. |
| `packages/desktop/src/main/jarvis-model-router.test.ts` | Routing rules and override precedence tests. |
| `packages/desktop/src/main/jarvis-model-connection.test.ts` | Existing connection tests remain valid; add profile role coverage if needed. |

---

### Task 1: Model Profile Storage and Migration

**Files:**
- Modify: `packages/desktop/src/main/jarvis-vault.ts`
- Modify: `packages/desktop/src/main/jarvis-vault.test.ts`

**Interfaces:**
- Produces:
  - `type JarvisModelRole = "daily" | "designer" | "worker" | "reviewer" | "fallback"`
  - `interface JarvisModelProfile { id: string; label: string; providerType: JarvisProviderType; baseURL: string; apiKey: string; modelID: string }`
  - `interface JarvisModelRoutingConfig { version: 2; profiles: JarvisModelProfile[]; roleBindings: Record<JarvisModelRole, string> }`
  - `getModelRoutingConfig(): Promise<JarvisModelRoutingConfig | null>`
  - `setModelRoutingConfig(config: JarvisModelRoutingConfig): Promise<void>`
- Consumes: existing `getModelConfig()` / `setModelConfig()` storage key for migration.

- [ ] **Step 1: Write failing migration test**

Add to `packages/desktop/src/main/jarvis-vault.test.ts`:

```ts
import { describe, expect, it } from "bun:test"
import { createJarvisVault, type JarvisModelConfig } from "./jarvis-vault"

function memoryVault() {
  const data = new Map<string, unknown>()
  return {
    data,
    vault: createJarvisVault({
      read: (key) => data.get(key),
      write: (key, value) => data.set(key, value),
      encrypt: (value) => `enc:${value}`,
      decrypt: (value) => value.replace(/^enc:/, ""),
    }),
  }
}

describe("Jarvis model routing vault", () => {
  it("migrates the old single model config into v2 role bindings", async () => {
    const { vault } = memoryVault()
    const config: JarvisModelConfig = {
      providerType: "openai-compatible",
      baseURL: "https://api.moonshot.cn/v1",
      apiKey: "kimi-secret",
      modelID: "kimi-k2-0711-preview",
    }

    await vault.setModelConfig(config)
    const migrated = await vault.getModelRoutingConfig()

    expect(migrated?.version).toBe(2)
    expect(migrated?.profiles).toHaveLength(1)
    expect(migrated?.profiles[0]).toMatchObject({
      id: "legacy-default",
      label: "Kimi Default",
      baseURL: "https://api.moonshot.cn/v1",
      modelID: "kimi-k2-0711-preview",
    })
    expect(migrated?.profiles[0].apiKey).toBe("kimi-secret")
    expect(migrated?.roleBindings).toEqual({
      daily: "legacy-default",
      designer: "legacy-default",
      worker: "legacy-default",
      reviewer: "legacy-default",
      fallback: "legacy-default",
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun test /Users/Zhuanz/JarvisOS/packages/desktop/src/main/jarvis-vault.test.ts
```

Expected: FAIL because `getModelRoutingConfig` is not defined.

- [ ] **Step 3: Implement routing config storage**

Modify `packages/desktop/src/main/jarvis-vault.ts`:

```ts
export type JarvisProviderType = "openai-compatible"
export type JarvisModelRole = "daily" | "designer" | "worker" | "reviewer" | "fallback"

export interface JarvisModelConfig {
  providerType: JarvisProviderType
  baseURL: string
  apiKey: string
  modelID: string
}

export interface JarvisModelProfile extends JarvisModelConfig {
  id: string
  label: string
}

export interface JarvisModelRoutingConfig {
  version: 2
  profiles: JarvisModelProfile[]
  roleBindings: Record<JarvisModelRole, string>
}

interface StoredModelConfig {
  providerType: JarvisProviderType
  baseURL: string
  encryptedApiKey: string
  modelID: string
}

interface StoredModelProfile {
  id: string
  label: string
  providerType: JarvisProviderType
  baseURL: string
  encryptedApiKey: string
  modelID: string
}

interface StoredModelRoutingConfig {
  version: 2
  profiles: StoredModelProfile[]
  roleBindings: Record<JarvisModelRole, string>
}

const MODEL_CONFIG_KEY = "modelConfig"
const MODEL_ROUTING_CONFIG_KEY = "modelRoutingConfig"

const MODEL_ROLES: JarvisModelRole[] = ["daily", "designer", "worker", "reviewer", "fallback"]

function normalizeModelConfig(config: JarvisModelConfig): JarvisModelConfig {
  return {
    providerType: config.providerType,
    baseURL: config.baseURL.trim().replace(/\/+$/, ""),
    apiKey: config.apiKey.trim(),
    modelID: config.modelID.trim(),
  }
}

function normalizeProfile(profile: JarvisModelProfile): JarvisModelProfile {
  const config = normalizeModelConfig(profile)
  return {
    ...config,
    id: profile.id.trim(),
    label: profile.label.trim() || profile.modelID.trim(),
  }
}

function defaultRoleBindings(profileId: string): Record<JarvisModelRole, string> {
  return {
    daily: profileId,
    designer: profileId,
    worker: profileId,
    reviewer: profileId,
    fallback: profileId,
  }
}

export function createJarvisVault(storage: JarvisVaultStorage & JarvisVaultCrypto) {
  return {
    async getModelConfig(): Promise<JarvisModelConfig | null> {
      const stored = storage.read(MODEL_CONFIG_KEY) as Partial<StoredModelConfig> | undefined
      if (!stored?.providerType || !stored.baseURL || !stored.encryptedApiKey || !stored.modelID) return null
      return {
        providerType: stored.providerType,
        baseURL: stored.baseURL,
        apiKey: storage.decrypt(stored.encryptedApiKey),
        modelID: stored.modelID,
      }
    },

    async setModelConfig(config: JarvisModelConfig): Promise<void> {
      const normalized = normalizeModelConfig(config)
      const stored: StoredModelConfig = {
        providerType: normalized.providerType,
        baseURL: normalized.baseURL,
        encryptedApiKey: storage.encrypt(normalized.apiKey),
        modelID: normalized.modelID,
      }
      storage.write(MODEL_CONFIG_KEY, stored)
    },

    async getModelRoutingConfig(): Promise<JarvisModelRoutingConfig | null> {
      const stored = storage.read(MODEL_ROUTING_CONFIG_KEY) as Partial<StoredModelRoutingConfig> | undefined
      if (stored?.version === 2 && Array.isArray(stored.profiles) && stored.roleBindings) {
        return {
          version: 2,
          profiles: stored.profiles.map((profile) => ({
            id: profile.id,
            label: profile.label,
            providerType: profile.providerType,
            baseURL: profile.baseURL,
            apiKey: storage.decrypt(profile.encryptedApiKey),
            modelID: profile.modelID,
          })),
          roleBindings: stored.roleBindings,
        }
      }

      const legacy = await this.getModelConfig()
      if (!legacy) return null

      const profile: JarvisModelProfile = {
        id: "legacy-default",
        label: "Kimi Default",
        ...legacy,
      }
      return {
        version: 2,
        profiles: [profile],
        roleBindings: defaultRoleBindings(profile.id),
      }
    },

    async setModelRoutingConfig(config: JarvisModelRoutingConfig): Promise<void> {
      const profiles = config.profiles.map(normalizeProfile)
      const profileIds = new Set(profiles.map((profile) => profile.id))
      for (const role of MODEL_ROLES) {
        const bound = config.roleBindings[role]
        if (!bound || !profileIds.has(bound)) {
          throw new Error(`模型角色 ${role} 未绑定到有效 profile`)
        }
      }
      const stored: StoredModelRoutingConfig = {
        version: 2,
        profiles: profiles.map((profile) => ({
          id: profile.id,
          label: profile.label,
          providerType: profile.providerType,
          baseURL: profile.baseURL,
          encryptedApiKey: storage.encrypt(profile.apiKey),
          modelID: profile.modelID,
        })),
        roleBindings: config.roleBindings,
      }
      storage.write(MODEL_ROUTING_CONFIG_KEY, stored)
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
bun test /Users/Zhuanz/JarvisOS/packages/desktop/src/main/jarvis-vault.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /Users/Zhuanz/JarvisOS add packages/desktop/src/main/jarvis-vault.ts packages/desktop/src/main/jarvis-vault.test.ts
git -C /Users/Zhuanz/JarvisOS commit -m "feat(model): store routing profiles"
```

---

### Task 2: Main Process Model Config API

**Files:**
- Modify: `packages/desktop/src/main/jarvis-model-config.ts`
- Modify: `packages/desktop/src/preload/types.ts`
- Modify: `packages/desktop/src/main/ipc.ts`
- Modify: `packages/desktop/src/preload/index.ts`

**Interfaces:**
- Consumes: `JarvisModelRoutingConfig`, `JarvisModelRole`, `JarvisModelProfile` from Task 1.
- Produces:
  - `getJarvisModelRoutingConfigSnapshot(): Promise<JarvisModelRoutingConfigSnapshot>`
  - `saveJarvisModelRoutingConfig(input: JarvisModelRoutingConfigDraft): Promise<JarvisModelRoutingConfigSnapshot>`
  - `getEffectiveJarvisModelConfig(role: JarvisModelRole): Promise<JarvisModelConfig | null>`
  - `testJarvisModelProfileConnection(input: JarvisModelProfileDraft): Promise<JarvisModelConnectionResult>`

- [ ] **Step 1: Add preload types**

Modify `packages/desktop/src/preload/types.ts`:

```ts
export type JarvisModelRole = "daily" | "designer" | "worker" | "reviewer" | "fallback"

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
```

Extend `ElectronAPI`:

```ts
jarvisModelRoutingConfigGet: () => Promise<JarvisModelRoutingConfigSnapshot | null>
jarvisModelRoutingConfigSave: (config: JarvisModelRoutingConfigDraft) => Promise<JarvisModelRoutingConfigSnapshot>
jarvisModelProfileConnectionTest: (profile: JarvisModelProfileDraft) => Promise<JarvisModelConnectionResult>
```

- [ ] **Step 2: Implement main config helpers**

Modify `packages/desktop/src/main/jarvis-model-config.ts`:

```ts
import type {
  JarvisModelConfigDraft,
  JarvisModelConfigSnapshot,
  JarvisModelProfileDraft,
  JarvisModelProfileSnapshot,
  JarvisModelRoutingConfigDraft,
  JarvisModelRoutingConfigSnapshot,
} from "../preload/types"
import { createJarvisVault, type JarvisModelConfig, type JarvisModelProfile, type JarvisModelRole } from "./jarvis-vault"

function toProfileSnapshot(profile: JarvisModelProfile): JarvisModelProfileSnapshot {
  return {
    id: profile.id,
    label: profile.label,
    providerType: profile.providerType,
    baseURL: profile.baseURL,
    modelID: profile.modelID,
    hasApiKey: true,
  }
}

function toRoutingSnapshot(config: { version: 2; profiles: JarvisModelProfile[]; roleBindings: Record<JarvisModelRole, string> }): JarvisModelRoutingConfigSnapshot {
  return {
    version: 2,
    profiles: config.profiles.map(toProfileSnapshot),
    roleBindings: config.roleBindings,
  }
}

function normalizeProfileDraft(input: JarvisModelProfileDraft): JarvisModelProfileDraft {
  return {
    id: input.id.trim(),
    label: input.label.trim(),
    providerType: input.providerType,
    baseURL: input.baseURL.trim().replace(/\/+$/, ""),
    apiKey: input.apiKey?.trim() ?? "",
    modelID: input.modelID.trim(),
  }
}

async function resolveProfileDraft(input: JarvisModelProfileDraft): Promise<JarvisModelProfile> {
  const normalized = normalizeProfileDraft(input)
  if (!normalized.id) throw new Error("profile id 不能为空")
  if (!normalized.label) throw new Error("profile 名称不能为空")
  if (!normalized.baseURL) throw new Error("baseURL 不能为空")
  if (!normalized.modelID) throw new Error("modelID 不能为空")
  if (normalized.providerType !== "openai-compatible") throw new Error("暂不支持该模型提供方")

  if (normalized.apiKey) {
    return {
      id: normalized.id,
      label: normalized.label,
      providerType: normalized.providerType,
      baseURL: normalized.baseURL,
      apiKey: normalized.apiKey,
      modelID: normalized.modelID,
    }
  }

  const saved = await getJarvisModelRoutingConfig()
  const existing = saved?.profiles.find((profile) => profile.id === normalized.id)
  if (existing) {
    return {
      ...existing,
      label: normalized.label,
      providerType: normalized.providerType,
      baseURL: normalized.baseURL,
      modelID: normalized.modelID,
    }
  }

  const legacy = await getKimiCredentials()
  if (legacy) {
    return {
      id: normalized.id,
      label: normalized.label,
      providerType: normalized.providerType,
      baseURL: normalized.baseURL,
      apiKey: legacy.apiKey,
      modelID: normalized.modelID,
    }
  }

  throw new Error("API Key 不能为空")
}

export async function getJarvisModelRoutingConfig() {
  return getVault().getModelRoutingConfig()
}

export async function getJarvisModelRoutingConfigSnapshot(): Promise<JarvisModelRoutingConfigSnapshot | null> {
  const config = await getJarvisModelRoutingConfig()
  return config ? toRoutingSnapshot(config) : null
}

export async function saveJarvisModelRoutingConfig(input: JarvisModelRoutingConfigDraft): Promise<JarvisModelRoutingConfigSnapshot> {
  const profiles = await Promise.all(input.profiles.map(resolveProfileDraft))
  const config = { version: 2 as const, profiles, roleBindings: input.roleBindings }
  await getVault().setModelRoutingConfig(config)
  return toRoutingSnapshot(config)
}

export async function getEffectiveJarvisModelConfig(role: JarvisModelRole = "daily"): Promise<JarvisModelConfig | null> {
  const routing = await getJarvisModelRoutingConfig()
  if (routing) {
    const profileId = routing.roleBindings[role] ?? routing.roleBindings.fallback
    const profile = routing.profiles.find((item) => item.id === profileId)
    if (profile) return profile

    const fallback = routing.profiles.find((item) => item.id === routing.roleBindings.fallback)
    if (fallback) return fallback
  }

  const stored = await getJarvisModelConfig()
  if (stored) return stored

  const legacy = await getKimiCredentials()
  if (!legacy) return null
  return {
    providerType: "openai-compatible",
    baseURL: legacy.baseURL,
    apiKey: legacy.apiKey,
    modelID: "kimi-k2-0711-preview",
  }
}

export async function testJarvisModelProfileConnection(input: JarvisModelProfileDraft) {
  const profile = await resolveProfileDraft(input)
  const { testModelConnection } = await import("./jarvis-model-connection")
  return testModelConnection(profile)
}
```

Keep existing `getJarvisModelConfigSnapshot`, `saveJarvisModelConfig`, and `testJarvisModelConnection` as compatibility wrappers.

- [ ] **Step 3: Register IPC handlers**

Modify `packages/desktop/src/main/ipc.ts` imports:

```ts
import {
  getJarvisModelConfigSnapshot,
  getJarvisModelRoutingConfigSnapshot,
  saveJarvisModelConfig,
  saveJarvisModelRoutingConfig,
  testJarvisModelConnection,
  testJarvisModelProfileConnection,
} from "./jarvis-model-config"
```

Add handlers near existing model handlers:

```ts
ipcMain.handle("jarvis:model-routing-config-get", async () => {
  return getJarvisModelRoutingConfigSnapshot()
})
ipcMain.handle("jarvis:model-routing-config-save", async (_event: IpcMainInvokeEvent, config: JarvisModelRoutingConfigDraft) => {
  return saveJarvisModelRoutingConfig(config)
})
ipcMain.handle("jarvis:model-profile-connection-test", async (_event: IpcMainInvokeEvent, profile: JarvisModelProfileDraft) => {
  return testJarvisModelProfileConnection(profile)
})
```

Add missing type imports from `../preload/types`:

```ts
import type { JarvisModelConfigDraft, JarvisModelProfileDraft, JarvisModelRoutingConfigDraft } from "../preload/types"
```

- [ ] **Step 4: Expose preload API**

Modify `packages/desktop/src/preload/index.ts` imports to include new types, then add:

```ts
jarvisModelRoutingConfigGet: () =>
  ipcRenderer.invoke("jarvis:model-routing-config-get") as Promise<JarvisModelRoutingConfigSnapshot | null>,
jarvisModelRoutingConfigSave: (config: JarvisModelRoutingConfigDraft) =>
  ipcRenderer.invoke("jarvis:model-routing-config-save", config) as Promise<JarvisModelRoutingConfigSnapshot>,
jarvisModelProfileConnectionTest: (profile: JarvisModelProfileDraft) =>
  ipcRenderer.invoke("jarvis:model-profile-connection-test", profile) as Promise<JarvisModelConnectionResult>,
```

- [ ] **Step 5: Verify typecheck**

Run:

```bash
bun run --cwd /Users/Zhuanz/JarvisOS/packages/desktop typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git -C /Users/Zhuanz/JarvisOS add packages/desktop/src/main/jarvis-model-config.ts packages/desktop/src/main/ipc.ts packages/desktop/src/preload/types.ts packages/desktop/src/preload/index.ts
git -C /Users/Zhuanz/JarvisOS commit -m "feat(model): expose routing config api"
```

---

### Task 3: Model Router Decisions and Overrides

**Files:**
- Create: `packages/desktop/src/main/jarvis-model-router.ts`
- Create: `packages/desktop/src/main/jarvis-model-router.test.ts`
- Modify: `packages/desktop/src/preload/types.ts`

**Interfaces:**
- Consumes: `JarvisModelRole` from Task 1.
- Produces:
  - `type JarvisWorkPhase = "chat" | "triage" | "clarify" | "design" | "plan" | "execute" | "verify" | "debug" | "review"`
  - `interface JarvisModelDecision`
  - `routeJarvisModel(input: JarvisModelRouteInput): JarvisModelDecision`
  - `setTaskModelOverride(taskId: string, role: JarvisModelRole | null): void`
  - `getModelDecisionHistory(taskId?: string): readonly JarvisModelDecision[]`

- [ ] **Step 1: Write failing router tests**

Create `packages/desktop/src/main/jarvis-model-router.test.ts`:

```ts
import { describe, expect, it } from "bun:test"
import { clearModelRouterState, routeJarvisModel, setTaskModelOverride } from "./jarvis-model-router"

describe("routeJarvisModel", () => {
  it("routes complex design work to designer", () => {
    clearModelRouterState()
    const decision = routeJarvisModel({
      messages: [{ role: "user", content: "帮我设计一个复杂需求，需要方案权衡和创新" }],
      availableModels: { daily: "kimi", designer: "gpt", worker: "kimi", reviewer: "gpt", fallback: "kimi" },
    })

    expect(decision.phase).toBe("design")
    expect(decision.selectedRole).toBe("designer")
    expect(decision.selectedModelId).toBe("gpt")
    expect(decision.reason).toContain("复杂")
  })

  it("routes execution work to worker", () => {
    clearModelRouterState()
    const decision = routeJarvisModel({
      messages: [{ role: "user", content: "按计划执行，修改代码并跑测试" }],
      availableModels: { daily: "kimi", designer: "gpt", worker: "kimi", reviewer: "gpt", fallback: "kimi" },
    })

    expect(decision.phase).toBe("execute")
    expect(decision.selectedRole).toBe("worker")
    expect(decision.selectedModelId).toBe("kimi")
  })

  it("routes repeated failures to reviewer", () => {
    clearModelRouterState()
    const decision = routeJarvisModel({
      messages: [{ role: "user", content: "测试还是失败，分析原因" }],
      failureCount: 2,
      availableModels: { daily: "kimi", designer: "gpt", worker: "kimi", reviewer: "gpt", fallback: "kimi" },
    })

    expect(decision.phase).toBe("debug")
    expect(decision.selectedRole).toBe("reviewer")
    expect(decision.selectedModelId).toBe("gpt")
  })

  it("task override beats automatic routing", () => {
    clearModelRouterState()
    setTaskModelOverride("task-1", "worker")
    const decision = routeJarvisModel({
      taskId: "task-1",
      messages: [{ role: "user", content: "设计一个新产品方案" }],
      availableModels: { daily: "kimi", designer: "gpt", worker: "kimi", reviewer: "gpt", fallback: "kimi" },
    })

    expect(decision.selectedRole).toBe("worker")
    expect(decision.reason).toContain("手动指定")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun test /Users/Zhuanz/JarvisOS/packages/desktop/src/main/jarvis-model-router.test.ts
```

Expected: FAIL because the file does not exist.

- [ ] **Step 3: Implement router**

Create `packages/desktop/src/main/jarvis-model-router.ts`:

```ts
import { randomUUID } from "node:crypto"
import type { JarvisModelRole } from "./jarvis-vault"

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

export interface JarvisModelRouteMessage {
  role: "user" | "assistant" | "system" | "tool"
  content: string
}

export interface JarvisModelRouteInput {
  taskId?: string
  messages: readonly JarvisModelRouteMessage[]
  failureCount?: number
  availableModels: Record<JarvisModelRole, string | null>
}

export interface JarvisModelDecision {
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

const taskOverrides = new Map<string, JarvisModelRole>()
const decisionHistory: JarvisModelDecision[] = []

const designSignals = ["需求", "设计", "方案", "架构", "创新", "创意", "PRD", "权衡", "复杂", "评审"]
const executeSignals = ["实现", "修复", "跑测试", "改文件", "按计划执行", "继续完成", "执行"]
const debugSignals = ["失败", "报错", "分析原因", "定位", "不通过", "类型错误"]

function latestText(messages: readonly JarvisModelRouteMessage[]): string {
  return messages.map((message) => message.content).join("\n")
}

function includesAny(text: string, signals: readonly string[]): boolean {
  return signals.some((signal) => text.includes(signal))
}

function pickAvailable(role: JarvisModelRole, availableModels: Record<JarvisModelRole, string | null>): { role: JarvisModelRole; modelId: string } {
  const preferred = availableModels[role]
  if (preferred) return { role, modelId: preferred }
  const fallback = availableModels.fallback
  if (fallback) return { role: "fallback", modelId: fallback }
  throw new Error(`模型角色 ${role} 未配置，fallback 也不可用`)
}

function createDecision(input: JarvisModelRouteInput, phase: JarvisWorkPhase, role: JarvisModelRole, reason: string, confidence: number): JarvisModelDecision {
  const selected = pickAvailable(role, input.availableModels)
  const decision: JarvisModelDecision = {
    id: randomUUID(),
    taskId: input.taskId,
    phase,
    selectedRole: selected.role,
    selectedModelId: selected.modelId,
    reason,
    confidence,
    overrideable: true,
    createdAt: Date.now(),
  }
  decisionHistory.push(decision)
  return decision
}

export function routeJarvisModel(input: JarvisModelRouteInput): JarvisModelDecision {
  if (input.taskId) {
    const override = taskOverrides.get(input.taskId)
    if (override) {
      return createDecision(input, "execute", override, `宝哥手动指定本任务使用 ${override}`, 1)
    }
  }

  const text = latestText(input.messages)
  if ((input.failureCount ?? 0) >= 2 || includesAny(text, debugSignals)) {
    return createDecision(input, "debug", "reviewer", "检测到连续失败或诊断信号，升级到 reviewer 模型", 0.9)
  }
  if (includesAny(text, designSignals)) {
    return createDecision(input, "design", "designer", "检测到复杂需求、设计、创新或方案权衡信号，切换到 designer 模型", 0.86)
  }
  if (includesAny(text, executeSignals)) {
    return createDecision(input, "execute", "worker", "检测到实现、修复或执行信号，切换到 worker 模型", 0.82)
  }
  return createDecision(input, "chat", "daily", "日常聊天或轻量任务，使用 daily 模型", 0.72)
}

export function setTaskModelOverride(taskId: string, role: JarvisModelRole | null): void {
  if (role) taskOverrides.set(taskId, role)
  else taskOverrides.delete(taskId)
}

export function getModelDecisionHistory(taskId?: string): readonly JarvisModelDecision[] {
  return taskId ? decisionHistory.filter((decision) => decision.taskId === taskId) : [...decisionHistory]
}

export function clearModelRouterState(): void {
  taskOverrides.clear()
  decisionHistory.length = 0
}
```

- [ ] **Step 4: Add renderer-visible decision types**

Modify `packages/desktop/src/preload/types.ts`:

```ts
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
```

- [ ] **Step 5: Run router tests**

Run:

```bash
bun test /Users/Zhuanz/JarvisOS/packages/desktop/src/main/jarvis-model-router.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git -C /Users/Zhuanz/JarvisOS add packages/desktop/src/main/jarvis-model-router.ts packages/desktop/src/main/jarvis-model-router.test.ts packages/desktop/src/preload/types.ts
git -C /Users/Zhuanz/JarvisOS commit -m "feat(model): route work phases"
```

---

### Task 4: Route Chat Calls and Broadcast Decisions

**Files:**
- Modify: `packages/desktop/src/main/jarvis-llm.ts`
- Modify: `packages/desktop/src/main/ipc.ts`
- Modify: `packages/desktop/src/preload/index.ts`
- Modify: `packages/desktop/src/preload/types.ts`

**Interfaces:**
- Consumes: `routeJarvisModel`, `getModelDecisionHistory`, `setTaskModelOverride` from Task 3.
- Produces:
  - IPC event `jarvis:model-decision`
  - API `jarvisModelDecisionHistory(taskId?: string)`
  - API `jarvisModelOverrideTask(taskId: string, role: JarvisModelRole | null)`
  - API `jarvisModelDecisionSubscribe(cb)`

- [ ] **Step 1: Add stream chat options**

Modify `JarvisStreamChatMessage` area in `packages/desktop/src/preload/types.ts`:

```ts
export type JarvisStreamChatOptions = {
  taskId?: string
  failureCount?: number
}
```

Change `ElectronAPI.jarvisStreamChat` signature:

```ts
jarvisStreamChat: (
  messages: JarvisStreamChatMessage[],
  callbacks: { onDelta: (delta: string) => void; onError: (error: string) => void; onDone: () => void },
  options?: JarvisStreamChatOptions,
) => () => void
```

- [ ] **Step 2: Pass options through preload**

Modify `packages/desktop/src/preload/index.ts`:

```ts
jarvisStreamChat: (messages: JarvisStreamChatMessage[], callbacks, options) => {
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
```

- [ ] **Step 3: Route model in LLM handler**

Modify `packages/desktop/src/main/jarvis-llm.ts`:

```ts
import type { IpcMainEvent } from "electron"
import { BrowserWindow } from "electron"
import { getEffectiveJarvisModelConfig, getJarvisModelRoutingConfig } from "./jarvis-model-config"
import { routeJarvisModel } from "./jarvis-model-router"
import type { JarvisStreamChatOptions } from "../preload/types"

function broadcastModelDecision(decision: ReturnType<typeof routeJarvisModel>): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue
    win.webContents.send("jarvis:model-decision", decision)
  }
}

async function availableModelIds() {
  const routing = await getJarvisModelRoutingConfig()
  const find = (role: "daily" | "designer" | "worker" | "reviewer" | "fallback") => {
    const id = routing?.roleBindings[role]
    return routing?.profiles.find((profile) => profile.id === id)?.modelID ?? null
  }
  return {
    daily: find("daily"),
    designer: find("designer"),
    worker: find("worker"),
    reviewer: find("reviewer"),
    fallback: find("fallback"),
  }
}

export async function handleJarvisStreamChat(event: IpcMainEvent, messages: StreamChatMessage[], options: JarvisStreamChatOptions = {}) {
  const sender = event.sender
  const registry = await toolsReady
  const decision = routeJarvisModel({
    taskId: options.taskId,
    messages,
    failureCount: options.failureCount,
    availableModels: await availableModelIds(),
  })
  broadcastModelDecision(decision)
  const modelConfig = await getEffectiveJarvisModelConfig(decision.selectedRole)
```

Keep the rest of the function using `modelConfig`.

- [ ] **Step 4: Update IPC event receiver**

Modify `packages/desktop/src/main/ipc.ts`:

```ts
import { getModelDecisionHistory, setTaskModelOverride } from "./jarvis-model-router"
import type { JarvisModelRole, JarvisStreamChatOptions } from "../preload/types"
```

Update stream chat listener:

```ts
ipcMain.on("jarvis:stream-chat", (event: IpcMainEvent, messages: StreamChatMessage[], options?: JarvisStreamChatOptions) => {
  void handleJarvisStreamChat(event, messages, options)
})
```

Add handlers:

```ts
ipcMain.handle("jarvis:model-decision-history", (_event: IpcMainInvokeEvent, taskId?: string) => {
  return getModelDecisionHistory(taskId)
})

ipcMain.handle("jarvis:model-override-task", (_event: IpcMainInvokeEvent, taskId: string, role: JarvisModelRole | null) => {
  setTaskModelOverride(taskId, role)
})
```

- [ ] **Step 5: Expose decision APIs**

Modify `packages/desktop/src/preload/types.ts`:

```ts
jarvisModelDecisionHistory: (taskId?: string) => Promise<JarvisModelDecision[]>
jarvisModelOverrideTask: (taskId: string, role: JarvisModelRole | null) => Promise<void>
jarvisModelDecisionSubscribe: (cb: (decision: JarvisModelDecision) => void) => () => void
```

Modify `packages/desktop/src/preload/index.ts`:

```ts
jarvisModelDecisionHistory: (taskId?: string) =>
  ipcRenderer.invoke("jarvis:model-decision-history", taskId) as Promise<JarvisModelDecision[]>,
jarvisModelOverrideTask: (taskId, role) =>
  ipcRenderer.invoke("jarvis:model-override-task", taskId, role) as Promise<void>,
jarvisModelDecisionSubscribe: (cb) => {
  const handler = (_: unknown, decision: JarvisModelDecision) => cb(decision)
  ipcRenderer.on("jarvis:model-decision", handler)
  return () => ipcRenderer.removeListener("jarvis:model-decision", handler)
},
```

- [ ] **Step 6: Verify**

Run:

```bash
bun run --cwd /Users/Zhuanz/JarvisOS/packages/desktop typecheck
bun test /Users/Zhuanz/JarvisOS/packages/desktop/src/main/jarvis-model-router.test.ts
```

Expected: both PASS.

- [ ] **Step 7: Commit**

```bash
git -C /Users/Zhuanz/JarvisOS add packages/desktop/src/main/jarvis-llm.ts packages/desktop/src/main/ipc.ts packages/desktop/src/preload/types.ts packages/desktop/src/preload/index.ts
git -C /Users/Zhuanz/JarvisOS commit -m "feat(model): broadcast routing decisions"
```

---

### Task 5: Model Command Center UI

**Files:**
- Modify: `packages/desktop/src/renderer/jarvis/HolographicHub.tsx`
- Modify: `packages/desktop/src/renderer/jarvis/index.css`

**Interfaces:**
- Consumes:
  - `window.api.jarvisModelRoutingConfigGet()`
  - `window.api.jarvisModelRoutingConfigSave(config)`
  - `window.api.jarvisModelProfileConnectionTest(profile)`
  - `window.api.jarvisModelDecisionSubscribe(cb)`
- Produces: Model Pulse shows latest decision; dialog edits profiles and role bindings.

- [ ] **Step 1: Add UI state**

Modify `HolographicHub.tsx` imports:

```ts
import type {
  JarvisGrowthReport,
  JarvisMetricsSnapshot,
  JarvisModelDecision,
  JarvisModelProfileDraft,
  JarvisModelRoutingConfigDraft,
  JarvisModelRoutingConfigSnapshot,
  JarvisModelRole,
  JarvisToolMetric,
} from "../../preload/types"
```

Add defaults near `emptyModelDraft`:

```ts
const modelRoles: JarvisModelRole[] = ["daily", "designer", "worker", "reviewer", "fallback"]

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
```

Add component state:

```ts
const [routingConfig, setRoutingConfig] = createSignal<JarvisModelRoutingConfigSnapshot | null>(null)
const [routingDraft, setRoutingDraft] = createSignal<JarvisModelRoutingConfigDraft>(defaultRoutingDraft())
const [latestDecision, setLatestDecision] = createSignal<JarvisModelDecision | null>(null)
const [profileTesting, setProfileTesting] = createSignal<string | null>(null)
const [profileTestResult, setProfileTestResult] = createSignal<Record<string, string>>({})
```

- [ ] **Step 2: Load routing config and subscribe decisions**

Inside `onMount`, add:

```ts
window.api.jarvisModelRoutingConfigGet().then((config) => {
  if (!mounted) return
  setRoutingConfig(config)
  if (config) {
    setRoutingDraft({
      version: 2,
      profiles: config.profiles.map((profile) => ({ ...profile, apiKey: "" })),
      roleBindings: config.roleBindings,
    })
  }
}).catch((reason) => {
  if (mounted) setModelError(String(reason))
})

const unsubscribeDecision = window.api.jarvisModelDecisionSubscribe((decision) => setLatestDecision(decision))
```

Update cleanup:

```ts
unsubscribe()
unsubscribeDecision()
```

- [ ] **Step 3: Add helpers for profile editing**

Add inside component:

```ts
function updateProfile(profileId: string, patch: Partial<JarvisModelProfileDraft>) {
  setRoutingDraft((current) => ({
    ...current,
    profiles: current.profiles.map((profile) => (profile.id === profileId ? { ...profile, ...patch } : profile)),
  }))
}

function updateRoleBinding(role: JarvisModelRole, profileId: string) {
  setRoutingDraft((current) => ({
    ...current,
    roleBindings: { ...current.roleBindings, [role]: profileId },
  }))
}

function addProfile() {
  const id = `model-${Date.now()}`
  setRoutingDraft((current) => ({
    ...current,
    profiles: [
      ...current.profiles,
      {
        id,
        label: "GPT Designer",
        providerType: "openai-compatible",
        baseURL: "https://api.openai.com/v1",
        apiKey: "",
        modelID: "gpt-5",
      },
    ],
  }))
}

async function testProfile(profile: JarvisModelProfileDraft) {
  setProfileTesting(profile.id)
  try {
    const result = await window.api.jarvisModelProfileConnectionTest(profile)
    setProfileTestResult((current) => ({
      ...current,
      [profile.id]: result.ok ? `畅通 · ${result.latencyMs}ms` : `异常 · ${result.error}`,
    }))
  } finally {
    setProfileTesting(null)
  }
}

async function saveRoutingConfig() {
  setModelSaving(true)
  setModelError(null)
  try {
    const saved = await window.api.jarvisModelRoutingConfigSave(routingDraft())
    setRoutingConfig(saved)
    setModelDialogOpen(false)
  } catch (reason) {
    setModelError(String(reason))
  } finally {
    setModelSaving(false)
  }
}
```

- [ ] **Step 4: Update Model Pulse display**

Replace current `PulseCard title="Model Pulse"` props with:

```tsx
<PulseCard
  title="Model Pulse"
  label={latestDecision()?.phase.toUpperCase() ?? model()}
  value={latestDecision()?.selectedModelId ?? modelStatus().text}
  sub={latestDecision()?.reason ?? `${modelStatus().detail} · ${Math.round(llmError())}% error · ${llm()?.lastTotalTokens ?? 0} tokens`}
  accent={modelAccent()}
>
  <MicroBar label={latestDecision()?.selectedRole ?? "latency pressure"} value={Math.min(100, llmLatency() / 50)} color={accentColors[modelAccent()]} />
</PulseCard>
```

- [ ] **Step 5: Replace dialog content with command center**

Inside the existing `modelDialogOpen()` modal, replace the form body with:

```tsx
<div class="mt-4 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div class="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Profiles</div>
      <button type="button" class="jarvis-mini-button" onClick={addProfile}>Add</button>
    </div>
    <For each={routingDraft().profiles}>
      {(profile) => (
        <div class="jarvis-model-profile-card">
          <input class="jarvis-model-input" value={profile.label} onInput={(event) => updateProfile(profile.id, { label: event.currentTarget.value })} />
          <input class="jarvis-model-input" value={profile.baseURL} onInput={(event) => updateProfile(profile.id, { baseURL: event.currentTarget.value })} />
          <input class="jarvis-model-input" value={profile.modelID} onInput={(event) => updateProfile(profile.id, { modelID: event.currentTarget.value })} />
          <input class="jarvis-model-input" type="password" value={profile.apiKey ?? ""} placeholder={routingConfig()?.profiles.find((item) => item.id === profile.id)?.hasApiKey ? "已保存" : "API Key"} onInput={(event) => updateProfile(profile.id, { apiKey: event.currentTarget.value })} />
          <div class="flex items-center justify-between gap-2">
            <span class="text-[10px] text-white/45">{profileTestResult()[profile.id] ?? "未测试"}</span>
            <button type="button" class="jarvis-mini-button" disabled={profileTesting() === profile.id} onClick={() => testProfile(profile)}>
              {profileTesting() === profile.id ? "Testing" : "Test"}
            </button>
          </div>
        </div>
      )}
    </For>
  </div>
  <div class="space-y-3">
    <div class="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Role Bindings</div>
    <For each={modelRoles}>
      {(role) => (
        <label class="block space-y-1">
          <span class="text-[10px] uppercase tracking-[0.14em] text-white/40">{role}</span>
          <select class="jarvis-model-input" value={routingDraft().roleBindings[role]} onChange={(event) => updateRoleBinding(role, event.currentTarget.value)}>
            <For each={routingDraft().profiles}>
              {(profile) => <option value={profile.id}>{profile.label}</option>}
            </For>
          </select>
        </label>
      )}
    </For>
  </div>
</div>
```

Change Save button to `onClick={saveRoutingConfig}`.

- [ ] **Step 6: Add CSS**

Modify `packages/desktop/src/renderer/jarvis/index.css`:

```css
.jarvis-model-profile-card {
  display: grid;
  gap: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 10px;
}

.jarvis-model-input {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: white;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 12px;
  outline: none;
}

.jarvis-model-input:focus {
  border-color: rgba(94, 246, 255, 0.65);
}

.jarvis-mini-button {
  border: 1px solid rgba(94, 246, 255, 0.3);
  border-radius: 6px;
  padding: 6px 9px;
  color: rgba(207, 250, 254, 0.95);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.jarvis-mini-button:disabled {
  opacity: 0.45;
}
```

- [ ] **Step 7: Verify**

Run:

```bash
bun run --cwd /Users/Zhuanz/JarvisOS/packages/desktop typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git -C /Users/Zhuanz/JarvisOS add packages/desktop/src/renderer/jarvis/HolographicHub.tsx packages/desktop/src/renderer/jarvis/index.css
git -C /Users/Zhuanz/JarvisOS commit -m "feat(model): add command center"
```

---

### Task 6: Task Model Timeline and Override Actions

**Files:**
- Modify: `packages/desktop/src/renderer/jarvis/TaskPanel.tsx`
- Modify: `packages/desktop/src/renderer/jarvis/LLM.ts`
- Modify: `packages/desktop/src/renderer/jarvis/send-message.ts` if it wraps `streamChat`

**Interfaces:**
- Consumes:
  - `window.api.jarvisModelDecisionHistory(taskId)`
  - `window.api.jarvisModelDecisionSubscribe(cb)`
  - `window.api.jarvisModelOverrideTask(taskId, role)`
  - `streamChat(messages, onDelta, onError, options)`
- Produces: Task panel model timeline and `Fix GPT/Kimi for task` controls.

- [ ] **Step 1: Update renderer LLM wrapper**

Modify `packages/desktop/src/renderer/jarvis/LLM.ts` so `streamChat` accepts options:

```ts
import type { JarvisStreamChatMessage, JarvisStreamChatOptions } from "../../preload/types"

export function streamChat(
  messages: JarvisStreamChatMessage[],
  onDelta: (delta: string) => void,
  onError: (error: Error) => void,
  options?: JarvisStreamChatOptions,
) {
  return new Promise<void>((resolve) => {
    const cleanup = window.api.jarvisStreamChat(
      messages,
      {
        onDelta,
        onError: (error) => {
          onError(new Error(error))
          cleanup()
          resolve()
        },
        onDone: () => {
          cleanup()
          resolve()
        },
      },
      options,
    )
  })
}
```

- [ ] **Step 2: Pass task id from TaskPanel**

Modify `runTaskAssistantTurn` in `TaskPanel.tsx`:

```ts
await streamChat(
  messages,
  (delta) => {
    jarvisActions.appendAssistantContent(delta)
    jarvisActions.appendTaskAssistantContent(taskId, delta)
    fullResponse += delta
  },
  (error) => {
    jarvisActions.appendAssistantContent(`\n\n[错误] ${error.message}`)
    jarvisActions.appendTaskAssistantContent(taskId, `\n\n[错误] ${error.message}`)
    fullResponse += `\n\n[错误] ${error.message}`
  },
  { taskId },
)
```

- [ ] **Step 3: Load and subscribe task decisions**

Add imports:

```ts
import type { JarvisModelDecision, JarvisModelRole } from "../../preload/types"
```

Add state:

```ts
const [modelDecisions, setModelDecisions] = createSignal<JarvisModelDecision[]>([])
```

Add onMount subscription after existing animation setup:

```ts
onMount(() => {
  const id = jarvisStore.expandedTaskId
  if (id) {
    window.api.jarvisModelDecisionHistory(id).then((items) => setModelDecisions(items))
  }
  const unsubscribe = window.api.jarvisModelDecisionSubscribe((decision) => {
    const currentId = jarvisStore.expandedTaskId
    if (!currentId || decision.taskId !== currentId) return
    setModelDecisions((items) => [...items, decision])
  })
  onCleanup(unsubscribe)
})
```

If `TaskPanel.tsx` currently has one `onMount`, merge this logic into it instead of adding a conflicting lifecycle block.

- [ ] **Step 4: Add override helper**

Inside `TaskPanel`:

```ts
async function pinModel(role: JarvisModelRole | null) {
  const id = jarvisStore.expandedTaskId
  if (!id) return
  await window.api.jarvisModelOverrideTask(id, role)
}
```

- [ ] **Step 5: Render model timeline**

Add in the panel body below header and before messages:

```tsx
<div class="mx-5 mb-3 rounded border border-white/10 bg-white/[0.03] p-3">
  <div class="mb-2 flex items-center justify-between gap-3">
    <div class="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/70">Model Timeline</div>
    <div class="flex items-center gap-2">
      <button type="button" class="jarvis-mini-button" onClick={() => pinModel("designer")}>Pin GPT</button>
      <button type="button" class="jarvis-mini-button" onClick={() => pinModel("worker")}>Pin Kimi</button>
      <button type="button" class="jarvis-mini-button" onClick={() => pinModel(null)}>Auto</button>
    </div>
  </div>
  <For each={modelDecisions().slice(-6)}>
    {(decision) => (
      <div class="grid grid-cols-[44px_70px_70px_1fr] gap-2 py-1 text-[10px] text-white/60">
        <span>{new Date(decision.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>
        <span class="text-cyan-200/80">{decision.selectedModelId}</span>
        <span class="text-emerald-200/70">{decision.phase}</span>
        <span class="truncate">{decision.reason}</span>
      </div>
    )}
  </For>
  <Show when={modelDecisions().length === 0}>
    <div class="text-[10px] text-white/35">模型决策会在本任务开始后显示。</div>
  </Show>
</div>
```

- [ ] **Step 6: Verify**

Run:

```bash
bun run --cwd /Users/Zhuanz/JarvisOS/packages/desktop typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git -C /Users/Zhuanz/JarvisOS add packages/desktop/src/renderer/jarvis/TaskPanel.tsx packages/desktop/src/renderer/jarvis/LLM.ts packages/desktop/src/renderer/jarvis/send-message.ts
git -C /Users/Zhuanz/JarvisOS commit -m "feat(model): show task model timeline"
```

---

### Task 7: End-to-End Verification and Docs

**Files:**
- Modify: `README.md`
- Modify: `docs/roadmap.md`

**Interfaces:**
- Consumes all previous tasks.
- Produces documented verification case for GPT/Kimi routing.

- [ ] **Step 1: Run unit tests**

Run:

```bash
bun test /Users/Zhuanz/JarvisOS/packages/desktop/src/main/jarvis-vault.test.ts /Users/Zhuanz/JarvisOS/packages/desktop/src/main/jarvis-model-router.test.ts /Users/Zhuanz/JarvisOS/packages/desktop/src/main/jarvis-model-connection.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run desktop typecheck**

Run:

```bash
bun run --cwd /Users/Zhuanz/JarvisOS/packages/desktop typecheck
```

Expected: PASS.

- [ ] **Step 3: Start desktop app**

Run:

```bash
bun run dev:desktop
```

Expected: Electron app starts. Renderer URL prints as `http://localhost:<port>/`.

- [ ] **Step 4: Manual verification case**

Use this case in JarvisOS:

```text
帮我设计一个复杂需求：JarvisOS 需要自动选择 GPT 和 Kimi，不同阶段用不同模型，并展示切换原因。
```

Expected:

- Model Pulse switches to `designer` / GPT if configured.
- A decision reason appears: complex design or architecture signal.
- Task timeline records `design` or `clarify`.

Then send:

```text
按刚才的设计开始执行，修改代码并跑测试。
```

Expected:

- Model decision switches to `worker` / Kimi if configured.
- Task timeline records `execute`.

Then send:

```text
测试失败了，帮我分析原因。
```

Expected:

- Model decision switches to `reviewer` / GPT if configured.
- Task timeline records `debug`.

- [ ] **Step 5: Update README**

Add to `README.md`:

```md
## Intelligent Model Routing

JarvisOS can route work across multiple OpenAI-compatible model profiles. Daily chat and execution can use a low-cost worker model such as Kimi, while clarification, design, debugging, and review can use a stronger reasoning model such as GPT.

Open Model Pulse in the HUD to configure profiles and bind roles:

- `daily`: daily chat and lightweight commands
- `designer`: requirement clarification, creative design, architecture decisions
- `worker`: implementation, tool calls, command execution
- `reviewer`: debugging, verification failures, risk review
- `fallback`: backup model when a role is unavailable

Every automatic switch creates a visible model decision event with phase, model, role, and reason. Task panels show a model timeline and allow task-level overrides.
```

- [ ] **Step 6: Update roadmap**

Modify `docs/roadmap.md` Phase 2/5 or current progress note to mention:

```md
模型路由已支持多 profile、角色绑定、自动阶段决策、后台报备和任务时间线。
```

- [ ] **Step 7: Commit docs**

```bash
git -C /Users/Zhuanz/JarvisOS add README.md docs/roadmap.md
git -C /Users/Zhuanz/JarvisOS commit -m "docs(model): document intelligent routing"
```

---

## Self-Review

Spec coverage:

- Multi-model profiles and role bindings: Task 1 and Task 2.
- Automatic phase routing: Task 3 and Task 4.
- Background decision reporting: Task 4.
- Model Pulse and Command Center: Task 5.
- Task timeline and overrides: Task 6.
- Testing and docs: Task 7.

Placeholder scan:

- No placeholder markers or incomplete task references are used.
- Every task has explicit file paths, commands, and expected outcomes.

Type consistency:

- `JarvisModelRole`, `JarvisWorkPhase`, `JarvisModelDecision`, and routing config names are introduced before use.
- IPC names use the `jarvis:model-*` namespace consistently.
- Renderer API names mirror IPC handlers and preload types.
