/**
 * Property-based tests for app/lib/market.ts
 *
 * Feature: nextjs-api-layer-migration
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  computeRSI,
  parseKlines,
  computeSupportResistance,
  type Kline,
  type ParsedCandle,
} from "@/app/lib/market";

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const candleArb: fc.Arbitrary<ParsedCandle> = fc
  .record({
    low: fc.float({
      min: Math.fround(0.01),
      max: Math.fround(100000),
      noNaN: true,
    }),
    spread: fc.float({ min: 0, max: Math.fround(10000), noNaN: true }),
    open: fc.float({
      min: Math.fround(0.01),
      max: Math.fround(100000),
      noNaN: true,
    }),
    close: fc.float({
      min: Math.fround(0.01),
      max: Math.fround(100000),
      noNaN: true,
    }),
    volume: fc.float({ min: 0, max: Math.fround(1e12), noNaN: true }),
    closeTime: fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }),
  })
  .map(({ low, spread, open, close, volume, closeTime }) => ({
    low,
    high: low + spread,
    open,
    close,
    volume,
    closeTime,
  }));

const numericStringArb = fc
  .float({ min: Math.fround(0.01), max: Math.fround(200000), noNaN: true })
  .map((n) => n.toString());

const klineTupleArb: fc.Arbitrary<Kline> = fc.tuple(
  fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }),
  numericStringArb,
  numericStringArb,
  numericStringArb,
  numericStringArb,
  numericStringArb,
  fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }),
  numericStringArb,
  fc.integer({ min: 0, max: 100000 }),
  numericStringArb,
  numericStringArb,
  numericStringArb,
) as fc.Arbitrary<Kline>;

// ---------------------------------------------------------------------------
// Property 1: RSI Range Invariant
// ---------------------------------------------------------------------------

describe("Feature: nextjs-api-layer-migration, Property 1: RSI Range Invariant", () => {
  /**
   * **Validates: Requirements 1.1, 1.9**
   *
   * For any array of positive closing prices with length >= 15,
   * computeRSI returns a number in [0, 100].
   * For any array with length < 15, computeRSI returns null.
   */
  it("returns a value in [0, 100] for arrays with length >= 15", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.float({
            min: Math.fround(0.01),
            max: Math.fround(200000),
            noNaN: true,
          }),
          { minLength: 15, maxLength: 100 },
        ),
        (closes) => {
          const rsi = computeRSI(closes);
          expect(rsi).not.toBeNull();
          expect(rsi).toBeGreaterThanOrEqual(0);
          expect(rsi).toBeLessThanOrEqual(100);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("returns null for arrays with length < 15", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.float({
            min: Math.fround(0.01),
            max: Math.fround(200000),
            noNaN: true,
          }),
          { minLength: 0, maxLength: 14 },
        ),
        (closes) => {
          const rsi = computeRSI(closes);
          expect(rsi).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Support/Resistance Equals Min/Max
// ---------------------------------------------------------------------------

describe("Feature: nextjs-api-layer-migration, Property 2: Support/Resistance Equals Min/Max", () => {
  /**
   * **Validates: Requirements 1.2**
   *
   * For any array of 3+ candles with positive high >= low,
   * support equals min(low) and resistance equals max(high).
   * For fewer than 3 candles, both are null.
   */
  it("returns min(low)/max(high) for >= 3 candles", () => {
    fc.assert(
      fc.property(
        fc.array(candleArb, { minLength: 3, maxLength: 50 }),
        (candles) => {
          const result = computeSupportResistance(candles);
          const expectedSupport = Math.min(...candles.map((c) => c.low));
          const expectedResistance = Math.max(...candles.map((c) => c.high));
          expect(result.support).toBeCloseTo(expectedSupport, 5);
          expect(result.resistance).toBeCloseTo(expectedResistance, 5);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("returns null for both when fewer than 3 candles", () => {
    fc.assert(
      fc.property(
        fc.array(candleArb, { minLength: 0, maxLength: 2 }),
        (candles) => {
          const result = computeSupportResistance(candles);
          expect(result.support).toBeNull();
          expect(result.resistance).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: parseKlines Preserves Values
// ---------------------------------------------------------------------------

describe("Feature: nextjs-api-layer-migration, Property 3: parseKlines Preserves Values", () => {
  /**
   * **Validates: Requirements 1.3**
   *
   * Output length matches input length, and each field equals
   * parseFloat of the corresponding tuple position.
   */
  it("output length matches input and fields equal parseFloat of tuple positions", () => {
    fc.assert(
      fc.property(
        fc.array(klineTupleArb, { minLength: 0, maxLength: 30 }),
        (raw) => {
          const parsed = parseKlines(raw);
          expect(parsed).toHaveLength(raw.length);

          for (let i = 0; i < raw.length; i++) {
            expect(parsed[i].open).toBe(parseFloat(raw[i][1]));
            expect(parsed[i].high).toBe(parseFloat(raw[i][2]));
            expect(parsed[i].low).toBe(parseFloat(raw[i][3]));
            expect(parsed[i].close).toBe(parseFloat(raw[i][4]));
            expect(parsed[i].volume).toBe(parseFloat(raw[i][5]));
            expect(parsed[i].closeTime).toBe(raw[i][6]);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
