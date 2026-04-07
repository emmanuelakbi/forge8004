import type { TradeIntent, AgentIdentity } from "../lib/types";
import {
  getTrailingDistancePct,
  getTrailingStopFloor,
  getCurrentStopLoss,
  getUnrealizedPnlPct,
  getProfitProtectedAmount,
  TRAILING_PROFIT_TRIGGER_PCT,
} from "./trustArtifacts";

/**
 * Result of evaluating trailing stop logic on a position.
 */
export type TrailingStopResult =
  | {
      action: "ACTIVATE";
      trailingStopActive: true;
      currentStopLoss: number;
      peakFavorablePrice: number;
      profitProtected: number;
    }
  | {
      action: "RAISE";
      trailingStopActive: true;
      currentStopLoss: number;
      peakFavorablePrice: number;
      profitProtected: number;
    }
  | {
      action: "CLOSE";
      trailingStopActive: true;
      currentStopLoss: number;
      peakFavorablePrice: number;
      profitProtected: number;
      exitPrice: number;
    }
  | {
      action: "HOLD";
      trailingStopActive: boolean;
      currentStopLoss: number | undefined;
      peakFavorablePrice: number | undefined;
      profitProtected: number;
    };

/**
 * Pure function that evaluates trailing stop logic for an open position.
 *
 * Encapsulates the trailing stop lifecycle from useAgentDetail.ts:
 * 1. Activates when unrealized PnL % >= TRAILING_PROFIT_TRIGGER_PCT * 100
 * 2. Tracks peakFavorablePrice and updates currentStopLoss to trail it
 * 3. Closes position when price crosses the trailing stop level
 */
export function evaluateTrailingStop(
  position: TradeIntent,
  currentPrice: number,
  strategyType: AgentIdentity["strategyType"],
  riskProfile: AgentIdentity["riskProfile"],
): TrailingStopResult {
  const thresholdPct = TRAILING_PROFIT_TRIGGER_PCT * 100;
  const unrealizedPnlPct = getUnrealizedPnlPct(position, currentPrice);
  const previousStop = getCurrentStopLoss(position);

  if (unrealizedPnlPct >= thresholdPct && currentPrice > 0) {
    // Compute new peak and trailing stop
    const priorPeak =
      typeof position.peakFavorablePrice === "number"
        ? position.peakFavorablePrice
        : position.entryPrice || currentPrice;
    const nextPeak =
      position.side === "SELL"
        ? Math.min(priorPeak, currentPrice)
        : Math.max(priorPeak, currentPrice);

    const distancePct = getTrailingDistancePct(strategyType, riskProfile);
    const rawCandidateStop =
      position.side === "SELL"
        ? nextPeak * (1 + distancePct)
        : nextPeak * (1 - distancePct);
    const stopFloor = getTrailingStopFloor(position);
    const candidateStop =
      position.side === "SELL"
        ? Math.min(rawCandidateStop, stopFloor)
        : Math.max(rawCandidateStop, stopFloor);

    let newStopLoss: number;
    if (typeof previousStop === "number") {
      newStopLoss =
        position.side === "SELL"
          ? Math.min(previousStop, candidateStop)
          : Math.max(previousStop, candidateStop);
    } else {
      newStopLoss = candidateStop;
    }

    // Build updated position to compute profitProtected
    const updatedPosition: TradeIntent = {
      ...position,
      trailingStopActive: true,
      peakFavorablePrice: nextPeak,
      currentStopLoss: newStopLoss,
    };
    const profitProtected = getProfitProtectedAmount(updatedPosition);

    // Check if price has crossed the trailing stop
    const activeStopLoss = newStopLoss;
    const isCrossed =
      position.side === "BUY"
        ? currentPrice <= activeStopLoss
        : currentPrice >= activeStopLoss;

    if (isCrossed) {
      return {
        action: "CLOSE",
        trailingStopActive: true,
        currentStopLoss: newStopLoss,
        peakFavorablePrice: nextPeak,
        profitProtected,
        exitPrice: currentPrice,
      };
    }

    const wasAlreadyActive = position.trailingStopActive === true;
    const stopChanged = newStopLoss !== previousStop;

    if (!wasAlreadyActive) {
      return {
        action: "ACTIVATE" as const,
        trailingStopActive: true as const,
        currentStopLoss: newStopLoss,
        peakFavorablePrice: nextPeak,
        profitProtected,
      };
    }
    if (stopChanged) {
      return {
        action: "RAISE" as const,
        trailingStopActive: true as const,
        currentStopLoss: newStopLoss,
        peakFavorablePrice: nextPeak,
        profitProtected,
      };
    }
    return {
      action: "HOLD" as const,
      trailingStopActive: true,
      currentStopLoss: newStopLoss,
      peakFavorablePrice: nextPeak,
      profitProtected,
    };
  }

  // Not profitable enough — keep existing state
  return {
    action: "HOLD",
    trailingStopActive: position.trailingStopActive || false,
    currentStopLoss: previousStop,
    peakFavorablePrice: position.peakFavorablePrice || position.entryPrice,
    profitProtected: position.profitProtected || 0,
  };
}
