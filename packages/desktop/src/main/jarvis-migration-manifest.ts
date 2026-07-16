import { basename, resolve } from "node:path"
import type { MemoryDocument } from "../preload/types"
import type { JarvisMigrationCandidate, JarvisMigrationPreview } from "../preload/types"

type MigrationManifestItem = {
  relativePath: string
  source: MemoryDocument["source"]
  kind: JarvisMigrationCandidate["kind"]
  project?: string
  domain?: string
  topic?: string
  verification: JarvisMigrationCandidate["verification"]
  risk: JarvisMigrationCandidate["risk"]
  action: string
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined
}

const PHASE1_MANIFEST: MigrationManifestItem[] = [
  {
    relativePath: "docs/projects/jproduct-service/knowledge/price/multi-price.md",
    source: "insight",
    kind: "knowledge",
    project: "jproduct-service",
    domain: "price",
    topic: "multi-price",
    verification: "unverified",
    risk: "medium",
    action: "import as project-scoped unverified knowledge",
  },
  {
    relativePath: "docs/projects/jproduct-service/knowledge/price/multi-price-product-main.md",
    source: "insight",
    kind: "knowledge",
    project: "jproduct-service",
    domain: "price",
    topic: "multi-price-product-main",
    verification: "unverified",
    risk: "medium",
    action: "import as project-scoped unverified knowledge",
  },
  {
    relativePath: "docs/projects/jproduct-service/knowledge/price/reflection-rules.md",
    source: "insight",
    kind: "knowledge",
    project: "jproduct-service",
    domain: "price",
    topic: "reflection-rules",
    verification: "unverified",
    risk: "medium",
    action: "import as project-scoped unverified knowledge",
  },
  {
    relativePath: "docs/projects/jproduct-service/knowledge/inventory/multiday-inventory-landing.md",
    source: "insight",
    kind: "knowledge",
    project: "jproduct-service",
    domain: "inventory",
    topic: "multiday-inventory-landing",
    verification: "unverified",
    risk: "medium",
    action: "import as project-scoped unverified knowledge",
  },
  {
    relativePath: "docs/projects/jproduct-core-api/knowledge/order/multi-product-inventory.md",
    source: "insight",
    kind: "knowledge",
    project: "jproduct-core-api",
    domain: "order",
    topic: "multi-product-inventory",
    verification: "unverified",
    risk: "medium",
    action: "import as project-scoped unverified knowledge",
  },
  {
    relativePath: "docs/projects/suishouji/knowledge/ai-provider/api-connection.md",
    source: "insight",
    kind: "knowledge",
    project: "suishouji",
    domain: "ai-provider",
    topic: "api-connection",
    verification: "unverified",
    risk: "low",
    action: "import as project-scoped unverified knowledge",
  },
  {
    relativePath: ".ai/skills/standard-flow/SKILL.md",
    source: "growth",
    kind: "skill",
    domain: "workflow",
    topic: "standard-flow",
    verification: "needs_review",
    risk: "high",
    action: "import as disabled skill metadata",
  },
  {
    relativePath: ".ai/skills/flow-gate/SKILL.md",
    source: "growth",
    kind: "skill",
    domain: "workflow",
    topic: "flow-gate",
    verification: "needs_review",
    risk: "high",
    action: "import as disabled skill metadata",
  },
  {
    relativePath: ".ai/skills/flow-clarify/SKILL.md",
    source: "growth",
    kind: "skill",
    domain: "workflow",
    topic: "flow-clarify",
    verification: "needs_review",
    risk: "high",
    action: "import as disabled skill metadata",
  },
  {
    relativePath: ".ai/skills/flow-design/SKILL.md",
    source: "growth",
    kind: "skill",
    domain: "workflow",
    topic: "flow-design",
    verification: "needs_review",
    risk: "high",
    action: "import as disabled skill metadata",
  },
  {
    relativePath: ".ai/skills/flow-code/SKILL.md",
    source: "growth",
    kind: "skill",
    domain: "workflow",
    topic: "flow-code",
    verification: "needs_review",
    risk: "high",
    action: "import as disabled skill metadata",
  },
  {
    relativePath: ".ai/skills/project-router/SKILL.md",
    source: "growth",
    kind: "skill",
    domain: "routing",
    topic: "project-router",
    verification: "needs_review",
    risk: "medium",
    action: "import as routing metadata",
  },
  {
    relativePath: ".ai/skills/knowledge-base-load/SKILL.md",
    source: "growth",
    kind: "skill",
    domain: "memory",
    topic: "knowledge-base-load",
    verification: "needs_review",
    risk: "medium",
    action: "import as disabled skill metadata",
  },
  {
    relativePath: ".ai/skills/knowledge-base-update/SKILL.md",
    source: "growth",
    kind: "skill",
    domain: "memory",
    topic: "knowledge-base-update",
    verification: "needs_review",
    risk: "medium",
    action: "import as disabled skill metadata",
  },
  {
    relativePath: ".ai/skills/ask-memory/SKILL.md",
    source: "growth",
    kind: "skill",
    domain: "memory",
    topic: "ask-memory",
    verification: "needs_review",
    risk: "medium",
    action: "import as disabled skill metadata",
  },
  {
    relativePath: ".ai/skills/credential-vault/SKILL.md",
    source: "growth",
    kind: "skill",
    domain: "security",
    topic: "credential-vault",
    verification: "needs_review",
    risk: "high",
    action: "import interface only, no credentials",
  },
  {
    relativePath: ".kimi/mcp-configs/claude-mcp-servers.json",
    source: "growth",
    kind: "mcp",
    domain: "mcp",
    topic: "claude-mcp-servers",
    verification: "needs_review",
    risk: "high",
    action: "import sanitized capability summary only",
  },
  {
    relativePath: ".ai/rules/jarvis-rules.md",
    source: "user_manual",
    kind: "governance",
    domain: "governance",
    topic: "jarvis-rules",
    verification: "needs_review",
    risk: "high",
    action: "import as governance reference",
  },
  {
    relativePath: ".ai/rules/dev-workflow.md",
    source: "user_manual",
    kind: "governance",
    domain: "workflow",
    topic: "dev-workflow",
    verification: "needs_review",
    risk: "high",
    action: "import as workflow reference",
  },
  {
    relativePath: "docs/projects/registry.md",
    source: "insight",
    kind: "routing",
    domain: "routing",
    topic: "projects-registry",
    verification: "needs_review",
    risk: "low",
    action: "import as routing knowledge",
  },
  {
    relativePath: "docs/souls/jarvis-soul.md",
    source: "user_manual",
    kind: "identity",
    domain: "identity",
    topic: "jarvis-soul",
    verification: "needs_review",
    risk: "medium",
    action: "import as identity memory",
  },
]

