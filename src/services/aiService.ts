import { groqService } from "./groqService";
import { MarketData } from "./marketService";
import { AgentIdentity, AgentStrategyType, TradeIntent } from "../lib/types";
import { getStrategyBehavior, normalizeStrategyType } from "./trustArtifacts";

const ENGINE_LABEL = "GROQ_GPT_OSS_120B";

const ALLOCATION_PCT_BY_RISK = {
  conservative: 0.1,
  balanced: 0.25,
  aggressive: 0.4,
} as const;

const MINIMUM_TRADE_NOTIONAL = 50; // Don't trade less than $50

const TARGET_RULES = {
  conservative: { stopLossPct: 0.025, takeProfitPct: 0.05 },
  balanced: { stopLossPct: 0.04, takeProfitPct: 0.075 },
  aggressive: { stopLossPct: 0.06, takeProfitPct: 0.11 },
} as const;

type SupportedRiskProfile = keyof typeof ALLOCATION_PCT_BY_RISK;
type SupportedAsset = "BTC" | "ETH";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value: number, decimals = 4) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function getAssetMarketSnapshot(asset: SupportedAsset, marketData: MarketData) {
  return asset === "BTC" ? marketData.btc : marketData.eth;
}

function getPreferredSideForStrategy(
  strategy: string,
  asset: SupportedAsset,
  marketData: MarketData,
): "BUY" | "SELL" | "HOLD" {
  const normalizedStrategy = strategy.toLowerCase();
  const snapshot = getAssetMarketSnapshot(asset, marketData);
  const move = snapshot.change24h || 0;
  const volatility = Math.abs(move);

  if (normalizedStrategy === "risk_off") {
    return volatility > 1.8 || move < -0.9 ? "HOLD" : "BUY";
  }

  if (normalizedStrategy === "yield") {
    return volatility > 2.8 ? "HOLD" : "BUY";
  }

  if (normalizedStrategy === "momentum") {
    return move >= 0 ? "BUY" : "SELL";
  }

  if (normalizedStrategy === "mean_reversion") {
    return move >= 0 ? "SELL" : "BUY";
  }

  if (
    normalizedStrategy === "range_trading" ||
    normalizedStrategy === "market_making"
  ) {
    if (volatility < 0.6) return "BUY";
    return move > 0 ? "SELL" : "BUY";
  }

  if (normalizedStrategy === "spot_grid_bot") {
    return volatility <= 1.6 ? "BUY" : "HOLD";
  }

  if (normalizedStrategy === "arbitrage") {
    return volatility <= 1.1 ? "BUY" : "HOLD";
  }

  return move >= 0 ? "BUY" : "SELL";
}

function isStrategyConditionFavorable(
  strategy: string,
  asset: SupportedAsset,
  marketData: MarketData,
  activePositions: TradeIntent[],
) {
  const normalizedStrategy = strategy.toLowerCase();
  const snapshot = getAssetMarketSnapshot(asset, marketData);
  const move = snapshot.change24h || 0;
  const volatility = Math.abs(move);
  const hasSameAssetPosition = activePositions.some(
    (position) => position.asset === asset,
  );

  switch (normalizedStrategy) {
    case "range_trading":
      return volatility <= 2.2 && !hasSameAssetPosition;
    case "momentum":
      return volatility >= 0.65;
    case "mean_reversion":
      return volatility >= 1.2;
    case "arbitrage":
      return volatility <= 1.1 && !hasSameAssetPosition;
    case "yield":
      return volatility <= 2.4;
    case "market_making":
      return volatility <= 1.6 && !hasSameAssetPosition;
    case "spot_grid_bot":
      return volatility <= 1.8 && !hasSameAssetPosition;
    case "risk_off":
      return volatility <= 1.4 && move >= -0.75;
    default:
      return true;
  }
}

