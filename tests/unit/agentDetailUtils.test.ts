// Unit tests for src/pages/agent-detail/utils.ts
// Covers all exported pure functions

import { describe, it, expect } from "vitest";
import {
  formatResumeTime,
  formatMinutesLabel,
  formatCountdownLabel,
  toCompactTime,
  summarizeTimelineSequence,
  mapIntentToValidationType,
  deriveValidationRecordsFromIntents,
  SENTIMENT_REFRESH_INTERVAL_MS,
  ACTIVE_GROQ_MODEL_LABEL,
} from "@/src/pages/agent-detail/utils";
import type { TrustTimelineEvent } from "@/src/services/trustArtifacts";
import type { TradeIntent } from "@/src/lib/types";

// ── Helpers ───────────────────────────────────────────────────────

function makeEvent(
  overrides: Partial<TrustTimelineEvent> = {},
): TrustTimelineEvent {
  return {
    id: "evt-1",
    timestamp: Date.now(),
    title: "Test Event",
    detail: "detail",
    tone: "info",
    kind: "INTENT",
    ...overrides,
  };
}

function makeIntent(overrides: Partial<TradeIntent> = {}): TradeIntent {
  return {
    agentId: "agent-1",
    side: "BUY",
    asset: "ETH",
    size: 1,
    timestamp: Date.now(),
    ...overrides,
  };
}

// ── Constants ─────────────────────────────────────────────────────

