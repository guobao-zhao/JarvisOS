import { describe, expect, it } from "bun:test"
import { classifyGrowthSource } from "../classifier"
import { evaluateGrowthAsset } from "../evaluator"
import { runStaticSandbox } from "../sandbox"
import type { RawGrowthSource } from "../assets"

function source(sourcePath: string, content: string): RawGrowthSource {
  return { id: `source:${sourcePath}`, sourcePath, absolutePath: `/tmp/${sourcePath}`, sourceSystem: "jarvis", content, discoveredAt: 1 }
}

describe("evaluateGrowthAsset", () => {
  it("scores a read-only skill as promotion-capable", () => {
    const item = classifyGrowthSource(source(".ai/skills/prod-toca-wiki-reader/SKILL.md", "description: read wiki pages"))
    const sandbox = runStaticSandbox(item, () => 10)
    const score = evaluateGrowthAsset(item, sandbox, () => 11)

    expect(score.maturity).toBeGreaterThanOrEqual(60)
    expect(score.evidence).toContain("static sandbox passed")
  })

  it("penalizes blocked high-risk capabilities", () => {
    const item = classifyGrowthSource(source(".ai/skills/prod-toca-wiki-writer/SKILL.md", "publish pages to external wiki"))
    const sandbox = runStaticSandbox(item, () => 10)
    const score = evaluateGrowthAsset(item, sandbox, () => 11)

    expect(score.maturity).toBeLessThan(60)
    expect(score.evidence).toContain("sandbox blocked")
  })
})
