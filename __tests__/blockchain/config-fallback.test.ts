/**
 * Feature: nextjs-blockchain-wallet, Property 1: Config Environment Variable Fallback
 *
 * For any registry key in CONFIG.REGISTRIES and for any string value (or undefined)
 * assigned to the corresponding NEXT_PUBLIC_* env var, CONFIG.REGISTRIES[key] SHALL
 * equal the environment variable value when defined, or the hardcoded placeholder
 * fallback address when undefined.
 *
 * Validates: Requirements 1.1, 1.2, 1.3
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fc from "fast-check";

// Hardcoded fallback values matching src/lib/config.ts
const FALLBACKS = {
  RPC_URL: "https://sepolia.base.org",
  IDENTITY: "0x1234567890123456789012345678901234567890",
  REPUTATION: "0x2345678901234567890123456789012345678901",
  VALIDATION: "0x3456789012345678901234567890123456789012",
  RISK_ROUTER: "0x4567890123456789012345678901234567890123",
  VAULT: "0x5678901234567890123456789012345678901234",
  CAPITAL_VAULT: "0x0000000000000000000000000000000000000000",
} as const;

// Mapping from config key to env var name
const ENV_VAR_MAP: Record<string, string> = {
  RPC_URL: "NEXT_PUBLIC_RPC_URL",
  IDENTITY: "NEXT_PUBLIC_IDENTITY_REGISTRY",
  REPUTATION: "NEXT_PUBLIC_REPUTATION_REGISTRY",
  VALIDATION: "NEXT_PUBLIC_VALIDATION_REGISTRY",
  RISK_ROUTER: "NEXT_PUBLIC_RISK_ROUTER",
  VAULT: "NEXT_PUBLIC_VAULT",
  CAPITAL_VAULT: "NEXT_PUBLIC_CAPITAL_VAULT",
};

const ALL_ENV_VARS = Object.values(ENV_VAR_MAP);

// Save and restore env state around each test
let savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  savedEnv = {};
  for (const envVar of ALL_ENV_VARS) {
    savedEnv[envVar] = process.env[envVar];
  }
});

afterEach(() => {
  for (const envVar of ALL_ENV_VARS) {
    if (savedEnv[envVar] === undefined) {
      delete process.env[envVar];
    } else {
      process.env[envVar] = savedEnv[envVar];
    }
  }
});

/**
 * Dynamically imports config.ts after resetting the module registry,
 * so process.env values set before this call are picked up at evaluation time.
 */
async function freshConfig() {
  const { vi } = await import("vitest");
  vi.resetModules();
  const mod = await import("@/src/lib/config");
  return mod.CONFIG;
}

describe("Property 1: Config Environment Variable Fallback", () => {
  it("REGISTRIES[key] equals env var when defined, or hardcoded fallback when undefined", async () => {
    const registryKeys = Object.keys(FALLBACKS).filter((k) => k !== "RPC_URL");

    await fc.assert(
      fc.asyncProperty(
        // Generate an object where each registry key is either a random non-empty string or undefined
        fc.record(
          Object.fromEntries(
            registryKeys.map((key) => [
              key,
              fc.option(fc.string({ minLength: 1, maxLength: 100 }), {
                nil: undefined,
              }),
            ]),
          ),
        ),
        async (envValues: Record<string, string | undefined>) => {
          // Set env vars
          for (const key of registryKeys) {
            const envVar = ENV_VAR_MAP[key];
            if (envValues[key] !== undefined) {
              process.env[envVar] = envValues[key];
            } else {
              delete process.env[envVar];
            }
          }

          const CONFIG = await freshConfig();

          // Verify each registry key
          for (const key of registryKeys) {
            const expected =
              envValues[key] !== undefined
                ? envValues[key]
                : FALLBACKS[key as keyof typeof FALLBACKS];
            expect(
              CONFIG.REGISTRIES[key as keyof typeof CONFIG.REGISTRIES],
            ).toBe(expected);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("RPC_URL equals env var when defined, or hardcoded fallback when undefined", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.option(fc.string({ minLength: 1, maxLength: 200 }), {
          nil: undefined,
        }),
        async (rpcValue: string | undefined) => {
          if (rpcValue !== undefined) {
            process.env.NEXT_PUBLIC_RPC_URL = rpcValue;
          } else {
            delete process.env.NEXT_PUBLIC_RPC_URL;
          }

          const CONFIG = await freshConfig();

          const expected =
            rpcValue !== undefined ? rpcValue : FALLBACKS.RPC_URL;
          expect(CONFIG.RPC_URL).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("CHAIN_ID is always 84532 regardless of env vars", async () => {
    const CONFIG = await freshConfig();
    expect(CONFIG.CHAIN_ID).toBe(84532);
  });
});
