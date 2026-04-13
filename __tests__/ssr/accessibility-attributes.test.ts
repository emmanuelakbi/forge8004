/**
 * Accessibility Attributes Verification
 *
 * Verifies that key components preserve correct ARIA attributes,
 * dialog roles, and form label associations.
 *
 * Validates: Requirements 8.1, 8.5, 5.8
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Accessibility Attributes", () => {
  describe("GridStatusPanel dialogs", () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, "../../src/components/agent/GridStatusPanel.tsx"),
      "utf-8",
    );

    it('contains role="dialog" on modal containers', () => {
      expect(content).toContain('role="dialog"');
    });

    it('contains aria-modal="true" on modal containers', () => {
      expect(content).toContain('aria-modal="true"');
    });

    it("contains aria-label on dialog containers", () => {
      expect(content).toContain('aria-label="Modify grid parameters"');
      expect(content).toContain('aria-label="Withdraw funds"');
    });

    it("contains aria-label on form inputs", () => {
      expect(content).toContain('aria-label="Range Low (USDC)"');
      expect(content).toContain('aria-label="Range High (USDC)"');
      expect(content).toContain('aria-label="Grid levels"');
      expect(content).toContain('aria-label="Amount to Withdraw (USDC)"');
    });

    it('contains aria-label="Close dialog" on close buttons', () => {
      expect(content).toContain('aria-label="Close dialog"');
    });
  });

  describe("Sidebar navigation", () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, "../../app/components/layout/Sidebar.tsx"),
      "utf-8",
    );

    it('contains aria-label="Main navigation" on nav element', () => {
      expect(content).toContain('aria-label="Main navigation"');
    });

    it('contains aria-label="Close sidebar" on close button', () => {
      expect(content).toContain('aria-label="Close sidebar"');
    });

    it('mobile sidebar has role="dialog" and aria-modal="true"', () => {
      expect(content).toContain('role="dialog"');
      expect(content).toContain('aria-modal="true"');
    });

    it('mobile sidebar has aria-label="Navigation sidebar"', () => {
      expect(content).toContain('aria-label="Navigation sidebar"');
    });
  });

  describe("RegisterAgent form labels", () => {
    const content = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/views/register-agent/RegisterAgent.tsx",
      ),
      "utf-8",
    );

    it("uses htmlFor attributes to associate labels with inputs", () => {
      expect(content).toContain('htmlFor="agent-name"');
      expect(content).toContain('htmlFor="agent-description"');
      expect(content).toContain('htmlFor="strategy-type"');
      expect(content).toContain('htmlFor="avatar-url"');
      expect(content).toContain('htmlFor="agent-wallet"');
    });

    it("inputs have matching id attributes for label association", () => {
      expect(content).toContain('id="agent-name"');
      expect(content).toContain('id="agent-description"');
      expect(content).toContain('id="strategy-type"');
      expect(content).toContain('id="avatar-url"');
      expect(content).toContain('id="agent-wallet"');
    });
  });

  describe("prefers-reduced-motion in globals.css", () => {
    const css = fs.readFileSync(
      path.resolve(__dirname, "../../app/globals.css"),
      "utf-8",
    );

    it("contains prefers-reduced-motion media query", () => {
      expect(css).toContain("prefers-reduced-motion: reduce");
    });
  });
});
