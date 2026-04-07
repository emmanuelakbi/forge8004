// Feature: forge8004-core, Property 9: Checkpoint lifecycle coverage
// Feature: forge8004-core, Property 11: Nonce uniqueness
// Feature: forge8004-core, Property 12: Nonce propagation to checkpoints

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  createCheckpointsForIntent,
  createSequencedIntentNonce,
} from "@/src/services/trustArtifacts";
import type { TradeIntent } from "@/src/lib/types";

// ── Arbitraries ───────────────────────────────────────────────────

/**
 * Generates a TradeIntent with all lifecycle fields populated
 * (riskCheck, execution, validation) so that createCheckpointsForIntent
 * produces checkpoints for every applicable stage.
 */
const arbFullTradeIntent: fc.Arbitrary<TradeIntent> = fc.record({
  agentId: fc.uuid(),
  intentId: fc.uuid(),
  nonce: fc.string({ minLength: 10, maxLength: 40 }),
  side: fc.constantFrom("BUY" as const, "SELL" as const, "HOLD" as const),
  asset: fc.constantFrom("BTC", "ETH"),
  size: fc.double({ min: 50, max: 100_000, noNaN: true }),
  entryPrice: fc.double({ min: 0.01, max: 200_000, noNaN: true }),
  stopLoss: fc.double({ min: 0.01, max: 200_000, noNaN: true }),
  takeProfit: fc.double({ min: 0.01, max: 200_000, noNaN: true }),
  orderType: fc.constantFrom("MARKET" as const, "LIMIT" as const),
  timestamp: fc.integer({ min: 1_700_000_000_000, max: 2_000_000_000_000 }),
  status: fc.constantFrom(
    "OPEN" as const,
    "CLOSED" as const,
    "EXECUTED" as const,
  ),
  capitalAllocated: fc.double({ min: 50, max: 100_000, noNaN: true }),
  riskCheck: fc.record({
    status: fc.constantFrom(
      "APPROVED" as const,
      "BLOCKED" as const,
      "SAFE_HOLD" as const,
    ),
    score: fc.integer({ min: 0, max: 100 }),
    comment: fc.string({ minLength: 1, maxLength: 200 }),
    route: fc.constant("RISK_ROUTER" as const),
  }),
  execution: fc.record({
    status: fc.constantFrom(
      "ROUTED" as const,
      "FILLED" as const,
      "REJECTED" as const,
    ),
    venue: fc.constant("FORGE_SANDBOX" as const),
    mode: fc.constant("SPOT" as const),
    settlement: fc.constantFrom(
      "OPEN_POSITION" as const,
      "CLOSE_POSITION" as const,
    ),
  }),
  validation: fc.record({
    score: fc.integer({ min: 0, max: 100 }),
    comment: fc.string({ minLength: 1, maxLength: 200 }),
  }),
});

/** Generates an array of N distinct counter values for nonce uniqueness testing */
const arbDistinctCounters = fc.uniqueArray(
  fc.integer({ min: 0, max: 1_000_000 }),
  { minLength: 2, maxLength: 50 },
);

// ── Property Tests ────────────────────────────────────────────────

