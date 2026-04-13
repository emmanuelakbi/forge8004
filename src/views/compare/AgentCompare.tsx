import { cn } from "../../utils/cn";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AggregatedAgentView } from "../../lib/types";
import { erc8004Client } from "@/app/lib/erc8004Client";
import { subscribeToAuthState, User } from "@/app/lib/firebase";
import { getTrustScore } from "../../services/trustArtifacts";
import { formatEnumLabel } from "../../utils/format";
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Shield,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  ChevronDown,
} from "lucide-react";

type SortKey = "trust" | "sharpe" | "pnl" | "drawdown" | "winRate" | "trades";

function getWinRate(agent: AggregatedAgentView) {
  const trades = agent.reputation.tradesCount;
  if (trades === 0) return 0;
  // Approximate: positive PnL with trades suggests wins
  const pnl = agent.reputation.cumulativePnl;
  if (pnl > 0)
    return Math.min(95, 50 + (pnl / (agent.reputation.totalFunds || 1)) * 100);
  return Math.max(5, 50 + (pnl / (agent.reputation.totalFunds || 1)) * 100);
}

function getRank(value: number, allValues: number[], higherIsBetter: boolean) {
  const sorted = [...allValues].sort((a, b) =>
    higherIsBetter ? b - a : a - b,
  );
  return sorted.indexOf(value) + 1;
}

function RankBadge({ rank, total }: { rank: number; total: number }) {
  const isTop = rank === 1;
  const isBottom = rank === total && total > 1;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-5 h-5 text-[8px] font-mono font-bold",
        isTop
          ? "bg-emerald-cyber/20 text-emerald-cyber border border-emerald-cyber/30"
          : isBottom
            ? "bg-red-500/10 text-red-400 border border-red-500/20"
            : "bg-zinc-800 text-zinc-500 border border-zinc-700",
      )}
    >
      {rank}
    </span>
  );
}

function MetricCell({
  value,
  format,
  rank,
  total,
  trend,
}: {
  value: number;
  format: (v: number) => string;
  rank: number;
  total: number;
  trend?: "up" | "down" | "flat";
}) {
  return (
    <div className="flex items-center gap-2">
      <RankBadge rank={rank} total={total} />
      <span className="text-sm font-mono text-zinc-200 tabular-nums">
        {format(value)}
      </span>
      {trend === "up" && (
        <ArrowUpRight className="w-3 h-3 text-emerald-cyber" />
      )}
      {trend === "down" && <ArrowDownRight className="w-3 h-3 text-red-400" />}
      {trend === "flat" && <Minus className="w-3 h-3 text-zinc-600" />}
    </div>
  );
}

function TrustBar({ score }: { score: number }) {
  const color =
    score >= 75
      ? "bg-emerald-cyber"
      : score >= 50
        ? "bg-amber-warning"
        : "bg-red-400";
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 h-1.5 bg-zinc-800/80 overflow-hidden">
        <div
          className={cn("h-full transition-all duration-700", color)}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
      <span
        className={cn(
          "text-sm font-mono font-bold tabular-nums",
          score >= 75
            ? "text-emerald-cyber"
            : score >= 50
              ? "text-amber-warning"
              : "text-red-400",
        )}
      >
        {score.toFixed(1)}
      </span>
    </div>
  );
}