function scoreAssetForDecision(
  asset: SupportedAsset,
  strategy: string,
  side: "BUY" | "SELL",
  marketData: MarketData,
  activePositions: TradeIntent[],
) {
  const snapshot = getAssetMarketSnapshot(asset, marketData);
  const duplicatePenalty = activePositions.some(
    (position) => position.asset === asset,
  )
    ? 0.75
    : 0;
  const rawChange = snapshot.change24h || 0;
  const normalizedStrategy = strategy.toLowerCase();
  const volatility = Math.abs(rawChange);

  if (normalizedStrategy === "risk_off") {
    return (asset === "BTC" ? 0.6 : 0.15) - volatility * 0.9 - duplicatePenalty;
  }

  if (normalizedStrategy === "mean_reversion") {
    return (
      (side === "BUY" ? -rawChange : rawChange) +
      (volatility >= 1.2 ? 0.35 : -0.4) -
      duplicatePenalty
    );
  }

  if (
    normalizedStrategy === "range_trading" ||
    normalizedStrategy === "market_making"
  ) {
    return (
      -volatility * (normalizedStrategy === "market_making" ? 1.1 : 0.8) +
      (asset === "BTC" ? 0.22 : 0) +
      (rawChange < 0 ? 0.12 : 0) -
      duplicatePenalty
    );
  }

  if (normalizedStrategy === "spot_grid_bot") {
    return (
      (asset === "BTC" ? 0.28 : 0.18) - volatility * 1.05 - duplicatePenalty
    );
  }

  if (normalizedStrategy === "arbitrage") {
    return (
      (asset === "BTC" ? 0.2 : 0.05) - volatility * 1.15 - duplicatePenalty
    );
  }

  if (normalizedStrategy === "yield") {
    return (
      (asset === "ETH" ? 0.35 : 0.15) -
      Math.abs(rawChange * 0.45) -
      duplicatePenalty
    );
  }

  return (
    (side === "BUY" ? rawChange : -rawChange) +
    volatility * 0.15 -
    duplicatePenalty
  );
}

function chooseBestAsset(
  strategy: string,
  side: "BUY" | "SELL",
  marketData: MarketData,
  activePositions: TradeIntent[],
): SupportedAsset {
  const candidates: SupportedAsset[] = ["BTC", "ETH"];

  return candidates.sort(
    (left, right) =>
      scoreAssetForDecision(
        right,
        strategy,
        side,
        marketData,
        activePositions,
      ) -
      scoreAssetForDecision(left, strategy, side, marketData, activePositions),
  )[0];
}

