import { TradeIntent, ValidationRecord } from "../../lib/types";
import { TrustTimelineEvent } from "../../services/trustArtifacts";

export const SENTIMENT_REFRESH_INTERVAL_MS = 3 * 60 * 1000;
export const ACTIVE_GROQ_MODEL_LABEL = "GPT OSS 120B";

export function formatResumeTime(timestamp?: number) {
  if (!timestamp) return "soon";
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function summarizeTimelineSequence(events: TrustTimelineEvent[]) {
  if (
    events.some((event) =>
      event.title.toUpperCase().includes("GRID SELL FILLED"),
    )
  ) {
    return {
      label: "Grid Profit",
      title: "Grid ladder captured a sell profit",
      tone: "approved" as const,
    };
  }

  if (
    events.some((event) =>
      event.title.toUpperCase().includes("GRID BUY FILLED"),
    )
  ) {
    return {
      label: "Grid Fill",
      title: "Grid ladder filled a lower buy level",
      tone: "approved" as const,
    };
  }

  if (
    events.some((event) =>
      event.title.toUpperCase().includes("GRID RANGE REBUILT"),
    )
  ) {
    return {
      label: "Grid Rebuild",
      title: "Grid ladder rebuilt around a new range",
      tone: "neutral" as const,
    };
  }

  if (
    events.some((event) =>
      event.title.toUpperCase().includes("GRID TERMINATED"),
    )
  ) {
    return {
      label: "Grid Terminated",
      title: "Grid bot terminated by operator",
      tone: "blocked" as const,
    };
  }

  if (
    events.some((event) =>
      event.title.toUpperCase().includes("GRID PAUSED OUTSIDE RANGE"),
    )
  ) {
    return {
      label: "Grid Pause",
      title: "Grid ladder paused outside its range",
      tone: "neutral" as const,
    };
  }

  if (
    events.some((event) =>
      event.title.toUpperCase().includes("GRID INITIALIZED"),
    )
  ) {
    return {
      label: "Grid Init",
      title: "Grid ladder initialized for this agent",
      tone: "approved" as const,
    };
  }

  if (
    events.some((event) =>
      event.title.toUpperCase().includes("TRAILING STOP CLOSED"),
    )
  ) {
    return {
      label: "Trailing Exit",
      title: "Trailing stop closed this trade",
      tone: "approved" as const,
    };
  }

  if (
    events.some((event) =>
      event.title.toUpperCase().includes("TRAILING STOP RAISED"),
    )
  ) {
    return {
      label: "Trailing Raise",
      title: "Trailing stop tightened to protect profit",
      tone: "approved" as const,
    };
  }

  if (
    events.some((event) =>
      event.title.toUpperCase().includes("TRAILING STOP ACTIVATED"),
    )
  ) {
    return {
      label: "Trailing On",
      title: "Trailing stop activated for this trade",
      tone: "approved" as const,
    };
  }

  if (
    events.some((event) =>
      event.title.toUpperCase().includes("TIMED REVIEW CLOSED"),
    )
  ) {
    return {
      label: "Review Exit",
      title: "Timed review closed this trade",
      tone: "neutral" as const,
    };
  }

  if (
    events.some((event) =>
      event.title.toUpperCase().includes("TIMED REVIEW KEPT"),
    )
  ) {
    return {
      label: "Review Hold",
      title: "Timed review kept this trade open",
      tone: "approved" as const,
    };
  }

  if (events.some((event) => event.tone === "blocked")) {
    return {
      label: "Blocked",
      title: "Policy blocked this sequence",
      tone: "blocked" as const,
    };
  }

  if (events.some((event) => event.title.toUpperCase().includes("HOLD"))) {
    return {
      label: "Safe Hold",
      title: "Sequence ended in a safe hold",
      tone: "neutral" as const,
    };
  }

  if (
    events.some(
      (event) => event.kind === "EXECUTION" && event.tone === "approved",
    )
  ) {
    return {
      label: "Executed",
      title: "Sequence reached execution",
      tone: "approved" as const,
    };
  }

  return {
    label: "Recorded",
    title: "Sequence recorded in the registry",
    tone: "info" as const,
  };
}

export function toCompactTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMinutesLabel(minutes: number) {
  if (minutes >= 1440) {
    const days = Math.round(minutes / 1440);
    return `${days} day${days === 1 ? "" : "s"}`;
  }

  if (minutes >= 60) {
    const hours = Math.round(minutes / 60);
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }

  return `${minutes} min`;
}

export function formatCountdownLabel(msRemaining: number) {
  if (msRemaining <= 0) return "Review now";

  const totalSeconds = Math.ceil(msRemaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function mapIntentToValidationType(
  intent: TradeIntent,
): ValidationRecord["validationType"] {
  if (
    intent.artifactType === "TRADE_INTENT" ||
    intent.artifactType === "POSITION_CLOSE"
  ) {
    return "TRADE_INTENT";
  }

  return "RISK_CHECK";
}

export function deriveValidationRecordsFromIntents(
  agentId: string,
  tradeIntents: TradeIntent[],
) {
  return tradeIntents
    .filter((intent) => intent.validation)
    .map((intent, index) => ({
      id: `derived_${intent.intentId || `${intent.agentId}_${intent.timestamp}_${index}`}`,
      agentId,
      validator:
        `${intent.engine || "forge"}_${intent.asset || "system"}`.toUpperCase(),
      validationType: mapIntentToValidationType(intent),
      score: intent.validation!.score,
      comment: intent.validation!.comment,
      timestamp: intent.timestamp + 3,
    }))
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, 120);
}
