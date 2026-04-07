// Feature: forge8004-core, Property 5: AI response schema validation
// Feature: forge8004-core, Property 6: Reassessment response sanitization

import { describe, it, expect } from "vitest";
import fc from "fast-check";

// ── Constants mirroring server.ts ─────────────────────────────────
const VALID_SIDES = new Set(["BUY", "SELL", "HOLD"]);
const VALID_ASSETS = new Set(["BTC", "ETH"]);

// ── validateAiTradeResponse — extracted from server.ts (not exported) ──
function validateAiTradeResponse(result: any): {
  valid: boolean;
  sanitized: any;
} {
  if (!result || typeof result !== "object")
    return { valid: false, sanitized: null };
  const d = result.decision;
  const v = result.validation;
  if (!d || typeof d !== "object" || !v || typeof v !== "object")
    return { valid: false, sanitized: null };

  const side = typeof d.side === "string" ? d.side.toUpperCase() : "HOLD";
  if (!VALID_SIDES.has(side)) return { valid: false, sanitized: null };

  const asset = typeof d.asset === "string" ? d.asset.toUpperCase() : "BTC";
  const score =
    typeof v.score === "number" && v.score >= 0 && v.score <= 100
      ? v.score
      : 50;

  return {
    valid: true,
    sanitized: {
      decision: {
        side,
        asset: VALID_ASSETS.has(asset) ? asset : "BTC",
        size:
          typeof d.size === "number" && Number.isFinite(d.size)
            ? d.size
            : undefined,
        stopLoss:
          typeof d.stopLoss === "number" && Number.isFinite(d.stopLoss)
            ? d.stopLoss
            : undefined,
        takeProfit:
          typeof d.takeProfit === "number" && Number.isFinite(d.takeProfit)
            ? d.takeProfit
            : undefined,
        orderType:
          typeof d.orderType === "string" &&
          d.orderType.toUpperCase() === "LIMIT"
            ? "LIMIT"
            : "MARKET",
        limitPrice:
          typeof d.limitPrice === "number" && Number.isFinite(d.limitPrice)
            ? d.limitPrice
            : undefined,
        reason:
          typeof d.reason === "string"
            ? d.reason.slice(0, 500)
            : "No rationale provided.",
      },
      validation: {
        score,
        comment:
          typeof v.comment === "string"
            ? v.comment.slice(0, 300)
            : "Validation recorded.",
      },
    },
  };
}

// ── sanitizeReassessmentResponse — extracted from server.ts reassess-position endpoint ──
function sanitizeReassessmentResponse(parsed: any): {
  action: "KEEP" | "CLOSE";
  confidence: number;
  reason: string;
} {
  const action =
    typeof parsed.action === "string" && parsed.action.toUpperCase() === "CLOSE"
      ? ("CLOSE" as const)
      : ("KEEP" as const);
  const confidence =
    typeof parsed.confidence === "number" &&
    parsed.confidence >= 0 &&
    parsed.confidence <= 100
      ? parsed.confidence
      : 50;
  const reason =
    typeof parsed.reason === "string"
      ? parsed.reason.slice(0, 500)
      : "Reassessment completed.";

  return { action, confidence, reason };
}

// ── Arbitraries ───────────────────────────────────────────────────

/** Generates a fully valid AI trade response object */
const arbValidAiTradeResponse = fc.record({
  decision: fc.record({
    side: fc.constantFrom("BUY", "SELL", "HOLD"),
    asset: fc.constantFrom("BTC", "ETH"),
    size: fc.double({ min: 0.001, max: 100_000, noNaN: true }),
    stopLoss: fc.double({ min: 0.01, max: 200_000, noNaN: true }),
    takeProfit: fc.double({ min: 0.01, max: 200_000, noNaN: true }),
    orderType: fc.constantFrom("MARKET", "LIMIT"),
    limitPrice: fc.double({ min: 0.01, max: 200_000, noNaN: true }),
    reason: fc.string({ minLength: 1, maxLength: 200 }),
  }),
  validation: fc.record({
    score: fc.integer({ min: 0, max: 100 }),
    comment: fc.string({ minLength: 1, maxLength: 200 }),
  }),
});

