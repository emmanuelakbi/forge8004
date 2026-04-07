// @vitest-environment jsdom
// Unit tests for src/pages/agent-detail/useAgentDetail.ts
// Focused on the auth-flow behavior: when auth is ready but no user is present,
// the hook should NOT clear existing state — it should just stop loading.

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// ── Mocks ─────────────────────────────────────────────────────────

// Firebase auth — capture the callback so we can simulate auth state changes
let authCallback: ((user: { uid: string } | null) => void) | null = null;
vi.mock("@/src/data/firebase", () => ({
  subscribeToAuthState: (cb: (user: { uid: string } | null) => void) => {
    authCallback = cb;
    return () => {
      authCallback = null;
    };
  },
}));

// erc8004Client — mock all Firestore operations
const mockGetAgentById = vi.fn().mockResolvedValue(null);
const mockGetActivePositions = vi.fn().mockResolvedValue([]);
const mockGetRuntimeState = vi.fn().mockResolvedValue(null);
const mockGetGridRuntimeState = vi.fn().mockResolvedValue(null);
const mockGetPendingOrders = vi.fn().mockResolvedValue([]);
const mockGetValidations = vi.fn().mockResolvedValue([]);
const mockGetPnlHistory = vi.fn().mockResolvedValue([]);
const mockGetVaultTransactions = vi.fn().mockResolvedValue([]);
const mockGetCheckpoints = vi.fn().mockResolvedValue([]);
const mockGetIntents = vi.fn().mockResolvedValue([]);
const mockGetReputation = vi.fn().mockResolvedValue(null);

// Proxy-based mock: named read mocks are routed explicitly,
// everything else (writes, utility methods) returns a resolved promise.
vi.mock("@/src/data/erc8004Client", () => {
  const fallback = vi.fn().mockResolvedValue(undefined);
  const methodMap: Record<string, (...args: unknown[]) => unknown> = {
    getAgentById: mockGetAgentById,
    getActivePositions: mockGetActivePositions,
    getRuntimeState: mockGetRuntimeState,
    getGridRuntimeState: mockGetGridRuntimeState,
    getPendingOrders: mockGetPendingOrders,
    getValidations: mockGetValidations,
    getValidationHistory: mockGetValidations,
    getPnlHistory: mockGetPnlHistory,
    getPnLHistory: mockGetPnlHistory,
    getVaultTransactions: mockGetVaultTransactions,
    getCheckpoints: mockGetCheckpoints,
    getIntents: mockGetIntents,
    getTradeIntents: mockGetIntents,
    getReputation: mockGetReputation,
  };
  return {
    erc8004Client: new Proxy(
      {},
      {
        get(_t, prop: string) {
          return methodMap[prop] ?? fallback;
        },
      },
    ),
  };
});

// Market service
vi.mock("@/src/services/marketService", () => ({
  marketService: {
    getLatestPrices: vi.fn().mockResolvedValue({
      BTC: { price: 60000, change24h: 1.5 },
      ETH: { price: 3000, change24h: -0.5 },
    }),
  },
  MarketData: {},
}));

// AI service
vi.mock("@/src/services/aiService", () => ({
  aiService: {
    getQuotaStatus: vi.fn().mockReturnValue({
      isExhausted: false,
      remaining: 20,
      resetAt: null,
    }),
    runAutonomousCycle: vi.fn().mockResolvedValue(undefined),
  },
}));

// Groq service
vi.mock("@/src/services/groqService", () => ({
  groqService: {
    checkConfig: vi.fn().mockResolvedValue(true),
    getMarketSentiment: vi.fn().mockResolvedValue("Neutral"),
  },
}));

// Config
vi.mock("@/src/lib/config", () => ({
  CONFIG: {
    contractAddress: "0x0000000000000000000000000000000000000000",
    rpcUrl: "https://sepolia.base.org",
    chainId: 84532,
  },
}));

// Trust artifacts — re-export all pure functions
vi.mock("@/src/services/trustArtifacts", async () => {
  const actual = await vi.importActual<
    typeof import("@/src/services/trustArtifacts")
  >("@/src/services/trustArtifacts");
  return { ...actual };
});

