import { cn } from "../../utils/cn";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AggregatedAgentView } from "../../lib/types";
import { formatEnumLabel } from "../../utils/format";
import AgentStatsGrid from "../../components/agent/AgentStatsGrid";
import AgentCard from "../../components/agent/AgentCard";
import { ShieldCheck, TrendingUp, Users } from "lucide-react";
import { erc8004Client } from "@/app/lib/erc8004Client";
import { subscribeToAuthState, User } from "@/app/lib/firebase";
import { getTrustScore } from "../../services/trustArtifacts";

export default function Overview() {
  const [agents, setAgents] = useState<AggregatedAgentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setAgents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    erc8004Client
      .getAllAgents()
      .then((data) => {
        setAgents(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch agents:", err);
        setError("Failed to load agent data. Please try refreshing.");
        setLoading(false);
      });
  }, [authReady, user]);

  const activeAgents = useMemo(
    () => agents.filter((a) => a.identity.status !== "deactivated"),
    [agents],
  );
  const topAgents = useMemo(
    () =>
      [...activeAgents]
        .sort(
          (a, b) => b.reputation.sharpeLikeScore - a.reputation.sharpeLikeScore,
        )
        .slice(0, 4),
    [activeAgents],
  );
  const trustRankedAgents = useMemo(
    () =>
      [...activeAgents]
        .sort((a, b) => getTrustScore(b) - getTrustScore(a))
        .slice(0, 5),
    [activeAgents],
  );
  const latestValidationTimestamp = useMemo(
    () =>
      agents.reduce((latest, current) => {
        const timestamp = current.latestValidation?.timestamp ?? 0;
        return Math.max(latest, timestamp);
      }, 0),
    [agents],
  );

  if (loading)
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-2 border-emerald-cyber/20 border-t-emerald-cyber animate-spin mb-4" />
        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em] animate-pulse">
          Synchronizing Protocol Data...
        </p>
      </div>
    );

  if (!user) {
    return (
      <div className="page-shell">
        <section className="glass-panel p-8 sm:p-12 border border-emerald-cyber/20 bg-emerald-cyber/[0.03] space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-cyber animate-pulse" />
            <span className="text-[10px] font-mono text-emerald-cyber uppercase tracking-widest">
              Private Workspace
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-mono font-bold text-white uppercase tracking-tighter">
            Sign in to load{" "}
            <span className="text-emerald-cyber">your agents</span>
          </h1>
          <p className="max-w-2xl text-[11px] sm:text-xs font-mono text-zinc-500 uppercase tracking-wider leading-relaxed">
            Console metrics, validations, trading logs, and capital telemetry
            now load per authenticated user, so each account only sees its own
            registry data.
          </p>
          <div className="flex gap-3">
            <Link
              href="/register-agent"
              className="px-6 py-3 bg-emerald-cyber text-obsidian font-mono font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-emerald-cyber/90 transition-all"
            >
              Register Agent
            </Link>
            <Link
              href="/agents"
              className="px-6 py-3 border border-border-subtle text-zinc-300 font-mono font-bold text-[10px] uppercase tracking-[0.2em] hover:border-emerald-cyber/30 hover:text-emerald-cyber transition-all"
            >
              Go to Registry
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell">
        <div className="glass-panel p-8 sm:p-12 border border-red-500/20 bg-red-500/[0.03] space-y-4 text-center">
          <p className="text-sm font-mono text-red-400 uppercase tracking-wider">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary inline-flex items-center justify-center px-5 py-3 text-[10px] tracking-[0.2em]"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      {/* Header Section */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-emerald-cyber animate-pulse" />
            <span className="text-[10px] font-mono text-emerald-cyber uppercase tracking-widest">
              Protocol Active // v1.0.4
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-mono font-bold text-white tracking-tighter uppercase">
            Operator <span className="text-emerald-cyber">Console</span>
          </h1>
          <p className="text-zinc-500 text-xs font-mono mt-2 uppercase tracking-wider">
            Your live workspace for agents, trust signals, and capital activity.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1">
              Last Sync
            </p>
            <p className="text-xs font-mono text-zinc-300">
              {latestValidationTimestamp
                ? new Date(latestValidationTimestamp).toLocaleString()
                : "Awaiting first validation"}
            </p>
          </div>
          <div className="w-px h-10 bg-border-subtle" />
          <div className="text-right">
            <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1">
              Network
            </p>
            <p className="text-xs font-mono text-emerald-cyber">BASE SEPOLIA</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <AgentStatsGrid agents={agents} />

      {/* How to Start Section */}
      <section className="glass-panel p-8 border border-emerald-cyber/30 bg-emerald-cyber/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-cyber/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <h2 className="text-xl font-mono font-bold text-white uppercase tracking-tighter flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-cyber" />
              Getting Started with Forge8004
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-emerald-cyber font-bold uppercase tracking-widest">
                  01. Register
                </p>
                <p className="text-[11px] font-mono text-zinc-400 uppercase leading-relaxed">
                  Create your autonomous agent in the Identity Registry.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-emerald-cyber font-bold uppercase tracking-widest">
                  02. View Details
                </p>
                <p className="text-[11px] font-mono text-zinc-400 uppercase leading-relaxed">
                  Go to the Agents list and select "View Agent Details".
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-emerald-cyber font-bold uppercase tracking-widest">
                  03. Fund Agent
                </p>
                <p className="text-[11px] font-mono text-zinc-400 uppercase leading-relaxed">
                  Request capital from the Forge Vault to start trading.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-emerald-cyber font-bold uppercase tracking-widest">
                  04. Get Signals
                </p>
                <p className="text-[11px] font-mono text-zinc-400 uppercase leading-relaxed">
                  View AI-generated trade signals with TP/SL levels.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 w-full md:w-auto">
            <Link
              href="/register-agent"
              className="px-8 py-4 bg-emerald-cyber text-obsidian font-mono font-bold text-xs uppercase tracking-[0.2em] text-center hover:bg-emerald-cyber/90 transition-all shadow-[0_0_20px_rgba(0,255,157,0.2)]"
            >
              Register Now
            </Link>
            <Link
              href="/agents"
              className="px-8 py-4 border border-emerald-cyber/30 text-emerald-cyber font-mono font-bold text-xs uppercase tracking-[0.2em] text-center hover:bg-emerald-cyber/10 transition-all"
            >
              Browse Registry
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Main Content - Top Strategies */}
        <div className="lg:col-span-8 space-y-8">
          <section className="glass-panel p-6 sm:p-8 border border-emerald-cyber/20 bg-emerald-cyber/[0.03]">
            <div className="flex items-center justify-between border-l-2 border-emerald-cyber pl-4 mb-6">
              <div>
                <h2 className="text-lg font-mono font-bold text-white uppercase tracking-wider flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-cyber" />
                  Trust Leaderboard
                </h2>
                <p className="text-[10px] font-mono text-zinc-600 uppercase mt-1">
                  Ranked by trust score, validation quality, Sharpe, and
                  drawdown discipline
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {trustRankedAgents.length === 0 ? (
                <div className="border border-dashed border-border-subtle bg-obsidian/30 p-8 text-center">
                  <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.2em]">
                    No trust telemetry available yet
                  </p>
                </div>
              ) : (
                trustRankedAgents.map((agent, index) => {
                  const trustScore = getTrustScore(agent);

                  return (
                    <div
                      key={agent.identity.agentId}
                      className="grid grid-cols-1 sm:grid-cols-[auto,1fr,auto] gap-4 items-center border border-border-subtle bg-obsidian/40 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 flex items-center justify-center border border-emerald-cyber/20 bg-emerald-cyber/5 text-emerald-cyber font-mono text-xs font-bold">
                          #{index + 1}
                        </div>
                        <img
                          src={agent.identity.avatarUrl}
                          alt={agent.identity.name}
                          className="w-10 h-10 border border-border-subtle bg-zinc-900 object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              `https://api.dicebear.com/7.x/shapes/svg?seed=${agent.identity.agentId}`;
                          }}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <p className="text-sm font-mono font-bold text-white uppercase tracking-wider truncate">
                            {agent.identity.name}
                          </p>
                          <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-600">
                            {formatEnumLabel(agent.identity.strategyType)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[9px] font-mono uppercase tracking-widest text-zinc-500">
                          <span>
                            Validation:{" "}
                            <span className="text-zinc-300">
                              {(agent.validationAverageScore || 0).toFixed(1)}%
                            </span>
                          </span>
                          <span>
                            Sharpe:{" "}
                            <span className="text-zinc-300">
                              {agent.reputation.sharpeLikeScore.toFixed(2)}
                            </span>
                          </span>
                          <span>
                            Drawdown:{" "}
                            <span className="text-zinc-300">
                              {agent.reputation.maxDrawdown.toFixed(1)}%
                            </span>
                          </span>
                          <span>
                            PnL:{" "}
                            <span className="text-zinc-300">
                              ${agent.reputation.cumulativePnl.toLocaleString()}
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="sm:text-right">
                        <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1">
                          Trust Score
                        </p>
                        <p className="text-2xl font-mono font-bold text-emerald-cyber tabular-nums">
                          {trustScore.toFixed(1)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <div className="flex items-center justify-between border-l-2 border-emerald-cyber pl-4">
            <div>
              <h2 className="text-lg font-mono font-bold text-white uppercase tracking-wider flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-emerald-cyber" />
                Top Performing Strategies
              </h2>
              <p className="text-[10px] font-mono text-zinc-600 uppercase mt-1">
                Ranked by Sharpe-adjusted reputation score
              </p>
            </div>
            <Link
              href="/agents"
              className="text-[10px] font-mono font-bold text-emerald-cyber hover:text-emerald-cyber/80 transition-colors uppercase tracking-[0.2em] border border-emerald-cyber/20 px-4 py-2 bg-emerald-cyber/5 block"
            >
              Access All
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {topAgents.map((agent: AggregatedAgentView) => (
              <div key={agent.identity.agentId}>
                <AgentCard agent={agent} />
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="lg:col-span-4 space-y-10">
          {/* Recent Validations */}
          <section className="space-y-6">
            <h2 className="text-sm font-mono font-bold text-white uppercase tracking-widest flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-emerald-cyber" />
              Recent Validations
            </h2>
            <div className="glass-panel p-6 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-cyber/20 to-transparent" />
              <div className="space-y-6">
                {agents
                  .flatMap((a) =>
                    a.latestValidation ? [a.latestValidation] : [],
                  )
                  .slice(0, 4)
                  .map((v) => (
                    <div key={v.id} className="flex gap-4 group">
                      <div
                        className={cn(
                          "w-1 h-12 shrink-0",
                          v.score > 90
                            ? "bg-emerald-cyber"
                            : "bg-amber-warning",
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-[10px] font-mono font-bold text-zinc-300 uppercase truncate pr-2">
                            {v.validationType}
                          </p>
                          <span className="text-[10px] font-mono text-emerald-cyber tabular-nums">
                            {v.score}%
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-zinc-600 italic leading-relaxed line-clamp-2">
                          "{v.comment}"
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </section>

          {/* Identity Registry Card */}
          <section className="glass-panel p-6 border-l-4 border-l-emerald-cyber bg-emerald-cyber/[0.02]">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-5 h-5 text-emerald-cyber" />
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-widest">
                Identity Registry
              </h3>
            </div>
            <p className="text-[11px] font-mono text-zinc-500 leading-relaxed mb-6 uppercase tracking-tight">
              All agents are registered as unique ERC-721 tokens, ensuring
              verifiable ownership and immutable strategy identity.
            </p>
            <div className="flex items-center justify-between">
              <div className="flex -space-x-3">
                {agents.slice(0, 5).map((a) => (
                  <img
                    key={a.identity.agentId}
                    src={a.identity.avatarUrl}
                    alt={a.identity.name}
                    className="w-9 h-9 border-2 border-obsidian bg-zinc-900 object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        `https://api.dicebear.com/7.x/shapes/svg?seed=${a.identity.agentId}`;
                    }}
                  />
                ))}
                {agents.length > 5 && (
                  <div className="w-9 h-9 border-2 border-obsidian bg-zinc-900 flex items-center justify-center text-[10px] font-mono text-zinc-500 font-bold">
                    +{agents.length - 5}
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
                  Total Nodes
                </p>
                <p className="text-lg font-mono font-bold text-white tabular-nums">
                  {agents.length}
                </p>
              </div>
            </div>
          </section>

          {/* Quick Access to Funding */}
          <section className="glass-panel p-6 border border-emerald-cyber/20 bg-emerald-cyber/5">
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-cyber" />
              Quick Access: Funding
            </h3>
            <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-tight mb-6 leading-relaxed">
              Need to fund your agent? Select an agent from the registry to
              access the Capital Vault.
            </p>
            <Link
              href="/agents"
              className="w-full py-3 bg-emerald-cyber text-obsidian font-mono font-bold text-[10px] uppercase tracking-widest text-center block hover:bg-emerald-cyber/90 transition-colors"
            >
              Go to Agent Registry
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
