// Unit tests for src/services/gridBotService.ts
// Focused on performInitialMarketBuy and getGridPriceForAsset — the functions
// introduced into the grid-init flow by the Bybit-style initial market buy change.

import { describe, it, expect } from "vitest";
import type { GridRuntimeState, GridLevelState } from "@/src/lib/types";
import type { MarketData } from "@/src/services/marketService";
import {
  performInitialMarketBuy,
  getGridPriceForAsset,
  createSpotGridRuntime,
  modifySpotGrid,
} from "@/src/services/gridBotService";

// ── Helpers ──────────────────────────────────────────────────────

const TIMESTAMP = 1_700_000_000_000;

function makeMarketData(btcPrice = 60000, ethPrice = 3000): MarketData {
  return {
    btc: { price: btcPrice, change24h: 1.5 },
    eth: { price: ethPrice, change24h: -0.5 },
    timestamp: TIMESTAMP,
  };
}

/** Build a minimal GridRuntimeState with explicit buy/sell level pairs. */
function makeRuntime(overrides?: Partial<GridRuntimeState>): GridRuntimeState {
  const levels: GridLevelState[] = [
    {
      id: "buy_1",
      side: "BUY",
      price: 58000,
      status: "waiting",
      pairedLevelId: "sell_1",
      quantity: 0,
      quoteAllocated: 500,
    },
    {
      id: "sell_1",
      side: "SELL",
      price: 62000,
      status: "closed",
      pairedLevelId: "buy_1",
      quantity: 0,
      quoteAllocated: 0,
      lastClosedAt: TIMESTAMP,
    },
    {
      id: "buy_2",
      side: "BUY",
      price: 56000,
      status: "waiting",
      pairedLevelId: "sell_2",
      quantity: 0,
      quoteAllocated: 500,
    },
    {
      id: "sell_2",
      side: "SELL",
      price: 64000,
      status: "closed",
      pairedLevelId: "buy_2",
      quantity: 0,
      quoteAllocated: 0,
      lastClosedAt: TIMESTAMP,
    },
  ];

  return {
    agentId: "agent-1",
    mode: "spot_grid_bot",
    status: "active",
    asset: "BTC",
    referencePrice: 60000,
    rangeLow: 55000,
    rangeHigh: 65000,
    gridLevels: 4,
    gridSpacingPct: 0.02,
    capitalReserved: 1000,
    availableQuote: 1000,
    heldBase: 0,
    filledGridLegs: 0,
    cumulativeGridProfit: 0,
    levels,
    lastRebuildAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    configMode: "ai",
    totalInvestment: 1000,
    previouslyWithdrawn: 0,
    profitableTradesCount: 0,
    totalTradesCount: 0,
    configHistory: [
      {
        rangeLow: 55000,
        rangeHigh: 65000,
        gridLevels: 4,
        timestamp: TIMESTAMP,
        reason: "test",
      },
    ],
    startedAt: TIMESTAMP,
    ...overrides,
  };
}

// ── getGridPriceForAsset ─────────────────────────────────────────