// Wallet service
vi.mock("@/src/services/wallet", () => ({
  getConnectedWalletAddress: vi.fn().mockResolvedValue(null),
  signTradeIntentWithAvailableWallet: vi.fn().mockResolvedValue(null),
  disconnectWallet: vi.fn(),
  onWalletChange: vi.fn().mockReturnValue(() => {}),
}));

// Grid bot service — re-export pure functions
vi.mock("@/src/services/gridBotService", async () => {
  const actual = await vi.importActual<
    typeof import("@/src/services/gridBotService")
  >("@/src/services/gridBotService");
  return { ...actual };
});

// On-chain service
vi.mock("@/src/services/onChainService", () => ({
  onChainService: {
    getOnChainTokenId: vi.fn().mockResolvedValue(null),
    registerAgent: vi.fn().mockResolvedValue(undefined),
  },
}));

// External validator
vi.mock("@/src/services/externalValidator", () => ({
  externalValidate: vi.fn().mockResolvedValue({ score: 80, comment: "OK" }),
}));

// Page-level utils — re-export actual
vi.mock("@/src/pages/agent-detail/utils", async () => {
  const actual = await vi.importActual<
    typeof import("@/src/pages/agent-detail/utils")
  >("@/src/pages/agent-detail/utils");
  return { ...actual };
});

// ── Import under test (after mocks) ──────────────────────────────

import { useAgentDetail } from "@/src/pages/agent-detail/useAgentDetail";

// ── Helpers ───────────────────────────────────────────────────────

function wrapper({ children }: { children: ReactNode }) {
  return createElement(
    MemoryRouter,
    { initialEntries: ["/agents/test-agent-123"] },
    createElement(
      Routes,
      null,
      createElement(Route, {
        path: "/agents/:agentId",
        element: children,
      }),
    ),
  );
}

const MOCK_AGENT = {
  id: "test-agent-123",
  name: "Test Agent",
  strategy: "range_trading",
  status: "active",
  reputation: {
    totalFunds: 10000,
    pnl: 500,
    sharpe: 1.2,
    maxDrawdown: 5,
    tradeCount: 42,
  },
};

// ── Tests ─────────────────────────────────────────────────────────

