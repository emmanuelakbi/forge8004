/**
 * Theme Features Verification
 *
 * Verifies that app/globals.css contains all required theme features
 * beyond @theme tokens: glass-panel, grain-overlay, scrollbar styles,
 * selection colors, btn clip-paths, and prefers-reduced-motion.
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const css = fs.readFileSync(
  path.resolve(__dirname, "../../app/globals.css"),
  "utf-8",
);

describe("Theme Features in app/globals.css", () => {
  // Req 5.1: obsidian background on body
  it("applies obsidian background to body", () => {
    expect(css).toContain("--color-obsidian: #0a0a0b");
    expect(css).toContain("bg-obsidian");
  });

  // Req 5.2: emerald-cyber accent color
  it("defines emerald-cyber accent color", () => {
    expect(css).toContain("--color-emerald-cyber: #10b981");
  });

  // Req 5.3: glass-panel with backdrop-blur and border-subtle
  it("defines .glass-panel with backdrop-blur and border-border-subtle", () => {
    expect(css).toContain(".glass-panel");
    expect(css).toContain("backdrop-blur-md");
    expect(css).toContain("border-border-subtle");
  });

  // Req 5.4: grain-overlay with fixed position and opacity
  it("defines .grain-overlay with fixed position and opacity", () => {
    expect(css).toContain(".grain-overlay");
    expect(css).toMatch(/\.grain-overlay[\s\S]*?position:\s*fixed/);
    expect(css).toMatch(/\.grain-overlay[\s\S]*?opacity:\s*0\.02/);
  });

  // Req 5.5: custom scrollbar styles
  it("defines custom WebKit scrollbar styles", () => {
    expect(css).toContain("::-webkit-scrollbar");
    expect(css).toContain("::-webkit-scrollbar-track");
    expect(css).toContain("::-webkit-scrollbar-thumb");
    expect(css).toContain("width: 4px");
  });

  // Req 5.6: selection colors with emerald-cyber
  it("applies emerald-cyber selection colors", () => {
    expect(css).toContain("selection:bg-emerald-cyber/30");
    expect(css).toContain("selection:text-emerald-cyber");
  });

  // Req 5.7: btn-primary and btn-secondary with clip-path
  it("defines .btn-primary with clip-path", () => {
    expect(css).toContain(".btn-primary");
    expect(css).toMatch(/\.btn-primary[\s\S]*?clip-path:\s*polygon/);
  });

  it("defines .btn-secondary with clip-path", () => {
    expect(css).toContain(".btn-secondary");
    expect(css).toMatch(/\.btn-secondary[\s\S]*?clip-path:\s*polygon/);
  });

  // Req 5.8: prefers-reduced-motion media query
  it("includes prefers-reduced-motion media query", () => {
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("animation-duration: 0.01ms");
    expect(css).toContain("scroll-behavior: auto");
  });
});
