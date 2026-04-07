import { cn } from "../../utils/cn";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AggregatedAgentView } from "../../lib/types";
import { erc8004Client } from "../../data/erc8004Client";
import { subscribeToAuthState, User } from "../../data/firebase";
import { getTrustScore } from "../../services/trustArtifacts";
import { formatEnumLabel } from "../../utils/format";
import { Wallet, AlertTriangle, Shield, TrendingUp } from "lucide-react";

export default function Portfolio() {
  const [agents, setAgents] = useState<AggregatedAgentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

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
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [authReady, user]);

  if (loading)
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-2 border-emerald-cyber/20 border-t-emerald-cyber animate-spin mb-4" />
        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em] animate-pulse">
          Loading Portfolio...
        </p>
      </div>
    );

  if (!user)
    return (
      <div className="page-shell">
        <div className="glass-panel p-12 text-center border border-emerald-cyber/20">
          <p className="text-sm font-mono text-zinc-400 uppercase">
            Sign in to view your portfolio.
          </p>
        </div>
      </div>
    );

  const activeAgents = agents.filter(
    (a) => a.identity.status !== "deactivated",
  );
  const totalCapital = activeAgents.reduce(
    (s, a) => s + a.reputation.totalFunds,
    0,
  );
  const totalPnl = activeAgents.reduce(
    (s, a) => s + a.reputation.cumulativePnl,
    0,
  );
  const totalTrades = activeAgents.reduce(
    (s, a) => s + a.reputation.tradesCount,
    0,
  );
  const avgTrust =
    activeAgents.length > 0
      ? activeAgents.reduce((s, a) => s + getTrustScore(a), 0) /
        activeAgents.length
      : 0;
  const worstDrawdown =
    activeAgents.length > 0
      ? Math.max(...activeAgents.map((a) => a.reputation.maxDrawdown))
      : 0;
  const avgSharpe =
    activeAgents.length > 0
      ? activeAgents.reduce((s, a) => s + a.reputation.sharpeLikeScore, 0) /
        activeAgents.length
      : 0;

  // Exposure by strategy
  const strategyExposure = activeAgents.reduce(
    (acc, a) => {
      const key = a.identity.strategyType;
      acc[key] = (acc[key] || 0) + a.reputation.totalFunds;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Risk tier breakdown
  const riskTiers = { low: 0, medium: 0, high: 0 };
  activeAgents.forEach((a) => {
    const dd = a.reputation.maxDrawdown;
    if (dd <= 5) riskTiers.low += a.reputation.totalFunds;
    else if (dd <= 15) riskTiers.medium += a.reputation.totalFunds;
    else riskTiers.high += a.reputation.totalFunds;
  });

  const sorted = [...activeAgents].sort(
    (a, b) => b.reputation.totalFunds - a.reputation.totalFunds,
  );

  return (
    <div className="page-shell space-y-8">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-emerald-cyber" />
            <span className="text-[10px] font-mono text-emerald-cyber uppercase tracking-widest">
              Protocol // Portfolio
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-mono font-bold text-white tracking-tighter uppercase">
            Capital <span className="text-emerald-cyber">Allocation</span>
          </h1>
          <p className="text-zinc-500 text-xs font-mono mt-2 uppercase tracking-wider">
            Aggregate capital, risk exposure, and performance across your agent
            fleet.
          </p>
        </div>
      </div>

      {/* Top-level stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-border-subtle">
        {[
          {
            label: "Total Capital",
            value: `$${totalCapital.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
          },
          {
            label: "Net PnL",
            value: `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`,
            accent: totalPnl >= 0,
          },
          { label: "Agents", value: activeAgents.length.toString() },
          {
            label: "Avg Trust",
            value: avgTrust.toFixed(1),
            accent: avgTrust >= 70,
          },
          {
            label: "Avg Sharpe",
            value: avgSharpe.toFixed(2),
            accent: avgSharpe > 1,
          },
          {
            label: "Worst DD",
            value: `${worstDrawdown.toFixed(1)}%`,
            accent: worstDrawdown <= 15,
          },
        ].map((s) => (
          <div key={s.label} className="bg-obsidian p-4">
            <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1">
              {s.label}
            </p>
            <p
              className={cn(
                "text-lg font-mono font-bold tabular-nums",
                s.accent === true
                  ? "text-emerald-cyber"
                  : s.accent === false
                    ? "text-red-400"
                    : "text-white",
              )}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Strategy Exposure */}
        <div className="glass-panel p-5 border border-border-subtle">
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-cyber" /> Strategy
            Exposure
          </h3>
          <div className="space-y-3">
            {Object.entries(strategyExposure)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([strategy, capital]) => {
                const cap = capital as number;
                return (
                  <div key={strategy}>
                    <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider mb-1">
                      <span className="text-zinc-400">
                        {formatEnumLabel(strategy)}
                      </span>
                      <span className="text-zinc-300">
                        $
                        {cap.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}{" "}
                        (
                        {totalCapital > 0
                          ? ((cap / totalCapital) * 100).toFixed(0)
                          : 0}
                        %)
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-cyber/60 transition-all"
                        style={{
                          width: `${totalCapital > 0 ? (cap / totalCapital) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Risk Tier Breakdown */}
        <div className="glass-panel p-5 border border-border-subtle">
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-cyber" /> Risk Tier
            Breakdown
          </h3>
          <div className="space-y-4">
            {[
              {
                label: "Low Risk (DD ≤ 5%)",
                value: riskTiers.low,
                color: "bg-emerald-cyber",
                textColor: "text-emerald-cyber",
              },
              {
                label: "Medium Risk (DD ≤ 15%)",
                value: riskTiers.medium,
                color: "bg-amber-warning",
                textColor: "text-amber-warning",
              },
              {
                label: "High Risk (DD > 15%)",
                value: riskTiers.high,
                color: "bg-red-400",
                textColor: "text-red-400",
              },
            ].map((tier) => (
              <div key={tier.label}>
                <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider mb-1">
                  <span className="text-zinc-400">{tier.label}</span>
                  <span className={tier.textColor}>
                    $
                    {tier.value.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="h-1.5 bg-zinc-800 overflow-hidden">
                  <div
                    className={cn("h-full transition-all", tier.color)}
                    style={{
                      width: `${totalCapital > 0 ? (tier.value / totalCapital) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          {riskTiers.high > totalCapital * 0.4 && (
            <div className="mt-4 flex items-center gap-2 text-[10px] font-mono text-amber-warning uppercase">
              <AlertTriangle className="w-3 h-3" /> Over 40% capital in
              high-risk agents
            </div>
          )}
        </div>

        {/* Performance Summary */}
        <div className="glass-panel p-5 border border-border-subtle">
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-cyber" /> Performance
            Summary
          </h3>
          <div className="space-y-3">
            {[
              { label: "Total Trades", value: totalTrades.toString() },
              {
                label: "Capital Deployed",
                value: `$${totalCapital.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
              },
              {
                label: "Net Return",
                value:
                  totalCapital > 0
                    ? `${((totalPnl / totalCapital) * 100).toFixed(2)}%`
                    : "0%",
              },
              {
                label: "Return per Agent",
                value:
                  activeAgents.length > 0
                    ? `$${(totalPnl / activeAgents.length).toFixed(2)}`
                    : "$0",
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex justify-between py-2 border-b border-border-subtle/30 last:border-0"
              >
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                  {row.label}
                </span>
                <span className="text-sm font-mono text-zinc-200 tabular-nums">
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Capital Table */}
      <div className="glass-panel border border-border-subtle overflow-hidden">
        <div className="p-4 border-b border-border-subtle">
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-widest">
            Capital by Agent
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border-subtle">
                {[
                  "Agent",
                  "Strategy",
                  "Capital",
                  "Allocation",
                  "PnL",
                  "Drawdown",
                  "Trust",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left text-[9px] font-mono text-zinc-600 uppercase tracking-widest py-3 px-4"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((a) => {
                const pct =
                  totalCapital > 0
                    ? (a.reputation.totalFunds / totalCapital) * 100
                    : 0;
                const trust = getTrustScore(a);
                return (
                  <tr
                    key={a.identity.agentId}
                    className="border-b border-border-subtle/30 hover:bg-emerald-cyber/[0.02] transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <img
                          src={a.identity.avatarUrl}
                          className="w-7 h-7 border border-border-subtle object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-xs font-mono font-bold text-white uppercase">
                          {a.identity.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[10px] font-mono text-zinc-500 uppercase">
                      {formatEnumLabel(a.identity.strategyType)}
                    </td>
                    <td className="py-3 px-4 text-sm font-mono text-zinc-200 tabular-nums">
                      $
                      {a.reputation.totalFunds.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full bg-emerald-cyber/60"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400 tabular-nums">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td
                      className={cn(
                        "py-3 px-4 text-sm font-mono tabular-nums",
                        a.reputation.cumulativePnl >= 0
                          ? "text-emerald-cyber"
                          : "text-red-400",
                      )}
                    >
                      {a.reputation.cumulativePnl >= 0 ? "+" : ""}$
                      {a.reputation.cumulativePnl.toFixed(2)}
                    </td>
                    <td
                      className={cn(
                        "py-3 px-4 text-sm font-mono tabular-nums",
                        a.reputation.maxDrawdown > 15
                          ? "text-red-400"
                          : "text-zinc-300",
                      )}
                    >
                      {a.reputation.maxDrawdown.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          "text-sm font-mono font-bold tabular-nums",
                          trust >= 70
                            ? "text-emerald-cyber"
                            : trust >= 50
                              ? "text-amber-warning"
                              : "text-red-400",
                        )}
                      >
                        {trust.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        to={`/agents/${a.identity.agentId}`}
                        className="text-[9px] font-mono text-emerald-cyber uppercase tracking-widest hover:underline"
                      >
                        Detail →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
