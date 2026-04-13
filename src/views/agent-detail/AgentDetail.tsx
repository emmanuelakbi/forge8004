import {
  formatCurrency,
  formatEnumLabel,
  truncateHex,
} from "../../utils/format";
import { useMemo } from "react";
import { cn } from "../../utils/cn";
import dynamic from "next/dynamic";

const AgentPnLChart = dynamic(
  () => import("../../components/agent/AgentPnLChart"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[200px]">
        <div className="w-5 h-5 border-2 border-emerald-cyber/30 border-t-emerald-cyber rounded-full animate-spin" />
      </div>
    ),
  },
);
import ValidationTable from "../../components/agent/ValidationTable";
import {
  Play,
  Square,
  Activity,
  Shield,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Cpu,
  Wallet,
  History,
  AlertCircle,
  CheckCircle2,
  BrainCircuit,
  FileText,
  Trash2,
  Power,
  PowerOff,
  Clock,
} from "lucide-react";
import GridStatusPanel from "../../components/agent/GridStatusPanel";
import Link from "next/link";
import MarketFeed from "../../components/agent/MarketFeed";
import ValidationTimelinePanel from "../../components/agent/ValidationTimelinePanel";
import TradingSignalsLog from "../../components/agent/TradingSignalsLog";
import { CONFIG } from "../../lib/config";
import { aiService } from "../../services/aiService";
import { useAgentDetail } from "./useAgentDetail";
import {
  summarizeTimelineSequence,
  formatResumeTime,
  formatMinutesLabel,
  formatCountdownLabel,
  toCompactTime,
  SENTIMENT_REFRESH_INTERVAL_MS,
  ACTIVE_GROQ_MODEL_LABEL,
} from "./utils";

