// Unit tests for risk and validation edge cases
// Validates: Requirements 3.4, 3.5, 3.7, 6.2

import { describe, it, expect } from "vitest";
import {
  getRiskRouterDecision,
  getRiskPolicy,
} from "@/src/services/trustArtifacts";
import type { TradeIntent } from "@/src/lib/types";

// ── validateAiTradeResponse — extracted from server.ts (not exported) ──

const VALID_SIDES = new Set(["BUY", "SELL", "HOLD"]);
const VALID_ASSETS = new Set(["BTC", "ETH"]);

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

// ── Rate limiter simulation (mirrors server.ts: 20 req/min window) ──

function createRateLimiter(maxRequests: number, windowMs: number) {
  const requests: number[] = [];

  return {
    tryRequest(now: number): { allowed: boolean; remaining: number } {
      // Evict requests outside the window
      while (requests.length > 0 && requests[0] <= now - windowMs) {
        requests.shift();
      }
      if (requests.length >= maxRequests) {
        return { allowed: false, remaining: 0 };
      }
      requests.push(now);
      return { allowed: true, remaining: maxRequests - requests.length };
    },
  };
}

// ── Helper to build default risk router params ────────────────────

function buildRiskParams(
  overrides: Partial<Parameters<typeof getRiskRouterDecision>[0]> = {},
): Parameters<typeof getRiskRouterDecision>[0] {
  const policy = getRiskPolicy("balanced", 10000);
  return {
    policy,
    totalTreasury: 10000,
    availableCapital: 5000,
    activePositions: [],
    intents: [],
    asset: "BTC",
    side: "BUY",
    tradeNotional: 100,
    leverage: 1,
    currentDrawdownPct: 0,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────

describe("[RiskValidation]", () => {
  /**
   * Requirement 6.2: Risk router with zero treasury and zero available capital
   */
  describe("risk router with zero treasury / zero available capital", () => {
    it("should compute maxAllocationNotional as 0 when treasury is 0", () => {
      const policy = getRiskPolicy("balanced", 0);
      expect(policy.maxAllocationNotional).toBe(0);
      expect(policy.allocationPct).toBe(0.25);
    });

    it("should compute maxAllocationNotional as 0 for all risk profiles when treasury is 0", () => {
      for (const profile of [
        "conservative",
        "balanced",
        "aggressive",
      ] as const) {
        const policy = getRiskPolicy(profile, 0);
        expect(policy.maxAllocationNotional).toBe(0);
      }
    });

    it("should BLOCK any trade when treasury is 0 and available capital is 0", () => {
      const policy = getRiskPolicy("balanced", 0);
      const result = getRiskRouterDecision({
        policy,
        totalTreasury: 0,
        availableCapital: 0,
        activePositions: [],
        intents: [],
        asset: "BTC",
        side: "BUY",
        tradeNotional: 100,
        leverage: 1,
        currentDrawdownPct: 0,
      });

      expect(result.approved).toBe(false);
      expect(result.code).toBe("CAPITAL_LIMIT");
      expect(result.maxAllowedNotional).toBe(0);
    });

    it("should BLOCK any trade when available capital is 0 even with positive treasury", () => {
      const policy = getRiskPolicy("aggressive", 50000);
      const result = getRiskRouterDecision({
        policy,
        totalTreasury: 50000,
        availableCapital: 0,
        activePositions: [],
        intents: [],
        asset: "ETH",
        side: "BUY",
        tradeNotional: 50,
        leverage: 1,
        currentDrawdownPct: 0,
      });

      expect(result.approved).toBe(false);
      expect(result.code).toBe("CAPITAL_LIMIT");
      expect(result.maxAllowedNotional).toBe(0);
    });

    it("should set maxAllowedNotional to min(availableCapital, maxAllocationNotional)", () => {
      // availableCapital < maxAllocationNotional
      const policy = getRiskPolicy("aggressive", 100000); // 40% = 40000
      const result = getRiskRouterDecision({
        policy,
        totalTreasury: 100000,
        availableCapital: 500,
        activePositions: [],
        intents: [],
        asset: "BTC",
        side: "BUY",
        tradeNotional: 100,
        leverage: 1,
        currentDrawdownPct: 0,
      });

      expect(result.maxAllowedNotional).toBe(500);
      expect(result.approved).toBe(true);
    });
  });

  /**
   * Requirement 3.4: validateAiTradeResponse with malformed JSON / missing fields
   */
  describe("validateAiTradeResponse with malformed inputs", () => {
    it("should return valid:false for null input", () => {
      expect(validateAiTradeResponse(null).valid).toBe(false);
    });

    it("should return valid:false for undefined input", () => {
      expect(validateAiTradeResponse(undefined).valid).toBe(false);
    });

    it("should return valid:false for a primitive string", () => {
      expect(validateAiTradeResponse("not json").valid).toBe(false);
    });

    it("should return valid:false for a number", () => {
      expect(validateAiTradeResponse(42).valid).toBe(false);
    });

    it("should return valid:false for an empty object", () => {
      expect(validateAiTradeResponse({}).valid).toBe(false);
    });

    it("should return valid:false when decision is missing", () => {
      expect(
        validateAiTradeResponse({ validation: { score: 80, comment: "ok" } })
          .valid,
      ).toBe(false);
    });

    it("should return valid:false when validation is missing", () => {
      expect(
        validateAiTradeResponse({
          decision: { side: "BUY", asset: "BTC" },
        }).valid,
      ).toBe(false);
    });

    it("should return valid:false when decision is not an object", () => {
      expect(
        validateAiTradeResponse({
          decision: "BUY",
          validation: { score: 80 },
        }).valid,
      ).toBe(false);
    });

    it("should return valid:false when validation is not an object", () => {
      expect(
        validateAiTradeResponse({
          decision: { side: "BUY" },
          validation: 80,
        }).valid,
      ).toBe(false);
    });

    it("should return valid:false when side is an invalid string", () => {
      expect(
        validateAiTradeResponse({
          decision: { side: "LONG", asset: "BTC" },
          validation: { score: 80, comment: "ok" },
        }).valid,
      ).toBe(false);
    });
  });

  /**
   * Requirement 3.4: validateAiTradeResponse with NaN values
   */
  describe("validateAiTradeResponse with NaN / non-finite values", () => {
    it("should sanitize NaN size to undefined", () => {
      const { valid, sanitized } = validateAiTradeResponse({
        decision: { side: "BUY", asset: "BTC", size: NaN },
        validation: { score: 70, comment: "ok" },
      });

      expect(valid).toBe(true);
      expect(sanitized.decision.size).toBeUndefined();
    });

    it("should sanitize Infinity stopLoss to undefined", () => {
      const { valid, sanitized } = validateAiTradeResponse({
        decision: { side: "SELL", asset: "ETH", stopLoss: Infinity },
        validation: { score: 60, comment: "ok" },
      });

      expect(valid).toBe(true);
      expect(sanitized.decision.stopLoss).toBeUndefined();
    });

    it("should sanitize -Infinity takeProfit to undefined", () => {
      const { valid, sanitized } = validateAiTradeResponse({
        decision: { side: "BUY", asset: "BTC", takeProfit: -Infinity },
        validation: { score: 50, comment: "ok" },
      });

      expect(valid).toBe(true);
      expect(sanitized.decision.takeProfit).toBeUndefined();
    });

    it("should sanitize NaN limitPrice to undefined", () => {
      const { valid, sanitized } = validateAiTradeResponse({
        decision: {
          side: "BUY",
          asset: "BTC",
          orderType: "LIMIT",
          limitPrice: NaN,
        },
        validation: { score: 50, comment: "ok" },
      });

      expect(valid).toBe(true);
      expect(sanitized.decision.limitPrice).toBeUndefined();
    });

    it("should default validation score to 50 when NaN", () => {
      const { valid, sanitized } = validateAiTradeResponse({
        decision: { side: "HOLD", asset: "BTC" },
        validation: { score: NaN, comment: "ok" },
      });

      expect(valid).toBe(true);
      expect(sanitized.validation.score).toBe(50);
    });

    it("should default validation score to 50 when negative", () => {
      const { valid, sanitized } = validateAiTradeResponse({
        decision: { side: "BUY", asset: "ETH" },
        validation: { score: -10, comment: "ok" },
      });

      expect(valid).toBe(true);
      expect(sanitized.validation.score).toBe(50);
    });

    it("should default validation score to 50 when above 100", () => {
      const { valid, sanitized } = validateAiTradeResponse({
        decision: { side: "BUY", asset: "BTC" },
        validation: { score: 150, comment: "ok" },
      });

      expect(valid).toBe(true);
      expect(sanitized.validation.score).toBe(50);
    });

    it("should default asset to BTC when asset is invalid", () => {
      const { valid, sanitized } = validateAiTradeResponse({
        decision: { side: "BUY", asset: "DOGE" },
        validation: { score: 80, comment: "ok" },
      });

      expect(valid).toBe(true);
      expect(sanitized.decision.asset).toBe("BTC");
    });

    it("should default reason when not a string", () => {
      const { valid, sanitized } = validateAiTradeResponse({
        decision: { side: "BUY", asset: "BTC", reason: 12345 },
        validation: { score: 80, comment: "ok" },
      });

      expect(valid).toBe(true);
      expect(sanitized.decision.reason).toBe("No rationale provided.");
    });

    it("should truncate reason to 500 characters", () => {
      const longReason = "x".repeat(600);
      const { valid, sanitized } = validateAiTradeResponse({
        decision: { side: "BUY", asset: "BTC", reason: longReason },
        validation: { score: 80, comment: "ok" },
      });

      expect(valid).toBe(true);
      expect(sanitized.decision.reason.length).toBe(500);
    });

    it("should truncate comment to 300 characters", () => {
      const longComment = "y".repeat(400);
      const { valid, sanitized } = validateAiTradeResponse({
        decision: { side: "BUY", asset: "BTC" },
        validation: { score: 80, comment: longComment },
      });

      expect(valid).toBe(true);
      expect(sanitized.validation.comment.length).toBe(300);
    });
  });

  /**
   * Requirement 3.7: Rate limit behavior at exactly 20 requests
   */
  describe("rate limit behavior at exactly 20 requests", () => {
    it("should allow exactly 20 requests within the window", () => {
      const limiter = createRateLimiter(20, 60_000);
      const now = Date.now();

      for (let i = 0; i < 20; i++) {
        const result = limiter.tryRequest(now + i);
        expect(result.allowed).toBe(true);
      }
    });

    it("should block the 21st request within the same window", () => {
      const limiter = createRateLimiter(20, 60_000);
      const now = Date.now();

      for (let i = 0; i < 20; i++) {
        limiter.tryRequest(now + i);
      }

      const result = limiter.tryRequest(now + 20);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should allow requests again after the window expires", () => {
      const limiter = createRateLimiter(20, 60_000);
      const now = 1000000;

      // Fill the window
      for (let i = 0; i < 20; i++) {
        limiter.tryRequest(now + i);
      }

      // 21st within window — blocked
      expect(limiter.tryRequest(now + 100).allowed).toBe(false);

      // After window expires — allowed again
      const afterWindow = now + 60_001;
      const result = limiter.tryRequest(afterWindow);
      expect(result.allowed).toBe(true);
    });

    it("should report correct remaining count", () => {
      const limiter = createRateLimiter(20, 60_000);
      const now = Date.now();

      const first = limiter.tryRequest(now);
      expect(first.allowed).toBe(true);
      expect(first.remaining).toBe(19);

      // Fill to 19
      for (let i = 1; i < 19; i++) {
        limiter.tryRequest(now + i);
      }

      const twentieth = limiter.tryRequest(now + 19);
      expect(twentieth.allowed).toBe(true);
      expect(twentieth.remaining).toBe(0);
    });
  });

  /**
   * Requirement 6.2: Additional risk router edge cases
   */
  describe("risk router additional edge cases", () => {
    it("should BLOCK trades on non-whitelisted assets", () => {
      const result = getRiskRouterDecision(buildRiskParams({ asset: "DOGE" }));

      expect(result.approved).toBe(false);
      expect(result.code).toBe("ASSET_NOT_ALLOWED");
    });

    it("should BLOCK trades exceeding leverage cap", () => {
      const result = getRiskRouterDecision(buildRiskParams({ leverage: 5 }));

      expect(result.approved).toBe(false);
      expect(result.code).toBe("LEVERAGE_CAP");
    });

    it("should BLOCK when max open positions reached", () => {
      const positions: TradeIntent[] = [
        { agentId: "a", side: "BUY", asset: "BTC", size: 100, timestamp: 1 },
        { agentId: "a", side: "BUY", asset: "ETH", size: 100, timestamp: 2 },
      ];

      const result = getRiskRouterDecision(
        buildRiskParams({
          activePositions: positions,
          asset: "BTC",
          side: "SELL",
        }),
      );

      expect(result.approved).toBe(false);
      expect(result.code).toBe("MAX_OPEN_POSITIONS");
    });

    it("should BLOCK when kill switch drawdown threshold is reached", () => {
      const result = getRiskRouterDecision(
        buildRiskParams({ currentDrawdownPct: 15 }),
      );

      expect(result.approved).toBe(false);
      expect(result.code).toBe("KILL_SWITCH");
    });

    it("should BLOCK duplicate exposure on same asset and side", () => {
      const positions: TradeIntent[] = [
        { agentId: "a", side: "BUY", asset: "BTC", size: 100, timestamp: 1 },
      ];

      const result = getRiskRouterDecision(
        buildRiskParams({
          activePositions: positions,
          asset: "BTC",
          side: "BUY",
        }),
      );

      expect(result.approved).toBe(false);
      expect(result.code).toBe("DUPLICATE_EXPOSURE");
    });

    it("should APPROVE when all conditions are met", () => {
      const result = getRiskRouterDecision(buildRiskParams());

      expect(result.approved).toBe(true);
      expect(result.code).toBe("APPROVED");
    });
  });
});
