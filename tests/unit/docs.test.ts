// Unit tests for Docs page component
// Validates: default export from src/views/docs/Docs.tsx

import { describe, it, expect } from "vitest";
import Docs from "@/src/views/docs/Docs";

describe("[Docs]", () => {
  describe("exports", () => {
    it("should export Docs as a function component", () => {
      expect(typeof Docs).toBe("function");
    });

    it("should have the name Docs", () => {
      expect(Docs.name).toBe("Docs");
    });

    it("should be a default export (not a named export object)", () => {
      expect(Docs).not.toBeNull();
      expect(Docs).not.toBeUndefined();
    });
  });

  describe("component signature", () => {
    it("should accept zero arguments (no required props)", () => {
      expect(Docs.length).toBe(0);
    });
  });
});
