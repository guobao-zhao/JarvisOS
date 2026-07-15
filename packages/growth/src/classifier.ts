import type { CapabilityProfile, CapabilitySideEffect, GrowthAsset, GrowthAssetKind, GrowthRiskLevel, RawGrowthSource } from "./assets"

export interface ClassifiedGrowthAsset {
  readonly asset: GrowthAsset
  readonly capability?: CapabilityProfile
}

function extractName(source: RawGrowthSource): string {
  const nameMatch = source.content.match(/^name:\s*([^\n]+)/m)
  if (nameMatch?.[1]) return nameMatch[1].trim()
  const segments = source.sourcePath.split("/")
  if (source.sourcePath.endsWith("/SKILL.md") && segments.length >= 3) return segments[segments.length - 2] ?? source.sourcePath
  return segments.at(-1)?.replace(/\.[^.]+$/, "") ?? source.sourcePath
}

function summarize(content: string): string {
  const description = content.match(/^description:\s*([^\n]+)/m)?.[1]?.trim()
  if (description) return description
  const firstTextLine = content
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("---") && !line.startsWith("#"))
  return firstTextLine ?? "Jarvis asset"
}

function detectSideEffects(source: RawGrowthSource): CapabilitySideEffect {
  const haystack = `${source.sourcePath}\n${source.content}`.toLowerCase()
  if (/writer|write|writes|publish|push|send|delete|remove|credential|cookie|vault|上传|写入|发布|推送|删除|凭据/.test(haystack)) {
    return "external_write"
  }
  if (/query|reader|read|search|lookup|analyzer|inspection|sql|读取|查询|分析/.test(haystack)) return "external_read"
  return "none"
}

function riskForSideEffect(sideEffects: CapabilitySideEffect): GrowthRiskLevel {
  if (sideEffects === "external_write") return "high"
  if (sideEffects === "local_write") return "medium"
  return "low"
}

function classifyKind(source: RawGrowthSource): GrowthAssetKind {
  const path = source.sourcePath
  const content = source.content.toLowerCase()
  if (path.includes("/.ai/skills/") || path.startsWith(".ai/skills/")) return "capability"
  if (path.includes("credential") || content.includes("credential") || content.includes("cookie")) return "credential_reference"
  if (path.startsWith(".ai/rules/")) return "process"
  if (path.includes("template")) return "template"
  if (content.includes("偏好") || content.includes("宝哥") || content.includes("profile")) return "profile"
  return "knowledge"
}

function tagsFor(source: RawGrowthSource, kind: GrowthAssetKind, sideEffects?: CapabilitySideEffect): string[] {
  const tags = new Set<string>([kind])
  if (source.sourcePath.endsWith("SKILL.md")) tags.add("skill")
  if (source.sourcePath.startsWith(".ai/rules/")) tags.add("rule")
  if (source.sourcePath.startsWith("docs/context/")) tags.add("context")
  if (source.sourcePath.startsWith("docs/projects/")) tags.add("project-knowledge")
  if (sideEffects) tags.add(sideEffects.replace("_", "-"))
  return Array.from(tags)
}

export function classifyGrowthSource(source: RawGrowthSource): ClassifiedGrowthAsset {
  const kind = classifyKind(source)
  const title = extractName(source)
  const sideEffects = kind === "capability" ? detectSideEffects(source) : undefined
  const riskLevel = sideEffects ? riskForSideEffect(sideEffects) : kind === "credential_reference" ? "high" : "low"
  const now = source.discoveredAt

  const asset: GrowthAsset = {
    id: `asset:${kind}:${title}`,
    sourcePath: source.sourcePath,
    sourceSystem: source.sourceSystem,
    kind,
    title,
    summary: summarize(source.content),
    tags: tagsFor(source, kind, sideEffects),
    riskLevel,
    status: "classified",
    createdAt: now,
    updatedAt: now,
  }

  if (kind !== "capability" || !sideEffects) return { asset }

  return {
    asset,
    capability: {
      assetId: asset.id,
      name: title,
      triggerExamples: [title, asset.summary],
      dependencies: [],
      sideEffects,
    },
  }
}

export function classifyGrowthSources(sources: readonly RawGrowthSource[]): readonly ClassifiedGrowthAsset[] {
  return sources.map(classifyGrowthSource)
}
