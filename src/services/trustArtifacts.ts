import {
  AgentCheckpoint,
  AggregatedAgentView,
  AgentIdentity,
  AgentStrategyType,
  TradeIntent,
} from "../lib/types";
import { CONFIG } from "../lib/config";

export const TRAILING_PROFIT_TRIGGER_PCT = 0.01;

const POLICY_BY_RISK: Record<
  AgentIdentity["riskProfile"],
  {
    allocationPct: number;
    dailyLossLimitPct: number;
    leverageCap: number;
    maxOpenPositions: number;
    killSwitchDrawdownPct: number;
  }
> = {
  conservative: {
    allocationPct: 0.1,
    dailyLossLimitPct: 0.03,
    leverageCap: 1,
    maxOpenPositions: 2,
    killSwitchDrawdownPct: 8,
  },
  balanced: {
    allocationPct: 0.25,
    dailyLossLimitPct: 0.05,
    leverageCap: 1,
    maxOpenPositions: 2,
    killSwitchDrawdownPct: 12,
  },
  aggressive: {
    allocationPct: 0.4,
    dailyLossLimitPct: 0.08,
    leverageCap: 1,
    maxOpenPositions: 3,
    killSwitchDrawdownPct: 18,
  },
};

const EXECUTION_PROFILE_BY_STRATEGY: Record<
  AgentStrategyType,
  {
    label: "SCALP" | "INTRADAY" | "SWING" | "GRID";
    timeframeLabel: "5M" | "15M" | "4H" | "RANGE";
    decisionCadenceMinutes: number;
    maxHoldMinutes: number;
    description: string;
  }
> = {
  arbitrage: {
    label: "SCALP",
    timeframeLabel: "5M",
    decisionCadenceMinutes: 2,
    maxHoldMinutes: 60,
    description:
      "Low-volatility scalp with short holds, fast checks, and tight risk windows.",
  },
  range_trading: {
    label: "SCALP",
    timeframeLabel: "5M",
    decisionCadenceMinutes: 3,
    maxHoldMinutes: 120,
    description:
      "Range-biased entries on the 5M timeframe that need time to reach the other side of the range before review.",
  },
  spot_grid_bot: {
    label: "GRID",
    timeframeLabel: "RANGE",
    decisionCadenceMinutes: 2,
    maxHoldMinutes: 0,
    description:
      "A real spot grid ladder that manages multiple buy and sell levels inside a bounded range.",
  },
  market_making: {
    label: "SCALP",
    timeframeLabel: "5M",
    decisionCadenceMinutes: 2,
    maxHoldMinutes: 60,
    description:
      "Spread-biased entries with quick reviews and tighter, shorter-lived opportunities.",
  },
  mean_reversion: {
    label: "INTRADAY",
    timeframeLabel: "15M",
    decisionCadenceMinutes: 5,
    maxHoldMinutes: 240,
    description:
      "Mid-session setups that can breathe longer before they are forced to exit.",
  },
  momentum: {
    label: "INTRADAY",
    timeframeLabel: "15M",
    decisionCadenceMinutes: 5,
    maxHoldMinutes: 360,
    description:
      "Trend-following ideas reviewed often enough to react within the trading day.",
  },
  risk_off: {
    label: "SWING",
    timeframeLabel: "4H",
    decisionCadenceMinutes: 15,
    maxHoldMinutes: 1440,
    description:
      "Slower posture with longer holds and a calmer review cadence.",
  },
  yield: {
    label: "SWING",
    timeframeLabel: "4H",
    decisionCadenceMinutes: 15,
    maxHoldMinutes: 1440,
    description:
      "Patient accumulation style that favors longer holds and fewer position changes.",
  },
};

export type StrategyBehavior = {
  entryBias:
    | "range"
    | "trend"
    | "fade"
    | "micro"
    | "carry"
    | "liquidity"
    | "defensive";
  holdBias: number;
  sizeMultiplier: number;
  trailingTightness: number;
  reassessmentThreshold: number;
  preferredConditions: string;
  takeProfitMultiplier: number;
  stopLossMultiplier: number;
};

const STRATEGY_BEHAVIOR_BY_STRATEGY: Record<
  AgentStrategyType,
  StrategyBehavior
