import { describe, expect, it } from "bun:test"
import { classifyGrowthSource } from "../classifier"
import { runStaticSandbox } from "../sandbox"
import type { RawGrowthSource } from "../assets"

function source(sourcePath: string, content: string): RawGrowthSource {
  return { id: `source:${sourcePath}`, sourcePath, absolutePath: `/tmp/${sourcePath}`, sourceSystem: "jarvis", content, discoveredAt: 1 }
}

describe("runStaticSandbox", () => {
  it("passes low-risk read-only capabilities", () => {
    const item = classifyGrowthSource(source(".ai/skills/prod-toca-wiki-reader/SKILL.md", "description: read wiki pages"))
    const result = runStaticSandbox(item, () => 10)

    expect(result.passed).toBe(true)
    expect(result.blocked).toBe(false)
    expect(result.level).toBe("S0")
  })

  it("blocks external-write capabilities", () => {
    const item = classifyGrowthSource(source(".ai/skills/prod-toca-wiki-writer/SKILL.md", "publish pages to external wiki"))
    const result = runStaticSandbox(item, () => 10)

    expect(result.passed).toBe(false)
    expect(result.blocked).toBe(true)
    expect(result.reasons.join(" ")).toContain("external_write")
  })
})
