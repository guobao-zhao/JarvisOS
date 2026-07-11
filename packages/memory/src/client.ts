import { frontmatterToDocument } from "./markdown"
import type { MemoryClientConfig } from "./config"
import type { MemoryDocument, MemoryHealth, MemoryHit, MemorySearchOptions } from "./types"

export class LLMWikiClient {
  constructor(private config: MemoryClientConfig) {}

  private async request(path: string, init?: RequestInit): Promise<unknown> {
    const url = `${this.config.baseURL}${path}`
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (this.config.token) headers.Authorization = `Bearer ${this.config.token}`
    const res = await fetch(url, { ...init, headers })
    if (!res.ok) throw new Error(`LLM-wiki ${res.status}: ${await res.text()}`)
    return res.json()
  }

  async health(): Promise<MemoryHealth> {
    try {
      const data = (await this.request("/api/v1/health")) as {
        ok: boolean
        authConfigured: boolean
        allowUnauthenticated: boolean
      }
      const tokenReady =
        data.authConfigured || data.allowUnauthenticated || Boolean(this.config.token)

      let projectResolved = false
      if (this.config.project === "current") {
        projectResolved = true
      } else {
        try {
          const data = (await this.request("/api/v1/projects")) as {
            projects?: Array<{ id: string }>
          }
          projectResolved = (data.projects ?? []).some((p) => p.id === this.config.project)
        } catch {
          projectResolved = false
        }
      }

      return {
        ok: true,
        authConfigured: tokenReady,
        projectResolved,
        writable: tokenReady && projectResolved,
      }
    } catch (err) {
      return {
        ok: false,
        authConfigured: false,
        projectResolved: false,
        writable: false,
        reason: err instanceof Error ? err.message : String(err),
      }
    }
  }

  async search(query: string, options?: MemorySearchOptions): Promise<MemoryHit[]> {
    const data = (await this.request(`/api/v1/projects/${this.config.project}/search`, {
      method: "POST",
      body: JSON.stringify({
        query,
        topK: options?.topK ?? 5,
        includeContent: options?.includeContent ?? true,
      }),
    })) as { results?: MemoryHit[] }
    const results = data.results ?? []
    if (options?.source) {
      return results.filter((hit) => hit.source === options.source)
    }
    return results
  }

  async read(id: string): Promise<MemoryDocument | null> {
    try {
      const text = await fetch(
        `${this.config.baseURL}/api/v1/projects/${this.config.project}/files/content?path=${encodeURIComponent(id)}`,
        {
          headers: this.config.token ? { Authorization: `Bearer ${this.config.token}` } : {},
        },
      )
      if (!text.ok) return null
      const raw = await text.text()
      return frontmatterToDocument(id, raw)
    } catch {
      return null
    }
  }

  async rescan(): Promise<void> {
    await this.request(`/api/v1/projects/${this.config.project}/sources/rescan`, {
      method: "POST",
    })
  }
}
