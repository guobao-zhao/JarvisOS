import type {
  SkillManifest,
  ToolDefinition,
  ToolHandler,
  ToolRegistry,
  ToolResult,
  ToolStatus,
  ToolUsageMetric,
} from "./types"

export interface RegisteredTool {
  definition: ToolDefinition
  skillName: string
  handler: ToolHandler
}

export function createToolRegistry(): ToolRegistry {
  const tools = new Map<string, RegisteredTool>()
  const metrics = new Map<string, ToolUsageMetric>()

  function ensureMetric(name: string, skillName: string): ToolUsageMetric {
    const existing = metrics.get(name)
    if (existing) return existing
    const fresh: ToolUsageMetric = {
      toolName: name,
      skillName,
      callCount: 0,
      hitCount: 0,
      missCount: 0,
      errorCount: 0,
      avgLatencyMs: 0,
      lastUsedAt: 0,
    }
    metrics.set(name, fresh)
    return fresh
  }

  return {
    register(tool) {
      tools.set(tool.definition.name, {
        definition: tool.definition,
        skillName: tool.skillName,
        handler: tool.handler,
      })
    },

    list() {
      return Array.from(tools.values(), (t) => t.definition)
    },

    async execute(name, args) {
      const tool = tools.get(name)
      if (!tool) {
        return { ok: false, error: `Unknown tool: ${name}` }
      }

      const start = performance.now()
      try {
        const result = await tool.handler(args)
        const latency = Math.round(performance.now() - start)
        const metric = ensureMetric(name, tool.skillName)
        metric.callCount += 1
        metric.lastUsedAt = Date.now()
        metric.avgLatencyMs =
          metric.avgLatencyMs === 0
            ? latency
            : Math.round((metric.avgLatencyMs * (metric.callCount - 1) + latency) / metric.callCount)
        if (result.ok) metric.hitCount += 1
        else metric.missCount += 1
        return result
      } catch (err) {
        const latency = Math.round(performance.now() - start)
        const metric = ensureMetric(name, tool.skillName)
        metric.callCount += 1
        metric.errorCount += 1
        metric.lastUsedAt = Date.now()
        metric.avgLatencyMs =
          metric.avgLatencyMs === 0
            ? latency
            : Math.round((metric.avgLatencyMs * (metric.callCount - 1) + latency) / metric.callCount)
        return {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        }
      }
    },

    recordUsage(name, status) {
      const tool = tools.get(name)
      const metric = tool ? ensureMetric(name, tool.skillName) : ensureMetric(name, "unknown")
      metric.callCount += 1
      metric.lastUsedAt = Date.now()
      if (status === "hit") metric.hitCount += 1
      else if (status === "miss") metric.missCount += 1
      else if (status === "error") metric.errorCount += 1
    },

    getUsageMetrics() {
      return new Map(metrics)
    },
  }
}

export interface SkillModule {
  manifest: SkillManifest
  register(registry: ToolRegistry): void
}

export function registerSkill(registry: ToolRegistry, skill: SkillModule): void {
  skill.register(registry)
}