describe("[useAgentDetail]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authCallback = null;
  });

  describe("initial state", () => {
    it("should start with loading=true and null agent", () => {
      const { result } = renderHook(() => useAgentDetail(), { wrapper });
      expect(result.current.loading).toBe(true);
      expect(result.current.agent).toBeNull();
      expect(result.current.authReady).toBe(false);
    });

    it("should have empty arrays for collections", () => {
      const { result } = renderHook(() => useAgentDetail(), { wrapper });
      expect(result.current.validations).toEqual([]);
      expect(result.current.intents).toEqual([]);
      expect(result.current.pnlData).toEqual([]);
      expect(result.current.vaultTransactions).toEqual([]);
      expect(result.current.checkpoints).toEqual([]);
      expect(result.current.activePositions).toEqual([]);
    });

    it("should resolve agentId from route params", () => {
      const { result } = renderHook(() => useAgentDetail(), { wrapper });
      expect(result.current.agentId).toBe("test-agent-123");
    });
  });

  describe("auth flow — no user (changed behavior)", () => {
    it("should set loading=false when auth is ready but user is null", async () => {
      const { result } = renderHook(() => useAgentDetail(), { wrapper });

      // Simulate auth ready with no user
      act(() => {
        authCallback?.(null);
      });

      await waitFor(() => {
        expect(result.current.authReady).toBe(true);
        expect(result.current.user).toBeNull();
        expect(result.current.loading).toBe(false);
      });
    });

    it("should NOT call any Firestore fetch when user is null", async () => {
      renderHook(() => useAgentDetail(), { wrapper });

      act(() => {
        authCallback?.(null);
      });

      // Give effects time to settle
      await waitFor(() => {
        expect(mockGetAgentById).not.toHaveBeenCalled();
        expect(mockGetActivePositions).not.toHaveBeenCalled();
        expect(mockGetRuntimeState).not.toHaveBeenCalled();
        expect(mockGetGridRuntimeState).not.toHaveBeenCalled();
      });
    });

    it("should preserve existing state when user becomes null (not clear it)", async () => {
      mockGetAgentById.mockResolvedValueOnce(MOCK_AGENT);

      const { result } = renderHook(() => useAgentDetail(), { wrapper });

      // First: sign in with a user so data loads
      act(() => {
        authCallback?.({ uid: "user-1" });
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      // Now simulate user signing out (auth ready, user null)
      // The key behavioral change: state should NOT be cleared
      act(() => {
        authCallback?.(null);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Agent state should still be present (not cleared to null)
      // This is the core behavior change from the diff
      expect(result.current.agent).not.toBeNull();
    });
  });

  describe("auth flow — with user", () => {
    it("should fetch agent data when auth is ready and user is present", async () => {
      mockGetAgentById.mockResolvedValueOnce(MOCK_AGENT);

      const { result } = renderHook(() => useAgentDetail(), { wrapper });

      act(() => {
        authCallback?.({ uid: "user-1" });
      });

      await waitFor(() => {
        expect(result.current.authReady).toBe(true);
        expect(result.current.user).toEqual({ uid: "user-1" });
      });

      await waitFor(() => {
        expect(mockGetAgentById).toHaveBeenCalledWith("test-agent-123");
      });
    });

    it("should set loading=false after data fetch completes", async () => {
      mockGetAgentById.mockResolvedValueOnce(MOCK_AGENT);

      const { result } = renderHook(() => useAgentDetail(), { wrapper });

      act(() => {
        authCallback?.({ uid: "user-1" });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it("should set loadError when fetch throws", async () => {
      mockGetAgentById.mockRejectedValueOnce(new Error("Firestore down"));

      const { result } = renderHook(() => useAgentDetail(), { wrapper });

      act(() => {
        authCallback?.({ uid: "user-1" });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.loadError).toBeTruthy();
      });
    });
  });

  describe("auth subscription lifecycle", () => {
    it("should subscribe to auth state on mount", () => {
      renderHook(() => useAgentDetail(), { wrapper });
      expect(authCallback).not.toBeNull();
    });

    it("should unsubscribe from auth state on unmount", () => {
      const { unmount } = renderHook(() => useAgentDetail(), { wrapper });
      expect(authCallback).not.toBeNull();
      unmount();
      expect(authCallback).toBeNull();
    });
  });

  describe("re-exported utilities", () => {
    it("should expose buildTrustTimeline function", () => {
      const { result } = renderHook(() => useAgentDetail(), { wrapper });
      expect(typeof result.current.buildTrustTimeline).toBe("function");
    });

    it("should expose capital and risk functions", () => {
      const { result } = renderHook(() => useAgentDetail(), { wrapper });
      expect(typeof result.current.getCommittedCapital).toBe("function");
      expect(typeof result.current.getRiskPolicy).toBe("function");
      expect(typeof result.current.getExecutionProfile).toBe("function");
      expect(typeof result.current.getDailyRealizedLoss).toBe("function");
      expect(typeof result.current.getDailyRealizedProfit).toBe("function");
      expect(typeof result.current.getAllTimeRealizedProfit).toBe("function");
      expect(typeof result.current.getAllTimeRealizedLoss).toBe("function");
      expect(typeof result.current.getAllTimeNetRealizedPnl).toBe("function");
    });

    it("should expose grid utility functions", () => {
      const { result } = renderHook(() => useAgentDetail(), { wrapper });
      expect(typeof result.current.getMaxWithdrawable).toBe("function");
      expect(typeof result.current.getGridEquity).toBe("function");
      expect(typeof result.current.getGridPnL).toBe("function");
      expect(typeof result.current.getGridPnLPct).toBe("function");
      expect(typeof result.current.getGridAPR).toBe("function");
      expect(typeof result.current.getTotalAPR).toBe("function");
      expect(typeof result.current.getProfitPerGrid).toBe("function");
      expect(typeof result.current.getGridPriceForAsset).toBe("function");
    });
  });
});
