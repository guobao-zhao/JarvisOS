import { describe, expect, it } from "bun:test"
import { createToolRegistry } from "../registry"

describe("ToolRegistry", () => {
  it("registers, lists and executes a tool", async () => {
    const registry = createToolRegistry()
    registry.register({
      definition: {
        name: "echo",
        description: "echo tool",
        inputSchema: { type: "object" },
      },
      skillName: "test",
      handler: async (args) => ({ ok: true, value: args }),
    })

    expect(registry.list()).toHaveLength(1)

    const result = await registry.execute("echo", { hello: "world" })
    expect(result.ok).toBe(true)
    expect(result.value).toEqual({ hello: "world" })
  })

  it("returns error for unknown tool", async () => {
    const registry = createToolRegistry()
    const result = await registry.execute("missing", {})
    expect(result.ok).toBe(false)
  })

  it("records usage metrics", async () => {
    const registry = createToolRegistry()
    registry.register({
      definition: {
        name: "ok_tool",
        description: "always ok",
        inputSchema: { type: "object" },
      },
      skillName: "test",
      handler: async () => ({ ok: true, value: "ok" }),
    })

    await registry.execute("ok_tool", {})
    registry.recordUsage("ok_tool", "hit")

    const metrics = registry.getUsageMetrics()
    const metric = metrics.get("formal:ok_tool")
    expect(metric).toBeDefined()
    expect(metric!.callCount).toBe(2)
    expect(metric!.hitCount).toBe(2)
  })

  it("keeps candidate tools out of the promoted tool list", async () => {
    const registry = createToolRegistry()
    registry.registerCandidate({
      definition: {
        name: "candidate_echo",
        description: "candidate echo",
        inputSchema: { type: "object" },
      },
      skillName: "growth-candidate",
      handler: async (args) => ({ ok: true, value: args }),
    })

    expect(registry.list()).toHaveLength(0)
    expect(registry.listCandidates()).toHaveLength(1)

    const missing = await registry.execute("candidate_echo", { hello: "world" })
    expect(missing.ok).toBe(false)

    const result = await registry.executeCandidate("candidate_echo", { hello: "world" })
    expect(result.ok).toBe(true)
    expect(result.value).toEqual({ hello: "world" })
  })

  it("keeps formal and candidate metrics separate when names collide", async () => {
    const registry = createToolRegistry()
    registry.register({
      definition: {
        name: "echo",
        description: "formal echo",
        inputSchema: { type: "object" },
      },
      skillName: "formal-skill",
      handler: async () => ({ ok: true, value: "formal" }),
    })
    registry.registerCandidate({
      definition: {
        name: "echo",
        description: "candidate echo",
        inputSchema: { type: "object" },
      },
      skillName: "candidate-skill",
      handler: async () => ({ ok: false, error: "candidate miss" }),
    })

    await registry.execute("echo", {})
    await registry.executeCandidate("echo", {})

    const metrics = registry.getUsageMetrics()
    expect(metrics.get("formal:echo")?.namespace).toBe("formal")
    expect(metrics.get("formal:echo")?.skillName).toBe("formal-skill")
    expect(metrics.get("formal:echo")?.hitCount).toBe(1)
    expect(metrics.get("formal:echo")?.missCount).toBe(0)
    expect(metrics.get("candidate:echo")?.namespace).toBe("candidate")
    expect(metrics.get("candidate:echo")?.skillName).toBe("candidate-skill")
    expect(metrics.get("candidate:echo")?.hitCount).toBe(0)
    expect(metrics.get("candidate:echo")?.missCount).toBe(1)
  })

  it("records explicit candidate usage without polluting formal metrics", () => {
    const registry = createToolRegistry()
    registry.register({
      definition: {
        name: "search",
        description: "formal search",
        inputSchema: { type: "object" },
      },
      skillName: "formal-search",
      handler: async () => ({ ok: true }),
    })
    registry.registerCandidate({
      definition: {
        name: "search",
        description: "candidate search",
        inputSchema: { type: "object" },
      },
      skillName: "candidate-search",
      handler: async () => ({ ok: true }),
    })

    registry.recordUsage("search", "hit", "candidate")

    const metrics = registry.getUsageMetrics()
    expect(metrics.get("candidate:search")?.callCount).toBe(1)
    expect(metrics.get("candidate:search")?.hitCount).toBe(1)
    expect(metrics.get("formal:search")).toBeUndefined()
  })
})
