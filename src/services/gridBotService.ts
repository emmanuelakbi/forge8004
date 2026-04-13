import {
  GridLevelState,
  GridRuntimeState,
  GridConfigSnapshot,
  TradeIntent,
} from "../lib/types";
import { MarketData } from "./marketService";

/** Default grid level count — now only used as a fallback when no explicit count is provided. */
export const GRID_TOTAL_LEVELS = 6;
const MIN_GRID_LEVELS = 2;
const MAX_GRID_LEVELS = 50;

type GridAsset = GridRuntimeState["asset"];

export type GridAiAdvisory = {
  recommendedAsset: GridAsset;
  shouldActivate: boolean;
  spacingBias: "tighter" | "normal" | "wider";
  reason: string;
  /** AI-suggested price range bounds (optional). */
  suggestedRangeLow?: number;
  suggestedRangeHigh?: number;
  /** AI-suggested grid count (optional). */
  suggestedGridLevels?: number;
};

type GridRangeDecision = {
  action: "rebuild" | "pause";
  reason: string;
};

export type GridCycleEvent =
  | {
      type: "initialized";
      runtime: GridRuntimeState;
      reason: string;
      timestamp: number;
    }
  | {
      type: "paused";
      runtime: GridRuntimeState;
      reason: string;
      timestamp: number;
    }
  | {
      type: "rebuilt";
      runtime: GridRuntimeState;
      reason: string;
      timestamp: number;
    }
  | {
      type: "buy_filled";
      runtime: GridRuntimeState;
      level: GridLevelState;
      reason: string;
      timestamp: number;
    }
  | {
      type: "sell_filled";
      runtime: GridRuntimeState;
      level: GridLevelState;
      pairedBuyLevel: GridLevelState;
      realizedProfit: number;
      reason: string;
      timestamp: number;
    }
  | {
      type: "trailing_stop_hit";
      runtime: GridRuntimeState;
      reason: string;
      timestamp: number;
    }
  | {
      type: "stop_loss_hit";
      runtime: GridRuntimeState;
      reason: string;
      timestamp: number;
    }
  | {
      type: "take_profit_hit";
      runtime: GridRuntimeState;
      reason: string;
      timestamp: number;
    }
  | {
      type: "modified";
      runtime: GridRuntimeState;
      reason: string;
      timestamp: number;
    }
  | {
      type: "withdrawn";
      runtime: GridRuntimeState;
      amount: number;
      reason: string;
      timestamp: number;
    };

// ─── Helpers ────────────────────────────────────────────────────────────────

