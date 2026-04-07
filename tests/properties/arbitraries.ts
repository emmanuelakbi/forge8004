import fc from "fast-check";
import type {
  AgentStrategyType,
  AgentIdentity,
  AgentCheckpoint,
  GridRuntimeState,
  GridLevelState,
  GridConfigSnapshot,
} from "@/src/lib/types";
import type { MarketData } from "@/src/services/marketService";

// ── Enum arbitraries ──────────────────────────────────────────────

export const arbAgentStrategyType: fc.Arbitrary<AgentStrategyType> =
  fc.constantFrom(
    "range_trading",
    "spot_grid_bot",
    "momentum",
    "mean_reversion",
    "arbitrage",
    "yield",
    "market_making",
    "risk_off",
  );

export type RiskProfile = "conservative" | "balanced" | "aggressive";

export const arbRiskProfile: fc.Arbitrary<RiskProfile> = fc.constantFrom(
  "conservative",
  "balanced",
  "aggressive",
);

// ── AgentIdentity ─────────────────────────────────────────────────

export const arbAgentIdentity: fc.Arbitrary<AgentIdentity> = fc.record({
  agentId: fc.uuid(),
  owner: fc.uuid(),
  name: fc
    .string({ minLength: 1, maxLength: 64 })
    .filter((s) => s.trim().length > 0),
  description: fc.string({ maxLength: 200 }),
  strategyType: arbAgentStrategyType,
  riskProfile: arbRiskProfile,
  status: fc.constantFrom("active" as const, "deactivated" as const),
});

// ── TradeIntent ───────────────────────────────────────────────────

export const arbTradeIntent = fc.record({
  agentId: fc.uuid(),
  intentId: fc.uuid(),
  nonce: fc.string({ minLength: 10, maxLength: 40 }),
  side: fc.constantFrom("BUY" as const, "SELL" as const, "HOLD" as const),
  asset: fc.constantFrom("BTC", "ETH"),
  size: fc.double({ min: 50, max: 100_000, noNaN: true }),
  entryPrice: fc.double({ min: 0.01, max: 200_000, noNaN: true }),
  stopLoss: fc.double({ min: 0.01, max: 200_000, noNaN: true }),
  takeProfit: fc.double({ min: 0.01, max: 200_000, noNaN: true }),
  orderType: fc.constantFrom("MARKET" as const, "LIMIT" as const),
  timestamp: fc.integer({ min: 1_700_000_000_000, max: 2_000_000_000_000 }),
  status: fc.constantFrom(
    "OPEN" as const,
    "CLOSED" as const,
    "PENDING" as const,
    "EXECUTED" as const,
    "HIT_TP" as const,
    "HIT_SL" as const,
    "CANCELLED" as const,
  ),
});

// ── GridLevelState ────────────────────────────────────────────────

export const arbGridLevelState: fc.Arbitrary<GridLevelState> = fc.record({
  id: fc.uuid(),
  side: fc.constantFrom("BUY" as const, "SELL" as const),
  price: fc.double({ min: 100, max: 200_000, noNaN: true }),
  status: fc.constantFrom(
    "waiting" as const,
    "filled" as const,
    "closed" as const,
  ),
  quantity: fc.double({ min: 0.0001, max: 10, noNaN: true }),
  quoteAllocated: fc.double({ min: 1, max: 100_000, noNaN: true }),
});

// ── GridConfigSnapshot ────────────────────────────────────────────

const arbGridConfigSnapshot: fc.Arbitrary<GridConfigSnapshot> = fc.record({
  rangeLow: fc.double({ min: 100, max: 100_000, noNaN: true }),
  rangeHigh: fc.double({ min: 100_001, max: 200_000, noNaN: true }),
  gridLevels: fc.integer({ min: 2, max: 50 }),
  timestamp: fc.integer({ min: 1_700_000_000_000, max: 2_000_000_000_000 }),
  reason: fc.constantFrom("initial", "manual_modify", "ai_advisory"),
});

// ── GridRuntimeState ──────────────────────────────────────────────

