// Unit tests for the router trade count computation logic in AgentDetail.tsx
// Covers the useMemo that computes routerBlockedTrades, routerFilledTrades, routerClosedTrades
// with the grid bot branch (uses GridRuntimeState) and the intent-based branch.

import { describe, it, expect } from "vitest";
import type { TradeIntent, GridRuntimeState } from "@/src/lib/types";

// ── Helpers ──

function makeIntent(overrides: Partial<TradeIntent> = {}): TradeIntent {
  return {
    agentId: "agent-1",
    side: "BUY",
    asset: "BTC",
    size: 0.1,
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeGridRuntime(
  overrides: Partial<GridRuntimeState> = {},
): GridRuntimeState {
  return {
    agentId: "agent-1",
    mode: "spot_grid_bot",
    status: "active",
    asset: "BTC",
    referencePrice: 60000,
    rangeLow: 55000,
    rangeHigh: 65000,
    gridLevels: 10,
    gridSpacingPct: 1,
    capitalReserved: 5000,
    availableQuote: 2500,
    heldBase: 0.05,
    filledGridLegs: 0,
    cumulativeGridProfit: 0,
    levels: [],
    lastRebuildAt: Date.now(),
    updatedAt: Date.now(),
    configMode: "ai",
    totalInvestment: 5000,
    previouslyWithdrawn: 0,
    profitableTradesCount: 0,
    totalTradesCount: 0,
    configHistory: [],
    startedAt: Date.now(),
    ...overrides,
  };
}

/**
 * Pure extraction of the router trade count logic from AgentDetail's useMemo.
 * Grid bot path uses GridRuntimeState stats; intent path filters by riskCheck/execution status.
 */
function computeRouterCounts(
  intents: TradeIntent[],
  isSpotGridBot: boolean,
  gridRuntime: GridRuntimeState | null,
): {
  routerBlockedTrades: number;
  routerFilledTrades: number;
  routerClosedTrades: number;
} {
  if (isSpotGridBot && gridRuntime) {
    const filled = gridRuntime.filledGridLegs || 0;
    const profitable = gridRuntime.profitableTradesCount || 0;
    return {
      routerBlockedTrades: 0,
      routerFilledTrades: filled,
      routerClosedTrades: profitable,
    };
  }
  return {
    routerBlockedTrades: intents.filter(
      (i) => i.riskCheck?.status === "BLOCKED",
    ).length,
    routerFilledTrades: Math.max(
      0,
      intents.filter((i) => i.execution?.status === "FILLED").length -
        intents.filter((i) => i.execution?.status === "CLOSED").length,
    ),
    routerClosedTrades: intents.filter((i) => i.execution?.status === "CLOSED")
      .length,
  };
}

// ── Grid bot path ──

describe("AgentDetail router trade counts", () => {
  describe("grid bot path", () => {
    it("should use gridRuntime stats when isSpotGridBot and gridRuntime exist", () => {
      const runtime = makeGridRuntime({
        filledGridLegs: 7,
        profitableTradesCount: 3,
        totalTradesCount: 10,
      });
      const result = computeRouterCounts([], true, runtime);
      expect(result).toEqual({
        routerBlockedTrades: 0,
        routerFilledTrades: 7,
        routerClosedTrades: 3,
      });
    });

    it("should default to 0 when gridRuntime fields are falsy", () => {
      const runtime = makeGridRuntime({
        filledGridLegs: 0,
        profitableTradesCount: 0,
        totalTradesCount: 0,
      });
      const result = computeRouterCounts([], true, runtime);
      expect(result).toEqual({
        routerBlockedTrades: 0,
        routerFilledTrades: 0,
        routerClosedTrades: 0,
      });
    });

    it("should ignore intents entirely when on grid bot path", () => {
      const intents = [
        makeIntent({
          riskCheck: {
            status: "BLOCKED",
            score: 50,
            comment: "blocked",
            route: "RISK_ROUTER",
          },
        }),
        makeIntent({
          execution: {
            status: "FILLED",
            venue: "FORGE_SANDBOX",
            mode: "SPOT",
            settlement: "OPEN_POSITION",
          },
        }),
      ];
      const runtime = makeGridRuntime({
        filledGridLegs: 2,
        profitableTradesCount: 1,
      });
      const result = computeRouterCounts(intents, true, runtime);
      expect(result.routerBlockedTrades).toBe(0);
      expect(result.routerFilledTrades).toBe(2);
      expect(result.routerClosedTrades).toBe(1);
    });

    it("should fall through to intent path when isSpotGridBot but gridRuntime is null", () => {
      const intents = [
        makeIntent({
          execution: {
            status: "FILLED",
            venue: "FORGE_SANDBOX",
            mode: "SPOT",
            settlement: "OPEN_POSITION",
          },
        }),
      ];
      const result = computeRouterCounts(intents, true, null);
      expect(result.routerFilledTrades).toBe(1);
    });
  });

  // ── Intent-based path ──

  describe("intent-based path", () => {
    it("should count BLOCKED intents as routerBlockedTrades", () => {
      const intents = [
        makeIntent({
          riskCheck: {
            status: "BLOCKED",
            score: 40,
            comment: "over limit",
            route: "RISK_ROUTER",
          },
        }),
        makeIntent({
          riskCheck: {
            status: "BLOCKED",
            score: 30,
            comment: "kill switch",
            route: "RISK_ROUTER",
          },
        }),
        makeIntent({
          riskCheck: {
            status: "APPROVED",
            score: 80,
            comment: "ok",
            route: "RISK_ROUTER",
          },
        }),
      ];
      const result = computeRouterCounts(intents, false, null);
      expect(result.routerBlockedTrades).toBe(2);
    });

    it("should compute routerFilledTrades as FILLED minus CLOSED", () => {
      const intents = [
        makeIntent({
          execution: {
            status: "FILLED",
            venue: "FORGE_SANDBOX",
            mode: "SPOT",
            settlement: "OPEN_POSITION",
          },
        }),
        makeIntent({
          execution: {
            status: "FILLED",
            venue: "FORGE_SANDBOX",
            mode: "SPOT",
            settlement: "OPEN_POSITION",
          },
        }),
        makeIntent({
          execution: {
            status: "CLOSED",
            venue: "FORGE_SANDBOX",
            mode: "SPOT",
            settlement: "CLOSE_POSITION",
          },
        }),
      ];
      const result = computeRouterCounts(intents, false, null);
      expect(result.routerFilledTrades).toBe(1); // 2 filled - 1 closed
    });

    it("should never return negative routerFilledTrades", () => {
      const intents = [
        makeIntent({
          execution: {
            status: "CLOSED",
            venue: "FORGE_SANDBOX",
            mode: "SPOT",
            settlement: "CLOSE_POSITION",
          },
        }),
        makeIntent({
          execution: {
            status: "CLOSED",
            venue: "FORGE_SANDBOX",
            mode: "SPOT",
            settlement: "CLOSE_POSITION",
          },
        }),
      ];
      const result = computeRouterCounts(intents, false, null);
      expect(result.routerFilledTrades).toBe(0);
    });

    it("should count CLOSED intents as routerClosedTrades", () => {
      const intents = [
        makeIntent({
          execution: {
            status: "CLOSED",
            venue: "FORGE_SANDBOX",
            mode: "SPOT",
            settlement: "CLOSE_POSITION",
          },
        }),
        makeIntent({
          execution: {
            status: "CLOSED",
            venue: "FORGE_SANDBOX",
            mode: "SPOT",
            settlement: "CLOSE_POSITION",
          },
        }),
        makeIntent({
          execution: {
            status: "FILLED",
            venue: "FORGE_SANDBOX",
            mode: "SPOT",
            settlement: "OPEN_POSITION",
          },
        }),
      ];
      const result = computeRouterCounts(intents, false, null);
      expect(result.routerClosedTrades).toBe(2);
    });

    it("should return all zeros for empty intents", () => {
      const result = computeRouterCounts([], false, null);
      expect(result).toEqual({
        routerBlockedTrades: 0,
        routerFilledTrades: 0,
        routerClosedTrades: 0,
      });
    });

    it("should ignore intents without riskCheck or execution", () => {
      const intents = [makeIntent(), makeIntent(), makeIntent()];
      const result = computeRouterCounts(intents, false, null);
      expect(result).toEqual({
        routerBlockedTrades: 0,
        routerFilledTrades: 0,
        routerClosedTrades: 0,
      });
    });

    it("should not count SAFE_HOLD or APPROVED as blocked", () => {
      const intents = [
        makeIntent({
          riskCheck: {
            status: "SAFE_HOLD",
            score: 70,
            comment: "hold",
            route: "RISK_ROUTER",
          },
        }),
        makeIntent({
          riskCheck: {
            status: "APPROVED",
            score: 85,
            comment: "ok",
            route: "RISK_ROUTER",
          },
        }),
      ];
      const result = computeRouterCounts(intents, false, null);
      expect(result.routerBlockedTrades).toBe(0);
    });
  });
});
