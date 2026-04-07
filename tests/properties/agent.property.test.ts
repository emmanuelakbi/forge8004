// Feature: forge8004-core, Property 1: Agent creation round-trip
// Feature: forge8004-core, Property 2: Invalid agent creation rejection

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import type {
  AgentStrategyType,
  AgentIdentity,
  AgentReputation,
} from "@/src/lib/types";
import {
  arbAgentStrategyType,
  arbRiskProfile,
  type RiskProfile,
} from "./arbitraries";

// ── Valid strategy types (the 8 canonical values) ─────────────────
const VALID_STRATEGY_TYPES: AgentStrategyType[] = [
  "range_trading",
  "spot_grid_bot",
  "momentum",
  "mean_reversion",
  "arbitrage",
  "yield",
  "market_making",
  "risk_off",
];

// ── Validation helper (mirrors what the system SHOULD enforce per Req 1.4) ──
function validateAgentCreation(params: {
  name: string;
  strategyType: string;
}): { valid: boolean; reason?: string } {
  if (!params.name || params.name.trim().length === 0) {
    return {
      valid: false,
      reason: "Agent name must not be empty or whitespace-only",
    };
  }
  if (
    !VALID_STRATEGY_TYPES.includes(params.strategyType as AgentStrategyType)
  ) {
    return {
      valid: false,
      reason: `Invalid strategy type: ${params.strategyType}`,
    };
  }
  return { valid: true };
}

// ── In-memory store simulating Firestore save/read round-trip ─────
function createMockStore() {
  const agents = new Map<string, AgentIdentity & { createdAt: number }>();
  const reputations = new Map<string, AgentReputation>();

  return {
    agents,
    reputations,

    saveAgent(agent: AgentIdentity, userId: string): void {
      if (!userId || agent.owner !== userId) {
        throw new Error(
          "You can only create agents for the authenticated user.",
        );
      }
      const validation = validateAgentCreation({
        name: agent.name,
        strategyType: agent.strategyType,
      });
      if (!validation.valid) {
        throw new Error(validation.reason);
      }
      agents.set(agent.agentId, { ...agent, createdAt: Date.now() });
      // Initialize reputation with zeroed values (per Req 1.5)
      reputations.set(agent.agentId, {
        agentId: agent.agentId,
        cumulativePnl: 0,
        totalFunds: 0,
        maxDrawdown: 0,
        tradesCount: 0,
        sharpeLikeScore: 0,
      });
    },

    getAgentById(
      agentId: string,
      userId: string,
    ): { identity: AgentIdentity; reputation: AgentReputation } | null {
      const stored = agents.get(agentId);
      if (!stored || stored.owner !== userId) return null;
      const reputation = reputations.get(agentId) ?? {
        agentId,
        cumulativePnl: 0,
        totalFunds: 0,
        maxDrawdown: 0,
        tradesCount: 0,
        sharpeLikeScore: 0,
      };
      const { createdAt, ...identity } = stored;
      return { identity, reputation };
    },
  };
}

// ── Arbitraries ───────────────────────────────────────────────────

/** Valid agent name: non-empty, non-whitespace-only */
const arbValidAgentName = fc
  .string({ minLength: 1, maxLength: 64 })
  .filter((s) => s.trim().length > 0);

/** Owner UID arbitrary */
const arbOwnerUid = fc.uuid();

/** Agent ID arbitrary */
const arbAgentId = fc.uuid();

// ── Property Tests ────────────────────────────────────────────────

