/**
 * Unit tests for walletProviders SSR safety
 *
 * Validates: Requirements 4.1, 4.4, 4.8
 */
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("walletProviders", () => {
  describe("'use client' directive", () => {
    it("should have 'use client' as the first statement in the file", () => {
      const source = readFileSync(
        resolve(__dirname, "../../src/services/walletProviders.ts"),
        "utf-8",
      );
      const trimmed = source.trimStart();
      expect(trimmed.startsWith('"use client"')).toBe(true);
    });
  });

  describe("SSR safety (no window)", () => {
    // In vitest default (node) env, window is undefined — this IS the SSR scenario

    it("getAvailableWallets() should return [] during SSR", async () => {
      vi.resetModules();
      const { getAvailableWallets } =
        await import("@/src/services/walletProviders");
      expect(getAvailableWallets()).toEqual([]);
    });

    it("startWalletDiscovery() should return without error during SSR", async () => {
      vi.resetModules();
      const { startWalletDiscovery } =
        await import("@/src/services/walletProviders");
      expect(() => startWalletDiscovery()).not.toThrow();
    });

    it("hasMultipleWallets() should return false during SSR", async () => {
      vi.resetModules();
      const { hasMultipleWallets } =
        await import("@/src/services/walletProviders");
      expect(hasMultipleWallets()).toBe(false);
    });

    it("findWalletByUuid() should return undefined during SSR", async () => {
      vi.resetModules();
      const { findWalletByUuid } =
        await import("@/src/services/walletProviders");
      expect(findWalletByUuid("some-uuid")).toBeUndefined();
    });
  });

  describe("public API surface", () => {
    it("should export all expected functions", async () => {
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
});
