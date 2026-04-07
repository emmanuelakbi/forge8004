// Feature: forge8004-core, Property 20: Spot grid bot strategy returns HOLD
// Feature: forge8004-core, Property 21: TP/SL position closure

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { normalizeTradeDecision } from "@/src/services/aiService";
import { checkTpSl } from "@/src/services/tpSlChecker";
import type { TradeIntent } from "@/src/lib/types";
import type { MarketData } from "@/src/services/marketService";
import { arbRiskProfile, arbMarketData } from "./arbitraries";

// ── Helpers ───────────────────────────────────────────────────────

function makeMarketData(
  btcPrice: number,
  ethPrice: number,
  change24h = 0.5,
): MarketData {
  return {
    btc: { price: btcPrice, change24h },
    eth: { price: ethPrice, change24h },
    timestamp: Date.now(),
  };
}

// ── Arbitraries ───────────────────────────────────────────────────

/**
 * Generates a raw AI decision with a non-HOLD side to test that
 * spot_grid_bot forces it to HOLD regardless.
 */
const arbRawDecisionNonHold = fc.record({
  side: fc.constantFrom("BUY" as const, "SELL" as const),
  asset: fc.constantFrom("BTC", "ETH"),
  size: fc.double({ min: 0.001, max: 10, noNaN: true }),
  reason: fc.string({ minLength: 1, maxLength: 100 }),
  timestamp: fc.integer({ min: 1_700_000_000_000, max: 2_000_000_000_000 }),
});

/**
 * Generates a raw AI decision with any side (including HOLD).
 */
const arbRawDecisionAnySide = fc.record({
  side: fc.constantFrom("BUY" as const, "SELL" as const, "HOLD" as const),
  asset: fc.constantFrom("BTC", "ETH"),
  size: fc.double({ min: 0.001, max: 10, noNaN: true }),
  reason: fc.string({ minLength: 1, maxLength: 100 }),
  timestamp: fc.integer({ min: 1_700_000_000_000, max: 2_000_000_000_000 }),
});

/**
 * Generates a BUY position with TP/SL levels and a market price
 * that is at or above the take-profit level.
 */
const arbBuyPositionHitTp = fc
  .tuple(
    fc.constantFrom("BTC", "ETH"),
    fc.double({ min: 100, max: 100_000, noNaN: true, noDefaultInfinity: true }),
    fc.double({ min: 0.01, max: 0.2, noNaN: true, noDefaultInfinity: true }),
  )
  .map(([asset, entryPrice, tpPct]) => {
    const takeProfit = Math.round(entryPrice * (1 + tpPct) * 100) / 100;
    const stopLoss = Math.round(entryPrice * (1 - tpPct) * 100) / 100;
    // Price at or above take-profit
    const currentPrice =
      Math.round(takeProfit * (1 + Math.random() * 0.05) * 100) / 100;
    return {
      position: {
        side: "BUY" as const,
        asset,
        takeProfit,
        stopLoss,
        currentStopLoss: undefined as number | undefined,
        trailingStopActive: false,
      },
      currentPrice,
    };
  })
  .filter(({ currentPrice, position }) => currentPrice >= position.takeProfit);

/**
 * Generates a BUY position with TP/SL levels and a market price
 * that is at or below the stop-loss level.
 */
const arbBuyPositionHitSl = fc
  .tuple(
    fc.constantFrom("BTC", "ETH"),
    fc.double({ min: 100, max: 100_000, noNaN: true, noDefaultInfinity: true }),
    fc.double({ min: 0.01, max: 0.2, noNaN: true, noDefaultInfinity: true }),
  )
  .map(([asset, entryPrice, slPct]) => {
    const takeProfit = Math.round(entryPrice * (1 + slPct * 2) * 100) / 100;
    const stopLoss = Math.round(entryPrice * (1 - slPct) * 100) / 100;
    // Price at or below stop-loss
    const currentPrice =
      Math.round(stopLoss * (1 - Math.random() * 0.05) * 100) / 100;
    return {
      position: {
        side: "BUY" as const,
        asset,
        takeProfit,
        stopLoss,
        currentStopLoss: undefined as number | undefined,
        trailingStopActive: false,
      },
      currentPrice,
    };
  })
  .filter(
    ({ currentPrice, position }) =>
      currentPrice <= position.stopLoss && currentPrice > 0,
  );

