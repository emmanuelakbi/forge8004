/**
 * Property-based tests for app/lib/signal-validator.ts
 *
 * Feature: nextjs-api-layer-migration
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { validateSignal, type RawSignal } from "@/app/lib/signal-validator";

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const sideArb = fc.constantFrom("LONG" as const, "SHORT" as const);
const orderTypeArb = fc.constantFrom("MARKET" as const, "LIMIT" as const);
const timeframeArb = fc.constantFrom(
  "SCALP" as const,
  "SWING" as const,
  "POSITION" as const,
);

/**
 * Generate a valid signal that should pass all validation rules.
 * We carefully construct entry, stopLoss, and targets to satisfy:
 * - entry > 0, stopLoss > 0
 * - stopLoss on correct side
 * - stopLoss within [0.1%, 15%] of entry
 * - targets within 50% of entry
 * - last target on correct side of entry
 * - risk-reward >= 1.5
 */
const validSignalArb: fc.Arbitrary<RawSignal> = fc
  .record({
    side: sideArb,
    entry: fc.float({ min: 10, max: 100000, noNaN: true }),
    // slPct: distance of stopLoss from entry as fraction [0.1%, 15%]
    slPct: fc.float({
      min: Math.fround(0.002),
      max: Math.fround(0.05),
      noNaN: true,
    }),
    // rewardMultiplier: how many times the risk the reward is (>= 1.5)
    rewardMultiplier: fc.float({
      min: Math.fround(1.6),
      max: Math.fround(4.0),
      noNaN: true,
    }),
    orderType: orderTypeArb,
    timeframe: timeframeArb,
    confidence: fc.integer({ min: 1, max: 10 }),
    reasoning: fc.string({ minLength: 0, maxLength: 100 }),
    symbol: fc.constantFrom("BTC", "ETH", "SOL", "BNB"),
  })
  .map(
    ({
      side,
      entry,
      slPct,
      rewardMultiplier,
      orderType,
      timeframe,
      confidence,
      reasoning,
      symbol,
    }) => {
      const risk = entry * slPct;
      const stopLoss = side === "LONG" ? entry - risk : entry + risk;
      const reward = risk * rewardMultiplier;
      // Build targets on the correct side, within 50% of entry
      const target1 =
        side === "LONG" ? entry + reward * 0.5 : entry - reward * 0.5;
      const target2 = side === "LONG" ? entry + reward : entry - reward;

      // Ensure targets are within [entry*0.5, entry*1.5]
      const targets = [target1, target2].filter(
        (t) => t > entry * 0.5 && t < entry * 1.5,
      );

      return {
        symbol,
        side,
        orderType,
        entry,
        stopLoss,
        targets:
          targets.length > 0
            ? targets
            : [side === "LONG" ? entry + reward : entry - reward],
        riskReward: "N/A",
        confidence,
        timeframe,
        reasoning,
      } as RawSignal;
    },
  )
  // Filter to only signals that will actually pass (targets must remain valid after filtering)
  .filter((s) => {
    const filteredTargets = s.targets.filter(
      (t) => t > s.entry * 0.5 && t < s.entry * 1.5,
    );
    if (filteredTargets.length === 0) return false;
    const lastTarget = filteredTargets[filteredTargets.length - 1];
    if (s.side === "LONG" && lastTarget <= s.entry) return false;
    if (s.side === "SHORT" && lastTarget >= s.entry) return false;
    const risk = Math.abs(s.entry - s.stopLoss);
    const reward = Math.abs(lastTarget - s.entry);
    if (risk <= 0) return false;
    return reward / risk >= 1.5;
  });

// ---------------------------------------------------------------------------
// Property 11: Signal Validation Rules
// ---------------------------------------------------------------------------