export default function AgentCompare() {
  const [agents, setAgents] = useState<AggregatedAgentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("trust");
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
    setLoading(true);
    erc8004Client
      .getAllAgents()
      .then((data) => {
        setAgents(data);
        // Auto-select all if ≤6, otherwise top 4 by trust
        if (data.length <= 6) {
          setSelected(new Set(data.map((a) => a.identity.agentId)));
        } else {
          const top4 = [...data]
            .sort((a, b) => getTrustScore(b) - getTrustScore(a))
            .slice(0, 4);
          setSelected(new Set(top4.map((a) => a.identity.agentId)));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [authReady, user]);

  if (loading)
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-2 border-emerald-cyber/20 border-t-emerald-cyber animate-spin mb-4" />
        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em] animate-pulse">
          Loading Agent Data...
        </p>
      </div>
    );

  if (!user)
    return (
      <div className="page-shell">
        <div className="glass-panel p-12 text-center border border-emerald-cyber/20">
          <p className="text-sm font-mono text-zinc-400 uppercase">
            Sign in to compare your agents.
          </p>
        </div>
      </div>
    );

  if (agents.length < 2)
    return (
      <div className="page-shell">
        <div className="glass-panel p-12 text-center border border-border-subtle space-y-4">
          <BarChart3 className="w-10 h-10 text-zinc-600 mx-auto" />
          <p className="text-sm font-mono text-zinc-400 uppercase">
            You need at least 2 agents to compare.
          </p>
          <Link
            href="/register-agent"
            className="inline-block px-6 py-3 bg-emerald-cyber text-obsidian font-mono font-bold text-[10px] uppercase tracking-[0.2em]"
          >
            Register Agent
          </Link>
        </div>
      </div>
    );

  const visible = agents.filter((a) => selected.has(a.identity.agentId));
  const toggleAgent = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) {
      if (next.size > 2) next.delete(id);
    } else next.add(id);
    setSelected(next);
  };

  // Compute metrics for visible agents
  const metrics = visible.map((a) => ({
    agent: a,
    trust: getTrustScore(a),
    sharpe: a.reputation.sharpeLikeScore,
    pnl: a.reputation.cumulativePnl,
    drawdown: a.reputation.maxDrawdown,
    winRate: getWinRate(a),
    trades: a.reputation.tradesCount,
    funds: a.reputation.totalFunds,
    validation: a.validationAverageScore || 0,
  }));

  const sortFns: Record<
    SortKey,
    (a: (typeof metrics)[0], b: (typeof metrics)[0]) => number
  > = {
    trust: (a, b) => b.trust - a.trust,
    sharpe: (a, b) => b.sharpe - a.sharpe,
    pnl: (a, b) => b.pnl - a.pnl,
    drawdown: (a, b) => a.drawdown - b.drawdown,
    winRate: (a, b) => b.winRate - a.winRate,
    trades: (a, b) => b.trades - a.trades,
  };
  const sorted = [...metrics].sort(sortFns[sortKey]);

  const allTrust = metrics.map((m) => m.trust);
  const allSharpe = metrics.map((m) => m.sharpe);
  const allPnl = metrics.map((m) => m.pnl);
  const allDrawdown = metrics.map((m) => m.drawdown);
  const allWinRate = metrics.map((m) => m.winRate);
  const allTrades = metrics.map((m) => m.trades);

  // Portfolio aggregates
  const totalCapital = metrics.reduce((s, m) => s + m.funds, 0);
  const totalPnl = metrics.reduce((s, m) => s + m.pnl, 0);
  const avgTrust =
    metrics.length > 0
      ? metrics.reduce((s, m) => s + m.trust, 0) / metrics.length
      : 0;
  const worstDrawdown = Math.max(...metrics.map((m) => m.drawdown), 0);

  const pnlTrend = (pnl: number) =>
    pnl > 0 ? ("up" as const) : pnl < 0 ? ("down" as const) : ("flat" as const);

  return (
    <div className="page-shell space-y-8">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-emerald-cyber" />
            <span className="text-[10px] font-mono text-emerald-cyber uppercase tracking-widest">
              Protocol // Agent Comparison
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-mono font-bold text-white tracking-tighter uppercase">
            Compare <span className="text-emerald-cyber">Agents</span>
          </h1>
          <p className="text-zinc-500 text-xs font-mono mt-2 uppercase tracking-wider">
            Side-by-side trust, performance, and risk analysis across your agent
            fleet.
          </p>
        </div>
      </div>

      {/* Portfolio Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border-subtle">
        {[
          {
            label: "Total Capital",
            value: `$${totalCapital.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            sub: `${visible.length} agents`,
          },
          {
            label: "Aggregate PnL",
            value: `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
            sub: totalPnl >= 0 ? "net positive" : "net negative",
            accent: totalPnl >= 0,
          },
          {
            label: "Avg Trust Score",
            value: avgTrust.toFixed(1),
            sub: avgTrust >= 70 ? "healthy" : "needs work",
            accent: avgTrust >= 70,
          },
          {
            label: "Worst Drawdown",
            value: `${worstDrawdown.toFixed(1)}%`,
            sub: worstDrawdown > 15 ? "elevated risk" : "within bounds",
            accent: worstDrawdown <= 15,
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-obsidian p-5">
            <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-2">
              {stat.label}
            </p>
            <p
              className={cn(
                "text-xl font-mono font-bold tabular-nums",
                stat.accent === true
                  ? "text-emerald-cyber"
                  : stat.accent === false
                    ? "text-red-400"
                    : "text-white",
              )}
            >
              {stat.value}
            </p>
            <p className="text-[9px] font-mono text-zinc-600 uppercase mt-1">
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Agent Selector */}
      {agents.length > 2 && (
        <div className="glass-panel p-4 border border-border-subtle">
          <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-3">
            Select agents to compare (min 2)
          </p>
          <div className="flex flex-wrap gap-2">
            {agents.map((a) => {
              const isSelected = selected.has(a.identity.agentId);
              return (
                <button
                  key={a.identity.agentId}
                  onClick={() => toggleAgent(a.identity.agentId)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 font-mono text-[10px] uppercase tracking-wider transition-all border",
                    isSelected
                      ? "border-emerald-cyber/40 bg-emerald-cyber/10 text-emerald-cyber"
                      : "border-border-subtle bg-obsidian/40 text-zinc-500 hover:border-zinc-600",
                  )}
                >
                  <img
                    src={a.identity.avatarUrl}
                    className="w-5 h-5 border border-zinc-700 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {a.identity.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sort Control */}
      <div className="flex items-center gap-3">
        <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
          Sort by
        </span>
        <div className="relative">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="appearance-none bg-obsidian border border-border-subtle text-zinc-300 font-mono text-[10px] uppercase tracking-wider px-4 py-2 pr-8 focus:outline-none focus:border-emerald-cyber/40"
          >
            <option value="trust">Trust Score</option>
            <option value="sharpe">Sharpe Ratio</option>
            <option value="pnl">Cumulative PnL</option>
            <option value="drawdown">Max Drawdown</option>
            <option value="winRate">Win Rate</option>
            <option value="trades">Trade Count</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600 pointer-events-none" />
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="text-left text-[9px] font-mono text-zinc-600 uppercase tracking-widest py-3 px-4 w-56">
                Agent
              </th>
              <th className="text-left text-[9px] font-mono text-zinc-600 uppercase tracking-widest py-3 px-4">
                Trust
              </th>
              <th className="text-left text-[9px] font-mono text-zinc-600 uppercase tracking-widest py-3 px-4">
                Sharpe
              </th>
              <th className="text-left text-[9px] font-mono text-zinc-600 uppercase tracking-widest py-3 px-4">
                PnL
              </th>
              <th className="text-left text-[9px] font-mono text-zinc-600 uppercase tracking-widest py-3 px-4">
                Drawdown
              </th>
              <th className="text-left text-[9px] font-mono text-zinc-600 uppercase tracking-widest py-3 px-4">
                Win Rate
              </th>
              <th className="text-left text-[9px] font-mono text-zinc-600 uppercase tracking-widest py-3 px-4">
                Trades
              </th>
              <th className="text-left text-[9px] font-mono text-zinc-600 uppercase tracking-widest py-3 px-4">
                Capital
              </th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((m, i) => (
              <tr
                key={m.agent.identity.agentId}
                className={cn(
                  "border-b border-border-subtle/50 hover:bg-emerald-cyber/[0.02] transition-colors",
                  i === 0 && "bg-emerald-cyber/[0.03]",
                )}
              >
                {/* Agent Identity */}
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={m.agent.identity.avatarUrl}
                      className="w-9 h-9 border border-border-subtle object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <p className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                        {m.agent.identity.name}
                      </p>
                      <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
                        {formatEnumLabel(m.agent.identity.strategyType)}
                      </p>
                    </div>
                  </div>
                </td>
                {/* Trust Score */}
                <td className="py-4 px-4 min-w-[160px]">
                  <TrustBar score={m.trust} />
                </td>
                {/* Sharpe */}
                <td className="py-4 px-4">
                  <MetricCell
                    value={m.sharpe}
                    format={(v) => v.toFixed(2)}
                    rank={getRank(m.sharpe, allSharpe, true)}
                    total={visible.length}
                  />
                </td>
                {/* PnL */}
                <td className="py-4 px-4">
                  <MetricCell
                    value={m.pnl}
                    format={(v) => `${v >= 0 ? "+" : ""}$${v.toFixed(2)}`}
                    rank={getRank(m.pnl, allPnl, true)}
                    total={visible.length}
                    trend={pnlTrend(m.pnl)}
                  />
                </td>
                {/* Drawdown */}
                <td className="py-4 px-4">
                  <MetricCell
                    value={m.drawdown}
                    format={(v) => `${v.toFixed(1)}%`}
                    rank={getRank(m.drawdown, allDrawdown, false)}
                    total={visible.length}
                    trend={m.drawdown > 15 ? "down" : "flat"}
                  />
                </td>
                {/* Win Rate */}
                <td className="py-4 px-4">
                  <MetricCell
                    value={m.winRate}
                    format={(v) => `${v.toFixed(0)}%`}
                    rank={getRank(m.winRate, allWinRate, true)}
                    total={visible.length}
                  />
                </td>
                {/* Trades */}
                <td className="py-4 px-4">
                  <MetricCell
                    value={m.trades}
                    format={(v) => v.toString()}
                    rank={getRank(m.trades, allTrades, true)}
                    total={visible.length}
                  />
                </td>
                {/* Capital */}
                <td className="py-4 px-4">
                  <div>
                    <span className="text-sm font-mono text-zinc-200 tabular-nums">
                      $
                      {m.funds.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                    <div className="text-[8px] font-mono text-zinc-600 mt-0.5">
                      {totalCapital > 0
                        ? ((m.funds / totalCapital) * 100).toFixed(0)
                        : 0}
                      % of portfolio
                    </div>
                  </div>
                </td>
                {/* Action */}
                <td className="py-4 px-4">
                  <Link
                    href={`/agents/${m.agent.identity.agentId}`}
                    className="text-[9px] font-mono text-emerald-cyber uppercase tracking-widest hover:underline"
                  >
                    Detail →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Strategy Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sorted.map((m) => (
          <div
            key={m.agent.identity.agentId}
            className="glass-panel p-5 border border-border-subtle hover:border-emerald-cyber/20 transition-colors"
          >
            <div className="flex items-center gap-3 mb-4">
              <img
                src={m.agent.identity.avatarUrl}
                className="w-8 h-8 border border-border-subtle object-cover"
                referrerPolicy="no-referrer"
              />
              <div>
                <p className="text-xs font-mono font-bold text-white uppercase">
                  {m.agent.identity.name}
                </p>
                <p className="text-[9px] font-mono text-zinc-600 uppercase">
                  {formatEnumLabel(m.agent.identity.strategyType)}
                </p>
              </div>
              {m.agent.identity.onChain?.tokenId && (
                <span className="ml-auto text-[8px] font-mono text-emerald-cyber border border-emerald-cyber/20 px-2 py-0.5 bg-emerald-cyber/5">
                  ERC-721 #{m.agent.identity.onChain.tokenId}
                </span>
              )}
            </div>

            {/* Mini metrics grid */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: "Trust",
                  value: m.trust.toFixed(1),
                  good: m.trust >= 70,
                },
                {
                  label: "Sharpe",
                  value: m.sharpe.toFixed(2),
                  good: m.sharpe > 1,
                },
                {
                  label: "PnL",
                  value: `${m.pnl >= 0 ? "+" : ""}$${m.pnl.toFixed(0)}`,
                  good: m.pnl >= 0,
                },
                {
                  label: "Drawdown",
                  value: `${m.drawdown.toFixed(1)}%`,
                  good: m.drawdown <= 15,
                },
                {
                  label: "Win Rate",
                  value: `${m.winRate.toFixed(0)}%`,
                  good: m.winRate >= 55,
                },
                {
                  label: "Validation",
                  value: `${m.validation.toFixed(0)}%`,
                  good: m.validation >= 80,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="text-center py-2 bg-obsidian/60 border border-border-subtle/30"
                >
                  <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                    {stat.label}
                  </p>
                  <p
                    className={cn(
                      "text-sm font-mono font-bold tabular-nums mt-0.5",
                      stat.good ? "text-emerald-cyber" : "text-zinc-400",
                    )}
                  >
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            <Link
              href={`/agents/${m.agent.identity.agentId}`}
              className="block mt-4 text-center text-[9px] font-mono text-emerald-cyber uppercase tracking-widest border border-emerald-cyber/20 py-2 hover:bg-emerald-cyber/5 transition-colors"
            >
              Open Dashboard →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
