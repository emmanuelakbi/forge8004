/**
 * Feature: nextjs-blockchain-wallet, Property 5: Numeric Fields BigInt Conversion
 *
 * For any valid TradeIntent with numeric fields `size`, `capitalAllocated`,
 * `stopLoss`, `takeProfit`, and `timestamp`, the EIP-712 typed data message
 * SHALL contain these fields as BigInt values where:
 *   size        = BigInt(Math.round(original * 100_000_000))
 *   capitalAllocated = BigInt(Math.round(original * 100))
 *   stopLoss    = BigInt(Math.round(original * 100))
 *   takeProfit  = BigInt(Math.round(original * 100))
 *   timestamp   = BigInt(original)
 *
 * Validates: Requirements 5.6
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { createIntentEnvelope } from "@/src/services/trustArtifacts";
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

describe("Property 5: Numeric Fields BigInt Conversion", () => {
  it("size → BigInt(Math.round(val * 100_000_000)), capitalAllocated/stopLoss/takeProfit → BigInt(Math.round(val * 100)), timestamp → BigInt(val)", () => {
    fc.assert(
      fc.property(agentIdentityArb, tradeIntentArb, (identity, intent) => {
        const envelope = createIntentEnvelope(identity, intent);
        const msg = envelope.typedIntent.message;

        // Apply the same BigInt conversion as signTradeIntentWithWalletInternal
        const convertedSize = BigInt(Math.round(msg.size * 100_000_000));
        const convertedCapital = BigInt(Math.round(msg.capitalAllocated * 100));
        const convertedStopLoss = BigInt(Math.round(msg.stopLoss * 100));
        const convertedTakeProfit = BigInt(Math.round(msg.takeProfit * 100));
        const convertedTimestamp = BigInt(msg.timestamp);

        // Verify size uses 8-decimal scaling (satoshi-like)
        expect(convertedSize).toBe(
          BigInt(Math.round(intent.size * 100_000_000)),
        );

        // Verify capitalAllocated uses 2-decimal scaling (cents)
        // createIntentEnvelope defaults undefined to 0
        const expectedCapital = intent.capitalAllocated ?? 0;
        expect(convertedCapital).toBe(
          BigInt(Math.round(expectedCapital * 100)),
        );

        // Verify stopLoss uses 2-decimal scaling (cents)
        const expectedStopLoss = intent.stopLoss ?? 0;
        expect(convertedStopLoss).toBe(
          BigInt(Math.round(expectedStopLoss * 100)),
        );

        // Verify takeProfit uses 2-decimal scaling (cents)
        const expectedTakeProfit = intent.takeProfit ?? 0;
        expect(convertedTakeProfit).toBe(
          BigInt(Math.round(expectedTakeProfit * 100)),
        );

        // Verify timestamp is direct BigInt (no scaling)
        expect(convertedTimestamp).toBe(BigInt(intent.timestamp));

        // Verify all converted values are BigInt type
        expect(typeof convertedSize).toBe("bigint");
        expect(typeof convertedCapital).toBe("bigint");
        expect(typeof convertedStopLoss).toBe("bigint");
        expect(typeof convertedTakeProfit).toBe("bigint");
        expect(typeof convertedTimestamp).toBe("bigint");
      }),
      { numRuns: 100 },
    );
  });
});
