import { safeStorage, app } from "electron"
import Store from "electron-store"

import { getKimiCredentials } from "./jarvis-credential"
import {
  createJarvisVault,
  type JarvisModelConfig,
  type JarvisModelProfile,
  type JarvisModelRole,
  type JarvisModelRoutingConfig,
} from "./jarvis-vault"
import type {
  JarvisModelConfigDraft,
  JarvisModelConfigSnapshot,
  JarvisModelProfileDraft,
  JarvisModelProfileSnapshot,
  JarvisModelRoutingConfigDraft,
  JarvisModelRoutingConfigSnapshot,
} from "../preload/types"

const STORE_NAME = "jarvis.model"

let vault: ReturnType<typeof createJarvisVault> | null = null

function getVault() {
  if (vault) return vault

  const store = new Store({
    name: STORE_NAME,
    cwd: app.getPath("userData"),
    fileExtension: "",
    accessPropertiesByDotNotation: false,
  })

  vault = createJarvisVault({
    read: (key) => store.get(key),
    write: (key, value) => store.set(key, value),
    encrypt: (value) => {
      if (!safeStorage.isEncryptionAvailable()) return value
      return safeStorage.encryptString(value).toString("base64")
    },
    decrypt: (value) => {
      if (!safeStorage.isEncryptionAvailable()) return value
      return safeStorage.decryptString(Buffer.from(value, "base64"))
    },
  })

  return vault
}

function normalizeDraft(input: JarvisModelConfigDraft) {
  return {
    providerType: input.providerType,
    baseURL: input.baseURL.trim().replace(/\/+$/, ""),
    apiKey: input.apiKey?.trim() ?? "",
    modelID: input.modelID.trim(),
  }
}

function toSnapshot(config: JarvisModelConfig): JarvisModelConfigSnapshot {
  return {
    providerType: config.providerType,
    baseURL: config.baseURL,
    modelID: config.modelID,
    hasApiKey: true,
  }
}

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

function toRoutingSnapshot(config: JarvisModelRoutingConfig): JarvisModelRoutingConfigSnapshot {
  return {
    version: 2,
    profiles: config.profiles.map(toProfileSnapshot),
    roleBindings: config.roleBindings,
  }
}

function normalizeProfileDraft(input: JarvisModelProfileDraft) {
  return {
    id: input.id.trim(),
    label: input.label.trim(),
    providerType: input.providerType,
    baseURL: input.baseURL.trim().replace(/\/+$/, ""),
    apiKey: input.apiKey?.trim() ?? "",
    modelID: input.modelID.trim(),
  }
}

async function resolveConfig(input: JarvisModelConfigDraft): Promise<JarvisModelConfig> {
  const normalized = normalizeDraft(input)
  if (!normalized.baseURL) throw new Error("baseURL 不能为空")
  if (!normalized.modelID) throw new Error("modelID 不能为空")
  if (normalized.providerType !== "openai-compatible") throw new Error("暂不支持该模型提供方")

  const saved = await getJarvisModelConfig()
  if (normalized.apiKey) {
    return {
      providerType: normalized.providerType,
      baseURL: normalized.baseURL,
      apiKey: normalized.apiKey,
      modelID: normalized.modelID,
    }
  }

  if (saved) {
    return {
      providerType: normalized.providerType,
      baseURL: normalized.baseURL,
      apiKey: saved.apiKey,
      modelID: normalized.modelID,
    }
  }

  const legacy = await getKimiCredentials()
  if (legacy) {
    return {
      providerType: normalized.providerType,
      baseURL: normalized.baseURL,
      apiKey: legacy.apiKey,
      modelID: normalized.modelID,
    }
  }

  throw new Error("API Key 不能为空")
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

export async function getJarvisModelConfig(): Promise<JarvisModelConfig | null> {
  const stored = getVault().getModelConfig()
  return stored
}

export async function getJarvisModelConfigSnapshot(): Promise<JarvisModelConfigSnapshot | null> {
  const stored = await getJarvisModelConfig()
  if (stored) return toSnapshot(stored)

  const legacy = await getKimiCredentials()
  if (!legacy) return null

  return {
    providerType: "openai-compatible",
    baseURL: legacy.baseURL,
    modelID: "kimi-k2-0711-preview",
    hasApiKey: true,
  }
}

export async function saveJarvisModelConfig(input: JarvisModelConfigDraft): Promise<JarvisModelConfigSnapshot> {
  const config = await resolveConfig(input)
  await getVault().setModelConfig(config)
  return toSnapshot(config)
}

export async function getJarvisModelRoutingConfig(): Promise<JarvisModelRoutingConfig | null> {
  return getVault().getModelRoutingConfig()
}

export async function getJarvisModelRoutingConfigSnapshot(): Promise<JarvisModelRoutingConfigSnapshot | null> {
  const config = await getJarvisModelRoutingConfig()
  return config ? toRoutingSnapshot(config) : null
}

export async function saveJarvisModelRoutingConfig(
  input: JarvisModelRoutingConfigDraft,
): Promise<JarvisModelRoutingConfigSnapshot> {
  const profiles = await Promise.all(input.profiles.map(resolveProfileDraft))
  const config: JarvisModelRoutingConfig = {
    version: 2,
    profiles,
    roleBindings: input.roleBindings,
  }
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

export async function testJarvisModelConnection(input: JarvisModelConfigDraft) {
  const config = await resolveConfig(input)
  const { testModelConnection } = await import("./jarvis-model-connection")
  return testModelConnection(config)
}

export async function testJarvisModelProfileConnection(input: JarvisModelProfileDraft) {
  const profile = await resolveProfileDraft(input)
  const { testModelConnection } = await import("./jarvis-model-connection")
  return testModelConnection(profile)
}
