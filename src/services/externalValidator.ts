import { TradeIntent } from '../lib/types';

export type ExternalValidation = {
  validator: 'RULE_ENGINE_V1';
  score: number;
  verdict: 'AGREE' | 'DISAGREE' | 'CAUTION';
  reasons: string[];
};

/**
 * Rule-based external validator that provides a second opinion on trade intents.
 * This breaks the circular "AI validates its own trades" pattern by applying
 * deterministic rules independent of the AI's reasoning.
 */
export function externalValidate(intent: TradeIntent, recentIntents: TradeIntent[]): ExternalValidation {
  const reasons: string[] = [];
  let score = 70; // baseline

  // Rule 1: Capital utilization check
  const utilPct = intent.riskCheck?.capitalUtilizationPct ?? 0;
  if (utilPct > 30) {
    score -= 10;
    reasons.push(`High capital utilization at ${utilPct.toFixed(0)}% — single trade uses over 30% of treasury.`);
  } else if (utilPct <= 15) {
    score += 5;
    reasons.push('Conservative position sizing — under 15% capital utilization.');
  }

  // Rule 2: Stop loss distance
  if (intent.entryPrice && intent.stopLoss && intent.entryPrice > 0) {
    const slDistance = Math.abs(intent.entryPrice - intent.stopLoss) / intent.entryPrice * 100;
    if (slDistance > 8) {
      score -= 8;
      reasons.push(`Wide stop loss at ${slDistance.toFixed(1)}% from entry — risk per trade is elevated.`);
    } else if (slDistance < 1) {
      score -= 5;
      reasons.push(`Stop loss too tight at ${slDistance.toFixed(1)}% — likely to get stopped out by noise.`);
    } else {
      score += 5;
      reasons.push(`Stop loss at ${slDistance.toFixed(1)}% from entry — reasonable risk band.`);
    }
  }

  // Rule 3: Risk/reward ratio
  if (intent.entryPrice && intent.stopLoss && intent.takeProfit) {
    const risk = Math.abs(intent.entryPrice - intent.stopLoss);
    const reward = Math.abs(intent.takeProfit - intent.entryPrice);
    if (risk > 0) {
      const rr = reward / risk;
      if (rr < 1) {
        score -= 10;
        reasons.push(`Poor risk/reward ratio of ${rr.toFixed(2)}:1 — reward doesn't justify the risk.`);
      } else if (rr >= 2) {
        score += 8;
        reasons.push(`Strong risk/reward ratio of ${rr.toFixed(2)}:1.`);
      } else {
        score += 3;
        reasons.push(`Acceptable risk/reward ratio of ${rr.toFixed(2)}:1.`);
      }
    }
  }

  // Rule 4: Overtrading check — too many trades in recent window
  const recentWindow = 10 * 60 * 1000; // 10 minutes
  const recentCount = recentIntents.filter(i =>
    i.artifactType === 'TRADE_INTENT' && i.timestamp > (intent.timestamp - recentWindow)
  ).length;
  if (recentCount > 3) {
    score -= 8;
    reasons.push(`Overtrading detected — ${recentCount} entries in the last 10 minutes.`);
  }

  // Rule 5: Consecutive losses check
  const recentClosed = recentIntents
    .filter(i => (i.status === 'CLOSED' || i.status === 'HIT_SL') && i.execution?.realizedPnl != null)
    .slice(0, 5);
  const consecutiveLosses = recentClosed.findIndex(i => (i.execution?.realizedPnl ?? 0) >= 0);
  const lossStreak = consecutiveLosses === -1 ? recentClosed.length : consecutiveLosses;
  if (lossStreak >= 3) {
    score -= 12;
    reasons.push(`${lossStreak} consecutive losses — external validator recommends caution.`);
  }

  // Rule 6: Drawdown context
  if (intent.capitalAvailableBefore && intent.capitalAvailableAfter) {
    const drawdownFromTrade = ((intent.capitalAvailableBefore - intent.capitalAvailableAfter) / intent.capitalAvailableBefore) * 100;
    if (drawdownFromTrade > 5) {
      score -= 5;
      reasons.push(`This trade commits ${drawdownFromTrade.toFixed(1)}% of available capital.`);
    }
  }

  // Rule 7: AI self-validation agreement check
  const aiScore = intent.validation?.score ?? 0;
  if (aiScore > 90 && score < 60) {
    reasons.push('AI gave high confidence but external rules flag concerns — divergence detected.');
  } else if (aiScore < 50 && score > 80) {
    reasons.push('AI was uncertain but external rules see no issues — possible AI over-caution.');
  }

  score = Math.max(0, Math.min(100, score));

  const verdict: ExternalValidation['verdict'] =
    score >= 70 ? 'AGREE' : score >= 50 ? 'CAUTION' : 'DISAGREE';

  if (reasons.length === 0) {
    reasons.push('No significant rule violations detected.');
  }

  return { validator: 'RULE_ENGINE_V1', score, verdict, reasons };
}
