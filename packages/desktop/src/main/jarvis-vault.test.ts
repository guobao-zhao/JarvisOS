import { describe, expect, test } from "bun:test"
import { createJarvisVault, type JarvisModelConfig } from "./jarvis-vault"

function createMemoryVault() {
  const storage = new Map<string, unknown>()
  const vault = createJarvisVault({
    read: (key) => storage.get(key),
    write: (key, value) => storage.set(key, value),
    encrypt: (value) => `enc:${Buffer.from(value, "utf8").toString("base64")}`,
    decrypt: (value) => Buffer.from(value.slice(4), "base64").toString("utf8"),
  })
  return { storage, vault }
}

describe("Jarvis vault", () => {
  test("stores model API keys encrypted and restores the usable config", async () => {
    const { storage, vault } = createMemoryVault()
    const config: JarvisModelConfig = {
      providerType: "openai-compatible",
      baseURL: "https://api.moonshot.cn/v1",
      apiKey: "secret-api-key",
      modelID: "kimi-k2-0711-preview",
    }

    await vault.setModelConfig(config)

    expect(JSON.stringify(storage.get("modelConfig"))).not.toContain("secret-api-key")
    await expect(vault.getModelConfig()).resolves.toEqual(config)
  })

  test("migrates the old single model config into v2 role bindings", async () => {
    const { vault } = createMemoryVault()
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
    expect(migrated?.profiles[0]?.apiKey).toBe("kimi-secret")
    expect(migrated?.roleBindings).toEqual({
      daily: "legacy-default",
      designer: "legacy-default",
      worker: "legacy-default",
      reviewer: "legacy-default",
      fallback: "legacy-default",
    })
  })

  test("stores routing profiles encrypted and restores usable configs", async () => {
    const { storage, vault } = createMemoryVault()

    await vault.setModelRoutingConfig({
      version: 2,
      profiles: [
        {
          id: "gpt",
          label: "GPT Designer",
          providerType: "openai-compatible",
          baseURL: "https://api.openai.com/v1/",
          apiKey: "gpt-secret",
          modelID: "gpt-5",
        },
      ],
      roleBindings: {
        daily: "gpt",
        designer: "gpt",
        worker: "gpt",
        reviewer: "gpt",
        fallback: "gpt",
      },
    })

    expect(JSON.stringify(storage.get("modelRoutingConfig"))).not.toContain("gpt-secret")
    await expect(vault.getModelRoutingConfig()).resolves.toEqual({
      version: 2,
      profiles: [
        {
          id: "gpt",
          label: "GPT Designer",
          providerType: "openai-compatible",
          baseURL: "https://api.openai.com/v1",
          apiKey: "gpt-secret",
          modelID: "gpt-5",
        },
      ],
      roleBindings: {
        daily: "gpt",
        designer: "gpt",
        worker: "gpt",
        reviewer: "gpt",
        fallback: "gpt",
      },
    })
  })
})
