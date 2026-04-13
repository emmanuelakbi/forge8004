/**
 * Unit tests for ABI import compatibility
 *
 * Validates: Requirements 6.1, 6.2, 6.3
 */
import { describe, it, expect } from "vitest";

describe("ABI import compatibility", () => {
  describe("AgentRegistryABI.json", () => {
    it("should be importable and be an array", async () => {
      const AgentRegistryABI = (await import("@/src/lib/AgentRegistryABI.json"))
        .default;
      expect(Array.isArray(AgentRegistryABI)).toBe(true);
      expect(AgentRegistryABI.length).toBeGreaterThan(0);
    });

    it("should contain constructor, error, event, and function definitions", async () => {
      const AgentRegistryABI = (await import("@/src/lib/AgentRegistryABI.json"))
        .default;
      const types = AgentRegistryABI.map((entry: any) => entry.type);
      expect(types).toContain("constructor");
      expect(types).toContain("error");
      expect(types).toContain("event");
      expect(types).toContain("function");
    });
  });

  describe("abis.ts exports", () => {
    it("should export IDENTITY_REGISTRY_ABI as a non-empty array", async () => {
      const { IDENTITY_REGISTRY_ABI } = await import("@/src/lib/abis");
      expect(Array.isArray(IDENTITY_REGISTRY_ABI)).toBe(true);
      expect(IDENTITY_REGISTRY_ABI.length).toBeGreaterThan(0);
    });

    it("should export REPUTATION_REGISTRY_ABI as a non-empty array", async () => {
      const { REPUTATION_REGISTRY_ABI } = await import("@/src/lib/abis");
      expect(Array.isArray(REPUTATION_REGISTRY_ABI)).toBe(true);
      expect(REPUTATION_REGISTRY_ABI.length).toBeGreaterThan(0);
    });

    it("should export VALIDATION_REGISTRY_ABI as a non-empty array", async () => {
      const { VALIDATION_REGISTRY_ABI } = await import("@/src/lib/abis");
      expect(Array.isArray(VALIDATION_REGISTRY_ABI)).toBe(true);
      expect(VALIDATION_REGISTRY_ABI.length).toBeGreaterThan(0);
    });
  });
});