> = {
  range_trading: {
    entryBias: "range",
    holdBias: 0.78,
    sizeMultiplier: 0.72,
    trailingTightness: 0.82,
    reassessmentThreshold: 68,
    preferredConditions: "calm or range-bound markets with modest moves",
    takeProfitMultiplier: 0.88,
    stopLossMultiplier: 0.82,
  },
  momentum: {
    entryBias: "trend",
    holdBias: 0.84,
    sizeMultiplier: 1.08,
    trailingTightness: 0.45,
    reassessmentThreshold: 68,
    preferredConditions: "clear directional moves with follow-through",
    takeProfitMultiplier: 1.18,
    stopLossMultiplier: 1.05,
  },
  mean_reversion: {
    entryBias: "fade",
    holdBias: 0.72,
    sizeMultiplier: 0.9,
    trailingTightness: 0.88,
    reassessmentThreshold: 68,
    preferredConditions: "extended moves that look overstretched",
    takeProfitMultiplier: 0.95,
    stopLossMultiplier: 0.9,
  },
  arbitrage: {
    entryBias: "micro",
    holdBias: 0.55,
    sizeMultiplier: 0.45,
    trailingTightness: 0.92,
    reassessmentThreshold: 72,
    preferredConditions: "small, low-risk dislocations with very short holds",
    takeProfitMultiplier: 0.7,
    stopLossMultiplier: 0.7,
  },
  yield: {
    entryBias: "carry",
    holdBias: 0.88,
    sizeMultiplier: 0.58,
    trailingTightness: 0.4,
    reassessmentThreshold: 66,
    preferredConditions:
      "calmer markets where patience matters more than turnover",
    takeProfitMultiplier: 1.15,
    stopLossMultiplier: 1.05,
  },
  market_making: {
    entryBias: "liquidity",
    holdBias: 0.75,
    sizeMultiplier: 0.62,
    trailingTightness: 0.86,
    reassessmentThreshold: 70,
    preferredConditions:
      "low-volatility conditions with less directional chasing",
    takeProfitMultiplier: 0.78,
    stopLossMultiplier: 0.78,
  },
  risk_off: {
    entryBias: "defensive",
    holdBias: 0.9,
    sizeMultiplier: 0.42,
    trailingTightness: 0.72,
    reassessmentThreshold: 64,
    preferredConditions: "safer moments where preserving capital matters most",
    takeProfitMultiplier: 0.92,
    stopLossMultiplier: 0.72,
  },
  spot_grid_bot: {
    entryBias: "range",
    holdBias: 0.92,
    sizeMultiplier: 0.55,
    trailingTightness: 0.9,
    reassessmentThreshold: 72,
    preferredConditions:
      "bounded spot ranges where repeated ladder fills can harvest smaller moves",
    takeProfitMultiplier: 0.7,
    stopLossMultiplier: 0.65,
  },
};

export function normalizeStrategyType(
  strategyType?: string,
): AgentStrategyType {
  if (strategyType === "range_trading") return "range_trading";
  if (strategyType === "grid_trading") return "spot_grid_bot";
  if (strategyType === "spot_grid_bot") return "spot_grid_bot";
  if (strategyType === "momentum") return "momentum";
  if (strategyType === "mean_reversion") return "mean_reversion";
  if (strategyType === "arbitrage") return "arbitrage";
  if (strategyType === "yield") return "yield";
  if (strategyType === "market_making") return "market_making";
  if (strategyType === "risk_off") return "risk_off";
  return "momentum";
}

export function getExecutionProfile(
  strategyType: AgentIdentity["strategyType"],
) {
  return (
    EXECUTION_PROFILE_BY_STRATEGY[strategyType] ||
    EXECUTION_PROFILE_BY_STRATEGY.momentum
  );
}

export function getStrategyBehavior(
  strategyType: AgentIdentity["strategyType"],
) {
  return (
    STRATEGY_BEHAVIOR_BY_STRATEGY[strategyType] ||
    STRATEGY_BEHAVIOR_BY_STRATEGY.momentum
  );
}

export function createIntentId(agentId: string, timestamp: number) {
  return `intent_${agentId}_${timestamp.toString(36)}`;
}

function hashToHex(input: string, targetLength = 64) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  let hex = "";
  let seed = hash >>> 0;
  while (hex.length < targetLength) {
    seed = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
    hex += seed.toString(16).padStart(8, "0");
  }

  return hex.slice(0, targetLength);
}

export function deriveSandboxWallet(ownerSeed: string, agentId: string) {
  return `0x${hashToHex(`${ownerSeed}:${agentId}`, 40)}`;
}

export function getAgentExecutionWallet(identity: AgentIdentity) {
  return (
    identity.agentWallet ||
    deriveSandboxWallet(identity.owner, identity.agentId)
  );
}

export function createIntentNonce(timestamp: number) {
  return `nonce_${timestamp.toString(36)}`;
}

export function createSequencedIntentNonce(counter: number) {
  const suffix = Math.random().toString(36).slice(2, 6);
  return `nonce_${counter.toString().padStart(6, "0")}_${suffix}`;
}

