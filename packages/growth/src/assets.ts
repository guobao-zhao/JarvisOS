export type GrowthAssetKind =
  | "capability"
  | "profile"
  | "process"
  | "knowledge"
  | "template"
  | "credential_reference"

export type GrowthAssetStatus =
  | "discovered"
  | "classified"
  | "sandbox_ready"
  | "sandbox_passed"
  | "sandbox_failed"
  | "promotion_ready"
  | "promoted"
  | "rejected"

export type GrowthRiskLevel = "low" | "medium" | "high"

export type CapabilitySideEffect = "none" | "local_write" | "external_read" | "external_write"

export interface RawGrowthSource {
  readonly id: string
  readonly sourcePath: string
  readonly absolutePath: string
  readonly sourceSystem: "jarvis"
  readonly content: string
  readonly discoveredAt: number
}

export interface GrowthAsset {
  readonly id: string
  readonly sourcePath: string
  readonly sourceSystem: "jarvis"
  readonly kind: GrowthAssetKind
  readonly title: string
  readonly summary: string
  readonly tags: readonly string[]
  readonly riskLevel: GrowthRiskLevel
  readonly status: GrowthAssetStatus
  readonly createdAt: number
  readonly updatedAt: number
}

export interface CapabilityProfile {
  readonly assetId: string
  readonly name: string
  readonly triggerExamples: readonly string[]
  readonly inputSchema?: unknown
  readonly outputSchema?: unknown
  readonly dependencies: readonly string[]
  readonly sideEffects: CapabilitySideEffect
  readonly sandboxCommand?: string
  readonly promotedToolName?: string
}

export interface SandboxResult {
  readonly assetId: string
  readonly level: "S0"
  readonly passed: boolean
  readonly blocked: boolean
  readonly reasons: readonly string[]
  readonly checkedAt: number
}

export interface GrowthScore {
  readonly assetId: string
  readonly usability: number
  readonly reliability: number
  readonly value: number
  readonly risk: number
  readonly maturity: number
  readonly evidence: readonly string[]
  readonly evaluatedAt: number
}

export interface PromotionSuggestion {
  readonly assetId: string
  readonly title: string
  readonly recommended: boolean
  readonly reason: string
  readonly risk: string
  readonly action: string
}

export interface PromotionDecision {
  readonly assetId: string
  readonly approved: boolean
  readonly decidedAt: number
  readonly promotedToolName?: string
  readonly reason: string
}

export interface GrowthReportTotals {
  readonly discovered: number
  readonly classified: number
  readonly sandboxPassed: number
  readonly sandboxFailed: number
  readonly promotionReady: number
  readonly highRisk: number
}

export interface GrowthProfile {
  readonly focusAreas: readonly string[]
  readonly safeCapabilityCount: number
  readonly highRiskCount: number
  readonly promotionReadyCount: number
}

export interface GrowthReminder {
  readonly id: string
  readonly level: "info" | "warning"
  readonly title: string
  readonly message: string
}

export interface DecisionChallenge {
  readonly id: string
  readonly title: string
  readonly question: string
  readonly evidence: readonly string[]
}

export interface GrowthReport {
  readonly generatedAt: number
  readonly sourceRoot: string
  readonly totals: GrowthReportTotals
  readonly assets: readonly GrowthAsset[]
  readonly scores: readonly GrowthScore[]
  readonly suggestions: readonly PromotionSuggestion[]
  readonly risks: readonly string[]
  readonly nextActions: readonly string[]
  readonly profile?: GrowthProfile
  readonly reminders?: readonly GrowthReminder[]
  readonly challenges?: readonly DecisionChallenge[]
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function calculateMaturity(input: Pick<GrowthScore, "usability" | "reliability" | "value" | "risk">): number {
  const usability = clampScore(input.usability)
  const reliability = clampScore(input.reliability)
  const value = clampScore(input.value)
  const risk = clampScore(input.risk)
  return clampScore(usability * 0.3 + reliability * 0.3 + value * 0.3 + (100 - risk) * 0.1)
}

export function isHighRiskAsset(asset: Pick<GrowthAsset, "riskLevel">): boolean {
  return asset.riskLevel === "high"
}
