/**
 * Property 6: Server Page Client Boundary Pattern
 *
 * For any `page.tsx` file under `app/(routes)/`, the file SHALL NOT contain
 * a `"use client"` directive (it is a server component), and it SHALL import
 * at least one client component file that DOES contain a `"use client"` directive.
 * Additionally, the `page.tsx` SHALL export either a static `metadata` object
 * or a `generateMetadata` function.
 *
 * **Validates: Requirements 10.1, 10.6**
 *
 * Feature: nextjs-page-routing-migration, Property 6: Server Page Client Boundary Pattern
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { readFileSync, readdirSync, statSync } from "fs";
import { resolve, dirname, relative } from "path";

// ---------------------------------------------------------------------------
// Discover all page.tsx files under app/(routes)/
// ---------------------------------------------------------------------------

function findPageFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findPageFiles(full));
    } else if (entry === "page.tsx") {
      results.push(full);
    }
  }
  return results;
}

const routesDir = resolve(process.cwd(), "app/(routes)");
const pageFiles = findPageFiles(routesDir).map((abs) => ({
  relativePath: relative(routesDir, abs),
  absolutePath: abs,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the relative import paths from a file's content.
 * Matches patterns like: import Foo from "./FooClient"
 * Returns the resolved file paths for local relative imports.
 */
function extractLocalImports(
  content: string,
  fileDir: string,
): { importPath: string; resolvedPath: string }[] {
  const importRegex = /import\s+(?:[\w{}\s,*]+)\s+from\s+["'](\.[^"']+)["']/g;
  const results: { importPath: string; resolvedPath: string }[] = [];
  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    // Resolve relative to the page.tsx directory
    let resolvedPath = resolve(fileDir, importPath);
    // Try .tsx extension if not already specified
    if (!resolvedPath.endsWith(".tsx") && !resolvedPath.endsWith(".ts")) {
      resolvedPath = resolvedPath + ".tsx";
    }
    results.push({ importPath, resolvedPath });
  }

  return results;
}
// ---------------------------------------------------------------------------
// Arbitrary: pick a random page.tsx file from the discovered set
// ---------------------------------------------------------------------------

const pageFileArb = fc.constantFrom(...pageFiles);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Feature: nextjs-page-routing-migration, Property 6: Server Page Client Boundary Pattern", () => {
  it("page.tsx files do NOT contain a 'use client' directive", () => {
    fc.assert(
      fc.property(pageFileArb, (pageFile) => {
        const content = readFileSync(pageFile.absolutePath, "utf-8");
        // The page.tsx should be a server component — no "use client"
        expect(content).not.toMatch(/^["']use client["']/m);
      }),
      { numRuns: 100 },
    );
  });

  it("page.tsx files export either a static metadata object or a generateMetadata function", () => {
    fc.assert(
      fc.property(pageFileArb, (pageFile) => {
        const content = readFileSync(pageFile.absolutePath, "utf-8");
        const hasStaticMetadata = /export\s+const\s+metadata\b/.test(content);
        const hasGenerateMetadata =
          /export\s+(async\s+)?function\s+generateMetadata\b/.test(content);
        // At least one metadata export must be present
        expect(hasStaticMetadata || hasGenerateMetadata).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("page.tsx files import at least one local client component", () => {
    fc.assert(
      fc.property(pageFileArb, (pageFile) => {
        const content = readFileSync(pageFile.absolutePath, "utf-8");
        const fileDir = dirname(pageFile.absolutePath);
        const localImports = extractLocalImports(content, fileDir);

        // Filter to only component imports (exclude JsonLd and non-relative)
        // At least one local import should exist that is a client component
        const clientComponentImports = localImports.filter(
          (imp) => !imp.importPath.includes("JsonLd"),
        );
        expect(clientComponentImports.length).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 100 },
    );
  });

  it("imported client component files contain the 'use client' directive", () => {
    fc.assert(
      fc.property(pageFileArb, (pageFile) => {
        const content = readFileSync(pageFile.absolutePath, "utf-8");
        const fileDir = dirname(pageFile.absolutePath);
        const localImports = extractLocalImports(content, fileDir);

        // Find client component imports (exclude utility components like JsonLd)
        const clientComponentImports = localImports.filter(
          (imp) => !imp.importPath.includes("JsonLd"),
        );

        // Each client component file must have "use client" at the top
        for (const imp of clientComponentImports) {
          let clientContent: string;
          try {
            clientContent = readFileSync(imp.resolvedPath, "utf-8");
          } catch {
            // If .tsx didn't work, try .ts
            const tsPath = imp.resolvedPath.replace(/\.tsx$/, ".ts");
            clientContent = readFileSync(tsPath, "utf-8");
          }
          expect(clientContent).toMatch(/^["']use client["']/m);
        }
      }),
      { numRuns: 100 },
    );
  });
});
