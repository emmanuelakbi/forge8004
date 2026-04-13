/**
 * Property-based tests for app/lib/ai-helpers.ts
 *
 * Feature: nextjs-api-layer-migration
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  buildMarketPromptBlock,
  validateAiTradeResponse,
  cleanAiJsonResponse,
} from "@/app/lib/ai-helpers";

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const priceArb = fc.record({
  price: fc.float({
    min: Math.fround(0.01),
    max: Math.fround(200000),
    noNaN: true,
  }),
  change24h: fc.float({
    min: Math.fround(-100),
    max: Math.fround(1000),
    noNaN: true,
  }),
});

const sideArb = fc.constantFrom("BUY", "SELL", "HOLD");
const assetArb = fc.constantFrom("BTC", "ETH");

const decisionArb = fc.record({
  side: sideArb,
  asset: assetArb,
  size: fc.option(
    fc.float({
      min: Math.fround(0.001),
      max: Math.fround(100000),
      noNaN: true,
    }),
    { nil: undefined },
  ),
  stopLoss: fc.option(
    fc.float({ min: Math.fround(0.01), max: Math.fround(200000), noNaN: true }),
    { nil: undefined },
  ),
  takeProfit: fc.option(
    fc.float({ min: Math.fround(0.01), max: Math.fround(200000), noNaN: true }),
    { nil: undefined },
  ),
  orderType: fc.constantFrom("MARKET", "LIMIT"),
  limitPrice: fc.option(
    fc.float({ min: Math.fround(0.01), max: Math.fround(200000), noNaN: true }),
    { nil: undefined },
  ),
  reason: fc.string({ minLength: 1, maxLength: 500 }),
});

const validationArb = fc.record({
  score: fc.integer({ min: 0, max: 100 }),
  comment: fc.string({ minLength: 1, maxLength: 300 }),
});

// ---------------------------------------------------------------------------
// Property 4: buildMarketPromptBlock Contains Input Prices
// ---------------------------------------------------------------------------

describe("Feature: nextjs-api-layer-migration, Property 4: buildMarketPromptBlock Contains Input Prices", () => {
  /**
   * **Validates: Requirements 1.5**
   *
   * For any market data with btc.price and eth.price,
   * the returned string contains both price values as substrings.
   */
  it("returned string contains BTC and ETH price values", () => {
    fc.assert(
      fc.property(priceArb, priceArb, (btc, eth) => {
        const marketData = {
          btc: { price: btc.price, change24h: btc.change24h },
          eth: { price: eth.price, change24h: eth.change24h },
        };
        const block = buildMarketPromptBlock(marketData);
        expect(block).toContain(String(btc.price));
        expect(block).toContain(String(eth.price));
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: AI Trade Response Validation Idempotence
// ---------------------------------------------------------------------------

describe("Feature: nextjs-api-layer-migration, Property 5: AI Trade Response Validation Idempotence", () => {
  /**
   * **Validates: Requirements 1.6, 1.10**
   *
   * Validating the sanitized output again produces valid === true
   * with a sanitized output deeply equal to the first result.
   */
  it("re-validating sanitized output produces identical result", () => {
    fc.assert(
      fc.property(decisionArb, validationArb, (decision, validation) => {
        const input = { decision, validation };
        const first = validateAiTradeResponse(input);

        // Only test idempotence when first validation succeeds
        if (!first.valid) return;

        const second = validateAiTradeResponse(first.sanitized);
        expect(second.valid).toBe(true);
        expect(second.sanitized).toEqual(first.sanitized);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: cleanAiJsonResponse Round-Trip
// ---------------------------------------------------------------------------

describe("Feature: nextjs-api-layer-migration, Property 6: cleanAiJsonResponse Round-Trip", () => {
  /**
   * **Validates: Requirements 1.8**
   *
   * Wrapping a JSON object in markdown fences then cleaning
   * produces parseable JSON equal to the original.
   */
  it("wrapping JSON in ```json fences then cleaning produces equal object", () => {
    const jsonObjectArb = fc.dictionary(
      fc.string({ minLength: 1, maxLength: 20, unit: "grapheme-ascii" }),
      fc.oneof(
        fc.string({ maxLength: 50 }),
        fc.integer({ min: -1000, max: 1000 }),
        fc.boolean(),
        fc.constant(null),
      ),
      { minKeys: 1, maxKeys: 10 },
    );

    fc.assert(
      fc.property(jsonObjectArb, (obj) => {
        const jsonStr = JSON.stringify(obj);
        const wrapped = "```json\n" + jsonStr + "\n```";
        const cleaned = cleanAiJsonResponse(wrapped);
        const parsed = JSON.parse(cleaned);
        expect(parsed).toEqual(obj);
      }),
      { numRuns: 100 },
    );
  });

  it("wrapping JSON in plain ``` fences then cleaning produces equal object", () => {
    const jsonObjectArb = fc.dictionary(
      fc.string({ minLength: 1, maxLength: 20, unit: "grapheme-ascii" }),
      fc.oneof(
        fc.string({ maxLength: 50 }),
        fc.integer({ min: -1000, max: 1000 }),
        fc.boolean(),
        fc.constant(null),
      ),
      { minKeys: 1, maxKeys: 10 },
    );

    fc.assert(
      fc.property(jsonObjectArb, (obj) => {
        const jsonStr = JSON.stringify(obj);
        const wrapped = "```\n" + jsonStr + "\n```";
        const cleaned = cleanAiJsonResponse(wrapped);
        const parsed = JSON.parse(cleaned);
        expect(parsed).toEqual(obj);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Additional imports for Property 8, 9, 10
// ---------------------------------------------------------------------------
import {
  computeDynamicNotionalCap,
  sanitizeReassessResponse,
  validateAndClampGridRange,
} from "@/app/lib/ai-helpers";
import { NOTIONAL_GUIDE_BY_RISK } from "@/app/lib/constants";

// ---------------------------------------------------------------------------
// Property 8: Dynamic Notional Cap Computation
// ---------------------------------------------------------------------------

describe("Feature: nextjs-api-layer-migration, Property 8: Dynamic Notional Cap Computation", () => {
  /**
   * **Validates: Requirements 5.2**
   *
   * For any totalTreasury > 0, availableCapital > 0, and riskProfile,
   * dynamicNotionalCap === max(50, min(treasury * allocationPct, capital))
   */
  it("computes max(50, min(treasury * allocationPct, capital)) for all risk profiles", () => {
    const riskArb = fc.constantFrom(
      "conservative" as const,
      "balanced" as const,
      "aggressive" as const,
    );

    fc.assert(
      fc.property(
        fc.float({
          min: Math.fround(0.01),
          max: Math.fround(1e6),
          noNaN: true,
        }),
        fc.float({
          min: Math.fround(0.01),
          max: Math.fround(1e6),
          noNaN: true,
        }),
        riskArb,
        (treasury, capital, risk) => {
          const allocationPct =
            risk === "conservative" ? 0.1 : risk === "aggressive" ? 0.4 : 0.25;
          const expected = Math.max(
            50,
            Math.min(treasury * allocationPct, capital),
          );
          const result = computeDynamicNotionalCap(treasury, capital, risk);
          expect(result).toBeCloseTo(expected, 4);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("falls back to NOTIONAL_GUIDE_BY_RISK when treasury is undefined", () => {
    const riskArb = fc.constantFrom(
      "conservative" as const,
      "balanced" as const,
      "aggressive" as const,
    );

    fc.assert(
      fc.property(riskArb, (risk) => {
        const result = computeDynamicNotionalCap(undefined, undefined, risk);
        const expected = Math.max(50, NOTIONAL_GUIDE_BY_RISK[risk]);
        expect(result).toBe(expected);
      }),
      { numRuns: 10 },
    );
  });

  it("enforces minimum of 50", () => {
    // Very small treasury and capital should still produce at least 50
    const result = computeDynamicNotionalCap(10, 5, "conservative");
    expect(result).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// Property 9: Reassess Response Sanitization
// ---------------------------------------------------------------------------

describe("Feature: nextjs-api-layer-migration, Property 9: Reassess Response Sanitization", () => {
  /**
   * **Validates: Requirements 6.5**
   *
   * action defaults to "KEEP", confidence clamped [0,100], reason truncated to 500 chars.
   */
  it("action is always KEEP or CLOSE, defaulting to KEEP for invalid values", () => {
    fc.assert(
      fc.property(
        fc.record({
          action: fc.oneof(
            fc.string(),
            fc.constant(undefined),
            fc.constant(null),
          ),
          confidence: fc.oneof(
            fc.float({ noNaN: true }),
            fc.constant(undefined),
            fc.constant(null),
          ),
          reason: fc.oneof(
            fc.string({ minLength: 0, maxLength: 1000 }),
            fc.constant(undefined),
            fc.constant(null),
          ),
        }),
        (input) => {
          const result = sanitizeReassessResponse(input);

          // action must be KEEP or CLOSE
          expect(["KEEP", "CLOSE"]).toContain(result.action);

          // Only "CLOSE" (case-insensitive) maps to CLOSE
          if (
            typeof input.action === "string" &&
            input.action.toUpperCase() === "CLOSE"
          ) {
            expect(result.action).toBe("CLOSE");
          } else {
            expect(result.action).toBe("KEEP");
          }

          // confidence clamped [0, 100]
          expect(result.confidence).toBeGreaterThanOrEqual(0);
          expect(result.confidence).toBeLessThanOrEqual(100);

          // reason max 500 chars
          expect(result.reason.length).toBeLessThanOrEqual(500);

          // Default reason when input is not a string
          if (typeof input.reason !== "string") {
            expect(result.reason).toBe("Reassessment completed.");
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("defaults confidence to 50 for non-number inputs", () => {
    const result = sanitizeReassessResponse({
      action: "KEEP",
      confidence: "high",
      reason: "test",
    });
    expect(result.confidence).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// Property 10: Grid Advisory Range Validation and Clamping
// ---------------------------------------------------------------------------

describe("Feature: nextjs-api-layer-migration, Property 10: Grid Advisory Range Validation and Clamping", () => {
  /**
   * **Validates: Requirements 8.4, 8.5, 8.6**
   *
   * Range discarded when low >= high or doesn't contain price.
   * Clamped to maxPct (0.03 BTC, 0.04 ETH).
   */
  it("discards range when low >= high", () => {
    fc.assert(
      fc.property(
        fc.float({
          min: Math.fround(1),
          max: Math.fround(200000),
          noNaN: true,
        }),
        fc.float({
          min: Math.fround(1),
          max: Math.fround(200000),
          noNaN: true,
        }),
        fc.constantFrom("BTC" as const, "ETH" as const),
        (price, rangeLow, asset) => {
          // low >= high → discard
          const result = validateAndClampGridRange(
            rangeLow,
            rangeLow,
            price,
            asset,
          );
          expect(result.rangeLow).toBeUndefined();
          expect(result.rangeHigh).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("discards range when it doesn't contain current price", () => {
    fc.assert(
      fc.property(
        fc.float({
          min: Math.fround(1000),
          max: Math.fround(100000),
          noNaN: true,
        }),
        fc.constantFrom("BTC" as const, "ETH" as const),
        (price, asset) => {
          // Both low and high above price
          const result = validateAndClampGridRange(
            price + 100,
            price + 200,
            price,
            asset,
          );
          expect(result.rangeLow).toBeUndefined();
          expect(result.rangeHigh).toBeUndefined();

          // Both low and high below price (use fractions to stay positive)
          const result2 = validateAndClampGridRange(
            price * 0.3,
            price * 0.5,
            price,
            asset,
          );
          expect(result2.rangeLow).toBeUndefined();
          expect(result2.rangeHigh).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("clamps range to maxPct around current price", () => {
    fc.assert(
      fc.property(
        fc.float({
          min: Math.fround(100),
          max: Math.fround(100000),
          noNaN: true,
        }),
        fc.constantFrom("BTC" as const, "ETH" as const),
        (price, asset) => {
          const maxPct = asset === "BTC" ? 0.03 : 0.04;
          // Create a valid range that's wider than maxPct
          const wideLow = price * (1 - maxPct * 2);
          const wideHigh = price * (1 + maxPct * 2);

          const result = validateAndClampGridRange(
            wideLow,
            wideHigh,
            price,
            asset,
          );

          if (result.rangeLow !== undefined && result.rangeHigh !== undefined) {
            // After clamping, range must be within maxPct
            expect(result.rangeLow).toBeGreaterThanOrEqual(
              price * (1 - maxPct) - 0.01,
            );
            expect(result.rangeHigh).toBeLessThanOrEqual(
              price * (1 + maxPct) + 0.01,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("preserves valid range within maxPct", () => {
    // BTC: 3% max
    const result = validateAndClampGridRange(99000, 101000, 100000, "BTC");
    expect(result.rangeLow).toBe(99000);
    expect(result.rangeHigh).toBe(101000);
  });
});
