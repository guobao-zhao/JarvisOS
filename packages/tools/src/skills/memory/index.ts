import { createMemoryService, type MemorySearchOptions } from "@jarvis-os/memory"
import type { SkillModule } from "../../registry"
import type { ToolRegistry } from "../../types"

export const manifest = {
  name: "memory",
  description: "让 Jarvis 在对话中主动搜索和引用历史记忆",
  triggers: ["memory_search", "回忆", "记得"],
  tools: ["memory_search"],
}

export function register(registry: ToolRegistry): void {
  const memory = createMemoryService()

  registry.register({
    definition: {
      name: "memory_search",
      description:
        "当用户的问题可能需要历史记忆时调用。返回与查询最相关的记忆条目（含标题、内容、来源和相似度分数）。",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "搜索关键词或用户问题" },
          topK: { type: "number", description: "返回条数，默认 5" },
          source: {
            type: "string",
            enum: ["conversation", "intelligence", "user_manual", "task", "insight"],
            description: "可选：按记忆来源过滤",
          },
        },
        required: ["query"],
      },
      outputSchema: {
        type: "object",
        properties: {
          hits: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                title: { type: "string" },
                content: { type: "string" },
                score: { type: "number" },
                source: { type: "string" },
              },
            },
          },
        },
      },
    },
    skillName: manifest.name,
    handler: async (args: unknown) => {
      const { query, topK, source } = args as {
        query: string
        topK?: number
        source?: MemorySearchOptions["source"]
      }
      const hits = await memory.search(query, { topK: topK ?? 5, includeContent: true, source })
      return { ok: true, value: { hits } }
    },
  })
}

export const skill: SkillModule = { manifest, register }
