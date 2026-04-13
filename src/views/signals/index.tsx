import { useState, useEffect } from "react";
import { cn } from "../../utils/cn";
import { useClientValue } from "@/app/hooks/useClientValue";
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Shield,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

type Signal = {
  symbol: string;
  side: "LONG" | "SHORT";
  orderType: "MARKET" | "LIMIT";
  entry: number;
  stopLoss: number;
  targets: number[];
  riskReward: string;
  confidence: number;
  timeframe: "SCALP" | "SWING" | "POSITION";
  reasoning: string;
};

type SignalsResponse = {
  signals: Signal[];
  generatedAt: number;
  nextRefreshAt: number;
  _cached?: boolean;
};

function formatPrice(price: number) {
  if (price >= 1000)
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

function getConfidenceColor(c: number) {
  if (c >= 8) return "text-emerald-cyber";
  if (c >= 6) return "text-amber-400";
  return "text-red-400";
}

function getConfidenceBg(c: number) {
  if (c >= 8) return "bg-emerald-cyber/10 border-emerald-cyber/30";
  if (c >= 6) return "bg-amber-400/10 border-amber-400/30";
  return "bg-red-400/10 border-red-400/30";
}

export default function SignalsPage() {
  const [data, setData] = useState<SignalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Deferred initial countdown — avoids SSR/hydration mismatch from Date.now()
  const initialCountdown = useClientValue(
    () =>
      data?.nextRefreshAt
        ? Math.max(0, Math.floor((data.nextRefreshAt - Date.now()) / 1000))
        : 0,
    0,
  );
  const [countdown, setCountdown] = useState(0);

  const fetchSignals = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/signals");
      if (!res.ok) throw new Error("Failed to fetch");
      const result = await res.json();
      setData(result);
      setError(null);
    } catch {
      setError("Failed to load signals");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(() => fetchSignals(), 10 * 60_000);
    return () => clearInterval(interval);
  }, []);

  // Sync deferred initial countdown value, then tick every second
  useEffect(() => {
    setCountdown(initialCountdown);
  }, [initialCountdown]);

  useEffect(() => {
    if (!data?.nextRefreshAt) return;
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.floor((data.nextRefreshAt - Date.now()) / 1000),
      );
      setCountdown(remaining);
    };
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [data?.nextRefreshAt]);

  const countdownMin = Math.floor(countdown / 60);
  const countdownSec = countdown % 60;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-emerald-cyber" />
              <h1 className="text-sm font-mono font-bold text-white uppercase tracking-[0.2em]">
                AI Trading Signals
              </h1>
            </div>
            <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider max-w-xl">
              AI-generated signals across 12 coins. Updated every 10 minutes.
              Not financial advice.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {data && (
              <div className="flex items-center gap-2 px-3 py-1.5 border border-border-subtle">
                <Clock className="w-3 h-3 text-zinc-600" />
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest tabular-nums">
                  Next: {countdownMin}:
                  {countdownSec.toString().padStart(2, "0")}
                </span>
              </div>
            )}
            <button
              onClick={() => fetchSignals(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 border border-emerald-cyber/30 text-[9px] font-mono text-emerald-cyber uppercase tracking-widest hover:bg-emerald-cyber/10 transition-colors disabled:opacity-40"
            >
              <RefreshCw
                className={cn("w-3 h-3", refreshing && "animate-spin")}
              />
              Refresh
            </button>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <div className="p-3 border border-amber-400/20 bg-amber-400/5">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[8px] font-mono text-amber-400/80 uppercase tracking-wider leading-relaxed">
            These signals are AI-generated analysis for educational purposes.
            Always do your own research and manage your risk. Use proper
            position sizing (risk only 5-10% per trade).
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="space-y-3 text-center">
            <div className="w-6 h-6 border-2 border-emerald-cyber/30 border-t-emerald-cyber rounded-full animate-spin mx-auto" />
            <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
              Analyzing 12 coins...
            </p>
          </div>
        </div>
      ) : error ? (
        <div className="glass-panel p-8 text-center">
          <p className="text-[10px] font-mono text-red-400 uppercase tracking-widest">
            {error}
          </p>
        </div>
      ) : !data?.signals?.length ? (
        <div className="glass-panel p-12 text-center space-y-3">
          <Shield className="w-8 h-8 text-zinc-700 mx-auto" />
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            No strong setups found right now
          </p>
          <p className="text-[9px] font-mono text-zinc-700">
            The AI only generates signals when there's a clear edge. Check back
            soon.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {data.signals.map((signal, idx) => (
            <SignalCard key={`${signal.symbol}-${idx}`} signal={signal} />
          ))}
        </div>
      )}

      {data?.generatedAt && (
        <p className="text-[8px] font-mono text-zinc-700 uppercase tracking-widest text-center">
          Last generated: {new Date(data.generatedAt).toLocaleString()}{" "}
          {data._cached ? "(cached)" : ""}
        </p>
      )}
    </div>
  );
}

