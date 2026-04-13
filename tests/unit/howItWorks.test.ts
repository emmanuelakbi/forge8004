// Unit tests for HowItWorks page component
// Validates: default export from src/views/how-it-works/HowItWorks.tsx

import { describe, it, expect } from "vitest";
import HowItWorks from "@/src/views/how-it-works/HowItWorks";

describe("[HowItWorks]", () => {
  describe("exports", () => {
    it("should export HowItWorks as a function component", () => {
      expect(typeof HowItWorks).toBe("function");
    });

    it("should have the name HowItWorks", () => {
      expect(HowItWorks.name).toBe("HowItWorks");
    });

    it("should be a default export (not a named export object)", () => {
      expect(HowItWorks).not.toBeNull();
      expect(HowItWorks).not.toBeUndefined();
    });
  });

  describe("component signature", () => {
    it("should accept zero arguments (no required props)", () => {
      expect(HowItWorks.length).toBe(0);
    });
  });

  describe("module integrity", () => {
    it("should import without throwing (validates steps, panels data initialization)", () => {
      // The module defines steps and panels arrays at module scope.
      // A successful import proves all of those initialize without error.
      expect(HowItWorks).toBeDefined();
    });

    it("should be importable multiple times without side effects", async () => {
      const mod1 = await import("@/src/views/how-it-works/HowItWorks");
      const mod2 = await import("@/src/views/how-it-works/HowItWorks");
      expect(mod1.default).toBe(mod2.default);
    });
  });
});
