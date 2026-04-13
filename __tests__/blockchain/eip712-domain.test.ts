/**
 * Feature: nextjs-blockchain-wallet, Property 4: EIP-712 Domain Construction Correctness
 *
 * For any valid AgentIdentity and TradeIntent (with side !== "HOLD"), the EIP-712
 * typed data domain passed to eth_signTypedData_v4 SHALL have `name` equal to "Forge8004",
 * `version` equal to "1", `chainId` equal to CONFIG.CHAIN_ID, and `verifyingContract`
 * equal to CONFIG.REGISTRIES.RISK_ROUTER.
 *
 * Validates: Requirements 5.5
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { createIntentEnvelope } from "@/src/services/trustArtifacts";
import { CONFIG } from "@/src/lib/config";
import type {
  AgentIdentity,
  AgentStrategyType,
  TradeIntent,
} from "@/src/lib/types";

const strategyTypes: AgentStrategyType[] = [
  "range_trading",
  "spot_grid_bot",
  "momentum",
  "mean_reversion",
  "arbitrage",
  "yield",
  "market_making",
  "risk_off",
];

const riskProfiles = ["conservative", "balanced", "aggressive"] as const;

const agentIdentityArb: fc.Arbitrary<AgentIdentity> = fc.record({
  agentId: fc.string({ minLength: 1, maxLength: 32 }),
  owner: fc.string({ minLength: 1, maxLength: 64 }),
  name: fc.string({ minLength: 1, maxLength: 64 }),
  description: fc.string({ maxLength: 128 }),
  strategyType: fc.constantFrom(...strategyTypes),
  riskProfile: fc.constantFrom(...riskProfiles),
});

const tradeIntentArb: fc.Arbitrary<TradeIntent> = fc.record({
  agentId: fc.string({ minLength: 1, maxLength: 32 }),
  side: fc.constantFrom("BUY" as const, "SELL" as const),
  asset: fc.constantFrom("BTC", "ETH", "USDC-ETH-LP"),
  size: fc.double({ min: 0.01, max: 100_000, noNaN: true }),
  timestamp: fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }),
  capitalAllocated: fc.option(fc.double({ min: 0, max: 50_000, noNaN: true }), {
    nil: undefined,
  }),
  stopLoss: fc.option(fc.double({ min: 0, max: 100_000, noNaN: true }), {
    nil: undefined,
  }),
  takeProfit: fc.option(fc.double({ min: 0, max: 100_000, noNaN: true }), {
    nil: undefined,
  }),
});

describe("Property 4: EIP-712 Domain Construction Correctness", () => {
  it("domain has name 'Forge8004', version '1', chainId === CONFIG.CHAIN_ID, verifyingContract === CONFIG.REGISTRIES.RISK_ROUTER", () => {
    fc.assert(
      fc.property(agentIdentityArb, tradeIntentArb, (identity, intent) => {
        const envelope = createIntentEnvelope(identity, intent);
        const domain = envelope.typedIntent.domain;

        expect(domain.name).toBe("Forge8004");
        expect(domain.version).toBe("1");
        expect(domain.chainId).toBe(CONFIG.CHAIN_ID);
        expect(domain.verifyingContract).toBe(CONFIG.REGISTRIES.RISK_ROUTER);
      }),
      { numRuns: 100 },
    );
  });
});
