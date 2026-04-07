import type { TradeIntent } from "../lib/types";

/**
 * Result of checking TP/SL conditions on a position.
 */
export type TpSlCheckResult =
  | { triggered: true; status: "HIT_TP" | "HIT_SL"; reason: string }
  | { triggered: false };

/**
 * Pure function that checks whether a position's take-profit or stop-loss
 * has been hit given the current market price.
 *
 * For BUY positions:
 *   - price >= takeProfit → HIT_TP
 *   - price <= stopLoss   → HIT_SL
 *
 * For SELL positions (inverse):
 *   - price <= takeProfit → HIT_TP
 *   - price >= stopLoss   → HIT_SL
 *
 * This logic is extracted from useAgentDetail.ts for testability.
 */
export function checkTpSl(
  position: Pick<
    TradeIntent,
    | "side"
    | "asset"
    | "takeProfit"
    | "stopLoss"
    | "currentStopLoss"
    | "trailingStopActive"
  >,
  currentPrice: number,
): TpSlCheckResult {
  const activeStopLoss = position.currentStopLoss ?? position.stopLoss;

  if (position.side === "BUY") {
    if (position.takeProfit && currentPrice >= position.takeProfit) {
      return {
        triggered: true,
        status: "HIT_TP",
        reason: `Take-profit target reached for ${position.asset}.`,
      };
    }
    if (activeStopLoss && currentPrice <= activeStopLoss) {
      return {
        triggered: true,
        status: "HIT_SL",
        reason: `Stop-loss threshold reached for ${position.asset}.`,
      };
    }
  } else if (position.side === "SELL") {
    if (position.takeProfit && currentPrice <= position.takeProfit) {
      return {
        triggered: true,
        status: "HIT_TP",
        reason: `Take-profit target reached for ${position.asset}.`,
      };
    }
    if (activeStopLoss && currentPrice >= activeStopLoss) {
      return {
        triggered: true,
        status: "HIT_SL",
        reason: `Stop-loss threshold reached for ${position.asset}.`,
      };
    }
  }

  return { triggered: false };
}
