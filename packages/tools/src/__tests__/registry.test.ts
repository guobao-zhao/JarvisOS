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
    const metric = metrics.get("ok_tool")
    expect(metric).toBeDefined()
    expect(metric!.callCount).toBe(2)
    expect(metric!.hitCount).toBe(2)
  })
})
