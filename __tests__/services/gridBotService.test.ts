/**
 * Unit tests for src/services/gridBotService.ts
 *
 * Covers all exported functions: helpers, profit/APR calculations,
 * grid level building, runtime creation, initial market buy,
 * grid modification, withdrawal, active positions, and the main
 * evaluation loop.
 */
import { describe, it, expect } from "vitest";
import type { MarketData } from "../../src/services/marketService";
import type { GridRuntimeState, GridLevelState } from "../../src/lib/types";
import {
  GRID_TOTAL_LEVELS,
  getGridPriceForAsset,
  chooseSpotGridAsset,
  getSpotGridSpacingPct,
  getProfitPerGrid,
  getGridAPR,
  getTotalAPR,
  getGridEquity,
  getGridPnL,
  getGridPnLPct,
  getMaxWithdrawable,
  createSpotGridRuntime,
  performInitialMarketBuy,
  modifySpotGrid,
  withdrawFromGrid,
  deriveGridActivePositions,
  evaluateSpotGridRuntime,
  type GridAiAdvisory,
  type CreateGridParams,
} from "../../src/services/gridBotService";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMarketData(overrides?: {
  btcPrice?: number;
  btcChange?: number;
  ethPrice?: number;
  ethChange?: number;
  timestamp?: number;
}): MarketData {
  return {
    btc: {
      price: overrides?.btcPrice ?? 65000,
      change24h: overrides?.btcChange ?? 1.5,
    },
    eth: {
      price: overrides?.ethPrice ?? 2500,
      change24h: overrides?.ethChange ?? -0.5,
    },
    timestamp: overrides?.timestamp ?? 1000000,
  };
}