describe("Feature: nextjs-api-layer-migration, Property 11: Signal Validation Rules", () => {
  /**
   * **Validates: Requirements 13.5, 13.6**
   */

  describe("rejection cases", () => {
    it("rejects signals with entry <= 0", () => {
      fc.assert(
        fc.property(
          fc.float({ min: -10000, max: 0, noNaN: true }),
          sideArb,
          (entry, side) => {
            const signal: RawSignal = {
              symbol: "BTC",
              side,
              orderType: "MARKET",
              entry,
              stopLoss: 100,
              targets: [110, 120],
              riskReward: "1:2",
              confidence: 5,
              timeframe: "SWING",
              reasoning: "test",
            };
            expect(validateSignal(signal)).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("rejects signals with stopLoss <= 0", () => {
      fc.assert(
        fc.property(
          fc.float({ min: -10000, max: 0, noNaN: true }),
          sideArb,
          (stopLoss, side) => {
            const signal: RawSignal = {
              symbol: "BTC",
              side,
              orderType: "MARKET",
              entry: 100,
              stopLoss,
              targets: [110, 120],
              riskReward: "1:2",
              confidence: 5,
              timeframe: "SWING",
              reasoning: "test",
            };
            expect(validateSignal(signal)).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("rejects signals with empty targets", () => {
      fc.assert(
        fc.property(sideArb, (side) => {
          const signal: RawSignal = {
            symbol: "BTC",
            side,
            orderType: "MARKET",
            entry: 100,
            stopLoss: side === "LONG" ? 95 : 105,
            targets: [],
            riskReward: "1:2",
            confidence: 5,
            timeframe: "SWING",
            reasoning: "test",
          };
          expect(validateSignal(signal)).toBeNull();
        }),
        { numRuns: 100 },
      );
    });

    it("rejects LONG signals where stopLoss >= entry", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 10, max: 100000, noNaN: true }),
          fc.float({ min: 0, max: 1000, noNaN: true }),
          (entry, offset) => {
            const signal: RawSignal = {
              symbol: "BTC",
              side: "LONG",
              orderType: "MARKET",
              entry,
              stopLoss: entry + offset, // stopLoss >= entry
              targets: [entry * 1.1],
              riskReward: "1:2",
              confidence: 5,
              timeframe: "SWING",
              reasoning: "test",
            };
            expect(validateSignal(signal)).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("rejects SHORT signals where stopLoss <= entry", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 10, max: 100000, noNaN: true }),
          fc.float({ min: 0, max: 1000, noNaN: true }),
          (entry, offset) => {
            const signal: RawSignal = {
              symbol: "ETH",
              side: "SHORT",
              orderType: "MARKET",
              entry,
              stopLoss: entry - offset, // stopLoss <= entry
              targets: [entry * 0.9],
              riskReward: "1:2",
              confidence: 5,
              timeframe: "SWING",
              reasoning: "test",
            };
            expect(validateSignal(signal)).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("rejects signals with targets outside 50% of entry", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100, max: 10000, noNaN: true }),
          (entry) => {
            // All targets are way outside the 50% range
            const signal: RawSignal = {
              symbol: "BTC",
              side: "LONG",
              orderType: "MARKET",
              entry,
              stopLoss: entry * 0.95,
              targets: [entry * 0.1, entry * 2.0], // both outside [0.5*entry, 1.5*entry]
              riskReward: "1:2",
              confidence: 5,
              timeframe: "SWING",
              reasoning: "test",
            };
            expect(validateSignal(signal)).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("rejects signals with stopLoss distance > 15% of entry", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100, max: 10000, noNaN: true }),
          (entry) => {
            const signal: RawSignal = {
              symbol: "BTC",
              side: "LONG",
              orderType: "MARKET",
              entry,
              stopLoss: entry * 0.8, // 20% away — exceeds 15%
              targets: [entry * 1.3],
              riskReward: "1:2",
              confidence: 5,
              timeframe: "SWING",
              reasoning: "test",
            };
            expect(validateSignal(signal)).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("rejects signals with stopLoss distance < 0.1% of entry", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100, max: 10000, noNaN: true }),
          (entry) => {
            const signal: RawSignal = {
              symbol: "BTC",
              side: "LONG",
              orderType: "MARKET",
              entry,
              stopLoss: entry * 0.99999, // ~0.001% — below 0.1%
              targets: [entry * 1.1],
              riskReward: "1:2",
              confidence: 5,
              timeframe: "SWING",
              reasoning: "test",
            };
            // stopLoss is still < entry so side check passes, but distance < 0.1%
            expect(validateSignal(signal)).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("rejects signals with risk-reward ratio < 1.5", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1000, max: 50000, noNaN: true }),
          (entry) => {
            // risk = 5% of entry, reward = 5% of entry → R:R = 1:1 (< 1.5)
            const signal: RawSignal = {
              symbol: "BTC",
              side: "LONG",
              orderType: "MARKET",
              entry,
              stopLoss: entry * 0.95,
              targets: [entry * 1.05],
              riskReward: "1:1",
              confidence: 5,
              timeframe: "SWING",
              reasoning: "test",
            };
            expect(validateSignal(signal)).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("valid signals", () => {
    it("passes valid signals and recalculates riskReward string", () => {
      fc.assert(
        fc.property(validSignalArb, (signal) => {
          const result = validateSignal(signal);
          expect(result).not.toBeNull();
          if (result) {
            // riskReward should be recalculated as "1:{ratio}"
            expect(result.riskReward).toMatch(/^1:\d+\.\d+$/);

            // Parse and verify the ratio is >= 1.5
            const ratio = parseFloat(result.riskReward.split(":")[1]);
            expect(ratio).toBeGreaterThanOrEqual(1.5);

            // Verify the ratio is correctly calculated
            const risk = Math.abs(result.entry - result.stopLoss);
            const lastTarget = result.targets[result.targets.length - 1];
            const reward = Math.abs(lastTarget - result.entry);
            const expectedRatio = reward / risk;
            expect(ratio).toBeCloseTo(expectedRatio, 0);
          }
        }),
        { numRuns: 100 },
      );
    });

    it("filters targets to only those within 50% of entry", () => {
      fc.assert(
        fc.property(validSignalArb, (signal) => {
          const result = validateSignal(signal);
          if (result) {
            for (const t of result.targets) {
              expect(t).toBeGreaterThan(result.entry * 0.5);
              expect(t).toBeLessThan(result.entry * 1.5);
            }
          }
        }),
        { numRuns: 100 },
      );
    });
  });
});
