// Feature: forge8004-core, Property 16: Grid levels are evenly spaced
// Feature: forge8004-core, Property 17: Grid fill logic
// Feature: forge8004-core, Property 18: Grid stop-loss and take-profit
// Feature: forge8004-core, Property 19: Grid config history tracking

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  createSpotGridRuntime,
  evaluateSpotGridRuntime,
  modifySpotGrid,
} from "@/src/services/gridBotService";
import type { GridRuntimeState, GridLevelState } from "@/src/lib/types";
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

// ── Arbitraries ───────────────────────────────────────────────────

/**
 * Generates valid grid range parameters where the range is wide enough
 * relative to gridLevels so that no levels get clamped to rangeLow/rangeHigh.
 * This ensures the even-spacing property holds without clamping interference.
 */
const arbGridRangeParams = fc
  .tuple(
    fc.double({ min: 500, max: 50_000, noNaN: true, noDefaultInfinity: true }),
    fc.double({ min: 0.1, max: 0.3, noNaN: true, noDefaultInfinity: true }),
    fc.integer({ min: 2, max: 16 }),
    fc.double({
      min: 1_000,
      max: 100_000,
      noNaN: true,
      noDefaultInfinity: true,
    }),
    fc.constantFrom("BTC" as const, "ETH" as const),
  )
  .map(([currentPrice, spreadPct, gridLevels, capital, asset]) => {
    // Use a symmetric spread so currentPrice is centered in the range
    const halfSpread = currentPrice * spreadPct;
    const rangeLow = Math.round((currentPrice - halfSpread) * 100) / 100;
    const rangeHigh = Math.round((currentPrice + halfSpread) * 100) / 100;
    return { rangeLow, rangeHigh, gridLevels, capital, currentPrice, asset };
  })
  .filter(({ rangeLow, rangeHigh }) => rangeHigh > rangeLow && rangeLow > 0);

/**
 * Generates grid params specifically for fill tests, ensuring capital per level
 * stays well within allocation limits.
 */
const arbGridFillParams = fc
  .tuple(
    fc.double({
      min: 1_000,
      max: 50_000,
      noNaN: true,
      noDefaultInfinity: true,
    }),
    fc.double({ min: 0.1, max: 0.25, noNaN: true, noDefaultInfinity: true }),
    fc.integer({ min: 2, max: 10 }),
    fc.constantFrom("BTC" as const, "ETH" as const),
  )
  .map(([currentPrice, spreadPct, gridLevels, asset]) => {
    const halfSpread = currentPrice * spreadPct;
    const rangeLow = Math.round((currentPrice - halfSpread) * 100) / 100;
    const rangeHigh = Math.round((currentPrice + halfSpread) * 100) / 100;
    // Capital sized so each level gets a reasonable amount
    const capital = Math.round(gridLevels * 200 * 100) / 100;
    return { rangeLow, rangeHigh, gridLevels, capital, currentPrice, asset };
  })
  .filter(({ rangeLow, rangeHigh }) => rangeHigh > rangeLow && rangeLow > 0);

// ── Property Tests ────────────────────────────────────────────────

