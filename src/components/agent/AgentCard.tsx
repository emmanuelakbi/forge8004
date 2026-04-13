import { cn } from "../../utils/cn";
import Link from "next/link";
import { AggregatedAgentView } from "../../lib/types";
import { formatEnumLabel } from "../../utils/format";
import { Shield, TrendingUp } from "lucide-react";

export default function AgentCard({ agent }: { agent: AggregatedAgentView }) {
  const { identity, reputation, validationAverageScore } = agent;
  const strategyLabel = formatEnumLabel(identity.strategyType);

  return (
    <div
      className={cn(
        "glass-panel p-6 hover:border-emerald-cyber/40 transition-all group relative overflow-hidden",
        identity.status === "deactivated" && "opacity-60",
      )}
    >
      {/* Decorative corner */}
      <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-cyber/5 rotate-45 translate-x-6 -translate-y-6" />

      {identity.status === "deactivated" && (
        <div className="absolute top-3 left-3 px-2 py-0.5 bg-red-500/10 border border-red-500/20 z-10">
          <span className="text-[8px] font-mono text-red-400 uppercase tracking-widest font-bold">
            Deactivated
          </span>
        </div>
      )}

      <div className="flex items-start justify-between mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={identity.avatarUrl}
              alt={identity.name}
              className="w-14 h-14 bg-obsidian border border-border-subtle p-1"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  `https://api.dicebear.com/7.x/shapes/svg?seed=${identity.agentId}`;
              }}
            />
            <div
              className={cn(
                "absolute -bottom-1 -right-1 w-3 h-3 border border-obsidian",
                identity.status === "deactivated"
                  ? "bg-red-500"
                  : "bg-emerald-cyber",
              )}
            />
          </div>
          <div>
            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider group-hover:text-emerald-cyber transition-colors break-words">
              {identity.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-mono text-zinc-600 uppercase">
                ID:
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                0x{identity.agentId.padStart(4, "0")}
              </span>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "px-2 py-1 text-[9px] font-mono font-bold uppercase tracking-widest border",
            identity.riskProfile === "aggressive"
              ? "border-red-500/30 text-red-400 bg-red-500/5"
              : identity.riskProfile === "balanced"
                ? "border-amber-warning/30 text-amber-warning bg-amber-warning/5"
                : "border-emerald-cyber/30 text-emerald-cyber bg-emerald-cyber/5",
          )}
        >
          {identity.riskProfile}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-border-subtle mb-8 border border-border-subtle">
        <div className="bg-obsidian p-4">
          <p className="text-[9px] font-mono uppercase text-zinc-600 font-bold mb-2 tracking-widest">
            PnL // Yield
          </p>
          <div className="flex items-center gap-2 text-emerald-cyber">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-sm font-mono font-bold tabular-nums">
              ${reputation.cumulativePnl.toLocaleString()}
            </span>
          </div>
        </div>
        <div className="bg-obsidian p-4">
          <p className="text-[9px] font-mono uppercase text-zinc-600 font-bold mb-2 tracking-widest">
            Trust // Score
          </p>
          <div className="flex items-center gap-2 text-zinc-300">
            <Shield className="w-3.5 h-3.5 text-emerald-cyber/60" />
            <span className="text-sm font-mono font-bold tabular-nums">
              {validationAverageScore?.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-8">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-mono uppercase text-zinc-600 tracking-widest">
            Strategy
          </span>
          <span className="text-[10px] font-mono text-zinc-400 uppercase text-right">
            {strategyLabel}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-mono uppercase text-zinc-600 tracking-widest">
            Sharpe Ratio
          </span>
          <span className="text-[10px] font-mono text-emerald-cyber tabular-nums">
            {reputation.sharpeLikeScore.toFixed(2)}
          </span>
        </div>
      </div>

      <Link
        href={`/agents/${identity.agentId}`}
        className="btn-secondary w-full text-center text-[11px] py-3 block uppercase tracking-[0.2em]"
      >
        View Agent Details
      </Link>
    </div>
  );
}