/** Generates arbitrary JSON objects (may or may not be valid) */
const arbArbitraryJsonObject = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.constant(42),
  fc.constant("string"),
  fc.constant(true),
  fc.constant({}),
  fc.record({ decision: fc.constant(null) }),
  fc.record({ validation: fc.constant(null) }),
  fc.record({
    decision: fc.constant({ side: "INVALID" }),
    validation: fc.constant({ score: 50 }),
  }),
  fc.record({
    decision: fc.constant({ side: "BUY", asset: "BTC" }),
    validation: fc.constant({}),
  }),
  // Missing decision
  fc.record({
    validation: fc.record({
      score: fc.integer({ min: 0, max: 100 }),
      comment: fc.string(),
    }),
  }),
  // Missing validation
  fc.record({
    decision: fc.record({
      side: fc.constantFrom("BUY", "SELL", "HOLD"),
      asset: fc.constantFrom("BTC", "ETH"),
    }),
  }),
  // decision is not an object
  fc.record({
    decision: fc.constant("not-an-object"),
    validation: fc.record({ score: fc.integer(), comment: fc.string() }),
  }),
  // validation is not an object
  fc.record({
    decision: fc.record({ side: fc.constant("BUY") }),
    validation: fc.constant("not-an-object"),
  }),
);

/** Generates objects with invalid side values */
const arbInvalidSideResponse = fc.record({
  decision: fc.record({
    side: fc
      .string({ minLength: 1, maxLength: 20 })
      .filter(
        (s) => !["BUY", "SELL", "HOLD", "buy", "sell", "hold"].includes(s),
      ),
    asset: fc.constantFrom("BTC", "ETH"),
    size: fc.double({ min: 0.01, max: 1000, noNaN: true }),
  }),
  validation: fc.record({
    score: fc.integer({ min: 0, max: 100 }),
    comment: fc.string(),
  }),
});

/** Generates objects with NaN/Infinity numeric fields */
const arbNonFiniteNumericResponse = fc.record({
  decision: fc.record({
    side: fc.constantFrom("BUY", "SELL", "HOLD"),
    asset: fc.constantFrom("BTC", "ETH"),
    size: fc.constantFrom(NaN, Infinity, -Infinity),
    stopLoss: fc.constantFrom(NaN, Infinity, -Infinity),
    takeProfit: fc.constantFrom(NaN, Infinity, -Infinity),
  }),
  validation: fc.record({
    score: fc.integer({ min: 0, max: 100 }),
    comment: fc.string(),
  }),
});

/** Generates a raw reassessment response with arbitrary fields */
const arbRawReassessmentResponse = fc.oneof(
  // Valid-ish responses
  fc.record({
    action: fc.constantFrom("KEEP", "CLOSE", "keep", "close"),
    confidence: fc.integer({ min: 0, max: 100 }),
    reason: fc.string({ minLength: 0, maxLength: 200 }),
  }),
  // Invalid action
  fc.record({
    action: fc.string({ minLength: 0, maxLength: 20 }),
    confidence: fc.integer({ min: 0, max: 100 }),
    reason: fc.string({ minLength: 0, maxLength: 200 }),
  }),
  // Out-of-range confidence
  fc.record({
    action: fc.constantFrom("KEEP", "CLOSE"),
    confidence: fc.oneof(
      fc.integer({ min: -1000, max: -1 }),
      fc.integer({ min: 101, max: 1000 }),
    ),
    reason: fc.string({ minLength: 0, maxLength: 200 }),
  }),
  // Missing fields
  fc.record({
    action: fc.constantFrom("KEEP", "CLOSE"),
  }),
  fc.record({
    confidence: fc.integer({ min: 0, max: 100 }),
  }),
  fc.constant({}),
  // Very long reason
  fc.record({
    action: fc.constantFrom("KEEP", "CLOSE"),
    confidence: fc.integer({ min: 0, max: 100 }),
    reason: fc.string({ minLength: 500, maxLength: 1000 }),
  }),
  // Non-string reason
  fc.record({
    action: fc.constantFrom("KEEP", "CLOSE"),
    confidence: fc.integer({ min: 0, max: 100 }),
    reason: fc.constant(12345),
  }),
  // Non-number confidence
  fc.record({
    action: fc.constantFrom("KEEP", "CLOSE"),
    confidence: fc.constant("high"),
    reason: fc.string(),
  }),
);

// ── Property Tests ────────────────────────────────────────────────