describe("[Grid Bot Properties]", () => {
  /**
   * Property 16: Grid levels are evenly spaced
   *
   * For any rangeLow < rangeHigh and gridLevels >= 2, buildGridLevelsFromRange()
   * should produce levels where the price difference between consecutive levels
   * is constant (within floating-point tolerance), all prices are between rangeLow
   * and rangeHigh, and buy levels are below the reference price while sell levels
   * are above.
   *
   * **Validates: Requirements 13.2**
   */
  describe("Property 16: Grid levels are evenly spaced", () => {
    // Feature: forge8004-core, Property 16: Grid levels are evenly spaced
    it("should produce evenly spaced levels within range with buys below and sells above reference price", () => {
      fc.assert(
        fc.property(
          arbGridRangeParams,
          ({
            rangeLow,
            rangeHigh,
            gridLevels,
            capital,
            currentPrice,
            asset,
          }) => {
            const marketData =
              asset === "BTC"
                ? makeMarketData(currentPrice, 2000)
                : makeMarketData(60000, currentPrice);

            const runtime = createSpotGridRuntime({
              agentId: "test-agent",
              marketData,
              capitalReserved: capital,
              asset,
              overrides: {
                rangeLow,
                rangeHigh,
                gridLevels,
                configMode: "manual",
              },
            });

            const buyLevels = runtime.levels
              .filter((l) => l.side === "BUY")
              .sort((a, b) => a.price - b.price);
            const sellLevels = runtime.levels
              .filter((l) => l.side === "SELL")
              .sort((a, b) => a.price - b.price);

            // All prices should be within [rangeLow, rangeHigh]
            for (const level of runtime.levels) {
              expect(level.price).toBeGreaterThanOrEqual(rangeLow);
              expect(level.price).toBeLessThanOrEqual(rangeHigh);
            }

            // Buy levels should be at or below the reference price
            for (const level of buyLevels) {
              expect(level.price).toBeLessThanOrEqual(currentPrice + 0.01);
            }

            // Sell levels should be at or above the reference price
            for (const level of sellLevels) {
              expect(level.price).toBeGreaterThanOrEqual(currentPrice - 0.01);
            }

            // The implementation uses interval = (rangeHigh - rangeLow) / (totalLevels + 1)
            // and places levels at currentPrice ± interval * i.
            // Levels that would exceed the range are clamped.
            // For unclamped levels, spacing between consecutive same-side levels should be constant.
            const clampedLevels = Math.max(
              2,
              Math.min(50, Math.round(gridLevels)),
            );
            const expectedInterval =
              (rangeHigh - rangeLow) / (clampedLevels + 1);

            // Check buy level spacing: unclamped buys should be spaced by expectedInterval
            const unclampedBuys = buyLevels.filter(
              (l) => l.price > rangeLow + 0.01,
            );
            if (unclampedBuys.length >= 2) {
              for (let i = 1; i < unclampedBuys.length; i++) {
                const spacing =
                  unclampedBuys[i].price - unclampedBuys[i - 1].price;
                expect(spacing).toBeCloseTo(expectedInterval, 0);
              }
            }

            // Check sell level spacing: unclamped sells should be spaced by expectedInterval
            const unclampedSells = sellLevels.filter(
              (l) => l.price < rangeHigh - 0.01,
            );
            if (unclampedSells.length >= 2) {
              for (let i = 1; i < unclampedSells.length; i++) {
                const spacing =
                  unclampedSells[i].price - unclampedSells[i - 1].price;
                expect(spacing).toBeCloseTo(expectedInterval, 0);
              }
            }
          },
        ),
        { numRuns: 200 },
      );
    });

    it("should produce the correct number of buy and sell levels", () => {
      fc.assert(
        fc.property(
          arbGridRangeParams,
          ({
            rangeLow,
            rangeHigh,
            gridLevels,
            capital,
            currentPrice,
            asset,
          }) => {
            const marketData =
              asset === "BTC"
                ? makeMarketData(currentPrice, 2000)
                : makeMarketData(60000, currentPrice);

            const runtime = createSpotGridRuntime({
              agentId: "test-agent",
              marketData,
              capitalReserved: capital,
              asset,
              overrides: {
                rangeLow,
                rangeHigh,
                gridLevels,
                configMode: "manual",
              },
            });

            const clampedLevels = Math.max(
              2,
              Math.min(50, Math.round(gridLevels)),
            );
            const expectedBuyCount = Math.floor(clampedLevels / 2);

            const buyLevels = runtime.levels.filter((l) => l.side === "BUY");
            const sellLevels = runtime.levels.filter((l) => l.side === "SELL");

            expect(buyLevels.length).toBe(expectedBuyCount);
            expect(sellLevels.length).toBe(expectedBuyCount);
          },
        ),
        { numRuns: 200 },
      );
    });
  });

  /**
   * Property 17: Grid fill logic
   *
   * For any grid runtime state and market price, evaluateSpotGridRuntime()
   * should fill buy levels when the market price drops to or below the buy
   * level price, creating a paired sell level. When the market price rises
   * to or above a sell level that has a filled paired buy, the sell should
   * fill and record a positive realized profit equal to
   * (sellPrice - buyPrice) * quantity.
   *
   * **Validates: Requirements 13.3, 13.4**
   */
  describe("Property 17: Grid fill logic", () => {
    // Feature: forge8004-core, Property 17: Grid fill logic
    it("should fill buy levels when market price drops to or below buy level price", () => {
      fc.assert(
        fc.property(
          arbGridFillParams,
          ({
            rangeLow,
            rangeHigh,
            gridLevels,
            capital,
            currentPrice,
            asset,
          }) => {
            const marketData =
              asset === "BTC"
                ? makeMarketData(currentPrice, 2000)
                : makeMarketData(60000, currentPrice);

            const runtime = createSpotGridRuntime({
              agentId: "test-agent",
              marketData,
              capitalReserved: capital,
              asset,
              overrides: {
                rangeLow,
                rangeHigh,
                gridLevels,
                configMode: "manual",
              },
            });

            // Find the highest buy level (closest to current price)
            const waitingBuys = runtime.levels
              .filter((l) => l.side === "BUY" && l.status === "waiting")
              .sort((a, b) => b.price - a.price);

            if (waitingBuys.length === 0) return;

            const targetBuy = waitingBuys[0];

            // Drop market price to the buy level price to trigger fill
            const dropPrice = targetBuy.price;
            const dropMarketData =
              asset === "BTC"
                ? makeMarketData(dropPrice, 2000, Date.now())
                : makeMarketData(60000, dropPrice, Date.now());

            // Use generous treasury and allocation limits so the fill isn't blocked
            const result = evaluateSpotGridRuntime({
              runtime,
              marketData: dropMarketData,
              totalTreasury: capital * 10,
              maxOpenPositions: 50,
              maxAllocationNotional: capital * 10,
            });

            // Find the buy level in the result
            const filledBuy = result.runtime.levels.find(
              (l) => l.id === targetBuy.id,
            );

            // The buy should be filled
            expect(filledBuy?.status).toBe("filled");
            expect(filledBuy?.quantity).toBeGreaterThan(0);

            // The paired sell should now be "waiting"
            const pairedSell = result.runtime.levels.find(
              (l) => l.id === targetBuy.pairedLevelId,
            );
            expect(pairedSell?.status).toBe("waiting");
            expect(pairedSell?.quantity).toBeGreaterThan(0);

            // A buy_filled event should have been emitted
            const buyFilledEvents = result.events.filter(
              (e) => e.type === "buy_filled",
            );
            expect(buyFilledEvents.length).toBeGreaterThanOrEqual(1);
          },
        ),
        { numRuns: 200 },
      );
    });

    it("should fill sell levels and record positive profit when market price rises to sell level", () => {
      fc.assert(
        fc.property(
          arbGridFillParams,
          ({
            rangeLow,
            rangeHigh,
            gridLevels,
            capital,
            currentPrice,
            asset,
          }) => {
            const marketData =
              asset === "BTC"
                ? makeMarketData(currentPrice, 2000)
                : makeMarketData(60000, currentPrice);

            const runtime = createSpotGridRuntime({
              agentId: "test-agent",
              marketData,
              capitalReserved: capital,
              asset,
              overrides: {
                rangeLow,
                rangeHigh,
                gridLevels,
                configMode: "manual",
              },
            });

            // First: drop price to fill a buy level
            const waitingBuys = runtime.levels
              .filter((l) => l.side === "BUY" && l.status === "waiting")
              .sort((a, b) => b.price - a.price);

            if (waitingBuys.length === 0) return;

            const targetBuy = waitingBuys[0];
            const dropPrice = targetBuy.price;
            const dropMarketData =
              asset === "BTC"
                ? makeMarketData(dropPrice, 2000, Date.now())
                : makeMarketData(60000, dropPrice, Date.now());

            const afterBuy = evaluateSpotGridRuntime({
              runtime,
              marketData: dropMarketData,
              totalTreasury: capital * 10,
              maxOpenPositions: 50,
              maxAllocationNotional: capital * 10,
            });

            // Verify buy was filled
            const filledBuy = afterBuy.runtime.levels.find(
              (l) => l.id === targetBuy.id,
            );
            if (filledBuy?.status !== "filled") return;

            // Find the paired sell level
            const pairedSell = afterBuy.runtime.levels.find(
              (l) => l.id === targetBuy.pairedLevelId,
            );
            if (!pairedSell || pairedSell.status !== "waiting") return;

            // Now raise price to the sell level to trigger sell fill
            const risePrice = pairedSell.price;
            const riseMarketData =
              asset === "BTC"
                ? makeMarketData(risePrice, 2000, Date.now())
                : makeMarketData(60000, risePrice, Date.now());

            const afterSell = evaluateSpotGridRuntime({
              runtime: afterBuy.runtime,
              marketData: riseMarketData,
              totalTreasury: capital * 10,
              maxOpenPositions: 50,
              maxAllocationNotional: capital * 10,
            });

            // The sell should be closed
            const closedSell = afterSell.runtime.levels.find(
              (l) => l.id === pairedSell.id,
            );
            expect(closedSell?.status).toBe("closed");

            // A sell_filled event should have been emitted
            const sellFilledEvents = afterSell.events.filter(
              (e) => e.type === "sell_filled",
            );
            expect(sellFilledEvents.length).toBeGreaterThanOrEqual(1);

            // The realized profit should be positive: (sellPrice - buyPrice) * quantity
            for (const event of sellFilledEvents) {
              if (event.type === "sell_filled") {
                const expectedProfit =
                  (pairedSell.price - filledBuy.price) * filledBuy.quantity;
                // Profit should be positive since sell price > buy price
                expect(event.realizedProfit).toBeGreaterThan(0);
                // Profit should match (sellPrice - buyPrice) * quantity within rounding
                expect(event.realizedProfit).toBeCloseTo(expectedProfit, 0);
              }
            }

            // Cumulative grid profit should have increased
            expect(afterSell.runtime.cumulativeGridProfit).toBeGreaterThan(
              afterBuy.runtime.cumulativeGridProfit,
            );
          },
        ),
        { numRuns: 200 },
      );
    });

    it("should not fill buy levels when market price is above buy level price", () => {
      fc.assert(
        fc.property(
          arbGridFillParams,
          ({
            rangeLow,
            rangeHigh,
            gridLevels,
            capital,
            currentPrice,
            asset,
          }) => {
            const marketData =
              asset === "BTC"
                ? makeMarketData(currentPrice, 2000)
                : makeMarketData(60000, currentPrice);

            const runtime = createSpotGridRuntime({
              agentId: "test-agent",
              marketData,
              capitalReserved: capital,
              asset,
              overrides: {
                rangeLow,
                rangeHigh,
                gridLevels,
                configMode: "manual",
              },
            });

            // Keep price at current (above all buy levels)
            const result = evaluateSpotGridRuntime({
              runtime,
              marketData,
              totalTreasury: capital * 10,
              maxOpenPositions: 50,
              maxAllocationNotional: capital * 10,
            });

            // No buy levels should have been filled
            const buyFilledEvents = result.events.filter(
              (e) => e.type === "buy_filled",
            );
            expect(buyFilledEvents.length).toBe(0);

            // All buy levels should still be waiting
            const buyLevels = result.runtime.levels.filter(
              (l) => l.side === "BUY",
            );
            for (const level of buyLevels) {
              expect(level.status).toBe("waiting");
            }
          },
        ),
        { numRuns: 200 },
      );
    });
  });

  /**
   * Property 18: Grid stop-loss and take-profit
   *
   * For any grid runtime with a configured stopLossPrice and/or takeProfitPrice,
   * checkBotLevelStops() should return a pause signal when the market price falls
   * below stopLossPrice or rises above takeProfitPrice.
   *
   * checkBotLevelStops is a private function tested indirectly via evaluateSpotGridRuntime().
   *
   * **Validates: Requirements 13.6, 13.7**
   */
  describe("Property 18: Grid stop-loss and take-profit", () => {
    // Feature: forge8004-core, Property 18: Grid stop-loss and take-profit

    /**
     * Arbitrary that generates a grid runtime with a stopLossPrice set below rangeLow,
     * and a market price that falls at or below the stopLossPrice.
     */
    const arbStopLossScenario = fc
      .tuple(
        fc.double({
          min: 5_000,
          max: 50_000,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        fc.double({
          min: 0.05,
          max: 0.2,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        fc.integer({ min: 2, max: 10 }),
        fc.double({
          min: 1_000,
          max: 50_000,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        fc.constantFrom("BTC" as const, "ETH" as const),
        fc.double({
          min: 0.01,
          max: 0.5,
          noNaN: true,
          noDefaultInfinity: true,
        }),
      )
      .map(
        ([
          currentPrice,
          spreadPct,
          gridLevels,
          capital,
          asset,
          slOffsetPct,
        ]) => {
          const halfSpread = currentPrice * spreadPct;
          const rangeLow = Math.round((currentPrice - halfSpread) * 100) / 100;
          const rangeHigh = Math.round((currentPrice + halfSpread) * 100) / 100;
          // Stop loss is below rangeLow
          const stopLossPrice =
            Math.round(rangeLow * (1 - slOffsetPct) * 100) / 100;
          // Market price at or below stop loss
          const marketPrice =
            Math.round(stopLossPrice * (1 - Math.random() * 0.01) * 100) / 100;
          return {
            rangeLow,
            rangeHigh,
            gridLevels,
            capital,
            currentPrice,
            asset,
            stopLossPrice,
            marketPrice,
          };
        },
      )
      .filter(
        ({ rangeLow, rangeHigh, stopLossPrice, marketPrice }) =>
          rangeHigh > rangeLow &&
          rangeLow > 0 &&
          stopLossPrice > 0 &&
          marketPrice > 0,
      );

    /**
     * Arbitrary that generates a grid runtime with a takeProfitPrice set above rangeHigh,
     * and a market price that rises at or above the takeProfitPrice.
     */
    const arbTakeProfitScenario = fc
      .tuple(
        fc.double({
          min: 5_000,
          max: 50_000,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        fc.double({
          min: 0.05,
          max: 0.2,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        fc.integer({ min: 2, max: 10 }),
        fc.double({
          min: 1_000,
          max: 50_000,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        fc.constantFrom("BTC" as const, "ETH" as const),
        fc.double({
          min: 0.01,
          max: 0.5,
          noNaN: true,
          noDefaultInfinity: true,
        }),
      )
      .map(
        ([
          currentPrice,
          spreadPct,
          gridLevels,
          capital,
          asset,
          tpOffsetPct,
        ]) => {
          const halfSpread = currentPrice * spreadPct;
          const rangeLow = Math.round((currentPrice - halfSpread) * 100) / 100;
          const rangeHigh = Math.round((currentPrice + halfSpread) * 100) / 100;
          // Take profit is above rangeHigh
          const takeProfitPrice =
            Math.round(rangeHigh * (1 + tpOffsetPct) * 100) / 100;
          // Market price at or above take profit
          const marketPrice =
            Math.round(takeProfitPrice * (1 + Math.random() * 0.01) * 100) /
            100;
          return {
            rangeLow,
            rangeHigh,
            gridLevels,
            capital,
            currentPrice,
            asset,
            takeProfitPrice,
            marketPrice,
          };
        },
      )
      .filter(
        ({ rangeLow, rangeHigh, takeProfitPrice, marketPrice }) =>
          rangeHigh > rangeLow &&
          rangeLow > 0 &&
          takeProfitPrice > 0 &&
          marketPrice > 0,
      );

    it("should emit stop_loss_hit and stop the grid when market price <= stopLossPrice", () => {
      fc.assert(
        fc.property(
          arbStopLossScenario,
          ({
            rangeLow,
            rangeHigh,
            gridLevels,
            capital,
            currentPrice,
            asset,
            stopLossPrice,
            marketPrice,
          }) => {
            const initMarketData =
              asset === "BTC"
                ? makeMarketData(currentPrice, 2000)
                : makeMarketData(60000, currentPrice);

            const runtime = createSpotGridRuntime({
              agentId: "test-agent",
              marketData: initMarketData,
              capitalReserved: capital,
              asset,
              overrides: {
                rangeLow,
                rangeHigh,
                gridLevels,
                stopLossPrice,
                configMode: "manual",
              },
            });

            // Simulate market dropping to/below stop loss
            const slMarketData =
              asset === "BTC"
                ? makeMarketData(marketPrice, 2000, Date.now())
                : makeMarketData(60000, marketPrice, Date.now());

            const result = evaluateSpotGridRuntime({
              runtime,
              marketData: slMarketData,
              totalTreasury: capital * 10,
              maxOpenPositions: 50,
              maxAllocationNotional: capital * 10,
            });

            // Should have a stop_loss_hit event
            const slEvents = result.events.filter(
              (e) => e.type === "stop_loss_hit",
            );
            expect(slEvents.length).toBe(1);

            // Runtime should be stopped
            expect(result.runtime.status).toBe("stopped");
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should emit take_profit_hit and stop the grid when market price >= takeProfitPrice", () => {
      fc.assert(
        fc.property(
          arbTakeProfitScenario,
          ({
            rangeLow,
            rangeHigh,
            gridLevels,
            capital,
            currentPrice,
            asset,
            takeProfitPrice,
            marketPrice,
          }) => {
            const initMarketData =
              asset === "BTC"
                ? makeMarketData(currentPrice, 2000)
                : makeMarketData(60000, currentPrice);

            const runtime = createSpotGridRuntime({
              agentId: "test-agent",
              marketData: initMarketData,
              capitalReserved: capital,
              asset,
              overrides: {
                rangeLow,
                rangeHigh,
                gridLevels,
                takeProfitPrice,
                configMode: "manual",
              },
            });

            // Simulate market rising to/above take profit
            const tpMarketData =
              asset === "BTC"
                ? makeMarketData(marketPrice, 2000, Date.now())
                : makeMarketData(60000, marketPrice, Date.now());

            const result = evaluateSpotGridRuntime({
              runtime,
              marketData: tpMarketData,
              totalTreasury: capital * 10,
              maxOpenPositions: 50,
              maxAllocationNotional: capital * 10,
            });

            // Should have a take_profit_hit event
            const tpEvents = result.events.filter(
              (e) => e.type === "take_profit_hit",
            );
            expect(tpEvents.length).toBe(1);

            // Runtime should be stopped
            expect(result.runtime.status).toBe("stopped");
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should not trigger stops when market price is between stopLossPrice and takeProfitPrice", () => {
      fc.assert(
        fc.property(
          fc
            .tuple(
              fc.double({
                min: 5_000,
                max: 50_000,
                noNaN: true,
                noDefaultInfinity: true,
              }),
              fc.double({
                min: 0.05,
                max: 0.15,
                noNaN: true,
                noDefaultInfinity: true,
              }),
              fc.integer({ min: 2, max: 10 }),
              fc.double({
                min: 1_000,
                max: 50_000,
                noNaN: true,
                noDefaultInfinity: true,
              }),
              fc.constantFrom("BTC" as const, "ETH" as const),
            )
            .map(([currentPrice, spreadPct, gridLevels, capital, asset]) => {
              const halfSpread = currentPrice * spreadPct;
              const rangeLow =
                Math.round((currentPrice - halfSpread) * 100) / 100;
              const rangeHigh =
                Math.round((currentPrice + halfSpread) * 100) / 100;
              const stopLossPrice = Math.round(rangeLow * 0.8 * 100) / 100;
              const takeProfitPrice = Math.round(rangeHigh * 1.2 * 100) / 100;
              return {
                rangeLow,
                rangeHigh,
                gridLevels,
                capital,
                currentPrice,
                asset,
                stopLossPrice,
                takeProfitPrice,
              };
            })
            .filter(
              ({ rangeLow, rangeHigh, stopLossPrice }) =>
                rangeHigh > rangeLow && rangeLow > 0 && stopLossPrice > 0,
            ),
          ({
            rangeLow,
            rangeHigh,
            gridLevels,
            capital,
            currentPrice,
            asset,
            stopLossPrice,
            takeProfitPrice,
          }) => {
            const marketData =
              asset === "BTC"
                ? makeMarketData(currentPrice, 2000)
                : makeMarketData(60000, currentPrice);

            const runtime = createSpotGridRuntime({
              agentId: "test-agent",
              marketData,
              capitalReserved: capital,
              asset,
              overrides: {
                rangeLow,
                rangeHigh,
                gridLevels,
                stopLossPrice,
                takeProfitPrice,
                configMode: "manual",
              },
            });

            // Price is at currentPrice which is between SL and TP
            const result = evaluateSpotGridRuntime({
              runtime,
              marketData,
              totalTreasury: capital * 10,
              maxOpenPositions: 50,
              maxAllocationNotional: capital * 10,
            });

            // No stop events should fire
            const stopEvents = result.events.filter(
              (e) => e.type === "stop_loss_hit" || e.type === "take_profit_hit",
            );
            expect(stopEvents.length).toBe(0);

            // Runtime should NOT be stopped
            expect(result.runtime.status).not.toBe("stopped");
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 19: Grid config history tracking
   *
   * For any grid modification via modifySpotGrid(), the resulting
   * GridRuntimeState.configHistory array should contain one more entry
   * than before, with the new entry's timestamp, rangeLow, rangeHigh,
   * gridLevels, and reason matching the modification parameters.
   *
   * **Validates: Requirements 15.4**
   */
  describe("Property 19: Grid config history tracking", () => {
    // Feature: forge8004-core, Property 19: Grid config history tracking

    const arbModifyScenario = fc
      .tuple(
        fc.double({
          min: 5_000,
          max: 50_000,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        fc.double({
          min: 0.05,
          max: 0.2,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        fc.integer({ min: 2, max: 10 }),
        fc.double({
          min: 1_000,
          max: 50_000,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        fc.constantFrom("BTC" as const, "ETH" as const),
        // Modification parameters
        fc.double({
          min: 0.01,
          max: 0.15,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        fc.integer({ min: 2, max: 16 }),
      )
      .map(
        ([
          currentPrice,
          spreadPct,
          gridLevels,
          capital,
          asset,
          newSpreadPct,
          newGridLevels,
        ]) => {
          const halfSpread = currentPrice * spreadPct;
          const rangeLow = Math.round((currentPrice - halfSpread) * 100) / 100;
          const rangeHigh = Math.round((currentPrice + halfSpread) * 100) / 100;
          // New range for modification
          const newHalfSpread = currentPrice * newSpreadPct;
          const newRangeLow =
            Math.round((currentPrice - newHalfSpread) * 100) / 100;
          const newRangeHigh =
            Math.round((currentPrice + newHalfSpread) * 100) / 100;
          return {
            rangeLow,
            rangeHigh,
            gridLevels,
            capital,
            currentPrice,
            asset,
            newRangeLow,
            newRangeHigh,
            newGridLevels,
          };
        },
      )
      .filter(
        ({ rangeLow, rangeHigh, newRangeLow, newRangeHigh }) =>
          rangeHigh > rangeLow &&
          rangeLow > 0 &&
          newRangeHigh > newRangeLow &&
          newRangeLow > 0,
      );

    it("should append exactly one new entry to configHistory with matching parameters", () => {
      fc.assert(
        fc.property(
          arbModifyScenario,
          ({
            rangeLow,
            rangeHigh,
            gridLevels,
            capital,
            currentPrice,
            asset,
            newRangeLow,
            newRangeHigh,
            newGridLevels,
          }) => {
            const marketData =
              asset === "BTC"
                ? makeMarketData(currentPrice, 2000)
                : makeMarketData(60000, currentPrice);

            const runtime = createSpotGridRuntime({
              agentId: "test-agent",
              marketData,
              capitalReserved: capital,
              asset,
              overrides: {
                rangeLow,
                rangeHigh,
                gridLevels,
                configMode: "manual",
              },
            });

            const historyLengthBefore = runtime.configHistory.length;
            const ts = Date.now() + 1000;

            const result = modifySpotGrid(
              runtime,
              {
                rangeLow: newRangeLow,
                rangeHigh: newRangeHigh,
                gridLevels: newGridLevels,
              },
              marketData,
              ts,
            );

            const historyAfter = result.runtime.configHistory;

            // configHistory should have exactly one more entry
            expect(historyAfter.length).toBe(historyLengthBefore + 1);

            // The new entry is the last one
            const newEntry = historyAfter[historyAfter.length - 1];

            // Timestamp should match
            expect(newEntry.timestamp).toBe(ts);

            // rangeLow, rangeHigh should match the resulting runtime (after clamping/rounding)
            expect(newEntry.rangeLow).toBe(result.runtime.rangeLow);
            expect(newEntry.rangeHigh).toBe(result.runtime.rangeHigh);
            expect(newEntry.gridLevels).toBe(result.runtime.gridLevels);

            // Reason should be a non-empty string
            expect(newEntry.reason.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should preserve all previous configHistory entries after modification", () => {
      fc.assert(
        fc.property(
          arbModifyScenario,
          ({
            rangeLow,
            rangeHigh,
            gridLevels,
            capital,
            currentPrice,
            asset,
            newRangeLow,
            newRangeHigh,
            newGridLevels,
          }) => {
            const marketData =
              asset === "BTC"
                ? makeMarketData(currentPrice, 2000)
                : makeMarketData(60000, currentPrice);

            const runtime = createSpotGridRuntime({
              agentId: "test-agent",
              marketData,
              capitalReserved: capital,
              asset,
              overrides: {
                rangeLow,
                rangeHigh,
                gridLevels,
                configMode: "manual",
              },
            });

            const historyBefore = [...runtime.configHistory];
            const ts = Date.now() + 1000;

            const result = modifySpotGrid(
              runtime,
              {
                rangeLow: newRangeLow,
                rangeHigh: newRangeHigh,
                gridLevels: newGridLevels,
              },
              marketData,
              ts,
            );

            const historyAfter = result.runtime.configHistory;

            // All previous entries should be preserved
            for (let i = 0; i < historyBefore.length; i++) {
              expect(historyAfter[i].rangeLow).toBe(historyBefore[i].rangeLow);
              expect(historyAfter[i].rangeHigh).toBe(
                historyBefore[i].rangeHigh,
              );
              expect(historyAfter[i].gridLevels).toBe(
                historyBefore[i].gridLevels,
              );
              expect(historyAfter[i].timestamp).toBe(
                historyBefore[i].timestamp,
              );
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should emit a modified event with matching timestamp and reason", () => {
      fc.assert(
        fc.property(
          arbModifyScenario,
          ({
            rangeLow,
            rangeHigh,
            gridLevels,
            capital,
            currentPrice,
            asset,
            newRangeLow,
            newRangeHigh,
            newGridLevels,
          }) => {
            const marketData =
              asset === "BTC"
                ? makeMarketData(currentPrice, 2000)
                : makeMarketData(60000, currentPrice);

            const runtime = createSpotGridRuntime({
              agentId: "test-agent",
              marketData,
              capitalReserved: capital,
              asset,
              overrides: {
                rangeLow,
                rangeHigh,
                gridLevels,
                configMode: "manual",
              },
            });

            const ts = Date.now() + 1000;

            const result = modifySpotGrid(
              runtime,
              {
                rangeLow: newRangeLow,
                rangeHigh: newRangeHigh,
                gridLevels: newGridLevels,
              },
              marketData,
              ts,
            );

            // Event should be of type "modified"
            expect(result.event.type).toBe("modified");
            expect(result.event.timestamp).toBe(ts);
            expect(result.event.reason.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
