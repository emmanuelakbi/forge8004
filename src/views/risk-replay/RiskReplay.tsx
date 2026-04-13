import { cn } from "../../utils/cn";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AggregatedAgentView,
  TradeIntent,
  AgentCheckpoint,
} from "../../lib/types";
import { erc8004Client } from "@/app/lib/erc8004Client";
import { subscribeToAuthState, User } from "@/app/lib/firebase";
import { formatEnumLabel } from "../../utils/format";
import {
  Play,
  Pause,
  SkipForward,
  ChevronDown,
  Shield,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";

type ReplayEvent = {
  id: string;
  timestamp: number;
  type:
    | "ENTRY"
    | "EXIT"
    | "STOP_MOVE"
    | "RISK_BLOCK"
    | "KILL_SWITCH"
    | "TRAILING_STOP"
    | "SYSTEM_HOLD";
  title: string;
  detail: string;
  side?: "BUY" | "SELL" | "HOLD";
  asset?: string;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  pnl?: number;
  capitalAfter?: number;
  tone: "positive" | "negative" | "neutral" | "warning";
};

function buildReplayEvents(
  intents: TradeIntent[],
  checkpoints: AgentCheckpoint[],
): ReplayEvent[] {
  const events: ReplayEvent[] = [];

  for (const intent of intents) {
    if (intent.artifactType === "RISK_BLOCK") {
      events.push({
        id: intent.intentId || `block-${intent.timestamp}`,
        timestamp: intent.timestamp,
        type: intent.riskCheck?.comment?.toLowerCase().includes("kill")
          ? "KILL_SWITCH"
          : "RISK_BLOCK",
        title: `Risk Block — ${intent.asset} ${intent.side}`,
        detail:
          intent.reason ||
          intent.riskCheck?.comment ||
          "Trade blocked by risk router.",
        side: intent.side,
        asset: intent.asset,
        price: intent.entryPrice,
        capitalAfter: intent.capitalAvailableAfter,
        tone: "negative",
      });
    } else if (intent.artifactType === "SYSTEM_HOLD") {
      events.push({
        id: intent.intentId || `hold-${intent.timestamp}`,
        timestamp: intent.timestamp,
        type: "SYSTEM_HOLD",
        title: `System Hold — ${intent.engine || "Engine"}`,
        detail: intent.reason || "Agent paused or reconfigured.",
        asset: intent.asset,
        capitalAfter: intent.capitalAvailableAfter,
        tone: "warning",
      });
    } else if (
      intent.artifactType === "POSITION_CLOSE" ||
      intent.status === "CLOSED" ||
      intent.status === "HIT_TP" ||
      intent.status === "HIT_SL"
    ) {
      const pnl =
        intent.execution?.realizedPnl ??
        (intent.exitPrice && intent.entryPrice
          ? (intent.exitPrice - intent.entryPrice) * intent.size
          : undefined);
      events.push({
        id: intent.intentId || `exit-${intent.timestamp}`,
        timestamp: intent.timestamp,
        type: intent.trailingStopActive ? "TRAILING_STOP" : "EXIT",
        title: `${intent.status === "HIT_SL" ? "Stop Loss Hit" : intent.status === "HIT_TP" ? "Take Profit Hit" : intent.trailingStopActive ? "Trailing Stop Exit" : "Position Closed"} — ${intent.asset}`,
        detail:
          intent.reason || `Exited at $${intent.exitPrice?.toFixed(2) || "?"}`,
        side: intent.side,
        asset: intent.asset,
        price: intent.exitPrice || intent.entryPrice,
        stopLoss: intent.currentStopLoss,
        takeProfit: intent.takeProfit,
        pnl,
        capitalAfter: intent.capitalAvailableAfter,
        tone: pnl != null ? (pnl >= 0 ? "positive" : "negative") : "neutral",
      });
    } else if (
      intent.artifactType === "TRADE_INTENT" &&
      intent.status === "OPEN"
    ) {
      events.push({
        id: intent.intentId || `entry-${intent.timestamp}`,
        timestamp: intent.timestamp,
        type: "ENTRY",
        title: `${intent.side} ${intent.asset} — Entry`,
        detail:
          intent.reason ||
          `Entered at $${intent.entryPrice?.toFixed(2) || "?"}`,
        side: intent.side,
        asset: intent.asset,
        price: intent.entryPrice,
        stopLoss: intent.stopLoss,
        takeProfit: intent.takeProfit,
        capitalAfter: intent.capitalAvailableAfter,
        tone: "neutral",
      });
    }
  }

  // Add checkpoint-based events for risk reviews
  for (const cp of checkpoints) {
    if (cp.status === "BLOCKED") {
      const exists = events.some(
        (e) =>
          Math.abs(e.timestamp - cp.timestamp) < 2000 &&
          e.type === "RISK_BLOCK",
      );
      if (!exists) {
        events.push({
          id: cp.id,
          timestamp: cp.timestamp,
          type: "RISK_BLOCK",
          title: cp.title,
          detail: cp.detail,
          asset: cp.asset,
          side: cp.side,
          capitalAfter: cp.capitalAvailableAfter,
          tone: "negative",
        });
      }
    }
  }

  return events.sort((a, b) => a.timestamp - b.timestamp);
}

const toneStyles = {
  positive: {
    border: "border-emerald-cyber/30",
    bg: "bg-emerald-cyber/5",
    dot: "bg-emerald-cyber",
    text: "text-emerald-cyber",
  },
  negative: {
    border: "border-red-400/30",
    bg: "bg-red-400/5",
    dot: "bg-red-400",
    text: "text-red-400",
  },
  warning: {
    border: "border-amber-warning/30",
    bg: "bg-amber-warning/5",
    dot: "bg-amber-warning",
    text: "text-amber-warning",
  },
  neutral: {
    border: "border-border-subtle",
    bg: "bg-obsidian/40",
    dot: "bg-zinc-500",
    text: "text-zinc-400",
  },
};

const typeIcons = {
  ENTRY: TrendingUp,
  EXIT: TrendingDown,
  STOP_MOVE: ArrowRight,
  RISK_BLOCK: AlertTriangle,
  KILL_SWITCH: AlertTriangle,
  TRAILING_STOP: Shield,
  SYSTEM_HOLD: Pause,
};

export default function RiskReplay() {
  const [agents, setAgents] = useState<AggregatedAgentView[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [events, setEvents] = useState<ReplayEvent[]>([]);
  const [playIndex, setPlayIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [filter, setFilter] = useState<"all" | "risk" | "trades">("all");

  useEffect(() => {
    const unsub = subscribeToAuthState((u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !user) {
      setAgents([]);
      setLoading(false);
      return;
    }
    erc8004Client
      .getAllAgents()
      .then((data) => {
        setAgents(data);
        if (data.length > 0) setSelectedAgentId(data[0].identity.agentId);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [authReady, user]);

  useEffect(() => {
    if (!selectedAgentId) return;
    setLoadingEvents(true);
    setPlayIndex(-1);
    setPlaying(false);
    Promise.all([
      erc8004Client.getTradeIntents(selectedAgentId),
      erc8004Client.getCheckpoints(selectedAgentId),
    ])
      .then(([intents, checkpoints]) => {
        setEvents(buildReplayEvents(intents, checkpoints));
        setLoadingEvents(false);
      })
      .catch(() => setLoadingEvents(false));
  }, [selectedAgentId]);

  // Auto-play
  useEffect(() => {
    if (!playing || playIndex >= events.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setPlayIndex((i) => i + 1), 1200);
    return () => clearTimeout(timer);
  }, [playing, playIndex, events.length]);

  const filtered = events.filter((e) => {
    if (filter === "risk")
      return [
        "RISK_BLOCK",
        "KILL_SWITCH",
        "TRAILING_STOP",
        "SYSTEM_HOLD",
      ].includes(e.type);
    if (filter === "trades") return ["ENTRY", "EXIT"].includes(e.type);
    return true;
  });

  const visibleEvents =
    playIndex >= 0
      ? filtered.slice(
          0,
          filtered.findIndex((_, i) => {
            const originalIdx = events.indexOf(filtered[i]);
            return originalIdx > playIndex;
          }) || filtered.length,
        )
      : filtered;

  const riskBlockCount = events.filter(
    (e) => e.type === "RISK_BLOCK" || e.type === "KILL_SWITCH",
  ).length;
  const trailingStopSaves = events.filter(
    (e) => e.type === "TRAILING_STOP" && (e.pnl ?? 0) > 0,
  );
  const totalSaved = trailingStopSaves.reduce((s, e) => s + (e.pnl || 0), 0);

  if (loading)
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-2 border-emerald-cyber/20 border-t-emerald-cyber animate-spin mb-4" />
        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em] animate-pulse">
          Loading...
        </p>
      </div>
    );

  if (!user)
    return (
      <div className="page-shell">
        <div className="glass-panel p-12 text-center border border-emerald-cyber/20">
          <p className="text-sm font-mono text-zinc-400 uppercase">
            Sign in to view risk replays.
          </p>
        </div>
      </div>
    );

  return (
    <div className="page-shell space-y-8">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-emerald-cyber" />
            <span className="text-[10px] font-mono text-emerald-cyber uppercase tracking-widest">
              Protocol // Risk Event Replay
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-mono font-bold text-white tracking-tighter uppercase">
            Risk <span className="text-emerald-cyber">Replay</span>
          </h1>
          <p className="text-zinc-500 text-xs font-mono mt-2 uppercase tracking-wider">
            Step through every trade, risk block, and stop-loss event in
            chronological order.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Agent selector */}
        <div className="relative">
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="appearance-none bg-obsidian border border-border-subtle text-zinc-300 font-mono text-[10px] uppercase tracking-wider px-4 py-2 pr-8 focus:outline-none focus:border-emerald-cyber/40"
          >
            {agents.map((a) => (
              <option key={a.identity.agentId} value={a.identity.agentId}>
                {a.identity.name} — {formatEnumLabel(a.identity.strategyType)}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600 pointer-events-none" />
        </div>

        {/* Filter */}
        <div className="flex gap-1">
          {(["all", "risk", "trades"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-2 font-mono text-[10px] uppercase tracking-wider border transition-all",
                filter === f
                  ? "border-emerald-cyber/40 bg-emerald-cyber/10 text-emerald-cyber"
                  : "border-border-subtle text-zinc-500 hover:border-zinc-600",
              )}
            >
              {f === "all"
                ? "All Events"
                : f === "risk"
                  ? "Risk Only"
                  : "Trades Only"}
            </button>
          ))}
        </div>

        {/* Playback */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => {
              setPlayIndex(0);
              setPlaying(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 border border-emerald-cyber/30 text-emerald-cyber font-mono text-[10px] uppercase tracking-wider hover:bg-emerald-cyber/10 transition-all"
          >
            <Play className="w-3 h-3" /> Replay
          </button>
          <button
            onClick={() => setPlaying(!playing)}
            disabled={events.length === 0}
            className="px-3 py-2 border border-border-subtle text-zinc-400 font-mono text-[10px] uppercase hover:border-zinc-600 transition-all disabled:opacity-30"
          >
            {playing ? (
              <Pause className="w-3 h-3" />
            ) : (
              <SkipForward className="w-3 h-3" />
            )}
          </button>
          <button
            onClick={() => {
              setPlayIndex(-1);
              setPlaying(false);
            }}
            className="px-3 py-2 border border-border-subtle text-zinc-500 font-mono text-[10px] uppercase hover:border-zinc-600 transition-all"
          >
            Show All
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border-subtle">
        {[
          {
            label: "Total Events",
            value: events.length.toString(),
            sub: `${filtered.length} shown`,
          },
          {
            label: "Risk Blocks",
            value: riskBlockCount.toString(),
            sub: riskBlockCount > 0 ? "capital protected" : "none triggered",
            accent: riskBlockCount === 0,
          },
          {
            label: "Trailing Stop Saves",
            value: trailingStopSaves.length.toString(),
            sub:
              trailingStopSaves.length > 0
                ? `+$${totalSaved.toFixed(2)} saved`
                : "none yet",
            accent: trailingStopSaves.length > 0,
          },
          {
            label: "Entries / Exits",
            value: `${events.filter((e) => e.type === "ENTRY").length} / ${events.filter((e) => e.type === "EXIT" || e.type === "TRAILING_STOP").length}`,
            sub: "trade lifecycle",
          },
        ].map((s) => (
          <div key={s.label} className="bg-obsidian p-5">
            <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-2">
              {s.label}
            </p>
            <p
              className={cn(
                "text-xl font-mono font-bold tabular-nums",
                s.accent === true
                  ? "text-emerald-cyber"
                  : s.accent === false
                    ? "text-red-400"
                    : "text-white",
              )}
            >
              {s.value}
            </p>
            <p className="text-[9px] font-mono text-zinc-600 uppercase mt-1">
              {s.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Timeline */}
      {loadingEvents ? (
        <div className="p-8 text-center">
          <div className="w-8 h-8 border-2 border-emerald-cyber/20 border-t-emerald-cyber animate-spin mx-auto" />
        </div>
      ) : visibleEvents.length === 0 ? (
        <div className="glass-panel p-12 text-center border border-border-subtle">
          <p className="text-sm font-mono text-zinc-500 uppercase">
            No events found. Run a trading session first.
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border-subtle" />

          <div className="space-y-3">
            {visibleEvents.map((event, i) => {
              const style = toneStyles[event.tone];
              const Icon = typeIcons[event.type] || Shield;
              return (
                <div
                  key={event.id + i}
                  className={cn(
                    "relative pl-12 transition-all duration-300",
                    playing &&
                      i === visibleEvents.length - 1 &&
                      "animate-pulse",
                  )}
                >
                  {/* Dot on timeline */}
                  <div
                    className={cn(
                      "absolute left-[14px] top-4 w-3 h-3 border-2 border-obsidian z-10",
                      style.dot,
                    )}
                  />

                  <div className={cn("border p-4", style.border, style.bg)}>
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className={cn("w-4 h-4", style.text)} />
                        <span
                          className={cn(
                            "text-xs font-mono font-bold uppercase tracking-wider",
                            style.text,
                          )}
                        >
                          {event.title}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-zinc-600 tabular-nums">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-[11px] font-mono text-zinc-400 leading-relaxed mb-3">
                      {event.detail}
                    </p>

                    <div className="flex flex-wrap gap-4 text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
                      {event.asset && (
                        <span>
                          Asset:{" "}
                          <span className="text-zinc-300">{event.asset}</span>
                        </span>
                      )}
                      {event.price != null && (
                        <span>
                          Price:{" "}
                          <span className="text-zinc-300">
                            ${event.price.toFixed(2)}
                          </span>
                        </span>
                      )}
                      {event.stopLoss != null && (
                        <span>
                          SL:{" "}
                          <span className="text-zinc-300">
                            ${event.stopLoss.toFixed(2)}
                          </span>
                        </span>
                      )}
                      {event.takeProfit != null && (
                        <span>
                          TP:{" "}
                          <span className="text-zinc-300">
                            ${event.takeProfit.toFixed(2)}
                          </span>
                        </span>
                      )}
                      {event.pnl != null && (
                        <span>
                          PnL:{" "}
                          <span
                            className={
                              event.pnl >= 0
                                ? "text-emerald-cyber"
                                : "text-red-400"
                            }
                          >
                            {event.pnl >= 0 ? "+" : ""}${event.pnl.toFixed(2)}
                          </span>
                        </span>
                      )}
                      {event.capitalAfter != null && (
                        <span>
                          Capital:{" "}
                          <span className="text-zinc-300">
                            ${event.capitalAfter.toFixed(2)}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
