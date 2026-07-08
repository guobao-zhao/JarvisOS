import { execFile } from "node:child_process"
import { homedir } from "node:os"
import { join } from "node:path"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

function getCredentialStorePath(): string {
  if (process.env.JARVIS_CREDENTIAL_STORE) {
    return process.env.JARVIS_CREDENTIAL_STORE
  }
  return join(homedir(), "Jarvis", ".ai", "scripts", "credential_store.py")
}

export interface KimiCredentials {
  apiKey: string
  baseURL: string
}

let cachedKimiCredentials: KimiCredentials | null | undefined

export async function getKimiCredentials(): Promise<KimiCredentials | null> {
  if (cachedKimiCredentials !== undefined) return cachedKimiCredentials

  const credentialStorePath = getCredentialStorePath()

  try {
    const [apiKeyResult, baseUrlResult] = await Promise.all([
      execFileAsync("python3", [credentialStorePath, "get", "kimi_code", "api_key"]),
      execFileAsync("python3", [credentialStorePath, "get", "kimi_code", "base_url"]),
    ])

    const apiKey = apiKeyResult.stdout.trim()
    const baseURL = baseUrlResult.stdout.trim()

    if (!apiKey || !baseURL) {
      cachedKimiCredentials = null
      return null
    }

    cachedKimiCredentials = { apiKey, baseURL }
    return cachedKimiCredentials
  } catch {
    cachedKimiCredentials = null
    return null
  }
}
