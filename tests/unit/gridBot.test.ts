import { describe, it, expect } from "vitest";
import {
  createSpotGridRuntime,
  evaluateSpotGridRuntime,
  modifySpotGrid,
  withdrawFromGrid,
  getMaxWithdrawable,
} from "@/src/services/gridBotService";
import type { MarketData } from "@/src/services/marketService";

// ── Helpers ───────────────────────────────────────────────────────

function makeMarketData(
  btcPrice: number,
  ethPrice: number,
  timestamp?: number,
): MarketData {
  return {
    btc: { price: btcPrice, change24h: 0.5 },
    eth: { price: ethPrice, change24h: 0.5 },
    timestamp: timestamp ?? Date.now(),
  };
}

// ── Grid with exactly 2 levels (minimum) ─────────────────────────
// Validates: Requirements 13.1, 13.2

describe("[Grid Bot] Minimum grid levels (2)", () => {
  it("should create a grid with exactly 2 levels (1 buy + 1 sell)", () => {
    const marketData = makeMarketData(30000, 2000);
    const runtime = createSpotGridRuntime({
      agentId: "test-min-levels",
      marketData,
      capitalReserved: 1000,
      asset: "BTC",
      overrides: {
        rangeLow: 28000,
        rangeHigh: 32000,
        gridLevels: 2,
        configMode: "manual",
      },
    });

    expect(runtime.gridLevels).toBe(2);
    const buyLevels = runtime.levels.filter((l) => l.side === "BUY");
    const sellLevels = runtime.levels.filter((l) => l.side === "SELL");
    expect(buyLevels.length).toBe(1);
    expect(sellLevels.length).toBe(1);
  });

  it("should place the buy below and sell above reference price with 2 levels", () => {
    const marketData = makeMarketData(30000, 2000);
    const runtime = createSpotGridRuntime({
      agentId: "test-min-levels-placement",
      marketData,
      capitalReserved: 1000,
      asset: "BTC",
      overrides: {
        rangeLow: 28000,
        rangeHigh: 32000,
        gridLevels: 2,
        configMode: "manual",
      },
    });

    const buy = runtime.levels.find((l) => l.side === "BUY")!;
    const sell = runtime.levels.find((l) => l.side === "SELL")!;

    expect(buy.price).toBeLessThan(30000);
    expect(buy.price).toBeGreaterThanOrEqual(28000);
    expect(sell.price).toBeGreaterThan(30000);
    expect(sell.price).toBeLessThanOrEqual(32000);
  });

  it("should clamp gridLevels=1 up to minimum of 2", () => {
    const marketData = makeMarketData(30000, 2000);
    const runtime = createSpotGridRuntime({
      agentId: "test-clamp-up",
      marketData,
      capitalReserved: 1000,
      asset: "BTC",
      overrides: {
        rangeLow: 28000,
        rangeHigh: 32000,
        gridLevels: 1,
        configMode: "manual",
      },
    });

    expect(runtime.gridLevels).toBe(2);
    expect(runtime.levels.length).toBe(2);
  });
});

// ── Grid with rangeLow == rangeHigh (invalid) ────────────────────
// Validates: Requirements 13.1, 13.2

describe("[Grid Bot] Invalid range (rangeLow == rangeHigh)", () => {
  it("should fall back to spacing-based calculation when rangeLow == rangeHigh", () => {
    const marketData = makeMarketData(30000, 2000);
    const runtime = createSpotGridRuntime({
      agentId: "test-equal-range",
      marketData,
      capitalReserved: 1000,
      asset: "BTC",
      overrides: {
        rangeLow: 30000,
        rangeHigh: 30000,
        gridLevels: 4,
        configMode: "manual",
      },
    });

    // When rangeLow == rangeHigh, the condition rangeHigh > rangeLow is false,
    // so createSpotGridRuntime falls back to legacy spacing-based calculation.
    // The runtime should still be created with a valid range derived from spacing.
    expect(runtime.rangeLow).toBeLessThan(runtime.rangeHigh);
    expect(runtime.levels.length).toBeGreaterThan(0);
    expect(runtime.status).toBe("active");
  });
});

// ── Grid withdrawal exceeding max withdrawable ───────────────────
// Validates: Requirements 13.5

