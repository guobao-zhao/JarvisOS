import { describe, expect, it } from "bun:test"
import { buildMigrationMemoryDocument, previewJarvisMigrationManifest } from "./jarvis-migration-manifest"

describe("Jarvis migration manifest", () => {
  it("previews only phase 1 manifest candidates with project-scoped metadata", async () => {
    const preview = previewJarvisMigrationManifest("/old/Jarvis")

    expect(preview.candidates.length).toBe(21)
    expect(preview.candidates.every((candidate) => candidate.tags.includes("migration"))).toBe(true)

    const multiPrice = preview.candidates.find((candidate) =>
      candidate.relativePath === "docs/projects/jproduct-service/knowledge/price/multi-price.md"
    )

    expect(multiPrice).toMatchObject({
      sourcePath: "/old/Jarvis/docs/projects/jproduct-service/knowledge/price/multi-price.md",
      source: "insight",
      kind: "knowledge",
      project: "jproduct-service",
      domain: "price",
      topic: "multi-price",
      verification: "unverified",
      risk: "medium",
    })
    expect(multiPrice?.tags).toContain("project:jproduct-service")
    expect(multiPrice?.tags).toContain("domain:price")
    expect(multiPrice?.tags).toContain("verified:false")
    expect(multiPrice?.tags).toContain("source-path:docs/projects/jproduct-service/knowledge/price/multi-price.md")
  })

  it("wraps migrated content with a Chinese metadata header", async () => {
    const preview = previewJarvisMigrationManifest("/old/Jarvis")
    const candidate = preview.candidates.find((item) => item.topic === "multi-price")

    expect(candidate).toBeDefined()

    const doc = buildMigrationMemoryDocument(candidate!, "# 原文标题\n\n业务规则正文", 123)

    expect(doc.id).toBe("migration:old-jarvis:docs/projects/jproduct-service/knowledge/price/multi-price.md")
    expect(doc.title).toBe("jproduct-service / multi-price")
    expect(doc.source).toBe("insight")
    expect(doc.createdAt).toBe(123)
    expect(doc.relations).toContain("project:jproduct-service")
    expect(doc.content).toContain("## 迁移元数据")
    expect(doc.content).toContain("- 来源项目：jproduct-service")
    expect(doc.content).toContain("- 知识领域：price")
    expect(doc.content).toContain("- 验证状态：unverified")
    expect(doc.content).toContain("- 旧路径：docs/projects/jproduct-service/knowledge/price/multi-price.md")
    expect(doc.content).toContain("## 原始内容")
    expect(doc.content).toContain("业务规则正文")
  })
})
