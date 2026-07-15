import type { GrowthReport } from "./assets"

export function createGrowthNextActions(report: Pick<GrowthReport, "totals">): readonly string[] {
  const actions: string[] = []
  if (report.totals.promotionReady > 0) actions.push(`评审 ${report.totals.promotionReady} 个可晋升候选能力。`)
  if (report.totals.highRisk > 0) actions.push(`人工检查 ${report.totals.highRisk} 个高风险资产，禁止自动启用。`)
  if (report.totals.sandboxFailed > 0) actions.push(`复盘 ${report.totals.sandboxFailed} 个沙箱失败资产。`)
  if (actions.length === 0) actions.push("继续摄取更多旧 Jarvis 资产，扩大成长样本。")
  return actions
}