export const arbGridRuntimeState: fc.Arbitrary<GridRuntimeState> = fc.record({
  agentId: fc.uuid(),
  mode: fc.constant("spot_grid_bot" as const),
  status: fc.constantFrom(
    "active" as const,
    "rebuilding" as const,
    "paused" as const,
    "stopped" as const,
  ),
  asset: fc.constantFrom("BTC" as const, "ETH" as const),
  referencePrice: fc.double({ min: 100, max: 200_000, noNaN: true }),
  rangeLow: fc.double({ min: 100, max: 99_000, noNaN: true }),
  rangeHigh: fc.double({ min: 100_000, max: 200_000, noNaN: true }),
  gridLevels: fc.integer({ min: 2, max: 50 }),
  gridSpacingPct: fc.double({ min: 0.1, max: 10, noNaN: true }),
  capitalReserved: fc.double({ min: 100, max: 1_000_000, noNaN: true }),
  availableQuote: fc.double({ min: 0, max: 1_000_000, noNaN: true }),
  heldBase: fc.double({ min: 0, max: 100, noNaN: true }),
  filledGridLegs: fc.integer({ min: 0, max: 50 }),
  cumulativeGridProfit: fc.double({ min: 0, max: 100_000, noNaN: true }),
  levels: fc.array(arbGridLevelState, { minLength: 2, maxLength: 20 }),
  lastRebuildAt: fc.integer({ min: 1_700_000_000_000, max: 2_000_000_000_000 }),
  updatedAt: fc.integer({ min: 1_700_000_000_000, max: 2_000_000_000_000 }),
  configMode: fc.constantFrom("ai" as const, "manual" as const),
  totalInvestment: fc.double({ min: 100, max: 1_000_000, noNaN: true }),
  previouslyWithdrawn: fc.double({ min: 0, max: 100_000, noNaN: true }),
  profitableTradesCount: fc.integer({ min: 0, max: 1000 }),
  totalTradesCount: fc.integer({ min: 0, max: 1000 }),
  configHistory: fc.array(arbGridConfigSnapshot, {
    minLength: 0,
    maxLength: 5,
  }),
  startedAt: fc.integer({ min: 1_700_000_000_000, max: 2_000_000_000_000 }),
});

// ── MarketData ────────────────────────────────────────────────────

export const arbMarketData: fc.Arbitrary<MarketData> = fc.record({
  btc: fc.record({
    price: fc.double({ min: 10_000, max: 200_000, noNaN: true }),
    change24h: fc.double({ min: -30, max: 30, noNaN: true }),
  }),
  eth: fc.record({
    price: fc.double({ min: 500, max: 20_000, noNaN: true }),
    change24h: fc.double({ min: -30, max: 30, noNaN: true }),
  }),
  timestamp: fc.integer({ min: 1_700_000_000_000, max: 2_000_000_000_000 }),
});

// ── AgentCheckpoint ───────────────────────────────────────────────

export const arbAgentCheckpoint: fc.Arbitrary<AgentCheckpoint> = fc.record({
  id: fc.uuid(),
  agentId: fc.uuid(),
  intentId: fc.uuid(),
  nonce: fc.string({ minLength: 10, maxLength: 40 }),
  kind: fc.constantFrom(
    "INTENT" as const,
    "SIGNED" as const,
    "RISK" as const,
    "EXECUTION" as const,
    "VALIDATION" as const,
  ),
  stage: fc.constantFrom(
    "INTENT_CREATED" as const,
    "INTENT_SIGNED" as const,
    "RISK_REVIEWED" as const,
    "EXECUTION_RECORDED" as const,
    "VALIDATION_RECORDED" as const,
  ),
  status: fc.constantFrom(
    "RECORDED" as const,
    "APPROVED" as const,
    "BLOCKED" as const,
    "PENDING" as const,
    "INFO" as const,
  ),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  detail: fc.string({ minLength: 1, maxLength: 500 }),
  score: fc.integer({ min: 0, max: 100 }),
  timestamp: fc.integer({ min: 1_700_000_000_000, max: 2_000_000_000_000 }),
});
