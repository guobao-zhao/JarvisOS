import { describe, expect, it } from "bun:test"
import { classifyGrowthSource } from "../classifier"
import type { RawGrowthSource } from "../assets"

function source(sourcePath: string, content: string): RawGrowthSource {
  return {
    id: `source:${sourcePath}`,
    sourcePath,
    absolutePath: `/tmp/${sourcePath}`,
    sourceSystem: "jarvis",
    content,
    discoveredAt: 100,
  }
}

describe("classifyGrowthSource", () => {
  it("classifies read-only skills as low-risk capabilities", () => {
    const result = classifyGrowthSource(
      source(".ai/skills/prod-toca-wiki-reader/SKILL.md", "name: prod-toca-wiki-reader\ndescription: read TOCA Wiki pages"),
    )

    expect(result.asset.kind).toBe("capability")
    expect(result.asset.riskLevel).toBe("low")
    expect(result.capability?.sideEffects).toBe("external_read")
    expect(result.capability?.name).toBe("prod-toca-wiki-reader")
  })

  it("classifies writer skills as high-risk capabilities", () => {
    const result = classifyGrowthSource(
      source(".ai/skills/prod-toca-wiki-writer/SKILL.md", "publish_to_wiki.py writes pages and updates wiki"),
    )

    expect(result.asset.kind).toBe("capability")
    expect(result.asset.riskLevel).toBe("high")
    expect(result.capability?.sideEffects).toBe("external_write")
  })

  it("classifies rules as process assets", () => {
    const result = classifyGrowthSource(source(".ai/rules/jarvis-rules.md", "# Jarvis Rules\n只认 Jarvis flow-*"))
    expect(result.asset.kind).toBe("process")
    expect(result.asset.tags).toContain("rule")
  })

  it("classifies working memory as profile or knowledge", () => {
    const result = classifyGrowthSource(source("docs/context/working-memory.md", "# Working Memory\n宝哥偏好中文简短回复"))
    expect(["profile", "knowledge"]).toContain(result.asset.kind)
  })
})
