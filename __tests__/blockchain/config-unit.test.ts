/**
 * Unit tests for config module
 *
 * Validates: Requirements 1.4, 1.5, 1.6
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { CONFIG } from "@/src/lib/config";

describe("config module", () => {
  describe("CHAIN_ID", () => {
    it("should equal 84532 (Base Sepolia)", () => {
      expect(CONFIG.CHAIN_ID).toBe(84532);
    });
  });

  describe("CONFIG shape", () => {
    it("should have all expected top-level keys", () => {
      expect(CONFIG).toHaveProperty("CHAIN_ID");
      expect(CONFIG).toHaveProperty("RPC_URL");
      expect(CONFIG).toHaveProperty("REGISTRIES");
    });

    it("should have all expected REGISTRIES keys", () => {
      const expectedKeys = [
        "IDENTITY",
        "REPUTATION",
        "VALIDATION",
        "RISK_ROUTER",
        "VAULT",
        "CAPITAL_VAULT",
      ];
      for (const key of expectedKeys) {
        expect(CONFIG.REGISTRIES).toHaveProperty(key);
      }
    });

    it("should have string values for all REGISTRIES entries", () => {
      for (const value of Object.values(CONFIG.REGISTRIES)) {
        expect(typeof value).toBe("string");
      }
    });
  });

  describe("source file cleanliness", () => {
    const source = readFileSync(
      resolve(__dirname, "../../src/lib/config.ts"),
      "utf-8",
    );

    it("should not contain import.meta.env references", () => {
      expect(source).not.toMatch(/import\.meta\.env/);
    });

    it("should not contain VITE_ prefixed variable references", () => {
      expect(source).not.toMatch(/VITE_/);
    });
  });
});
