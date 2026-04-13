/**
 * Property 2: Environment Variable Client/Server Scoping
 *
 * For any environment variable documented in `.env.example` with a `NEXT_PUBLIC_`
 * prefix, there SHALL NOT exist a corresponding entry for `GROQ_API_KEY` or
 * `DEPLOYER_PRIVATE_KEY` with that prefix. Conversely, for any `VITE_` prefixed
 * client variable that has a Next.js mapping, a corresponding `NEXT_PUBLIC_`
 * variable SHALL be documented.
 *
 * **Validates: Requirements 4.1, 4.2**
 *
 * Feature: nextjs-project-scaffolding, Property 2: Environment Variable Client/Server Scoping
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse .env.example and return the set of all variable names. */
function parseEnvVarNames(filePath: string): Set<string> {
  const content = fs.readFileSync(filePath, "utf-8");
  const names = new Set<string>();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    // Skip comments and blank lines
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=/);
    if (match) {
      names.add(match[1]);
    }
  }
  return names;
}

// Server-only secrets that must NEVER have a NEXT_PUBLIC_ prefix
const SERVER_ONLY_VARS = ["GROQ_API_KEY", "DEPLOYER_PRIVATE_KEY"];

// VITE_ client vars that have a documented NEXT_PUBLIC_ counterpart
// (per Module 5 design: VITE_IDENTITY_REGISTRY → NEXT_PUBLIC_IDENTITY_REGISTRY, etc.)
const VITE_TO_NEXT_PUBLIC_MAP: Record<string, string> = {
  VITE_IDENTITY_REGISTRY: "NEXT_PUBLIC_IDENTITY_REGISTRY",
};

const MAPPED_VITE_VARS = Object.keys(VITE_TO_NEXT_PUBLIC_MAP);

// ---------------------------------------------------------------------------
// Load & parse .env.example once
// ---------------------------------------------------------------------------

const envFilePath = path.resolve(__dirname, "../../.env.example");
const allVarNames = parseEnvVarNames(envFilePath);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Feature: nextjs-project-scaffolding, Property 2: Environment Variable Client/Server Scoping", () => {
  it(".env.example has variables to test", () => {
    expect(allVarNames.size).toBeGreaterThan(0);
  });

  it("server-only secrets never appear with NEXT_PUBLIC_ prefix", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: SERVER_ONLY_VARS.length - 1 }),
        (idx) => {
          const secretName = SERVER_ONLY_VARS[idx];
          const publicVersion = `NEXT_PUBLIC_${secretName}`;
          expect(
            allVarNames.has(publicVersion),
            `${secretName} must not have a NEXT_PUBLIC_ prefixed version in .env.example`,
          ).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("randomly selected server-only vars never have NEXT_PUBLIC_ prefix (property)", () => {
    fc.assert(
      fc.property(fc.constantFrom(...SERVER_ONLY_VARS), (secretName) => {
        const publicVersion = `NEXT_PUBLIC_${secretName}`;
        expect(
          allVarNames.has(publicVersion),
          `${secretName} is a server-only secret and must not be exposed as ${publicVersion}`,
        ).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("every mapped VITE_ client var has a corresponding NEXT_PUBLIC_ entry", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAPPED_VITE_VARS.length - 1 }),
        (idx) => {
          const viteVar = MAPPED_VITE_VARS[idx];
          const nextPublicVar = VITE_TO_NEXT_PUBLIC_MAP[viteVar];
          expect(
            allVarNames.has(nextPublicVar),
            `${viteVar} should have a corresponding ${nextPublicVar} in .env.example`,
          ).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("no NEXT_PUBLIC_ variable in .env.example exposes a server-only secret (exhaustive)", () => {
    const nextPublicVars = [...allVarNames].filter((v) =>
      v.startsWith("NEXT_PUBLIC_"),
    );
    for (const pubVar of nextPublicVars) {
      const baseName = pubVar.replace("NEXT_PUBLIC_", "");
      expect(
        SERVER_ONLY_VARS.includes(baseName),
        `${pubVar} exposes server-only secret ${baseName}`,
      ).toBe(false);
    }
  });

  it("all three mapped VITE_ → NEXT_PUBLIC_ pairs exist (exhaustive)", () => {
    for (const [viteVar, nextPublicVar] of Object.entries(
      VITE_TO_NEXT_PUBLIC_MAP,
    )) {
      expect(
        allVarNames.has(nextPublicVar),
        `Missing ${nextPublicVar} (counterpart of ${viteVar}) in .env.example`,
      ).toBe(true);
    }
  });
});
