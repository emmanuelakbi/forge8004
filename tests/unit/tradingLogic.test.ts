// Task 9.3: Unit tests for trading logic edge cases
// Requirements: 4.1–4.8, 20.3, 21.1

import { describe, it, expect } from "vitest";
import { normalizeTradeDecision } from "@/src/services/aiService";
import { checkTpSl } from "@/src/services/tpSlChecker";
import {
  checkLimitOrder,
  computeLimitOrderExpiry,
} from "@/src/services/limitOrderChecker";
import { evaluateTrailingStop } from "@/src/services/trailingStopChecker";
import {
  TRAILING_PROFIT_TRIGGER_PCT,
  getExecutionProfile,
} from "@/src/services/trustArtifacts";
import type { TradeIntent, AgentStrategyType } from "@/src/lib/types";
import type { MarketData } from "@/src/services/marketService";

// ── Helpers ───────────────────────────────────────────────────────

function makeMarketData(
  btcPrice: number,
  ethPrice: number,
  btcChange = 0.5,
  ethChange = 0.5,
): MarketData {
  return {
    btc: { price: btcPrice, change24h: btcChange },
    eth: { price: ethPrice, change24h: ethChange },
    timestamp: Date.now(),
  };
}

const ALL_STRATEGIES: AgentStrategyType[] = [
  "momentum",
  "mean_reversion",
  "range_trading",
  "market_making",
  "arbitrage",
  "yield",
  "risk_off",
  "spot_grid_bot",
];

// ── normalizeTradeDecision with all 8 strategy types ──────────────