/**
 * Generates a SELL position with TP/SL levels and a market price
 * that is at or below the take-profit level (inverse of BUY).
 */
const arbSellPositionHitTp = fc
  .tuple(
    fc.constantFrom("BTC", "ETH"),
    fc.double({ min: 100, max: 100_000, noNaN: true, noDefaultInfinity: true }),
    fc.double({ min: 0.01, max: 0.2, noNaN: true, noDefaultInfinity: true }),
  )
  .map(([asset, entryPrice, tpPct]) => {
    // For SELL, take-profit is below entry
    const takeProfit = Math.round(entryPrice * (1 - tpPct) * 100) / 100;
    const stopLoss = Math.round(entryPrice * (1 + tpPct) * 100) / 100;
    // Price at or below take-profit
    const currentPrice =
      Math.round(takeProfit * (1 - Math.random() * 0.05) * 100) / 100;
    return {
      position: {
        side: "SELL" as const,
        asset,
        takeProfit,
        stopLoss,
        currentStopLoss: undefined as number | undefined,
        trailingStopActive: false,
      },
      currentPrice,
    };
  })
  .filter(
    ({ currentPrice, position }) =>
      currentPrice <= position.takeProfit && currentPrice > 0,
  );

/**
 * Generates a SELL position with TP/SL levels and a market price
 * that is at or above the stop-loss level (inverse of BUY).
 */
const arbSellPositionHitSl = fc
  .tuple(
    fc.constantFrom("BTC", "ETH"),
    fc.double({ min: 100, max: 100_000, noNaN: true, noDefaultInfinity: true }),
    fc.double({ min: 0.01, max: 0.2, noNaN: true, noDefaultInfinity: true }),
  )
  .map(([asset, entryPrice, slPct]) => {
    // For SELL, stop-loss is above entry
    const takeProfit = Math.round(entryPrice * (1 - slPct * 2) * 100) / 100;
    const stopLoss = Math.round(entryPrice * (1 + slPct) * 100) / 100;
    // Price at or above stop-loss
    const currentPrice =
      Math.round(stopLoss * (1 + Math.random() * 0.05) * 100) / 100;
    return {
      position: {
        side: "SELL" as const,
        asset,
        takeProfit,
        stopLoss,
        currentStopLoss: undefined as number | undefined,
        trailingStopActive: false,
      },
      currentPrice,
    };
  })
  .filter(({ currentPrice, position }) => currentPrice >= position.stopLoss);

// ── Property Tests ────────────────────────────────────────────────

