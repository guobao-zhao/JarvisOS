export type ToolStatus = "hit" | "miss" | "error"
export type ToolNamespace = "formal" | "candidate"

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
  namespace: ToolNamespace
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
