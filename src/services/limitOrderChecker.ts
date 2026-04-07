import type { TradeIntent, AgentStrategyType } from "../lib/types";
import { getExecutionProfile } from "./trustArtifacts";

/**
 * Result of checking a pending limit order against current conditions.
 */
export type LimitOrderCheckResult =
  | { action: "FILL"; reason: string }
  | { action: "EXPIRE"; reason: string }
  | { action: "CANCEL_CAP_BREACH"; reason: string }
  | { action: "KEEP"; reason: string };

/**
 * Pure function that evaluates a pending limit order against current market
 * conditions, time, position cap, and duplicate exposure.
 *
 * Encapsulates the limit order lifecycle logic from useAgentDetail.ts:
 * - PENDING → EXECUTED when price reaches limitPrice
 * - PENDING → CANCELLED when expired (2x maxHoldMinutes)
 * - PENDING → CANCELLED when position cap full or duplicate exposure
 */
export function checkLimitOrder(
  order: Pick<
    TradeIntent,
    | "side"
    | "asset"
    | "limitPrice"
    | "expiresAt"
    | "status"
    | "capitalAllocated"
  >,
  currentPrice: number,
  now: number,
  activePositionCount: number,
  maxOpenPositions: number,
  hasDuplicateExposure: boolean,
): LimitOrderCheckResult {
  // Check expiry first
  if (order.expiresAt && now >= order.expiresAt) {
    return {
      action: "EXPIRE",
      reason: `Limit ${order.side} order for ${order.asset} at ${order.limitPrice?.toFixed(2)} expired without being filled.`,
    };
  }

  // Check if limit price is hit
  const limitPrice = order.limitPrice || 0;
  const shouldFill =
    order.side === "BUY"
      ? currentPrice <= limitPrice
      : currentPrice >= limitPrice;

  if (shouldFill && limitPrice > 0) {
    // Before filling, check position cap and duplicate exposure
    if (activePositionCount >= maxOpenPositions || hasDuplicateExposure) {
      const reason = hasDuplicateExposure
        ? `Limit ${order.side} ${order.asset} order cancelled — duplicate exposure already exists.`
        : `Limit ${order.side} ${order.asset} order cancelled — position cap (${maxOpenPositions}) already reached.`;
      return { action: "CANCEL_CAP_BREACH", reason };
    }
    return {
      action: "FILL",
      reason: `Limit ${order.side} order filled at ${currentPrice.toFixed(2)} (limit: ${limitPrice.toFixed(2)}).`,
    };
  }

  return { action: "KEEP", reason: "Order still pending." };
}

/**
 * Computes the expiry timestamp for a limit order based on strategy.
 * Expiry = 2x maxHoldMinutes (or 240 minutes fallback).
 */
export function computeLimitOrderExpiry(
  strategyType: AgentStrategyType,
  createdAt: number,
): number {
  const profile = getExecutionProfile(strategyType);
  const expiryMinutes = profile.maxHoldMinutes * 2 || 240;
  return createdAt + expiryMinutes * 60_000;
}
