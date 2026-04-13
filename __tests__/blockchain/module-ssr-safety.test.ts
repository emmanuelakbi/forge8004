/**
 * Unit tests for module-level SSR safety.
 *
 * Verifies that all "use client" modules can be imported in a Node.js
 * environment (where `window` is undefined) without throwing errors.
 * This proves there is no browser API access at module evaluation time.
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4
 */
import { describe, it, expect, vi } from "vitest";

describe("Module-level SSR safety", () => {
  describe("onChainService.ts (Requirement 7.1)", () => {
    it("should import without throwing when window is undefined", async () => {
      vi.resetModules();
      // vitest runs in node env — window is NOT defined
      expect(typeof globalThis.window).toBe("undefined");
      const mod = await import("@/src/services/onChainService");
      expect(mod).toBeDefined();
      expect(mod.onChainService).toBeDefined();
    });

    it("should export the expected public API", async () => {
      vi.resetModules();
      const { onChainService } = await import("@/src/services/onChainService");
      const expectedMethods = [
        "isAvailable",
        "registerAgent",
        "anchorCheckpoint",
        "getAgentMeta",
        "getCheckpointAnchor",
        "getTokenIdForAgent",
      ];
      for (const method of expectedMethods) {
        expect(typeof (onChainService as any)[method]).toBe("function");
      }
    });
  });

  describe("wallet.ts (Requirement 7.2)", () => {
    it("should import without throwing when window is undefined", async () => {
      vi.resetModules();
      expect(typeof globalThis.window).toBe("undefined");
      const mod = await import("@/src/services/wallet");
      expect(mod).toBeDefined();
    });

    it("should export the expected public API", async () => {
      vi.resetModules();
      const mod = await import("@/src/services/wallet");
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
        expect(mod).toHaveProperty(name);
        expect(typeof (mod as any)[name]).toBe("function");
      }
    });
  });

  describe("walletProviders.ts (Requirement 7.3)", () => {
    it("should import without throwing when window is undefined", async () => {
      vi.resetModules();
      expect(typeof globalThis.window).toBe("undefined");
      const mod = await import("@/src/services/walletProviders");
      expect(mod).toBeDefined();
    });

    it("should export the expected public API", async () => {
      vi.resetModules();
      const mod = await import("@/src/services/walletProviders");
      const expectedExports = [
        "startWalletDiscovery",
        "getAvailableWallets",
        "hasMultipleWallets",
        "findWalletByUuid",
      ];
      for (const name of expectedExports) {
        expect(mod).toHaveProperty(name);
        expect(typeof (mod as any)[name]).toBe("function");
      }
    });
  });

  describe("config.ts (Requirement 7.4)", () => {
    it("should import without throwing when window is undefined", async () => {
      vi.resetModules();
      expect(typeof globalThis.window).toBe("undefined");
      const mod = await import("@/src/lib/config");
      expect(mod).toBeDefined();
      expect(mod.CONFIG).toBeDefined();
    });

    it("should export CONFIG with the expected shape", async () => {
      vi.resetModules();
      const { CONFIG } = await import("@/src/lib/config");
      expect(CONFIG).toHaveProperty("CHAIN_ID");
      expect(CONFIG).toHaveProperty("RPC_URL");
      expect(CONFIG).toHaveProperty("REGISTRIES");
      expect(CONFIG.REGISTRIES).toHaveProperty("IDENTITY");
      expect(CONFIG.REGISTRIES).toHaveProperty("REPUTATION");
      expect(CONFIG.REGISTRIES).toHaveProperty("VALIDATION");
      expect(CONFIG.REGISTRIES).toHaveProperty("RISK_ROUTER");
      expect(CONFIG.REGISTRIES).toHaveProperty("VAULT");
      expect(CONFIG.REGISTRIES).toHaveProperty("CAPITAL_VAULT");
    });
  });
});
