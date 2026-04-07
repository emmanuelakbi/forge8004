// Unit tests for brand Logo components
// Validates: all exports from src/components/brand/Logo.tsx

import { describe, it, expect } from "vitest";
import {
  ForgeLogo,
  ForgeIcon,
  ForgeLogoMono,
  ForgeIconMono,
  SentinelLogo,
  SentinelIcon,
} from "@/src/components/brand/Logo";

describe("[Logo]", () => {
  describe("exports", () => {
    it("should export ForgeLogo as a function component", () => {
      expect(typeof ForgeLogo).toBe("function");
    });

    it("should export ForgeIcon as a function component", () => {
      expect(typeof ForgeIcon).toBe("function");
    });

    it("should export SentinelLogo as an alias for ForgeLogo", () => {
      expect(SentinelLogo).toBe(ForgeLogo);
    });

    it("should export SentinelIcon as an alias for ForgeIcon", () => {
      expect(SentinelIcon).toBe(ForgeIcon);
    });

    it("should export ForgeLogoMono as a function component", () => {
      expect(typeof ForgeLogoMono).toBe("function");
    });

    it("should export ForgeIconMono as a function component", () => {
      expect(typeof ForgeIconMono).toBe("function");
    });
  });

  describe("ForgeLogo", () => {
    it("should return an SVG element with default className", () => {
      const result = ForgeLogo({});
      expect(result.type).toBe("svg");
      expect(result.props.className).toBe("w-10 h-10");
    });

    it("should accept a custom className", () => {
      const result = ForgeLogo({ className: "w-20 h-20" });
      expect(result.props.className).toBe("w-20 h-20");
    });

    it("should accept a custom style object", () => {
      const style = { opacity: 0.5 };
      const result = ForgeLogo({ style });
      expect(result.props.style).toEqual({ opacity: 0.5 });
    });

    it("should use viewBox 0 0 256 256", () => {
      const result = ForgeLogo({});
      expect(result.props.viewBox).toBe("0 0 256 256");
    });

    it("should contain child path elements", () => {
      const result = ForgeLogo({});
      expect(result.props.children).toBeDefined();
      expect(Array.isArray(result.props.children)).toBe(true);
      expect(result.props.children.length).toBeGreaterThan(0);
    });
  });

  describe("ForgeIcon", () => {
    it("should return an SVG element with default className", () => {
      const result = ForgeIcon({});
      expect(result.type).toBe("svg");
      expect(result.props.className).toBe("w-6 h-6");
    });

    it("should accept a custom className", () => {
      const result = ForgeIcon({ className: "w-12 h-12" });
      expect(result.props.className).toBe("w-12 h-12");
    });

    it("should accept a custom style object", () => {
      const style = { color: "red" };
      const result = ForgeIcon({ style });
      expect(result.props.style).toEqual({ color: "red" });
    });

    it("should use viewBox 0 0 56 32", () => {
      const result = ForgeIcon({});
      expect(result.props.viewBox).toBe("0 0 56 32");
    });

    it("should contain child path elements", () => {
      const result = ForgeIcon({});
      expect(result.props.children).toBeDefined();
      expect(Array.isArray(result.props.children)).toBe(true);
      expect(result.props.children.length).toBeGreaterThan(0);
    });
  });

  describe("ForgeLogoMono", () => {
    it("should return an SVG element with default className", () => {
      const result = ForgeLogoMono({});
      expect(result.type).toBe("svg");
      expect(result.props.className).toBe("w-10 h-10");
    });

    it("should accept a custom className", () => {
      const result = ForgeLogoMono({ className: "w-20 h-20" });
      expect(result.props.className).toBe("w-20 h-20");
    });

    it("should accept a custom style object", () => {
      const style = { opacity: 0.8 };
      const result = ForgeLogoMono({ style });
      expect(result.props.style).toEqual({ opacity: 0.8 });
    });

    it("should use viewBox 0 0 256 256", () => {
      const result = ForgeLogoMono({});
      expect(result.props.viewBox).toBe("0 0 256 256");
    });

    it("should use white background fill instead of emerald", () => {
      const result = ForgeLogoMono({});
      const children = result.props.children as React.ReactElement[];
      const rect = children.find((c: React.ReactElement) => c.type === "rect");
      expect(rect?.props.fill).toBe("#FFFFFF");
    });
  });

  describe("ForgeIconMono", () => {
    it("should return an SVG element with default className", () => {
      const result = ForgeIconMono({});
      expect(result.type).toBe("svg");
      expect(result.props.className).toBe("w-6 h-6");
    });

    it("should accept a custom className", () => {
      const result = ForgeIconMono({ className: "w-12 h-12" });
      expect(result.props.className).toBe("w-12 h-12");
    });

    it("should accept a custom style object", () => {
      const style = { color: "white" };
      const result = ForgeIconMono({ style });
      expect(result.props.style).toEqual({ color: "white" });
    });

    it("should use viewBox 0 0 56 32", () => {
      const result = ForgeIconMono({});
      expect(result.props.viewBox).toBe("0 0 56 32");
    });

    it("should use white fill for paths", () => {
      const result = ForgeIconMono({});
      const children = result.props.children as React.ReactElement[];
      children.forEach((child: React.ReactElement) => {
        expect(child.props.fill).toBe("#FFFFFF");
      });
    });
  });
});
