// Feature: forge8004-core, Property 26: Grid advisory range validation
// Feature: forge8004-core, Property 27: RSI bounded output

import { describe, it, expect } from "vitest";
import fc from "fast-check";

// ── Grid advisory range validation (extracted from server.ts) ─────
// The server validates that suggestedRangeLow < currentPrice < suggestedRangeHigh.
// If violated, the range is discarded (set to undefined).

function validateGridAdvisoryRange(
  suggestedRangeLow: number | undefined,
  suggestedRangeHigh: number | undefined,
  currentPrice: number,
): { rangeLow: number | undefined; rangeHigh: number | undefined } {
  let rangeLow =
    typeof suggestedRangeLow === "number" && suggestedRangeLow > 0
      ? suggestedRangeLow
      : undefined;
  let rangeHigh =
    typeof suggestedRangeHigh === "number" && suggestedRangeHigh > 0
      ? suggestedRangeHigh
      : undefined;

  // Sanity: range must contain current price and low < high
  if (rangeLow !== undefined && rangeHigh !== undefined) {
    if (
      rangeLow >= rangeHigh ||
      (currentPrice > 0 &&
        (rangeLow > currentPrice || rangeHigh < currentPrice))
    ) {
      rangeLow = undefined;
      rangeHigh = undefined;
    }
  }

  return { rangeLow, rangeHigh };
}

// ── RSI computation (extracted from server.ts) ────────────────────

