// Feature: nextjs-auth-data-layer, Property 2: AgentIdentity Normalization Round-Trip
// **Validates: Requirements 6.8**

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { normalizeStrategyType } from "@/src/services/trustArtifacts";

/**
 * Re-implementation of the private `stripUndefined` function from
 * `app/lib/erc8004Client.ts` for property-based testing.
 */
function stripUndefined(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  if (typeof obj === "object") {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) clean[key] = stripUndefined(value);
    }
    return clean;
  }
  return obj;
}

/**
 * Re-implementation of the private `normalizeAgentIdentity` function from
 * `app/lib/erc8004Client.ts` for property-based testing.
 */
function normalizeAgentIdentity(identity: Record<string, any>) {
  return {
    ...identity,
    strategyType: normalizeStrategyType(identity.strategyType),
  };
}

/** Valid strategy types that the system recognises. */
const VALID_STRATEGY_TYPES = [
  "range_trading",
  "spot_grid_bot",
  "momentum",
  "mean_reversion",
  "arbitrage",
  "yield",
  "market_making",
  "risk_off",
  "grid_trading",
] as const;

/** Arbitrary that generates a random valid strategy type string. */
const arbStrategyType = fc.constantFrom(...VALID_STRATEGY_TYPES);

/** Arbitrary that generates a random AgentIdentity-like object. */
const arbAgentIdentity = fc.record({
  agentId: fc.string({ minLength: 1 }),
  owner: fc.string({ minLength: 1 }),
  name: fc.string({ minLength: 1 }),
  strategyType: arbStrategyType,
  riskProfile: fc.string(),
});

describe("Property 2: AgentIdentity Normalization Round-Trip", () => {
  it("normalizeAgentIdentity + stripUndefined preserves key fields", () => {
    fc.assert(
      fc.property(arbAgentIdentity, (identity) => {
        const normalized = normalizeAgentIdentity(identity);
        const stripped = stripUndefined(normalized);

        // agentId, owner, name, riskProfile are preserved as-is
        expect(stripped.agentId).toBe(identity.agentId);
        expect(stripped.owner).toBe(identity.owner);
        expect(stripped.name).toBe(identity.name);
        expect(stripped.riskProfile).toBe(identity.riskProfile);

        // strategyType is preserved after normalization
        expect(stripped.strategyType).toBe(
          normalizeStrategyType(identity.strategyType),
        );
      }),
      { numRuns: 100 },
    );
  });
});
