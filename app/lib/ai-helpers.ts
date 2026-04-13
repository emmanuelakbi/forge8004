import { VALID_SIDES, VALID_ASSETS, NOTIONAL_GUIDE_BY_RISK } from "./constants";

/**
 * Compute the dynamic notional cap for a trade cycle.
 * Formula: max(50, min(treasury * allocationPct, availableCapital))
 * Falls back to NOTIONAL_GUIDE_BY_RISK if treasury is not provided.
 */
export function computeDynamicNotionalCap(
  totalTreasury: number | undefined,
  availableCapital: number | undefined,
  riskProfile: "conservative" | "balanced" | "aggressive",
): number {
  const allocationPct =
    riskProfile === "conservative"
      ? 0.1
      : riskProfile === "aggressive"
        ? 0.4
        : 0.25;

  const dynamicNotionalCap =
    typeof totalTreasury === "number" && totalTreasury > 0
      ? Math.min(
          totalTreasury * allocationPct,
          typeof availableCapital === "number" && availableCapital > 0
            ? availableCapital
            : totalTreasury * allocationPct,
        )
      : NOTIONAL_GUIDE_BY_RISK[riskProfile];

  return Math.max(50, dynamicNotionalCap);
}

/**
 * Sanitize a reassess-position AI response.
 * action → "KEEP" or "CLOSE" (default "KEEP")
 * confidence → clamped [0, 100] (default 50)
 * reason → truncated to 500 chars (default "Reassessment completed.")
 */
export function sanitizeReassessResponse(parsed: any): {
  action: "KEEP" | "CLOSE";
  confidence: number;
  reason: string;
} {
  const action =
    typeof parsed?.action === "string" &&
    parsed.action.toUpperCase() === "CLOSE"
      ? ("CLOSE" as const)
      : ("KEEP" as const);
  const confidence =
    typeof parsed?.confidence === "number"
      ? Math.min(100, Math.max(0, parsed.confidence))
      : 50;
  const reason =
    typeof parsed?.reason === "string"
      ? parsed.reason.slice(0, 500)
      : "Reassessment completed.";
  return { action, confidence, reason };
}

/**
 * Validate and clamp a grid advisory range.
 * Returns undefined for both low/high if range is invalid (low >= high or doesn't contain price).
 * Clamps to maxPct (0.03 for BTC, 0.04 for ETH) around current price.
 */
export function validateAndClampGridRange(
  rangeLow: number | undefined,
  rangeHigh: number | undefined,
  currentPrice: number,
  asset: "BTC" | "ETH",
): { rangeLow: number | undefined; rangeHigh: number | undefined } {
  let low = typeof rangeLow === "number" && rangeLow > 0 ? rangeLow : undefined;
  let high =
    typeof rangeHigh === "number" && rangeHigh > 0 ? rangeHigh : undefined;

  // Sanity: range must have low < high and contain current price
  if (low !== undefined && high !== undefined) {
    if (
      low >= high ||
      (currentPrice > 0 && (low > currentPrice || high < currentPrice))
    ) {
      return { rangeLow: undefined, rangeHigh: undefined };
    }
  }

  // Clamp range to max percentage around current price
  if (low !== undefined && high !== undefined && currentPrice > 0) {
    const maxPct = asset === "BTC" ? 0.03 : 0.04;
    const minLow = currentPrice * (1 - maxPct);
    const maxHigh = currentPrice * (1 + maxPct);
    low = Math.max(low, minLow);
    high = Math.min(high, maxHigh);
  }

  return { rangeLow: low, rangeHigh: high };
}

