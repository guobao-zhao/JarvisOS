import { describe, expect, it } from "bun:test"
import { clearModelRouterState, getModelDecisionHistory, routeJarvisModel, setTaskModelOverride } from "./jarvis-model-router"

const availableModels = {
  daily: "kimi",
  designer: "gpt",
  worker: "kimi",
  reviewer: "gpt",
  fallback: "kimi",
} as const

describe("routeJarvisModel", () => {
  it("routes complex design work to designer", () => {
    clearModelRouterState()
    const decision = routeJarvisModel({
      messages: [{ role: "user", content: "帮我设计一个复杂需求，需要方案权衡和创新" }],
      availableModels,
    })

    expect(decision.phase).toBe("design")
    expect(decision.selectedRole).toBe("designer")
    expect(decision.selectedModelId).toBe("gpt")
    expect(decision.reason).toContain("复杂")
  })

  it("routes execution work to worker", () => {
    clearModelRouterState()
    const decision = routeJarvisModel({
      messages: [{ role: "user", content: "按计划执行，修改代码并跑测试" }],
      availableModels,
    })

    expect(decision.phase).toBe("execute")
    expect(decision.selectedRole).toBe("worker")
    expect(decision.selectedModelId).toBe("kimi")
  })

  it("routes repeated failures to reviewer", () => {
    clearModelRouterState()
    const decision = routeJarvisModel({
      messages: [{ role: "user", content: "测试还是失败，分析原因" }],
      failureCount: 2,
      availableModels,
    })

    expect(decision.phase).toBe("debug")
    expect(decision.selectedRole).toBe("reviewer")
    expect(decision.selectedModelId).toBe("gpt")
  })

  it("task override beats automatic routing", () => {
    clearModelRouterState()
    setTaskModelOverride("task-1", "worker")
    const decision = routeJarvisModel({
      taskId: "task-1",
      messages: [{ role: "user", content: "设计一个新产品方案" }],
      availableModels,
    })

    expect(decision.selectedRole).toBe("worker")
    expect(decision.reason).toContain("手动指定")
  })

  it("records model decision history by task", () => {
    clearModelRouterState()
    routeJarvisModel({
      taskId: "task-1",
      messages: [{ role: "user", content: "日常聊一下" }],
      availableModels,
    })
    routeJarvisModel({
      taskId: "task-2",
      messages: [{ role: "user", content: "帮我设计方案" }],
      availableModels,
    })

    expect(getModelDecisionHistory("task-1")).toHaveLength(1)
    expect(getModelDecisionHistory("task-2")).toHaveLength(1)
    expect(getModelDecisionHistory()).toHaveLength(2)
  })
})