describe("[Trading Properties]", () => {
  /**
   * Property 20: Spot grid bot strategy returns HOLD
   *
   * For any agent with strategyType "spot_grid_bot", the normalizeTradeDecision()
   * function should force the decision side to "HOLD" regardless of the AI
   * engine's raw output.
   *
   * **Validates: Requirements 4.8**
   */
  describe("Property 20: Spot grid bot strategy returns HOLD", () => {
    // Feature: forge8004-core, Property 20: Spot grid bot strategy returns HOLD
    it("should force HOLD for spot_grid_bot regardless of raw AI decision side", () => {
      fc.assert(
        fc.property(
          arbRawDecisionAnySide,
          arbRiskProfile,
          arbMarketData,
          fc.double({ min: 100, max: 1_000_000, noNaN: true }),
          fc.double({ min: 100, max: 1_000_000, noNaN: true }),
          (
            rawDecision,
            riskProfile,
            marketData,
            availableCapital,
            totalTreasury,
          ) => {
            const result = normalizeTradeDecision(
              "spot_grid_bot",
              riskProfile,
              marketData,
              [], // no active positions
              rawDecision as Partial<TradeIntent>,
              50, // validation score
              availableCapital,
              totalTreasury,
            );

            // spot_grid_bot should always produce HOLD
            expect(result.side).toBe("HOLD");
          },
        ),
        { numRuns: 200 },
      );
    });

    it("should force HOLD for spot_grid_bot even with active positions", () => {
      fc.assert(
        fc.property(
          arbRawDecisionNonHold,
          arbRiskProfile,
          arbMarketData,
          fc.double({ min: 100, max: 1_000_000, noNaN: true }),
          fc.double({ min: 100, max: 1_000_000, noNaN: true }),
          fc.array(
            fc.record({
              agentId: fc.constant("test-agent"),
              side: fc.constantFrom("BUY" as const, "SELL" as const),
              asset: fc.constantFrom("BTC", "ETH"),
              size: fc.double({ min: 0.001, max: 1, noNaN: true }),
              timestamp: fc.integer({
                min: 1_700_000_000_000,
                max: 2_000_000_000_000,
              }),
            }),
            { minLength: 0, maxLength: 3 },
          ),
          (
            rawDecision,
            riskProfile,
            marketData,
            availableCapital,
            totalTreasury,
            activePositions,
          ) => {
            const result = normalizeTradeDecision(
              "spot_grid_bot",
              riskProfile,
              marketData,
              activePositions as TradeIntent[],
              rawDecision as Partial<TradeIntent>,
              80, // high validation score
              availableCapital,
              totalTreasury,
            );

            // spot_grid_bot should always produce HOLD
            expect(result.side).toBe("HOLD");
          },
        ),
        { numRuns: 200 },
      );
    });
  });

  /**
   * Property 21: TP/SL position closure
   *
   * For any open BUY position with a takeProfit level, when the current market
   * price >= takeProfit, the position should close with status "HIT_TP".
   * For any open BUY position with a stopLoss level, when the current market
   * price <= stopLoss, the position should close with status "HIT_SL".
   * The inverse applies for SELL positions.
   *
   * **Validates: Requirements 19.2, 19.3**
   */
  describe("Property 21: TP/SL position closure", () => {
    // Feature: forge8004-core, Property 21: TP/SL position closure

    it("BUY position: price >= takeProfit → HIT_TP", () => {
      fc.assert(
        fc.property(arbBuyPositionHitTp, ({ position, currentPrice }) => {
          const result = checkTpSl(position, currentPrice);
          expect(result.triggered).toBe(true);
          if (result.triggered) {
            expect(result.status).toBe("HIT_TP");
          }
        }),
        { numRuns: 200 },
      );
    });

    it("BUY position: price <= stopLoss → HIT_SL", () => {
      fc.assert(
        fc.property(arbBuyPositionHitSl, ({ position, currentPrice }) => {
          const result = checkTpSl(position, currentPrice);
          expect(result.triggered).toBe(true);
          if (result.triggered) {
            expect(result.status).toBe("HIT_SL");
          }
        }),
        { numRuns: 200 },
      );
    });

    it("SELL position: price <= takeProfit → HIT_TP", () => {
      fc.assert(
        fc.property(arbSellPositionHitTp, ({ position, currentPrice }) => {
          const result = checkTpSl(position, currentPrice);
          expect(result.triggered).toBe(true);
          if (result.triggered) {
            expect(result.status).toBe("HIT_TP");
          }
        }),
        { numRuns: 200 },
      );
    });

    it("SELL position: price >= stopLoss → HIT_SL", () => {
      fc.assert(
        fc.property(arbSellPositionHitSl, ({ position, currentPrice }) => {
          const result = checkTpSl(position, currentPrice);
          expect(result.triggered).toBe(true);
          if (result.triggered) {
            expect(result.status).toBe("HIT_SL");
          }
        }),
        { numRuns: 200 },
      );
    });

    it("should not trigger when price is between stopLoss and takeProfit", () => {
      fc.assert(
        fc.property(
          fc.constantFrom("BUY" as const, "SELL" as const),
          fc.constantFrom("BTC", "ETH"),
          fc.double({
            min: 100,
            max: 100_000,
            noNaN: true,
            noDefaultInfinity: true,
          }),
          fc.double({
            min: 0.02,
            max: 0.15,
            noNaN: true,
            noDefaultInfinity: true,
          }),
          (side, asset, entryPrice, pct) => {
            let takeProfit: number;
            let stopLoss: number;
            let currentPrice: number;

            if (side === "BUY") {
              takeProfit = Math.round(entryPrice * (1 + pct) * 100) / 100;
              stopLoss = Math.round(entryPrice * (1 - pct) * 100) / 100;
              // Price strictly between SL and TP
              currentPrice =
                Math.round(((stopLoss + takeProfit) / 2) * 100) / 100;
            } else {
              takeProfit = Math.round(entryPrice * (1 - pct) * 100) / 100;
              stopLoss = Math.round(entryPrice * (1 + pct) * 100) / 100;
              // Price strictly between TP and SL (for SELL: TP < entry < SL)
              currentPrice =
                Math.round(((takeProfit + stopLoss) / 2) * 100) / 100;
            }

            // Ensure price is strictly between the levels
            if (side === "BUY") {
              if (currentPrice <= stopLoss || currentPrice >= takeProfit)
                return;
            } else {
              if (currentPrice >= stopLoss || currentPrice <= takeProfit)
                return;
            }

            const result = checkTpSl(
              {
                side,
                asset,
                takeProfit,
                stopLoss,
                currentStopLoss: undefined,
                trailingStopActive: false,
              },
              currentPrice,
            );
            expect(result.triggered).toBe(false);
          },
        ),
        { numRuns: 200 },
      );
    });
  });
});