function makeRuntime(overrides?: Partial<GridRuntimeState>): GridRuntimeState {
  return {
    agentId: "agent-1",
    mode: "spot_grid_bot",
    status: "active",
    asset: "BTC",
    referencePrice: 65000,
    rangeLow: 60000,
    rangeHigh: 70000,
    gridLevels: 6,
    gridSpacingPct: 0.01,
    capitalReserved: 10000,
    availableQuote: 10000,
    heldBase: 0,
    filledGridLegs: 0,
    cumulativeGridProfit: 0,
    levels: [],
    lastRebuildAt: 1000000,
    lastGridEventAt: 1000000,
    updatedAt: 1000000,
    configMode: "ai",
    totalInvestment: 10000,
    previouslyWithdrawn: 0,
    profitableTradesCount: 0,
    totalTradesCount: 0,
    configHistory: [],
    startedAt: 1000000,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests — Constants & Helpers
// ---------------------------------------------------------------------------

describe("gridBotService", () => {
  describe("GRID_TOTAL_LEVELS", () => {
    it("should export a default grid level count", () => {
      expect(GRID_TOTAL_LEVELS).toBe(6);
    });
  });

  describe("getGridPriceForAsset", () => {
    it("should return BTC price for BTC asset", () => {
      const md = makeMarketData({ btcPrice: 64000 });
      expect(getGridPriceForAsset("BTC", md)).toBe(64000);
    });

    it("should return ETH price for ETH asset", () => {
      const md = makeMarketData({ ethPrice: 3100 });
      expect(getGridPriceForAsset("ETH", md)).toBe(3100);
    });
  });

  // ---------------------------------------------------------------------------
  // chooseSpotGridAsset
  // ---------------------------------------------------------------------------

  describe("chooseSpotGridAsset", () => {
    it("should use advisory recommendedAsset when provided", () => {
      const advisory: GridAiAdvisory = {
        recommendedAsset: "ETH",
        shouldActivate: true,
        spacingBias: "normal",
        reason: "test",
      };
      expect(chooseSpotGridAsset(makeMarketData(), advisory)).toBe("ETH");
    });

    it("should prefer lower-volatility asset when difference > 0.15", () => {
      // BTC volatility 0.5, ETH volatility 3.0 → BTC is lower
      const md = makeMarketData({ btcChange: 0.5, ethChange: 3.0 });
      expect(chooseSpotGridAsset(md)).toBe("BTC");
    });

    it("should prefer ETH when ETH volatility is lower", () => {
      const md = makeMarketData({ btcChange: 3.0, ethChange: 0.2 });
      expect(chooseSpotGridAsset(md)).toBe("ETH");
    });

    it("should use change24h tiebreaker when volatilities are close", () => {
      // Both ~1.0 volatility, difference ≤ 0.15 → pick the one with lower change24h
      const md = makeMarketData({ btcChange: -1.0, ethChange: 1.0 });
      // btcChange (-1.0) <= ethChange (1.0) → BTC
      expect(chooseSpotGridAsset(md)).toBe("BTC");
    });
  });

  // ---------------------------------------------------------------------------
  // getSpotGridSpacingPct
  // ---------------------------------------------------------------------------

  describe("getSpotGridSpacingPct", () => {
    it("should return a spacing percentage within valid bounds", () => {
      const md = makeMarketData({ btcChange: 1.5 });
      const spacing = getSpotGridSpacingPct("BTC", md);
      expect(spacing).toBeGreaterThanOrEqual(0.006);
      expect(spacing).toBeLessThanOrEqual(0.035);
    });

    it("should apply wider bias multiplier", () => {
      const md = makeMarketData({ btcChange: 1.5 });
      const normal = getSpotGridSpacingPct("BTC", md);
      const wider = getSpotGridSpacingPct("BTC", md, {
        recommendedAsset: "BTC",
        shouldActivate: true,
        spacingBias: "wider",
        reason: "test",
      });
      expect(wider).toBeGreaterThan(normal);
    });

    it("should apply tighter bias multiplier", () => {
      const md = makeMarketData({ btcChange: 1.5 });
      const normal = getSpotGridSpacingPct("BTC", md);
      const tighter = getSpotGridSpacingPct("BTC", md, {
        recommendedAsset: "BTC",
        shouldActivate: true,
        spacingBias: "tighter",
        reason: "test",
      });
      expect(tighter).toBeLessThan(normal);
    });

    it("should apply BTC asset multiplier (1.5x) vs ETH (1x)", () => {
      const md = makeMarketData({ btcChange: 1.0, ethChange: 1.0 });
      const btcSpacing = getSpotGridSpacingPct("BTC", md);
      const ethSpacing = getSpotGridSpacingPct("ETH", md);
      expect(btcSpacing).toBeGreaterThan(ethSpacing);
    });
  });

  // ---------------------------------------------------------------------------
  // Profit / APR Calculations
  // ---------------------------------------------------------------------------

  describe("getProfitPerGrid", () => {
    it("should return [0, 0] when gridLevels < 2", () => {
      expect(getProfitPerGrid(100, 200, 1)).toEqual([0, 0]);
    });

    it("should return [0, 0] when rangeLow <= 0", () => {
      expect(getProfitPerGrid(0, 200, 6)).toEqual([0, 0]);
    });

    it("should return [0, 0] when rangeHigh <= rangeLow", () => {
      expect(getProfitPerGrid(200, 100, 6)).toEqual([0, 0]);
    });

    it("should return a valid [low, high] profit range for valid inputs", () => {
      const [low, high] = getProfitPerGrid(60000, 70000, 6);
      expect(low).toBeGreaterThan(0);
      expect(high).toBeGreaterThanOrEqual(low);
    });
  });

  describe("getGridAPR", () => {
    it("should return 0 when totalInvestment <= 0", () => {
      expect(getGridAPR(100, 0, 1000000)).toBe(0);
    });

    it("should return 0 when gridProfit <= 0", () => {
      expect(getGridAPR(0, 10000, 1000000)).toBe(0);
    });

    it("should return 0 when elapsed time is <= 0", () => {
      const now = 1000000;
      expect(getGridAPR(100, 10000, now, now)).toBe(0);
    });

    it("should return 0 when elapsed time is less than ~1 hour", () => {
      const start = 1000000;
      const now = start + 30 * 60 * 1000; // 30 minutes
      expect(getGridAPR(100, 10000, start, now)).toBe(0);
    });

    it("should calculate positive APR for valid inputs over sufficient time", () => {
      const start = 0;
      const now = 365.25 * 24 * 60 * 60 * 1000; // exactly 1 year
      // 1000 profit on 10000 investment over 1 year = 10% APR
      expect(getGridAPR(1000, 10000, start, now)).toBe(10);
    });
  });

  describe("getTotalAPR", () => {
    it("should return 0 when totalInvestment <= 0", () => {
      expect(getTotalAPR(5000, 0, 1000000)).toBe(0);
    });

    it("should return 0 when elapsed time is 0", () => {
      const now = 1000000;
      expect(getTotalAPR(11000, 10000, now, now)).toBe(0);
    });

    it("should calculate APR based on equity vs investment", () => {
      const start = 0;
      const now = 365.25 * 24 * 60 * 60 * 1000; // 1 year
      // equity 11000, investment 10000 → PnL 1000 → 10% APR
      expect(getTotalAPR(11000, 10000, start, now)).toBe(10);
    });

    it("should return negative APR when equity < investment", () => {
      const start = 0;
      const now = 365.25 * 24 * 60 * 60 * 1000;
      expect(getTotalAPR(9000, 10000, start, now)).toBeLessThan(0);
    });
  });

  describe("getGridEquity", () => {
    it("should return availableQuote when heldBase is 0", () => {
      const rt = makeRuntime({ availableQuote: 5000, heldBase: 0 });
      expect(getGridEquity(rt, 65000)).toBe(5000);
    });

    it("should include heldBase value at current price", () => {
      const rt = makeRuntime({ availableQuote: 5000, heldBase: 0.1 });
      // 5000 + 0.1 * 65000 = 11500
      expect(getGridEquity(rt, 65000)).toBe(11500);
    });
  });

  describe("getGridPnL", () => {
    it("should return 0 when equity equals investment and no withdrawals", () => {
      const rt = makeRuntime({
        availableQuote: 10000,
        heldBase: 0,
        totalInvestment: 10000,
        previouslyWithdrawn: 0,
      });
      expect(getGridPnL(rt, 65000)).toBe(0);
    });

    it("should include previously withdrawn in PnL", () => {
      const rt = makeRuntime({
        availableQuote: 9000,
        heldBase: 0,
        totalInvestment: 10000,
        previouslyWithdrawn: 2000,
      });
      // equity=9000, PnL = 9000 - 10000 + 2000 = 1000
      expect(getGridPnL(rt, 65000)).toBe(1000);
    });
  });

  describe("getGridPnLPct", () => {
    it("should return 0 when totalInvestment <= 0", () => {
      const rt = makeRuntime({ totalInvestment: 0 });
      expect(getGridPnLPct(rt, 65000)).toBe(0);
    });

    it("should return correct percentage", () => {
      const rt = makeRuntime({
        availableQuote: 11000,
        heldBase: 0,
        totalInvestment: 10000,
        previouslyWithdrawn: 0,
      });
      // PnL = 1000, pct = 10%
      expect(getGridPnLPct(rt, 65000)).toBe(10);
    });
  });

  describe("getMaxWithdrawable", () => {
    it("should return 0 when no cumulative profit", () => {
      const rt = makeRuntime({ cumulativeGridProfit: 0 });
      expect(getMaxWithdrawable(rt)).toBe(0);
    });

    it("should subtract previously withdrawn from profit", () => {
      const rt = makeRuntime({
        cumulativeGridProfit: 500,
        previouslyWithdrawn: 200,
        availableQuote: 10000,
      });
      expect(getMaxWithdrawable(rt)).toBe(300);
    });

    it("should clamp to availableQuote", () => {
      const rt = makeRuntime({
        cumulativeGridProfit: 5000,
        previouslyWithdrawn: 0,
        availableQuote: 100,
      });
      expect(getMaxWithdrawable(rt)).toBe(100);
    });
  });

  // ---------------------------------------------------------------------------
  // createSpotGridRuntime
  // ---------------------------------------------------------------------------

  describe("createSpotGridRuntime", () => {
    it("should create a runtime with correct basic fields", () => {
      const params: CreateGridParams = {
        agentId: "agent-1",
        marketData: makeMarketData(),
        capitalReserved: 10000,
        timestamp: 5000,
      };
      const rt = createSpotGridRuntime(params);

      expect(rt.agentId).toBe("agent-1");
      expect(rt.mode).toBe("spot_grid_bot");
      expect(rt.status).toBe("active");
      expect(rt.capitalReserved).toBe(10000);
      expect(rt.availableQuote).toBe(10000);
      expect(rt.heldBase).toBe(0);
      expect(rt.totalInvestment).toBe(10000);
      expect(rt.previouslyWithdrawn).toBe(0);
      expect(rt.startedAt).toBe(5000);
    });

    it("should use AI config mode when no overrides", () => {
      const rt = createSpotGridRuntime({
        agentId: "a",
        marketData: makeMarketData(),
        capitalReserved: 1000,
      });
      expect(rt.configMode).toBe("ai");
    });

    it("should use manual config mode when overrides provided", () => {
      const rt = createSpotGridRuntime({
        agentId: "a",
        marketData: makeMarketData(),
        capitalReserved: 1000,
        overrides: { rangeLow: 60000, rangeHigh: 70000 },
      });
      expect(rt.configMode).toBe("manual");
    });

    it("should respect explicit configMode override", () => {
      const rt = createSpotGridRuntime({
        agentId: "a",
        marketData: makeMarketData(),
        capitalReserved: 1000,
        overrides: { rangeLow: 60000, rangeHigh: 70000, configMode: "ai" },
      });
      expect(rt.configMode).toBe("ai");
    });

    it("should use advisory-suggested range when provided", () => {
      const advisory: GridAiAdvisory = {
        recommendedAsset: "BTC",
        shouldActivate: true,
        spacingBias: "normal",
        reason: "test",
        suggestedRangeLow: 62000,
        suggestedRangeHigh: 68000,
      };
      const rt = createSpotGridRuntime({
        agentId: "a",
        marketData: makeMarketData(),
        capitalReserved: 5000,
        advisory,
      });
      expect(rt.rangeLow).toBe(62000);
      expect(rt.rangeHigh).toBe(68000);
    });

    it("should use override range over advisory range", () => {
      const advisory: GridAiAdvisory = {
        recommendedAsset: "BTC",
        shouldActivate: true,
        spacingBias: "normal",
        reason: "test",
        suggestedRangeLow: 62000,
        suggestedRangeHigh: 68000,
      };
      const rt = createSpotGridRuntime({
        agentId: "a",
        marketData: makeMarketData(),
        capitalReserved: 5000,
        advisory,
        overrides: { rangeLow: 55000, rangeHigh: 75000 },
      });
      expect(rt.rangeLow).toBe(55000);
      expect(rt.rangeHigh).toBe(75000);
    });

    it("should clamp grid levels to valid range", () => {
      const rt = createSpotGridRuntime({
        agentId: "a",
        marketData: makeMarketData(),
        capitalReserved: 1000,
        overrides: { rangeLow: 60000, rangeHigh: 70000, gridLevels: 100 },
      });
      expect(rt.gridLevels).toBeLessThanOrEqual(50);

      const rt2 = createSpotGridRuntime({
        agentId: "a",
        marketData: makeMarketData(),
        capitalReserved: 1000,
        overrides: { rangeLow: 60000, rangeHigh: 70000, gridLevels: 1 },
      });
      expect(rt2.gridLevels).toBeGreaterThanOrEqual(2);
    });

    it("should use advisory suggestedGridLevels", () => {
      const advisory: GridAiAdvisory = {
        recommendedAsset: "BTC",
        shouldActivate: true,
        spacingBias: "normal",
        reason: "test",
        suggestedRangeLow: 60000,
        suggestedRangeHigh: 70000,
        suggestedGridLevels: 10,
      };
      const rt = createSpotGridRuntime({
        agentId: "a",
        marketData: makeMarketData(),
        capitalReserved: 5000,
        advisory,
      });
      expect(rt.gridLevels).toBe(10);
    });

    it("should record initial config in configHistory", () => {
      const rt = createSpotGridRuntime({
        agentId: "a",
        marketData: makeMarketData(),
        capitalReserved: 1000,
        timestamp: 9999,
      });
      expect(rt.configHistory).toHaveLength(1);
      expect(rt.configHistory[0].timestamp).toBe(9999);
    });

    it("should apply bot-level stop overrides", () => {
      const rt = createSpotGridRuntime({
        agentId: "a",
        marketData: makeMarketData(),
        capitalReserved: 1000,
        overrides: {
          rangeLow: 60000,
          rangeHigh: 70000,
          trailingStopPct: 5,
          stopLossPrice: 58000,
          takeProfitPrice: 72000,
        },
      });
      expect(rt.trailingStopPct).toBe(5);
      expect(rt.stopLossPrice).toBe(58000);
      expect(rt.takeProfitPrice).toBe(72000);
    });
  });

  // ---------------------------------------------------------------------------
  // buildGridLevelsFromRange — natural buy/sell split (the changed behavior)
  // ---------------------------------------------------------------------------

  describe("buildGridLevelsFromRange (via createSpotGridRuntime)", () => {
    it("should split levels naturally based on current price position", () => {
      // Price near the bottom of range → more sells than buys
      const rt = createSpotGridRuntime({
        agentId: "a",
        marketData: makeMarketData({ btcPrice: 61000 }),
        capitalReserved: 5000,
        overrides: { rangeLow: 60000, rangeHigh: 70000, gridLevels: 8 },
      });

      const buys = rt.levels.filter((l) => l.side === "BUY");
      const sells = rt.levels.filter((l) => l.side === "SELL");

      // With price near bottom, most levels should be above → more sells
      expect(sells.length).toBeGreaterThan(buys.length);
    });

    it("should have more buys when price is near the top of range", () => {
      // Price at 68000 in 60000-70000 range → most levels below price → more buys
      const rt = createSpotGridRuntime({
        agentId: "a",
        marketData: makeMarketData({ btcPrice: 68000 }),
        capitalReserved: 5000,
        asset: "BTC",
        overrides: { rangeLow: 60000, rangeHigh: 70000, gridLevels: 10 },
      });

      const buys = rt.levels.filter((l) => l.side === "BUY");
      const sells = rt.levels.filter((l) => l.side === "SELL");

      expect(buys.length).toBeGreaterThan(sells.length);
    });

    it("should not force-balance buy/sell counts", () => {
      // Price at 25% of range → ~75% of levels should be sells
      const rt = createSpotGridRuntime({
        agentId: "a",
        marketData: makeMarketData({ btcPrice: 62000 }),
        capitalReserved: 5000,
        overrides: { rangeLow: 60000, rangeHigh: 70000, gridLevels: 10 },
      });

      const buys = rt.levels.filter((l) => l.side === "BUY");
      const sells = rt.levels.filter((l) => l.side === "SELL");

      // The difference can be more than 1 (no balancing)
      expect(buys.length + sells.length).toBe(10);
      // With price at 62000 in 60000-70000 range, most levels are above → sells dominate
      expect(sells.length).toBeGreaterThanOrEqual(buys.length + 2);
    });

    it("should place buy levels below current price and sell levels at or above", () => {
      const currentPrice = 65000;
      const rt = createSpotGridRuntime({
        agentId: "a",
        marketData: makeMarketData({ btcPrice: currentPrice }),
        capitalReserved: 5000,
        asset: "BTC",
        overrides: { rangeLow: 60000, rangeHigh: 70000, gridLevels: 6 },
      });

      const buys = rt.levels.filter((l) => l.side === "BUY");
      const sells = rt.levels.filter((l) => l.side === "SELL");

      // Buy levels should be below current price
      for (const b of buys) {
        expect(b.price).toBeLessThan(currentPrice);
      }
      // Sell levels should be at or above current price (the filter uses p >= currentPrice)
      for (const s of sells) {
        expect(s.price).toBeGreaterThanOrEqual(currentPrice);
      }
    });

    it("should allocate capital evenly across buy levels only", () => {
      const rt = createSpotGridRuntime({
        agentId: "a",
        marketData: makeMarketData({ btcPrice: 65000 }),
        capitalReserved: 6000,
        overrides: { rangeLow: 60000, rangeHigh: 70000, gridLevels: 6 },
      });

      const buys = rt.levels.filter((l) => l.side === "BUY");
      const sells = rt.levels.filter((l) => l.side === "SELL");

      if (buys.length > 0) {
        const expectedPerLevel = 6000 / buys.length;
        for (const b of buys) {
          expect(b.quoteAllocated).toBeCloseTo(expectedPerLevel, 0);
        }
      }

      // Sell levels should have 0 quote allocated
      for (const s of sells) {
        expect(s.quoteAllocated).toBe(0);
      }
    });

    it("should set buy levels to waiting and sell levels to closed initially", () => {
      const rt = createSpotGridRuntime({
        agentId: "a",
        marketData: makeMarketData({ btcPrice: 65000 }),
        capitalReserved: 5000,
        overrides: { rangeLow: 60000, rangeHigh: 70000, gridLevels: 6 },
      });

      const buys = rt.levels.filter((l) => l.side === "BUY");
      const sells = rt.levels.filter((l) => l.side === "SELL");

      for (const b of buys) expect(b.status).toBe("waiting");
      for (const s of sells) expect(s.status).toBe("closed");
    });
  });

  // ---------------------------------------------------------------------------
  // performInitialMarketBuy
  // ---------------------------------------------------------------------------

  describe("performInitialMarketBuy", () => {
    it("should arm the closest sell level above current price", () => {
      const rt = createSpotGridRuntime({
        agentId: "a",
        marketData: makeMarketData({ btcPrice: 65000 }),
        capitalReserved: 6000,
        asset: "BTC",
        overrides: { rangeLow: 60000, rangeHigh: 70000, gridLevels: 6 },
        timestamp: 1000,
      });

      const result = performInitialMarketBuy(rt, 65000, 2000);

      // Should arm exactly 1 sell level
      expect(result.armedSells).toHaveLength(1);
      expect(result.filledBuys).toHaveLength(1);

      // The armed sell should be the lowest sell above current price
      const sellPrices = rt.levels
        .filter((l) => l.side === "SELL" && l.price > 65000)
        .map((l) => l.price)
        .sort((a, b) => a - b);
      if (sellPrices.length > 0) {
        expect(result.armedSells[0].price).toBe(sellPrices[0]);
      }
    });

    it("should reduce availableQuote and increase heldBase", () => {
      const rt = createSpotGridRuntime({
        agentId: "a",
        marketData: makeMarketData({ btcPrice: 65000 }),
        capitalReserved: 6000,
        overrides: { rangeLow: 60000, rangeHigh: 70000, gridLevels: 6 },
        timestamp: 1000,
      });

      const before = rt.availableQuote;
      const result = performInitialMarketBuy(rt, 65000, 2000);

      if (result.filledBuys.length > 0) {
        expect(result.runtime.availableQuote).toBeLessThan(before);
        expect(result.runtime.heldBase).toBeGreaterThan(0);
      }
    });

    it("should increment totalTradesCount", () => {
      const rt = createSpotGridRuntime({
        agentId: "a",
        marketData: makeMarketData({ btcPrice: 65000 }),
        capitalReserved: 6000,
        overrides: { rangeLow: 60000, rangeHigh: 70000, gridLevels: 6 },
        timestamp: 1000,
      });

      const result = performInitialMarketBuy(rt, 65000, 2000);
      expect(result.runtime.totalTradesCount).toBe(
        rt.totalTradesCount + result.filledBuys.length,
      );
    });

    it("should not arm sells when no sell levels are above current price", () => {
      // Price above all levels
      const rt = createSpotGridRuntime({
        agentId: "a",
        marketData: makeMarketData({ btcPrice: 71000 }),
        capitalReserved: 6000,
        overrides: { rangeLow: 60000, rangeHigh: 70000, gridLevels: 6 },
        timestamp: 1000,
      });

      const result = performInitialMarketBuy(rt, 71000, 2000);
      expect(result.armedSells).toHaveLength(0);
      expect(result.filledBuys).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // modifySpotGrid
  // ---------------------------------------------------------------------------

  describe("modifySpotGrid", () => {
    it("should rebuild levels when range changes", () => {
      const rt = createSpotGridRuntime({
        agentId: "a",
        marketData: makeMarketData({ btcPrice: 65000 }),
        capitalReserved: 5000,
        overrides: { rangeLow: 60000, rangeHigh: 70000, gridLevels: 6 },
        timestamp: 1000,
      });

      const { runtime, event } = modifySpotGrid(
        rt,
        { rangeLow: 58000, rangeHigh: 72000 },
        makeMarketData({ btcPrice: 65000 }),
        2000,
      );

      expect(runtime.rangeLow).toBe(58000);
      expect(runtime.rangeHigh).toBe(72000);
      expect(event.type).toBe("modified");
      expect(event.reason).toContain("Range:");
    });

    it("should rebuild levels when grid count changes", () => {
      const rt = createSpotGridRuntime({
        agentId: "a",
        marketData: makeMarketData({ btcPrice: 65000 }),
        capitalReserved: 5000,
        overrides: { rangeLow: 60000, rangeHigh: 70000, gridLevels: 6 },
        timestamp: 1000,
      });

      const { runtime } = modifySpotGrid(
        rt,
        { gridLevels: 10 },
        makeMarketData({ btcPrice: 65000 }),
        2000,
      );

      expect(runtime.gridLevels).toBe(10);
    });

    it("should apply non-structural modifications without rebuilding levels", () => {
      const rt = createSpotGridRuntime({
        agentId: "a",
        marketData: makeMarketData({ btcPrice: 65000 }),
        capitalReserved: 5000,
        overrides: { rangeLow: 60000, rangeHigh: 70000, gridLevels: 6 },
        timestamp: 1000,
      });
      const originalLevels = rt.levels.length;

      const { runtime, event } = modifySpotGrid(
        rt,
        { trailingStopPct: 3, stopLossPrice: 57000, takeProfitPrice: 73000 },
        makeMarketData({ btcPrice: 65000 }),
        2000,
      );

      expect(runtime.trailingStopPct).toBe(3);
      expect(runtime.stopLossPrice).toBe(57000);
      expect(runtime.takeProfitPrice).toBe(73000);
      expect(runtime.levels.length).toBe(originalLevels);
      expect(event.reason).toContain("Trailing stop:");
    });

    it("should append to configHistory", () => {
      const rt = createSpotGridRuntime({
        agentId: "a",
        marketData: makeMarketData({ btcPrice: 65000 }),
        capitalReserved: 5000,
        overrides: { rangeLow: 60000, rangeHigh: 70000, gridLevels: 6 },
        timestamp: 1000,
      });

      const { runtime } = modifySpotGrid(
        rt,
        { rangeLow: 58000 },
        makeMarketData({ btcPrice: 65000 }),
        2000,
      );

      expect(runtime.configHistory.length).toBe(rt.configHistory.length + 1);
    });
  });

  // ---------------------------------------------------------------------------
  // withdrawFromGrid
  // ---------------------------------------------------------------------------

  describe("withdrawFromGrid", () => {
    it("should return null when amount <= 0", () => {
      const rt = makeRuntime({
        cumulativeGridProfit: 500,
        availableQuote: 500,
      });
      expect(withdrawFromGrid(rt, 0)).toBeNull();
    });

    it("should return null when amount exceeds max withdrawable", () => {
      const rt = makeRuntime({
        cumulativeGridProfit: 100,
        previouslyWithdrawn: 0,
        availableQuote: 10000,
      });
      expect(withdrawFromGrid(rt, 200)).toBeNull();
    });

    it("should reduce availableQuote and increase previouslyWithdrawn", () => {
      const rt = makeRuntime({
        cumulativeGridProfit: 500,
        previouslyWithdrawn: 0,
        availableQuote: 10000,
        capitalReserved: 10000,
      });

      const result = withdrawFromGrid(rt, 300, 5000);
      expect(result).not.toBeNull();
      expect(result!.runtime.availableQuote).toBe(9700);
      expect(result!.runtime.previouslyWithdrawn).toBe(300);
      expect(result!.event.type).toBe("withdrawn");
      expect(result!.event.amount).toBe(300);
    });

    it("should reduce capitalReserved", () => {
      const rt = makeRuntime({
        cumulativeGridProfit: 500,
        previouslyWithdrawn: 0,
        availableQuote: 10000,
        capitalReserved: 10000,
      });

      const result = withdrawFromGrid(rt, 300, 5000);
      expect(result!.runtime.capitalReserved).toBe(9700);
    });
  });

  // ---------------------------------------------------------------------------
  // deriveGridActivePositions
  // ---------------------------------------------------------------------------

  describe("deriveGridActivePositions", () => {
    it("should return empty array when no filled buy levels", () => {
      const rt = makeRuntime({
        levels: [
          {
            id: "buy_1",
            side: "BUY",
            price: 64000,
            status: "waiting",
            quantity: 0,
            quoteAllocated: 1000,
          },
        ],
      });
      expect(deriveGridActivePositions(rt)).toHaveLength(0);
    });

    it("should return positions for filled buy levels with quantity > 0", () => {
      const rt = makeRuntime({
        levels: [
          {
            id: "buy_1",
            side: "BUY",
            price: 64000,
            status: "filled",
            quantity: 0.1,
            quoteAllocated: 6400,
            pairedLevelId: "sell_1",
            lastFilledAt: 2000,
          },
          {
            id: "sell_1",
            side: "SELL",
            price: 66000,
            status: "waiting",
            quantity: 0.1,
            quoteAllocated: 0,
            pairedLevelId: "buy_1",
          },
        ],
      });

      const positions = deriveGridActivePositions(rt);
      expect(positions).toHaveLength(1);
      expect(positions[0].side).toBe("BUY");
      expect(positions[0].asset).toBe("BTC");
      expect(positions[0].entryPrice).toBe(64000);
      expect(positions[0].takeProfit).toBe(66000);
      expect(positions[0].engine).toBe("SPOT_GRID_BOT");
    });

    it("should sort positions by timestamp descending", () => {
      const rt = makeRuntime({
        levels: [
          {
            id: "buy_1",
            side: "BUY",
            price: 64000,
            status: "filled",
            quantity: 0.1,
            quoteAllocated: 6400,
            pairedLevelId: "sell_1",
            lastFilledAt: 1000,
          },
          {
            id: "buy_2",
            side: "BUY",
            price: 63000,
            status: "filled",
            quantity: 0.1,
            quoteAllocated: 6300,
            pairedLevelId: "sell_2",
            lastFilledAt: 3000,
          },
          {
            id: "sell_1",
            side: "SELL",
            price: 66000,
            status: "waiting",
            quantity: 0.1,
            quoteAllocated: 0,
            pairedLevelId: "buy_1",
          },
          {
            id: "sell_2",
            side: "SELL",
            price: 67000,
            status: "waiting",
            quantity: 0.1,
            quoteAllocated: 0,
            pairedLevelId: "buy_2",
          },
        ],
      });

      const positions = deriveGridActivePositions(rt);
      expect(positions).toHaveLength(2);
      expect(positions[0].timestamp).toBeGreaterThan(positions[1].timestamp);
    });
  });

  // ---------------------------------------------------------------------------
  // evaluateSpotGridRuntime
  // ---------------------------------------------------------------------------

  describe("evaluateSpotGridRuntime", () => {
    function makeEvalParams(
      runtimeOverrides?: Partial<GridRuntimeState>,
      marketOverrides?: Parameters<typeof makeMarketData>[0],
    ) {
      const md = makeMarketData(marketOverrides);
      const rt = createSpotGridRuntime({
        agentId: "agent-1",
        marketData: md,
        capitalReserved: 10000,
        asset: "BTC",
        overrides: { rangeLow: 60000, rangeHigh: 70000, gridLevels: 6 },
        timestamp: 1000,
      });
      return {
        runtime: { ...rt, ...runtimeOverrides },
        marketData: md,
        totalTreasury: 50000,
        maxOpenPositions: 10,
        maxAllocationNotional: 20000,
      };
    }

    it("should return immediately for stopped grids", () => {
      const params = makeEvalParams({ status: "stopped" });
      const { runtime, events } = evaluateSpotGridRuntime(params);
      expect(runtime.status).toBe("stopped");
      expect(events).toHaveLength(0);
    });

    it("should trigger stop_loss_hit when price <= stopLossPrice", () => {
      const params = makeEvalParams(
        { stopLossPrice: 59000 },
        { btcPrice: 58000 },
      );
      const { runtime, events } = evaluateSpotGridRuntime(params);
      expect(runtime.status).toBe("stopped");
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("stop_loss_hit");
    });

    it("should trigger take_profit_hit when price >= takeProfitPrice", () => {
      const params = makeEvalParams(
        { takeProfitPrice: 71000 },
        { btcPrice: 72000 },
      );
      const { runtime, events } = evaluateSpotGridRuntime(params);
      expect(runtime.status).toBe("stopped");
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("take_profit_hit");
    });

    it("should trigger trailing_stop_hit when drawdown exceeds threshold", () => {
      const params = makeEvalParams(
        {
          trailingStopPct: 5,
          totalInvestment: 10000,
          cumulativeGridProfit: 0,
          availableQuote: 5000,
          heldBase: 0.05,
        },
        { btcPrice: 65000 },
      );
      // equity = 5000 + 0.05*65000 = 8250
      // peakEquity = 10000 + 0 = 10000
      // drawdown = (10000-8250)/10000 * 100 = 17.5% > 5%
      const { runtime, events } = evaluateSpotGridRuntime(params);
      expect(runtime.status).toBe("stopped");
      expect(events[0].type).toBe("trailing_stop_hit");
    });

    it("should pause when price is out of range and volatility is high", () => {
      const params = makeEvalParams(
        {},
        { btcPrice: 55000, btcChange: 4.0 }, // below rangeLow, high volatility
      );
      const { runtime, events } = evaluateSpotGridRuntime(params);
      expect(runtime.status).toBe("paused");
      expect(events[0].type).toBe("paused");
    });

    it("should rebuild when price is out of range with low volatility and no held base", () => {
      const params = makeEvalParams(
        { heldBase: 0 },
        { btcPrice: 55000, btcChange: 1.0 }, // below rangeLow, low volatility
      );
      const { runtime, events } = evaluateSpotGridRuntime(params);
      expect(runtime.status).toBe("rebuilding");
      expect(events[0].type).toBe("rebuilt");
    });

    it("should pause when AI advisory says shouldActivate=false and no held base", () => {
      const params = {
        ...makeEvalParams({}, { btcPrice: 65000 }),
        advisory: {
          recommendedAsset: "BTC" as const,
          shouldActivate: false,
          spacingBias: "normal" as const,
          reason: "Market too uncertain",
        },
      };
      // Ensure heldBase is 0 so advisory pause kicks in
      params.runtime.heldBase = 0;
      const { runtime, events } = evaluateSpotGridRuntime(params);
      expect(runtime.status).toBe("paused");
      expect(events[0].type).toBe("paused");
      expect(events[0].reason).toContain("AI advisory");
    });

    it("should fill buy levels when price drops to buy level", () => {
      const md = makeMarketData({ btcPrice: 62000 });
      const rt = createSpotGridRuntime({
        agentId: "agent-1",
        marketData: makeMarketData({ btcPrice: 65000 }),
        capitalReserved: 10000,
        overrides: { rangeLow: 60000, rangeHigh: 70000, gridLevels: 6 },
        timestamp: 1000,
      });

      // Find a buy level that the price of 62000 would trigger
      const buyLevels = rt.levels.filter(
        (l) => l.side === "BUY" && l.price >= 62000,
      );

      if (buyLevels.length > 0) {
        const { events } = evaluateSpotGridRuntime({
          runtime: rt,
          marketData: md,
          totalTreasury: 50000,
          maxOpenPositions: 10,
          maxAllocationNotional: 20000,
        });

        const buyFills = events.filter((e) => e.type === "buy_filled");
        expect(buyFills.length).toBeGreaterThan(0);
      }
    });

    it("should fill sell levels when price rises to sell level", () => {
      const md = makeMarketData({ btcPrice: 65000 });
      const rt = createSpotGridRuntime({
        agentId: "agent-1",
        marketData: md,
        capitalReserved: 10000,
        overrides: { rangeLow: 60000, rangeHigh: 70000, gridLevels: 6 },
        timestamp: 1000,
      });

      // First do initial market buy to arm a sell
      const { runtime: rtWithBuy } = performInitialMarketBuy(rt, 65000, 1500);

      // Now raise price to trigger the armed sell
      const highMd = makeMarketData({ btcPrice: 68000, timestamp: 2000 });
      const armedSells = rtWithBuy.levels.filter(
        (l) => l.side === "SELL" && l.status === "waiting" && l.quantity > 0,
      );

      if (armedSells.length > 0 && armedSells[0].price <= 68000) {
        const { events } = evaluateSpotGridRuntime({
          runtime: rtWithBuy,
          marketData: highMd,
          totalTreasury: 50000,
          maxOpenPositions: 10,
          maxAllocationNotional: 20000,
        });

        const sellFills = events.filter((e) => e.type === "sell_filled");
        expect(sellFills.length).toBeGreaterThan(0);
      }
    });

    it("should remain paused when volatility is still elevated", () => {
      const params = makeEvalParams(
        { status: "paused" },
        { btcPrice: 65000, btcChange: 4.0 }, // high volatility
      );
      const { runtime, events } = evaluateSpotGridRuntime(params);
      expect(runtime.status).toBe("paused");
      expect(events[0].type).toBe("paused");
      expect(events[0].reason).toContain("still elevated");
    });

    it("should resume to active when paused grid has calmed volatility", () => {
      const params = makeEvalParams(
        { status: "paused" },
        { btcPrice: 65000, btcChange: 1.0 }, // low volatility
      );
      const { runtime } = evaluateSpotGridRuntime(params);
      expect(runtime.status).toBe("active");
    });

    it("should carry forward accumulated state on rebuild", () => {
      const params = makeEvalParams(
        {
          heldBase: 0,
          cumulativeGridProfit: 500,
          previouslyWithdrawn: 100,
          profitableTradesCount: 5,
          totalTradesCount: 12,
          totalInvestment: 10000,
          startedAt: 500,
        },
        { btcPrice: 55000, btcChange: 1.0 }, // out of range, low volatility
      );

      const { runtime } = evaluateSpotGridRuntime(params);
      expect(runtime.cumulativeGridProfit).toBe(500);
      expect(runtime.previouslyWithdrawn).toBe(100);
      expect(runtime.profitableTradesCount).toBe(5);
      expect(runtime.totalTradesCount).toBe(12);
      expect(runtime.totalInvestment).toBe(10000);
      expect(runtime.startedAt).toBe(500);
    });
  });
});