export function cleanAiJsonResponse(content: string): string {
  let cleaned = content.trim();
  if (cleaned.includes("```json")) {
    cleaned = cleaned.split("```json")[1].split("```")[0].trim();
  } else if (cleaned.includes("```")) {
    cleaned = cleaned.split("```")[1].split("```")[0].trim();
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned;
}

export function validateAiTradeResponse(result: any): {
  valid: boolean;
  sanitized: any;
} {
  if (!result || typeof result !== "object")
    return { valid: false, sanitized: null };
  const d = result.decision;
  const v = result.validation;
  if (!d || typeof d !== "object" || !v || typeof v !== "object")
    return { valid: false, sanitized: null };

  const side = typeof d.side === "string" ? d.side.toUpperCase() : "HOLD";
  if (!VALID_SIDES.has(side)) return { valid: false, sanitized: null };

  const asset = typeof d.asset === "string" ? d.asset.toUpperCase() : "BTC";
  const score =
    typeof v.score === "number" && v.score >= 0 && v.score <= 100
      ? v.score
      : 50;

  return {
    valid: true,
    sanitized: {
      decision: {
        side,
        asset: VALID_ASSETS.has(asset) ? asset : "BTC",
        size:
          typeof d.size === "number" && Number.isFinite(d.size)
            ? d.size
            : undefined,
        stopLoss:
          typeof d.stopLoss === "number" && Number.isFinite(d.stopLoss)
            ? d.stopLoss
            : undefined,
        takeProfit:
          typeof d.takeProfit === "number" && Number.isFinite(d.takeProfit)
            ? d.takeProfit
            : undefined,
        orderType:
          typeof d.orderType === "string" &&
          d.orderType.toUpperCase() === "LIMIT"
            ? "LIMIT"
            : "MARKET",
        limitPrice:
          typeof d.limitPrice === "number" && Number.isFinite(d.limitPrice)
            ? d.limitPrice
            : undefined,
        reason:
          typeof d.reason === "string"
            ? d.reason.slice(0, 500)
            : "No rationale provided.",
      },
      validation: {
        score,
        comment:
          typeof v.comment === "string"
            ? v.comment.slice(0, 300)
            : "Validation recorded.",
      },
    },
  };
}

/** Build a multi-timeframe market summary string for AI prompts */
export function buildMarketPromptBlock(marketData: any): string {
  const btcInd = marketData._indicators?.btc;
  const ethInd = marketData._indicators?.eth;

  let block = `Market Data:
              - BTC: ${marketData.btc.price} (24h Change: ${marketData.btc.change24h}%)`;
  if (btcInd) {
    block += ` | Vol: ${(btcInd.volume24h / 1e9).toFixed(1)}B`;
    if (btcInd.rsi14 != null) block += ` | RSI(14): ${btcInd.rsi14}`;
  }
  block += `\n              - ETH: ${marketData.eth.price} (24h Change: ${marketData.eth.change24h}%)`;
  if (ethInd) {
    block += ` | Vol: ${(ethInd.volume24h / 1e9).toFixed(1)}B`;
    if (ethInd.rsi14 != null) block += ` | RSI(14): ${ethInd.rsi14}`;
  }

  // Multi-timeframe support/resistance levels
  if (btcInd?.levels) {
    block += `\n\n              BTC Multi-Timeframe Levels:`;
    for (const tf of ["5m", "15m", "1h"] as const) {
      const l = btcInd.levels[tf];
      if (l)
        block += `\n              - ${tf.toUpperCase()}: Support ${l.support?.toFixed(0) ?? "N/A"} | Resistance ${l.resistance?.toFixed(0) ?? "N/A"}`;
    }
  }
  if (ethInd?.levels) {
    block += `\n              ETH Multi-Timeframe Levels:`;
    for (const tf of ["5m", "15m", "1h"] as const) {
      const l = ethInd.levels[tf];
      if (l)
        block += `\n              - ${tf.toUpperCase()}: Support ${l.support?.toFixed(0) ?? "N/A"} | Resistance ${l.resistance?.toFixed(0) ?? "N/A"}`;
    }
  }

  // Recent 5M candles (last 5 for context)
  if (btcInd?.candles?.["5m"]?.length > 0) {
    const recent = btcInd.candles["5m"].slice(-5);
    block += `\n\n              BTC Recent 5M Candles: ${recent.map((c: any) => `[O:${c.open.toFixed(0)} H:${c.high.toFixed(0)} L:${c.low.toFixed(0)} C:${c.close.toFixed(0)}]`).join(" ")}`;
  }
  if (ethInd?.candles?.["5m"]?.length > 0) {
    const recent = ethInd.candles["5m"].slice(-5);
    block += `\n              ETH Recent 5M Candles: ${recent.map((c: any) => `[O:${c.open.toFixed(0)} H:${c.high.toFixed(0)} L:${c.low.toFixed(0)} C:${c.close.toFixed(0)}]`).join(" ")}`;
  }

  return block;
}