function SignalCard({ signal }: { signal: Signal }) {
  const isLong = signal.side === "LONG";
  const sideColor = isLong ? "text-emerald-cyber" : "text-red-400";
  const sideBg = isLong
    ? "bg-emerald-cyber/10 border-emerald-cyber/30"
    : "bg-red-400/10 border-red-400/30";
  const sideBorder = isLong
    ? "border-l-emerald-cyber/60"
    : "border-l-red-400/60";

  return (
    <div
      className={cn(
        "glass-panel p-0 overflow-hidden border-l-[3px]",
        sideBorder,
      )}
    >
      {/* Header */}
      <div className="p-5 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-widest border",
                sideBg,
                sideColor,
              )}
            >
              {isLong ? "🟢" : "🔴"} {signal.side}
            </div>
            <span className="text-[13px] font-mono font-bold text-white uppercase tracking-wider">
              {signal.symbol}USDT
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "px-2 py-0.5 text-[8px] font-mono uppercase tracking-widest border",
                getConfidenceBg(signal.confidence),
                getConfidenceColor(signal.confidence),
              )}
            >
              {signal.confidence}/10
            </div>
            <div className="px-2 py-0.5 text-[8px] font-mono text-zinc-500 uppercase tracking-widest border border-border-subtle">
              {signal.timeframe}
            </div>
          </div>
        </div>

        {/* Entry */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "px-2 py-0.5 text-[8px] font-mono font-bold uppercase tracking-widest border",
              signal.orderType === "LIMIT"
                ? "border-amber-400/30 text-amber-400 bg-amber-400/10"
                : "border-zinc-600 text-zinc-400 bg-zinc-800/50",
            )}
          >
            {signal.orderType === "LIMIT" ? "LIMIT ORDER" : "MARKET ENTRY"}
          </span>
          <span className="text-[9px] font-mono text-zinc-500 uppercase">
            {signal.orderType === "MARKET" ? "(Enter Now)" : "(Wait for Price)"}
          </span>
        </div>

        <div className="p-3 bg-obsidian/60 border border-border-subtle">
          <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest mb-1">
            Entry Price
          </p>
          <p className="text-lg font-mono font-bold text-white tabular-nums">
            ${formatPrice(signal.entry)}
          </p>
        </div>
      </div>

      {/* Targets */}
      <div className="px-5 pb-4 space-y-2">
        <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest flex items-center gap-1.5">
          <Target className="w-3 h-3" /> Take Profit Levels
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {signal.targets.map((tp, i) => {
            const pctFromEntry = ((tp - signal.entry) / signal.entry) * 100;
            return (
              <div
                key={i}
                className="p-2 bg-obsidian/40 border border-border-subtle/60"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-mono text-emerald-cyber/70 uppercase">
                    TP {i + 1}
                  </span>
                  <span className="text-[7px] font-mono text-zinc-600 tabular-nums">
                    {pctFromEntry >= 0 ? "+" : ""}
                    {pctFromEntry.toFixed(1)}%
                  </span>
                </div>
                <p className="text-[10px] font-mono font-bold text-emerald-cyber tabular-nums mt-0.5">
                  ${formatPrice(tp)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stop Loss + Risk/Reward */}
      <div className="px-5 pb-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-red-500/5 border border-red-500/20">
            <p className="text-[8px] font-mono text-red-400/70 uppercase tracking-widest mb-1 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Stop Loss
            </p>
            <p className="text-[12px] font-mono font-bold text-red-400 tabular-nums">
              ${formatPrice(signal.stopLoss)}
            </p>
            <p className="text-[8px] font-mono text-red-400/50 tabular-nums mt-0.5">
              Risk:{" "}
              {Math.abs(
                ((signal.stopLoss - signal.entry) / signal.entry) * 100,
              ).toFixed(2)}
              % per unit
            </p>
          </div>
          <div className="p-3 bg-obsidian/40 border border-border-subtle">
            <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest mb-1">
              Risk / Reward
            </p>
            <p className="text-[12px] font-mono font-bold text-white">
              {signal.riskReward}
            </p>
            {signal.targets.length > 0 &&
              (() => {
                const riskAmt = Math.abs(signal.entry - signal.stopLoss);
                const lastTp = signal.targets[signal.targets.length - 1];
                const rewardAmt = Math.abs(lastTp - signal.entry);
                const riskPct = ((riskAmt / signal.entry) * 100).toFixed(1);
                const rewardPct = ((rewardAmt / signal.entry) * 100).toFixed(1);
                return (
                  <p className="text-[8px] font-mono text-zinc-500 tabular-nums mt-0.5">
                    Risk {riskPct}% → Reward {rewardPct}%
                  </p>
                );
              })()}
          </div>
        </div>
      </div>

      {/* Reasoning */}
      <div className="px-5 pb-5">
        <div className="p-3 bg-obsidian/30 border border-border-subtle/50">
          <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest mb-1.5">
            AI Analysis
          </p>
          <p className="text-[9px] font-mono text-zinc-400 leading-relaxed">
            {signal.reasoning}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-obsidian/50 border-t border-border-subtle/50">
        <p className="text-[7px] font-mono text-zinc-700 uppercase tracking-widest text-center">
          Use proper risk management — Risk only 5-10% per trade
        </p>
      </div>
    </div>
  );
}
