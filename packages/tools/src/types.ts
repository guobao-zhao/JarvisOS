export type ToolStatus = "hit" | "miss" | "error"

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: unknown
  outputSchema?: unknown
}

export interface ToolResult {
  ok: boolean
  value?: unknown
  error?: string
}

export type ToolHandler = (args: unknown) => Promise<ToolResult>

export interface ToolRegistration {
  definition: ToolDefinition
  skillName: string
  handler: ToolHandler
}

export interface ToolUsageMetric {
  toolName: string
  skillName: string
  callCount: number
  hitCount: number
  missCount: number
  errorCount: number
  avgLatencyMs: number
  lastUsedAt: number
}

export interface SkillManifest {
  name: string
  description: string
  triggers: string[]
  tools: string[]
}

export interface ToolRegistry {
  /** 注册一个工具。 */
  register(tool: ToolRegistration): void
  /** 列出当前可用的所有工具定义。 */
  list(): ToolDefinition[]
  /** 执行指定工具。 */
  execute(name: string, args: unknown): Promise<ToolResult>
  /** 记录一次工具调用结果，用于命中率统计。 */
  recordUsage(name: string, status: ToolStatus): void
  /** 获取工具使用统计。 */
  getUsageMetrics(): ReadonlyMap<string, ToolUsageMetric>
}