// Feature: forge8004-core, Property 22: Limit order lifecycle
// Feature: forge8004-core, Property 23: Limit order cancellation on cap breach
// Feature: forge8004-core, Property 24: Trailing stop lifecycle

import {
  checkLimitOrder,
  computeLimitOrderExpiry,
} from "@/src/services/limitOrderChecker";
import { evaluateTrailingStop } from "@/src/services/trailingStopChecker";
import { arbAgentStrategyType } from "./arbitraries";
import {
  getExecutionProfile,
  getTrailingDistancePct,
  TRAILING_PROFIT_TRIGGER_PCT,
} from "@/src/services/trustArtifacts";
import type { AgentStrategyType } from "@/src/lib/types";

// ── Arbitraries for Properties 22–24 ─────────────────────────────

/** Strategies that actually trade (not spot_grid_bot which always HOLDs) */
const arbTradingStrategy: fc.Arbitrary<AgentStrategyType> = fc.constantFrom(
  "range_trading" as const,
  "momentum" as const,
  "mean_reversion" as const,
  "arbitrage" as const,
  "yield" as const,
  "market_making" as const,
  "risk_off" as const,
);

const arbSide = fc.constantFrom("BUY" as const, "SELL" as const);
const arbAsset = fc.constantFrom("BTC" as const, "ETH" as const);

/**
 * Generates a pending limit order with a valid limitPrice relative to a
 * reference price, plus a creation timestamp.
 */
const arbPendingLimitOrder = fc
  .tuple(
    arbSide,
    arbAsset,
    fc.double({ min: 100, max: 100_000, noNaN: true, noDefaultInfinity: true }),
    fc.double({ min: 0.005, max: 0.08, noNaN: true, noDefaultInfinity: true }),
    fc.double({ min: 100, max: 50_000, noNaN: true, noDefaultInfinity: true }),
    arbTradingStrategy,
  )
  .map(([side, asset, refPrice, offsetPct, capitalAllocated, strategy]) => {
    // BUY limit is below current price; SELL limit is above
    const limitPrice =
      side === "BUY"
        ? Math.round(refPrice * (1 - offsetPct) * 100) / 100
        : Math.round(refPrice * (1 + offsetPct) * 100) / 100;
    const createdAt = 1_700_000_000_000;
    const expiresAt = computeLimitOrderExpiry(strategy, createdAt);
    return {
      order: {
        side,
        asset,
        limitPrice,
        expiresAt,
        status: "PENDING" as const,
        capitalAllocated,
      },
      refPrice,
      createdAt,
      strategy,
    };
  });

/**
 * Generates a BUY position that is profitable beyond the trailing stop
 * activation threshold.
 */
