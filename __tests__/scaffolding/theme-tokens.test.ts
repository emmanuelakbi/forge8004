/**
 * Property 1: Theme Token Preservation
 *
 * For any non-font @theme token defined in src/index.css, the migrated
 * app/globals.css SHALL contain the same token name with the same value.
 * Font tokens (--font-sans, --font-mono) are expected to differ because
 * they reference next/font CSS variables instead of hardcoded font names.
 *
 * **Validates: Requirements 3.3, 9.1**
 *
 * Feature: nextjs-project-scaffolding, Property 1: Theme Token Preservation
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the @theme { ... } block content from a CSS string. */
function extractThemeBlock(css: string): string {
  const match = css.match(/@theme\s*\{([^}]+)\}/);
  if (!match) throw new Error("No @theme block found");
  return match[1];
}

/** Parse CSS custom property declarations from a theme block string.
 *  Returns a Map of token-name → value (both trimmed). */
function parseTokens(themeBlock: string): Map<string, string> {
  const tokens = new Map<string, string>();
  const re = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(themeBlock)) !== null) {
    tokens.set(m[1].trim(), m[2].trim());
  }
  return tokens;
}

const FONT_TOKENS = new Set(["--font-sans", "--font-mono"]);

// ---------------------------------------------------------------------------
// Load & parse both CSS files once
// ---------------------------------------------------------------------------

const srcCss = fs.readFileSync(
  path.resolve(__dirname, "../../src/index.css"),
  "utf-8",
);
const appCss = fs.readFileSync(
  path.resolve(__dirname, "../../app/globals.css"),
  "utf-8",
);

const srcTokens = parseTokens(extractThemeBlock(srcCss));
const appTokens = parseTokens(extractThemeBlock(appCss));

// Build the non-font token entries from src/index.css
const nonFontEntries = [...srcTokens.entries()].filter(
  ([name]) => !FONT_TOKENS.has(name),
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Feature: nextjs-project-scaffolding, Property 1: Theme Token Preservation", () => {
  it("src/index.css has non-font @theme tokens to test", () => {
    expect(nonFontEntries.length).toBeGreaterThan(0);
  });

  it("every non-font @theme token in src/index.css exists in app/globals.css with the same value", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: nonFontEntries.length - 1 }),
        (idx) => {
          const [name, srcValue] = nonFontEntries[idx];
          const appValue = appTokens.get(name);
          expect(appValue).toBeDefined();
          expect(appValue).toBe(srcValue);
        },
      ),
      { numRuns: Math.max(100, nonFontEntries.length * 20) },
    );
  });

  it("all non-font tokens from src/index.css are present in app/globals.css (exhaustive)", () => {
    for (const [name, srcValue] of nonFontEntries) {
      const appValue = appTokens.get(name);
      expect(
        appValue,
        `Token ${name} missing in app/globals.css`,
      ).toBeDefined();
      expect(appValue, `Token ${name} value mismatch`).toBe(srcValue);
    }
  });
});