describe("[Trading Logic Edge Cases]", () => {
  describe("normalizeTradeDecision with all 8 strategy types", () => {
    it.each(ALL_STRATEGIES)(
      "should return a valid decision for strategy %s",
      (strategy) => {
        const market = makeMarketData(65000, 2500);
        const rawDecision: Partial<TradeIntent> = {
          side: "BUY",
          asset: "BTC",
          size: 0.1,
          reason: "Test signal",
          timestamp: Date.now(),
        };

        const result = normalizeTradeDecision(
          strategy,
          "balanced",
          market,
          [],
          rawDecision,
          70,
          10000,
          20000,
        );

        expect(result.side).toBeDefined();
        expect(["BUY", "SELL", "HOLD"]).toContain(result.side);
        expect(result.asset).toBeDefined();
        expect(["BTC", "ETH"]).toContain(result.asset);
      },
    );

    it("should force HOLD for spot_grid_bot regardless of raw side", () => {
      const market = makeMarketData(65000, 2500);
      const rawDecision: Partial<TradeIntent> = {
        side: "BUY",
        asset: "BTC",
        size: 0.5,
        reason: "Strong signal",
        timestamp: Date.now(),
      };

      const result = normalizeTradeDecision(
        "spot_grid_bot",
        "aggressive",
        market,
        [],
        rawDecision,
        90,
        50000,
        100000,
      );

      expect(result.side).toBe("HOLD");
      expect(result.size).toBe(0);
      expect(result.capitalAllocated).toBe(0);
    });

    it("should produce HOLD for momentum in flat market (low volatility)", () => {
      // change24h = 0.1 → volatility 0.1 < 0.65 threshold
      const market = makeMarketData(65000, 2500, 0.1, 0.1);
      const rawDecision: Partial<TradeIntent> = {
        side: "BUY",
        asset: "BTC",
        timestamp: Date.now(),
      };

      const result = normalizeTradeDecision(
        "momentum",
        "balanced",
        market,
        [],
        rawDecision,
        70,
        10000,
        20000,
      );

      expect(result.side).toBe("HOLD");
    });

    it("should produce HOLD for mean_reversion in low-volatility market", () => {
      // change24h = 0.3 → volatility 0.3 < 1.2 threshold
      const market = makeMarketData(65000, 2500, 0.3, 0.3);
      const rawDecision: Partial<TradeIntent> = {
        side: "SELL",
        asset: "ETH",
        timestamp: Date.now(),
      };

      const result = normalizeTradeDecision(
        "mean_reversion",
        "balanced",
        market,
        [],
        rawDecision,
        70,
        10000,
        20000,
      );

      expect(result.side).toBe("HOLD");
    });

    it("should produce HOLD for risk_off in volatile market", () => {
      // change24h = -2.0 → volatility 2.0 > 1.4 threshold
      const market = makeMarketData(65000, 2500, -2.0, -2.0);
      const rawDecision: Partial<TradeIntent> = {
        side: "BUY",
        asset: "BTC",
        timestamp: Date.now(),
      };

      const result = normalizeTradeDecision(
        "risk_off",
        "conservative",
        market,
        [],
        rawDecision,
        70,
        10000,
        20000,
      );

      expect(result.side).toBe("HOLD");
    });

    it("should produce HOLD for arbitrage in high-volatility market", () => {
      // change24h = 2.0 → volatility 2.0 > 1.1 threshold
      const market = makeMarketData(65000, 2500, 2.0, 2.0);
      const rawDecision: Partial<TradeIntent> = {
        side: "BUY",
        asset: "BTC",
        timestamp: Date.now(),
      };

      const result = normalizeTradeDecision(
        "arbitrage",
        "balanced",
        market,
        [],
        rawDecision,
        70,
        10000,
        20000,
      );

      expect(result.side).toBe("HOLD");
    });

    it("should set stopLoss and takeProfit for non-HOLD trades", () => {
      // Use momentum with enough volatility to trade
      const market = makeMarketData(65000, 2500, 1.5, 1.5);
      const rawDecision: Partial<TradeIntent> = {
        side: "BUY",
        asset: "BTC",
        timestamp: Date.now(),
      };

      const result = normalizeTradeDecision(
        "momentum",
        "balanced",
        market,
        [],
        rawDecision,
        70,
        10000,
        20000,
      );

      if (result.side !== "HOLD") {
        expect(result.stopLoss).toBeDefined();
        expect(result.takeProfit).toBeDefined();
        expect(result.size).toBeGreaterThan(0);
        expect(result.capitalAllocated).toBeGreaterThan(0);
      }
    });

    it("should respect HOLD from AI when raw side is HOLD", () => {
      const market = makeMarketData(65000, 2500, 1.0, 1.0);
      const rawDecision: Partial<TradeIntent> = {
        side: "HOLD",
        asset: "BTC",
        reason: "No clear signal",
        timestamp: Date.now(),
      };

      for (const strategy of ALL_STRATEGIES) {
        const result = normalizeTradeDecision(
          strategy,
          "balanced",
          market,
          [],
          rawDecision,
          70,
          10000,
          20000,
        );

        expect(result.side).toBe("HOLD");
      }
    });
  });

  // ── Trailing stop at exactly-at-threshold profit ──────────────────

  describe("Trailing stop with exactly-at-threshold profit", () => {
    it("should activate trailing stop when profit is exactly at threshold (BUY)", () => {
      const entryPrice = 10000;
      const thresholdPct = TRAILING_PROFIT_TRIGGER_PCT * 100; // e.g. 1%
      // Price exactly at threshold
      const currentPrice = entryPrice * (1 + TRAILING_PROFIT_TRIGGER_PCT);

      const position: TradeIntent = {
        agentId: "test-agent",
        side: "BUY",
        asset: "BTC",
        entryPrice,
        size: 1,
        stopLoss: entryPrice * 0.97,
        initialStopLoss: entryPrice * 0.97,
        currentStopLoss: entryPrice * 0.97,
        takeProfit: entryPrice * 1.1,
        trailingStopActive: false,
        profitProtected: 0,
        peakFavorablePrice: entryPrice,
        timestamp: 1_700_000_000_000,
        status: "OPEN",
      };

      const result = evaluateTrailingStop(
        position,
        currentPrice,
        "momentum",
        "balanced",
      );

      // At exactly the threshold, trailing stop should activate
      expect(result.trailingStopActive).toBe(true);
      expect(result.action).toBe("ACTIVATE");
      expect(result.peakFavorablePrice).toBeGreaterThanOrEqual(currentPrice);
      expect(result.currentStopLoss).toBeDefined();
      expect(typeof result.currentStopLoss).toBe("number");
    });

    it("should activate trailing stop when profit is exactly at threshold (SELL)", () => {
      const entryPrice = 10000;
      // For SELL, profit = (entry - current) / entry
      const currentPrice = entryPrice * (1 - TRAILING_PROFIT_TRIGGER_PCT);

      const position: TradeIntent = {
        agentId: "test-agent",
        side: "SELL",
        asset: "ETH",
        entryPrice,
        size: 1,
        stopLoss: entryPrice * 1.03,
        initialStopLoss: entryPrice * 1.03,
        currentStopLoss: entryPrice * 1.03,
        takeProfit: entryPrice * 0.9,
        trailingStopActive: false,
        profitProtected: 0,
        peakFavorablePrice: entryPrice,
        timestamp: 1_700_000_000_000,
        status: "OPEN",
      };

      const result = evaluateTrailingStop(
        position,
        currentPrice,
        "momentum",
        "balanced",
      );

      expect(result.trailingStopActive).toBe(true);
      expect(result.action).toBe("ACTIVATE");
      expect(result.peakFavorablePrice).toBeLessThanOrEqual(currentPrice);
    });

    it("should NOT activate when profit is just below threshold", () => {
      const entryPrice = 10000;
      // Slightly below threshold
      const currentPrice = entryPrice * (1 + TRAILING_PROFIT_TRIGGER_PCT * 0.5);

      const position: TradeIntent = {
        agentId: "test-agent",
        side: "BUY",
        asset: "BTC",
        entryPrice,
        size: 1,
        stopLoss: entryPrice * 0.97,
        initialStopLoss: entryPrice * 0.97,
        currentStopLoss: entryPrice * 0.97,
        takeProfit: entryPrice * 1.1,
        trailingStopActive: false,
        profitProtected: 0,
        peakFavorablePrice: entryPrice,
        timestamp: 1_700_000_000_000,
        status: "OPEN",
      };

      const result = evaluateTrailingStop(
        position,
        currentPrice,
        "momentum",
        "balanced",
      );

      expect(result.trailingStopActive).toBe(false);
      expect(result.action).toBe("HOLD");
    });

    it("should report TRAILING_PROFIT_TRIGGER_PCT as 0.01 (1%)", () => {
      expect(TRAILING_PROFIT_TRIGGER_PCT).toBe(0.01);
    });
  });

  // ── Limit order expiration at exact boundary time ─────────────────

  describe("Limit order expiration at exact boundary time", () => {
    it("should EXPIRE at exactly the expiry timestamp", () => {
      const createdAt = 1_700_000_000_000;
      const expiresAt = computeLimitOrderExpiry("momentum", createdAt);

      const order = {
        side: "BUY" as const,
        asset: "BTC",
        limitPrice: 60000,
        expiresAt,
        status: "PENDING" as const,
        capitalAllocated: 5000,
      };

      const result = checkLimitOrder(
        order,
        65000, // price hasn't reached limit
        expiresAt, // exactly at expiry
        0,
        2,
        false,
      );

      expect(result.action).toBe("EXPIRE");
    });

    it("should KEEP one millisecond before expiry", () => {
      const createdAt = 1_700_000_000_000;
      const expiresAt = computeLimitOrderExpiry("momentum", createdAt);

      const order = {
        side: "BUY" as const,
        asset: "BTC",
        limitPrice: 60000,
        expiresAt,
        status: "PENDING" as const,
        capitalAllocated: 5000,
      };

      const result = checkLimitOrder(
        order,
        65000,
        expiresAt - 1, // one ms before expiry
        0,
        2,
        false,
      );

      expect(result.action).toBe("KEEP");
    });

    it("should EXPIRE one millisecond after expiry", () => {
      const createdAt = 1_700_000_000_000;
      const expiresAt = computeLimitOrderExpiry("momentum", createdAt);

      const order = {
        side: "BUY" as const,
        asset: "BTC",
        limitPrice: 60000,
        expiresAt,
        status: "PENDING" as const,
        capitalAllocated: 5000,
      };

      const result = checkLimitOrder(
        order,
        65000,
        expiresAt + 1, // one ms after expiry
        0,
        2,
        false,
      );

      expect(result.action).toBe("EXPIRE");
    });

    it.each([
      "arbitrage",
      "range_trading",
      "market_making",
      "mean_reversion",
      "momentum",
      "risk_off",
      "yield",
    ] as AgentStrategyType[])(
      "should compute correct expiry for strategy %s (2x maxHoldMinutes)",
      (strategy) => {
        const createdAt = 1_700_000_000_000;
        const profile = getExecutionProfile(strategy);
        const expectedExpiry =
          createdAt + (profile.maxHoldMinutes * 2 || 240) * 60_000;
        const actual = computeLimitOrderExpiry(strategy, createdAt);

        expect(actual).toBe(expectedExpiry);
      },
    );

    it("should use 240-minute fallback for spot_grid_bot (maxHoldMinutes=0)", () => {
      const createdAt = 1_700_000_000_000;
      const profile = getExecutionProfile("spot_grid_bot");
      expect(profile.maxHoldMinutes).toBe(0);

      const expiry = computeLimitOrderExpiry("spot_grid_bot", createdAt);
      // 0 * 2 = 0, fallback to 240 minutes
      expect(expiry).toBe(createdAt + 240 * 60_000);
    });

    it("should FILL before expiry when price reaches limit (BUY)", () => {
      const createdAt = 1_700_000_000_000;
      const expiresAt = computeLimitOrderExpiry("momentum", createdAt);

      const order = {
        side: "BUY" as const,
        asset: "ETH",
        limitPrice: 2400,
        expiresAt,
        status: "PENDING" as const,
        capitalAllocated: 2000,
      };

      // Price drops to limit
      const result = checkLimitOrder(
        order,
        2400, // exactly at limit price
        expiresAt - 60_000,
        0,
        2,
        false,
      );

      expect(result.action).toBe("FILL");
    });

    it("should FILL before expiry when price reaches limit (SELL)", () => {
      const createdAt = 1_700_000_000_000;
      const expiresAt = computeLimitOrderExpiry("range_trading", createdAt);

      const order = {
        side: "SELL" as const,
        asset: "BTC",
        limitPrice: 70000,
        expiresAt,
        status: "PENDING" as const,
        capitalAllocated: 5000,
      };

      // Price rises to limit
      const result = checkLimitOrder(
        order,
        70000, // exactly at limit price
        expiresAt - 60_000,
        0,
        2,
        false,
      );

      expect(result.action).toBe("FILL");
    });
  });
});