const arbProfitableBuyPosition = fc
  .tuple(
    arbAsset,
    fc.double({ min: 100, max: 100_000, noNaN: true, noDefaultInfinity: true }),
    fc.double({ min: 0.02, max: 0.15, noNaN: true, noDefaultInfinity: true }),
    fc.double({ min: 0.001, max: 5, noNaN: true, noDefaultInfinity: true }),
    arbTradingStrategy,
    arbRiskProfile,
  )
  .map(([asset, entryPrice, profitPct, size, strategy, riskProfile]) => {
    const triggerPct = TRAILING_PROFIT_TRIGGER_PCT * 100;
    // Ensure profit is above threshold
    const effectiveProfitPct = Math.max(profitPct, triggerPct / 100 + 0.005);
    const currentPrice =
      Math.round(entryPrice * (1 + effectiveProfitPct) * 100) / 100;
    const stopLoss = Math.round(entryPrice * 0.97 * 100) / 100;
    const takeProfit = Math.round(entryPrice * 1.1 * 100) / 100;
    return {
      position: {
        agentId: "test-agent",
        side: "BUY" as const,
        asset,
        entryPrice,
        size,
        stopLoss,
        initialStopLoss: stopLoss,
        currentStopLoss: stopLoss,
        takeProfit,
        trailingStopActive: false,
        profitProtected: 0,
        peakFavorablePrice: entryPrice,
        timestamp: 1_700_000_000_000,
        status: "OPEN" as const,
      } as TradeIntent,
      currentPrice,
      strategy,
      riskProfile,
    };
  })
  .filter(({ currentPrice, position }) => {
    const pnlPct =
      ((currentPrice - position.entryPrice!) / position.entryPrice!) * 100;
    return pnlPct >= TRAILING_PROFIT_TRIGGER_PCT * 100;
  });

/**
 * Generates a SELL position that is profitable beyond the trailing stop
 * activation threshold.
 */
const arbProfitableSellPosition = fc
  .tuple(
    arbAsset,
    fc.double({ min: 100, max: 100_000, noNaN: true, noDefaultInfinity: true }),
    fc.double({ min: 0.02, max: 0.15, noNaN: true, noDefaultInfinity: true }),
    fc.double({ min: 0.001, max: 5, noNaN: true, noDefaultInfinity: true }),
    arbTradingStrategy,
    arbRiskProfile,
  )
  .map(([asset, entryPrice, profitPct, size, strategy, riskProfile]) => {
    const triggerPct = TRAILING_PROFIT_TRIGGER_PCT * 100;
    const effectiveProfitPct = Math.max(profitPct, triggerPct / 100 + 0.005);
    const currentPrice =
      Math.round(entryPrice * (1 - effectiveProfitPct) * 100) / 100;
    const stopLoss = Math.round(entryPrice * 1.03 * 100) / 100;
    const takeProfit = Math.round(entryPrice * 0.9 * 100) / 100;
    return {
      position: {
        agentId: "test-agent",
        side: "SELL" as const,
        asset,
        entryPrice,
        size,
        stopLoss,
        initialStopLoss: stopLoss,
        currentStopLoss: stopLoss,
        takeProfit,
        trailingStopActive: false,
        profitProtected: 0,
        peakFavorablePrice: entryPrice,
        timestamp: 1_700_000_000_000,
        status: "OPEN" as const,
      } as TradeIntent,
      currentPrice,
      strategy,
      riskProfile,
    };
  })
  .filter(({ currentPrice, position }) => {
    const pnlPct =
      ((position.entryPrice! - currentPrice) / position.entryPrice!) * 100;
    return pnlPct >= TRAILING_PROFIT_TRIGGER_PCT * 100 && currentPrice > 0;
  });

// ── Property Tests 22–24 ─────────────────────────────────────────

