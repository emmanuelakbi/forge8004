/**
 * Property 3: Missing Environment Variable Warning
 *
 * For any subset of required NEXT_PUBLIC_ environment variables that are absent
 * from the environment, the `next.config.ts` build-time validation SHALL produce
 * a warning message containing the name of each missing variable.
 *
 * **Validates: Requirements 4.6**
 *
 * Feature: nextjs-project-scaffolding, Property 3: Missing Environment Variable Warning
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { validateEnvVars } from "@/next.config";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REQUIRED_VARS = [
  "NEXT_PUBLIC_RPC_URL",
  "NEXT_PUBLIC_IDENTITY_REGISTRY",
  "NEXT_PUBLIC_REPUTATION_REGISTRY",
  "NEXT_PUBLIC_VALIDATION_REGISTRY",
  "NEXT_PUBLIC_RISK_ROUTER",
  "NEXT_PUBLIC_VAULT",
  "NEXT_PUBLIC_CAPITAL_VAULT",
] as const;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Feature: nextjs-project-scaffolding, Property 3: Missing Environment Variable Warning", () => {
  it("warning count equals the number of missing vars for any subset of present vars", () => {
    fc.assert(
      fc.property(
        fc.subarray([...REQUIRED_VARS], {
          minLength: 0,
          maxLength: REQUIRED_VARS.length,
        }),
        (presentVars) => {
          const env: Record<string, string | undefined> = {};
          for (const v of presentVars) {
            env[v] = "test-value";
          }

          const warnings = validateEnvVars(env);
          const missingCount = REQUIRED_VARS.length - presentVars.length;

          expect(warnings).toHaveLength(missingCount);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("each missing var name appears in exactly one warning message", () => {
    fc.assert(
      fc.property(
        fc.subarray([...REQUIRED_VARS], {
          minLength: 0,
          maxLength: REQUIRED_VARS.length,
        }),
        (presentVars) => {
          const presentSet = new Set(presentVars);
          const env: Record<string, string | undefined> = {};
          for (const v of presentVars) {
            env[v] = "test-value";
          }

          const warnings = validateEnvVars(env);
          const missingVars = REQUIRED_VARS.filter((v) => !presentSet.has(v));

          for (const missing of missingVars) {
            const matchingWarnings = warnings.filter((w) =>
              w.includes(missing),
            );
            expect(
              matchingWarnings,
              `Expected exactly one warning containing "${missing}"`,
            ).toHaveLength(1);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("present vars do NOT appear in any warning message", () => {
    fc.assert(
      fc.property(
        fc.subarray([...REQUIRED_VARS], {
          minLength: 0,
          maxLength: REQUIRED_VARS.length,
        }),
        (presentVars) => {
          const env: Record<string, string | undefined> = {};
          for (const v of presentVars) {
            env[v] = "test-value";
          }

          const warnings = validateEnvVars(env);

          for (const present of presentVars) {
            const found = warnings.some((w) => w.includes(present));
            expect(
              found,
              `Present var "${present}" should not appear in any warning`,
            ).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
