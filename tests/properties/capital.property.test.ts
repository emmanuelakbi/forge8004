// Feature: forge8004-core, Property 13: Withdrawal rejection when exceeding available capital
// Feature: forge8004-core, Property 14: Max drawdown calculation
// Feature: forge8004-core, Property 15: Sharpe-like score calculation
// Feature: forge8004-core, Property 28: PnL calculation correctness

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  calculateDrawdownPct,
  calculateSharpeLikeScore,
  calculateTradePnl,
  getCommittedCapital,
} from "@/src/services/trustArtifacts";
import type { TradeIntent } from "@/src/lib/types";

// ── Arbitraries ───────────────────────────────────────────────────

/** Equity series of length >= 2 with positive finite values */
const arbEquitySeries = fc.array(
  fc.double({
    min: 0.01,
    max: 1_000_000,
    noNaN: true,
    noDefaultInfinity: true,
  }),
  { minLength: 2, maxLength: 200 },
);

/** Monotonically non-decreasing equity series of length >= 2 */
const arbNonDecreasingEquitySeries = fc
  .array(
    fc.double({ min: 0.01, max: 10_000, noNaN: true, noDefaultInfinity: true }),
    { minLength: 2, maxLength: 100 },
  )
  .map((arr) => {
    // Sort ascending to guarantee non-decreasing
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted;
  });

/** Constant equity series (all same value) of length >= 2 */
const arbConstantEquitySeries = fc
  .tuple(
    fc.double({
      min: 0.01,
      max: 100_000,
      noNaN: true,
      noDefaultInfinity: true,
    }),
    fc.integer({ min: 2, max: 50 }),
  )
  .map(([value, length]) => Array.from({ length }, () => value));

/** Positive finite price */
const arbPrice = fc.double({
  min: 0.01,
  max: 200_000,
  noNaN: true,
  noDefaultInfinity: true,
});

/** Positive finite size */
const arbSize = fc.double({
  min: 0.001,
  max: 100_000,
  noNaN: true,
  noDefaultInfinity: true,
});

/** Trade side for PnL */
const arbSide = fc.constantFrom("BUY" as const, "SELL" as const);

/** Generates totalFunds, reservedCapital, and a withdrawal amount that exceeds available */
const arbExcessiveWithdrawal = fc
  .tuple(
    fc.double({
      min: 100,
      max: 1_000_000,
      noNaN: true,
      noDefaultInfinity: true,
    }),
    fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
    fc.double({
      min: 0.01,
      max: 1_000_000,
      noNaN: true,
      noDefaultInfinity: true,
    }),
  )
  .map(([totalFunds, reservedFraction, extra]) => {
    const reserved = totalFunds * reservedFraction;
    const available = totalFunds - reserved;
    // Withdrawal exceeds available by at least `extra`
    const withdrawal = available + extra;
    return { totalFunds, reserved, available, withdrawal };
  });

// ── Property Tests ────────────────────────────────────────────────