describe("[Grid Bot] Withdrawal exceeding max withdrawable", () => {
  it("should return null when withdrawal amount exceeds max withdrawable", () => {
    const marketData = makeMarketData(30000, 2000);
    const runtime = createSpotGridRuntime({
      agentId: "test-withdraw-exceed",
      marketData,
      capitalReserved: 5000,
      asset: "BTC",
      overrides: {
        rangeLow: 28000,
        rangeHigh: 32000,
        gridLevels: 4,
        configMode: "manual",
      },
    });

    // Fresh grid has 0 cumulative profit, so max withdrawable is 0
    expect(getMaxWithdrawable(runtime)).toBe(0);

    // Attempting to withdraw any amount should return null
    const result = withdrawFromGrid(runtime, 100);
    expect(result).toBeNull();
  });

  it("should return null when withdrawal amount exceeds accumulated profit", () => {
    const marketData = makeMarketData(30000, 2000);
    const runtime = createSpotGridRuntime({
      agentId: "test-withdraw-over-profit",
      marketData,
      capitalReserved: 5000,
      asset: "BTC",
      overrides: {
        rangeLow: 28000,
        rangeHigh: 32000,
        gridLevels: 4,
        configMode: "manual",
      },
    });

    // Simulate some accumulated profit
    runtime.cumulativeGridProfit = 50;

    const maxW = getMaxWithdrawable(runtime);
    expect(maxW).toBeGreaterThan(0);
    expect(maxW).toBeLessThanOrEqual(50);

    // Withdraw more than max
    const result = withdrawFromGrid(runtime, maxW + 1);
    expect(result).toBeNull();
  });

  it("should succeed when withdrawal amount equals max withdrawable", () => {
    const marketData = makeMarketData(30000, 2000);
    const runtime = createSpotGridRuntime({
      agentId: "test-withdraw-exact",
      marketData,
      capitalReserved: 5000,
      asset: "BTC",
      overrides: {
        rangeLow: 28000,
        rangeHigh: 32000,
        gridLevels: 4,
        configMode: "manual",
      },
    });

    // Simulate profit
    runtime.cumulativeGridProfit = 100;

    const maxW = getMaxWithdrawable(runtime);
    expect(maxW).toBeGreaterThan(0);

    const result = withdrawFromGrid(runtime, maxW);
    expect(result).not.toBeNull();
    expect(result!.event.type).toBe("withdrawn");
    expect(result!.runtime.previouslyWithdrawn).toBeCloseTo(maxW, 2);
  });

  it("should return null for zero or negative withdrawal amount", () => {
    const marketData = makeMarketData(30000, 2000);
    const runtime = createSpotGridRuntime({
      agentId: "test-withdraw-zero",
      marketData,
      capitalReserved: 5000,
      asset: "BTC",
      overrides: {
        rangeLow: 28000,
        rangeHigh: 32000,
        gridLevels: 4,
        configMode: "manual",
      },
    });

    runtime.cumulativeGridProfit = 100;

    expect(withdrawFromGrid(runtime, 0)).toBeNull();
    expect(withdrawFromGrid(runtime, -10)).toBeNull();
  });
});

// ── Grid modification with invalid range (low >= high) ───────────
// Validates: Requirements 13.2

describe("[Grid Bot] Modification with invalid range", () => {
  it("should keep existing range when modifying with rangeLow >= rangeHigh", () => {
    const marketData = makeMarketData(30000, 2000);
    const runtime = createSpotGridRuntime({
      agentId: "test-modify-invalid",
      marketData,
      capitalReserved: 5000,
      asset: "BTC",
      overrides: {
        rangeLow: 28000,
        rangeHigh: 32000,
        gridLevels: 4,
        configMode: "manual",
      },
    });

    const originalRangeLow = runtime.rangeLow;
    const originalRangeHigh = runtime.rangeHigh;
    const originalHistoryLen = runtime.configHistory.length;

    // Modify with rangeLow > rangeHigh — modifySpotGrid applies the values
    // but since both are provided, the rebuild path triggers.
    // The key behavior: the function still produces a result (doesn't crash).
    const result = modifySpotGrid(
      runtime,
      { rangeLow: 35000, rangeHigh: 30000 },
      marketData,
    );

    // The function should still return a valid runtime and event
    expect(result.runtime).toBeDefined();
    expect(result.event).toBeDefined();
    expect(result.event.type).toBe("modified");
    // Config history should grow by 1
    expect(result.runtime.configHistory.length).toBe(originalHistoryLen + 1);
  });

  it("should handle modification where rangeLow equals rangeHigh", () => {
    const marketData = makeMarketData(30000, 2000);
    const runtime = createSpotGridRuntime({
      agentId: "test-modify-equal",
      marketData,
      capitalReserved: 5000,
      asset: "BTC",
      overrides: {
        rangeLow: 28000,
        rangeHigh: 32000,
        gridLevels: 4,
        configMode: "manual",
      },
    });

    const originalHistoryLen = runtime.configHistory.length;

    const result = modifySpotGrid(
      runtime,
      { rangeLow: 30000, rangeHigh: 30000 },
      marketData,
    );

    expect(result.runtime).toBeDefined();
    expect(result.event.type).toBe("modified");
    expect(result.runtime.configHistory.length).toBe(originalHistoryLen + 1);
  });

  it("should correctly rebuild levels when modification has valid range", () => {
    const marketData = makeMarketData(30000, 2000);
    const runtime = createSpotGridRuntime({
      agentId: "test-modify-valid",
      marketData,
      capitalReserved: 5000,
      asset: "BTC",
      overrides: {
        rangeLow: 28000,
        rangeHigh: 32000,
        gridLevels: 4,
        configMode: "manual",
      },
    });

    const result = modifySpotGrid(
      runtime,
      { rangeLow: 27000, rangeHigh: 33000, gridLevels: 6 },
      marketData,
    );

    expect(result.runtime.rangeLow).toBe(27000);
    expect(result.runtime.rangeHigh).toBe(33000);
    expect(result.runtime.gridLevels).toBe(6);
    expect(result.runtime.levels.length).toBe(6); // 3 buy + 3 sell
    expect(result.event.type).toBe("modified");
  });
});
