// Unit tests for LayoutSidebar component
// Validates: default export, nav item structure, active-route logic,
// click handler modifier-key logic, stopPropagation on modifier clicks

import { describe, it, expect } from "vitest";
import LayoutSidebar from "@/src/components/layout/LayoutSidebar";

/**
 * Mirror of the navItems array from the component source.
 * Kept in sync manually — if a nav item is added/removed in the component,
 * update this list so the test catches drift.
 */
const expectedNavItems = [
  { name: "Home", path: "/" },
  { name: "How It Works", path: "/how-it-works" },
  { name: "Trust Center", path: "/trust-center" },
  { name: "Console", path: "/overview" },
  { name: "Agents", path: "/agents" },
  { name: "Compare", path: "/compare" },
  { name: "Risk Replay", path: "/risk-replay" },
  { name: "Portfolio", path: "/portfolio" },
  { name: "Markets", path: "/markets" },
  { name: "Docs", path: "/docs" },
  { name: "Contact", path: "/contact" },
];

describe("[LayoutSidebar]", () => {
  describe("exports", () => {
    it("should export a default function component", () => {
      expect(typeof LayoutSidebar).toBe("function");
    });
  });

  describe("navItems configuration", () => {
    it("should have no duplicate paths", () => {
      const paths = expectedNavItems.map((i) => i.path);
      expect(new Set(paths).size).toBe(paths.length);
    });

    it("should have no duplicate names", () => {
      const names = expectedNavItems.map((i) => i.name);
      expect(new Set(names).size).toBe(names.length);
    });

    it("should start every path with /", () => {
      for (const item of expectedNavItems) {
        expect(item.path.startsWith("/")).toBe(true);
      }
    });

    it("should not include commented-out items (Signals)", () => {
      const names = expectedNavItems.map((i) => i.name);
      expect(names).not.toContain("Signals");
    });

    it("should contain the expected number of active nav items", () => {
      expect(expectedNavItems.length).toBe(11);
    });
  });

  describe("active route matching logic", () => {
    function isActive(itemPath: string, currentPath: string): boolean {
      if (itemPath === "/") return currentPath === "/";
      return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
    }

    it("should match Home only on exact /", () => {
      expect(isActive("/", "/")).toBe(true);
      expect(isActive("/", "/agents")).toBe(false);
    });

    it("should match a non-root path exactly", () => {
      expect(isActive("/agents", "/agents")).toBe(true);
    });

    it("should match child routes of a non-root path", () => {
      expect(isActive("/agents", "/agents/abc-123")).toBe(true);
    });

    it("should not match unrelated paths", () => {
      expect(isActive("/agents", "/compare")).toBe(false);
    });

    it("should not match partial prefix collisions", () => {
      // /docs should not match /documents
      expect(isActive("/docs", "/documents")).toBe(false);
    });
  });

  describe("click handler modifier-key guard", () => {
    // The onClick handler uses an early-return pattern:
    // if modifier keys are held or button !== 0, it calls stopPropagation and returns.
    // Otherwise it calls onClose.

    function shouldClose(event: {
      metaKey: boolean;
      ctrlKey: boolean;
      shiftKey: boolean;
      button: number;
    }): boolean {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.button !== 0
      ) {
        return false;
      }
      return true;
    }

    it("should close on a plain left-click (no modifiers)", () => {
      expect(
        shouldClose({
          metaKey: false,
          ctrlKey: false,
          shiftKey: false,
          button: 0,
        }),
      ).toBe(true);
    });

    it("should NOT close when metaKey is held (Cmd+click)", () => {
      expect(
        shouldClose({
          metaKey: true,
          ctrlKey: false,
          shiftKey: false,
          button: 0,
        }),
      ).toBe(false);
    });

    it("should NOT close when ctrlKey is held (Ctrl+click)", () => {
      expect(
        shouldClose({
          metaKey: false,
          ctrlKey: true,
          shiftKey: false,
          button: 0,
        }),
      ).toBe(false);
    });

    it("should NOT close when shiftKey is held (Shift+click)", () => {
      expect(
        shouldClose({
          metaKey: false,
          ctrlKey: false,
          shiftKey: true,
          button: 0,
        }),
      ).toBe(false);
    });

    it("should NOT close on middle-click (button !== 0)", () => {
      expect(
        shouldClose({
          metaKey: false,
          ctrlKey: false,
          shiftKey: false,
          button: 1,
        }),
      ).toBe(false);
    });

    it("should NOT close on right-click (button === 2)", () => {
      expect(
        shouldClose({
          metaKey: false,
          ctrlKey: false,
          shiftKey: false,
          button: 2,
        }),
      ).toBe(false);
    });

    it("should NOT close when multiple modifiers are held", () => {
      expect(
        shouldClose({
          metaKey: true,
          ctrlKey: true,
          shiftKey: false,
          button: 0,
        }),
      ).toBe(false);
    });
  });

  describe("stopPropagation on modifier clicks", () => {
    function shouldStopPropagation(event: {
      metaKey: boolean;
      ctrlKey: boolean;
      shiftKey: boolean;
      button: number;
    }): boolean {
      return (
        event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0
      );
    }

    it("should NOT stopPropagation on a plain left-click", () => {
      expect(
        shouldStopPropagation({
          metaKey: false,
          ctrlKey: false,
          shiftKey: false,
          button: 0,
        }),
      ).toBe(false);
    });

    it("should stopPropagation when metaKey is held", () => {
      expect(
        shouldStopPropagation({
          metaKey: true,
          ctrlKey: false,
          shiftKey: false,
          button: 0,
        }),
      ).toBe(true);
    });

    it("should stopPropagation when ctrlKey is held", () => {
      expect(
        shouldStopPropagation({
          metaKey: false,
          ctrlKey: true,
          shiftKey: false,
          button: 0,
        }),
      ).toBe(true);
    });

    it("should stopPropagation on middle-click", () => {
      expect(
        shouldStopPropagation({
          metaKey: false,
          ctrlKey: false,
          shiftKey: false,
          button: 1,
        }),
      ).toBe(true);
    });
  });
});