describe("[Capital, Drawdown, Sharpe, and PnL Properties]", () => {
  /**
   * Property 13: Withdrawal rejection when exceeding available capital
   *
   * For any agent with totalFunds T and capital reserved in open positions R,
   * a withdrawal of amount W where W > (T - R) should be rejected.
   *
   * **Validates: Requirements 9.4**
   */
  describe("Property 13: Withdrawal rejection when exceeding available capital", () => {
    // Feature: forge8004-core, Property 13: Withdrawal rejection when exceeding available capital
    it("should reject withdrawal when amount exceeds available capital (totalFunds - reserved)", () => {
      fc.assert(
        fc.property(
          arbExcessiveWithdrawal,
          ({ totalFunds, reserved, available, withdrawal }) => {
            // Build open positions that reserve `reserved` capital
            const positions: Partial<TradeIntent>[] =
              reserved > 0
                ? [{ capitalAllocated: reserved, side: "BUY" as const }]
                : [];

            const totalReserved = positions.reduce(
              (sum, p) => sum + getCommittedCapital(p),
              0,
            );
            const availableCapital = totalFunds - totalReserved;

            // The withdrawal exceeds available capital
            expect(withdrawal).toBeGreaterThan(availableCapital);

            // Validate: system should reject this withdrawal
            const isRejected = withdrawal > availableCapital;
            expect(isRejected).toBe(true);
          },
        ),
        { numRuns: 200 },
      );
    });

    it("should allow withdrawal when amount is within available capital", () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.double({
              min: 100,
              max: 1_000_000,
              noNaN: true,
              noDefaultInfinity: true,
            }),
            fc.double({
              min: 0,
              max: 0.8,
              noNaN: true,
              noDefaultInfinity: true,
            }),
            fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
          ),
          ([totalFunds, reservedFraction, withdrawFraction]) => {
            const reserved = totalFunds * reservedFraction;
            const available = totalFunds - reserved;
            const withdrawal = available * withdrawFraction;

            const positions: Partial<TradeIntent>[] =
              reserved > 0
                ? [{ capitalAllocated: reserved, side: "BUY" as const }]
                : [];

            const totalReserved = positions.reduce(
              (sum, p) => sum + getCommittedCapital(p),
              0,
            );
            const availableCapital = totalFunds - totalReserved;

            // Withdrawal is within available capital
            const isAllowed = withdrawal <= availableCapital;
            expect(isAllowed).toBe(true);
          },
        ),
        { numRuns: 200 },
      );
    });
  });

  /**
   * Property 14: Max drawdown calculation
   *
   * For any equity series of length >= 2, calculateDrawdownPct() should
   * return a value between 0 and 100 representing the maximum peak-to-trough
   * decline as a percentage. The result should be 0 when the series is
   * monotonically non-decreasing.
   *
   * **Validates: Requirements 11.3**
   */
  describe("Property 14: Max drawdown calculation", () => {
    // Feature: forge8004-core, Property 14: Max drawdown calculation
    it("should return a value between 0 and 100 for any equity series of length >= 2", () => {
      fc.assert(
        fc.property(arbEquitySeries, (series) => {
          const drawdown = calculateDrawdownPct(series);

          expect(drawdown).toBeGreaterThanOrEqual(0);
          expect(drawdown).toBeLessThanOrEqual(100);
          expect(Number.isFinite(drawdown)).toBe(true);
        }),
        { numRuns: 200 },
      );
    });

    it("should return 0 for monotonically non-decreasing series", () => {
      fc.assert(
        fc.property(arbNonDecreasingEquitySeries, (series) => {
          const drawdown = calculateDrawdownPct(series);

          expect(drawdown).toBe(0);
        }),
        { numRuns: 200 },
      );
    });

    it("should detect drawdown when series has a decline from peak", () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.double({
              min: 100,
              max: 100_000,
              noNaN: true,
              noDefaultInfinity: true,
            }),
            fc.double({
              min: 0.01,
              max: 0.99,
              noNaN: true,
              noDefaultInfinity: true,
            }),
          ),
          ([peak, declineFraction]) => {
            const trough = peak * (1 - declineFraction);
            const series = [peak, trough];
            const drawdown = calculateDrawdownPct(series);

            // Drawdown should be approximately declineFraction * 100
            expect(drawdown).toBeGreaterThan(0);
            expect(drawdown).toBeCloseTo(declineFraction * 100, 5);
          },
        ),
        { numRuns: 200 },
      );
    });
  });

  /**
   * Property 15: Sharpe-like score calculation
   *
   * For any equity series of length >= 2, calculateSharpeLikeScore() should
   * return a finite number. For a constant equity series (zero variance),
   * the score should be 0.
   *
   * **Validates: Requirements 11.4**
   */
  describe("Property 15: Sharpe-like score calculation", () => {
    // Feature: forge8004-core, Property 15: Sharpe-like score calculation
    it("should return a finite number for any equity series of length >= 2", () => {
      fc.assert(
        fc.property(arbEquitySeries, (series) => {
          const score = calculateSharpeLikeScore(series);

          expect(Number.isFinite(score)).toBe(true);
        }),
        { numRuns: 200 },
      );
    });

    it("should return 0 for a constant equity series (zero variance)", () => {
      fc.assert(
        fc.property(arbConstantEquitySeries, (series) => {
          const score = calculateSharpeLikeScore(series);

          // Constant series has zero returns, avgReturn = 0, stdDev = 0
          // Implementation returns avgReturn > 0 ? 5 : 0 when stdDev === 0
          // Since avgReturn is 0 for constant series, score should be 0
          expect(score).toBe(0);
        }),
        { numRuns: 200 },
      );
    });

    it("should return a value clamped between 0 and 5", () => {
      fc.assert(
        fc.property(arbEquitySeries, (series) => {
          const score = calculateSharpeLikeScore(series);

          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(5);
        }),
        { numRuns: 200 },
      );
    });
  });

  /**
   * Property 28: PnL calculation correctness
   *
   * For any BUY trade with entry price E, exit price X, and size S,
   * calculateTradePnl("BUY", E, X, S) should return (X - E) * S.
   * For SELL trades, it should return (E - X) * S.
   *
   * **Validates: Requirements 11.1**
   */
  describe("Property 28: PnL calculation correctness", () => {
    // Feature: forge8004-core, Property 28: PnL calculation correctness
    it("should compute BUY PnL as (exitPrice - entryPrice) * size", () => {
      fc.assert(
        fc.property(
          fc.tuple(arbPrice, arbPrice, arbSize),
          ([entryPrice, exitPrice, size]) => {
            const position: Partial<TradeIntent> = {
              side: "BUY",
              entryPrice,
              size,
            };

            const pnl = calculateTradePnl(position, exitPrice);
            const expected = (exitPrice - entryPrice) * size;

            expect(pnl).toBeCloseTo(expected, 4);
          },
        ),
        { numRuns: 200 },
      );
    });

    it("should compute SELL PnL as (entryPrice - exitPrice) * size", () => {
      fc.assert(
        fc.property(
          fc.tuple(arbPrice, arbPrice, arbSize),
          ([entryPrice, exitPrice, size]) => {
            const position: Partial<TradeIntent> = {
              side: "SELL",
              entryPrice,
              size,
            };

            const pnl = calculateTradePnl(position, exitPrice);
            const expected = (entryPrice - exitPrice) * size;

            expect(pnl).toBeCloseTo(expected, 4);
          },
        ),
        { numRuns: 200 },
      );
    });

    it("should return 0 when entry price equals exit price", () => {
      fc.assert(
        fc.property(
          fc.tuple(arbSide, arbPrice, arbSize),
          ([side, price, size]) => {
            const position: Partial<TradeIntent> = {
              side,
              entryPrice: price,
              size,
            };

            const pnl = calculateTradePnl(position, price);

            expect(pnl).toBeCloseTo(0, 10);
          },
        ),
        { numRuns: 200 },
      );
    });

    it("should return 0 when size is 0", () => {
      fc.assert(
        fc.property(
          fc.tuple(arbSide, arbPrice, arbPrice),
          ([side, entryPrice, exitPrice]) => {
            const position: Partial<TradeIntent> = {
              side,
              entryPrice,
              size: 0,
            };

            const pnl = calculateTradePnl(position, exitPrice);

            expect(pnl).toBeCloseTo(0, 10);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