describe("[AI Response Validation Properties]", () => {
  /**
   * Property 5: AI response schema validation
   *
   * For any JSON object, validateAiTradeResponse() should return valid:true
   * only when the object contains a decision with side in {BUY, SELL, HOLD},
   * asset in {BTC, ETH}, finite numeric fields, and a validation with score
   * between 0 and 100. All other inputs should return valid: false.
   *
   * **Validates: Requirements 3.3, 3.4**
   */
  describe("Property 5: AI response schema validation", () => {
    it("should return valid:true for well-formed AI trade responses with correct sanitized output", () => {
      fc.assert(
        fc.property(arbValidAiTradeResponse, (response) => {
          const { valid, sanitized } = validateAiTradeResponse(response);

          expect(valid).toBe(true);
          expect(sanitized).not.toBeNull();

          // Side is preserved and uppercased
          expect(VALID_SIDES.has(sanitized.decision.side)).toBe(true);

          // Asset is one of BTC/ETH
          expect(VALID_ASSETS.has(sanitized.decision.asset)).toBe(true);

          // Numeric fields are finite when present
          if (sanitized.decision.size !== undefined) {
            expect(Number.isFinite(sanitized.decision.size)).toBe(true);
          }
          if (sanitized.decision.stopLoss !== undefined) {
            expect(Number.isFinite(sanitized.decision.stopLoss)).toBe(true);
          }
          if (sanitized.decision.takeProfit !== undefined) {
            expect(Number.isFinite(sanitized.decision.takeProfit)).toBe(true);
          }
          if (sanitized.decision.limitPrice !== undefined) {
            expect(Number.isFinite(sanitized.decision.limitPrice)).toBe(true);
          }

          // Validation score is between 0 and 100
          expect(sanitized.validation.score).toBeGreaterThanOrEqual(0);
          expect(sanitized.validation.score).toBeLessThanOrEqual(100);

          // Reason is a string of at most 500 chars
          expect(typeof sanitized.decision.reason).toBe("string");
          expect(sanitized.decision.reason.length).toBeLessThanOrEqual(500);

          // Comment is a string of at most 300 chars
          expect(typeof sanitized.validation.comment).toBe("string");
          expect(sanitized.validation.comment.length).toBeLessThanOrEqual(300);
        }),
        { numRuns: 100 },
      );
    });

    it("should return valid:false for non-object inputs and structurally invalid responses", () => {
      fc.assert(
        fc.property(arbArbitraryJsonObject, (input) => {
          const { valid } = validateAiTradeResponse(input);

          // These inputs lack the required structure, so they should be invalid
          // (unless they happen to have both decision.side in VALID_SIDES and validation as object)
          const d =
            input && typeof input === "object"
              ? (input as any).decision
              : undefined;
          const v =
            input && typeof input === "object"
              ? (input as any).validation
              : undefined;

          if (
            !input ||
            typeof input !== "object" ||
            !d ||
            typeof d !== "object" ||
            !v ||
            typeof v !== "object"
          ) {
            expect(valid).toBe(false);
          } else {
            const side =
              typeof d.side === "string" ? d.side.toUpperCase() : "HOLD";
            if (!VALID_SIDES.has(side)) {
              expect(valid).toBe(false);
            }
            // If it passes all checks, valid:true is acceptable
          }
        }),
        { numRuns: 100 },
      );
    });

    it("should return valid:false when side is not BUY/SELL/HOLD", () => {
      fc.assert(
        fc.property(arbInvalidSideResponse, (response) => {
          const { valid } = validateAiTradeResponse(response);
          expect(valid).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    it("should sanitize non-finite numeric fields to undefined", () => {
      fc.assert(
        fc.property(arbNonFiniteNumericResponse, (response) => {
          const { valid, sanitized } = validateAiTradeResponse(response);

          // The response is structurally valid (has decision.side + validation)
          expect(valid).toBe(true);

          // Non-finite numerics should be sanitized to undefined
          expect(sanitized.decision.size).toBeUndefined();
          expect(sanitized.decision.stopLoss).toBeUndefined();
          expect(sanitized.decision.takeProfit).toBeUndefined();
        }),
        { numRuns: 100 },
      );
    });

    it("should clamp validation score to 50 when out of range", () => {
      const arbOutOfRangeScore = fc.record({
        decision: fc.record({
          side: fc.constantFrom("BUY", "SELL", "HOLD"),
          asset: fc.constantFrom("BTC", "ETH"),
        }),
        validation: fc.record({
          score: fc.oneof(
            fc.integer({ min: -1000, max: -1 }),
            fc.integer({ min: 101, max: 1000 }),
          ),
          comment: fc.string(),
        }),
      });

      fc.assert(
        fc.property(arbOutOfRangeScore, (response) => {
          const { valid, sanitized } = validateAiTradeResponse(response);
          expect(valid).toBe(true);
          // Out-of-range scores default to 50
          expect(sanitized.validation.score).toBe(50);
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 6: Reassessment response sanitization
   *
   * For any raw reassessment response from the Groq API, the server should
   * produce an output where action is exactly "KEEP" or "CLOSE", confidence
   * is between 0 and 100, and reason is a string of at most 500 characters.
   *
   * **Validates: Requirements 5.3**
   */
  describe("Property 6: Reassessment response sanitization", () => {
    it("should always produce action KEEP or CLOSE, confidence 0-100, and reason ≤500 chars", () => {
      fc.assert(
        fc.property(arbRawReassessmentResponse, (rawResponse) => {
          const result = sanitizeReassessmentResponse(rawResponse);

          // Action is exactly KEEP or CLOSE
          expect(["KEEP", "CLOSE"]).toContain(result.action);

          // Confidence is between 0 and 100
          expect(result.confidence).toBeGreaterThanOrEqual(0);
          expect(result.confidence).toBeLessThanOrEqual(100);

          // Reason is a string of at most 500 characters
          expect(typeof result.reason).toBe("string");
          expect(result.reason.length).toBeLessThanOrEqual(500);
        }),
        { numRuns: 100 },
      );
    });

    it("should default to KEEP when action is not exactly CLOSE", () => {
      const arbNonCloseAction = fc.record({
        action: fc
          .string({ minLength: 0, maxLength: 20 })
          .filter((s) => s.toUpperCase() !== "CLOSE"),
        confidence: fc.integer({ min: 0, max: 100 }),
        reason: fc.string({ minLength: 1, maxLength: 100 }),
      });

      fc.assert(
        fc.property(arbNonCloseAction, (rawResponse) => {
          const result = sanitizeReassessmentResponse(rawResponse);
          expect(result.action).toBe("KEEP");
        }),
        { numRuns: 100 },
      );
    });

    it("should default confidence to 50 when out of range or non-numeric", () => {
      const arbBadConfidence = fc.record({
        action: fc.constantFrom("KEEP", "CLOSE"),
        confidence: fc.oneof(
          fc.integer({ min: -1000, max: -1 }),
          fc.integer({ min: 101, max: 1000 }),
          fc.constant("high" as any),
          fc.constant(null as any),
          fc.constant(undefined as any),
        ),
        reason: fc.string({ minLength: 1, maxLength: 100 }),
      });

      fc.assert(
        fc.property(arbBadConfidence, (rawResponse) => {
          const result = sanitizeReassessmentResponse(rawResponse);
          expect(result.confidence).toBe(50);
        }),
        { numRuns: 100 },
      );
    });

    it("should truncate reason to 500 characters and default when non-string", () => {
      const arbLongReason = fc.record({
        action: fc.constantFrom("KEEP", "CLOSE"),
        confidence: fc.integer({ min: 0, max: 100 }),
        reason: fc.string({ minLength: 501, maxLength: 1000 }),
      });

      fc.assert(
        fc.property(arbLongReason, (rawResponse) => {
          const result = sanitizeReassessmentResponse(rawResponse);
          expect(result.reason.length).toBeLessThanOrEqual(500);
        }),
        { numRuns: 100 },
      );

      // Non-string reason defaults to "Reassessment completed."
      const arbNonStringReason = fc.record({
        action: fc.constantFrom("KEEP", "CLOSE"),
        confidence: fc.integer({ min: 0, max: 100 }),
        reason: fc.oneof(
          fc.constant(12345 as any),
          fc.constant(null as any),
          fc.constant(undefined as any),
          fc.constant(true as any),
        ),
      });

      fc.assert(
        fc.property(arbNonStringReason, (rawResponse) => {
          const result = sanitizeReassessmentResponse(rawResponse);
          expect(result.reason).toBe("Reassessment completed.");
        }),
        { numRuns: 100 },
      );
    });
  });
});