export function normalizeTradeDecision(
  strategy: AgentStrategyType | string,
  riskProfile: string,
  marketData: MarketData,
  activePositions: TradeIntent[],
  rawDecision: Partial<TradeIntent>,
  validationScore = 50,
  availableCapital = 0,
  totalTreasury = 0,
): Partial<TradeIntent> {
  const strategyKey = normalizeStrategyType(strategy);
  const normalizedStrategy = strategyKey.toLowerCase();
  const behavior = getStrategyBehavior(strategyKey);

  // Requirement 4.8: spot_grid_bot always returns HOLD — grid execution is
  // handled by the Grid Bot service, not the AI trade cycle.
  if (normalizedStrategy === "spot_grid_bot") {
    const requestedAsset = rawDecision.asset?.toUpperCase() as
      | SupportedAsset
      | undefined;
    const asset: SupportedAsset =
      requestedAsset === "BTC" || requestedAsset === "ETH"
        ? requestedAsset
        : "BTC";
    return {
      ...rawDecision,
      side: "HOLD",
      asset,
      size: 0,
      capitalAllocated: 0,
      reason:
        rawDecision.reason ||
        "Grid bot execution is handled separately. The AI trade cycle stays in HOLD.",
    };
  }

  let side: "BUY" | "SELL" | "HOLD" =
    rawDecision.side === "SELL" || rawDecision.side === "BUY"
      ? rawDecision.side
      : "HOLD";

  const requestedAsset = rawDecision.asset?.toUpperCase() as
    | SupportedAsset
    | undefined;
  let asset: SupportedAsset =
    requestedAsset === "BTC" || requestedAsset === "ETH"
      ? requestedAsset
      : chooseBestAsset(
          strategy,
          side === "HOLD" ? "BUY" : side,
          marketData,
          activePositions,
        );

  const alternativeAsset: SupportedAsset = asset === "BTC" ? "ETH" : "BTC";
  const assetScore = scoreAssetForDecision(
    asset,
    strategy,
    side === "HOLD" ? "BUY" : side,
    marketData,
    activePositions,
  );
  const alternativeScore = scoreAssetForDecision(
    alternativeAsset,
    strategy,
    side === "HOLD" ? "BUY" : side,
    marketData,
    activePositions,
  );
  if (alternativeScore - assetScore >= 0.3) {
    asset = alternativeAsset;
  }

  const preferredSide = getPreferredSideForStrategy(
    strategy,
    asset,
    marketData,
  );
  if (side === "HOLD") {
    // Respect the AI's HOLD decision. The AI has full market context
    // and if it says don't trade, we don't override it.
    // The preferredSide is only used as a tiebreaker when the AI
    // doesn't have a strong opinion (system-level HOLDs from errors/rate limits
    // are already filtered out before reaching this function).
  }

  if (
    side === "HOLD" ||
    !isStrategyConditionFavorable(strategy, asset, marketData, activePositions)
  ) {
    return {
      ...rawDecision,
      side: "HOLD",
      asset,
      size: 0,
      capitalAllocated: 0,
      reason:
        rawDecision.reason ||
        `${behavior.preferredConditions} were not clear enough, so the agent stayed patient.`,
    };
  }

  const normalizedRiskProfile: SupportedRiskProfile =
    riskProfile === "conservative" || riskProfile === "aggressive"
      ? riskProfile
      : "balanced";

  const price = getAssetMarketSnapshot(asset, marketData).price || 1;
  const allocationPct = ALLOCATION_PCT_BY_RISK[normalizedRiskProfile];
  // Dynamic cap: percentage of total treasury, but never more than available capital
  const softNotionalCap =
    totalTreasury > 0
      ? Math.min(
          totalTreasury * allocationPct,
          availableCapital || totalTreasury * allocationPct,
        )
      : availableCapital > 0
        ? availableCapital * allocationPct
        : 2500; // Fallback only if both are 0 (shouldn't happen)
  // Minimum: $50 or 40% of cap, whichever is smaller (so tiny accounts can still trade)
  const minimumNotional = Math.min(
    MINIMUM_TRADE_NOTIONAL,
    softNotionalCap * 0.4,
  );
  const defaultNotional =
    softNotionalCap *
    (normalizedStrategy === "risk_off" ? 0.45 : 0.72) *
    behavior.sizeMultiplier;
  const requestedNotional =
    typeof rawDecision.capitalAllocated === "number" &&
    Number.isFinite(rawDecision.capitalAllocated)
      ? rawDecision.capitalAllocated
      : typeof rawDecision.size === "number" &&
          Number.isFinite(rawDecision.size)
        ? rawDecision.size * price
        : 0;
  // Confidence scaling: score 90+ gets up to 1.2x, score <40 gets 0.7x, 50 = 1.0x baseline
  const confidenceMultiplier = clamp(
    0.7 + (validationScore - 40) * 0.01,
    0.7,
    1.2,
  );
  const targetNotional = clamp(
    (requestedNotional || defaultNotional) *
      behavior.sizeMultiplier *
      confidenceMultiplier,
    minimumNotional * Math.max(0.6, behavior.sizeMultiplier),
    softNotionalCap,
  );
  const size = roundTo(targetNotional / price, 4);

  const targetRule = TARGET_RULES[normalizedRiskProfile];
  const stopLossPct = targetRule.stopLossPct * behavior.stopLossMultiplier;
  const takeProfitPct =
    targetRule.takeProfitPct * behavior.takeProfitMultiplier;
  const defaultStopLoss =
    side === "BUY" ? price * (1 - stopLossPct) : price * (1 + stopLossPct);
  const defaultTakeProfit =
    side === "BUY" ? price * (1 + takeProfitPct) : price * (1 - takeProfitPct);

  const stopLoss =
    typeof rawDecision.stopLoss === "number" &&
    (side === "BUY"
      ? rawDecision.stopLoss < price && rawDecision.stopLoss > price * 0.8
      : rawDecision.stopLoss > price && rawDecision.stopLoss < price * 1.2)
      ? rawDecision.stopLoss
      : roundTo(defaultStopLoss, 2);
  const takeProfit =
    typeof rawDecision.takeProfit === "number" &&
    (side === "BUY"
      ? rawDecision.takeProfit > price && rawDecision.takeProfit < price * 1.2
      : rawDecision.takeProfit < price && rawDecision.takeProfit > price * 0.8)
      ? rawDecision.takeProfit
      : roundTo(defaultTakeProfit, 2);

  // Validate limit order price
  const orderType = rawDecision.orderType === "LIMIT" ? "LIMIT" : "MARKET";
  let limitPrice: number | undefined;
  if (orderType === "LIMIT" && typeof rawDecision.limitPrice === "number") {
    const isValidLimit =
      side === "BUY"
        ? rawDecision.limitPrice < price && rawDecision.limitPrice > price * 0.9
        : rawDecision.limitPrice > price &&
          rawDecision.limitPrice < price * 1.1;
    limitPrice = isValidLimit ? roundTo(rawDecision.limitPrice, 2) : undefined;
  }

  return {
    ...rawDecision,
    side,
    asset,
    size,
    capitalAllocated: roundTo(targetNotional, 2),
    stopLoss,
    takeProfit,
    orderType: limitPrice ? "LIMIT" : "MARKET",
    limitPrice,
  };
}

