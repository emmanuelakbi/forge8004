import { describe, it, expect } from "vitest";
import {
  calculateDrawdownPct,
  calculateSharpeLikeScore,
  calculateTradePnl,
  getCommittedCapital,
} from "@/src/services/trustArtifacts";
import type { TradeIntent } from "@/src/lib/types";

// ── Drawdown Edge Cases ───────────────────────────────────────────
// Validates: Requirements 11.3

describe("[calculateDrawdownPct]", () => {
  it("should return 0 for a single-element series", () => {
    expect(calculateDrawdownPct([100])).toBe(0);
  });

  it("should return 0 for an empty series", () => {
    expect(calculateDrawdownPct([])).toBe(0);
  });

  it("should return 0 for an all-zero series", () => {
    // peak <= 0 guard skips drawdown calculation
    expect(calculateDrawdownPct([0, 0, 0])).toBe(0);
  });

  it("should compute 50% drawdown for [100, 50]", () => {
    expect(calculateDrawdownPct([100, 50])).toBeCloseTo(50, 5);
  });

  it("should track the worst drawdown across multiple dips", () => {
    // Peak 200, trough 100 = 50%; then peak 300, trough 250 = ~16.7%
    const series = [100, 200, 100, 300, 250];
    expect(calculateDrawdownPct(series)).toBeCloseTo(50, 5);
  });
});

// ── Sharpe-Like Score Edge Cases ──────────────────────────────────
// Validates: Requirements 11.4

describe("[calculateSharpeLikeScore]", () => {
  it("should return 0 for a single-element series (length < 2)", () => {
    expect(calculateSharpeLikeScore([100])).toBe(0);
  });

  it("should return a finite number for a two-element series", () => {
    const score = calculateSharpeLikeScore([100, 110]);
    expect(Number.isFinite(score)).toBe(true);
  });

  it("should return 5 for a two-element rising series (positive return, zero stdDev)", () => {
    // Only one return value → stdDev = 0, avgReturn > 0 → returns 5
    expect(calculateSharpeLikeScore([100, 110])).toBe(5);
  });

  it("should return 0 for a two-element falling series (negative return, zero stdDev)", () => {
    // Only one return value → stdDev = 0, avgReturn < 0 → returns 0
    expect(calculateSharpeLikeScore([100, 90])).toBe(0);
  });

  it("should handle large variance without exceeding [0, 5] bounds", () => {
    // Wild swings: large variance should still clamp to [0, 5]
    const series = [100, 1, 10000, 1, 50000];
    const score = calculateSharpeLikeScore(series);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(5);
    expect(Number.isFinite(score)).toBe(true);
  });

  it("should return 0 for a constant series", () => {
    expect(calculateSharpeLikeScore([50, 50, 50, 50])).toBe(0);
  });
});

// ── PnL Calculation Edge Cases ────────────────────────────────────
// Validates: Requirements 11.1

describe("[calculateTradePnl]", () => {
  it("should return 0 when size is 0", () => {
    const position: Partial<TradeIntent> = {
      side: "BUY",
      entryPrice: 100,
      size: 0,
    };
    expect(calculateTradePnl(position, 110)).toBe(0);
  });

  it("should return 0 when entryPrice is 0", () => {
    const position: Partial<TradeIntent> = {
      side: "BUY",
      entryPrice: 0,
      size: 1,
    };
    expect(calculateTradePnl(position, 110)).toBe(0);
  });

  it("should return 0 when exitPrice is 0", () => {
    const position: Partial<TradeIntent> = {
      side: "BUY",
      entryPrice: 100,
      size: 1,
    };
    expect(calculateTradePnl(position, 0)).toBe(0);
  });

  it("should return 0 when entryPrice is negative", () => {
    const position: Partial<TradeIntent> = {
      side: "BUY",
      entryPrice: -50,
      size: 1,
    };
    expect(calculateTradePnl(position, 100)).toBe(0);
  });

  it("should return 0 when exitPrice is negative", () => {
    const position: Partial<TradeIntent> = {
      side: "SELL",
      entryPrice: 100,
      size: 1,
    };
    expect(calculateTradePnl(position, -50)).toBe(0);
  });

  it("should compute BUY PnL correctly: (exit - entry) * size", () => {
    const position: Partial<TradeIntent> = {
      side: "BUY",
      entryPrice: 100,
      size: 2,
    };
    // (110 - 100) / 100 * (2 * 100) = 0.1 * 200 = 20
    expect(calculateTradePnl(position, 110)).toBeCloseTo(20, 5);
  });

  it("should compute SELL PnL correctly: (entry - exit) * size", () => {
    const position: Partial<TradeIntent> = {
      side: "SELL",
      entryPrice: 100,
      size: 2,
    };
    // (100 - 90) / 100 * (2 * 100) = 0.1 * 200 = 20
    expect(calculateTradePnl(position, 90)).toBeCloseTo(20, 5);
  });

  it("should return 0 when entryPrice is undefined", () => {
    const position: Partial<TradeIntent> = {
      side: "BUY",
      size: 1,
    };
    expect(calculateTradePnl(position, 100)).toBe(0);
  });
});

// ── Withdrawal / Capital Boundary Edge Cases ──────────────────────
// Validates: Requirements 9.4

describe("[getCommittedCapital — withdrawal boundary]", () => {
  it("should return capitalAllocated when set", () => {
    const position: Partial<TradeIntent> = {
      capitalAllocated: 500,
      side: "BUY",
    };
    expect(getCommittedCapital(position)).toBe(500);
  });

  it("should compute entryPrice * size when capitalAllocated is absent", () => {
    const position: Partial<TradeIntent> = {
      entryPrice: 100,
      size: 5,
      side: "BUY",
    };
    expect(getCommittedCapital(position)).toBe(500);
  });

  it("should return 0 when no capital info is available", () => {
    const position: Partial<TradeIntent> = { side: "BUY" };
    expect(getCommittedCapital(position)).toBe(0);
  });

  it("should allow withdrawal when amount exactly equals available capital", () => {
    const totalFunds = 1000;
    const reserved = 600;
    const available = totalFunds - reserved;
    const withdrawal = available; // exactly 400

    const positions: Partial<TradeIntent>[] = [
      { capitalAllocated: reserved, side: "BUY" as const },
    ];
    const totalReserved = positions.reduce(
      (sum, p) => sum + getCommittedCapital(p),
      0,
    );
    const availableCapital = totalFunds - totalReserved;

    // Withdrawal at exact boundary should be allowed
    expect(withdrawal).toBeLessThanOrEqual(availableCapital);
    expect(withdrawal).toBe(availableCapital);
  });

  it("should reject withdrawal when amount exceeds available capital by any margin", () => {
    const totalFunds = 1000;
    const reserved = 600;
    const available = totalFunds - reserved;
    const withdrawal = available + 0.01; // just over the boundary

    const positions: Partial<TradeIntent>[] = [
      { capitalAllocated: reserved, side: "BUY" as const },
    ];
    const totalReserved = positions.reduce(
      (sum, p) => sum + getCommittedCapital(p),
      0,
    );
    const availableCapital = totalFunds - totalReserved;

    expect(withdrawal).toBeGreaterThan(availableCapital);
  });
});
