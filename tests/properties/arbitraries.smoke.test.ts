import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  arbAgentStrategyType,
  arbRiskProfile,
  arbAgentIdentity,
  arbTradeIntent,
  arbGridRuntimeState,
  arbGridLevelState,
  arbMarketData,
  arbAgentCheckpoint,
} from "./arbitraries";

describe("Arbitraries smoke test", () => {
  it("generates valid AgentStrategyType values", () => {
    fc.assert(
      fc.property(arbAgentStrategyType, (st) => {
        expect(typeof st).toBe("string");
        expect(st.length).toBeGreaterThan(0);
      }),
      { numRuns: 10 },
    );
  });

  it("generates valid RiskProfile values", () => {
    fc.assert(
      fc.property(arbRiskProfile, (rp) => {
        expect(["conservative", "balanced", "aggressive"]).toContain(rp);
      }),
      { numRuns: 10 },
    );
  });

  it("generates valid AgentIdentity objects", () => {
    fc.assert(
      fc.property(arbAgentIdentity, (agent) => {
        expect(agent.agentId).toBeDefined();
        expect(agent.name.trim().length).toBeGreaterThan(0);
        expect(agent.status).toMatch(/^(active|deactivated)$/);
      }),
      { numRuns: 10 },
    );
  });

  it("generates valid TradeIntent objects", () => {
    fc.assert(
      fc.property(arbTradeIntent, (intent) => {
        expect(intent.size).toBeGreaterThanOrEqual(50);
        expect(intent.side).toMatch(/^(BUY|SELL|HOLD)$/);
      }),
      { numRuns: 10 },
    );
  });

  it("generates valid GridLevelState objects", () => {
    fc.assert(
      fc.property(arbGridLevelState, (level) => {
        expect(level.price).toBeGreaterThan(0);
        expect(level.quantity).toBeGreaterThan(0);
      }),
      { numRuns: 10 },
    );
  });

  it("generates valid GridRuntimeState objects", () => {
    fc.assert(
      fc.property(arbGridRuntimeState, (grid) => {
        expect(grid.levels.length).toBeGreaterThanOrEqual(2);
        expect(grid.gridLevels).toBeGreaterThanOrEqual(2);
      }),
      { numRuns: 5 },
    );
  });

  it("generates valid MarketData objects", () => {
    fc.assert(
      fc.property(arbMarketData, (md) => {
        expect(md.btc.price).toBeGreaterThan(0);
        expect(md.eth.price).toBeGreaterThan(0);
      }),
      { numRuns: 10 },
    );
  });

  it("generates valid AgentCheckpoint objects", () => {
    fc.assert(
      fc.property(arbAgentCheckpoint, (cp) => {
        expect(cp.score).toBeGreaterThanOrEqual(0);
        expect(cp.score).toBeLessThanOrEqual(100);
      }),
      { numRuns: 10 },
    );
  });
});