function computeRSI(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  const recent = closes.slice(-(period + 1));
  let gains = 0,
    losses = 0;
  for (let i = 1; i < recent.length; i++) {
    const diff = recent[i] - recent[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round((100 - 100 / (1 + rs)) * 10) / 10;
}

// ── Arbitraries ───────────────────────────────────────────────────

const arbCurrentPrice = fc.double({
  min: 100,
  max: 200_000,
  noNaN: true,
  noDefaultInfinity: true,
});

/** Valid grid advisory: rangeLow < currentPrice < rangeHigh */
const arbValidGridAdvisory = arbCurrentPrice.chain((price) =>
  fc
    .tuple(
      fc.double({ min: 0.01, max: 0.1, noNaN: true, noDefaultInfinity: true }),
      fc.double({ min: 0.01, max: 0.1, noNaN: true, noDefaultInfinity: true }),
    )
    .map(([below, above]) => ({
      suggestedRangeLow: price * (1 - below),
      suggestedRangeHigh: price * (1 + above),
      currentPrice: price,
    })),
);

/** Inverted range: rangeLow >= rangeHigh */
const arbInvertedRange = arbCurrentPrice.chain((price) =>
  fc
    .double({ min: 0.01, max: 0.1, noNaN: true, noDefaultInfinity: true })
    .map((offset) => ({
      suggestedRangeLow: price + price * offset,
      suggestedRangeHigh: price - price * offset,
      currentPrice: price,
    })),
);

/** Range that doesn't contain the current price */
const arbRangeNotContainingPrice = arbCurrentPrice.chain((price) =>
  fc.boolean().chain((above) => {
    if (above) {
      return fc
        .tuple(
          fc.double({
            min: 0.01,
            max: 0.1,
            noNaN: true,
            noDefaultInfinity: true,
          }),
          fc.double({
            min: 0.11,
            max: 0.2,
            noNaN: true,
            noDefaultInfinity: true,
          }),
        )
        .map(([o1, o2]) => ({
          suggestedRangeLow: price * (1 + o1),
          suggestedRangeHigh: price * (1 + o2),
          currentPrice: price,
        }));
    } else {
      return fc
        .tuple(
          fc.double({
            min: 0.11,
            max: 0.2,
            noNaN: true,
            noDefaultInfinity: true,
          }),
          fc.double({
            min: 0.01,
            max: 0.1,
            noNaN: true,
            noDefaultInfinity: true,
          }),
        )
        .map(([o1, o2]) => ({
          suggestedRangeLow: price * (1 - o1),
          suggestedRangeHigh: price * (1 - o2),
          currentPrice: price,
        }));
    }
  }),
);

/** Candle close prices of length >= 15 for RSI computation */
const arbCandleCloses = fc.array(
  fc.double({ min: 0.01, max: 200_000, noNaN: true, noDefaultInfinity: true }),
  { minLength: 15, maxLength: 200 },
);

/** Monotonically increasing close prices (all gains, no losses) */
const arbMonoIncreasingCloses = fc
  .tuple(
    fc.double({ min: 1, max: 10_000, noNaN: true, noDefaultInfinity: true }),
    fc.array(
      fc.double({ min: 0.01, max: 100, noNaN: true, noDefaultInfinity: true }),
      { minLength: 14, maxLength: 50 },
    ),
  )
  .map(([start, increments]) => {
    const closes: number[] = [start];
    for (const inc of increments) {
      closes.push(closes[closes.length - 1] + inc);
    }
    return closes;
  });

/** Monotonically decreasing close prices (all losses, no gains) */
const arbMonoDecreasingCloses = fc
  .tuple(
    fc.double({
      min: 5_000,
      max: 200_000,
      noNaN: true,
      noDefaultInfinity: true,
    }),
    fc.array(
      fc.double({ min: 0.01, max: 100, noNaN: true, noDefaultInfinity: true }),
      { minLength: 14, maxLength: 50 },
    ),
  )
  .map(([start, decrements]) => {
    const closes: number[] = [start];
    for (const dec of decrements) {
      const next = closes[closes.length - 1] - dec;
      if (next <= 0) break;
      closes.push(next);
    }
    // Ensure we have at least 15 elements
    while (closes.length < 15) {
      closes.push(closes[closes.length - 1] * 0.99);
    }
    return closes;
  });

// ── Property Tests ────────────────────────────────────────────────

describe("[Market Properties]", () => {
  /**
   * Property 26: Grid advisory range validation
   *
   * For any grid advisory response with suggestedRangeLow and suggestedRangeHigh,
   * rangeLow < currentPrice < rangeHigh must hold; violated ranges are discarded.
   *
   * **Validates: Requirements 14.1, 14.4**
   */
  describe("Property 26: Grid advisory range validation", () => {
    it("should accept valid ranges where rangeLow < currentPrice < rangeHigh", () => {
      fc.assert(
        fc.property(
          arbValidGridAdvisory,
          ({ suggestedRangeLow, suggestedRangeHigh, currentPrice }) => {
            const { rangeLow, rangeHigh } = validateGridAdvisoryRange(
              suggestedRangeLow,
              suggestedRangeHigh,
              currentPrice,
            );

            // Valid range should be preserved
            expect(rangeLow).toBeDefined();
            expect(rangeHigh).toBeDefined();
            expect(rangeLow!).toBeLessThan(currentPrice);
            expect(rangeHigh!).toBeGreaterThan(currentPrice);
            expect(rangeLow!).toBeLessThan(rangeHigh!);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should discard inverted ranges where rangeLow >= rangeHigh", () => {
      fc.assert(
        fc.property(
          arbInvertedRange,
          ({ suggestedRangeLow, suggestedRangeHigh, currentPrice }) => {
            const { rangeLow, rangeHigh } = validateGridAdvisoryRange(
              suggestedRangeLow,
              suggestedRangeHigh,
              currentPrice,
            );

            // Inverted range should be discarded
            expect(rangeLow).toBeUndefined();
            expect(rangeHigh).toBeUndefined();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should discard ranges that don't contain the current price", () => {
      fc.assert(
        fc.property(
          arbRangeNotContainingPrice,
          ({ suggestedRangeLow, suggestedRangeHigh, currentPrice }) => {
            const { rangeLow, rangeHigh } = validateGridAdvisoryRange(
              suggestedRangeLow,
              suggestedRangeHigh,
              currentPrice,
            );

            // Range not containing price should be discarded
            expect(rangeLow).toBeUndefined();
            expect(rangeHigh).toBeUndefined();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should handle undefined/zero/negative range values gracefully", () => {
      const arbBadValues = fc.tuple(
        fc.oneof(
          fc.constant(undefined as unknown as number),
          fc.constant(0),
          fc.constant(-100),
        ),
        fc.oneof(
          fc.constant(undefined as unknown as number),
          fc.constant(0),
          fc.constant(-50),
        ),
        arbCurrentPrice,
      );

      fc.assert(
        fc.property(arbBadValues, ([low, high, price]) => {
          const { rangeLow, rangeHigh } = validateGridAdvisoryRange(
            low,
            high,
            price,
          );

          // Invalid inputs should result in undefined ranges
          // (either both undefined, or if one is valid and other isn't,
          // the validation only discards when both are present and invalid)
          if (rangeLow !== undefined && rangeHigh !== undefined) {
            // If both survived, they must form a valid range
            expect(rangeLow).toBeLessThan(rangeHigh);
            expect(rangeLow).toBeLessThan(price);
            expect(rangeHigh).toBeGreaterThan(price);
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 27: RSI bounded output
   *
   * For any series of candle close prices of length >= 15,
   * RSI(14) is between 0 and 100 inclusive.
   *
   * **Validates: Requirements 16.4**
   */
  describe("Property 27: RSI bounded output", () => {
    it("should return RSI between 0 and 100 for any valid close price series of length >= 15", () => {
      fc.assert(
        fc.property(arbCandleCloses, (closes) => {
          const rsi = computeRSI(closes);

          // With >= 15 closes, RSI should be computed (not null)
          expect(rsi).not.toBeNull();
          expect(rsi!).toBeGreaterThanOrEqual(0);
          expect(rsi!).toBeLessThanOrEqual(100);
        }),
        { numRuns: 100 },
      );
    });

    it("should return RSI of 100 for monotonically increasing prices (all gains)", () => {
      fc.assert(
        fc.property(arbMonoIncreasingCloses, (closes) => {
          const rsi = computeRSI(closes);

          expect(rsi).not.toBeNull();
          // All gains, no losses → avgLoss = 0 → RSI = 100
          expect(rsi).toBe(100);
        }),
        { numRuns: 100 },
      );
    });

    it("should return RSI of 0 for monotonically decreasing prices (all losses)", () => {
      fc.assert(
        fc.property(arbMonoDecreasingCloses, (closes) => {
          const rsi = computeRSI(closes);

          expect(rsi).not.toBeNull();
          // All losses, no gains → avgGain = 0 → RS = 0 → RSI = 0
          expect(rsi).toBe(0);
        }),
        { numRuns: 100 },
      );
    });

    it("should return null for series shorter than period + 1", () => {
      const arbShortSeries = fc.array(
        fc.double({
          min: 0.01,
          max: 200_000,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        { minLength: 0, maxLength: 14 },
      );

      fc.assert(
        fc.property(arbShortSeries, (closes) => {
          const rsi = computeRSI(closes);
          expect(rsi).toBeNull();
        }),
        { numRuns: 100 },
      );
    });
  });
});
