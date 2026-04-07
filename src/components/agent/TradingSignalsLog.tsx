import { useEffect, useMemo, useState } from "react";
import {
  formatCurrency,
  formatEnumLabel,
  truncateHex,
} from "../../utils/format";
import { cn } from "../../utils/cn";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cpu,
  History,
  Search,
  Shield,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { normalizeAiMessage } from "../../utils/aiMessage";
import { TradeIntent } from "../../lib/types";
import { getCommittedCapital } from "../../services/trustArtifacts";

type TradingSignalsLogProps = {
  intents: TradeIntent[];
  totalTreasury: number;
  lastScanTime: number | null;
};

export default function TradingSignalsLog({
  intents,
  totalTreasury,
  lastScanTime,
}: TradingSignalsLogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const filteredIntents = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return intents;

    return intents.filter((intent) => {
      const haystack = [
        intent.intentId,
        intent.side,
        intent.asset,
        intent.engine,
        intent.reason,
        intent.artifactType,
        intent.status,
        intent.execution?.status,
        intent.execution?.rejectionReason,
        intent.riskCheck?.comment,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [intents, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredIntents.length / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, intents.length]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const visibleIntents = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredIntents.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredIntents]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-emerald-cyber" />
          <h2 className="text-[10px] font-mono font-bold text-white uppercase tracking-[0.2em]">
            Trading Signals Log
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {lastScanTime && lastScanTime > 0 && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-zinc-600" />
              <span className="text-[8px] font-mono text-zinc-600 uppercase">
                Last Scan: {new Date(lastScanTime).toLocaleTimeString()}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-emerald-cyber rounded-full" />
            <span className="text-[8px] font-mono text-zinc-500 uppercase">
              Live Telemetry
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search signals"
            className="w-full border border-border-subtle bg-obsidian/50 py-2 pl-9 pr-3 text-[9px] font-mono uppercase tracking-widest text-zinc-300 outline-none transition-colors placeholder:text-zinc-700 focus:border-emerald-cyber/30"
          />
        </div>
        <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-[0.18em]">
          Showing{" "}
          {filteredIntents.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}-
          {Math.min(filteredIntents.length, currentPage * pageSize)} of{" "}
          {filteredIntents.length}
        </p>
      </div>

      <div className="glass-panel p-3 sm:p-6 space-y-4 relative min-h-[300px] sm:min-h-[400px] max-h-[600px] overflow-y-auto custom-scrollbar">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-cyber/20 to-transparent sticky top-0 z-10" />

        {filteredIntents.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="w-12 h-px bg-zinc-800 animate-pulse" />
            <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-[0.3em]">
              {searchQuery
                ? "No matching signals found"
                : "Waiting for AI Signal Broadcast..."}
            </p>
          </div>
        )}

        <div className="space-y-4">
          {visibleIntents.map((intent) => {
            const isHoldDecision = intent.side === "HOLD";
            const isTimedReviewKeepOpen =
              intent.artifactType === "SYSTEM_HOLD" &&
              typeof intent.reason === "string" &&
              intent.reason
                .toLowerCase()
                .includes("stayed open after its timed review");
            const isTimedReviewClose =
              intent.artifactType === "POSITION_CLOSE" &&
              intent.engine === "RISK_ROUTER_REASSESSMENT";
            const isTrailingStopActivated =
              intent.artifactType === "SYSTEM_HOLD" &&
              intent.engine === "RISK_ROUTER_TRAILING_STOP" &&
              typeof intent.reason === "string" &&
              intent.reason.toLowerCase().includes("trailing stop activated");
            const isTrailingStopRaised =
              intent.artifactType === "SYSTEM_HOLD" &&
              intent.engine === "RISK_ROUTER_TRAILING_STOP" &&
              typeof intent.reason === "string" &&
              intent.reason.toLowerCase().includes("trailing stop raised");
            const isTrailingStopClosed =
              intent.artifactType === "POSITION_CLOSE" &&
              intent.engine === "RISK_ROUTER_TRAILING_STOP";
            const isGridInitialized =
              intent.artifactType === "SYSTEM_HOLD" &&
              intent.engine === "SPOT_GRID_BOT_INIT";
            const isGridRebuilt =
              intent.artifactType === "SYSTEM_HOLD" &&
              intent.engine === "SPOT_GRID_BOT_REBUILD";
            const isGridPaused =
              intent.artifactType === "SYSTEM_HOLD" &&
              intent.engine === "SPOT_GRID_BOT_PAUSE";
            const isGridBuyFilled =
              intent.artifactType === "TRADE_INTENT" &&
              intent.engine === "SPOT_GRID_BOT";
            const isGridSellFilled =
              intent.artifactType === "POSITION_CLOSE" &&
              intent.engine === "SPOT_GRID_BOT";
            const displayAsset = isHoldDecision ? "SYSTEM" : intent.asset;
            const displayReason = normalizeAiMessage(intent.reason);
            const hasTargets =
              typeof intent.takeProfit === "number" ||
              typeof intent.stopLoss === "number";
            const artifactLabel = formatEnumLabel(
              intent.artifactType ||
                (isHoldDecision ? "SYSTEM_HOLD" : "TRADE_INTENT"),
            );
            const riskStatus =
              intent.riskCheck?.status ||
              (isHoldDecision ? "SAFE_HOLD" : "APPROVED");
            const capitalCommitted = getCommittedCapital(intent);
            const utilizationPct =
              intent.riskCheck?.capitalUtilizationPct ??
              (totalTreasury > 0
                ? (capitalCommitted / totalTreasury) * 100
                : 0);
            const maxAllowedNotional =
              intent.riskCheck?.maxAllowedNotional ?? 0;
            const requestedOverLimit = Math.max(
              0,
              capitalCommitted - maxAllowedNotional,
            );
            const blockedByCapitalLimit =
              riskStatus === "BLOCKED" &&
              maxAllowedNotional > 0 &&
              capitalCommitted > maxAllowedNotional;
            const blockedSummary = blockedByCapitalLimit
              ? `The AI asked to use ${formatCurrency(capitalCommitted)}, but this agent can only use ${formatCurrency(maxAllowedNotional)} on one trade right now.`
              : displayReason;
            const blockedFootnote = blockedByCapitalLimit
              ? `That request was ${formatCurrency(requestedOverLimit)} above the current limit, so no money was deployed.`
              : "The router rejected the idea before any capital was moved.";

            return (
              <div
                key={
                  intent.intentId ||
                  `${intent.timestamp}-${intent.side}-${intent.size}`
                }
                className="bg-obsidian/40 p-3 sm:p-5 border border-border-subtle group hover:border-emerald-cyber/40 transition-all duration-300 relative overflow-hidden min-w-0"
              >
                <div
                  className={cn(
                    "absolute top-0 left-0 w-1 h-full",
                    riskStatus === "BLOCKED"
                      ? "bg-amber-warning"
                      : intent.status === "HIT_TP"
                        ? "bg-emerald-cyber"
                        : intent.status === "HIT_SL"
                          ? "bg-red-500"
                          : intent.status === "EXECUTED"
                            ? "bg-emerald-cyber/30"
                            : "bg-zinc-800",
                  )}
                />

                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 text-[8px] font-mono uppercase tracking-widest border border-border-subtle text-zinc-400 bg-zinc-950/70">
                      {artifactLabel}
                    </span>
                    {intent.intentId && (
                      <span className="text-[8px] font-mono uppercase tracking-widest text-zinc-700">
                        {intent.intentId}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "px-2 py-0.5 text-[8px] font-mono uppercase tracking-widest border",
                        riskStatus === "APPROVED" &&
                          "border-emerald-cyber/30 text-emerald-cyber bg-emerald-cyber/5",
                        riskStatus === "SAFE_HOLD" &&
                          "border-zinc-700 text-zinc-400 bg-zinc-900",
                        riskStatus === "BLOCKED" &&
                          "border-amber-warning/30 text-amber-warning bg-amber-warning/5",
                      )}
                    >
                      Risk {formatEnumLabel(riskStatus)}
                    </span>
                    {intent.engine && (
                      <span className="text-[8px] font-mono uppercase tracking-widest text-zinc-600">
                        {formatEnumLabel(intent.engine)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div className="space-y-2 w-full sm:w-auto">
                    <div className="flex flex-wrap items-center gap-3">
                      <div
                        className={cn(
                          "px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-widest",
                          intent.side === "BUY"
                            ? "bg-emerald-cyber/10 text-emerald-cyber"
                            : intent.side === "SELL"
                              ? "bg-red-500/10 text-red-500"
                              : "bg-zinc-800 text-zinc-400",
                        )}
                      >
                        {intent.side}
                      </div>
                      <span className="text-xs font-mono text-white font-bold tracking-wider">
                        {displayAsset}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {intent.side === "HOLD" && (
                          <Shield className="w-3 h-3 text-zinc-500" />
                        )}
                        {intent.status === "EXECUTED" && (
                          <CheckCircle2 className="w-3 h-3 text-emerald-cyber/50" />
                        )}
                        {intent.status === "HIT_TP" && (
                          <TrendingUp className="w-3 h-3 text-emerald-cyber" />
                        )}
                        {intent.status === "HIT_SL" && (
                          <TrendingDown className="w-3 h-3 text-red-500" />
                        )}
                        {riskStatus === "BLOCKED" && (
                          <AlertCircle className="w-3 h-3 text-amber-warning" />
                        )}
                        {intent.status === "PENDING" && (
                          <Clock className="w-3 h-3 text-zinc-500" />
                        )}

                        <span
                          className={cn(
                            "text-[9px] font-mono uppercase tracking-widest font-bold",
                            riskStatus === "BLOCKED"
                              ? "text-amber-warning"
                              : intent.side === "HOLD"
                                ? "text-zinc-500"
                                : intent.status === "EXECUTED"
                                  ? "text-emerald-cyber/50"
                                  : intent.status === "HIT_TP"
                                    ? "text-emerald-cyber"
                                    : intent.status === "HIT_SL"
                                      ? "text-red-500"
                                      : "text-zinc-600",
                          )}
                        >
                          {isTimedReviewKeepOpen
                            ? "REVIEWED / KEPT OPEN"
                            : isTimedReviewClose
                              ? "REVIEWED / CLOSED"
                              : isGridInitialized
                                ? "GRID / INITIALIZED"
                                : isGridRebuilt
                                  ? "GRID / REBUILT"
                                  : isGridPaused
                                    ? "GRID / PAUSED"
                                    : isGridBuyFilled
                                      ? "GRID / BUY FILLED"
                                      : isGridSellFilled
                                        ? "GRID / SELL FILLED"
                                        : isTrailingStopActivated
                                          ? "TRAILING / ACTIVATED"
                                          : isTrailingStopRaised
                                            ? "TRAILING / RAISED"
                                            : isTrailingStopClosed
                                              ? "TRAILING / CLOSED"
                                              : riskStatus === "BLOCKED"
                                                ? "RISK BLOCKED"
                                                : intent.side === "HOLD"
                                                  ? "DECISION: HOLD"
                                                  : formatEnumLabel(
                                                      intent.status,
                                                    )}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-mono text-zinc-500 uppercase tracking-tight">
                      <span>
                        Size:{" "}
                        <span className="text-zinc-300">{intent.size}</span>
                      </span>
                      <span className="hidden sm:block w-1 h-1 bg-zinc-800 rounded-full" />
                      <span>
                        Capital:{" "}
                        <span className="text-zinc-300">
                          {formatCurrency(capitalCommitted)}
                        </span>
                      </span>
                      {!isHoldDecision && (
                        <>
                          <span className="hidden sm:block w-1 h-1 bg-zinc-800 rounded-full" />
                          <span>
                            Entry:{" "}
                            <span className="text-zinc-300">
                              {formatCurrency(intent.entryPrice)}
                            </span>
                          </span>
                        </>
                      )}
                      {intent.exitPrice && (
                        <>
                          <span className="hidden sm:block w-1 h-1 bg-zinc-800 rounded-full" />
                          <span>
                            Exit:{" "}
                            <span
                              className={cn(
                                intent.status === "HIT_TP"
                                  ? "text-emerald-cyber"
                                  : "text-red-500",
                              )}
                            >
                              {formatCurrency(intent.exitPrice)}
                            </span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <p className="text-[10px] font-mono text-zinc-600 tabular-nums">
                      {new Date(intent.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </p>
                    <p className="text-[8px] font-mono text-zinc-800 uppercase mt-1">
                      {new Date(intent.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {riskStatus === "BLOCKED" && !isHoldDecision && (
                  <div className="mb-4 border border-amber-warning/20 bg-amber-warning/5 p-3 sm:p-4 space-y-2">
                    <p className="text-[8px] font-mono text-amber-warning uppercase tracking-[0.18em]">
                      Why This Was Blocked
                    </p>
                    <p className="text-[11px] font-mono text-zinc-200 leading-relaxed">
                      {blockedSummary}
                    </p>
                    <p className="text-[9px] font-mono text-zinc-500 leading-relaxed">
                      {blockedFootnote}
                    </p>
                  </div>
                )}

                {(isTimedReviewKeepOpen || isTimedReviewClose) && (
                  <div
                    className={cn(
                      "mb-4 border p-3 sm:p-4 space-y-2",
                      isTimedReviewKeepOpen
                        ? "border-emerald-cyber/20 bg-emerald-cyber/5"
                        : "border-zinc-700/70 bg-zinc-900/60",
                    )}
                  >
                    <p
                      className={cn(
                        "text-[8px] font-mono uppercase tracking-[0.18em]",
                        isTimedReviewKeepOpen
                          ? "text-emerald-cyber"
                          : "text-zinc-300",
                      )}
                    >
                      Timed Review Outcome
                    </p>
                    <p className="text-[11px] font-mono text-zinc-200 leading-relaxed">
                      {isTimedReviewKeepOpen
                        ? "The trade reached its review checkpoint, the setup still looked strong, and the agent kept it open."
                        : "The trade reached its review checkpoint, the setup no longer looked strong enough, and the agent closed it."}
                    </p>
                  </div>
                )}

                {(isGridInitialized ||
                  isGridRebuilt ||
                  isGridPaused ||
                  isGridBuyFilled ||
                  isGridSellFilled) && (
                  <div
                    className={cn(
                      "mb-4 border p-3 sm:p-4 space-y-2",
                      isGridBuyFilled || isGridSellFilled
                        ? "border-emerald-cyber/20 bg-emerald-cyber/5"
                        : "border-zinc-700/70 bg-zinc-900/60",
                    )}
                  >
                    <p
                      className={cn(
                        "text-[8px] font-mono uppercase tracking-[0.18em]",
                        isGridBuyFilled || isGridSellFilled
                          ? "text-emerald-cyber"
                          : "text-zinc-300",
                      )}
                    >
                      Spot Grid Bot
                    </p>
                    <p className="text-[11px] font-mono text-zinc-200 leading-relaxed">
                      {isGridInitialized
                        ? "The bot created a bounded spot ladder and is now waiting for lower buy levels or higher sell levels to get touched."
                        : isGridRebuilt
                          ? "Price moved outside the old ladder, so the bot rebuilt a fresh grid around the new market area."
                          : isGridPaused
                            ? "Price left the active range in a way that was not safe to rebuild immediately, so the ladder paused."
                            : isGridBuyFilled
                              ? "A lower buy level in the grid filled, so the bot opened that spot leg and armed its paired sell level above."
                              : "A paired sell level filled, so the bot closed that ladder leg and captured grid profit inside the range."}
                    </p>
                  </div>
                )}

                {(isTrailingStopActivated ||
                  isTrailingStopRaised ||
                  isTrailingStopClosed) && (
                  <div
                    className={cn(
                      "mb-4 border p-3 sm:p-4 space-y-2",
                      isTrailingStopClosed
                        ? "border-emerald-cyber/25 bg-emerald-cyber/5"
                        : "border-emerald-cyber/15 bg-zinc-950/60",
                    )}
                  >
                    <p className="text-[8px] font-mono uppercase tracking-[0.18em] text-emerald-cyber">
                      Trailing Stop Status
                    </p>
                    <p className="text-[11px] font-mono text-zinc-200 leading-relaxed">
                      {isTrailingStopActivated
                        ? "The trade moved clearly into profit, so a trailing stop was armed to start protecting gains."
                        : isTrailingStopRaised
                          ? "Price kept moving in the trade’s favor, so the trailing stop was tightened to protect more of the open profit."
                          : "The trailing stop was hit, so the position closed and kept part of the profit instead of giving it back."}
                    </p>
                  </div>
                )}

                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div className="min-w-0 bg-zinc-950/70 border border-border-subtle/40 p-3 sm:p-4 space-y-1.5">
                    <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                      Setup Risk
                    </p>
                    <p className="text-[11px] sm:text-[12px] font-mono text-white font-bold break-words">
                      {intent.riskCheck?.score ?? intent.validation?.score ?? 0}
                      /100
                    </p>
                  </div>
                  <div className="min-w-0 bg-zinc-950/70 border border-border-subtle/40 p-3 sm:p-4 space-y-1.5">
                    <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                      Max Allowed
                    </p>
                    <p className="text-[11px] sm:text-[12px] font-mono text-white font-bold break-words">
                      {formatCurrency(maxAllowedNotional)}
                    </p>
                  </div>
                  <div className="min-w-0 bg-zinc-950/70 border border-border-subtle/40 p-3 sm:p-4 space-y-1.5">
                    <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                      Portfolio Load
                    </p>
                    <p className="text-[11px] sm:text-[12px] font-mono text-white font-bold break-words">
                      {utilizationPct.toFixed(1)}%
                    </p>
                  </div>
                  <div className="min-w-0 bg-zinc-950/70 border border-border-subtle/40 p-3 sm:p-4 space-y-1.5">
                    <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                      Available Funds
                    </p>
                    <div className="space-y-1.5 text-[11px] sm:text-[12px] font-mono font-bold text-white">
                      <p className="break-words">
                        {formatCurrency(intent.capitalAvailableBefore)}
                      </p>
                      <p className="text-zinc-600">-&gt;</p>
                      <p className="break-words">
                        {formatCurrency(intent.capitalAvailableAfter)}
                      </p>
                    </div>
                  </div>
                </div>

                {intent.policySnapshot && (
                  <div className="mb-4 p-3 bg-zinc-950/60 border border-border-subtle/30">
                    <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest mb-2">
                      Current Guardrails
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-[9px] font-mono uppercase tracking-widest text-zinc-500">
                      <span className="min-w-0">
                        Allocation Cap:{" "}
                        <span className="text-zinc-300">
                          {(intent.policySnapshot.allocationPct * 100).toFixed(
                            0,
                          )}
                          %
                        </span>
                      </span>
                      <span className="min-w-0">
                        Daily Loss Limit:{" "}
                        <span className="text-zinc-300">
                          {(
                            intent.policySnapshot.dailyLossLimitPct * 100
                          ).toFixed(0)}
                          %
                        </span>
                      </span>
                      <span className="min-w-0">
                        Max Opens:{" "}
                        <span className="text-zinc-300">
                          {intent.policySnapshot.maxOpenPositions}
                        </span>
                      </span>
                      <span className="min-w-0">
                        Kill Switch:{" "}
                        <span className="text-zinc-300">
                          {intent.policySnapshot.killSwitchDrawdownPct}%
                        </span>
                      </span>
                      <span className="min-w-0">
                        Mode:{" "}
                        <span className="text-zinc-300">
                          {formatEnumLabel(intent.policySnapshot.executionMode)}
                        </span>
                      </span>
                      <span className="min-w-0 break-words">
                        Markets:{" "}
                        <span className="text-zinc-300">
                          {intent.policySnapshot.allowedAssets.join(" / ")}
                        </span>
                      </span>
                    </div>
                  </div>
                )}

                {intent.execution && (
                  <div className="mb-4 p-3 bg-zinc-950/60 border border-border-subtle/30 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                        Execution Result
                      </p>
                      <span
                        className={cn(
                          "text-[8px] font-mono uppercase tracking-widest",
                          intent.execution.status === "FILLED" &&
                            "text-emerald-cyber",
                          intent.execution.status === "CLOSED" && "text-white",
                          intent.execution.status === "REJECTED" &&
                            "text-amber-warning",
                          intent.execution.status === "NOT_EXECUTED" &&
                            "text-zinc-500",
                        )}
                      >
                        {formatEnumLabel(intent.execution.status)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-[9px] font-mono uppercase tracking-widest text-zinc-500">
                      <span className="min-w-0">
                        Settlement:{" "}
                        <span className="text-zinc-300">
                          {formatEnumLabel(intent.execution.settlement)}
                        </span>
                      </span>
                      <span className="min-w-0">
                        Venue:{" "}
                        <span className="text-zinc-300">
                          {formatEnumLabel(intent.execution.venue)}
                        </span>
                      </span>
                      <span className="min-w-0">
                        Mode:{" "}
                        <span className="text-zinc-300">
                          {formatEnumLabel(intent.execution.mode)}
                        </span>
                      </span>
                      {typeof intent.execution.fillPrice === "number" && (
                        <span className="min-w-0">
                          Fill:{" "}
                          <span className="text-zinc-300">
                            {formatCurrency(intent.execution.fillPrice)}
                          </span>
                        </span>
                      )}
                      {typeof intent.execution.realizedPnl === "number" && (
                        <span className="min-w-0">
                          Realized:{" "}
                          <span
                            className={cn(
                              intent.execution.realizedPnl >= 0
                                ? "text-emerald-cyber"
                                : "text-red-500",
                            )}
                          >
                            {intent.execution.realizedPnl >= 0 ? "+" : "-"}
                            {formatCurrency(
                              Math.abs(intent.execution.realizedPnl),
                            )}
                          </span>
                        </span>
                      )}
                      {intent.execution.rejectionReason && (
                        <span className="min-w-0 break-words">
                          Reason:{" "}
                          <span className="text-amber-warning">
                            {formatEnumLabel(intent.execution.rejectionReason)}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {intent.signature && intent.signer && (
                  <div className="mb-4 p-3 bg-zinc-950/60 border border-border-subtle/30 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                        Signed Intent Envelope
                      </p>
                      <span className="text-[8px] font-mono uppercase tracking-widest text-emerald-cyber">
                        {formatEnumLabel(intent.signature.status)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest mb-1">
                          Agent Wallet
                        </p>
                        <p className="text-[10px] font-mono text-zinc-300 uppercase break-all">
                          {intent.signer.agentWallet}
                        </p>
                      </div>
                      <div>
                        <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest mb-1">
                          Signature Digest
                        </p>
                        <p className="text-[10px] font-mono text-zinc-300 uppercase break-all">
                          {truncateHex(intent.signature.digest)}
                        </p>
                      </div>
                    </div>
                    {intent.typedIntent && (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-[9px] font-mono uppercase tracking-widest text-zinc-500">
                        <span className="min-w-0">
                          Primary Type:{" "}
                          <span className="text-zinc-300">
                            {intent.typedIntent.primaryType}
                          </span>
                        </span>
                        <span className="min-w-0">
                          Chain:{" "}
                          <span className="text-zinc-300">
                            {intent.typedIntent.domain.chainId}
                          </span>
                        </span>
                        <span className="min-w-0 sm:col-span-2">
                          Verifier:{" "}
                          <span className="text-zinc-300">
                            {truncateHex(
                              intent.typedIntent.domain.verifyingContract,
                            )}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {hasTargets ? (
                  <div className="grid grid-cols-1 gap-4 p-3 bg-obsidian/60 border border-border-subtle/30 rounded-sm">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                            Take Profit
                          </p>
                          <TrendingUp className="w-2.5 h-2.5 text-emerald-cyber/30" />
                        </div>
                        <p className="text-xs font-mono text-emerald-cyber font-bold tabular-nums">
                          {typeof intent.takeProfit === "number"
                            ? `$${intent.takeProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                            : "N/A"}
                        </p>
                        <div className="w-full h-0.5 bg-zinc-900 rounded-full overflow-hidden">
                          <div className="w-full h-full bg-emerald-cyber/20" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                            Initial Stop
                          </p>
                          <TrendingDown className="w-2.5 h-2.5 text-red-500/30" />
                        </div>
                        <p className="text-xs font-mono text-red-400 font-bold tabular-nums">
                          {typeof (
                            intent.initialStopLoss ?? intent.stopLoss
                          ) === "number"
                            ? `$${(intent.initialStopLoss ?? intent.stopLoss)!.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                            : "N/A"}
                        </p>
                        <div className="w-full h-0.5 bg-zinc-900 rounded-full overflow-hidden">
                          <div className="w-full h-full bg-red-500/20" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                            Current Stop
                          </p>
                          <Shield className="w-2.5 h-2.5 text-emerald-cyber/30" />
                        </div>
                        <p className="text-xs font-mono text-white font-bold tabular-nums">
                          {typeof (
                            intent.currentStopLoss ??
                            intent.initialStopLoss ??
                            intent.stopLoss
                          ) === "number"
                            ? `$${(intent.currentStopLoss ?? intent.initialStopLoss ?? intent.stopLoss)!.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                            : "N/A"}
                        </p>
                        <div className="w-full h-0.5 bg-zinc-900 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "w-full h-full",
                              intent.trailingStopActive
                                ? "bg-emerald-cyber/30"
                                : "bg-zinc-700/40",
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="border border-border-subtle/30 bg-zinc-950/70 p-3">
                        <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                          Trailing Stop
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-[10px] font-mono font-bold uppercase tracking-widest",
                            intent.trailingStopActive
                              ? "text-emerald-cyber"
                              : "text-zinc-400",
                          )}
                        >
                          {intent.trailingStopActive
                            ? "Protecting"
                            : "Inactive"}
                        </p>
                        <p className="mt-1 text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                          {intent.trailingStopActive
                            ? "Armed after profit trigger"
                            : "Activates after +1.00% profit"}
                        </p>
                      </div>
                      <div className="border border-border-subtle/30 bg-zinc-950/70 p-3">
                        <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                          Profit Protected
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-[10px] font-mono font-bold uppercase tracking-widest",
                            (intent.profitProtected || 0) > 0
                              ? "text-emerald-cyber"
                              : "text-zinc-400",
                          )}
                        >
                          {(intent.profitProtected || 0) > 0
                            ? `+${formatCurrency(intent.profitProtected || 0)}`
                            : "0.00"}
                        </p>
                        <p className="mt-1 text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                          Locked in if the stop is hit now
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-obsidian/60 border border-border-subtle/30 rounded-sm">
                    <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                      No executable trade targets attached to this signal.
                    </p>
                  </div>
                )}

                {displayReason && (
                  <div className="mt-4 pt-4 border-t border-border-subtle/20 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 p-1 bg-emerald-cyber/5 rounded-sm shrink-0">
                        <Cpu className="w-3 h-3 text-emerald-cyber/40" />
                      </div>
                      <p className="text-[10px] font-mono text-zinc-400 leading-relaxed italic break-words whitespace-normal">
                        <span className="text-emerald-cyber/60 font-bold not-italic mr-2 uppercase tracking-tighter">
                          AI Logic:
                        </span>
                        "{displayReason}"
                      </p>
                    </div>
                    {intent.validation && (
                      <div className="flex items-start gap-3 bg-emerald-cyber/5 p-2 border-l-2 border-emerald-cyber/30">
                        <Shield className="w-3 h-3 text-emerald-cyber mt-0.5 shrink-0" />
                        <p className="text-[9px] font-mono text-emerald-cyber/80 leading-relaxed break-words whitespace-normal">
                          <span className="font-bold uppercase tracking-tighter mr-2">
                            Risk Router:
                          </span>
                          {intent.validation.comment} (Score:{" "}
                          {intent.validation.score})
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {filteredIntents.length > pageSize && (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-2 border border-border-subtle px-3 py-2 text-[9px] font-mono uppercase tracking-widest text-zinc-400 transition-colors hover:border-emerald-cyber/30 hover:text-emerald-cyber disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-3 w-3" />
            Prev
          </button>
          <div className="min-w-20 text-center text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500">
            Page {currentPage} / {totalPages}
          </div>
          <button
            type="button"
            onClick={() =>
              setCurrentPage((page) => Math.min(totalPages, page + 1))
            }
            disabled={currentPage === totalPages}
            className="flex items-center gap-2 border border-border-subtle px-3 py-2 text-[9px] font-mono uppercase tracking-widest text-zinc-400 transition-colors hover:border-emerald-cyber/30 hover:text-emerald-cyber disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </section>
  );
}