function roundTo(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function cloneLevels(levels: GridLevelState[]) {
  return levels.map((level) => ({ ...level }));
}

function clampGridLevels(n: number): number {
  return Math.max(MIN_GRID_LEVELS, Math.min(MAX_GRID_LEVELS, Math.round(n)));
}

export function getGridPriceForAsset(asset: GridAsset, marketData: MarketData) {
  return asset === "BTC" ? marketData.btc.price : marketData.eth.price;
}

function getGridChangeForAsset(asset: GridAsset, marketData: MarketData) {
  return asset === "BTC" ? marketData.btc.change24h : marketData.eth.change24h;
}

export function chooseSpotGridAsset(
  marketData: MarketData,
  advisory?: GridAiAdvisory,
): GridAsset {
  if (advisory?.recommendedAsset) return advisory.recommendedAsset;
  const btcVolatility = Math.abs(marketData.btc.change24h || 0);
  const ethVolatility = Math.abs(marketData.eth.change24h || 0);
  if (Math.abs(btcVolatility - ethVolatility) <= 0.15) {
    return marketData.btc.change24h <= marketData.eth.change24h ? "BTC" : "ETH";
  }
  return btcVolatility <= ethVolatility ? "BTC" : "ETH";
}

export function getSpotGridSpacingPct(
  asset: GridAsset,
  marketData: MarketData,
  advisory?: GridAiAdvisory,
) {
  const volatility = Math.abs(getGridChangeForAsset(asset, marketData));
  const baseSpacing = Math.min(
    0.02,
    Math.max(0.006, 0.008 + (volatility / 100) * 0.22),
  );
  const assetMultiplier = asset === "BTC" ? 1.5 : 1;
  const biasFactor =
    advisory?.spacingBias === "wider"
      ? 1.3
      : advisory?.spacingBias === "tighter"
        ? 0.8
        : 1;
  return Math.min(0.035, baseSpacing * assetMultiplier * biasFactor);
}

// ─── Profit / APR Calculations ──────────────────────────────────────────────

/** Profit per grid as a percentage range [low, high]. */
export function getProfitPerGrid(
  rangeLow: number,
  rangeHigh: number,
  gridLevels: number,
): [number, number] {
  if (gridLevels < 2 || rangeLow <= 0 || rangeHigh <= rangeLow) return [0, 0];
  const buyLevels = Math.floor(gridLevels / 2);
  const interval = (rangeHigh - rangeLow) / gridLevels;
  const lowPct = (interval / rangeHigh) * 100;
  const highPct = (interval / rangeLow) * 100;
  return [
    roundTo(Math.min(lowPct, highPct), 2),
    roundTo(Math.max(lowPct, highPct), 2),
  ];
}

/** Grid APR based on cumulative grid profit, investment, and elapsed time. */
export function getGridAPR(
  gridProfit: number,
  totalInvestment: number,
  startedAt: number,
  now?: number,
): number {
  if (totalInvestment <= 0 || gridProfit <= 0) return 0;
  const elapsedMs = (now ?? Date.now()) - startedAt;
  if (elapsedMs <= 0) return 0;
  const elapsedYears = elapsedMs / (365.25 * 24 * 60 * 60 * 1000);
  if (elapsedYears < 0.0001) return 0; // less than ~1 hour
  return roundTo((gridProfit / totalInvestment / elapsedYears) * 100, 2);
}

/** Total APR including unrealized equity change. */
export function getTotalAPR(
  equity: number,
  totalInvestment: number,
  startedAt: number,
  now?: number,
): number {
  if (totalInvestment <= 0) return 0;
  const elapsedMs = (now ?? Date.now()) - startedAt;
  if (elapsedMs <= 0) return 0;
  const elapsedYears = elapsedMs / (365.25 * 24 * 60 * 60 * 1000);
  if (elapsedYears < 0.0001) return 0;
  const pnl = equity - totalInvestment;
  return roundTo((pnl / totalInvestment / elapsedYears) * 100, 2);
}

/** Current equity = available quote + (held base × current price). */
export function getGridEquity(
  runtime: GridRuntimeState,
  currentPrice: number,
): number {
  return roundTo(runtime.availableQuote + runtime.heldBase * currentPrice, 2);
}

/** Current P&L = equity - totalInvestment + previouslyWithdrawn. */
export function getGridPnL(
  runtime: GridRuntimeState,
  currentPrice: number,
): number {
  const equity = getGridEquity(runtime, currentPrice);
  return roundTo(
    equity - runtime.totalInvestment + runtime.previouslyWithdrawn,
    2,
  );
}

/** P&L percentage. */
export function getGridPnLPct(
  runtime: GridRuntimeState,
  currentPrice: number,
): number {
  if (runtime.totalInvestment <= 0) return 0;
  return roundTo(
    (getGridPnL(runtime, currentPrice) / runtime.totalInvestment) * 100,
    2,
  );
}

/** Max withdrawable = cumulative grid profit - previously withdrawn (clamped to available quote). */
export function getMaxWithdrawable(runtime: GridRuntimeState): number {
  const profitAvailable = Math.max(
    0,
    runtime.cumulativeGridProfit - runtime.previouslyWithdrawn,
  );
  return roundTo(Math.min(profitAvailable, runtime.availableQuote), 2);
}

// ─── Grid Level Builder ─────────────────────────────────────────────────────

/**
 * Build grid levels using Bybit-style even distribution across the full range.
 *
 * Levels are spaced evenly between `rangeLow` and `rangeHigh`. Prices below
 * `currentPrice` become BUY orders; prices at or above become SELL orders.
 * After the initial split, boundary levels are moved between sides so the
 * buy/sell count difference is at most 1 (prevents lopsided grids when the
 * current price sits near a range edge). Capital is allocated evenly across
 * buy levels only — sell levels are funded by selling the base asset. Buy and
 * sell levels are paired closest-first (highest buy ↔ lowest sell).
 *
 * @param rangeLow    - Lower bound of the grid range
 * @param rangeHigh   - Upper bound of the grid range
 * @param gridLevels  - Desired number of grid levels (clamped to valid range)
 * @param capitalReserved - Total quote capital to distribute across buy levels
 * @param currentPrice - Current market price used to split buy/sell sides
 * @param timestamp   - Timestamp applied to initial sell level `lastClosedAt`
 * @returns Grid levels array with initial buy/base amounts (both 0 until market buy)
 */
function buildGridLevelsFromRange(
  rangeLow: number,
  rangeHigh: number,
  gridLevels: number,
  capitalReserved: number,
  currentPrice: number,
  timestamp: number,
): {
  levels: GridLevelState[];
  initialBuyQuote: number;
  initialBuyBase: number;
} {
  const totalLevels = clampGridLevels(gridLevels);
  // Bybit-style: distribute levels evenly across the entire range.
  // Levels below current price become BUY orders, levels above become SELL orders.
  const interval = (rangeHigh - rangeLow) / (totalLevels + 1);
  const allPrices: number[] = [];
  for (let i = 1; i <= totalLevels; i++) {
    allPrices.push(roundTo(rangeLow + interval * i, 2));
  }

  // Split into buy (below current price) and sell (above current price)
  // Don't force balance — let the natural split based on current price determine
  // how many buys vs sells. This means more sells when price is near the bottom
  // of the range, and more buys when price is near the top.
  const buyList = allPrices
    .filter((p) => p < currentPrice)
    .sort((a, b) => b - a); // highest buy first
  const sellList = allPrices
    .filter((p) => p >= currentPrice)
    .sort((a, b) => a - b); // lowest sell first

  // Allocate capital evenly across buy levels only (sells are funded by selling base asset)
  const quotePerLevel =
    buyList.length > 0 ? capitalReserved / buyList.length : 0;
  const levels: GridLevelState[] = [];

  // Pair buy levels (highest) with sell levels (lowest) — closest pairs first
  const pairCount = Math.min(buyList.length, sellList.length);

  for (let i = 0; i < buyList.length; i++) {
    const buyId = `buy_${i + 1}`;
    const sellId = `sell_${i + 1}`;

    levels.push({
      id: buyId,
      side: "BUY",
      price: buyList[i],
      status: "waiting",
      pairedLevelId: sellId,
      quantity: 0,
      quoteAllocated: roundTo(quotePerLevel, 2),
    });
  }

  for (let i = 0; i < sellList.length; i++) {
    const sellId = `sell_${i + 1}`;
    const buyId = `buy_${i + 1}`;

    levels.push({
      id: sellId,
      side: "SELL",
      price: sellList[i],
      status: "closed",
      pairedLevelId: buyId,
      quantity: 0,
      quoteAllocated: 0,
      lastClosedAt: timestamp,
    });
  }

  return { levels, initialBuyQuote: 0, initialBuyBase: 0 };
}

// Legacy builder for backward compat (spacing-based)
function buildGridLevels(
  referencePrice: number,
  spacingPct: number,
  capitalReserved: number,
  gridLevels: number,
  timestamp: number,
) {
  const buyCount = Math.floor(gridLevels / 2);
  const quotePerLevel = buyCount > 0 ? capitalReserved / buyCount : 0;
  const levels: GridLevelState[] = [];

  for (let index = 1; index <= buyCount; index += 1) {
    const buyId = `buy_${index}`;
    const sellId = `sell_${index}`;
    const buyPrice = roundTo(referencePrice * (1 - spacingPct * index), 2);
    const sellPrice = roundTo(referencePrice * (1 + spacingPct * index), 2);

    levels.push({
      id: buyId,
      side: "BUY",
      price: buyPrice,
      status: "waiting",
      pairedLevelId: sellId,
      quantity: 0,
      quoteAllocated: roundTo(quotePerLevel, 2),
    });
    levels.push({
      id: sellId,
      side: "SELL",
      price: sellPrice,
      status: "closed",
      pairedLevelId: buyId,
      quantity: 0,
      quoteAllocated: 0,
      lastClosedAt: timestamp,
    });
  }

  return levels;
}

// ─── Runtime Creation ───────────────────────────────────────────────────────

export type CreateGridParams = {
  agentId: string;
  marketData: MarketData;
  capitalReserved: number;
  asset?: GridAsset;
  advisory?: GridAiAdvisory;
  timestamp?: number;
  /** Explicit overrides (manual mode or modification). */
  overrides?: {
    rangeLow?: number;
    rangeHigh?: number;
    gridLevels?: number;
    trailingStopPct?: number;
    stopLossPrice?: number;
    takeProfitPrice?: number;
    trailingUpEnabled?: boolean;
    trailingUpStopPrice?: number;
    configMode?: "ai" | "manual";
  };
};

export function createSpotGridRuntime(
  params: CreateGridParams,
): GridRuntimeState {
  const timestamp = params.timestamp ?? Date.now();
  const asset =
    params.asset ?? chooseSpotGridAsset(params.marketData, params.advisory);
  const referencePrice = getGridPriceForAsset(asset, params.marketData);
  const overrides = params.overrides;
  const advisory = params.advisory;

  // Determine config mode
  const configMode: "ai" | "manual" =
    overrides?.configMode ?? (overrides ? "manual" : "ai");

  // Determine grid levels
  const gridLevels = clampGridLevels(
    overrides?.gridLevels ?? advisory?.suggestedGridLevels ?? GRID_TOTAL_LEVELS,
  );

  // Determine range
  let rangeLow: number;
  let rangeHigh: number;
  let spacingPct: number;
  let levels: GridLevelState[];

  if (
    overrides?.rangeLow != null &&
    overrides?.rangeHigh != null &&
    overrides.rangeHigh > overrides.rangeLow
  ) {
    // Explicit range (manual or modification)
    rangeLow = roundTo(overrides.rangeLow, 2);
    rangeHigh = roundTo(overrides.rangeHigh, 2);
    spacingPct = roundTo(
      (rangeHigh - rangeLow) / (rangeHigh + rangeLow) / (gridLevels / 2),
      6,
    );
    const built = buildGridLevelsFromRange(
      rangeLow,
      rangeHigh,
      gridLevels,
      params.capitalReserved,
      referencePrice,
      timestamp,
    );
    levels = built.levels;
  } else if (
    advisory?.suggestedRangeLow != null &&
    advisory?.suggestedRangeHigh != null &&
    advisory.suggestedRangeHigh > advisory.suggestedRangeLow
  ) {
    // AI-suggested range
    rangeLow = roundTo(advisory.suggestedRangeLow, 2);
    rangeHigh = roundTo(advisory.suggestedRangeHigh, 2);
    spacingPct = roundTo(
      (rangeHigh - rangeLow) / (rangeHigh + rangeLow) / (gridLevels / 2),
      6,
    );
    const built = buildGridLevelsFromRange(
      rangeLow,
      rangeHigh,
      gridLevels,
      params.capitalReserved,
      referencePrice,
      timestamp,
    );
    levels = built.levels;
  } else {
    // Legacy spacing-based calculation
    spacingPct = getSpotGridSpacingPct(asset, params.marketData, advisory);
    rangeLow = roundTo(referencePrice * (1 - spacingPct * (gridLevels / 2)), 2);
    rangeHigh = roundTo(
      referencePrice * (1 + spacingPct * (gridLevels / 2)),
      2,
    );
    levels = buildGridLevels(
      referencePrice,
      spacingPct,
      params.capitalReserved,
      gridLevels,
      timestamp,
    );
  }

  return {
    agentId: params.agentId,
    mode: "spot_grid_bot",
    status: "active",
    asset,
    referencePrice,
    rangeLow,
    rangeHigh,
    gridLevels,
    gridSpacingPct: spacingPct,
    capitalReserved: roundTo(params.capitalReserved, 2),
    availableQuote: roundTo(params.capitalReserved, 2),
    heldBase: 0,
    filledGridLegs: 0,
    cumulativeGridProfit: 0,
    levels,
    lastRebuildAt: timestamp,
    lastGridEventAt: timestamp,
    updatedAt: timestamp,
    // New fields
    configMode,
    totalInvestment: roundTo(params.capitalReserved, 2),
    previouslyWithdrawn: 0,
    profitableTradesCount: 0,
    totalTradesCount: 0,
    trailingStopPct: overrides?.trailingStopPct,
    stopLossPrice: overrides?.stopLossPrice,
    takeProfitPrice: overrides?.takeProfitPrice,
    trailingUpEnabled: overrides?.trailingUpEnabled,
    trailingUpStopPrice: overrides?.trailingUpStopPrice,
    configHistory: [
      {
        rangeLow,
        rangeHigh,
        gridLevels,
        trailingStopPct: overrides?.trailingStopPct,
        stopLossPrice: overrides?.stopLossPrice,
        takeProfitPrice: overrides?.takeProfitPrice,
        timestamp,
        reason:
          configMode === "ai"
            ? "AI-recommended initial configuration."
            : "Manual initial configuration.",
      },
    ],
    startedAt: timestamp,
  };
}

/**
 * Perform the initial market buy (Bybit-style entry order).
 * Buys base tokens at current price to arm sell levels above the current price.
 * This allows the grid to profit from immediate upward moves.
 */
export function performInitialMarketBuy(
  runtime: GridRuntimeState,
  currentPrice: number,
  timestamp?: number,
): {
  runtime: GridRuntimeState;
  filledBuys: GridLevelState[];
  armedSells: GridLevelState[];
} {
  const ts = timestamp ?? Date.now();
  const nextRuntime: GridRuntimeState = {
    ...runtime,
    levels: cloneLevels(runtime.levels),
    updatedAt: ts,
  };

  const filledBuys: GridLevelState[] = [];
  const armedSells: GridLevelState[] = [];

  // Bybit-style initial market buy:
  // Buy base asset at market price to arm sell levels above current price.
  // Only arm the sell level closest to current price (lowest sell above).
  // The remaining sells get armed naturally as price rises and triggers
  // their paired buys. This leaves most buy levels as waiting limit orders
  // to catch dips — the core value proposition of a grid bot.
  const sellLevelsAbove = nextRuntime.levels
    .filter(
      (l) =>
        l.side === "SELL" && l.status === "closed" && l.price > currentPrice,
    )
    .sort((a, b) => a.price - b.price); // lowest first (closest to current price)

  // Only fill the closest sell level — not all of them
  const sellsToArm = sellLevelsAbove.slice(0, 1);

  for (const sellLevel of sellsToArm) {
    // Find the paired buy level to get the quote allocation
    const pairedBuy = nextRuntime.levels.find(
      (l) => l.id === sellLevel.pairedLevelId,
    );
    if (!pairedBuy) continue;

    const quoteNeeded = pairedBuy.quoteAllocated;
    if (nextRuntime.availableQuote < quoteNeeded) break;

    const quantity = roundTo(quoteNeeded / currentPrice, 6);

    // Mark the paired buy as filled (bought at market price)
    pairedBuy.status = "filled";
    pairedBuy.quantity = quantity;
    pairedBuy.lastFilledAt = ts;

    // Arm the sell level
    sellLevel.status = "waiting";
    sellLevel.quantity = quantity;
    sellLevel.lastClosedAt = undefined;

    nextRuntime.availableQuote = roundTo(
      nextRuntime.availableQuote - quoteNeeded,
      2,
    );
    nextRuntime.heldBase = roundTo(nextRuntime.heldBase + quantity, 6);
    nextRuntime.filledGridLegs += 1;
    nextRuntime.totalTradesCount += 1;
    nextRuntime.lastGridEventAt = ts;

    filledBuys.push({ ...pairedBuy });
    armedSells.push({ ...sellLevel });
  }

  return { runtime: nextRuntime, filledBuys, armedSells };
}

// ─── Grid Modification ──────────────────────────────────────────────────────

export type ModifyGridParams = {
  rangeLow?: number;
  rangeHigh?: number;
  gridLevels?: number;
  trailingStopPct?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  trailingUpEnabled?: boolean;
  trailingUpStopPrice?: number;
};

/**
 * Modify a running grid's parameters. Rebuilds levels if range or grid count changed.
 * Returns the modified runtime and a 'modified' event for the checkpoint trail.
 */
export function modifySpotGrid(
  runtime: GridRuntimeState,
  modifications: ModifyGridParams,
  marketData: MarketData,
  timestamp?: number,
): { runtime: GridRuntimeState; event: GridCycleEvent } {
  const ts = timestamp ?? Date.now();
  const changes: string[] = [];

  const nextRangeLow = modifications.rangeLow ?? runtime.rangeLow;
  const nextRangeHigh = modifications.rangeHigh ?? runtime.rangeHigh;
  const nextGridLevels = clampGridLevels(
    modifications.gridLevels ?? runtime.gridLevels,
  );
  const rangeChanged =
    nextRangeLow !== runtime.rangeLow || nextRangeHigh !== runtime.rangeHigh;
  const levelsChanged = nextGridLevels !== runtime.gridLevels;

  if (rangeChanged)
    changes.push(
      `Range: ${runtime.rangeLow.toFixed(0)}-${runtime.rangeHigh.toFixed(0)} → ${nextRangeLow.toFixed(0)}-${nextRangeHigh.toFixed(0)}`,
    );
  if (levelsChanged)
    changes.push(`Grids: ${runtime.gridLevels} → ${nextGridLevels}`);
  if (
    modifications.trailingStopPct !== undefined &&
    modifications.trailingStopPct !== runtime.trailingStopPct
  ) {
    changes.push(
      `Trailing stop: ${runtime.trailingStopPct ?? "off"}% → ${modifications.trailingStopPct}%`,
    );
  }
  if (
    modifications.stopLossPrice !== undefined &&
    modifications.stopLossPrice !== runtime.stopLossPrice
  ) {
    changes.push(
      `Stop loss: ${runtime.stopLossPrice?.toFixed(0) ?? "off"} → ${modifications.stopLossPrice.toFixed(0)}`,
    );
  }
  if (
    modifications.takeProfitPrice !== undefined &&
    modifications.takeProfitPrice !== runtime.takeProfitPrice
  ) {
    changes.push(
      `Take profit: ${runtime.takeProfitPrice?.toFixed(0) ?? "off"} → ${modifications.takeProfitPrice.toFixed(0)}`,
    );
  }

  let nextRuntime: GridRuntimeState;

  if (rangeChanged || levelsChanged) {
    // Rebuild levels with new range/count, preserving capital and profit state
    const currentPrice = getGridPriceForAsset(runtime.asset, marketData);
    const rebuildResult = buildGridLevelsFromRange(
      nextRangeLow,
      nextRangeHigh,
      nextGridLevels,
      runtime.heldBase > 0
        ? roundTo(
            runtime.availableQuote + runtime.heldBase * currentPrice * 0.995,
            2,
          )
        : runtime.availableQuote,
      currentPrice,
      ts,
    );
    const levels = rebuildResult.levels;
    const spacingPct =
      nextGridLevels > 1
        ? roundTo(
            (nextRangeHigh - nextRangeLow) /
              (nextRangeHigh + nextRangeLow) /
              (nextGridLevels / 2),
            6,
          )
        : runtime.gridSpacingPct;

    const rebuildInitialBuyBase = levels
      .filter((l) => l.side === "BUY" && l.status === "filled")
      .reduce((sum, l) => sum + l.quantity, 0);
    const rebuildInitialBuyQuote = levels
      .filter((l) => l.side === "BUY" && l.status === "filled")
      .reduce((sum, l) => sum + l.quoteAllocated, 0);
    const totalQuoteAvailable =
      runtime.heldBase > 0
        ? roundTo(
            runtime.availableQuote +
              runtime.heldBase *
                getGridPriceForAsset(runtime.asset, marketData) *
                0.995,
            2,
          )
        : runtime.availableQuote;

    nextRuntime = {
      ...runtime,
      rangeLow: roundTo(nextRangeLow, 2),
      rangeHigh: roundTo(nextRangeHigh, 2),
      gridLevels: nextGridLevels,
      gridSpacingPct: spacingPct,
      levels,
      availableQuote: roundTo(totalQuoteAvailable - rebuildInitialBuyQuote, 2),
      heldBase: roundTo(rebuildInitialBuyBase, 6),
      filledGridLegs: levels.filter(
        (l) => l.side === "BUY" && l.status === "filled",
      ).length,
      lastRebuildAt: ts,
      lastGridEventAt: ts,
      updatedAt: ts,
    };
  } else {
    nextRuntime = {
      ...runtime,
      lastGridEventAt: ts,
      updatedAt: ts,
    };
  }

  // Apply non-structural modifications
  if (modifications.trailingStopPct !== undefined)
    nextRuntime.trailingStopPct = modifications.trailingStopPct || undefined;
  if (modifications.stopLossPrice !== undefined)
    nextRuntime.stopLossPrice = modifications.stopLossPrice || undefined;
  if (modifications.takeProfitPrice !== undefined)
    nextRuntime.takeProfitPrice = modifications.takeProfitPrice || undefined;
  if (modifications.trailingUpEnabled !== undefined)
    nextRuntime.trailingUpEnabled = modifications.trailingUpEnabled;
  if (modifications.trailingUpStopPrice !== undefined)
    nextRuntime.trailingUpStopPrice =
      modifications.trailingUpStopPrice || undefined;

  // Record config snapshot
  const snapshot: GridConfigSnapshot = {
    rangeLow: nextRuntime.rangeLow,
    rangeHigh: nextRuntime.rangeHigh,
    gridLevels: nextRuntime.gridLevels,
    trailingStopPct: nextRuntime.trailingStopPct,
    stopLossPrice: nextRuntime.stopLossPrice,
    takeProfitPrice: nextRuntime.takeProfitPrice,
    timestamp: ts,
    reason: `Grid modified: ${changes.join(", ") || "parameters updated"}.`,
  };
  nextRuntime.configHistory = [...(runtime.configHistory || []), snapshot];

  const reason = `Grid parameters modified: ${changes.join(", ") || "non-structural update"}.`;

  return {
    runtime: nextRuntime,
    event: {
      type: "modified",
      runtime: { ...nextRuntime, levels: cloneLevels(nextRuntime.levels) },
      reason,
      timestamp: ts,
    },
  };
}

// ─── Grid Withdrawal ────────────────────────────────────────────────────────

/**
 * Withdraw accumulated grid profit from a running grid.
 * Returns the updated runtime and a 'withdrawn' event.
 */
export function withdrawFromGrid(
  runtime: GridRuntimeState,
  amount: number,
  timestamp?: number,
): { runtime: GridRuntimeState; event: GridCycleEvent } | null {
  const ts = timestamp ?? Date.now();
  const maxWithdrawable = getMaxWithdrawable(runtime);

  if (amount <= 0 || amount > maxWithdrawable) return null;

  const nextRuntime: GridRuntimeState = {
    ...runtime,
    levels: cloneLevels(runtime.levels),
    availableQuote: roundTo(runtime.availableQuote - amount, 2),
    capitalReserved: roundTo(Math.max(0, runtime.capitalReserved - amount), 2),
    previouslyWithdrawn: roundTo(runtime.previouslyWithdrawn + amount, 2),
    lastGridEventAt: ts,
    updatedAt: ts,
  };

  return {
    runtime: nextRuntime,
    event: {
      type: "withdrawn",
      runtime: { ...nextRuntime, levels: cloneLevels(nextRuntime.levels) },
      amount: roundTo(amount, 2),
      reason: `Withdrew ${amount.toFixed(2)} USDC from grid profit. Previously withdrawn: ${nextRuntime.previouslyWithdrawn.toFixed(2)} USDC.`,
      timestamp: ts,
    },
  };
}

// ─── Bot-Level Stop Checks ──────────────────────────────────────────────────

function shouldPauseGrid(asset: GridAsset, marketData: MarketData) {
  return Math.abs(getGridChangeForAsset(asset, marketData)) >= 3.0;
}

function getOutOfRangeDecision(
  runtime: GridRuntimeState,
  marketData: MarketData,
): GridRangeDecision {
  if (shouldPauseGrid(runtime.asset, marketData) || runtime.heldBase > 0) {
    return {
      action: "pause",
      reason:
        runtime.heldBase > 0
          ? "Price moved outside the active grid range while base inventory was still open, so the ladder paused instead of rebuilding mid-position."
          : "Price left the active grid range during a stronger move, so the ladder paused until conditions calm down.",
    };
  }
  return {
    action: "rebuild",
    reason:
      "Price moved outside the active grid range, so the bot rebuilt a fresh spot grid around the new market area.",
  };
}

/**
 * Check bot-level trailing stop, stop loss, and take profit.
 * Returns a termination event if any threshold is hit, or null if the grid should keep running.
 */
function checkBotLevelStops(
  runtime: GridRuntimeState,
  currentPrice: number,
  timestamp: number,
): GridCycleEvent | null {
  const equity = getGridEquity(runtime, currentPrice);

  // Bot-level stop loss (price-based)
  if (runtime.stopLossPrice != null && currentPrice <= runtime.stopLossPrice) {
    return {
      type: "stop_loss_hit",
      runtime: {
        ...runtime,
        status: "stopped",
        levels: cloneLevels(runtime.levels),
        updatedAt: timestamp,
      },
      reason: `Bot stop loss triggered at ${currentPrice.toFixed(2)} (threshold: ${runtime.stopLossPrice.toFixed(2)}). Grid terminated to protect capital.`,
      timestamp,
    };
  }

  // Bot-level take profit (price-based)
  if (
    runtime.takeProfitPrice != null &&
    currentPrice >= runtime.takeProfitPrice
  ) {
    return {
      type: "take_profit_hit",
      runtime: {
        ...runtime,
        status: "stopped",
        levels: cloneLevels(runtime.levels),
        updatedAt: timestamp,
      },
      reason: `Bot take profit triggered at ${currentPrice.toFixed(2)} (threshold: ${runtime.takeProfitPrice.toFixed(2)}). Grid terminated with profit secured.`,
      timestamp,
    };
  }

  // Bot-level trailing stop (percentage-based on equity vs peak investment)
  if (runtime.trailingStopPct != null && runtime.trailingStopPct > 0) {
    const peakEquity = runtime.totalInvestment + runtime.cumulativeGridProfit;
    const drawdownPct =
      peakEquity > 0 ? ((peakEquity - equity) / peakEquity) * 100 : 0;
    if (drawdownPct >= runtime.trailingStopPct) {
      return {
        type: "trailing_stop_hit",
        runtime: {
          ...runtime,
          status: "stopped",
          levels: cloneLevels(runtime.levels),
          updatedAt: timestamp,
        },
        reason: `Bot trailing stop triggered. Equity drawdown ${drawdownPct.toFixed(1)}% exceeded ${runtime.trailingStopPct}% threshold. Grid terminated.`,
        timestamp,
      };
    }
  }

  return null;
}

function countFilledBuyLevels(levels: GridLevelState[]) {
  return levels.filter(
    (level) => level.side === "BUY" && level.status === "filled",
  ).length;
}

// ─── Active Positions Derivation ────────────────────────────────────────────

export function deriveGridActivePositions(
  runtime: GridRuntimeState,
): TradeIntent[] {
  const positions: TradeIntent[] = [];

  runtime.levels
    .filter(
      (level) =>
        level.side === "BUY" && level.status === "filled" && level.quantity > 0,
    )
    .forEach((buyLevel) => {
      const pairedSell = runtime.levels.find(
        (level) => level.id === buyLevel.pairedLevelId,
      );
      positions.push({
        agentId: runtime.agentId,
        intentId: `grid_${runtime.asset}_${buyLevel.id}`,
        artifactType: "TRADE_INTENT",
        side: "BUY",
        asset: runtime.asset,
        size: roundTo(buyLevel.quantity, 6),
        capitalAllocated: roundTo(buyLevel.quoteAllocated, 2),
        entryPrice: buyLevel.price,
        stopLoss: runtime.rangeLow,
        initialStopLoss: runtime.rangeLow,
        currentStopLoss: runtime.rangeLow,
        takeProfit: pairedSell?.price,
        trailingStopActive: false,
        profitProtected: 0,
        peakFavorablePrice: buyLevel.price,
        timestamp: buyLevel.lastFilledAt || runtime.lastRebuildAt,
        status: "OPEN",
        reason: "Grid leg filled inside the active spot range.",
        engine: "SPOT_GRID_BOT",
      });
    });

  return positions.sort((left, right) => right.timestamp - left.timestamp);
}

// ─── Main Evaluation Loop ───────────────────────────────────────────────────

export function evaluateSpotGridRuntime(params: {
  runtime: GridRuntimeState;
  marketData: MarketData;
  totalTreasury: number;
  maxOpenPositions: number;
  maxAllocationNotional: number;
  advisory?: GridAiAdvisory;
}): { runtime: GridRuntimeState; events: GridCycleEvent[] } {
  const {
    marketData,
    totalTreasury,
    maxOpenPositions,
    maxAllocationNotional,
    advisory,
  } = params;
  const timestamp = marketData.timestamp || Date.now();
  const runtime: GridRuntimeState = {
    ...params.runtime,
    levels: cloneLevels(params.runtime.levels),
    updatedAt: timestamp,
    // Backfill new fields for legacy runtimes
    configMode: params.runtime.configMode || "ai",
    totalInvestment:
      params.runtime.totalInvestment || params.runtime.capitalReserved,
    previouslyWithdrawn: params.runtime.previouslyWithdrawn || 0,
    profitableTradesCount: params.runtime.profitableTradesCount || 0,
    totalTradesCount: params.runtime.totalTradesCount || 0,
    configHistory: params.runtime.configHistory || [],
    startedAt: params.runtime.startedAt || params.runtime.lastRebuildAt,
  };
  const events: GridCycleEvent[] = [];
  const currentPrice = getGridPriceForAsset(runtime.asset, marketData);

  // If grid was already stopped (by SL/TP/trailing), don't process further
  if (runtime.status === "stopped") {
    return { runtime, events };
  }

  // Check bot-level stops first (trailing stop, SL, TP)
  const stopEvent = checkBotLevelStops(runtime, currentPrice, timestamp);
  if (stopEvent) {
    const stoppedRuntime = stopEvent.runtime as GridRuntimeState;
    events.push(stopEvent);
    return { runtime: stoppedRuntime, events };
  }

  // Out-of-range handling
  if (currentPrice < runtime.rangeLow || currentPrice > runtime.rangeHigh) {
    const outOfRangeDecision = getOutOfRangeDecision(runtime, marketData);

    if (outOfRangeDecision.action === "pause") {
      runtime.status = "paused";
      runtime.lastGridEventAt = timestamp;
      events.push({
        type: "paused",
        runtime: { ...runtime },
        reason: outOfRangeDecision.reason,
        timestamp,
      });
      return { runtime, events };
    }

    const slippageHaircut = 0.995;
    const quoteValue =
      runtime.availableQuote +
      runtime.heldBase * currentPrice * slippageHaircut;
    const nextCapitalReserved = roundTo(
      Math.min(
        maxAllocationNotional,
        Math.max(quoteValue, runtime.capitalReserved),
      ),
      2,
    );
    const rebuildAsset =
      runtime.heldBase === 0 && advisory?.recommendedAsset
        ? advisory.recommendedAsset
        : runtime.asset;
    const rebuiltRuntime = createSpotGridRuntime({
      agentId: runtime.agentId,
      marketData,
      capitalReserved: nextCapitalReserved,
      asset: rebuildAsset,
      advisory,
      timestamp,
    });
    // Carry forward accumulated state
    rebuiltRuntime.cumulativeGridProfit = runtime.cumulativeGridProfit;
    rebuiltRuntime.previouslyWithdrawn = runtime.previouslyWithdrawn;
    rebuiltRuntime.profitableTradesCount = runtime.profitableTradesCount;
    rebuiltRuntime.totalTradesCount = runtime.totalTradesCount;
    rebuiltRuntime.totalInvestment = runtime.totalInvestment;
    rebuiltRuntime.startedAt = runtime.startedAt;
    rebuiltRuntime.configHistory = [
      ...(runtime.configHistory || []),
      {
        rangeLow: rebuiltRuntime.rangeLow,
        rangeHigh: rebuiltRuntime.rangeHigh,
        gridLevels: rebuiltRuntime.gridLevels,
        trailingStopPct: runtime.trailingStopPct,
        stopLossPrice: runtime.stopLossPrice,
        takeProfitPrice: runtime.takeProfitPrice,
        timestamp,
        reason: "Auto-rebuilt after price moved outside range.",
      },
    ];
    // Carry forward bot-level stops
    rebuiltRuntime.trailingStopPct = runtime.trailingStopPct;
    rebuiltRuntime.stopLossPrice = runtime.stopLossPrice;
    rebuiltRuntime.takeProfitPrice = runtime.takeProfitPrice;
    rebuiltRuntime.trailingUpEnabled = runtime.trailingUpEnabled;
    rebuiltRuntime.trailingUpStopPrice = runtime.trailingUpStopPrice;
    rebuiltRuntime.status = "rebuilding";
    events.push({
      type: "rebuilt",
      runtime: rebuiltRuntime,
      reason: outOfRangeDecision.reason,
      timestamp,
    });
    return { runtime: rebuiltRuntime, events };
  }

  // AI advisory can pause the grid even when price is in range
  if (advisory && !advisory.shouldActivate && runtime.heldBase === 0) {
    runtime.status = "paused";
    runtime.lastGridEventAt = timestamp;
    events.push({
      type: "paused",
      runtime: { ...runtime },
      reason: `AI advisory paused the grid: ${advisory.reason}`,
      timestamp,
    });
    return { runtime, events };
  }

  // Don't resume a paused grid if volatility is still elevated
  if (
    runtime.status === "paused" &&
    shouldPauseGrid(runtime.asset, marketData)
  ) {
    runtime.lastGridEventAt = timestamp;
    events.push({
      type: "paused",
      runtime: { ...runtime },
      reason: "Grid remains paused — volatility is still elevated.",
      timestamp,
    });
    return { runtime, events };
  }

  runtime.status = "active";

  // Fill buy levels
  const buyLevels = runtime.levels
    .filter((level) => level.side === "BUY")
    .sort((left, right) => right.price - left.price);
  const sellLevels = runtime.levels
    .filter((level) => level.side === "SELL")
    .sort((left, right) => left.price - right.price);

  for (const buyLevel of buyLevels) {
    const currentOpenLegs = countFilledBuyLevels(runtime.levels);
    if (buyLevel.status !== "waiting") continue;
    if (currentPrice > buyLevel.price) continue;
    if (runtime.availableQuote < buyLevel.quoteAllocated) continue;
    if (currentOpenLegs >= maxOpenPositions) break;
    if (
      buyLevel.quoteAllocated > maxAllocationNotional ||
      buyLevel.quoteAllocated > totalTreasury
    )
      continue;

    const quantity = roundTo(buyLevel.quoteAllocated / buyLevel.price, 6);
    const pairedSell = runtime.levels.find(
      (level) => level.id === buyLevel.pairedLevelId,
    );
    if (!pairedSell) continue;

    buyLevel.status = "filled";
    buyLevel.quantity = quantity;
    buyLevel.lastFilledAt = timestamp;
    runtime.availableQuote = roundTo(
      runtime.availableQuote - buyLevel.quoteAllocated,
      2,
    );
    runtime.heldBase = roundTo(runtime.heldBase + quantity, 6);
    runtime.filledGridLegs = countFilledBuyLevels(runtime.levels);
    runtime.totalTradesCount += 1;

    pairedSell.status = "waiting";
    pairedSell.quantity = quantity;
    pairedSell.lastClosedAt = undefined;
    runtime.lastGridEventAt = timestamp;

    events.push({
      type: "buy_filled",
      runtime: { ...runtime, levels: cloneLevels(runtime.levels) },
      level: { ...buyLevel },
      reason: `Spot grid buy filled at ${buyLevel.price.toFixed(2)} and armed the paired sell one level higher.`,
      timestamp,
    });
  }

  // Fill sell levels
  for (const sellLevel of sellLevels) {
    if (sellLevel.status !== "waiting" || sellLevel.quantity <= 0) continue;
    if (currentPrice < sellLevel.price) continue;

    const pairedBuy = runtime.levels.find(
      (level) => level.id === sellLevel.pairedLevelId,
    );
    if (!pairedBuy || pairedBuy.status !== "filled") continue;

    const realizedProfit = roundTo(
      sellLevel.quantity * (sellLevel.price - pairedBuy.price),
      2,
    );
    runtime.availableQuote = roundTo(
      runtime.availableQuote + sellLevel.quantity * sellLevel.price,
      2,
    );
    runtime.heldBase = roundTo(
      Math.max(0, runtime.heldBase - sellLevel.quantity),
      6,
    );
    runtime.cumulativeGridProfit = roundTo(
      runtime.cumulativeGridProfit + realizedProfit,
      2,
    );
    runtime.lastGridEventAt = timestamp;
    runtime.totalTradesCount += 1;
    if (realizedProfit > 0) runtime.profitableTradesCount += 1;

    pairedBuy.status = "waiting";
    pairedBuy.quantity = 0;
    sellLevel.status = "closed";
    sellLevel.realizedProfit = roundTo(
      (sellLevel.realizedProfit || 0) + realizedProfit,
      2,
    );
    sellLevel.lastClosedAt = timestamp;
    sellLevel.quantity = 0;
    runtime.filledGridLegs = countFilledBuyLevels(runtime.levels);

    events.push({
      type: "sell_filled",
      runtime: { ...runtime, levels: cloneLevels(runtime.levels) },
      level: { ...sellLevel },
      pairedBuyLevel: { ...pairedBuy },
      realizedProfit,
      reason: `Spot grid sell filled at ${sellLevel.price.toFixed(2)} and captured ${realizedProfit.toFixed(2)} USD inside the active range.`,
      timestamp,
    });
  }

  return { runtime, events };
}