describe("[Trading Properties — Limit Orders & Trailing Stops]", () => {
  /**
   * Property 22: Limit order lifecycle
   *
   * LIMIT orders persist as PENDING, transition to EXECUTED when price
   * reaches limitPrice, cancel after 2x maxHoldMinutes.
   *
   * **Validates: Requirements 20.1, 20.2, 20.3**
   */
  describe("Property 22: Limit order lifecycle", () => {
    // Feature: forge8004-core, Property 22: Limit order lifecycle

    it("PENDING order stays KEEP when price has not reached limitPrice", () => {
      fc.assert(
        fc.property(arbPendingLimitOrder, ({ order, refPrice }) => {
          // Use the reference price (which is away from the limit)
          const result = checkLimitOrder(
            order,
            refPrice,
            order.expiresAt! - 60_000, // well before expiry
            0,
            2,
            false,
          );
          expect(result.action).toBe("KEEP");
        }),
        { numRuns: 100 },
      );
    });

    it("PENDING order transitions to FILL when price reaches limitPrice", () => {
      fc.assert(
        fc.property(
          arbPendingLimitOrder,
          fc.double({
            min: 0,
            max: 0.01,
            noNaN: true,
            noDefaultInfinity: true,
          }),
          ({ order }, slippage) => {
            // For BUY: price at or below limitPrice; for SELL: price at or above
            const fillPrice =
              order.side === "BUY"
                ? order.limitPrice! * (1 - slippage)
                : order.limitPrice! * (1 + slippage);
            const result = checkLimitOrder(
              order,
              fillPrice,
              order.expiresAt! - 60_000,
              0,
              2,
              false,
            );
            expect(result.action).toBe("FILL");
          },
        ),
        { numRuns: 100 },
      );
    });

    it("PENDING order transitions to EXPIRE after 2x maxHoldMinutes", () => {
      fc.assert(
        fc.property(arbPendingLimitOrder, ({ order, refPrice, strategy }) => {
          const profile = getExecutionProfile(strategy);
          const expiryMinutes = profile.maxHoldMinutes * 2 || 240;
          // Verify the computed expiry matches 2x maxHoldMinutes
          expect(order.expiresAt).toBe(
            1_700_000_000_000 + expiryMinutes * 60_000,
          );

          // Check at expiry time — should expire
          const result = checkLimitOrder(
            order,
            refPrice, // price hasn't reached limit
            order.expiresAt!, // exactly at expiry
            0,
            2,
            false,
          );
          expect(result.action).toBe("EXPIRE");
        }),
        { numRuns: 100 },
      );
    });

    it("expiry time equals createdAt + 2 * maxHoldMinutes * 60000", () => {
      fc.assert(
        fc.property(
          arbTradingStrategy,
          fc.integer({ min: 1_700_000_000_000, max: 2_000_000_000_000 }),
          (strategy, createdAt) => {
            const profile = getExecutionProfile(strategy);
            const expectedExpiry =
              createdAt + (profile.maxHoldMinutes * 2 || 240) * 60_000;
            const actual = computeLimitOrderExpiry(strategy, createdAt);
            expect(actual).toBe(expectedExpiry);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 23: Limit order cancellation on cap breach
   *
   * Pending limit orders cancel when position cap is full or duplicate
   * exposure exists.
   *
   * **Validates: Requirements 20.5**
   */
  describe("Property 23: Limit order cancellation on cap breach", () => {
    // Feature: forge8004-core, Property 23: Limit order cancellation on cap breach

    it("cancels when position cap is full at fill time", () => {
      fc.assert(
        fc.property(
          arbPendingLimitOrder,
          fc.integer({ min: 1, max: 5 }),
          ({ order }, maxPositions) => {
            // Price reaches limit
            const fillPrice =
              order.side === "BUY"
                ? order.limitPrice! * 0.999
                : order.limitPrice! * 1.001;
            const result = checkLimitOrder(
              order,
              fillPrice,
              order.expiresAt! - 60_000,
              maxPositions, // already at cap
              maxPositions,
              false,
            );
            expect(result.action).toBe("CANCEL_CAP_BREACH");
            expect(result.reason).toContain("position cap");
          },
        ),
        { numRuns: 100 },
      );
    });

    it("cancels when duplicate exposure exists at fill time", () => {
      fc.assert(
        fc.property(arbPendingLimitOrder, ({ order }) => {
          const fillPrice =
            order.side === "BUY"
              ? order.limitPrice! * 0.999
              : order.limitPrice! * 1.001;
          const result = checkLimitOrder(
            order,
            fillPrice,
            order.expiresAt! - 60_000,
            0,
            2,
            true, // duplicate exposure
          );
          expect(result.action).toBe("CANCEL_CAP_BREACH");
          expect(result.reason).toContain("duplicate exposure");
        }),
        { numRuns: 100 },
      );
    });

    it("fills normally when cap is not full and no duplicate exposure", () => {
      fc.assert(
        fc.property(arbPendingLimitOrder, ({ order }) => {
          const fillPrice =
            order.side === "BUY"
              ? order.limitPrice! * 0.999
              : order.limitPrice! * 1.001;
          const result = checkLimitOrder(
            order,
            fillPrice,
            order.expiresAt! - 60_000,
            0,
            2,
            false,
          );
          expect(result.action).toBe("FILL");
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 24: Trailing stop lifecycle
   *
   * Trailing stop activates when profitable beyond threshold,
   * currentStopLoss trails peakFavorablePrice, position closes when
   * price crosses trailing level.
   *
   * **Validates: Requirements 21.1, 21.2, 21.3, 21.4**
   */
  describe("Property 24: Trailing stop lifecycle", () => {
    // Feature: forge8004-core, Property 24: Trailing stop lifecycle

    it("BUY: activates trailing stop when profit exceeds threshold", () => {
      fc.assert(
        fc.property(
          arbProfitableBuyPosition,
          ({ position, currentPrice, strategy, riskProfile }) => {
            const result = evaluateTrailingStop(
              position,
              currentPrice,
              strategy,
              riskProfile,
            );
            expect(result.trailingStopActive).toBe(true);
            expect(["ACTIVATE", "RAISE", "HOLD", "CLOSE"]).toContain(
              result.action,
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it("SELL: activates trailing stop when profit exceeds threshold", () => {
      fc.assert(
        fc.property(
          arbProfitableSellPosition,
          ({ position, currentPrice, strategy, riskProfile }) => {
            const result = evaluateTrailingStop(
              position,
              currentPrice,
              strategy,
              riskProfile,
            );
            expect(result.trailingStopActive).toBe(true);
            expect(["ACTIVATE", "RAISE", "HOLD", "CLOSE"]).toContain(
              result.action,
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it("BUY: currentStopLoss = peakFavorablePrice * (1 - trailingDistancePct) or better", () => {
      fc.assert(
        fc.property(
          arbProfitableBuyPosition,
          ({ position, currentPrice, strategy, riskProfile }) => {
            const result = evaluateTrailingStop(
              position,
              currentPrice,
              strategy,
              riskProfile,
            );
            if (result.action === "CLOSE") return; // skip closed positions
            const distancePct = getTrailingDistancePct(strategy, riskProfile);
            const expectedMinStop =
              result.peakFavorablePrice! * (1 - distancePct);
            // currentStopLoss should be >= the trailing formula (floor may push it higher)
            expect(result.currentStopLoss).toBeGreaterThanOrEqual(
              expectedMinStop - 0.01,
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it("SELL: currentStopLoss = peakFavorablePrice * (1 + trailingDistancePct) or better", () => {
      fc.assert(
        fc.property(
          arbProfitableSellPosition,
          ({ position, currentPrice, strategy, riskProfile }) => {
            const result = evaluateTrailingStop(
              position,
              currentPrice,
              strategy,
              riskProfile,
            );
            if (result.action === "CLOSE") return;
            const distancePct = getTrailingDistancePct(strategy, riskProfile);
            const expectedMaxStop =
              result.peakFavorablePrice! * (1 + distancePct);
            // For SELL, currentStopLoss should be <= the trailing formula (floor may push it lower)
            expect(result.currentStopLoss).toBeLessThanOrEqual(
              expectedMaxStop + 0.01,
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it("BUY: peakFavorablePrice tracks the highest price seen", () => {
      fc.assert(
        fc.property(
          arbProfitableBuyPosition,
          ({ position, currentPrice, strategy, riskProfile }) => {
            const result = evaluateTrailingStop(
              position,
              currentPrice,
              strategy,
              riskProfile,
            );
            // peakFavorablePrice should be >= entryPrice for profitable BUY
            expect(result.peakFavorablePrice).toBeGreaterThanOrEqual(
              position.entryPrice!,
            );
            // peakFavorablePrice should be >= currentPrice (it's the max)
            expect(result.peakFavorablePrice).toBeGreaterThanOrEqual(
              currentPrice - 0.01,
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it("does not activate when position is not profitable enough", () => {
      fc.assert(
        fc.property(
          arbAsset,
          fc.double({
            min: 1000,
            max: 50_000,
            noNaN: true,
            noDefaultInfinity: true,
          }),
          fc.double({
            min: 0.001,
            max: 5,
            noNaN: true,
            noDefaultInfinity: true,
          }),
          arbTradingStrategy,
          arbRiskProfile,
          (asset, entryPrice, size, strategy, riskProfile) => {
            // Price barely above entry — below threshold
            const triggerPct = TRAILING_PROFIT_TRIGGER_PCT * 100;
            const currentPrice =
              Math.round(entryPrice * (1 + (triggerPct / 100) * 0.3) * 100) /
              100;
            const position = {
              agentId: "test-agent",
              side: "BUY" as const,
              asset,
              entryPrice,
              size,
              stopLoss: entryPrice * 0.97,
              initialStopLoss: entryPrice * 0.97,
              currentStopLoss: entryPrice * 0.97,
              takeProfit: entryPrice * 1.1,
              trailingStopActive: false,
              profitProtected: 0,
              peakFavorablePrice: entryPrice,
              timestamp: 1_700_000_000_000,
              status: "OPEN" as const,
            } as TradeIntent;

            const result = evaluateTrailingStop(
              position,
              currentPrice,
              strategy,
              riskProfile,
            );
            // Should not activate — profit is below threshold
            expect(result.trailingStopActive).toBe(false);
            expect(result.action).toBe("HOLD");
          },
        ),
        { numRuns: 100 },
      );
    });

    it("BUY: closes position when price crosses trailing stop level", () => {
      fc.assert(
        fc.property(
          arbAsset,
          fc.double({
            min: 1000,
            max: 50_000,
            noNaN: true,
            noDefaultInfinity: true,
          }),
          fc.double({
            min: 0.001,
            max: 5,
            noNaN: true,
            noDefaultInfinity: true,
          }),
          arbTradingStrategy,
          arbRiskProfile,
          (asset, entryPrice, size, strategy, riskProfile) => {
            const distancePct = getTrailingDistancePct(strategy, riskProfile);
            // Set up a position that already has trailing stop active with a high peak
            const peakPrice = entryPrice * 1.08;
            const trailingStop = peakPrice * (1 - distancePct);
            // Price drops below the trailing stop
            const currentPrice = Math.round(trailingStop * 0.995 * 100) / 100;
            if (currentPrice <= 0) return;

            const position = {
              agentId: "test-agent",
              side: "BUY" as const,
              asset,
              entryPrice,
              size,
              stopLoss: entryPrice * 0.95,
              initialStopLoss: entryPrice * 0.95,
              currentStopLoss: trailingStop,
              takeProfit: entryPrice * 1.15,
              trailingStopActive: true,
              trailingStopActivatedAt: 1_700_000_000_000,
              profitProtected: 0,
              peakFavorablePrice: peakPrice,
              timestamp: 1_700_000_000_000,
              status: "OPEN" as const,
            } as TradeIntent;

            // The unrealized PnL might still be positive enough to trigger trailing logic
            const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;
            if (pnlPct < TRAILING_PROFIT_TRIGGER_PCT * 100) return;

            const result = evaluateTrailingStop(
              position,
              currentPrice,
              strategy,
              riskProfile,
            );
            expect(result.action).toBe("CLOSE");
            if (result.action === "CLOSE") {
              expect(result.exitPrice).toBe(currentPrice);
              expect(result.peakFavorablePrice).toBeDefined();
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