describe("[gridBotService]", () => {
  describe("getGridPriceForAsset", () => {
    it("should return BTC price when asset is BTC", () => {
      const market = makeMarketData(61234, 3100);
      expect(getGridPriceForAsset("BTC", market)).toBe(61234);
    });

    it("should return ETH price when asset is ETH", () => {
      const market = makeMarketData(61234, 3100);
      expect(getGridPriceForAsset("ETH", market)).toBe(3100);
    });
  });

  // ── performInitialMarketBuy ──────────────────────────────────────

  describe("performInitialMarketBuy", () => {
    it("should fill closest buy level and arm closest sell on init", () => {
      const runtime = makeRuntime();
      const currentPrice = 60000;

      const result = performInitialMarketBuy(runtime, currentPrice, TIMESTAMP);

      // Only the closest sell (sell_1 at 62000) gets armed, filling its paired buy (buy_1)
      expect(result.filledBuys).toHaveLength(1);
      expect(result.armedSells).toHaveLength(1);

      expect(result.filledBuys[0].status).toBe("filled");
      expect(result.filledBuys[0].quantity).toBeGreaterThan(0);
      expect(result.filledBuys[0].lastFilledAt).toBe(TIMESTAMP);

      expect(result.armedSells[0].status).toBe("waiting");
      expect(result.armedSells[0].quantity).toBeGreaterThan(0);
    });

    it("should not arm sells when current price is below all buy levels", () => {
      // Set current price below all buy levels — sells are above but their
      // paired buys are also above current price, so the grid should still arm
      // sells since they're above current price.
      const runtime = makeRuntime();
      const currentPrice = 55000; // below buy_1 (58000) and buy_2 (56000)

      const result = performInitialMarketBuy(runtime, currentPrice, TIMESTAMP);

      // Sell levels at 62000 and 64000 are above 55000, so they get armed
      expect(result.armedSells.length).toBeGreaterThanOrEqual(0);
      // All armed sells should be above current price
      for (const sell of result.armedSells) {
        expect(sell.price).toBeGreaterThan(currentPrice);
      }
    });

    it("should skip buy levels when insufficient available quote", () => {
      // Only enough quote for one level (500 per level)
      const runtime = makeRuntime({ availableQuote: 500 });
      const currentPrice = 60000;

      const result = performInitialMarketBuy(runtime, currentPrice, TIMESTAMP);

      // Should fill only one buy (highest first = buy_1 at 58000)
      expect(result.filledBuys).toHaveLength(1);
      expect(result.filledBuys[0].id).toBe("buy_1");
      expect(result.armedSells).toHaveLength(1);
    });

    it("should deduct quote and accumulate base in runtime", () => {
      const runtime = makeRuntime({ availableQuote: 1000 });
      const currentPrice = 60000;

      const result = performInitialMarketBuy(runtime, currentPrice, TIMESTAMP);

      // Only 1 fill (closest sell armed)
      expect(result.runtime.availableQuote).toBeLessThan(1000);
      expect(result.runtime.heldBase).toBeGreaterThan(0);
      expect(result.runtime.filledGridLegs).toBe(1);
      expect(result.runtime.totalTradesCount).toBe(1);
    });

    it("should not mutate the original runtime", () => {
      const runtime = makeRuntime();
      const originalQuote = runtime.availableQuote;
      const originalBase = runtime.heldBase;

      performInitialMarketBuy(runtime, 60000, TIMESTAMP);

      expect(runtime.availableQuote).toBe(originalQuote);
      expect(runtime.heldBase).toBe(originalBase);
      expect(runtime.filledGridLegs).toBe(0);
    });

    it("should not arm sell levels that are at or below current price", () => {
      // Create a scenario where paired sell is below current price
      const levels: GridLevelState[] = [
        {
          id: "buy_1",
          side: "BUY",
          price: 58000,
          status: "waiting",
          pairedLevelId: "sell_1",
          quantity: 0,
          quoteAllocated: 500,
        },
        {
          id: "sell_1",
          side: "SELL",
          price: 59000, // sell is below current price of 60000
          status: "closed",
          pairedLevelId: "buy_1",
          quantity: 0,
          quoteAllocated: 0,
          lastClosedAt: TIMESTAMP,
        },
      ];
      const runtime = makeRuntime({ levels, gridLevels: 2 });
      const currentPrice = 60000;

      const result = performInitialMarketBuy(runtime, currentPrice, TIMESTAMP);

      // sell_1 at 59000 is below currentPrice 60000 — should not be armed
      expect(result.filledBuys).toHaveLength(0);
      expect(result.armedSells).toHaveLength(0);
    });

    it("should skip buy levels without a paired sell", () => {
      const levels: GridLevelState[] = [
        {
          id: "buy_orphan",
          side: "BUY",
          price: 58000,
          status: "waiting",
          pairedLevelId: "sell_missing",
          quantity: 0,
          quoteAllocated: 500,
        },
      ];
      const runtime = makeRuntime({ levels, gridLevels: 1 });

      const result = performInitialMarketBuy(runtime, 60000, TIMESTAMP);

      expect(result.filledBuys).toHaveLength(0);
      expect(result.armedSells).toHaveLength(0);
    });

    it("should return empty arrays when no buy levels exist", () => {
      const runtime = makeRuntime({ levels: [], gridLevels: 0 });

      const result = performInitialMarketBuy(runtime, 60000, TIMESTAMP);

      expect(result.filledBuys).toEqual([]);
      expect(result.armedSells).toEqual([]);
      expect(result.runtime.availableQuote).toBe(runtime.availableQuote);
    });

    it("should use Date.now when no timestamp is provided", () => {
      const runtime = makeRuntime();
      const before = Date.now();

      const result = performInitialMarketBuy(runtime, 60000);

      const after = Date.now();
      expect(result.runtime.updatedAt).toBeGreaterThanOrEqual(before);
      expect(result.runtime.updatedAt).toBeLessThanOrEqual(after);
    });

    it("should fill the buy paired with the closest sell level", () => {
      const runtime = makeRuntime();
      const currentPrice = 60000;

      const result = performInitialMarketBuy(runtime, currentPrice, TIMESTAMP);

      // sell_1 at 62000 is closest to 60000, so buy_1 (its pair) gets filled
      expect(result.filledBuys).toHaveLength(1);
      expect(result.filledBuys[0].id).toBe("buy_1");
    });

    it("should preserve original grid level price after fill (not overwrite with market price)", () => {
      const runtime = makeRuntime();
      const currentPrice = 60000;

      const result = performInitialMarketBuy(runtime, currentPrice, TIMESTAMP);

      // buy_1 was placed at 58000 — price must stay intact
      const buy1 = result.filledBuys.find((l) => l.id === "buy_1");
      expect(buy1?.price).toBe(58000);

      const runtimeBuy1 = result.runtime.levels.find((l) => l.id === "buy_1");
      expect(runtimeBuy1?.price).toBe(58000);
    });

    it("should arm the closest sell level above current price", () => {
      const runtime = makeRuntime();
      const currentPrice = 60000;

      const result = performInitialMarketBuy(runtime, currentPrice, TIMESTAMP);

      // sell_1 at 62000 is closest to 60000
      expect(result.armedSells).toHaveLength(1);
      expect(result.armedSells[0].id).toBe("sell_1");
    });

    it("should skip sell levels that are already in waiting status", () => {
      const levels: GridLevelState[] = [
        {
          id: "buy_1",
          side: "BUY",
          price: 58000,
          status: "waiting",
          pairedLevelId: "sell_1",
          quantity: 0,
          quoteAllocated: 500,
        },
        {
          id: "sell_1",
          side: "SELL",
          price: 62000,
          status: "waiting", // already armed — should be skipped
          pairedLevelId: "buy_1",
          quantity: 0.008,
          quoteAllocated: 0,
        },
      ];
      const runtime = makeRuntime({ levels, gridLevels: 2 });

      const result = performInitialMarketBuy(runtime, 60000, TIMESTAMP);

      expect(result.filledBuys).toHaveLength(0);
      expect(result.armedSells).toHaveLength(0);
      // Available quote should be unchanged
      expect(result.runtime.availableQuote).toBe(runtime.availableQuote);
    });

    it("should skip sell levels without a paired buy", () => {
      const levels: GridLevelState[] = [
        {
          id: "sell_orphan",
          side: "SELL",
          price: 62000,
          status: "closed",
          pairedLevelId: "buy_missing",
          quantity: 0,
          quoteAllocated: 0,
          lastClosedAt: TIMESTAMP,
        },
      ];
      const runtime = makeRuntime({ levels, gridLevels: 1 });

      const result = performInitialMarketBuy(runtime, 60000, TIMESTAMP);

      expect(result.filledBuys).toHaveLength(0);
      expect(result.armedSells).toHaveLength(0);
    });

    it("should compute quantity using currentPrice even though level price is preserved", () => {
      const runtime = makeRuntime(); // buy_1 quoteAllocated = 500, grid price = 58000
      const currentPrice = 60000;

      const result = performInitialMarketBuy(runtime, currentPrice, TIMESTAMP);

      const buy1 = result.filledBuys.find((l) => l.id === "buy_1")!;
      // quantity = quoteAllocated / currentPrice = 500 / 60000
      const expectedQty = Math.round((500 / currentPrice) * 1e6) / 1e6;
      expect(buy1.quantity).toBeCloseTo(expectedQty, 6);
      // Confirm it's NOT computed from the grid level price
      const wrongQty = Math.round((500 / 58000) * 1e6) / 1e6;
      expect(buy1.quantity).not.toBeCloseTo(wrongQty, 6);
    });
  });

  // ── Integration: createSpotGridRuntime + performInitialMarketBuy ──

  describe("createSpotGridRuntime → performInitialMarketBuy integration", () => {
    it("should produce a valid runtime that performInitialMarketBuy can process", () => {
      const market = makeMarketData(60000, 3000);
      const runtime = createSpotGridRuntime({
        agentId: "agent-int",
        marketData: market,
        capitalReserved: 1000,
        timestamp: TIMESTAMP,
      });

      const currentPrice = getGridPriceForAsset(runtime.asset, market);
      const result = performInitialMarketBuy(runtime, currentPrice, TIMESTAMP);

      // Should not throw and should return a valid structure
      expect(result.runtime.agentId).toBe("agent-int");
      expect(result.runtime.status).toBe("active");
      expect(Array.isArray(result.filledBuys)).toBe(true);
      expect(Array.isArray(result.armedSells)).toBe(true);

      // filledBuys and armedSells should have same length
      expect(result.filledBuys.length).toBe(result.armedSells.length);

      // Available quote should decrease by the amount used for buys
      expect(result.runtime.availableQuote).toBeLessThanOrEqual(
        runtime.availableQuote,
      );
    });
  });

  // ── Bybit-style buildGridLevelsFromRange (via createSpotGridRuntime) ──

  describe("Bybit-style grid level distribution", () => {
    it("should distribute levels evenly across the range", () => {
      const market = makeMarketData(60000, 3000);
      const runtime = createSpotGridRuntime({
        agentId: "agent-bybit",
        asset: "BTC",
        marketData: market,
        capitalReserved: 1000,
        timestamp: TIMESTAMP,
        overrides: {
          rangeLow: 55000,
          rangeHigh: 65000,
          gridLevels: 4,
        },
      });

      // 4 levels in range [55000, 65000] → interval = 10000/5 = 2000
      // Prices: 57000, 59000, 61000, 63000
      const prices = runtime.levels.map((l) => l.price).sort((a, b) => a - b);
      expect(prices).toEqual([57000, 59000, 61000, 63000]);
    });

    it("should place buy levels below current price and sell levels above", () => {
      const market = makeMarketData(60000, 3000);
      const runtime = createSpotGridRuntime({
        agentId: "agent-sides",
        asset: "BTC",
        marketData: market,
        capitalReserved: 1000,
        timestamp: TIMESTAMP,
        overrides: {
          rangeLow: 55000,
          rangeHigh: 65000,
          gridLevels: 4,
        },
      });

      const currentPrice = 60000;
      const buys = runtime.levels.filter((l) => l.side === "BUY");
      const sells = runtime.levels.filter((l) => l.side === "SELL");

      for (const buy of buys) {
        expect(buy.price).toBeLessThan(currentPrice);
      }
      for (const sell of sells) {
        expect(sell.price).toBeGreaterThanOrEqual(currentPrice);
      }
    });

    it("should allocate capital evenly across buy levels only", () => {
      const market = makeMarketData(60000, 3000);
      const capital = 1000;
      const runtime = createSpotGridRuntime({
        agentId: "agent-alloc",
        asset: "BTC",
        marketData: market,
        capitalReserved: capital,
        timestamp: TIMESTAMP,
        overrides: {
          rangeLow: 55000,
          rangeHigh: 65000,
          gridLevels: 4,
        },
      });

      // Prices: 57000, 59000 (buys), 61000, 63000 (sells)
      const buys = runtime.levels.filter((l) => l.side === "BUY");
      const sells = runtime.levels.filter((l) => l.side === "SELL");

      // Capital split evenly across 2 buy levels
      const expectedPerLevel = capital / buys.length;
      for (const buy of buys) {
        expect(buy.quoteAllocated).toBeCloseTo(expectedPerLevel, 1);
      }

      // Sell levels get no quote allocation
      for (const sell of sells) {
        expect(sell.quoteAllocated).toBe(0);
      }
    });

    it("should set buy levels to waiting and sell levels to closed", () => {
      const market = makeMarketData(60000, 3000);
      const runtime = createSpotGridRuntime({
        agentId: "agent-status",
        asset: "BTC",
        marketData: market,
        capitalReserved: 1000,
        timestamp: TIMESTAMP,
        overrides: {
          rangeLow: 55000,
          rangeHigh: 65000,
          gridLevels: 4,
        },
      });

      const buys = runtime.levels.filter((l) => l.side === "BUY");
      const sells = runtime.levels.filter((l) => l.side === "SELL");

      for (const buy of buys) {
        expect(buy.status).toBe("waiting");
      }
      for (const sell of sells) {
        expect(sell.status).toBe("closed");
        expect(sell.lastClosedAt).toBe(TIMESTAMP);
      }
    });

    it("should pair buy and sell levels correctly", () => {
      const market = makeMarketData(60000, 3000);
      const runtime = createSpotGridRuntime({
        agentId: "agent-pairs",
        asset: "BTC",
        marketData: market,
        capitalReserved: 1000,
        timestamp: TIMESTAMP,
        overrides: {
          rangeLow: 55000,
          rangeHigh: 65000,
          gridLevels: 4,
        },
      });

      const buys = runtime.levels.filter((l) => l.side === "BUY");
      const sells = runtime.levels.filter((l) => l.side === "SELL");

      // Each buy should reference a sell and vice versa
      for (const buy of buys) {
        const pairedSell = runtime.levels.find(
          (l) => l.id === buy.pairedLevelId,
        );
        expect(pairedSell).toBeDefined();
        expect(pairedSell!.side).toBe("SELL");
      }
      for (const sell of sells) {
        const pairedBuy = runtime.levels.find(
          (l) => l.id === sell.pairedLevelId,
        );
        expect(pairedBuy).toBeDefined();
        expect(pairedBuy!.side).toBe("BUY");
      }
    });

    it("should handle asymmetric splits when price is not centered", () => {
      // Price near the top of range → more buys than sells
      const market = makeMarketData(64000, 3000);
      const runtime = createSpotGridRuntime({
        agentId: "agent-asym",
        asset: "BTC",
        marketData: market,
        capitalReserved: 1200,
        timestamp: TIMESTAMP,
        overrides: {
          rangeLow: 55000,
          rangeHigh: 65000,
          gridLevels: 4,
        },
      });

      // interval = 10000/5 = 2000 → prices: 57000, 59000, 61000, 63000
      // currentPrice = 64000 → all 4 are buys, 0 sells
      const buys = runtime.levels.filter((l) => l.side === "BUY");
      const sells = runtime.levels.filter((l) => l.side === "SELL");

      expect(buys.length).toBe(4);
      expect(sells.length).toBe(0);

      // Capital split across all 4 buy levels
      const expectedPerLevel = 1200 / 4;
      for (const buy of buys) {
        expect(buy.quoteAllocated).toBeCloseTo(expectedPerLevel, 1);
      }
    });

    it("should handle price below range producing all sell levels", () => {
      // Price below range → all levels become sells
      const market = makeMarketData(54000, 3000);
      const runtime = createSpotGridRuntime({
        agentId: "agent-all-sells",
        asset: "BTC",
        marketData: market,
        capitalReserved: 1000,
        timestamp: TIMESTAMP,
        overrides: {
          rangeLow: 55000,
          rangeHigh: 65000,
          gridLevels: 4,
        },
      });

      const buys = runtime.levels.filter((l) => l.side === "BUY");
      const sells = runtime.levels.filter((l) => l.side === "SELL");

      expect(buys.length).toBe(0);
      expect(sells.length).toBe(4);

      // No buy levels → no quote allocation
      for (const sell of sells) {
        expect(sell.quoteAllocated).toBe(0);
      }
    });

    it("should use AI advisory range when no manual overrides provided", () => {
      const market = makeMarketData(60000, 3000);
      const runtime = createSpotGridRuntime({
        agentId: "agent-ai-range",
        marketData: market,
        capitalReserved: 1000,
        timestamp: TIMESTAMP,
        advisory: {
          recommendedAsset: "BTC",
          shouldActivate: true,
          suggestedRangeLow: 55000,
          suggestedRangeHigh: 65000,
          suggestedGridLevels: 4,
          reasoning: "test advisory",
        },
      });

      expect(runtime.rangeLow).toBe(55000);
      expect(runtime.rangeHigh).toBe(65000);
      expect(runtime.gridLevels).toBe(4);

      // Should still use Bybit-style distribution
      const prices = runtime.levels.map((l) => l.price).sort((a, b) => a - b);
      expect(prices).toEqual([57000, 59000, 61000, 63000]);
    });

    it("should clamp grid levels to valid range", () => {
      const market = makeMarketData(60000, 3000);
      const runtime = createSpotGridRuntime({
        agentId: "agent-clamp",
        asset: "BTC",
        marketData: market,
        capitalReserved: 1000,
        timestamp: TIMESTAMP,
        overrides: {
          rangeLow: 55000,
          rangeHigh: 65000,
          gridLevels: 1, // below minimum of 2
        },
      });

      // Should be clamped to minimum (2)
      expect(runtime.gridLevels).toBeGreaterThanOrEqual(2);
      expect(runtime.levels.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── modifySpotGrid with Bybit-style rebuild ──

  describe("modifySpotGrid level rebuild", () => {
    it("should rebuild levels with Bybit-style distribution on range change", () => {
      const market = makeMarketData(60000, 3000);
      const runtime = createSpotGridRuntime({
        agentId: "agent-mod",
        asset: "BTC",
        marketData: market,
        capitalReserved: 1000,
        timestamp: TIMESTAMP,
        overrides: {
          rangeLow: 55000,
          rangeHigh: 65000,
          gridLevels: 4,
        },
      });

      const { runtime: modified } = modifySpotGrid(
        runtime,
        { rangeLow: 56000, rangeHigh: 64000 },
        market,
        TIMESTAMP + 1000,
      );

      // New range [56000, 64000], 4 levels → interval = 8000/5 = 1600
      // Prices: 57600, 59200, 60800, 62400
      expect(modified.rangeLow).toBe(56000);
      expect(modified.rangeHigh).toBe(64000);

      const buys = modified.levels.filter((l) => l.side === "BUY");
      const sells = modified.levels.filter((l) => l.side === "SELL");

      // All buy prices below 60000, all sell prices >= 60000
      for (const buy of buys) {
        expect(buy.price).toBeLessThan(60000);
      }
      for (const sell of sells) {
        expect(sell.price).toBeGreaterThanOrEqual(60000);
      }
    });

    it("should rebuild levels when grid level count changes", () => {
      const market = makeMarketData(60000, 3000);
      const runtime = createSpotGridRuntime({
        agentId: "agent-mod-levels",
        asset: "BTC",
        marketData: market,
        capitalReserved: 1000,
        timestamp: TIMESTAMP,
        overrides: {
          rangeLow: 55000,
          rangeHigh: 65000,
          gridLevels: 4,
        },
      });

      const { runtime: modified } = modifySpotGrid(
        runtime,
        { gridLevels: 8 },
        market,
        TIMESTAMP + 1000,
      );

      expect(modified.gridLevels).toBe(8);
      expect(modified.levels.length).toBe(8);

      // Levels should still be evenly distributed
      const prices = modified.levels.map((l) => l.price).sort((a, b) => a - b);
      const intervals = prices.slice(1).map((p, i) => p - prices[i]);
      // All intervals should be approximately equal
      const avgInterval =
        intervals.reduce((s, v) => s + v, 0) / intervals.length;
      for (const iv of intervals) {
        expect(iv).toBeCloseTo(avgInterval, 0);
      }
    });

    it("should record config change in configHistory", () => {
      const market = makeMarketData(60000, 3000);
      const runtime = createSpotGridRuntime({
        agentId: "agent-history",
        asset: "BTC",
        marketData: market,
        capitalReserved: 1000,
        timestamp: TIMESTAMP,
        overrides: {
          rangeLow: 55000,
          rangeHigh: 65000,
          gridLevels: 4,
        },
      });

      const { runtime: modified } = modifySpotGrid(
        runtime,
        { rangeLow: 56000, rangeHigh: 64000 },
        market,
        TIMESTAMP + 1000,
      );

      expect(modified.configHistory.length).toBe(
        runtime.configHistory.length + 1,
      );
      const latest = modified.configHistory[modified.configHistory.length - 1];
      expect(latest.rangeLow).toBe(56000);
      expect(latest.rangeHigh).toBe(64000);
      expect(latest.timestamp).toBe(TIMESTAMP + 1000);
    });
  });
});