describe("[Checkpoint and Nonce Properties]", () => {
  /**
   * Property 9: Checkpoint lifecycle coverage
   *
   * For any trade intent processed through createCheckpointsForIntent(),
   * the resulting checkpoint array should contain at least one checkpoint
   * for each applicable lifecycle stage: INTENT_CREATED (kind: INTENT),
   * RISK_REVIEWED (kind: RISK), EXECUTION_RECORDED (kind: EXECUTION),
   * and VALIDATION_RECORDED (kind: VALIDATION). Each checkpoint should
   * contain agentId, intentId, nonce, kind, stage, status, title, detail,
   * and timestamp.
   *
   * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**
   */
  describe("Property 9: Checkpoint lifecycle coverage", () => {
    // Feature: forge8004-core, Property 9: Checkpoint lifecycle coverage
    it("should produce checkpoints for all four lifecycle stages when intent has riskCheck, execution, and validation", () => {
      fc.assert(
        fc.property(arbFullTradeIntent, (intent) => {
          const checkpoints = createCheckpointsForIntent(intent);

          // Must have at least 4 checkpoints (INTENT, RISK, EXECUTION, VALIDATION)
          expect(checkpoints.length).toBeGreaterThanOrEqual(4);

          const stages = checkpoints.map((cp) => cp.stage);
          const kinds = checkpoints.map((cp) => cp.kind);

          // Requirement 7.1: INTENT_CREATED checkpoint with kind INTENT
          expect(stages).toContain("INTENT_CREATED");
          expect(kinds).toContain("INTENT");

          // Requirement 7.2: RISK_REVIEWED checkpoint with kind RISK
          expect(stages).toContain("RISK_REVIEWED");
          expect(kinds).toContain("RISK");

          // Requirement 7.3: EXECUTION_RECORDED checkpoint with kind EXECUTION
          expect(stages).toContain("EXECUTION_RECORDED");
          expect(kinds).toContain("EXECUTION");

          // Requirement 7.4: VALIDATION_RECORDED checkpoint with kind VALIDATION
          expect(stages).toContain("VALIDATION_RECORDED");
          expect(kinds).toContain("VALIDATION");

          // Requirement 7.5: Each checkpoint has required fields
          for (const cp of checkpoints) {
            expect(cp.agentId).toBe(intent.agentId);
            expect(cp.intentId).toBe(intent.intentId);
            expect(cp.nonce).toBe(intent.nonce);
            expect(typeof cp.kind).toBe("string");
            expect(cp.kind.length).toBeGreaterThan(0);
            expect(typeof cp.stage).toBe("string");
            expect(cp.stage.length).toBeGreaterThan(0);
            expect(typeof cp.status).toBe("string");
            expect(cp.status.length).toBeGreaterThan(0);
            expect(typeof cp.title).toBe("string");
            expect(cp.title.length).toBeGreaterThan(0);
            expect(typeof cp.detail).toBe("string");
            expect(cp.detail.length).toBeGreaterThan(0);
            expect(typeof cp.timestamp).toBe("number");
          }
        }),
        { numRuns: 100 },
      );
    });

    it("should produce correct kind-stage pairings", () => {
      fc.assert(
        fc.property(arbFullTradeIntent, (intent) => {
          const checkpoints = createCheckpointsForIntent(intent);

          const expectedPairings: Record<string, string> = {
            INTENT_CREATED: "INTENT",
            RISK_REVIEWED: "RISK",
            EXECUTION_RECORDED: "EXECUTION",
            VALIDATION_RECORDED: "VALIDATION",
          };

          for (const cp of checkpoints) {
            if (expectedPairings[cp.stage]) {
              expect(cp.kind).toBe(expectedPairings[cp.stage]);
            }
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 11: Nonce uniqueness
   *
   * For any sequence of N distinct counter values passed to
   * createSequencedIntentNonce(), the resulting N nonce strings
   * should all be distinct.
   *
   * **Validates: Requirements 8.1, 8.3**
   */
  describe("Property 11: Nonce uniqueness", () => {
    // Feature: forge8004-core, Property 11: Nonce uniqueness
    it("should produce N distinct nonce strings for N distinct counter values", () => {
      fc.assert(
        fc.property(arbDistinctCounters, (counters) => {
          const nonces = counters.map((c) => createSequencedIntentNonce(c));
          const uniqueNonces = new Set(nonces);

          // All nonces must be distinct
          expect(uniqueNonces.size).toBe(counters.length);
        }),
        { numRuns: 100 },
      );
    });

    it("should produce nonces that are non-empty strings", () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 1_000_000 }), (counter) => {
          const nonce = createSequencedIntentNonce(counter);
          expect(typeof nonce).toBe("string");
          expect(nonce.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 12: Nonce propagation to checkpoints
   *
   * For any trade intent with a nonce, all checkpoints produced by
   * createCheckpointsForIntent() for that intent should carry the
   * same nonce value as the intent.
   *
   * **Validates: Requirements 8.2**
   */
  describe("Property 12: Nonce propagation to checkpoints", () => {
    // Feature: forge8004-core, Property 12: Nonce propagation to checkpoints
    it("should propagate the intent nonce to every checkpoint", () => {
      fc.assert(
        fc.property(arbFullTradeIntent, (intent) => {
          const checkpoints = createCheckpointsForIntent(intent);

          // Every checkpoint must carry the same nonce as the intent
          for (const cp of checkpoints) {
            expect(cp.nonce).toBe(intent.nonce);
          }
        }),
        { numRuns: 100 },
      );
    });

    it("should propagate nonce even for minimal intents (no riskCheck/execution/validation)", () => {
      const arbMinimalIntent = fc.record({
        agentId: fc.uuid(),
        intentId: fc.uuid(),
        nonce: fc.string({ minLength: 10, maxLength: 40 }),
        side: fc.constantFrom("BUY" as const, "SELL" as const, "HOLD" as const),
        asset: fc.constantFrom("BTC", "ETH"),
        size: fc.double({ min: 50, max: 100_000, noNaN: true }),
        timestamp: fc.integer({
          min: 1_700_000_000_000,
          max: 2_000_000_000_000,
        }),
      });

      fc.assert(
        fc.property(arbMinimalIntent, (intent) => {
          const checkpoints = createCheckpointsForIntent(intent as TradeIntent);

          // At least the INTENT_CREATED checkpoint should exist
          expect(checkpoints.length).toBeGreaterThanOrEqual(1);

          for (const cp of checkpoints) {
            expect(cp.nonce).toBe(intent.nonce);
          }
        }),
        { numRuns: 100 },
      );
    });
  });
});
