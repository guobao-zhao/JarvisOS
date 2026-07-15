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

export interface JarvisVaultStorage {
  read(key: string): unknown
  write(key: string, value: unknown): void
}

export interface JarvisVaultCrypto {
  encrypt(value: string): string
  decrypt(value: string): string
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
  const normalized = normalizeModelConfig(profile)
  return {
    ...normalized,
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
