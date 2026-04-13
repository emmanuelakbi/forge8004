/**
 * Property 4: Path Alias Resolution
 *
 * For any valid relative file path from the project root, the `@` alias
 * configured in `tsconfig.json` (`"@/*": ["./*"]`) SHALL resolve `@/{path}`
 * to `./{path}`.
 *
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "../..");

function getTsconfigAlias(): { pattern: string; replacement: string } {
  const raw = fs.readFileSync(
    path.join(PROJECT_ROOT, "tsconfig.json"),
    "utf-8",
  );
  const stripped = raw.replace(
    /"(?:[^"\\]|\\.)*"|\/\/.*$|\/\*[\s\S]*?\*\//gm,
    (match) => (match.startsWith('"') ? match : ""),
  );
  const tsconfig = JSON.parse(stripped);
  const paths: Record<string, string[]> = tsconfig.compilerOptions?.paths ?? {};
  const mapping = paths["@/*"];
  if (!mapping || mapping.length === 0) {
    throw new Error('tsconfig.json missing paths["@/*"]');
  }
  return { pattern: "@/*", replacement: mapping[0] };
}

function resolveTsconfigPath(importPath: string, replacement: string): string {
  const stripped = importPath.replace(/^@\//, "");
  return replacement.replace("*", stripped);
}

const pathSegment = fc
  .stringMatching(/^[a-zA-Z][a-zA-Z0-9-]{0,19}$/)
  .filter((s) => !s.endsWith("-"));

const relativePath = fc
  .tuple(
    fc.array(pathSegment, { minLength: 1, maxLength: 5 }),
    fc.oneof(
      fc.constant(""),
      fc.constant(".ts"),
      fc.constant(".tsx"),
      fc.constant(".js"),
      fc.constant(".css"),
    ),
  )
  .map(([segments, ext]) => segments.join("/") + ext);

const tsconfigAlias = getTsconfigAlias();

describe("Feature: nextjs-project-scaffolding, Property 4: Path Alias Resolution", () => {
  it("tsconfig.json has @/* paths mapping to ./*", () => {
    expect(tsconfigAlias.pattern).toBe("@/*");
    expect(tsconfigAlias.replacement).toBe("./*");
  });

  it("for any valid path, @/{path} resolves to ./{path} via tsconfig paths", () => {
    fc.assert(
      fc.property(relativePath, (relPath) => {
        const importPath = `@/${relPath}`;
        const resolved = resolveTsconfigPath(
          importPath,
          tsconfigAlias.replacement,
        );
        expect(resolved).toBe(`./${relPath}`);
      }),
      { numRuns: 100 },
    );
  });
});
