import { cn } from "../../utils/cn";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AggregatedAgentView,
  TradeIntent,
  ValidationRecord,
  AgentCheckpoint,
} from "../../lib/types";
import { erc8004Client } from "@/app/lib/erc8004Client";
import { subscribeToAuthState, User } from "@/app/lib/firebase";
import { getTrustScore } from "../../services/trustArtifacts";
import { formatEnumLabel } from "../../utils/format";
import {
  Printer,
  Share2,
  Shield,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default function TrustReport() {
  const params = useParams<{ agentId: string }>();
  const agentId = params?.agentId;
  const [agent, setAgent] = useState<AggregatedAgentView | null>(null);
  const [intents, setIntents] = useState<TradeIntent[]>([]);
  const [checkpoints, setCheckpoints] = useState<AgentCheckpoint[]>([]);
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
    if (!authReady || !user || !agentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      erc8004Client.getAllAgents(),
      erc8004Client.getTradeIntents(agentId),
      erc8004Client.getCheckpoints(agentId),
    ])
      .then(([agents, ints, cps]) => {
        setAgent(agents.find((a) => a.identity.agentId === agentId) || null);
        setIntents(ints);
        setCheckpoints(cps);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [authReady, user, agentId]);

  if (loading)
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-2 border-emerald-cyber/20 border-t-emerald-cyber animate-spin mb-4" />
      </div>
    );

  if (!user || !agent)
    return (
      <div className="page-shell">
        <div className="glass-panel p-12 text-center border border-border-subtle">
          <p className="text-sm font-mono text-zinc-400 uppercase">
            Agent not found or not authenticated.
          </p>
        </div>
      </div>
    );

  const trust = getTrustScore(agent);
  const rep = agent.reputation;
  const identity = agent.identity;

  // Trade stats
  const entries = intents.filter(
    (i) => i.artifactType === "TRADE_INTENT" && i.status === "OPEN",
  );
  const exits = intents.filter(
    (i) =>
      i.artifactType === "POSITION_CLOSE" ||
      i.status === "CLOSED" ||
      i.status === "HIT_TP" ||
      i.status === "HIT_SL",
  );
  const riskBlocks = intents.filter((i) => i.artifactType === "RISK_BLOCK");
  const wins = exits.filter((i) => (i.execution?.realizedPnl ?? 0) > 0);
  const winRate = exits.length > 0 ? (wins.length / exits.length) * 100 : 0;
  const totalRealizedPnl = exits.reduce(
    (s, i) => s + (i.execution?.realizedPnl ?? 0),
    0,
  );

  // Validation stats
  const aiValidations = intents.filter((i) => i.validation?.score != null);
  const avgAiScore =
    aiValidations.length > 0
      ? aiValidations.reduce((s, i) => s + (i.validation?.score ?? 0), 0) /
        aiValidations.length
      : 0;

  // External validations
  const extValidations = checkpoints.filter((c) =>
    c.title?.includes("RULE_ENGINE"),
  );

  // Signature stats
  const signedIntents = intents.filter(
    (i) => i.signature?.status === "SIGNED_VERIFIED",
  );
  const simulatedIntents = intents.filter(
    (i) =>
      i.signature?.status === "SIMULATED_SIGNED" ||
      i.signature?.status === "NOT_REQUIRED",
  );

  const generatedAt = new Date().toISOString();

  return (
    <div className="page-shell space-y-8 max-w-4xl mx-auto">
      {/* Action bar — hidden in print */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/agents/${agentId}`}
          className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest hover:text-emerald-cyber"
        >
          ← Back to Agent
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
            }}
            className="flex items-center gap-1.5 px-3 py-2 border border-border-subtle text-zinc-400 font-mono text-[10px] uppercase tracking-wider hover:border-emerald-cyber/30 hover:text-emerald-cyber transition-all"
          >
            <Share2 className="w-3 h-3" /> Copy Link
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-cyber text-obsidian font-mono text-[10px] uppercase tracking-wider font-bold hover:bg-emerald-cyber/90 transition-all"
          >
            <Printer className="w-3 h-3" /> Print / PDF
          </button>
        </div>
      </div>

      {/* Report Header */}
      <div className="border-2 border-emerald-cyber/30 p-8 bg-emerald-cyber/[0.02]">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-emerald-cyber" />
          <span className="text-[10px] font-mono text-emerald-cyber uppercase tracking-widest">
            Forge8004 — Agent Trust Report
          </span>
        </div>
        <div className="flex items-center gap-5">
          <img
            src={identity.avatarUrl}
            className="w-16 h-16 border-2 border-emerald-cyber/20 object-cover"
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 className="text-2xl font-mono font-bold text-white uppercase tracking-tighter">
              {identity.name}
            </h1>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-1">
              {formatEnumLabel(identity.strategyType)} · Agent #
              {identity.agentId}
              {identity.onChain?.tokenId &&
                ` · ERC-721 #${identity.onChain.tokenId}`}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
              Trust Score
            </p>
            <p
              className={cn(
                "text-4xl font-mono font-bold tabular-nums",
                trust >= 70
                  ? "text-emerald-cyber"
                  : trust >= 50
                    ? "text-amber-warning"
                    : "text-red-400",
              )}
            >
              {trust.toFixed(1)}
            </p>
          </div>
        </div>
        <p className="text-[9px] font-mono text-zinc-600 mt-4">
          Generated: {generatedAt} · Network: Base Sepolia (Chain 84532)
        </p>
      </div>

      {/* Identity Section */}
      <section className="glass-panel p-6 border border-border-subtle">
        <h2 className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-4 border-l-2 border-emerald-cyber pl-3">
          Identity
        </h2>
        <div className="grid grid-cols-2 gap-4 text-[11px] font-mono">
          {[
            ["Agent ID", identity.agentId],
            ["Owner", identity.owner],
            ["Strategy", formatEnumLabel(identity.strategyType)],
            ["Risk Profile", identity.riskProfile],
            ["Wallet", identity.agentWallet || "Derived sandbox wallet"],
            [
              "On-Chain Token",
              identity.onChain
                ? `#${identity.onChain.tokenId} (tx: ${identity.onChain.txHash.slice(0, 10)}...)`
                : "Not minted",
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between py-2 border-b border-border-subtle/30"
            >
              <span className="text-zinc-500 uppercase tracking-wider">
                {label}
              </span>
              <span className="text-zinc-300 text-right max-w-[60%] truncate">
                {value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Performance Section */}
      <section className="glass-panel p-6 border border-border-subtle">
        <h2 className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-4 border-l-2 border-emerald-cyber pl-3">
          Performance
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Treasury",
              value: `$${rep.totalFunds.toLocaleString()}`,
              good: true,
            },
            {
              label: "Cumulative PnL",
              value: `${rep.cumulativePnl >= 0 ? "+" : ""}$${rep.cumulativePnl.toFixed(2)}`,
              good: rep.cumulativePnl >= 0,
            },
            {
              label: "Realized PnL",
              value: `${totalRealizedPnl >= 0 ? "+" : ""}$${totalRealizedPnl.toFixed(2)}`,
              good: totalRealizedPnl >= 0,
            },
            {
              label: "Sharpe Ratio",
              value: rep.sharpeLikeScore.toFixed(2),
              good: rep.sharpeLikeScore > 1,
            },
            {
              label: "Max Drawdown",
              value: `${rep.maxDrawdown.toFixed(1)}%`,
              good: rep.maxDrawdown <= 15,
            },
            {
              label: "Win Rate",
              value: `${winRate.toFixed(0)}%`,
              good: winRate >= 55,
            },
            {
              label: "Total Trades",
              value: rep.tradesCount.toString(),
              good: true,
            },
            {
              label: "Entries / Exits",
              value: `${entries.length} / ${exits.length}`,
              good: true,
            },
          ].map((s) => (
            <div
              key={s.label}
              className="text-center py-3 bg-obsidian/60 border border-border-subtle/30"
            >
              <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                {s.label}
              </p>
              <p
                className={cn(
                  "text-lg font-mono font-bold tabular-nums mt-1",
                  s.good ? "text-emerald-cyber" : "text-red-400",
                )}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Validation Section */}
      <section className="glass-panel p-6 border border-border-subtle">
        <h2 className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-4 border-l-2 border-emerald-cyber pl-3">
          Validation & Risk
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: "Avg AI Validation",
              value: `${avgAiScore.toFixed(0)}%`,
              good: avgAiScore >= 75,
            },
            {
              label: "Risk Blocks",
              value: riskBlocks.length.toString(),
              good: riskBlocks.length <= 2,
            },
            {
              label: "Signed Intents",
              value: signedIntents.length.toString(),
              good: signedIntents.length > 0,
            },
            {
              label: "Simulated Intents",
              value: simulatedIntents.length.toString(),
              good: false,
            },
          ].map((s) => (
            <div
              key={s.label}
              className="text-center py-3 bg-obsidian/60 border border-border-subtle/30"
            >
              <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                {s.label}
              </p>
              <p
                className={cn(
                  "text-lg font-mono font-bold tabular-nums mt-1",
                  s.good ? "text-emerald-cyber" : "text-zinc-400",
                )}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Risk events list */}
        {riskBlocks.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">
              Risk Events
            </p>
            {riskBlocks.slice(0, 5).map((rb, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-[10px] font-mono border-l-2 border-red-400/30 pl-3 py-1"
              >
                <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-zinc-400">
                    {new Date(rb.timestamp).toLocaleString()}
                  </span>
                  <span className="text-zinc-500 ml-2">
                    {rb.reason ||
                      rb.riskCheck?.comment ||
                      "Blocked by risk router"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Trade Log */}
      <section className="glass-panel p-6 border border-border-subtle">
        <h2 className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-4 border-l-2 border-emerald-cyber pl-3">
          Recent Trades (Last 10)
        </h2>
        {intents.filter((i) => i.artifactType !== "SYSTEM_HOLD").length ===
        0 ? (
          <p className="text-[10px] font-mono text-zinc-600 uppercase">
            No trades recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[10px] font-mono">
              <thead>
                <tr className="border-b border-border-subtle">
                  {[
                    "Time",
                    "Side",
                    "Asset",
                    "Entry",
                    "Exit",
                    "PnL",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left text-zinc-600 uppercase tracking-widest py-2 px-3"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {intents
                  .filter((i) => i.artifactType !== "SYSTEM_HOLD")
                  .slice(0, 10)
                  .map((intent, i) => {
                    const pnl = intent.execution?.realizedPnl;
                    return (
                      <tr key={i} className="border-b border-border-subtle/30">
                        <td className="py-2 px-3 text-zinc-500 tabular-nums">
                          {new Date(intent.timestamp).toLocaleString()}
                        </td>
                        <td
                          className={cn(
                            "py-2 px-3 font-bold uppercase",
                            intent.side === "BUY"
                              ? "text-emerald-cyber"
                              : intent.side === "SELL"
                                ? "text-red-400"
                                : "text-zinc-500",
                          )}
                        >
                          {intent.side}
                        </td>
                        <td className="py-2 px-3 text-zinc-300">
                          {intent.asset}
                        </td>
                        <td className="py-2 px-3 text-zinc-300 tabular-nums">
                          {intent.entryPrice
                            ? `$${intent.entryPrice.toFixed(2)}`
                            : "—"}
                        </td>
                        <td className="py-2 px-3 text-zinc-300 tabular-nums">
                          {intent.exitPrice
                            ? `$${intent.exitPrice.toFixed(2)}`
                            : "—"}
                        </td>
                        <td
                          className={cn(
                            "py-2 px-3 tabular-nums",
                            pnl != null
                              ? pnl >= 0
                                ? "text-emerald-cyber"
                                : "text-red-400"
                              : "text-zinc-600",
                          )}
                        >
                          {pnl != null
                            ? `${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`
                            : "—"}
                        </td>
                        <td className="py-2 px-3 text-zinc-500 uppercase">
                          {intent.status || intent.artifactType || "—"}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Trust Checkpoints */}
      <section className="glass-panel p-6 border border-border-subtle">
        <h2 className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-4 border-l-2 border-emerald-cyber pl-3">
          Trust Checkpoints (Last 10)
        </h2>
        {checkpoints.length === 0 ? (
          <p className="text-[10px] font-mono text-zinc-600 uppercase">
            No checkpoints recorded yet.
          </p>
        ) : (
          <div className="space-y-2">
            {checkpoints.slice(0, 10).map((cp, i) => (
              <div
                key={i}
                className="flex items-start gap-3 py-2 border-b border-border-subtle/20 last:border-0"
              >
                {cp.status === "APPROVED" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-cyber mt-0.5 shrink-0" />
                ) : cp.status === "BLOCKED" ? (
                  <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                ) : (
                  <Shield className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between">
                    <span className="text-[10px] font-mono text-zinc-300 uppercase">
                      {cp.title}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-600 tabular-nums">
                      {new Date(cp.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-zinc-500 mt-0.5 line-clamp-1">
                    {cp.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <div className="text-center py-6 border-t border-border-subtle">
        <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
          Forge8004 · ERC-8004 Agent Trust Report · Base Sepolia · {generatedAt}
        </p>
      </div>
    </div>
  );
}