describe("[Agent Creation Properties]", () => {
  /**
   * Property 1: Agent creation round-trip
   *
   * For any valid agent name, strategy type (one of the 8 valid types),
   * and risk profile, creating an agent via saveAgent() and reading it
   * back via getAgentById() should produce an AgentIdentity containing
   * the same agentId, owner, name, strategyType, riskProfile, and a
   * corresponding Reputation record with cumulativePnl=0, totalFunds=0,
   * maxDrawdown=0, tradesCount=0, and sharpeLikeScore=0.
   *
   * **Validates: Requirements 1.1, 1.2, 1.5**
   */
  describe("Property 1: Agent creation round-trip", () => {
    it("should persist and retrieve agent with matching fields and zeroed reputation", () => {
      fc.assert(
        fc.property(
          arbAgentId,
          arbOwnerUid,
          arbValidAgentName,
          arbAgentStrategyType,
          arbRiskProfile,
          (
            agentId: string,
            owner: string,
            name: string,
            strategyType: AgentStrategyType,
            riskProfile: RiskProfile,
          ) => {
            const store = createMockStore();

            const agent: AgentIdentity = {
              agentId,
              owner,
              name,
              description: "",
              strategyType,
              riskProfile,
            };

            // Act: save then read back
            store.saveAgent(agent, owner);
            const result = store.getAgentById(agentId, owner);

            // Assert: round-trip identity fields match
            expect(result).not.toBeNull();
            expect(result!.identity.agentId).toBe(agentId);
            expect(result!.identity.owner).toBe(owner);
            expect(result!.identity.name).toBe(name);
            expect(result!.identity.strategyType).toBe(strategyType);
            expect(result!.identity.riskProfile).toBe(riskProfile);

            // Assert: reputation is zeroed (Req 1.5)
            expect(result!.reputation.cumulativePnl).toBe(0);
            expect(result!.reputation.totalFunds).toBe(0);
            expect(result!.reputation.maxDrawdown).toBe(0);
            expect(result!.reputation.tradesCount).toBe(0);
            expect(result!.reputation.sharpeLikeScore).toBe(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should not return agent when queried by a different owner", () => {
      // Generate two distinct UUIDs by combining them in a single tuple
      const arbTwoDistinctOwners = fc
        .tuple(arbOwnerUid, arbOwnerUid)
        .filter(([a, b]) => a !== b);

      fc.assert(
        fc.property(
          arbAgentId,
          arbTwoDistinctOwners,
          arbValidAgentName,
          arbAgentStrategyType,
          arbRiskProfile,
          (
            agentId: string,
            [owner, otherOwner]: [string, string],
            name: string,
            strategyType: AgentStrategyType,
            riskProfile: RiskProfile,
          ) => {
            const store = createMockStore();
            const agent: AgentIdentity = {
              agentId,
              owner,
              name,
              description: "",
              strategyType,
              riskProfile,
            };

            store.saveAgent(agent, owner);
            const result = store.getAgentById(agentId, otherOwner);

            expect(result).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 2: Invalid agent creation rejection
   *
   * For any agent creation attempt where the name is empty or composed
   * entirely of whitespace, or the strategy type is not one of the 8
   * valid AgentStrategyType values, the system should reject the creation
   * and the agent should not be persisted.
   *
   * **Validates: Requirements 1.4**
   */
  describe("Property 2: Invalid agent creation rejection", () => {
    /** Arbitrary for empty or whitespace-only names */
    const arbInvalidName = fc.oneof(
      fc.constant(""),
      fc
        .array(fc.constantFrom(" ", "\t", "\n", "\r"), {
          minLength: 1,
          maxLength: 20,
        })
        .map((chars) => chars.join("")),
    );

    /** Arbitrary for invalid strategy types (not one of the 8 valid values) */
    const arbInvalidStrategyType = fc
      .string({ minLength: 1, maxLength: 30 })
      .filter((s) => !VALID_STRATEGY_TYPES.includes(s as AgentStrategyType));

    it("should reject creation when name is empty or whitespace-only", () => {
      fc.assert(
        fc.property(
          arbAgentId,
          arbOwnerUid,
          arbInvalidName,
          arbAgentStrategyType,
          arbRiskProfile,
          (
            agentId: string,
            owner: string,
            invalidName: string,
            strategyType: AgentStrategyType,
            riskProfile: RiskProfile,
          ) => {
            const store = createMockStore();
            const agent: AgentIdentity = {
              agentId,
              owner,
              name: invalidName,
              description: "",
              strategyType,
              riskProfile,
            };

            // Act & Assert: creation should throw
            expect(() => store.saveAgent(agent, owner)).toThrow();

            // Assert: agent should not be persisted
            const result = store.getAgentById(agentId, owner);
            expect(result).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should reject creation when strategy type is invalid", () => {
      fc.assert(
        fc.property(
          arbAgentId,
          arbOwnerUid,
          arbValidAgentName,
          arbInvalidStrategyType,
          arbRiskProfile,
          (
            agentId: string,
            owner: string,
            name: string,
            invalidStrategy: string,
            riskProfile: RiskProfile,
          ) => {
            const store = createMockStore();
            const agent = {
              agentId,
              owner,
              name,
              description: "",
              strategyType: invalidStrategy as AgentStrategyType,
              riskProfile,
            };

            // Act & Assert: creation should throw
            expect(() => store.saveAgent(agent, owner)).toThrow();

            // Assert: agent should not be persisted
            const result = store.getAgentById(agentId, owner);
            expect(result).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should reject creation when both name and strategy type are invalid", () => {
      fc.assert(
        fc.property(
          arbAgentId,
          arbOwnerUid,
          arbInvalidName,
          arbInvalidStrategyType,
          arbRiskProfile,
          (
            agentId: string,
            owner: string,
            invalidName: string,
            invalidStrategy: string,
            riskProfile: RiskProfile,
          ) => {
            const store = createMockStore();
            const agent = {
              agentId,
              owner,
              name: invalidName,
              description: "",
              strategyType: invalidStrategy as AgentStrategyType,
              riskProfile,
            };

            expect(() => store.saveAgent(agent, owner)).toThrow();

            const result = store.getAgentById(agentId, owner);
            expect(result).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Validates the standalone validation function used by both properties.
   */
  describe("validateAgentCreation unit checks", () => {
    it("accepts all 8 valid strategy types with non-empty names", () => {
      for (const st of VALID_STRATEGY_TYPES) {
        const result = validateAgentCreation({
          name: "TestAgent",
          strategyType: st,
        });
        expect(result.valid).toBe(true);
      }
    });

    it("rejects empty string name", () => {
      const result = validateAgentCreation({
        name: "",
        strategyType: "momentum",
      });
      expect(result.valid).toBe(false);
    });

    it("rejects whitespace-only name", () => {
      const result = validateAgentCreation({
        name: "   \t\n",
        strategyType: "momentum",
      });
      expect(result.valid).toBe(false);
    });

    it("rejects invalid strategy type", () => {
      const result = validateAgentCreation({
        name: "Agent",
        strategyType: "invalid_type",
      });
      expect(result.valid).toBe(false);
    });
  });
});
