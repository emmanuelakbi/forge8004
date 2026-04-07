// Unit tests for agent creation edge cases
// Validates: Requirements 1.3, 1.4

import { describe, it, expect } from "vitest";
import type {
  AgentStrategyType,
  AgentIdentity,
  AgentReputation,
} from "@/src/lib/types";

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

// ── Validation helper (mirrors what the system enforces per Req 1.4) ──
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

    saveAgent(agent: AgentIdentity, userId: string | null): void {
      // Req 1.3: reject unauthenticated users
      if (!userId || agent.owner !== userId) {
        throw new Error(
          "You can only create agents for the authenticated user.",
        );
      }
      // Req 1.4: validate name and strategy type
      const validation = validateAgentCreation({
        name: agent.name,
        strategyType: agent.strategyType,
      });
      if (!validation.valid) {
        throw new Error(validation.reason);
      }
      agents.set(agent.agentId, { ...agent, createdAt: Date.now() });
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

// ── Helper to build a valid agent identity ────────────────────────
function buildAgent(overrides: Partial<AgentIdentity> = {}): AgentIdentity {
  return {
    agentId: "agent-001",
    owner: "user-123",
    name: "TestAgent",
    description: "",
    strategyType: "momentum",
    riskProfile: "balanced",
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────

describe("[AgentCreation]", () => {
  /**
   * Requirement 1.3: Unauthenticated agent creation rejection
   */
  describe("unauthenticated creation rejection", () => {
    it("should reject creation when userId is null", () => {
      const store = createMockStore();
      const agent = buildAgent();

      expect(() => store.saveAgent(agent, null)).toThrow(
        "You can only create agents for the authenticated user.",
      );
      expect(store.agents.size).toBe(0);
    });

    it("should reject creation when userId is empty string", () => {
      const store = createMockStore();
      const agent = buildAgent();

      expect(() => store.saveAgent(agent, "")).toThrow(
        "You can only create agents for the authenticated user.",
      );
      expect(store.agents.size).toBe(0);
    });

    it("should reject creation when userId does not match agent owner", () => {
      const store = createMockStore();
      const agent = buildAgent({ owner: "user-123" });

      expect(() => store.saveAgent(agent, "different-user")).toThrow(
        "You can only create agents for the authenticated user.",
      );
      expect(store.agents.size).toBe(0);
    });
  });

  /**
   * Requirement 1.4: Agent creation with all 8 valid strategy types
   */
  describe("valid strategy types", () => {
    it.each(VALID_STRATEGY_TYPES)(
      'should accept strategy type "%s"',
      (strategyType) => {
        const store = createMockStore();
        const agent = buildAgent({ strategyType });

        store.saveAgent(agent, "user-123");

        const result = store.getAgentById("agent-001", "user-123");
        expect(result).not.toBeNull();
        expect(result!.identity.strategyType).toBe(strategyType);
      },
    );

    it("should reject an invalid strategy type", () => {
      const store = createMockStore();
      const agent = buildAgent({
        strategyType: "invalid_strategy" as AgentStrategyType,
      });

      expect(() => store.saveAgent(agent, "user-123")).toThrow(
        "Invalid strategy type",
      );
      expect(store.agents.size).toBe(0);
    });

    it("should reject a strategy type with extra whitespace", () => {
      const store = createMockStore();
      const agent = buildAgent({
        strategyType: " momentum " as AgentStrategyType,
      });

      expect(() => store.saveAgent(agent, "user-123")).toThrow(
        "Invalid strategy type",
      );
    });

    it("should reject a strategy type with wrong casing", () => {
      const store = createMockStore();
      const agent = buildAgent({
        strategyType: "Momentum" as AgentStrategyType,
      });

      expect(() => store.saveAgent(agent, "user-123")).toThrow(
        "Invalid strategy type",
      );
    });
  });

  /**
   * Requirement 1.4: Agent creation with boundary name lengths
   */
  describe("boundary name lengths", () => {
    it("should accept a single-character name", () => {
      const store = createMockStore();
      const agent = buildAgent({ name: "A" });

      store.saveAgent(agent, "user-123");

      const result = store.getAgentById("agent-001", "user-123");
      expect(result).not.toBeNull();
      expect(result!.identity.name).toBe("A");
    });

    it("should accept a 64-character name", () => {
      const store = createMockStore();
      const longName = "A".repeat(64);
      const agent = buildAgent({ name: longName });

      store.saveAgent(agent, "user-123");

      const result = store.getAgentById("agent-001", "user-123");
      expect(result).not.toBeNull();
      expect(result!.identity.name).toBe(longName);
    });

    it("should reject an empty name", () => {
      const store = createMockStore();
      const agent = buildAgent({ name: "" });

      expect(() => store.saveAgent(agent, "user-123")).toThrow(
        "Agent name must not be empty or whitespace-only",
      );
      expect(store.agents.size).toBe(0);
    });

    it("should reject a whitespace-only name", () => {
      const store = createMockStore();
      const agent = buildAgent({ name: "   " });

      expect(() => store.saveAgent(agent, "user-123")).toThrow(
        "Agent name must not be empty or whitespace-only",
      );
      expect(store.agents.size).toBe(0);
    });

    it("should reject a tab-only name", () => {
      const store = createMockStore();
      const agent = buildAgent({ name: "\t\t" });

      expect(() => store.saveAgent(agent, "user-123")).toThrow(
        "Agent name must not be empty or whitespace-only",
      );
    });

    it("should reject a newline-only name", () => {
      const store = createMockStore();
      const agent = buildAgent({ name: "\n\r" });

      expect(() => store.saveAgent(agent, "user-123")).toThrow(
        "Agent name must not be empty or whitespace-only",
      );
    });

    it("should accept a name with leading/trailing spaces if it has content", () => {
      const store = createMockStore();
      const agent = buildAgent({ name: "  Agent X  " });

      store.saveAgent(agent, "user-123");

      const result = store.getAgentById("agent-001", "user-123");
      expect(result).not.toBeNull();
      expect(result!.identity.name).toBe("  Agent X  ");
    });
  });
});
