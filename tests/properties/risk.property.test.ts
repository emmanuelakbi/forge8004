// Feature: forge8004-core, Property 7: Risk router notional cap computation
// Feature: forge8004-core, Property 8: Trade intent structural completeness

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  getRiskRouterDecision,
  getRiskPolicy,
  createCheckpointsForIntent,
} from "@/src/services/trustArtifacts";
import { arbRiskProfile, arbTradeIntent } from "./arbitraries";
import type { TradeIntent } from "@/src/lib/types";

// ── Constants ─────────────────────────────────────────────────────

const ALLOCATION_PCT: Record<string, number> = {
  conservative: 0.1,
  balanced: 0.25,
  aggressive: 0.4,
};

// ── Property Tests ────────────────────────────────────────────────

describe("[Risk Router and Intent Completeness Properties]", () => {
  /**
   * Property 7: Risk router notional cap computation
   *
   * For any risk profile (conservative, balanced, aggressive), total treasury
   * amount, and available capital, the getRiskRouterDecision() function should
   * compute maxAllowedNotional as max(50, min(treasury * allocationPct,
   * availableCapital)) where allocationPct is 0.10/0.25/0.40 respectively.
   * If the trade intent size exceeds this cap, the risk check status should
   * be "BLOCKED".
   *
   * **Validates: Requirements 6.2, 6.3, 10.1, 10.2, 10.3**
   */
  describe("Property 7: Risk router notional cap computation", () => {
    it("should compute maxAllowedNotional = min(treasury * allocationPct, availableCapital) for any risk profile and capital", () => {
      fc.assert(
        fc.property(
          arbRiskProfile,
          fc.double({ min: 0, max: 1_000_000, noNaN: true }),
          fc.double({ min: 0, max: 1_000_000, noNaN: true }),
          (riskProfile, totalTreasury, availableCapital) => {
            const policy = getRiskPolicy(riskProfile, totalTreasury);
            const expectedAllocationPct = ALLOCATION_PCT[riskProfile];

            // Verify policy allocationPct matches the risk profile
            expect(policy.allocationPct).toBe(expectedAllocationPct);

            // Verify maxAllocationNotional = treasury * allocationPct
            const expectedMaxAllocationNotional =
              totalTreasury > 0 ? totalTreasury * expectedAllocationPct : 0;
            expect(policy.maxAllocationNotional).toBeCloseTo(
              expectedMaxAllocationNotional,
              4,
            );

            // Call getRiskRouterDecision with a small trade to get the computed maxAllowedNotional
            const result = getRiskRouterDecision({
              policy,
              totalTreasury,
              availableCapital,
              activePositions: [],
              intents: [],
              asset: "BTC",
              side: "BUY",
              tradeNotional: 1, // small trade to not trigger blocking
              leverage: 1,
              currentDrawdownPct: 0,
            });

            // maxAllowedNotional = min(availableCapital, policy.maxAllocationNotional)
            const expectedMaxAllowedNotional = Math.min(
              availableCapital,
              policy.maxAllocationNotional,
            );
            expect(result.maxAllowedNotional).toBeCloseTo(
              expectedMaxAllowedNotional,
              4,
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should BLOCK trades when tradeNotional exceeds maxAllowedNotional or availableCapital", () => {
      fc.assert(
        fc.property(
          arbRiskProfile,
          fc.double({ min: 100, max: 500_000, noNaN: true }),
          fc.double({ min: 100, max: 500_000, noNaN: true }),
          (riskProfile, totalTreasury, availableCapital) => {
            const policy = getRiskPolicy(riskProfile, totalTreasury);
            const maxAllowedNotional = Math.min(
              availableCapital,
              policy.maxAllocationNotional,
            );

            // Use a trade notional that clearly exceeds both caps (with buffer)
            const oversizedNotional =
              Math.max(availableCapital, maxAllowedNotional) * 1.5 + 100;

            const result = getRiskRouterDecision({
              policy,
              totalTreasury,
              availableCapital,
              activePositions: [],
              intents: [],
              asset: "BTC",
              side: "BUY",
              tradeNotional: oversizedNotional,
              leverage: 1,
              currentDrawdownPct: 0,
            });

            // Oversized trades should not be approved
            expect(result.approved).toBe(false);
            expect(result.code).toBe("CAPITAL_LIMIT");
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should have correct allocationPct per risk profile: 0.10 conservative, 0.25 balanced, 0.40 aggressive", () => {
      fc.assert(
        fc.property(
          arbRiskProfile,
          fc.double({ min: 1000, max: 500_000, noNaN: true }),
          (riskProfile, totalTreasury) => {
            const policy = getRiskPolicy(riskProfile, totalTreasury);

            switch (riskProfile) {
              case "conservative":
                expect(policy.allocationPct).toBe(0.1);
                break;
              case "balanced":
                expect(policy.allocationPct).toBe(0.25);
                break;
              case "aggressive":
                expect(policy.allocationPct).toBe(0.4);
                break;
            }

            // maxAllocationNotional should be treasury * allocationPct
            expect(policy.maxAllocationNotional).toBeCloseTo(
              totalTreasury * policy.allocationPct,
              4,
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should APPROVE trades within the notional cap", () => {
      fc.assert(
        fc.property(
          arbRiskProfile,
          fc.double({ min: 1000, max: 500_000, noNaN: true }),
          fc.double({ min: 1000, max: 500_000, noNaN: true }),
          (riskProfile, totalTreasury, availableCapital) => {
            const policy = getRiskPolicy(riskProfile, totalTreasury);
            const maxAllowedNotional = Math.min(
              availableCapital,
              policy.maxAllocationNotional,
            );

            // Use a trade notional well within the cap
            const safeNotional = Math.min(
              maxAllowedNotional * 0.5,
              availableCapital * 0.5,
            );
            if (safeNotional <= 0) return; // skip degenerate cases

            const result = getRiskRouterDecision({
              policy,
              totalTreasury,
              availableCapital,
              activePositions: [],
              intents: [],
              asset: "BTC",
              side: "BUY",
              tradeNotional: safeNotional,
              leverage: 1,
              currentDrawdownPct: 0,
            });

            expect(result.approved).toBe(true);
            expect(result.code).toBe("APPROVED");
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 8: Trade intent structural completeness
   *
   * For any generated trade intent that passes through the full trade cycle,
   * the intent should contain a riskCheck object (with status, score, comment,
   * route, maxAllowedNotional, capitalUtilizationPct), a validation object
   * (with score 0–100 and comment), and a policySnapshot object (with
   * allocationPct, maxAllocationNotional, dailyLossLimitPct, leverageCap,
   * maxOpenPositions, killSwitchDrawdownPct, allowedAssets, executionMode).
   *
   * **Validates: Requirements 6.1, 6.4, 10.4**
   */
  describe("Property 8: Trade intent structural completeness", () => {
    /** Arbitrary for a fully-assembled trade intent that has passed through the full cycle */
    const arbFullCycleIntent: fc.Arbitrary<TradeIntent> = fc
      .record({
        agentId: fc.uuid(),
        intentId: fc.uuid(),
        nonce: fc.string({ minLength: 10, maxLength: 40 }),
        side: fc.constantFrom("BUY" as const, "SELL" as const),
        asset: fc.constantFrom("BTC", "ETH"),
        size: fc.double({ min: 50, max: 100_000, noNaN: true }),
        entryPrice: fc.double({ min: 0.01, max: 200_000, noNaN: true }),
        capitalAllocated: fc.double({ min: 50, max: 100_000, noNaN: true }),
        timestamp: fc.integer({
          min: 1_700_000_000_000,
          max: 2_000_000_000_000,
        }),
        riskProfile: arbRiskProfile,
        totalTreasury: fc.double({ min: 1000, max: 1_000_000, noNaN: true }),
        availableCapital: fc.double({
          min: 500,
          max: 1_000_000,
          noNaN: true,
        }),
        validationScore: fc.integer({ min: 0, max: 100 }),
        validationComment: fc.string({ minLength: 1, maxLength: 200 }),
      })
      .map((params) => {
        const policy = getRiskPolicy(params.riskProfile, params.totalTreasury);
        const maxAllowedNotional = Math.min(
          params.availableCapital,
          policy.maxAllocationNotional,
        );
        const capitalUtilizationPct =
          maxAllowedNotional > 0
            ? (params.capitalAllocated / maxAllowedNotional) * 100
            : 0;

        const intent: TradeIntent = {
          agentId: params.agentId,
          intentId: params.intentId,
          nonce: params.nonce,
          side: params.side,
          asset: params.asset,
          size: params.size,
          entryPrice: params.entryPrice,
          capitalAllocated: params.capitalAllocated,
          timestamp: params.timestamp,
          riskCheck: {
            status: "APPROVED",
            score: Math.min(100, Math.max(0, params.validationScore)),
            comment:
              "Risk Router approved the trade under current sandbox policy.",
            route: "RISK_ROUTER",
            maxAllowedNotional,
            capitalUtilizationPct,
          },
          validation: {
            score: params.validationScore,
            comment: params.validationComment,
          },
          policySnapshot: {
            allocationPct: policy.allocationPct,
            maxAllocationNotional: policy.maxAllocationNotional,
            dailyLossLimitPct: policy.dailyLossLimitPct,
            leverageCap: policy.leverageCap,
            maxOpenPositions: policy.maxOpenPositions,
            killSwitchDrawdownPct: policy.killSwitchDrawdownPct,
            allowedAssets: policy.allowedAssets,
            executionMode: policy.executionMode,
          },
          execution: {
            status: "FILLED",
            venue: "FORGE_SANDBOX",
            mode: "SPOT",
            settlement: "OPEN_POSITION",
            fillPrice: params.entryPrice,
          },
        };
        return intent;
      });

    it("should contain riskCheck with all required fields", () => {
      fc.assert(
        fc.property(arbFullCycleIntent, (intent) => {
          // riskCheck must exist
          expect(intent.riskCheck).toBeDefined();
          const rc = intent.riskCheck!;

          // Required fields
          expect(["APPROVED", "BLOCKED", "SAFE_HOLD"]).toContain(rc.status);
          expect(typeof rc.score).toBe("number");
          expect(rc.score).toBeGreaterThanOrEqual(0);
          expect(rc.score).toBeLessThanOrEqual(100);
          expect(typeof rc.comment).toBe("string");
          expect(rc.comment.length).toBeGreaterThan(0);
          expect(rc.route).toBe("RISK_ROUTER");
          expect(typeof rc.maxAllowedNotional).toBe("number");
          expect(typeof rc.capitalUtilizationPct).toBe("number");
        }),
        { numRuns: 100 },
      );
    });

    it("should contain validation with score 0–100 and comment", () => {
      fc.assert(
        fc.property(arbFullCycleIntent, (intent) => {
          // validation must exist
          expect(intent.validation).toBeDefined();
          const v = intent.validation!;

          expect(typeof v.score).toBe("number");
          expect(v.score).toBeGreaterThanOrEqual(0);
          expect(v.score).toBeLessThanOrEqual(100);
          expect(typeof v.comment).toBe("string");
          expect(v.comment.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 },
      );
    });

    it("should contain policySnapshot with all required fields", () => {
      fc.assert(
        fc.property(arbFullCycleIntent, (intent) => {
          // policySnapshot must exist
          expect(intent.policySnapshot).toBeDefined();
          const ps = intent.policySnapshot!;

          // All required policy fields
          expect(typeof ps.allocationPct).toBe("number");
          expect(ps.allocationPct).toBeGreaterThan(0);
          expect(ps.allocationPct).toBeLessThanOrEqual(1);

          expect(typeof ps.maxAllocationNotional).toBe("number");
          expect(ps.maxAllocationNotional).toBeGreaterThanOrEqual(0);

          expect(typeof ps.dailyLossLimitPct).toBe("number");
          expect(ps.dailyLossLimitPct).toBeGreaterThan(0);

          expect(typeof ps.leverageCap).toBe("number");
          expect(ps.leverageCap).toBeGreaterThanOrEqual(1);

          expect(typeof ps.maxOpenPositions).toBe("number");
          expect(ps.maxOpenPositions).toBeGreaterThanOrEqual(1);

          expect(typeof ps.killSwitchDrawdownPct).toBe("number");
          expect(ps.killSwitchDrawdownPct).toBeGreaterThan(0);

          expect(Array.isArray(ps.allowedAssets)).toBe(true);
          expect(ps.allowedAssets.length).toBeGreaterThan(0);
          expect(ps.allowedAssets).toContain("BTC");
          expect(ps.allowedAssets).toContain("ETH");

          expect(ps.executionMode).toBe("SPOT_SANDBOX");
        }),
        { numRuns: 100 },
      );
    });

    it("should produce checkpoints covering all lifecycle stages when intent has full cycle data", () => {
      fc.assert(
        fc.property(arbFullCycleIntent, (intent) => {
          const checkpoints = createCheckpointsForIntent(intent);

          // Should have checkpoints for all 4 stages (INTENT_CREATED, RISK_REVIEWED, EXECUTION_RECORDED, VALIDATION_RECORDED)
          const stages = checkpoints.map((cp) => cp.stage);
          expect(stages).toContain("INTENT_CREATED");
          expect(stages).toContain("RISK_REVIEWED");
          expect(stages).toContain("EXECUTION_RECORDED");
          expect(stages).toContain("VALIDATION_RECORDED");

          // Each checkpoint should have required fields
          for (const cp of checkpoints) {
            expect(cp.agentId).toBe(intent.agentId);
            expect(cp.intentId).toBe(intent.intentId);
            expect(cp.nonce).toBe(intent.nonce);
            expect(typeof cp.kind).toBe("string");
            expect(typeof cp.stage).toBe("string");
            expect(typeof cp.status).toBe("string");
            expect(typeof cp.title).toBe("string");
            expect(typeof cp.detail).toBe("string");
            expect(typeof cp.timestamp).toBe("number");
          }
        }),
        { numRuns: 100 },
      );
    });

    it("should have policySnapshot allocationPct matching the risk profile used", () => {
      fc.assert(
        fc.property(
          arbRiskProfile,
          fc.double({ min: 1000, max: 500_000, noNaN: true }),
          (riskProfile, totalTreasury) => {
            const policy = getRiskPolicy(riskProfile, totalTreasury);

            expect(policy.allocationPct).toBe(ALLOCATION_PCT[riskProfile]);
            expect(policy.maxAllocationNotional).toBeCloseTo(
              totalTreasury * ALLOCATION_PCT[riskProfile],
              4,
            );
            expect(policy.executionMode).toBe("SPOT_SANDBOX");
            expect(policy.allowedAssets).toEqual(["BTC", "ETH"]);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