export function parseIntentNonceCounter(nonce?: string) {
  if (!nonce) return null;
  const match = nonce.match(/^nonce_(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

export function createIntentEnvelope(
  identity: AgentIdentity,
  intent: TradeIntent,
) {
  const agentWallet = getAgentExecutionWallet(identity);
  const intentId =
    intent.intentId || createIntentId(identity.agentId, intent.timestamp);
  const nonce = intent.nonce || createIntentNonce(intent.timestamp);
  const chainId = intent.chainId || CONFIG.CHAIN_ID;

  const typedIntent = {
    primaryType: "TradeIntent" as const,
    domain: {
      name: "Forge8004",
      version: "1",
      chainId,
      verifyingContract: CONFIG.REGISTRIES.RISK_ROUTER,
    },
    message: {
      intentId,
      agentId: identity.agentId,
      agentWallet,
      side: intent.side,
      asset: intent.asset,
      size: intent.size,
      capitalAllocated: intent.capitalAllocated || 0,
      stopLoss: intent.stopLoss || 0,
      takeProfit: intent.takeProfit || 0,
      timestamp: intent.timestamp,
      nonce,
    },
  };

  return {
    nonce,
    chainId,
    signer: {
      owner: identity.owner,
      agentWallet,
      mode: "SIMULATED_EIP712" as const,
      verification: "EIP1271_READY" as const,
    },
    typedIntent,
  };
}

export function createSignedIntentMetadata(
  identity: AgentIdentity,
  intent: TradeIntent,
) {
  const envelope = createIntentEnvelope(identity, intent);
  const digest = `0x${hashToHex(JSON.stringify(envelope.typedIntent), 64)}`;
  const value = `0x${hashToHex(`${digest}:${envelope.signer.agentWallet}`, 130)}`;

  return {
    ...envelope,
    signature: {
      status: "SIMULATED_SIGNED" as const,
      scheme: "EIP-712" as const,
      digest,
      value,
    },
  };
}

export function getRiskPolicy(
  riskProfile: AgentIdentity["riskProfile"],
  totalTreasury: number,
) {
  const profile = POLICY_BY_RISK[riskProfile] || POLICY_BY_RISK.balanced;
  const maxAllocationNotional =
    totalTreasury > 0 ? totalTreasury * profile.allocationPct : 0;

  return {
    allocationPct: profile.allocationPct,
    maxAllocationNotional,
    dailyLossLimitPct: profile.dailyLossLimitPct,
    leverageCap: profile.leverageCap,
    maxOpenPositions: profile.maxOpenPositions,
    killSwitchDrawdownPct: profile.killSwitchDrawdownPct,
    allowedAssets: ["BTC", "ETH"],
    executionMode: "SPOT_SANDBOX" as const,
  };
}

export function getCurrentStopLoss(position: Partial<TradeIntent>) {
  if (typeof position.currentStopLoss === "number")
    return position.currentStopLoss;
  if (typeof position.initialStopLoss === "number")
    return position.initialStopLoss;
  return position.stopLoss;
}

export function getUnrealizedPnlPct(
  position: Partial<TradeIntent>,
  markPrice: number,
) {
  const entryPrice = position.entryPrice;
  if (!entryPrice || entryPrice <= 0 || !markPrice || markPrice <= 0) return 0;

  return position.side === "SELL"
    ? ((entryPrice - markPrice) / entryPrice) * 100
    : ((markPrice - entryPrice) / entryPrice) * 100;
}

export function getTrailingDistancePct(
  strategyType: AgentIdentity["strategyType"],
  riskProfile: AgentIdentity["riskProfile"],
) {
  const behavior = getStrategyBehavior(strategyType);
  const baseDistanceByRisk = {
    conservative: 0.009,
    balanced: 0.011,
    aggressive: 0.013,
  } as const;

  const baseDistance =
    baseDistanceByRisk[riskProfile] || baseDistanceByRisk.balanced;
  const adjustedDistance = baseDistance * (1.2 - behavior.trailingTightness);
  return Math.min(0.018, Math.max(0.0035, adjustedDistance));
}

export function getTrailingStopFloor(position: TradeIntent) {
  if (!position.entryPrice)
    return (
      position.currentStopLoss ||
      position.initialStopLoss ||
      position.stopLoss ||
      0
    );

  const entryFloor =
    position.side === "SELL"
      ? position.entryPrice * (1 - 0.0015)
      : position.entryPrice * (1 + 0.0015);

  // Never set the trailing floor tighter than the initial stop loss
  const initialSL = position.initialStopLoss || position.stopLoss || entryFloor;
  return position.side === "SELL"
    ? Math.min(entryFloor, initialSL)
    : Math.max(entryFloor, initialSL);
}

export function getProfitProtectedAmount(position: TradeIntent) {
  const protectedPrice = getCurrentStopLoss(position);
  if (!protectedPrice || !position.entryPrice) return 0;
  return Math.max(0, calculateTradePnl(position, protectedPrice));
}

export function calculateTradePnl(
  position: Partial<TradeIntent>,
  exitPrice: number,
) {
  const entryPrice = position.entryPrice;
  if (!entryPrice || entryPrice <= 0 || !exitPrice || exitPrice <= 0) return 0;
  const size = position.size || 0;
  const notional = size * entryPrice;
  const diff =
    position.side === "SELL" ? entryPrice - exitPrice : exitPrice - entryPrice;

  return (diff / entryPrice) * notional;
}

export function getDailyRealizedLoss(intents: TradeIntent[], now = Date.now()) {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const windowStart = dayStart.getTime();

  return intents.reduce((total, intent) => {
    if (
      intent.artifactType === "POSITION_CLOSE" &&
      intent.execution?.settlement === "CLOSE_POSITION" &&
      intent.timestamp >= windowStart
    ) {
      const realizedPnl = intent.execution.realizedPnl || 0;
      return realizedPnl < 0 ? total + Math.abs(realizedPnl) : total;
    }

    return total;
  }, 0);
}

export function getDailyRealizedProfit(
  intents: TradeIntent[],
  now = Date.now(),
) {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const windowStart = dayStart.getTime();

  return intents.reduce((total, intent) => {
    if (
      intent.artifactType === "POSITION_CLOSE" &&
      intent.execution?.settlement === "CLOSE_POSITION" &&
      intent.timestamp >= windowStart
    ) {
      const realizedPnl = intent.execution.realizedPnl || 0;
      return realizedPnl > 0 ? total + realizedPnl : total;
    }

    return total;
  }, 0);
}

export function getAllTimeRealizedProfit(intents: TradeIntent[]) {
  return intents.reduce((total, intent) => {
    if (
      intent.artifactType === "POSITION_CLOSE" &&
      intent.execution?.settlement === "CLOSE_POSITION"
    ) {
      const realizedPnl = intent.execution.realizedPnl || 0;
      return realizedPnl > 0 ? total + realizedPnl : total;
    }

    return total;
  }, 0);
}

export function getAllTimeRealizedLoss(intents: TradeIntent[]) {
  return intents.reduce((total, intent) => {
    if (
      intent.artifactType === "POSITION_CLOSE" &&
      intent.execution?.settlement === "CLOSE_POSITION"
    ) {
      const realizedPnl = intent.execution.realizedPnl || 0;
      return realizedPnl < 0 ? total + Math.abs(realizedPnl) : total;
    }

    return total;
  }, 0);
}

export function getAllTimeNetRealizedPnl(intents: TradeIntent[]) {
  return intents.reduce((total, intent) => {
    if (
      intent.artifactType === "POSITION_CLOSE" &&
      intent.execution?.settlement === "CLOSE_POSITION"
    ) {
      return total + (intent.execution.realizedPnl || 0);
    }

    return total;
  }, 0);
}

export function calculateDrawdownPct(equitySeries: number[]) {
  if (equitySeries.length === 0) return 0;

  let peak = equitySeries[0];
  let maxDrawdown = 0;

  equitySeries.forEach((equity) => {
    peak = Math.max(peak, equity);
    if (peak <= 0) return;
    const drawdown = ((peak - equity) / peak) * 100;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  });

  return maxDrawdown;
}

export function calculateSharpeLikeScore(equitySeries: number[]) {
  if (equitySeries.length < 2) return 0;

  const returns = equitySeries.slice(1).map((equity, index) => {
    const previous = equitySeries[index];
    if (!previous) return 0;
    return (equity - previous) / previous;
  });

  const avgReturn =
    returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance =
    returns.reduce((sum, value) => sum + (value - avgReturn) ** 2, 0) /
    returns.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return avgReturn > 0 ? 5 : 0;
  }

  return Math.max(
    0,
    Math.min(5, (avgReturn / stdDev) * Math.sqrt(returns.length)),
  );
}

export function getRiskRouterDecision(params: {
  policy: ReturnType<typeof getRiskPolicy>;
  totalTreasury: number;
  availableCapital: number;
  activePositions: TradeIntent[];
  intents: TradeIntent[];
  asset: string;
  side: "BUY" | "SELL";
  tradeNotional: number;
  leverage: number;
  currentDrawdownPct: number;
  isFlipTrade?: boolean;
  isGridBot?: boolean;
}) {
  const {
    policy,
    totalTreasury,
    availableCapital,
    activePositions,
    intents,
    asset,
    side,
    tradeNotional,
    leverage,
    currentDrawdownPct,
    isFlipTrade = false,
    isGridBot = false,
  } = params;

  const maxAllowedNotional = Math.min(
    availableCapital,
    policy.maxAllocationNotional,
  );
  const dailyLossUsed = getDailyRealizedLoss(intents);
  const dailyLossCap = totalTreasury * policy.dailyLossLimitPct;

  if (!policy.allowedAssets.includes(asset)) {
    return {
      approved: false,
      code: "ASSET_NOT_ALLOWED",
      comment: `Asset ${asset} is outside the whitelisted sandbox markets.`,
      maxAllowedNotional,
      dailyLossUsed,
    };
  }

  if (leverage > policy.leverageCap) {
    return {
      approved: false,
      code: "LEVERAGE_CAP",
      comment: `Requested leverage exceeds the ${policy.leverageCap}x policy cap.`,
      maxAllowedNotional,
      dailyLossUsed,
    };
  }

  if (!isFlipTrade && activePositions.length >= policy.maxOpenPositions) {
    return {
      approved: false,
      code: "MAX_OPEN_POSITIONS",
      comment: `Risk Router blocked the trade because the agent already has ${activePositions.length} open positions, which meets the policy cap.`,
      maxAllowedNotional,
      dailyLossUsed,
    };
  }

  if (dailyLossCap > 0 && dailyLossUsed > dailyLossCap) {
    return {
      approved: false,
      code: "DAILY_LOSS_LIMIT",
      comment: `Daily realized loss limit reached: ${dailyLossUsed.toFixed(2)} / ${dailyLossCap.toFixed(2)} USD.`,
      maxAllowedNotional,
      dailyLossUsed,
    };
  }

  if (currentDrawdownPct >= policy.killSwitchDrawdownPct) {
    return {
      approved: false,
      code: "KILL_SWITCH",
      comment: `Kill switch engaged because drawdown reached ${currentDrawdownPct.toFixed(1)}%, above the ${policy.killSwitchDrawdownPct}% threshold.`,
      maxAllowedNotional,
      dailyLossUsed,
    };
  }

  // Allow a small buffer (1%) to prevent blocking trades over rounding differences
  const notionalWithBuffer = maxAllowedNotional * 1.01;
  if (tradeNotional > availableCapital || tradeNotional > notionalWithBuffer) {
    return {
      approved: false,
      code: "CAPITAL_LIMIT",
      comment: `Requested notional ${tradeNotional.toFixed(2)} USD exceeded the available routed capital.`,
      maxAllowedNotional,
      dailyLossUsed,
    };
  }

  const duplicatePosition = activePositions.find(
    (position) => position.asset === asset && position.side === side,
  );
  if (duplicatePosition && !isGridBot) {
    return {
      approved: false,
      code: "DUPLICATE_EXPOSURE",
      comment: `Duplicate ${side} exposure on ${asset} rejected to avoid stacking risk.`,
      maxAllowedNotional,
      dailyLossUsed,
    };
  }

  return {
    approved: true,
    code: "APPROVED",
    comment: "Risk Router approved the trade under current sandbox policy.",
    maxAllowedNotional,
    dailyLossUsed,
  };
}

export function getCommittedCapital(position: Partial<TradeIntent>) {
  if (typeof position.capitalAllocated === "number") {
    return position.capitalAllocated;
  }

  if (position.entryPrice && position.size) {
    return position.entryPrice * position.size;
  }

  return 0;
}

export function computeValidationAverage(
  validations: { score: number }[],
  maxRecent = 20,
): number {
  if (validations.length === 0) return 0;
  const recent = validations.slice(0, maxRecent);
  return recent.reduce((sum, v) => sum + v.score, 0) / recent.length;
}

export type AiAccuracyRecord = {
  intentId: string;
  agentId: string;
  rawSide: "BUY" | "SELL" | "HOLD";
  rawAsset: string;
  finalSide: "BUY" | "SELL" | "HOLD";
  finalAsset: string;
  wasOverridden: boolean;
  realizedPnl: number;
  rawWouldHaveBeenCorrect: boolean;
  timestamp: number;
};

export function evaluateAiAccuracy(params: {
  intentId: string;
  agentId: string;
  rawAiDecision?: TradeIntent["rawAiDecision"];
  finalSide: "BUY" | "SELL" | "HOLD";
  finalAsset: string;
  entryPrice: number;
  exitPrice: number;
  realizedPnl: number;
  timestamp: number;
}): AiAccuracyRecord | null {
  if (!params.rawAiDecision) return null;
  const { rawAiDecision, entryPrice, exitPrice } = params;
  const rawPriceMove = exitPrice - entryPrice;
  const rawWouldHaveBeenCorrect =
    (rawAiDecision.side === "BUY" && rawPriceMove > 0) ||
    (rawAiDecision.side === "SELL" && rawPriceMove < 0) ||
    rawAiDecision.side === "HOLD";

  return {
    intentId: params.intentId,
    agentId: params.agentId,
    rawSide: rawAiDecision.side,
    rawAsset: rawAiDecision.asset,
    finalSide: params.finalSide,
    finalAsset: params.finalAsset,
    wasOverridden:
      rawAiDecision.side !== params.finalSide ||
      rawAiDecision.asset !== params.finalAsset,
    realizedPnl: params.realizedPnl,
    rawWouldHaveBeenCorrect,
    timestamp: params.timestamp,
  };
}

export function getTrustScore(agent: AggregatedAgentView) {
  const sharpeComponent = Math.max(
    0,
    Math.min(40, agent.reputation.sharpeLikeScore * 10),
  );
  const validationComponent = Math.max(
    0,
    Math.min(35, (agent.validationAverageScore || 0) * 0.35),
  );
  const drawdownPenalty = Math.max(
    0,
    Math.min(15, agent.reputation.maxDrawdown * 0.5),
  );
  const clampedPnl = Math.max(0, agent.reputation.cumulativePnl);
  const pnlComponent = Math.max(0, Math.min(25, Math.sqrt(clampedPnl) * 0.5));

  return Math.max(
    0,
    Math.min(
      100,
      sharpeComponent + validationComponent + pnlComponent - drawdownPenalty,
    ),
  );
}

export type TrustTimelineEvent = {
  id: string;
  timestamp: number;
  title: string;
  detail: string;
  tone: "approved" | "blocked" | "neutral" | "info";
  kind: "INTENT" | "SIGNED" | "RISK" | "EXECUTION" | "VALIDATION";
  nonce?: string;
  intentId?: string;
};

function getCheckpointTone(
  status: AgentCheckpoint["status"],
): TrustTimelineEvent["tone"] {
  switch (status) {
    case "APPROVED":
      return "approved";
    case "BLOCKED":
      return "blocked";
    case "INFO":
      return "info";
    case "PENDING":
      return "neutral";
    default:
      return "neutral";
  }
}

function mapCheckpointToTimelineEvent(
  checkpoint: AgentCheckpoint,
): TrustTimelineEvent {
  return {
    id: checkpoint.id,
    timestamp: checkpoint.timestamp,
    title: checkpoint.title,
    detail: checkpoint.detail,
    tone: getCheckpointTone(checkpoint.status),
    kind: checkpoint.kind,
    nonce: checkpoint.nonce,
    intentId: checkpoint.intentId,
  };
}

function isTimedReviewKeepOpen(intent: TradeIntent) {
  return (
    intent.artifactType === "SYSTEM_HOLD" &&
    typeof intent.reason === "string" &&
    intent.reason.toLowerCase().includes("stayed open after its timed review")
  );
}

function isTrailingStopActivated(intent: TradeIntent) {
  return (
    intent.artifactType === "SYSTEM_HOLD" &&
    typeof intent.reason === "string" &&
    intent.reason.toLowerCase().includes("trailing stop activated")
  );
}

function isTrailingStopRaised(intent: TradeIntent) {
  return (
    intent.artifactType === "SYSTEM_HOLD" &&
    typeof intent.reason === "string" &&
    intent.reason.toLowerCase().includes("trailing stop raised")
  );
}

function isTimedReviewClose(intent: TradeIntent) {
  return (
    intent.artifactType === "POSITION_CLOSE" &&
    intent.engine === "RISK_ROUTER_REASSESSMENT"
  );
}

function isTrailingStopClose(intent: TradeIntent) {
  return (
    intent.artifactType === "POSITION_CLOSE" &&
    intent.engine === "RISK_ROUTER_TRAILING_STOP"
  );
}

function isGridInitialized(intent: TradeIntent) {
  return (
    intent.artifactType === "SYSTEM_HOLD" &&
    intent.engine === "SPOT_GRID_BOT_INIT"
  );
}

function isGridRebuilt(intent: TradeIntent) {
  return (
    intent.artifactType === "SYSTEM_HOLD" &&
    intent.engine === "SPOT_GRID_BOT_REBUILD"
  );
}

function isGridPaused(intent: TradeIntent) {
  return (
    intent.artifactType === "SYSTEM_HOLD" &&
    intent.engine === "SPOT_GRID_BOT_PAUSE"
  );
}

function isGridTerminated(intent: TradeIntent) {
  return (
    intent.artifactType === "SYSTEM_HOLD" &&
    intent.engine === "SPOT_GRID_BOT_TERMINATE"
  );
}

function isGridBuyFill(intent: TradeIntent) {
  return (
    intent.artifactType === "TRADE_INTENT" && intent.engine === "SPOT_GRID_BOT"
  );
}

function isGridSellFill(intent: TradeIntent) {
  return (
    intent.artifactType === "POSITION_CLOSE" &&
    intent.engine === "SPOT_GRID_BOT"
  );
}

function getRiskEventTitle(intent: TradeIntent) {
  if (isTrailingStopActivated(intent)) return "Trailing Stop Activated";
  if (isTrailingStopRaised(intent)) return "Trailing Stop Raised";
  if (isGridInitialized(intent)) return "Grid Initialized";
  if (isGridRebuilt(intent)) return "Grid Range Rebuilt";
  if (isGridTerminated(intent)) return "Grid Terminated by Operator";
  if (isGridPaused(intent)) return "Grid Paused Outside Range";
  if (isGridSellFill(intent)) return "Grid Profit Captured";
  if (isTimedReviewKeepOpen(intent)) return "Timed Review Kept Trade Open";
  if (intent.riskCheck?.status === "APPROVED") return "Risk Check Passed";
  if (intent.riskCheck?.status === "BLOCKED") return "Trade Blocked by Policy";
  return "Risk Check Says Wait";
}

function getExecutionEventTitle(intent: TradeIntent) {
  if (intent.execution?.status === "REJECTED") return "Trade Not Placed";
  if (isTrailingStopClose(intent)) return "Trailing Stop Closed Position";
  if (isGridSellFill(intent)) return "Grid Sell Filled";
  if (isTimedReviewClose(intent)) return "Timed Review Closed Position";
  if (intent.execution?.status === "NOT_EXECUTED") {
    if (isGridInitialized(intent)) return "Grid Initialized";
    if (isGridRebuilt(intent)) return "Grid Range Rebuilt";
    if (isGridTerminated(intent)) return "Grid Terminated";
    if (isGridPaused(intent)) return "Grid Paused Outside Range";
    return "Trade Deferred";
  }
  if (isGridBuyFill(intent)) return "Grid Buy Filled";
  return "Trade Recorded";
}

function getValidationEventTitle(intent: TradeIntent) {
  if (isTrailingStopActivated(intent)) return "Trailing Stop Activation Saved";
  if (isTrailingStopRaised(intent)) return "Trailing Stop Update Saved";
  if (isTrailingStopClose(intent)) return "Trailing Stop Exit Saved";
  if (isGridInitialized(intent)) return "Grid Setup Saved";
  if (isGridRebuilt(intent)) return "Grid Rebuild Saved";
  if (isGridTerminated(intent)) return "Grid Termination Saved";
  if (isGridPaused(intent)) return "Grid Pause Saved";
  if (isGridSellFill(intent)) return "Grid Profit Captured";
  return "Validation Record Saved";
}

function getIntentCheckpointTitle(intent: TradeIntent) {
  if (isTrailingStopClose(intent)) return "Trailing Stop Closed Position";
  if (isGridSellFill(intent)) return "Grid Sell Filled";
  if (isTimedReviewClose(intent)) return "Timed Review Closed Position";
  if (intent.artifactType === "POSITION_CLOSE") return "Position Close Saved";
  if (intent.artifactType === "RISK_BLOCK") return "Trade Blocked by Policy";
  if (isGridInitialized(intent)) return "Grid Initialized";
  if (isGridRebuilt(intent)) return "Grid Range Rebuilt";
  if (isGridTerminated(intent)) return "Grid Terminated by Operator";
  if (isGridPaused(intent)) return "Grid Paused Outside Range";
  if (isGridBuyFill(intent)) return "Grid Buy Filled";
  if (isTrailingStopActivated(intent)) return "Trailing Stop Activated";
  if (isTrailingStopRaised(intent)) return "Trailing Stop Raised";
  if (isTimedReviewKeepOpen(intent)) return "Timed Review Kept Trade Open";
  if (intent.artifactType === "SYSTEM_HOLD") return "No-Trade Hold Saved";
  return "Trade Intent Saved";
}

function buildTimelineFromIntents(
  intents: TradeIntent[],
): TrustTimelineEvent[] {
  const events: TrustTimelineEvent[] = [];

  intents.forEach((intent) => {
    const baseId = intent.intentId || `${intent.agentId}_${intent.timestamp}`;
    const assetLabel = intent.asset === "N/A" ? "SYSTEM" : intent.asset;

    if (intent.signature && intent.signature.status !== "NOT_REQUIRED") {
      events.push({
        id: `${baseId}_signed`,
        timestamp: intent.timestamp,
        title:
          intent.signature.status === "SIGNED_VERIFIED"
            ? "Intent Signed"
            : "Signature Pending",
        detail: `${intent.side} ${assetLabel} // ${intent.signature.scheme} // ${intent.nonce || "nonce-missing"}`,
        tone:
          intent.signature.status === "SIGNED_VERIFIED"
            ? "approved"
            : "neutral",
        kind: "SIGNED",
        nonce: intent.nonce,
        intentId: intent.intentId,
      });
    }

    if (intent.riskCheck) {
      events.push({
        id: `${baseId}_risk`,
        timestamp: intent.timestamp + 1,
        title: getRiskEventTitle(intent),
        detail: `${intent.riskCheck.comment} // Score ${intent.riskCheck.score}`,
        tone:
          intent.riskCheck.status === "APPROVED"
            ? "approved"
            : intent.riskCheck.status === "BLOCKED"
              ? "blocked"
              : "neutral",
        kind: "RISK",
        nonce: intent.nonce,
        intentId: intent.intentId,
      });
    }

    if (intent.execution) {
      events.push({
        id: `${baseId}_execution`,
        timestamp: intent.timestamp + 2,
        title: getExecutionEventTitle(intent),
        detail: `${intent.execution.venue} // ${intent.execution.mode} // ${intent.status || "N/A"}`,
        tone:
          intent.execution.status === "REJECTED"
            ? "blocked"
            : intent.execution.status === "NOT_EXECUTED"
              ? "neutral"
              : "approved",
        kind: "EXECUTION",
        nonce: intent.nonce,
        intentId: intent.intentId,
      });
    }

    if (intent.validation) {
      events.push({
        id: `${baseId}_validation`,
        timestamp: intent.timestamp + 3,
        title: getValidationEventTitle(intent),
        detail: `${intent.validation.comment} // Score ${intent.validation.score}`,
        tone:
          intent.validation.score >= 70
            ? "approved"
            : intent.validation.score >= 40
              ? "neutral"
              : "blocked",
        kind: "VALIDATION",
        nonce: intent.nonce,
        intentId: intent.intentId,
      });
    }
  });

  return events.sort((a, b) => b.timestamp - a.timestamp);
}

function createCheckpointId(
  intent: TradeIntent,
  stage: AgentCheckpoint["stage"],
) {
  const baseId = intent.intentId || `${intent.agentId}_${intent.timestamp}`;
  return `${baseId}_${stage.toLowerCase()}`;
}

export function createCheckpointsForIntent(
  intent: TradeIntent,
): AgentCheckpoint[] {
  const checkpoints: AgentCheckpoint[] = [];
  const assetLabel = intent.asset || "N/A";
  const sideLabel = intent.side || "HOLD";
  const capitalLabel =
    typeof intent.capitalAllocated === "number"
      ? `${intent.capitalAllocated.toFixed(2)} USD`
      : "Capital pending";

  checkpoints.push({
    id: createCheckpointId(intent, "INTENT_CREATED"),
    agentId: intent.agentId,
    intentId: intent.intentId,
    nonce: intent.nonce,
    kind: "INTENT",
    stage: "INTENT_CREATED",
    status:
      intent.artifactType === "RISK_BLOCK"
        ? "BLOCKED"
        : intent.side === "HOLD"
          ? "INFO"
          : "RECORDED",
    title: getIntentCheckpointTitle(intent),
    detail: `${sideLabel} ${assetLabel} // ${capitalLabel} // ${intent.nonce || "nonce-missing"}`,
    asset: intent.asset,
    side: intent.side,
    capitalAllocated: intent.capitalAllocated,
    capitalAvailableAfter: intent.capitalAvailableAfter,
    engine: intent.engine,
    timestamp: intent.timestamp,
  });

  if (intent.signature && intent.signature.status !== "NOT_REQUIRED") {
    checkpoints.push({
      id: createCheckpointId(intent, "INTENT_SIGNED"),
      agentId: intent.agentId,
      intentId: intent.intentId,
      nonce: intent.nonce,
      kind: "SIGNED",
      stage: "INTENT_SIGNED",
      status:
        intent.signature.status === "SIGNED_VERIFIED" ? "APPROVED" : "PENDING",
      title:
        intent.signature.status === "SIGNED_VERIFIED"
          ? "Intent Signature Verified"
          : "Signature Required",
      detail: `${intent.signature.scheme} // ${intent.signer?.owner || "signer-missing"} // ${truncateValue(intent.signature.digest)}`,
      asset: intent.asset,
      side: intent.side,
      timestamp: intent.timestamp + 1,
    });
  }

  if (intent.riskCheck) {
    checkpoints.push({
      id: createCheckpointId(intent, "RISK_REVIEWED"),
      agentId: intent.agentId,
      intentId: intent.intentId,
      nonce: intent.nonce,
      kind: "RISK",
      stage: "RISK_REVIEWED",
      status:
        intent.riskCheck.status === "APPROVED"
          ? "APPROVED"
          : intent.riskCheck.status === "BLOCKED"
            ? "BLOCKED"
            : "INFO",
      title: getRiskEventTitle(intent),
      detail: `${intent.riskCheck.comment} // Score ${intent.riskCheck.score}`,
      asset: intent.asset,
      side: intent.side,
      score: intent.riskCheck.score,
      capitalAllocated: intent.capitalAllocated,
      capitalAvailableAfter: intent.capitalAvailableAfter,
      timestamp: intent.timestamp + 2,
    });
  }

  if (intent.execution) {
    checkpoints.push({
      id: createCheckpointId(intent, "EXECUTION_RECORDED"),
      agentId: intent.agentId,
      intentId: intent.intentId,
      nonce: intent.nonce,
      kind: "EXECUTION",
      stage: "EXECUTION_RECORDED",
      status:
        intent.execution.status === "REJECTED"
          ? "BLOCKED"
          : intent.execution.status === "NOT_EXECUTED"
            ? "INFO"
            : "APPROVED",
      title: getExecutionEventTitle(intent),
      detail: `${intent.execution.venue} // ${intent.execution.mode} // ${intent.status || "N/A"}`,
      asset: intent.asset,
      side: intent.side,
      capitalAllocated: intent.capitalAllocated,
      capitalAvailableAfter: intent.capitalAvailableAfter,
      timestamp: intent.timestamp + 3,
    });
  }

  if (intent.validation) {
    checkpoints.push({
      id: createCheckpointId(intent, "VALIDATION_RECORDED"),
      agentId: intent.agentId,
      intentId: intent.intentId,
      nonce: intent.nonce,
      kind: "VALIDATION",
      stage: "VALIDATION_RECORDED",
      status:
        intent.validation.score >= 70
          ? "APPROVED"
          : intent.validation.score >= 40
            ? "INFO"
            : "BLOCKED",
      title: getValidationEventTitle(intent),
      detail: `${intent.validation.comment} // Score ${intent.validation.score}`,
      asset: intent.asset,
      side: intent.side,
      score: intent.validation.score,
      timestamp: intent.timestamp + 4,
    });
  }

  return checkpoints;
}

function truncateValue(value?: string) {
  if (!value) return "n/a";
  if (value.length <= 18) return value;
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

export function buildTrustTimeline(
  intents: TradeIntent[],
  checkpoints: AgentCheckpoint[] = [],
): TrustTimelineEvent[] {
  if (checkpoints.length > 0) {
    return checkpoints
      .slice()
      .sort((a, b) => b.timestamp - a.timestamp)
      .map(mapCheckpointToTimelineEvent);
  }

  return buildTimelineFromIntents(intents);
}
