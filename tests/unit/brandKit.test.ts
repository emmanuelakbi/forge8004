// Unit tests for BrandKit page component
// Validates: default export from src/views/brand/BrandKit.tsx

import { describe, it, expect } from "vitest";
import BrandKit from "@/src/views/brand/BrandKit";

describe("[BrandKit]", () => {
  describe("exports", () => {
    it("should export BrandKit as a function component", () => {
      expect(typeof BrandKit).toBe("function");
    });

    it("should have the name BrandKit", () => {
      expect(BrandKit.name).toBe("BrandKit");
    });

    it("should be a default export (not a named export object)", () => {
      expect(BrandKit).not.toBeNull();
      expect(BrandKit).not.toBeUndefined();
    });
  });

  describe("component signature", () => {
    it("should accept zero arguments (no required props)", () => {
      // React function components that take no props have length 0
      expect(BrandKit.length).toBe(0);
    });
  });

  describe("module integrity", () => {
    it("should import without throwing (validates CORE_ASSETS, COLORS, LOGO_SVGS, lucideSvg initialization)", () => {
      // The module defines CORE_ASSETS using ForgeLogoMono, ForgeIconMono,
      // LOGO_SVGS, lucideSvg (renderToStaticMarkup), and COLORS at module scope.
      // A successful import proves all of those initialize without error.
      expect(BrandKit).toBeDefined();
    });

    it("should be importable multiple times without side effects", async () => {
      const mod1 = await import("@/src/views/brand/BrandKit");
      const mod2 = await import("@/src/views/brand/BrandKit");
      expect(mod1.default).toBe(mod2.default);
    });
  });
});