export const aiService = {
  async processTradeCycle(
    agentId: string,
    strategy: string,
    riskProfile: string,
    marketData: MarketData,
    activePositions: TradeIntent[],
    availableCapital = 0,
    totalTreasury = 0,
  ): Promise<{
    decision: Partial<TradeIntent>;
    validation: { score: number; comment: string };
    engine: string;
    rawAiDecision?: {
      side: "BUY" | "SELL" | "HOLD";
      asset: string;
      reason?: string;
      score?: number;
    };
  }> {
    try {
      const result = await groqService.processTradeCycle(
        agentId,
        strategy,
        riskProfile,
        marketData,
        activePositions,
      );
      const rawSide =
        (result.decision.side as "BUY" | "SELL" | "HOLD") || "HOLD";
      const rawAsset = (result.decision.asset as string) || "BTC";

      // If the groq service returned a system-level HOLD (error/rate-limit/cooldown),
      // don't normalize it — pass through as-is to avoid overriding error HOLDs into trades
      const isSystemHold =
        rawSide === "HOLD" &&
        typeof result.validation?.comment === "string" &&
        result.validation.comment.startsWith("System:");

      if (isSystemHold) {
        return {
          ...result,
          engine: ENGINE_LABEL,
        };
      }

      return {
        ...result,
        decision: normalizeTradeDecision(
          strategy,
          riskProfile,
          marketData,
          activePositions,
          result.decision,
          result.validation?.score,
          availableCapital,
          totalTreasury,
        ),
        engine: ENGINE_LABEL,
        rawAiDecision: {
          side: rawSide,
          asset: rawAsset,
          reason: result.decision.reason as string | undefined,
          score: result.validation?.score,
        },
      };
    } catch (error: any) {
      if (error.message === "GROQ_API_KEY_MISSING") {
        return {
          decision: {
            side: "HOLD" as any,
            reason:
              "System: Groq API Key is missing in the server environment. Please configure it in the settings.",
            timestamp: Date.now(),
          },
          validation: {
            score: 0,
            comment: "System: AI Engine unavailable (Groq key missing).",
          },
          engine: "ERROR_NO_KEY",
        };
      }

      if (error.message === "GROQ_QUOTA_EXHAUSTED") {
        console.error("Groq quota exhausted.");
      } else {
        console.error("Groq failed:", error);
      }

      return {
        decision: {
          side: "HOLD" as any,
          reason: `System: Groq Engine error (${error.message || "Unknown"}). Position held for safety.`,
          timestamp: Date.now(),
        },
        validation: { score: 0, comment: "System: AI Engine error." },
        engine: "GROQ_ERROR",
      };
    }
  },

  getQuotaStatus() {
    return groqService.getQuotaStatus();
  },

  async reassessPosition(
    strategy: string,
    riskProfile: string,
    marketData: MarketData,
    position: TradeIntent,
  ) {
    return groqService.reassessPosition(
      strategy,
      riskProfile,
      marketData,
      position,
    );
  },

  resetQuota() {
    groqService.resetQuota();
  },
};
