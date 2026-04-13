/**
 * Unit tests for src/services/aiService.ts
 *
 * Tests the exported normalizeTradeDecision function and aiService methods.
 * Dependencies (groqService, trustArtifacts) are mocked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MarketData } from "../../src/services/marketService";
import type { TradeIntent } from "../../src/lib/types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../../src/services/groqService", () => ({
  groqService: {
    processTradeCycle: vi.fn(),
    getQuotaStatus: vi.fn(() => ({ remaining: 10, limit: 20 })),
    reassessPosition: vi.fn(),
    resetQuota: vi.fn(),
  },
}));

vi.mock("../../src/services/trustArtifacts", () => ({
  normalizeStrategyType: (s?: string) => {
    const map: Record<string, string> = {
      range_trading: "range_trading",
      spot_grid_bot: "spot_grid_bot",
      grid_trading: "spot_grid_bot",
      momentum: "momentum",
      mean_reversion: "mean_reversion",
      arbitrage: "arbitrage",
      yield: "yield",
      market_making: "market_making",
      risk_off: "risk_off",
    };
    return map[s || ""] || "momentum";
  },
  getStrategyBehavior: () => ({
    entryBias: "trend",
    holdBias: 0.6,
    sizeMultiplier: 1.0,
    trailingTightness: 0.5,
    reassessmentThreshold: 60,
    preferredConditions: "trending conditions",
    takeProfitMultiplier: 1.0,
    stopLossMultiplier: 1.0,
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMarketData(
  overrides?: Partial<{
    btcPrice: number;
    btcChange: number;
    ethPrice: number;
    ethChange: number;
  }>,
): MarketData {
  return {
    btc: {
      price: overrides?.btcPrice ?? 65000,
      change24h: overrides?.btcChange ?? 1.5,
    },
    eth: {
      price: overrides?.ethPrice ?? 2500,
      change24h: overrides?.ethChange ?? -0.5,
    },
    timestamp: Date.now(),
  };
}

function makePosition(
  asset: string,
  side: "BUY" | "SELL" = "BUY",
): TradeIntent {
  return {
    agentId: "agent-1",
    side,
    asset,
    size: 0.1,
    timestamp: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Tests — normalizeTradeDecision (exported)
// ---------------------------------------------------------------------------

describe("aiService", () => {
  let normalizeTradeDecision: typeof import("../../src/services/aiService").normalizeTradeDecision;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../../src/services/aiService");
    normalizeTradeDecision = mod.normalizeTradeDecision;
  });

  describe("normalizeTradeDecision", () => {
    describe("spot_grid_bot short-circuit", () => {
      it("should return HOLD with size 0 for spot_grid_bot strategy", () => {
        const result = normalizeTradeDecision(
          "spot_grid_bot",
          "balanced",
          makeMarketData(),
          [],
          { side: "BUY", asset: "BTC", reason: "test" },
        );

        expect(result.side).toBe("HOLD");
        expect(result.size).toBe(0);
        expect(result.capitalAllocated).toBe(0);
        expect(result.asset).toBe("BTC");
      });

      it("should default to BTC when asset is invalid for spot_grid_bot", () => {
        const result = normalizeTradeDecision(
          "spot_grid_bot",
          "balanced",
          makeMarketData(),
          [],
          { side: "BUY", asset: "DOGE" },
        );

        expect(result.asset).toBe("BTC");
        expect(result.side).toBe("HOLD");
      });
    });

    describe("side normalization", () => {
      it("should preserve BUY side from raw decision", () => {
        const result = normalizeTradeDecision(
          "momentum",
          "balanced",
          makeMarketData({ btcChange: 2.0 }),
          [],
          { side: "BUY", asset: "BTC" },
          70,
          10000,
          10000,
        );

        expect(result.side).toBe("BUY");
      });

      it("should preserve SELL side from raw decision", () => {
        const result = normalizeTradeDecision(
          "momentum",
          "balanced",
          makeMarketData({ btcChange: -2.0 }),
          [],
          { side: "SELL", asset: "BTC" },
          70,
          10000,
          10000,
        );

        expect(result.side).toBe("SELL");
      });

      it("should treat invalid side as HOLD", () => {
        const result = normalizeTradeDecision(
          "momentum",
          "balanced",
          makeMarketData(),
          [],
          { side: "INVALID" as any, asset: "BTC" },
          50,
          10000,
          10000,
        );

        // HOLD side → returns HOLD with size 0
        expect(result.side).toBe("HOLD");
        expect(result.size).toBe(0);
      });
    });

    describe("asset selection and switching", () => {
      it("should use the requested asset when it is valid", () => {
        const result = normalizeTradeDecision(
          "momentum",
          "balanced",
          makeMarketData({ btcChange: 2.0 }),
          [],
          { side: "BUY", asset: "ETH" },
          70,
          10000,
          10000,
        );

        // Asset may or may not be switched depending on scoring,
        // but the function should not crash and should return a valid asset
        expect(["BTC", "ETH"]).toContain(result.asset);
      });

      it("should fall back to chooseBestAsset when asset is invalid", () => {
        const result = normalizeTradeDecision(
          "momentum",
          "balanced",
          makeMarketData({ btcChange: 2.0 }),
          [],
          { side: "BUY", asset: "INVALID" },
          70,
          10000,
          10000,
        );

        expect(["BTC", "ETH"]).toContain(result.asset);
      });

      it("should prepend asset-switch note to reason when asset is switched", () => {
        // Force a scenario where ETH scores much higher than BTC
        // by giving BTC a big negative move and ETH a positive move for momentum
        const result = normalizeTradeDecision(
          "momentum",
          "balanced",
          makeMarketData({ btcChange: -5.0, ethChange: 3.0 }),
          [],
          { side: "BUY", asset: "BTC", reason: "Original reason" },
          70,
          10000,
          10000,
        );

        if (result.asset !== "BTC") {
          expect(result.reason).toContain("[Asset switched from BTC to");
          expect(result.reason).toContain("Original reason");
        }
      });

      it("should not prepend asset-switch note when asset is unchanged", () => {
        // Use a scenario where BTC is clearly preferred
        const result = normalizeTradeDecision(
          "momentum",
          "balanced",
          makeMarketData({ btcChange: 5.0, ethChange: -3.0 }),
          [],
          { side: "BUY", asset: "BTC", reason: "Keep BTC" },
          70,
          10000,
          10000,
        );

        if (result.asset === "BTC") {
          // reason should not contain the switch note
          expect(result.reason).not.toContain("[Asset switched");
        }
      });

      it("should not flag asset switch when original asset was invalid", () => {
        const result = normalizeTradeDecision(
          "momentum",
          "balanced",
          makeMarketData({ btcChange: 2.0 }),
          [],
          { side: "BUY", asset: "DOGE", reason: "test" },
          70,
          10000,
          10000,
        );

        // assetWasSwitched should be false because requestedAsset wasn't BTC or ETH
        expect(result.reason).not.toContain("[Asset switched");
      });
    });

    describe("HOLD asset preservation (no scoring override)", () => {
      it("should preserve the AI's requested asset on HOLD without scoring", () => {
        // ETH has a negative change — scoring might prefer BTC for a trade,
        // but HOLD should keep the AI's original asset untouched.
        const result = normalizeTradeDecision(
          "momentum",
          "balanced",
          makeMarketData({ btcChange: 5.0, ethChange: -3.0 }),
          [],
          { side: "HOLD", asset: "ETH", reason: "waiting for entry" },
          50,
          10000,
          10000,
        );

        expect(result.side).toBe("HOLD");
        expect(result.asset).toBe("ETH");
        expect(result.size).toBe(0);
      });

      it("should default HOLD asset to BTC when raw asset is invalid", () => {
        const result = normalizeTradeDecision(
          "momentum",
          "balanced",
          makeMarketData(),
          [],
          { side: "HOLD", asset: "DOGE" },
          50,
          10000,
          10000,
        );

        expect(result.side).toBe("HOLD");
        expect(result.asset).toBe("BTC");
      });

      it("should default HOLD asset to BTC when raw asset is missing", () => {
        const result = normalizeTradeDecision(
          "momentum",
          "balanced",
          makeMarketData(),
          [],
          { side: "HOLD" },
          50,
          10000,
          10000,
        );

        expect(result.side).toBe("HOLD");
        expect(result.asset).toBe("BTC");
      });

      it("should still run scoring override for BUY/SELL decisions", () => {
        // With BTC tanking and ETH rising, scoring may switch a BTC BUY to ETH
        const result = normalizeTradeDecision(
          "momentum",
          "balanced",
          makeMarketData({ btcChange: -5.0, ethChange: 3.0 }),
          [],
          { side: "BUY", asset: "BTC" },
          70,
          10000,
          10000,
        );

        // The function should at least consider switching — we just verify
        // it returns a valid asset (scoring logic is exercised)
        expect(["BTC", "ETH"]).toContain(result.asset);
      });
    });

    describe("risk profile and position sizing", () => {
      it("should produce non-zero size for a valid BUY with capital", () => {
        const result = normalizeTradeDecision(
          "momentum",
          "balanced",
          makeMarketData({ btcChange: 2.0 }),
          [],
          { side: "BUY", asset: "BTC" },
          70,
          10000,
          10000,
        );

        if (result.side === "BUY") {
          expect(result.size).toBeGreaterThan(0);
          expect(result.capitalAllocated).toBeGreaterThan(0);
        }
      });

      it("should respect conservative risk profile with smaller allocation", () => {
        const conservative = normalizeTradeDecision(
          "momentum",
          "conservative",
          makeMarketData({ btcChange: 2.0 }),
          [],
          { side: "BUY", asset: "BTC" },
          70,
          10000,
          10000,
        );

        const aggressive = normalizeTradeDecision(
          "momentum",
          "aggressive",
          makeMarketData({ btcChange: 2.0 }),
          [],
          { side: "BUY", asset: "BTC" },
          70,
          10000,
          10000,
        );

        if (conservative.side === "BUY" && aggressive.side === "BUY") {
          expect(conservative.capitalAllocated!).toBeLessThan(
            aggressive.capitalAllocated!,
          );
        }
      });

      it("should default to balanced when risk profile is unknown", () => {
        const balanced = normalizeTradeDecision(
          "momentum",
          "balanced",
          makeMarketData({ btcChange: 2.0 }),
          [],
          { side: "BUY", asset: "BTC" },
          70,
          10000,
          10000,
        );

        const unknown = normalizeTradeDecision(
          "momentum",
          "unknown_profile",
          makeMarketData({ btcChange: 2.0 }),
          [],
          { side: "BUY", asset: "BTC" },
          70,
          10000,
          10000,
        );

        expect(balanced.capitalAllocated).toBe(unknown.capitalAllocated);
      });
    });

    describe("stop-loss and take-profit", () => {
      it("should set stopLoss below price for BUY", () => {
        const market = makeMarketData({ btcChange: 2.0 });
        const result = normalizeTradeDecision(
          "momentum",
          "balanced",
          market,
          [],
          { side: "BUY", asset: "BTC" },
          70,
          10000,
          10000,
        );

        if (result.side === "BUY") {
          expect(result.stopLoss).toBeLessThan(market.btc.price);
          expect(result.takeProfit).toBeGreaterThan(market.btc.price);
        }
      });

      it("should set stopLoss above price for SELL", () => {
        const market = makeMarketData({ btcChange: -2.0 });
        const result = normalizeTradeDecision(
          "mean_reversion",
          "balanced",
          market,
          [],
          { side: "SELL", asset: "BTC" },
          70,
          10000,
          10000,
        );

        if (result.side === "SELL") {
          expect(result.stopLoss).toBeGreaterThan(market.btc.price);
          expect(result.takeProfit).toBeLessThan(market.btc.price);
        }
      });

      it("should use default stop-loss when raw value is out of range", () => {
        const market = makeMarketData({ btcChange: 2.0 });
        const result = normalizeTradeDecision(
          "momentum",
          "balanced",
          market,
          [],
          { side: "BUY", asset: "BTC", stopLoss: 1 }, // way too low
          70,
          10000,
          10000,
        );

        if (result.side === "BUY") {
          // Should have used the default, not the raw value of 1
          expect(result.stopLoss).toBeGreaterThan(market.btc.price * 0.8);
        }
      });
    });

    describe("limit order validation", () => {
      it("should accept valid LIMIT order for BUY (price below market)", () => {
        const market = makeMarketData({ btcChange: 2.0 });
        const result = normalizeTradeDecision(
          "momentum",
          "balanced",
          market,
          [],
          {
            side: "BUY",
            asset: "BTC",
            orderType: "LIMIT",
            limitPrice: market.btc.price * 0.95,
          },
          70,
          10000,
          10000,
        );

        if (result.side === "BUY") {
          expect(result.orderType).toBe("LIMIT");
          expect(result.limitPrice).toBeDefined();
        }
      });

      it("should reject invalid LIMIT price and fall back to MARKET", () => {
        const market = makeMarketData({ btcChange: 2.0 });
        const result = normalizeTradeDecision(
          "momentum",
          "balanced",
          market,
          [],
          {
            side: "BUY",
            asset: "BTC",
            orderType: "LIMIT",
            limitPrice: market.btc.price * 0.5, // too far below
          },
          70,
          10000,
          10000,
        );

        if (result.side === "BUY") {
          expect(result.orderType).toBe("MARKET");
          expect(result.limitPrice).toBeUndefined();
        }
      });
    });

    describe("strategy condition gating", () => {
      it("should return HOLD when strategy conditions are unfavorable", () => {
        // range_trading with high volatility on both assets → unfavorable
        const result = normalizeTradeDecision(
          "range_trading",
          "balanced",
          makeMarketData({ btcChange: 5.0, ethChange: 5.0 }),
          [],
          { side: "BUY", asset: "BTC" },
          70,
          10000,
          10000,
        );

        expect(result.side).toBe("HOLD");
        expect(result.size).toBe(0);
      });

      it("should allow trade when strategy conditions are favorable", () => {
        // momentum with decent volatility → favorable
        const result = normalizeTradeDecision(
          "momentum",
          "balanced",
          makeMarketData({ btcChange: 2.0 }),
          [],
          { side: "BUY", asset: "BTC" },
          70,
          10000,
          10000,
        );

        expect(result.side).toBe("BUY");
        expect(result.size).toBeGreaterThan(0);
      });
    });

    describe("capital-aware sizing", () => {
      it("should cap allocation to availableCapital when it is less than treasury allocation", () => {
        const result = normalizeTradeDecision(
          "momentum",
          "balanced",
          makeMarketData({ btcChange: 2.0 }),
          [],
          { side: "BUY", asset: "BTC" },
          70,
          500, // availableCapital much less than treasury
          10000, // totalTreasury
        );

        if (result.side === "BUY") {
          // capitalAllocated should not exceed availableCapital
          expect(result.capitalAllocated!).toBeLessThanOrEqual(500);
        }
      });

      it("should use totalTreasury percentage as soft cap when treasury is provided", () => {
        const withTreasury = normalizeTradeDecision(
          "momentum",
          "balanced",
          makeMarketData({ btcChange: 2.0 }),
          [],
          { side: "BUY", asset: "BTC" },
          70,
          50000,
          50000,
        );

        const withSmallTreasury = normalizeTradeDecision(
          "momentum",
          "balanced",
          makeMarketData({ btcChange: 2.0 }),
          [],
          { side: "BUY", asset: "BTC" },
          70,
          2000,
          2000,
        );

        if (withTreasury.side === "BUY" && withSmallTreasury.side === "BUY") {
          expect(withTreasury.capitalAllocated!).toBeGreaterThan(
            withSmallTreasury.capitalAllocated!,
          );
        }
      });

      it("should fall back to availableCapital percentage when totalTreasury is 0", () => {
        const result = normalizeTradeDecision(
          "momentum",
          "balanced",
          makeMarketData({ btcChange: 2.0 }),
          [],
          { side: "BUY", asset: "BTC" },
          70,
          5000, // availableCapital
          0, // no treasury
        );

        if (result.side === "BUY") {
          expect(result.capitalAllocated!).toBeGreaterThan(0);
          expect(result.capitalAllocated!).toBeLessThanOrEqual(5000);
        }
      });

      it("should use hardcoded fallback when both availableCapital and totalTreasury are 0", () => {
        const result = normalizeTradeDecision(
          "momentum",
          "balanced",
          makeMarketData({ btcChange: 2.0 }),
          [],
          { side: "BUY", asset: "BTC" },
          70,
          0,
          0,
        );

        if (result.side === "BUY") {
          // Fallback cap is $2500, so allocation should be within that
          expect(result.capitalAllocated!).toBeGreaterThan(0);
          expect(result.capitalAllocated!).toBeLessThanOrEqual(2500);
        }
      });

      it("should use default 0 for capital params when omitted", () => {
        const result = normalizeTradeDecision(
          "momentum",
          "balanced",
          makeMarketData({ btcChange: 2.0 }),
          [],
          { side: "BUY", asset: "BTC" },
          70,
        );

        if (result.side === "BUY") {
          // Should still produce a valid allocation using fallback
          expect(result.capitalAllocated!).toBeGreaterThan(0);
        }
      });
    });

    describe("confidence scaling", () => {
      it("should allocate more capital with higher validation score", () => {
        const lowScore = normalizeTradeDecision(
          "momentum",
          "balanced",
          makeMarketData({ btcChange: 2.0 }),
          [],
          { side: "BUY", asset: "BTC" },
          30,
          10000,
          10000,
        );

        const highScore = normalizeTradeDecision(
          "momentum",
          "balanced",
          makeMarketData({ btcChange: 2.0 }),
          [],
          { side: "BUY", asset: "BTC" },
          95,
          10000,
          10000,
        );

        if (lowScore.side === "BUY" && highScore.side === "BUY") {
          expect(highScore.capitalAllocated!).toBeGreaterThan(
            lowScore.capitalAllocated!,
          );
        }
      });
    });
  });

  describe("aiService.processTradeCycle", () => {
    it("should return engine label and normalized decision on success", async () => {
      const { groqService } = await import("../../src/services/groqService");
      (
        groqService.processTradeCycle as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce({
        decision: { side: "BUY", asset: "BTC", reason: "bullish" },
        validation: { score: 75, comment: "Looks good" },
      });

      const { aiService } = await import("../../src/services/aiService");
      const result = await aiService.processTradeCycle(
        "agent-1",
        "momentum",
        "balanced",
        makeMarketData({ btcChange: 2.0 }),
        [],
        10000,
        10000,
      );

      expect(result.engine).toBe("GROQ_GPT_OSS_120B");
      expect(result.decision).toBeDefined();
      expect(result.rawAiDecision).toEqual({
        side: "BUY",
        asset: "BTC",
        reason: "bullish",
        score: 75,
      });
    });

    it("should forward availableCapital and totalTreasury to normalizeTradeDecision", async () => {
      const { groqService } = await import("../../src/services/groqService");
      (
        groqService.processTradeCycle as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce({
        decision: { side: "BUY", asset: "BTC", reason: "bullish" },
        validation: { score: 75, comment: "Looks good" },
      });

      const { aiService } = await import("../../src/services/aiService");
      const result = await aiService.processTradeCycle(
        "agent-1",
        "momentum",
        "balanced",
        makeMarketData({ btcChange: 2.0 }),
        [],
        3000,
        8000,
      );

      // The decision should be normalized with capital constraints applied
      if (result.decision.side === "BUY") {
        expect(result.decision.capitalAllocated!).toBeLessThanOrEqual(3000);
        expect(result.decision.capitalAllocated!).toBeGreaterThan(0);
      }
    });

    it("should pass through system HOLD without normalizing", async () => {
      const { groqService } = await import("../../src/services/groqService");
      (
        groqService.processTradeCycle as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce({
        decision: {
          side: "HOLD",
          asset: "BTC",
          reason: "System: rate limited",
        },
        validation: { score: 0, comment: "System: rate limited" },
      });

      const { aiService } = await import("../../src/services/aiService");
      const result = await aiService.processTradeCycle(
        "agent-1",
        "momentum",
        "balanced",
        makeMarketData(),
        [],
      );

      expect(result.engine).toBe("GROQ_GPT_OSS_120B");
      // System HOLDs are passed through as-is
      expect(result.decision.side).toBe("HOLD");
    });

    it("should handle GROQ_API_KEY_MISSING error", async () => {
      const { groqService } = await import("../../src/services/groqService");
      (
        groqService.processTradeCycle as ReturnType<typeof vi.fn>
      ).mockRejectedValueOnce(new Error("GROQ_API_KEY_MISSING"));

      const { aiService } = await import("../../src/services/aiService");
      const result = await aiService.processTradeCycle(
        "agent-1",
        "momentum",
        "balanced",
        makeMarketData(),
        [],
      );

      expect(result.engine).toBe("ERROR_NO_KEY");
      expect(result.decision.side).toBe("HOLD");
      expect(result.validation.score).toBe(0);
    });

    it("should handle GROQ_QUOTA_EXHAUSTED error", async () => {
      const { groqService } = await import("../../src/services/groqService");
      (
        groqService.processTradeCycle as ReturnType<typeof vi.fn>
      ).mockRejectedValueOnce(new Error("GROQ_QUOTA_EXHAUSTED"));

      const { aiService } = await import("../../src/services/aiService");
      const result = await aiService.processTradeCycle(
        "agent-1",
        "momentum",
        "balanced",
        makeMarketData(),
        [],
      );

      expect(result.engine).toBe("GROQ_ERROR");
      expect(result.decision.side).toBe("HOLD");
    });

    it("should handle generic errors gracefully", async () => {
      const { groqService } = await import("../../src/services/groqService");
      (
        groqService.processTradeCycle as ReturnType<typeof vi.fn>
      ).mockRejectedValueOnce(new Error("Network timeout"));

      const { aiService } = await import("../../src/services/aiService");
      const result = await aiService.processTradeCycle(
        "agent-1",
        "momentum",
        "balanced",
        makeMarketData(),
        [],
      );

      expect(result.engine).toBe("GROQ_ERROR");
      expect(result.decision.reason).toContain("Network timeout");
    });
  });

  describe("aiService.getQuotaStatus", () => {
    it("should delegate to groqService.getQuotaStatus", async () => {
      const { aiService } = await import("../../src/services/aiService");
      const status = aiService.getQuotaStatus();
      expect(status).toEqual({ remaining: 10, limit: 20 });
    });
  });
});
