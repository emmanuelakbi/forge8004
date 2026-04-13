/**
 * Property-based test for prohibited import patterns in app/ directory
 *
 * Feature: nextjs-ui-polish-ssr-fixes, Property 6: No prohibited import patterns in app/ directory files
 *
 * Validates: Requirements 9.1, 10.1, 10.3
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import fs from "fs";
import path from "path";

/**
 * Recursively find all .ts and .tsx files in a directory.
 */
function findTsTsxFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTsTsxFiles(fullPath));
    } else if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
      results.push(fullPath);
    }
  }

  return results;
}

const appDir = path.resolve(process.cwd(), "app");
const allAppFiles = findTsTsxFiles(appDir);

describe("Property 6: No prohibited import patterns in app/ directory files", () => {
  // Precondition: we actually have files to test
  it("should find .ts/.tsx files in app/ directory", () => {
    expect(allAppFiles.length).toBeGreaterThan(0);
  });

  it("should contain zero react-router-dom imports in any app/ file", () => {
    fc.assert(
      fc.property(fc.constantFrom(...allAppFiles), (filePath) => {
        const content = fs.readFileSync(filePath, "utf-8");
        const hasReactRouterDom =
          content.includes('from "react-router-dom"') ||
          content.includes("from 'react-router-dom'");

        expect(hasReactRouterDom).toBe(false);
      }),
      { numRuns: Math.max(100, allAppFiles.length) },
    );
  });

  it("should contain zero import.meta.env or import.meta.hot references in any app/ file", () => {
    fc.assert(
      fc.property(fc.constantFrom(...allAppFiles), (filePath) => {
        const content = fs.readFileSync(filePath, "utf-8");
        const hasImportMetaEnv = content.includes("import.meta.env");
        const hasImportMetaHot = content.includes("import.meta.hot");

        expect(hasImportMetaEnv).toBe(false);
        expect(hasImportMetaHot).toBe(false);
      }),
      { numRuns: Math.max(100, allAppFiles.length) },
    );
  });

  it("should contain zero framer-motion imports in any app/ file (should use motion/react)", () => {
    fc.assert(
      fc.property(fc.constantFrom(...allAppFiles), (filePath) => {
        const content = fs.readFileSync(filePath, "utf-8");
        const hasFramerMotion =
          content.includes('from "framer-motion"') ||
          content.includes("from 'framer-motion'");

        expect(hasFramerMotion).toBe(false);
      }),
      { numRuns: Math.max(100, allAppFiles.length) },
    );
  });

  it("should contain zero vite-specific imports in any app/ file", () => {
    fc.assert(
      fc.property(fc.constantFrom(...allAppFiles), (filePath) => {
        const content = fs.readFileSync(filePath, "utf-8");
        const hasViteImport =
          content.includes('from "vite"') || content.includes("from 'vite'");
        const hasVitePluginReact =
          content.includes('from "@vitejs/plugin-react"') ||
          content.includes("from '@vitejs/plugin-react'");
        const hasTailwindVite =
          content.includes('from "@tailwindcss/vite"') ||
          content.includes("from '@tailwindcss/vite'");

        expect(hasViteImport).toBe(false);
        expect(hasVitePluginReact).toBe(false);
        expect(hasTailwindVite).toBe(false);
      }),
      { numRuns: Math.max(100, allAppFiles.length) },
    );
  });
});
