import type { DecisionChallenge, GrowthReport } from "./assets"

export function createDecisionChallenges(report: GrowthReport): DecisionChallenge[] {
  const challenges: DecisionChallenge[] = []
  const risky = report.suggestions.filter((suggestion) => suggestion.risk.includes("高风险"))
  if (risky.length > 0) {
    challenges.push({
      id: "growth-risk-boundary",
      title: "Risk boundary check",
      question: "Should these high-risk capabilities remain outside the formal Tools registry until they have explicit safety wrappers?",
      evidence: risky.slice(0, 3).map((suggestion) => `${suggestion.title}: ${suggestion.risk}`),
    })
  }

  const ready = report.suggestions.filter((suggestion) => suggestion.recommended)
  if (ready.length >= 3) {
    challenges.push({
      id: "growth-promotion-batch-size",
      title: "Promotion batch size check",
      question: "Should promotion happen one capability at a time instead of approving the full batch?",
      evidence: ready.slice(0, 5).map((suggestion) => suggestion.title),
    })
  }

  return challenges
}
