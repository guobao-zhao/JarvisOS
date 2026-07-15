import { describe, expect, it } from "bun:test"
import { join } from "node:path"
import { discoverGrowthSources } from "../ingestion"

const fixtureRoot = join(import.meta.dir, "../../fixtures/jarvis-assets")

describe("discoverGrowthSources", () => {
  it("discovers old Jarvis skills, rules and context docs without modifying them", async () => {
    const sources = await discoverGrowthSources({ sourceRoot: fixtureRoot, now: () => 123 })
    const paths = sources.map((source) => source.sourcePath).sort()

    expect(paths).toContain(".ai/rules/jarvis-rules.md")
    expect(paths).toContain(".ai/skills/read-skill/SKILL.md")
    expect(paths).toContain(".ai/skills/write-skill/SKILL.md")
    expect(paths).toContain("docs/context/working-memory.md")
    expect(sources.every((source) => source.sourceSystem === "jarvis")).toBe(true)
    expect(sources.every((source) => source.discoveredAt === 123)).toBe(true)
  })

  it("returns an empty list when sourceRoot does not exist", async () => {
    const sources = await discoverGrowthSources({ sourceRoot: join(fixtureRoot, "missing") })
    expect(sources).toEqual([])
  })
})
