/**
 * Signal validation logic extracted from server.ts for testability.
 * Used by the /api/signals route handler.
 */

export interface RawSignal {
  symbol: string;
  side: "LONG" | "SHORT";
  orderType: "MARKET" | "LIMIT";
  entry: number;
  stopLoss: number;
  targets: number[];
  riskReward: string;
  confidence: number;
  timeframe: "SCALP" | "SWING" | "POSITION";
  reasoning: string;
}

const MIN_RISK_REWARD = 1.5;

/**
 * Validate a single trading signal.
 * Returns the validated signal with recalculated riskReward, or null if invalid.
 *
 * Validation rules (from server.ts):
 * - entry > 0, stopLoss > 0
 * - targets non-empty
 * - stopLoss on correct side (LONG: stopLoss < entry, SHORT: stopLoss > entry)
 * - Each target within 50% of entry price
 * - After filtering targets, at least one must remain
 * - Last target must be on correct side of entry
 * - stopLoss within 15% of entry and >= 0.1% of entry
 * - risk-reward ratio >= 1.5
 * - Recalculate riskReward string as "1:{ratio}"
 */
export function validateSignal(signal: RawSignal): RawSignal | null {
  if (signal.entry <= 0 || signal.stopLoss <= 0) return null;
  if (signal.targets.length === 0) return null;

  // Validate stop-loss is on the correct side
  if (signal.side === "LONG" && signal.stopLoss >= signal.entry) return null;
  if (signal.side === "SHORT" && signal.stopLoss <= signal.entry) return null;

  // Filter out garbage targets — each target must be within 50% of entry price
  const filteredTargets = signal.targets.filter(
    (t: number) => t > signal.entry * 0.5 && t < signal.entry * 1.5,
  );
  if (filteredTargets.length === 0) return null;

  // Validate last target is on the correct side
  const lastTarget = filteredTargets[filteredTargets.length - 1];
  if (signal.side === "LONG" && lastTarget <= signal.entry) return null;
  if (signal.side === "SHORT" && lastTarget >= signal.entry) return null;

  // Stop-loss must be within 15% of entry (not absurdly far) and >= 0.1%
  const slDistance = Math.abs(signal.entry - signal.stopLoss) / signal.entry;
  if (slDistance > 0.15 || slDistance < 0.001) return null;

  // Check minimum risk-reward ratio
  const risk = Math.abs(signal.entry - signal.stopLoss);
  const reward = Math.abs(lastTarget - signal.entry);
  if (risk <= 0 || reward / risk < MIN_RISK_REWARD) return null;

  // Recalculate the actual risk-reward string
  const riskReward = `1:${(reward / risk).toFixed(1)}`;

  return {
    ...signal,
    targets: filteredTargets,
    riskReward,
  };
}