function tagsForItem(item: MigrationManifestItem): string[] {
  return [
    "migration",
    "source:old-jarvis",
    `kind:${item.kind}`,
    `verified:${item.verification === "verified" ? "true" : "false"}`,
    `verification:${item.verification}`,
    `risk:${item.risk}`,
    `action:${item.action.replaceAll(" ", "-")}`,
    item.project ? `project:${item.project}` : undefined,
    item.domain ? `domain:${item.domain}` : undefined,
    item.topic ? `topic:${item.topic}` : undefined,
    `source-path:${item.relativePath}`,
  ].filter(isDefined)
}

function toCandidate(root: string, item: MigrationManifestItem): JarvisMigrationCandidate {
  return {
    sourcePath: resolve(root, item.relativePath),
    relativePath: item.relativePath,
    title: item.topic ?? basename(item.relativePath, ".md"),
    source: item.source,
    tags: tagsForItem(item),
    kind: item.kind,
    project: item.project,
    domain: item.domain,
    topic: item.topic,
    verification: item.verification,
    risk: item.risk,
    action: item.action,
  }
}

export function previewJarvisMigrationManifest(root: string): JarvisMigrationPreview {
  return {
    root,
    candidates: PHASE1_MANIFEST.map((item) => toCandidate(root, item)),
    skipped: [],
  }
}

export function buildMigrationMemoryDocument(
  candidate: JarvisMigrationCandidate,
  rawContent: string,
  now = Date.now(),
): MemoryDocument {
  const metadata = [
    `迁移类型：${candidate.kind}`,
    candidate.project ? `来源项目：${candidate.project}` : undefined,
    candidate.domain ? `知识领域：${candidate.domain}` : undefined,
    candidate.topic ? `主题：${candidate.topic}` : undefined,
    `验证状态：${candidate.verification}`,
    `风险等级：${candidate.risk}`,
    `迁移动作：${candidate.action}`,
    `旧路径：${candidate.relativePath}`,
  ].filter(isDefined).map((line) => `- ${line}`).join("\n")

  return {
    id: `migration:old-jarvis:${candidate.relativePath}`,
    source: candidate.source,
    title: candidate.project ? `${candidate.project} / ${candidate.title}` : candidate.title,
    content: `# ${candidate.title}\n\n## 迁移元数据\n\n${metadata}\n\n## 原始内容\n\n${rawContent.trim()}\n`,
    tags: candidate.tags,
    createdAt: now,
    updatedAt: now,
    relations: [
      `source-path:${candidate.relativePath}`,
      candidate.project ? `project:${candidate.project}` : undefined,
      candidate.domain ? `domain:${candidate.domain}` : undefined,
    ].filter(isDefined),
  }
}