export default function AgentDetail() {
  const h = useAgentDetail();

  // All hooks must be called before any early returns (Rules of Hooks)
  const agent = h.agent;
  const deployedCapital = useMemo(
    () =>
      h.activePositions.reduce((sum, p) => sum + h.getCommittedCapital(p), 0),
    [h.activePositions],
  );
  const closedTradesCount = useMemo(
    () =>
      h.intents.filter(
        (intent) =>
          intent.artifactType === "POSITION_CLOSE" &&
          intent.execution?.settlement === "CLOSE_POSITION",
      ).length,
    [h.intents],
  );
  const totalTreasury = agent?.reputation.totalFunds || 0;
  const currentRiskPolicy = useMemo(
    () =>
      h.getRiskPolicy(agent?.identity.riskProfile || "balanced", totalTreasury),
    [agent?.identity.riskProfile, totalTreasury],
  );
  const executionProfile = useMemo(
    () =>
      h.getExecutionProfile(agent?.identity.strategyType || "range_trading"),
    [agent?.identity.strategyType],
  );
  const dailyLossUsed = useMemo(
    () => h.getDailyRealizedLoss(h.intents),
    [h.intents],
  );
  const dailyProfitUsed = useMemo(
    () => h.getDailyRealizedProfit(h.intents),
    [h.intents],
  );
  const allTimeRealizedProfit = useMemo(
    () => h.getAllTimeRealizedProfit(h.intents),
    [h.intents],
  );
  const allTimeRealizedLoss = useMemo(
    () => h.getAllTimeRealizedLoss(h.intents),
    [h.intents],
  );
  const allTimeNetRealizedPnl = useMemo(
    () => h.getAllTimeNetRealizedPnl(h.intents),
    [h.intents],
  );
  const isSpotGridBot = agent?.identity.strategyType === "spot_grid_bot";
  const { routerBlockedTrades, routerFilledTrades, routerClosedTrades } =
    useMemo(() => {
      // For grid bots, use grid runtime stats
      if (isSpotGridBot && h.gridRuntime) {
        const filled = h.gridRuntime.filledGridLegs || 0;
        const profitable = h.gridRuntime.profitableTradesCount || 0;
        return {
          routerBlockedTrades: 0,
          routerFilledTrades: filled,
          routerClosedTrades: profitable,
        };
      }
      const blocked = h.intents.filter(
        (i) => i.riskCheck?.status === "BLOCKED",
      ).length;
      const filledFromIntents = h.intents.filter(
        (i) => i.execution?.status === "FILLED",
      ).length;
      const closed = h.intents.filter(
        (i) => i.execution?.status === "CLOSED",
      ).length;
      // Use activePositions as ground truth for currently open fills
      const currentlyOpen = h.activePositions.length;
      return {
        routerBlockedTrades: blocked,
        routerFilledTrades: Math.max(currentlyOpen, filledFromIntents - closed),
        routerClosedTrades: closed,
      };
    }, [h.intents, isSpotGridBot, h.gridRuntime, h.activePositions]);
  const executionWallet = useMemo(
    () => (agent ? h.getAgentExecutionWallet(agent.identity) : "—"),
    [agent],
  );
  const groupedTimeline = useMemo(() => {
    const trustTimeline = h.buildTrustTimeline(h.intents, h.checkpoints);
    return Object.values(
      trustTimeline.reduce<
        Record<
          string,
          {
            key: string;
            nonce?: string;
            timestamp: number;
            events: typeof trustTimeline;
          }
        >
      >((groups, event) => {
        const key = event.nonce || event.intentId || event.id;
        const existing = groups[key];
        if (existing) {
          existing.events.push(event);
          if (event.timestamp > existing.timestamp)
            existing.timestamp = event.timestamp;
        } else {
          groups[key] = {
            key,
            nonce: event.nonce,
            timestamp: event.timestamp,
            events: [event],
          };
        }
        return groups;
      }, {}),
    )
      .map((group) => ({
        ...group,
        events: group.events.slice().sort((a, b) => a.timestamp - b.timestamp),
        summary: summarizeTimelineSequence(group.events),
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [h.intents, h.checkpoints]);
  const trustTimelineLength = useMemo(
    () => groupedTimeline.reduce((sum, g) => sum + g.events.length, 0),
    [groupedTimeline],
  );

  if (h.loading)
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-2 border-emerald-cyber/20 border-t-emerald-cyber animate-spin mb-4" />
        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em] animate-pulse">
          Accessing Node Data...
        </p>
      </div>
    );
  if (!h.authReady) return null;
  if (!h.user) {
    return (
      <div className="p-4 sm:p-8 max-w-4xl mx-auto">
        <section className="glass-panel p-8 sm:p-12 border border-emerald-cyber/20 bg-emerald-cyber/[0.03] space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-cyber animate-pulse" />
            <span className="text-[10px] font-mono text-emerald-cyber uppercase tracking-widest">
              Authentication Required
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-mono font-bold text-white uppercase tracking-tighter">
            Sign in to access this{" "}
            <span className="text-emerald-cyber">agent workspace</span>
          </h1>
          <p className="max-w-2xl text-[11px] sm:text-xs font-mono text-zinc-500 uppercase tracking-wider leading-relaxed">
            Agent details, validations, active positions, trading logs, and
            vault history are now private to the authenticated owner, so this
            screen stays locked until your session is available.
          </p>
        </section>
      </div>
    );
  }
  if (h.loadError && !agent) {
    return (
      <div className="p-4 sm:p-8 max-w-4xl mx-auto">
        <section className="glass-panel p-8 sm:p-12 border border-amber-warning/20 bg-amber-warning/[0.04] space-y-5">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-amber-warning" />
            <span className="text-[10px] font-mono text-amber-warning uppercase tracking-widest">
              Workspace Load Issue
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-mono font-bold text-white uppercase tracking-tighter">
            This agent page did not finish loading
          </h1>
          <p className="max-w-2xl text-[11px] sm:text-xs font-mono text-zinc-400 uppercase tracking-wider leading-relaxed">
            {h.loadError}
          </p>
        </section>
      </div>
    );
  }
  if (!agent)
    return (
      <div className="p-12 text-red-400 font-mono uppercase tracking-widest">
        Error: Entity not found in registry.
      </div>
    );

  const deployedRatio =
    totalTreasury > 0
      ? Math.min(100, (deployedCapital / totalTreasury) * 100)
      : 0;
  const dailyLossCap = totalTreasury * currentRiskPolicy.dailyLossLimitPct;
  const routerKillSwitch =
    agent.reputation.maxDrawdown >= currentRiskPolicy.killSwitchDrawdownPct;

  const marketSentimentLimited = h.marketSentimentState === "limited";
  const marketSentimentLoading = h.marketSentimentState === "loading";
  const marketSentimentHasLiveSnapshot = h.marketSentimentUpdatedAt !== null;
  const terminalNotice = h.walletAddress
    ? "Signed wallet mode is ready. Starting a session lets the agent review the market and record one sequence at a time."
    : "Test mode is active. The agent can analyze, open sandbox trades, and manage exits with simulated signatures until you choose to connect a wallet.";

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 sm:space-y-12">
      {h.loadError ? (
        <div className="border border-amber-warning/20 bg-amber-warning/[0.04] px-4 py-3 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-warning mt-0.5 shrink-0" />
          <p className="text-[10px] font-mono text-amber-warning uppercase tracking-wider leading-relaxed">
            {h.loadError}
          </p>
        </div>
      ) : null}
      {h.loadNotice ? (
        <div className="border border-zinc-700/70 bg-zinc-900/60 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
          <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider leading-relaxed">
            {h.loadNotice}
          </p>
        </div>
      ) : null}
      {/* Header Section */}
      <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start border-b border-border-subtle pb-8 md:pb-12">
        <div className="relative shrink-0">
          <img
            src={agent.identity.avatarUrl}
            alt={agent.identity.name}
            className="w-20 h-20 md:w-28 md:h-28 bg-obsidian border border-border-subtle p-1"
            referrerPolicy="no-referrer"
          />
          <div className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 w-5 h-5 md:w-6 md:h-6 bg-emerald-cyber flex items-center justify-center">
            <Cpu className="w-3 md:w-3.5 h-3 md:h-3.5 text-obsidian" />
          </div>
        </div>
        <div className="flex-1 space-y-4 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <h1 className="text-2xl md:text-4xl font-mono font-bold text-white tracking-tighter uppercase break-words">
              {agent.identity.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-1 border shrink-0",
                  agent.identity.status === "deactivated"
                    ? "bg-red-500/5 border-red-500/20"
                    : "bg-emerald-cyber/5 border-emerald-cyber/20",
                )}
              >
                <span
                  className={cn(
                    "text-[9px] font-mono uppercase tracking-widest",
                    agent.identity.status === "deactivated"
                      ? "text-red-400"
                      : "text-emerald-cyber",
                  )}
                >
                  Status:
                </span>
                <span
                  className={cn(
                    "text-[10px] font-mono font-bold uppercase",
                    agent.identity.status === "deactivated"
                      ? "text-red-400"
                      : "text-emerald-cyber",
                  )}
                >
                  {agent.identity.status === "deactivated"
                    ? "Deactivated"
                    : "Operational"}
                </span>
              </div>
              {h.user?.uid === agent.identity.owner ? (
                <>
                  <button
                    onClick={h.handleVaultFunding}
                    disabled={h.isFunding}
                    className={cn(
                      "px-4 py-1.5 font-mono font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shrink-0",
                      h.isFunding
                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
                        : "bg-emerald-cyber text-obsidian hover:bg-emerald-cyber/90",
                    )}
                  >
                    {h.isFunding ? (
                      <>
                        <div className="w-3 h-3 border border-zinc-500 border-t-transparent animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Wallet className="w-3.5 h-3.5" />
                        Request Capital
                      </>
                    )}
                  </button>
                  <Link
                    href={`/agents/${agent.identity.agentId}/trust-report`}
                    className="px-4 py-1.5 border border-emerald-cyber/20 text-emerald-cyber font-mono font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 shrink-0 hover:bg-emerald-cyber/10 transition-all"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Trust Report
                  </Link>
                  <button
                    onClick={() => {
                      if (agent.identity.status === "deactivated") {
                        h.handleReactivateAgent();
                      } else if (
                        !h.isDeactivating &&
                        window.confirm(
                          "Deactivate this agent? It will stop trading and be hidden from your dashboard. You can reactivate it later.",
                        )
                      ) {
                        h.handleDeactivateAgent();
                      }
                    }}
                    disabled={h.isDeactivating}
                    className={cn(
                      "px-4 py-1.5 border font-mono font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 shrink-0 transition-all",
                      h.isDeactivating
                        ? "border-zinc-700 text-zinc-500 cursor-not-allowed bg-zinc-800"
                        : agent.identity.status === "deactivated"
                          ? "border-emerald-cyber/20 text-emerald-cyber hover:bg-emerald-cyber/10"
                          : "border-red-500/20 text-red-400 hover:bg-red-500/10",
                    )}
                  >
                    {h.isDeactivating ? (
                      <>
                        <div className="w-3 h-3 border border-zinc-500 border-t-transparent animate-spin" />
                        {agent.identity.status === "deactivated"
                          ? "Reactivating..."
                          : "Deactivating..."}
                      </>
                    ) : agent.identity.status === "deactivated" ? (
                      <>
                        <Power className="w-3.5 h-3.5" />
                        Reactivate
                      </>
                    ) : (
                      <>
                        <PowerOff className="w-3.5 h-3.5" />
                        Deactivate
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-border-subtle shrink-0">
                  <AlertCircle className="w-3 h-3 text-zinc-500" />
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                    {!h.user ? "Auth required" : "Read-only"}
                  </span>
                </div>
              )}
            </div>
          </div>
          <p className="text-zinc-500 text-xs md:text-sm font-mono max-w-2xl leading-relaxed uppercase tracking-tight">
            {agent.identity.description}
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            {["ERC-8004", "AI-AGENT", agent.identity.strategyType].map(
              (tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 border border-border-subtle text-[8px] md:text-[9px] font-mono text-zinc-500 uppercase tracking-widest"
                >
                  {formatEnumLabel(tag)}
                </span>
              ),
            )}
            <span className="px-2 py-1 border border-border-subtle text-[8px] md:text-[9px] font-mono text-zinc-600 uppercase tracking-widest ml-auto">
              ID: 0x{agent.identity.agentId.padStart(4, "0")}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="bg-obsidian/40 border border-border-subtle px-3 py-3">
              <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest mb-1">
                Execution Wallet
              </p>
              <p className="text-[10px] font-mono text-zinc-300 uppercase tracking-tight break-all">
                {executionWallet}
              </p>
            </div>
            <div className="bg-obsidian/40 border border-border-subtle px-3 py-3">
              <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest mb-1">
                Connected Signer
              </p>
              <p className="text-[10px] font-mono text-zinc-300 uppercase tracking-tight break-all">
                {h.walletAddress || "NO WALLET CONNECTED"}
              </p>
            </div>
            <div className="bg-obsidian/40 border border-border-subtle px-3 py-3 sm:col-span-2">
              <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest mb-1">
                Typed Intent Domain
              </p>
              <p className="text-[10px] font-mono text-zinc-300 uppercase tracking-tight">
                Chain {CONFIG.CHAIN_ID} // Router{" "}
                {truncateHex(CONFIG.REGISTRIES.RISK_ROUTER)}
              </p>
            </div>
            <div className="bg-obsidian/40 border border-border-subtle px-3 py-3 sm:col-span-2">
              <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest mb-1">
                Nonce Sequence
              </p>
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-zinc-300 uppercase tracking-tight">
                  {h.runtimeState?.lastNonce || "NO NONCE RESERVED YET"}
                </p>
                <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                  {h.runtimeState
                    ? `${h.runtimeState.nonceCounter} intents reserved with replay protection`
                    : "Sequence initializes when the first intent is created"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-12">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border-subtle border border-border-subtle">
            {[
              {
                label: "Strategy",
                value: agent.identity.gridSubType
                  ? formatEnumLabel(agent.identity.gridSubType)
                  : formatEnumLabel(agent.identity.strategyType),
              },
              {
                label: isSpotGridBot ? "Bot Mode" : "Trade Style",
                value: isSpotGridBot
                  ? "GRID"
                  : `${executionProfile.label} // ${executionProfile.timeframeLabel}`,
              },
              {
                label: "Treasury Balance",
                value: `$${(agent.reputation.totalFunds || 0).toLocaleString()}`,
                highlight: true,
              },
              {
                label: isSpotGridBot ? "Grid Review" : "Review After",
                value: isSpotGridBot
                  ? `Every ${formatMinutesLabel(executionProfile.decisionCadenceMinutes)}`
                  : formatMinutesLabel(executionProfile.maxHoldMinutes),
                highlight: true,
              },
            ].map((stat) => (
              <div key={stat.label} className="bg-obsidian p-6">
                <p className="text-[9px] font-mono uppercase text-zinc-600 font-bold mb-2 tracking-widest">
                  {stat.label}
                </p>
                <p
                  className={cn(
                    "text-sm font-mono font-bold uppercase",
                    stat.highlight ? "text-emerald-cyber" : "text-white",
                  )}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {isSpotGridBot && h.gridRuntime ? (
            <GridStatusPanel
              runtime={h.gridRuntime}
              marketData={h.marketData}
              helpers={{
                getGridEquity: h.getGridEquity,
                getGridPnL: h.getGridPnL,
                getGridPnLPct: h.getGridPnLPct,
                getGridAPR: h.getGridAPR,
                getTotalAPR: h.getTotalAPR,
                getProfitPerGrid: h.getProfitPerGrid,
                getMaxWithdrawable: h.getMaxWithdrawable,
                getGridPriceForAsset: h.getGridPriceForAsset,
                handleGridModify: h.handleGridModify,
                handleGridWithdraw: h.handleGridWithdraw,
                handleGridTerminate: h.handleGridTerminate,
              }}
            />
          ) : null}

          {/* Simulation Dashboard */}
          <section className="glass-panel p-8 border border-emerald-cyber/30 bg-emerald-cyber/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-cyber/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10 space-y-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-sm font-mono font-bold text-white uppercase tracking-[0.2em] flex items-center gap-3">
                    <Cpu className="w-4 h-4 text-emerald-cyber" />
                    Simulation Dashboard
                  </h2>
                  <p className="text-[10px] font-mono text-zinc-600 uppercase mt-1">
                    Real-time capital & trade execution simulation
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "px-3 py-1 rounded-full border flex items-center gap-2",
                      h.isRunning
                        ? "border-emerald-cyber/30 bg-emerald-cyber/10"
                        : "border-zinc-800 bg-zinc-900",
                    )}
                  >
                    <div
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        h.isRunning
                          ? "bg-emerald-cyber animate-pulse"
                          : "bg-zinc-700",
                      )}
                    />
                    <span
                      className={cn(
                        "text-[9px] font-mono uppercase tracking-widest",
                        h.isRunning ? "text-emerald-cyber" : "text-zinc-600",
                      )}
                    >
                      {h.isRunning ? "Engine Active" : "Engine Idle"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                <div className="space-y-2">
                  <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
                    Available Capital
                  </p>
                  <p className="text-2xl font-mono font-bold text-white tabular-nums">
                    {formatCurrency(h.simulatedBalance)}
                  </p>
                  <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-cyber transition-all duration-500"
                      style={{
                        width: `${Math.min(100, totalTreasury > 0 ? (h.simulatedBalance / totalTreasury) * 100 : 0)}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
                    Deployed Capital
                  </p>
                  <p className="text-2xl font-mono font-bold text-emerald-cyber tabular-nums">
                    {formatCurrency(deployedCapital)}
                  </p>
                  <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest">
                    {deployedRatio.toFixed(1)}% of treasury currently in
                    positions
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
                    Realized PnL
                  </p>
                  <p
                    className={cn(
                      "text-2xl font-mono font-bold tabular-nums",
                      allTimeNetRealizedPnl >= 0
                        ? "text-emerald-cyber"
                        : "text-red-500",
                    )}
                  >
                    {allTimeNetRealizedPnl >= 0 ? "+" : "-"}
                    {formatCurrency(Math.abs(allTimeNetRealizedPnl))}
                  </p>
                  <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest">
                    From {closedTradesCount} closed trades
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
                    Active Positions
                  </p>
                  <p className="text-2xl font-mono font-bold text-white tabular-nums">
                    {h.activePositions.length}
                  </p>
                  <div className="flex gap-1">
                    {h.activePositions.map((p, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-2 h-2 rounded-full",
                          p.side === "BUY" ? "bg-emerald-cyber" : "bg-red-500",
                        )}
                        title={`${p.side} ${p.asset}`}
                      />
                    ))}
                    {h.activePositions.length === 0 && (
                      <span className="text-[9px] font-mono text-zinc-800 uppercase">
                        No exposure
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="border-t border-emerald-cyber/10 pt-5">
                <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest leading-relaxed">
                  Execution model: spot-style simulation. Size is asset units,
                  capital used is USD notional at entry, and leverage is fixed
                  at 1x, so the full `$25,000` is only deployed if open
                  positions consume all available treasury.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 border-t border-emerald-cyber/10 pt-5">
                <div className="bg-obsidian/50 border border-border-subtle px-4 py-4 space-y-2">
                  <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                    Today's Realized Profit
                  </p>
                  <p className="text-sm font-mono font-bold text-emerald-cyber">
                    {formatCurrency(dailyProfitUsed)}
                  </p>
                  <p className="text-[8px] font-mono text-zinc-700 leading-relaxed">
                    Resets daily. Based on closed winning trades only.
                  </p>
                </div>
                <div className="bg-obsidian/50 border border-border-subtle px-4 py-4 space-y-2">
                  <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                    All-Time Realized Profit
                  </p>
                  <p className="text-sm font-mono font-bold text-emerald-cyber">
                    {formatCurrency(allTimeRealizedProfit)}
                  </p>
                  <p className="text-[8px] font-mono text-zinc-700 leading-relaxed">
                    Closed winning trades across the full recorded history.
                  </p>
                </div>
                <div className="bg-obsidian/50 border border-border-subtle px-4 py-4 space-y-2">
                  <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                    Today's Realized Loss
                  </p>
                  <p className="text-sm font-mono font-bold text-white">
                    {formatCurrency(dailyLossUsed)}
                  </p>
                  <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                    Today's Loss Limit {formatCurrency(dailyLossCap)}
                  </p>
                  <p className="text-[8px] font-mono text-zinc-700 leading-relaxed">
                    Resets daily. Based on closed losing trades only.
                  </p>
                </div>
                <div className="bg-obsidian/50 border border-border-subtle px-4 py-4 space-y-2">
                  <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                    All-Time Realized Loss
                  </p>
                  <p className="text-sm font-mono font-bold text-white">
                    {formatCurrency(allTimeRealizedLoss)}
                  </p>
                  <p className="text-[8px] font-mono text-zinc-700 leading-relaxed">
                    Closed losing trades across the full recorded history.
                  </p>
                </div>
                <div className="bg-obsidian/50 border border-border-subtle px-4 py-4 space-y-2">
                  <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                    All-Time Net Realized PnL
                  </p>
                  <p
                    className={cn(
                      "text-sm font-mono font-bold",
                      allTimeNetRealizedPnl >= 0
                        ? "text-emerald-cyber"
                        : "text-red-500",
                    )}
                  >
                    {allTimeNetRealizedPnl >= 0 ? "+" : "-"}
                    {formatCurrency(Math.abs(allTimeNetRealizedPnl))}
                  </p>
                  <p className="text-[8px] font-mono text-zinc-700 leading-relaxed">
                    All closed trade outcomes combined across the full recorded
                    history.
                  </p>
                </div>
                <div className="bg-obsidian/50 border border-border-subtle px-4 py-4 space-y-2">
                  <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                    Open Position Limit
                  </p>
                  <p className="text-sm font-mono font-bold text-white">
                    {h.activePositions.length} /{" "}
                    {isSpotGridBot
                      ? h.gridRuntime?.gridLevels || "∞"
                      : currentRiskPolicy.maxOpenPositions}
                  </p>
                  <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                    {isSpotGridBot
                      ? "Managed by grid levels"
                      : `Router cap by ${formatEnumLabel(agent.identity.riskProfile)}`}
                  </p>
                </div>
                <div className="bg-obsidian/50 border border-border-subtle px-4 py-4 space-y-2">
                  <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                    Kill Switch
                  </p>
                  <p
                    className={cn(
                      "text-sm font-mono font-bold",
                      routerKillSwitch ? "text-red-500" : "text-emerald-cyber",
                    )}
                  >
                    {routerKillSwitch ? "ENGAGED" : "CLEAR"}
                  </p>
                  <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                    Trigger {currentRiskPolicy.killSwitchDrawdownPct}% drawdown
                  </p>
                </div>
                <div className="bg-obsidian/50 border border-border-subtle px-4 py-4 space-y-2">
                  <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                    Router Outcome
                  </p>
                  <p
                    className={cn(
                      "text-sm font-mono font-bold",
                      routerKillSwitch ||
                        (dailyLossCap > 0 && dailyLossUsed >= dailyLossCap)
                        ? "text-amber-warning"
                        : "text-emerald-cyber",
                    )}
                  >
                    {routerKillSwitch ||
                    (dailyLossCap > 0 && dailyLossUsed >= dailyLossCap)
                      ? "LIMITED"
                      : "TRADING ALLOWED"}
                  </p>
                  <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                    {routerBlockedTrades} blocked / {routerFilledTrades} filled
                    / {routerClosedTrades} closed
                  </p>
                </div>
              </div>
            </div>
          </section>

          <ValidationTimelinePanel
            trustTimelineLength={trustTimelineLength}
            groupedTimeline={groupedTimeline}
          />

          {/* Performance Chart */}
          <section className="glass-panel p-8 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-mono font-bold text-white uppercase tracking-[0.2em] flex items-center gap-3">
                  <TrendingUp className="w-4 h-4 text-emerald-cyber" />
                  Performance History
                </h2>
                <p className="text-[10px] font-mono text-zinc-600 uppercase mt-1">
                  Real-time telemetry stream
                </p>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
                <div className="text-right">
                  <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1">
                    Cumulative PnL
                  </p>
                  <p className="text-2xl font-mono font-bold text-emerald-cyber tabular-nums">
                    ${agent.reputation.cumulativePnl.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1">
                    Treasury Balance
                  </p>
                  <p className="text-2xl font-mono font-bold text-white tabular-nums">
                    ${agent.reputation.totalFunds.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="h-[350px] w-full bg-obsidian/50 border border-border-subtle p-4">
              <AgentPnLChart data={h.pnlData} height={310} />
            </div>
          </section>

          {/* Validation Registry */}
          <section className="space-y-6">
            <div className="flex items-center justify-between border-l-2 border-emerald-cyber pl-4">
              <h2 className="text-sm font-mono font-bold text-white uppercase tracking-[0.2em] flex items-center gap-3">
                <Shield className="w-4 h-4 text-emerald-cyber" />
                Validation Registry
              </h2>
              <a
                href={
                  agent.identity.onChain?.txHash
                    ? `https://sepolia.basescan.org/tx/${agent.identity.onChain.txHash}`
                    : "https://sepolia.basescan.org"
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-mono font-bold text-zinc-500 hover:text-emerald-cyber transition-colors flex items-center gap-2 uppercase tracking-widest"
              >
                Protocol Explorer <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="glass-panel overflow-hidden">
              <ValidationTable records={h.validations} />
            </div>
          </section>

          {/* Vault Transaction History */}
          <section className="space-y-6">
            <div className="flex items-center justify-between border-l-2 border-emerald-cyber pl-4">
              <h2 className="text-sm font-mono font-bold text-white uppercase tracking-[0.2em] flex items-center gap-3">
                <History className="w-4 h-4 text-emerald-cyber" />
                Vault Transaction History
              </h2>
            </div>
            <div className="glass-panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-obsidian border-b border-border-subtle">
                      <th className="px-6 py-4 text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                        Type
                      </th>
                      <th className="px-6 py-4 text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                        Amount
                      </th>
                      <th className="px-6 py-4 text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                        Status
                      </th>
                      <th className="px-6 py-4 text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                        TX Hash
                      </th>
                      <th className="px-6 py-4 text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                        Timestamp
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {h.vaultTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                            No vault activity detected
                          </p>
                        </td>
                      </tr>
                    ) : (
                      h.vaultTransactions.map((tx) => (
                        <tr
                          key={tx.id}
                          className="hover:bg-zinc-deep/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <span className="text-[10px] font-mono text-white font-bold uppercase tracking-tight">
                              {formatEnumLabel(tx.type)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[10px] font-mono text-emerald-cyber font-bold tabular-nums">
                              +${tx.amount.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {tx.status === "COMPLETED" ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-cyber" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-amber-warning" />
                              )}
                              <span
                                className={cn(
                                  "text-[9px] font-mono uppercase tracking-widest",
                                  tx.status === "COMPLETED"
                                    ? "text-emerald-cyber"
                                    : "text-amber-warning",
                                )}
                              >
                                {tx.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <a
                              href={`https://sepolia.basescan.org/tx/${tx.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-mono text-zinc-500 hover:text-emerald-cyber transition-colors truncate block max-w-[120px]"
                            >
                              {tx.txHash}
                            </a>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-tight">
                              {new Date(tx.timestamp).toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar Controls */}
        <div className="lg:col-span-4 space-y-10">
          <section className="glass-panel p-8 space-y-6">
            <MarketFeed data={h.marketData} />
          </section>

          {/* Trading Terminal */}
          <section className="glass-panel p-6 sm:p-8 space-y-6 border-t-2 border-t-emerald-cyber">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-widest flex items-center gap-3">
                <Cpu className="w-4 h-4 text-emerald-cyber" />
                Trading Terminal
              </h3>
              <div
                className={cn(
                  "w-2 h-2",
                  h.isRunning
                    ? "bg-emerald-cyber animate-pulse shadow-[0_0_8px_rgba(0,255,157,0.5)]"
                    : "bg-zinc-800",
                )}
              />
            </div>
            <div className="space-y-4">
              {h.quotaStatus.isExhausted && (
                <div className="p-3 bg-amber-warning/10 border border-amber-warning/20 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 bg-amber-warning rounded-full animate-pulse" />
                    <p className="text-[9px] font-mono text-amber-warning uppercase font-bold">
                      AI Requests Paused // Safety cooldown active
                    </p>
                  </div>
                  <p className="text-[8px] font-mono text-amber-warning/70 uppercase leading-relaxed">
                    Groq hit a temporary rate limit, so new AI requests are
                    paused until {formatResumeTime(h.quotaStatus.resetTime)}.
                  </p>
                  <button
                    onClick={() => {
                      aiService.resetQuota();
                      h.setQuotaStatus(aiService.getQuotaStatus());
                    }}
                    className="text-[8px] font-mono text-amber-warning underline uppercase hover:text-amber-200 text-left"
                  >
                    Try again now
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="p-3 bg-obsidian border border-border-subtle min-w-0">
                  <p className="text-[8px] font-mono text-zinc-600 uppercase mb-1">
                    Mode
                  </p>
                  <p className="text-[10px] font-mono text-white font-bold uppercase">
                    {executionProfile.label}
                  </p>
                </div>
                <div className="p-3 bg-obsidian border border-border-subtle min-w-0">
                  <p className="text-[8px] font-mono text-zinc-600 uppercase mb-1">
                    Network
                  </p>
                  <p className="text-[10px] font-mono text-emerald-cyber font-bold uppercase">
                    0xBASE
                  </p>
                </div>
                <div className="p-3 bg-obsidian border border-border-subtle min-w-0">
                  <p className="text-[8px] font-mono text-zinc-600 uppercase mb-1">
                    Signal Frame
                  </p>
                  <p className="text-[10px] font-mono text-white font-bold uppercase">
                    {executionProfile.timeframeLabel}
                  </p>
                </div>
                <div className="p-3 bg-obsidian border border-border-subtle min-w-0">
                  <p className="text-[8px] font-mono text-zinc-600 uppercase mb-1">
                    Review Cadence
                  </p>
                  <p className="text-[10px] font-mono text-white font-bold uppercase">
                    Every {executionProfile.decisionCadenceMinutes} min
                  </p>
                </div>
                <div className="p-3 bg-obsidian border border-border-subtle sm:col-span-2 min-w-0">
                  <p className="text-[8px] font-mono text-zinc-600 uppercase mb-1">
                    Active AI Engine
                  </p>
                  <div className="flex items-start gap-2">
                    <div
                      className={cn(
                        "mt-1 w-1.5 h-1.5 rounded-full",
                        h.hasGroqKey
                          ? "bg-emerald-cyber shadow-[0_0_8px_rgba(0,255,157,0.5)]"
                          : "bg-red-500",
                      )}
                    />
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono text-white font-bold uppercase break-words">
                        {h.hasGroqKey
                          ? `Groq // ${ACTIVE_GROQ_MODEL_LABEL}`
                          : "Groq // Key Missing"}
                      </p>
                      {h.hasGroqKey && (
                        <p className="mt-1 text-[8px] font-mono text-zinc-600 uppercase tracking-widest break-words">
                          Direct Groq model responses are normalized into
                          policy-aware BTC and ETH trade ideas.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-obsidian border border-border-subtle sm:col-span-2 min-w-0">
                  <p className="text-[8px] font-mono text-zinc-600 uppercase mb-1">
                    Signer Status
                  </p>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        h.walletAddress
                          ? "bg-emerald-cyber shadow-[0_0_8px_rgba(0,255,157,0.5)]"
                          : "bg-amber-warning",
                      )}
                    />
                    <p
                      className={cn(
                        "text-[10px] font-mono font-bold uppercase break-words",
                        h.walletAddress ? "text-white" : "text-amber-warning",
                      )}
                    >
                      {h.walletAddress
                        ? `Signed trades ready // ${truncateHex(h.walletAddress)}`
                        : "Test mode // simulated sandbox signing active"}
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-obsidian border border-border-subtle sm:col-span-2 min-w-0">
                  <p className="text-[8px] font-mono text-zinc-600 uppercase mb-1">
                    Replay Protection
                  </p>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        h.runtimeState?.lastNonce
                          ? "bg-emerald-cyber shadow-[0_0_8px_rgba(0,255,157,0.5)]"
                          : "bg-zinc-700",
                      )}
                    />
                    <p className="text-[10px] font-mono text-white font-bold uppercase break-words">
                      {h.runtimeState?.lastNonce
                        ? `Sequence ${h.runtimeState.nonceCounter} // ${h.runtimeState.lastNonce}`
                        : "First sequence appears after the first recorded cycle"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Market Sentiment */}
              <div className="p-4 bg-emerald-cyber/5 border border-emerald-cyber/10 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="w-3 h-3 text-emerald-cyber" />
                    <p className="text-[9px] font-mono text-emerald-cyber uppercase font-bold tracking-wider">
                      Groq Market Sentiment
                    </p>
                  </div>
                  <p className="text-[8px] font-mono uppercase tracking-[0.18em] text-zinc-600 text-right">
                    {h.marketSentimentUpdatedAt
                      ? `Updated ${toCompactTime(h.marketSentimentUpdatedAt)}`
                      : `Refresh ~ ${Math.round(SENTIMENT_REFRESH_INTERVAL_MS / 60000)} min`}
                  </p>
                </div>
                {marketSentimentLoading ? (
                  <p className="text-[10px] font-mono text-zinc-500 leading-relaxed">
                    Building the first sentiment snapshot from the latest market
                    data.
                  </p>
                ) : (
                  <>
                    <p className="text-[10px] font-mono text-zinc-300 italic leading-relaxed">
                      "{h.marketSentiment}"
                    </p>
                    {marketSentimentLimited && (
                      <p className="text-[9px] font-mono text-zinc-500 leading-relaxed">
                        {marketSentimentHasLiveSnapshot
                          ? "Live refresh is temporarily limited. Showing the last confirmed sentiment while core market checks keep running."
                          : "Live sentiment is still warming up. The terminal is using core market data and safety checks meanwhile."}
                      </p>
                    )}
                  </>
                )}
              </div>

              <button
                onClick={h.toggleLoop}
                className={cn(
                  "w-full py-4 font-mono font-bold text-[10px] sm:text-[11px] uppercase tracking-[0.18em] transition-all border flex items-center justify-center gap-3 text-center",
                  h.isRunning
                    ? "bg-red-500/5 text-red-500 border-red-500/20 hover:bg-red-500/10"
                    : "bg-emerald-cyber text-obsidian border-emerald-cyber hover:bg-emerald-cyber/90",
                )}
              >
                {h.isRunning ? (
                  <>
                    <Square className="w-4 h-4 fill-current" /> Terminate
                    Session
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" /> Start Agent
                    Session
                  </>
                )}
              </button>
              {h.isRunning && (
                <button
                  onClick={h.runAutonomousCycle}
                  disabled={h.isScanning}
                  className="w-full py-3 font-mono font-bold text-[9px] uppercase tracking-[0.18em] bg-obsidian text-zinc-400 border border-border-subtle hover:text-emerald-cyber hover:border-emerald-cyber/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {h.isScanning ? (
                    <>
                      <div className="w-3 h-3 border border-zinc-700 border-t-emerald-cyber animate-spin" />
                      AI Processing...
                    </>
                  ) : (
                    <>
                      <Activity className="w-3 h-3" /> Force AI Re-scan
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="p-4 bg-obsidian border border-border-subtle">
              <p className="text-[10px] font-mono text-zinc-500 leading-relaxed uppercase tracking-tight">
                <span className="text-emerald-cyber/60 mr-2 font-bold">
                  NOTE:
                </span>
                {terminalNotice}
              </p>
            </div>
          </section>

          {/* Settlement Summary */}
          <section className="glass-panel p-8 space-y-5 border-t-2 border-t-zinc-700">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-widest flex items-center gap-3">
                <Shield className="w-4 h-4 text-emerald-cyber" />
                Settlement Summary
              </h3>
              <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">
                Router Telemetry
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-obsidian border border-border-subtle">
                <p className="text-[8px] font-mono text-zinc-600 uppercase mb-1">
                  Filled
                </p>
                <p className="text-[11px] font-mono text-emerald-cyber font-bold uppercase">
                  {routerFilledTrades}
                </p>
              </div>
              <div className="p-3 bg-obsidian border border-border-subtle">
                <p className="text-[8px] font-mono text-zinc-600 uppercase mb-1">
                  Closed
                </p>
                <p className="text-[11px] font-mono text-white font-bold uppercase">
                  {routerClosedTrades}
                </p>
              </div>
              <div className="p-3 bg-obsidian border border-border-subtle">
                <p className="text-[8px] font-mono text-zinc-600 uppercase mb-1">
                  Blocked
                </p>
                <p className="text-[11px] font-mono text-amber-warning font-bold uppercase">
                  {routerBlockedTrades}
                </p>
              </div>
              <div className="p-3 bg-obsidian border border-border-subtle">
                <p className="text-[8px] font-mono text-zinc-600 uppercase mb-1">
                  Realized PnL
                </p>
                <p
                  className={cn(
                    "text-[11px] font-mono font-bold uppercase",
                    h.totalRealizedPnL >= 0
                      ? "text-emerald-cyber"
                      : "text-red-500",
                  )}
                >
                  {h.totalRealizedPnL >= 0 ? "+" : "-"}
                  {formatCurrency(Math.abs(h.totalRealizedPnL))}
                </p>
              </div>
            </div>
          </section>

          {/* Active Positions */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-cyber" />
                <h2 className="text-[10px] font-mono font-bold text-white uppercase tracking-[0.2em]">
                  Active Positions
                </h2>
              </div>
              <div className="px-2 py-0.5 bg-emerald-cyber/10 border border-emerald-cyber/30 rounded-full">
                <span className="text-[8px] font-mono text-emerald-cyber uppercase tracking-widest">
                  {h.activePositions.length} Open
                </span>
              </div>
            </div>
            {h.activePositions.length === 0 ? (
              <div className="glass-panel p-8 flex flex-col items-center justify-center space-y-3 border-dashed border-zinc-800">
                <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-zinc-700" />
                </div>
                <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
                  No active market exposure
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {h.activePositions.map((pos, idx) => {
                  const currentPrice =
                    pos.asset === "BTC"
                      ? h.marketData?.btc.price || 0
                      : h.marketData?.eth.price || 0;
                  const entryPrice = pos.entryPrice || currentPrice;
                  const committedCapital = h.getCommittedCapital(pos);
                  const allocationPercentage =
                    totalTreasury > 0
                      ? (committedCapital / totalTreasury) * 100
                      : 0;
                  const leverage = pos.leverage || 1;
                  const reviewAnchor = pos.lastReviewedAt || pos.timestamp;
                  const reassessAt = isSpotGridBot
                    ? (h.runtimeState?.lastCycleAt ||
                        h.gridRuntime?.lastGridEventAt ||
                        h.countdownNow) +
                      executionProfile.decisionCadenceMinutes * 60_000
                    : reviewAnchor + executionProfile.maxHoldMinutes * 60_000;
                  const reassessRemainingMs = Math.max(
                    0,
                    reassessAt - h.countdownNow,
                  );
                  const reassessLabel =
                    formatCountdownLabel(reassessRemainingMs);
                  const initialStop = pos.initialStopLoss ?? pos.stopLoss ?? 0;
                  const currentStop =
                    pos.currentStopLoss ??
                    pos.initialStopLoss ??
                    pos.stopLoss ??
                    0;
                  const profitProtected = pos.profitProtected || 0;
                  const trailingStatus = pos.trailingStopActive
                    ? profitProtected > 0
                      ? `Protecting +${formatCurrency(profitProtected)}`
                      : "Armed"
                    : "Inactive";
                  const pnl =
                    pos.side === "BUY"
                      ? ((currentPrice - entryPrice) / entryPrice) * 100
                      : ((entryPrice - currentPrice) / entryPrice) * 100;
                  const pnlValue = (pnl / 100) * committedCapital;
                  let tpProgress = 0,
                    slProgress = 0;
                  if (pos.side === "BUY") {
                    if (pos.takeProfit && pos.takeProfit > entryPrice)
                      tpProgress = Math.max(
                        0,
                        Math.min(
                          100,
                          ((currentPrice - entryPrice) /
                            (pos.takeProfit - entryPrice)) *
                            100,
                        ),
                      );
                    if (currentStop && currentStop < entryPrice)
                      slProgress = Math.max(
                        0,
                        Math.min(
                          100,
                          ((entryPrice - currentPrice) /
                            (entryPrice - currentStop)) *
                            100,
                        ),
                      );
                  } else {
                    if (pos.takeProfit && pos.takeProfit < entryPrice)
                      tpProgress = Math.max(
                        0,
                        Math.min(
                          100,
                          ((entryPrice - currentPrice) /
                            (entryPrice - pos.takeProfit)) *
                            100,
                        ),
                      );
                    if (currentStop && currentStop > entryPrice)
                      slProgress = Math.max(
                        0,
                        Math.min(
                          100,
                          ((currentPrice - entryPrice) /
                            (currentStop - entryPrice)) *
                            100,
                        ),
                      );
                  }
                  return (
                    <div
                      key={idx}
                      className="bg-obsidian/40 p-4 sm:p-5 border border-emerald-cyber/20 hover:border-emerald-cyber/40 transition-all duration-300 relative min-w-0 group overflow-hidden"
                    >
                      <div
                        className={cn(
                          "absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-cyber/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity",
                          pnl < 0 && "from-red-500/5",
                        )}
                      />
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "px-1.5 py-0.5 text-[8px] font-mono font-bold rounded-sm uppercase tracking-widest",
                                pos.side === "BUY"
                                  ? "bg-emerald-cyber/20 text-emerald-cyber"
                                  : "bg-red-500/20 text-red-500",
                              )}
                            >
                              {pos.side}
                            </span>
                            <span className="text-xs font-mono text-white font-bold tracking-wider">
                              {pos.asset}
                            </span>
                          </div>
                          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-tighter">
                            Size:{" "}
                            <span className="text-zinc-300">
                              {pos.size.toLocaleString(undefined, {
                                maximumFractionDigits: 4,
                              })}{" "}
                              {pos.asset}
                            </span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={cn(
                              "text-sm font-mono font-bold tabular-nums tracking-tight",
                              pnl >= 0 ? "text-emerald-cyber" : "text-red-500",
                            )}
                          >
                            {pnl >= 0 ? "+" : ""}
                            {pnl.toFixed(2)}%
                          </p>
                          <p
                            className={cn(
                              "text-[10px] font-mono tabular-nums opacity-60 font-medium",
                              pnl >= 0 ? "text-emerald-cyber" : "text-red-500",
                            )}
                          >
                            {pnlValue >= 0 ? "+" : "-"}
                            {formatCurrency(Math.abs(pnlValue))}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-4 relative z-10">
                        <div className="space-y-1">
                          <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                            Entry Price
                          </p>
                          <p className="text-[11px] font-mono text-zinc-300 font-bold">
                            {formatCurrency(pos.entryPrice)}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                            Mark Price
                          </p>
                          <p className="text-[11px] font-mono text-zinc-300 font-bold">
                            {formatCurrency(currentPrice)}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
                        <div className="bg-zinc-950/70 border border-border-subtle/40 p-3 space-y-1">
                          <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                            Capital Used
                          </p>
                          <p className="text-[11px] font-mono text-white font-bold">
                            {formatCurrency(committedCapital)}
                          </p>
                        </div>
                        <div className="bg-zinc-950/70 border border-border-subtle/40 p-3 space-y-1">
                          <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                            Allocation
                          </p>
                          <p className="text-[11px] font-mono text-white font-bold">
                            {allocationPercentage.toFixed(1)}%
                          </p>
                        </div>
                        <div className="bg-zinc-950/70 border border-border-subtle/40 p-3 space-y-1">
                          <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                            Mode
                          </p>
                          <p className="text-[11px] font-mono text-white font-bold">
                            Spot
                          </p>
                        </div>
                        <div className="bg-zinc-950/70 border border-border-subtle/40 p-3 space-y-1 text-right">
                          <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                            Leverage
                          </p>
                          <p className="text-[11px] font-mono text-white font-bold">
                            {leverage.toFixed(0)}x
                          </p>
                        </div>
                      </div>
                      <div className="mb-6 rounded-sm border border-emerald-cyber/20 bg-emerald-cyber/[0.04] px-3 py-3 relative z-10">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                              {isSpotGridBot ? "Grid Review" : "Review After"}
                            </p>
                            <p className="mt-1 text-[11px] font-mono text-white font-bold uppercase">
                              {isSpotGridBot
                                ? `Every ${formatMinutesLabel(executionProfile.decisionCadenceMinutes)}`
                                : formatMinutesLabel(
                                    executionProfile.maxHoldMinutes,
                                  )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                              Countdown
                            </p>
                            <p
                              className={cn(
                                "mt-1 text-[12px] font-mono font-bold uppercase tracking-widest",
                                reassessRemainingMs > 0
                                  ? "text-emerald-cyber"
                                  : "text-amber-warning",
                              )}
                            >
                              {reassessLabel}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4 pt-4 border-t border-border-subtle/20 relative z-10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                          <div className="bg-zinc-950/70 border border-border-subtle/40 p-3 space-y-1">
                            <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                              Take Profit
                            </p>
                            <p className="text-[11px] font-mono text-emerald-cyber font-bold">
                              {formatCurrency(pos.takeProfit)}
                            </p>
                          </div>
                          <div className="bg-zinc-950/70 border border-border-subtle/40 p-3 space-y-1">
                            <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                              Initial Stop
                            </p>
                            <p className="text-[11px] font-mono text-red-500 font-bold">
                              {formatCurrency(initialStop)}
                            </p>
                          </div>
                          <div className="bg-zinc-950/70 border border-border-subtle/40 p-3 space-y-1">
                            <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                              Current Stop
                            </p>
                            <p className="text-[11px] font-mono text-white font-bold">
                              {formatCurrency(currentStop)}
                            </p>
                          </div>
                          <div className="bg-zinc-950/70 border border-border-subtle/40 p-3 space-y-1">
                            <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                              Profit Protected
                            </p>
                            <p
                              className={cn(
                                "text-[11px] font-mono font-bold",
                                profitProtected > 0
                                  ? "text-emerald-cyber"
                                  : "text-zinc-400",
                              )}
                            >
                              {profitProtected > 0
                                ? `+${formatCurrency(profitProtected)}`
                                : formatCurrency(0)}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="rounded-sm border border-emerald-cyber/20 bg-emerald-cyber/[0.04] px-3 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                                  Trailing Stop
                                </p>
                                <p
                                  className={cn(
                                    "mt-1 text-[11px] font-mono font-bold uppercase",
                                    pos.trailingStopActive
                                      ? "text-emerald-cyber"
                                      : "text-zinc-400",
                                  )}
                                >
                                  {trailingStatus}
                                </p>
                              </div>
                              <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest text-right">
                                {pos.trailingStopActive
                                  ? "Armed after +1.00%"
                                  : "Activates after +1.00% profit"}
                              </p>
                            </div>
                          </div>
                          <div className="rounded-sm border border-border-subtle/40 bg-zinc-950/70 px-3 py-3">
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center text-[9px] font-mono uppercase tracking-widest">
                                <span className="text-zinc-600">
                                  Current Stop Progress
                                </span>
                                <span className="text-zinc-300 font-bold">
                                  {formatCurrency(currentStop)}
                                </span>
                              </div>
                              <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full transition-all duration-1000 ease-out",
                                    pos.trailingStopActive
                                      ? "bg-emerald-cyber/40"
                                      : "bg-red-500/40",
                                  )}
                                  style={{ width: `${slProgress}%` }}
                                />
                              </div>
                            </div>
                            <div className="space-y-1.5 mt-3">
                              <div className="flex justify-between items-center text-[9px] font-mono uppercase tracking-widest">
                                <span className="text-zinc-600">
                                  Take Profit Progress
                                </span>
                                <span className="text-emerald-cyber font-bold">
                                  {formatCurrency(pos.takeProfit)}
                                </span>
                              </div>
                              <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-cyber/40 transition-all duration-1000 ease-out"
                                  style={{ width: `${tpProgress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Pending Orders */}
          {h.pendingOrders.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-warning" />
                  <h2 className="text-[10px] font-mono font-bold text-white uppercase tracking-[0.2em]">
                    Pending Orders
                  </h2>
                </div>
                <div className="px-2 py-0.5 bg-amber-warning/10 border border-amber-warning/30 rounded-full">
                  <span className="text-[8px] font-mono text-amber-warning uppercase tracking-widest">
                    {h.pendingOrders.length} Waiting
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {h.pendingOrders.map((order) => {
                  const currentPrice =
                    order.asset === "BTC"
                      ? h.marketData?.btc.price || 0
                      : h.marketData?.eth.price || 0;
                  const limitPrice = order.limitPrice || 0;
                  const distancePct =
                    currentPrice > 0
                      ? (
                          ((limitPrice - currentPrice) / currentPrice) *
                          100
                        ).toFixed(2)
                      : "0.00";
                  const timeLeft = order.expiresAt
                    ? Math.max(0, order.expiresAt - h.countdownNow)
                    : 0;
                  const hoursLeft = Math.floor(timeLeft / 3_600_000);
                  const minsLeft = Math.floor((timeLeft % 3_600_000) / 60_000);

                  return (
                    <div
                      key={order.intentId}
                      className="glass-panel p-5 border-l-2 border-amber-warning/40"
                    >
                      {/* Order header */}
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="px-2 py-0.5 text-[8px] font-mono font-bold uppercase tracking-widest border border-amber-warning/30 text-amber-warning">
                          LIMIT {order.side}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-white uppercase">
                          {order.asset}
                        </span>
                        <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                          {order.size?.toFixed(4)} units
                        </span>
                      </div>

                      {/* Reason */}
                      <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider truncate mb-4">
                        {order.reason}
                      </p>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="border border-border-subtle bg-zinc-deep/40 p-3">
                          <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                            Limit Price
                          </p>
                          <p className="text-sm font-mono font-bold text-amber-warning tabular-nums mt-1">
                            $
                            {limitPrice.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                        <div className="border border-border-subtle bg-zinc-deep/40 p-3">
                          <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                            Current
                          </p>
                          <p className="text-sm font-mono font-bold text-white tabular-nums mt-1">
                            $
                            {currentPrice.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                        <div className="border border-border-subtle bg-zinc-deep/40 p-3">
                          <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                            Distance
                          </p>
                          <p className="text-sm font-mono font-bold text-zinc-400 tabular-nums mt-1">
                            {distancePct}%
                          </p>
                        </div>
                        <div className="border border-border-subtle bg-zinc-deep/40 p-3">
                          <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                            Reserved
                          </p>
                          <p className="text-sm font-mono font-bold text-zinc-300 tabular-nums mt-1">
                            $
                            {(order.capitalAllocated || 0).toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )}
                          </p>
                        </div>
                        <div className="border border-border-subtle bg-zinc-deep/40 p-3">
                          <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                            Expires In
                          </p>
                          <p className="text-sm font-mono font-bold text-zinc-400 tabular-nums mt-1">
                            {timeLeft > 0
                              ? `${hoursLeft}h ${minsLeft}m`
                              : "Expiring"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <TradingSignalsLog
            intents={h.intents}
            totalTreasury={totalTreasury}
            lastScanTime={h.lastScanTime}
          />
        </div>
      </div>
    </div>
  );
}
