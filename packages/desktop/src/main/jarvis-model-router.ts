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

function pickAvailable(
  role: JarvisModelRole,
  availableModels: Record<JarvisModelRole, string | null>,
): { role: JarvisModelRole; modelId: string } {
  const preferred = availableModels[role]
  if (preferred) return { role, modelId: preferred }
  const fallback = availableModels.fallback
  if (fallback) return { role: "fallback", modelId: fallback }
  throw new Error(`模型角色 ${role} 未配置，fallback 也不可用`)
}

function createDecision(
  input: JarvisModelRouteInput,
  phase: JarvisWorkPhase,
  role: JarvisModelRole,
  reason: string,
  confidence: number,
): JarvisModelDecision {
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
