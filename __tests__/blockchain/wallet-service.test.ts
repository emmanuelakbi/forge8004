/**
 * Unit tests for wallet service SSR safety and error conditions
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.5, 3.8, 3.9, 5.7
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("wallet service", () => {
  describe("'use client' directive", () => {
    it("should have 'use client' as the first statement in the file", () => {
      const source = readFileSync(
        resolve(__dirname, "../../src/services/wallet.ts"),
        "utf-8",
      );
      const trimmed = source.trimStart();
      expect(trimmed.startsWith('"use client"')).toBe(true);
    });
  });

  describe("SSR safety (no window)", () => {
    it("getStoredWalletAddress() should return null during SSR", async () => {
      vi.resetModules();
      // In vitest default (node) env, window is undefined — this IS SSR
      const { getStoredWalletAddress } = await import("@/src/services/wallet");
      expect(getStoredWalletAddress()).toBeNull();
    });

    it("disconnectWallet() should not throw during SSR", async () => {
      vi.resetModules();
      const { disconnectWallet } = await import("@/src/services/wallet");
      await expect(disconnectWallet()).resolves.not.toThrow();
    });

    it("onWalletChange() should return a no-op function during SSR", async () => {
      vi.resetModules();
      const { onWalletChange } = await import("@/src/services/wallet");
      const listener = vi.fn();
      const unsubscribe = onWalletChange(listener);

      expect(typeof unsubscribe).toBe("function");
      // Calling the unsubscribe should not throw
      expect(() => unsubscribe()).not.toThrow();
      // Listener should never have been called
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("error conditions", () => {
    let originalWindow: any;

    beforeEach(() => {
      originalWindow = (globalThis as any).window;
    });

    afterEach(() => {
      if (originalWindow === undefined) {
        delete (globalThis as any).window;
      } else {
        (globalThis as any).window = originalWindow;
      }
      delete (globalThis as any).localStorage;
      vi.restoreAllMocks();
    });

    it("connectWallet() should throw WALLET_UNAVAILABLE when no provider", async () => {
      // Set up window WITHOUT ethereum provider
      const localStorageStore: Record<string, string> = {};
      (globalThis as any).window = {
        localStorage: {
          getItem: (key: string) => localStorageStore[key] ?? null,
          setItem: (key: string, value: string) => {
            localStorageStore[key] = value;
          },
          removeItem: (key: string) => {
            delete localStorageStore[key];
          },
        },
        dispatchEvent: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        CustomEvent: globalThis.CustomEvent,
        // No ethereum property — wallet unavailable
      };
      (globalThis as any).localStorage = (
        globalThis as any
      ).window.localStorage;

      vi.resetModules();
      const { connectWallet } = await import("@/src/services/wallet");

      await expect(connectWallet()).rejects.toThrow("WALLET_UNAVAILABLE");
    });

    it("signTradeIntentWithAvailableWallet should throw WALLET_NOT_CONNECTED when no wallet connected", async () => {
      // Set up window WITH ethereum provider but no connected accounts
      // and no stored address in localStorage
      const localStorageStore: Record<string, string> = {};
      const mockEthereum = {
        request: vi.fn().mockImplementation(async (args: any) => {
          if (args.method === "eth_accounts") {
            return []; // No connected accounts
          }
          if (args.method === "eth_requestAccounts") {
            return [];
          }
          return [];
        }),
      };

      (globalThis as any).window = {
        ethereum: mockEthereum,
        localStorage: {
          getItem: (key: string) => localStorageStore[key] ?? null,
          setItem: (key: string, value: string) => {
            localStorageStore[key] = value;
          },
          removeItem: (key: string) => {
            delete localStorageStore[key];
          },
        },
        dispatchEvent: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        CustomEvent: globalThis.CustomEvent,
      };
      (globalThis as any).localStorage = (
        globalThis as any
      ).window.localStorage;

      vi.resetModules();
      const { signTradeIntentWithAvailableWallet } =
        await import("@/src/services/wallet");

      const identity = {
        agentId: "agent-1",
        owner: "user-1",
        name: "TestAgent",
        description: "Test",
        strategyType: "momentum" as const,
        riskProfile: "balanced" as const,
      };

      const intent = {
        agentId: "agent-1",
        side: "BUY" as const,
        asset: "ETH",
        size: 1.5,
        timestamp: Date.now(),
      };

      await expect(
        signTradeIntentWithAvailableWallet(identity, intent),
      ).rejects.toThrow("WALLET_NOT_CONNECTED");
    });
  });

  describe("public API surface", () => {
    it("should export all expected functions", async () => {
      vi.resetModules();
      const walletModule = await import("@/src/services/wallet");

      const expectedExports = [
        "connectWallet",
        "disconnectWallet",
        "getConnectedWalletAddress",
        "getStoredWalletAddress",
        "onWalletChange",
        "selectWalletProvider",
        "clearSelectedProvider",
        "signTradeIntentWithWallet",
        "signTradeIntentWithAvailableWallet",
      ];

      for (const name of expectedExports) {
        expect(walletModule).toHaveProperty(name);
        expect(typeof (walletModule as any)[name]).toBe("function");
      }
    });
  });
});
