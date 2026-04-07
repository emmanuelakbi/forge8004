import { cn } from "../../utils/cn";
import { useMemo } from "react";
import { TrendingUp, ShieldCheck, Activity, BarChart3 } from "lucide-react";
import { AggregatedAgentView } from "../../lib/types";
import { motion } from "motion/react";
import { getTrustScore } from "../../services/trustArtifacts";

export default function AgentStatsGrid({
  agents,
}: {
  agents: AggregatedAgentView[];
}) {
  const stats = useMemo(() => {
    const totalPnl = agents.reduce(
      (acc, a) => acc + a.reputation.cumulativePnl,
      0,
    );
    const totalTvl = agents.reduce(
      (acc, a) => acc + (a.reputation.totalFunds || 0),
      0,
    );
    const avgValidation =
      agents.length > 0
        ? agents.reduce((acc, a) => acc + (a.validationAverageScore || 0), 0) /
          agents.length
        : 0;
    const bestSharpe =
      agents.length > 0
        ? Math.max(...agents.map((a) => a.reputation.sharpeLikeScore))
        : 0;
    const avgTrust =
      agents.length > 0
        ? agents.reduce((acc, agent) => acc + getTrustScore(agent), 0) /
          agents.length
        : 0;

    return [
      {
        name: "Total TVL",
        value: `$${totalTvl.toLocaleString()}`,
        icon: Activity,
        color: "text-emerald-cyber",
      },
      {
        name: "Treasury PnL",
        value: `$${totalPnl.toLocaleString()}`,
        icon: TrendingUp,
        color: "text-emerald-cyber",
      },
      {
        name: "Best Sharpe",
        value: bestSharpe.toFixed(2),
        icon: BarChart3,
        color: "text-emerald-cyber",
      },
      {
        name: "Trust Index",
        value: `${avgTrust.toFixed(1)}/100`,
        icon: ShieldCheck,
        color: "text-amber-warning",
        subValue: `Validation ${avgValidation.toFixed(1)}%`,
      },
    ];
  }, [agents]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
      {stats.map((stat) => (
        <div
          key={stat.name}
          className="glass-panel p-6 relative group overflow-hidden"
        >
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-emerald-cyber/30" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-emerald-cyber/30" />

          <div className="flex items-center justify-between mb-6">
            <div
              className={cn(
                "p-2 bg-obsidian border border-border-subtle",
                stat.color,
              )}
            >
              <stat.icon className="w-5 h-5" />
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-600">
                Metric ID
              </span>
              <span className="text-[10px] font-mono text-zinc-500 uppercase">
                0x{stat.name.length.toString(16).padStart(4, "0")}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">
              {stat.name}
            </p>
            <h3 className="text-3xl font-mono font-bold text-white tracking-tighter tabular-nums">
              {stat.value}
            </h3>
            {"subValue" in stat && stat.subValue ? (
              <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-600 pt-1">
                {stat.subValue}
              </p>
            ) : null}
          </div>

          {/* Decorative progress bar */}
          <div className="mt-6 h-[2px] w-full bg-border-subtle overflow-hidden">
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "0%" }}
              transition={{ duration: 1.5, ease: "circOut" }}
              className={cn(
                "h-full w-2/3 bg-emerald-cyber/40",
                stat.color === "text-amber-warning" && "bg-amber-warning/40",
              )}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