describe("[AgentDetail Utils]", () => {
  describe("constants", () => {
    it("should export SENTIMENT_REFRESH_INTERVAL_MS as 3 minutes", () => {
      expect(SENTIMENT_REFRESH_INTERVAL_MS).toBe(3 * 60 * 1000);
    });

    it("should export ACTIVE_GROQ_MODEL_LABEL", () => {
      expect(typeof ACTIVE_GROQ_MODEL_LABEL).toBe("string");
      expect(ACTIVE_GROQ_MODEL_LABEL.length).toBeGreaterThan(0);
    });
  });

  // ── formatResumeTime ──────────────────────────────────────────

  describe("formatResumeTime", () => {
    it("should return 'soon' when no timestamp is provided", () => {
      expect(formatResumeTime()).toBe("soon");
      expect(formatResumeTime(undefined)).toBe("soon");
    });

    it("should return 'soon' when timestamp is 0", () => {
      expect(formatResumeTime(0)).toBe("soon");
    });

    it("should return a formatted time string for a valid timestamp", () => {
      const ts = new Date("2025-03-15T14:30:00Z").getTime();
      const result = formatResumeTime(ts);
      // Should contain digits and a colon (HH:MM pattern)
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  // ── formatMinutesLabel ────────────────────────────────────────

  describe("formatMinutesLabel", () => {
    it("should return minutes for values under 60", () => {
      expect(formatMinutesLabel(5)).toBe("5 min");
      expect(formatMinutesLabel(30)).toBe("30 min");
      expect(formatMinutesLabel(1)).toBe("1 min");
    });

    it("should return hours for values 60–1439", () => {
      expect(formatMinutesLabel(60)).toBe("1 hour");
      expect(formatMinutesLabel(120)).toBe("2 hours");
      expect(formatMinutesLabel(180)).toBe("3 hours");
    });

    it("should return days for values >= 1440", () => {
      expect(formatMinutesLabel(1440)).toBe("1 day");
      expect(formatMinutesLabel(2880)).toBe("2 days");
      expect(formatMinutesLabel(4320)).toBe("3 days");
    });
  });

  // ── formatCountdownLabel ──────────────────────────────────────

  describe("formatCountdownLabel", () => {
    it("should return 'Review now' when ms <= 0", () => {
      expect(formatCountdownLabel(0)).toBe("Review now");
      expect(formatCountdownLabel(-1000)).toBe("Review now");
    });

    it("should format seconds-only countdown", () => {
      expect(formatCountdownLabel(5000)).toBe("00:05");
      expect(formatCountdownLabel(59000)).toBe("00:59");
    });

    it("should format minutes and seconds", () => {
      expect(formatCountdownLabel(90_000)).toBe("01:30");
      expect(formatCountdownLabel(600_000)).toBe("10:00");
    });

    it("should format hours, minutes, and seconds", () => {
      expect(formatCountdownLabel(3_661_000)).toBe("01:01:01");
      expect(formatCountdownLabel(7_200_000)).toBe("02:00:00");
    });

    it("should ceil partial seconds", () => {
      // 1500ms → 2 seconds
      expect(formatCountdownLabel(1500)).toBe("00:02");
    });
  });

  // ── toCompactTime ─────────────────────────────────────────────

  describe("toCompactTime", () => {
    it("should return a formatted HH:MM string", () => {
      const ts = new Date("2025-06-01T09:15:00Z").getTime();
      const result = toCompactTime(ts);
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  // ── summarizeTimelineSequence ─────────────────────────────────

  describe("summarizeTimelineSequence", () => {
    it("should return 'Grid Profit' for GRID SELL FILLED events", () => {
      const result = summarizeTimelineSequence([
        makeEvent({ title: "Grid Sell Filled at $65,000" }),
      ]);
      expect(result.label).toBe("Grid Profit");
      expect(result.tone).toBe("approved");
    });

    it("should return 'Grid Fill' for GRID BUY FILLED events", () => {
      const result = summarizeTimelineSequence([
        makeEvent({ title: "Grid Buy Filled at $60,000" }),
      ]);
      expect(result.label).toBe("Grid Fill");
      expect(result.tone).toBe("approved");
    });

    it("should return 'Grid Rebuild' for GRID RANGE REBUILT events", () => {
      const result = summarizeTimelineSequence([
        makeEvent({ title: "Grid Range Rebuilt" }),
      ]);
      expect(result.label).toBe("Grid Rebuild");
      expect(result.tone).toBe("neutral");
    });

    it("should return 'Grid Terminated' for GRID TERMINATED events", () => {
      const result = summarizeTimelineSequence([
        makeEvent({ title: "Grid Terminated" }),
      ]);
      expect(result.label).toBe("Grid Terminated");
      expect(result.tone).toBe("blocked");
    });

    it("should return 'Grid Pause' for GRID PAUSED OUTSIDE RANGE events", () => {
      const result = summarizeTimelineSequence([
        makeEvent({ title: "Grid Paused Outside Range" }),
      ]);
      expect(result.label).toBe("Grid Pause");
      expect(result.tone).toBe("neutral");
    });

    it("should return 'Grid Init' for GRID INITIALIZED events", () => {
      const result = summarizeTimelineSequence([
        makeEvent({ title: "Grid Initialized" }),
      ]);
      expect(result.label).toBe("Grid Init");
      expect(result.tone).toBe("approved");
    });

    it("should return 'Trailing Exit' for TRAILING STOP CLOSED events", () => {
      const result = summarizeTimelineSequence([
        makeEvent({ title: "Trailing Stop Closed" }),
      ]);
      expect(result.label).toBe("Trailing Exit");
      expect(result.tone).toBe("approved");
    });

    it("should return 'Trailing Raise' for TRAILING STOP RAISED events", () => {
      const result = summarizeTimelineSequence([
        makeEvent({ title: "Trailing Stop Raised" }),
      ]);
      expect(result.label).toBe("Trailing Raise");
      expect(result.tone).toBe("approved");
    });

    it("should return 'Trailing On' for TRAILING STOP ACTIVATED events", () => {
      const result = summarizeTimelineSequence([
        makeEvent({ title: "Trailing Stop Activated" }),
      ]);
      expect(result.label).toBe("Trailing On");
      expect(result.tone).toBe("approved");
    });

    it("should return 'Review Exit' for TIMED REVIEW CLOSED events", () => {
      const result = summarizeTimelineSequence([
        makeEvent({ title: "Timed Review Closed" }),
      ]);
      expect(result.label).toBe("Review Exit");
      expect(result.tone).toBe("neutral");
    });

    it("should return 'Review Hold' for TIMED REVIEW KEPT events", () => {
      const result = summarizeTimelineSequence([
        makeEvent({ title: "Timed Review Kept" }),
      ]);
      expect(result.label).toBe("Review Hold");
      expect(result.tone).toBe("approved");
    });

    it("should return 'Blocked' when any event has blocked tone", () => {
      const result = summarizeTimelineSequence([
        makeEvent({ title: "Risk Check", tone: "blocked" }),
      ]);
      expect(result.label).toBe("Blocked");
      expect(result.tone).toBe("blocked");
    });

    it("should return 'Safe Hold' when any event title includes HOLD", () => {
      const result = summarizeTimelineSequence([
        makeEvent({ title: "Safe Hold Decision", tone: "neutral" }),
      ]);
      expect(result.label).toBe("Safe Hold");
      expect(result.tone).toBe("neutral");
    });

    it("should return 'Executed' for EXECUTION kind with approved tone", () => {
      const result = summarizeTimelineSequence([
        makeEvent({
          title: "Trade Executed",
          kind: "EXECUTION",
          tone: "approved",
        }),
      ]);
      expect(result.label).toBe("Executed");
      expect(result.tone).toBe("approved");
    });

    it("should return 'Recorded' as the default fallback", () => {
      const result = summarizeTimelineSequence([
        makeEvent({ title: "Something else", tone: "info", kind: "INTENT" }),
      ]);
      expect(result.label).toBe("Recorded");
      expect(result.tone).toBe("info");
    });

    it("should prioritize grid sell over grid buy when both present", () => {
      const result = summarizeTimelineSequence([
        makeEvent({ title: "Grid Buy Filled" }),
        makeEvent({ title: "Grid Sell Filled" }),
      ]);
      expect(result.label).toBe("Grid Profit");
    });
  });

  // ── mapIntentToValidationType ─────────────────────────────────

  describe("mapIntentToValidationType", () => {
    it("should return TRADE_INTENT for TRADE_INTENT artifact type", () => {
      const intent = makeIntent({ artifactType: "TRADE_INTENT" });
      expect(mapIntentToValidationType(intent)).toBe("TRADE_INTENT");
    });

    it("should return TRADE_INTENT for POSITION_CLOSE artifact type", () => {
      const intent = makeIntent({ artifactType: "POSITION_CLOSE" });
      expect(mapIntentToValidationType(intent)).toBe("TRADE_INTENT");
    });

    it("should return RISK_CHECK for SYSTEM_HOLD artifact type", () => {
      const intent = makeIntent({ artifactType: "SYSTEM_HOLD" });
      expect(mapIntentToValidationType(intent)).toBe("RISK_CHECK");
    });

    it("should return RISK_CHECK for RISK_BLOCK artifact type", () => {
      const intent = makeIntent({ artifactType: "RISK_BLOCK" });
      expect(mapIntentToValidationType(intent)).toBe("RISK_CHECK");
    });

    it("should return RISK_CHECK when artifactType is undefined", () => {
      const intent = makeIntent({});
      expect(mapIntentToValidationType(intent)).toBe("RISK_CHECK");
    });
  });

  // ── deriveValidationRecordsFromIntents ────────────────────────

  describe("deriveValidationRecordsFromIntents", () => {
    it("should return empty array when no intents have validation", () => {
      const intents = [makeIntent(), makeIntent()];
      expect(deriveValidationRecordsFromIntents("agent-1", intents)).toEqual(
        [],
      );
    });

    it("should derive records only from intents with validation", () => {
      const intents = [
        makeIntent({
          validation: { score: 85, comment: "Good" },
          timestamp: 1000,
        }),
        makeIntent({ timestamp: 2000 }), // no validation
        makeIntent({
          validation: { score: 60, comment: "Risky" },
          timestamp: 3000,
        }),
      ];
      const records = deriveValidationRecordsFromIntents("agent-1", intents);
      expect(records).toHaveLength(2);
    });

    it("should set agentId on all derived records", () => {
      const intents = [
        makeIntent({
          validation: { score: 90, comment: "OK" },
          timestamp: 1000,
        }),
      ];
      const records = deriveValidationRecordsFromIntents("my-agent", intents);
      expect(records[0].agentId).toBe("my-agent");
    });

    it("should sort records by timestamp descending", () => {
      const intents = [
        makeIntent({
          validation: { score: 70, comment: "A" },
          timestamp: 1000,
        }),
        makeIntent({
          validation: { score: 80, comment: "B" },
          timestamp: 5000,
        }),
        makeIntent({
          validation: { score: 90, comment: "C" },
          timestamp: 3000,
        }),
      ];
      const records = deriveValidationRecordsFromIntents("agent-1", intents);
      expect(records[0].timestamp).toBeGreaterThan(records[1].timestamp);
      expect(records[1].timestamp).toBeGreaterThan(records[2].timestamp);
    });

    it("should cap results at 120 records", () => {
      const intents = Array.from({ length: 150 }, (_, i) =>
        makeIntent({
          validation: { score: 50, comment: `Intent ${i}` },
          timestamp: i * 1000,
        }),
      );
      const records = deriveValidationRecordsFromIntents("agent-1", intents);
      expect(records).toHaveLength(120);
    });

    it("should construct validator string from engine and asset", () => {
      const intents = [
        makeIntent({
          engine: "forge",
          asset: "BTC",
          validation: { score: 75, comment: "OK" },
          timestamp: 1000,
        }),
      ];
      const records = deriveValidationRecordsFromIntents("agent-1", intents);
      expect(records[0].validator).toBe("FORGE_BTC");
    });

    it("should use fallback validator when engine/asset are missing", () => {
      const intents = [
        makeIntent({
          engine: undefined,
          asset: undefined as unknown as string,
          validation: { score: 75, comment: "OK" },
          timestamp: 1000,
        }),
      ];
      const records = deriveValidationRecordsFromIntents("agent-1", intents);
      // Falls back to "forge" and "system"
      expect(records[0].validator).toBe("FORGE_SYSTEM");
    });

    it("should use intentId for record id when available", () => {
      const intents = [
        makeIntent({
          intentId: "intent-abc",
          validation: { score: 80, comment: "OK" },
          timestamp: 1000,
        }),
      ];
      const records = deriveValidationRecordsFromIntents("agent-1", intents);
      expect(records[0].id).toBe("derived_intent-abc");
    });

    it("should set correct validationType based on artifactType", () => {
      const intents = [
        makeIntent({
          artifactType: "TRADE_INTENT",
          validation: { score: 80, comment: "OK" },
          timestamp: 1000,
        }),
        makeIntent({
          artifactType: "SYSTEM_HOLD",
          validation: { score: 60, comment: "Hold" },
          timestamp: 2000,
        }),
      ];
      const records = deriveValidationRecordsFromIntents("agent-1", intents);
      const tradeRecord = records.find((r) => r.score === 80);
      const holdRecord = records.find((r) => r.score === 60);
      expect(tradeRecord?.validationType).toBe("TRADE_INTENT");
      expect(holdRecord?.validationType).toBe("RISK_CHECK");
    });

    it("should offset timestamp by 3ms from the intent", () => {
      const intents = [
        makeIntent({
          validation: { score: 80, comment: "OK" },
          timestamp: 5000,
        }),
      ];
      const records = deriveValidationRecordsFromIntents("agent-1", intents);
      expect(records[0].timestamp).toBe(5003);
    });
  });
});
