import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../utils/cn";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Layers,
  Clock,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type CoinData = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  trades24h: number;
  openPrice: number;
  indicators: {
    rsi14_5m: number | null;
    rsi14_1h: number | null;
  };
  levels: Record<string, { support: number | null; resistance: number | null }>;
  candles: Record<string, Candle[]>;
};

type Timeframe = "5m" | "15m" | "1h" | "4h" | "1d";

const TIMEFRAMES: { key: Timeframe; label: string }[] = [
  { key: "5m", label: "5M" },
  { key: "15m", label: "15M" },
  { key: "1h", label: "1H" },
  { key: "4h", label: "4H" },
  { key: "1d", label: "1D" },
];

function formatPrice(price: number) {
  if (price >= 1000)
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

function formatVolume(vol: number) {
  if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `$${(vol / 1e6).toFixed(1)}M`;
  return `$${vol.toLocaleString()}`;
}

function formatTime(ts: number, tf: Timeframe) {
  const d = new Date(ts);
  if (tf === "1d")
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  if (tf === "4h" || tf === "1h")
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getRsiColor(rsi: number | null) {
  if (rsi === null) return "text-zinc-600";
  if (rsi >= 70) return "text-red-400";
  if (rsi <= 30) return "text-emerald-cyber";
  return "text-zinc-300";
}

function getRsiLabel(rsi: number | null) {
  if (rsi === null) return "N/A";
  if (rsi >= 70) return "Overbought";
  if (rsi <= 30) return "Oversold";
  return "Neutral";
}

export default function CoinDetail({ coinId }: { coinId: string }) {
  const [data, setData] = useState<CoinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTf, setSelectedTf] = useState<Timeframe>("1h");

  useEffect(() => {
    let mounted = true;
    const fetchDetail = async () => {
      try {
        const res = await fetch(`/api/market/coins/${coinId}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const result = await res.json();
        if (mounted) {
          setData(result);
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setError("Failed to load coin data");
          setLoading(false);
        }
      }
    };

    fetchDetail();
    const interval = setInterval(fetchDetail, 20_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [coinId]);

  const chartData = useMemo(() => {
    if (!data?.candles?.[selectedTf]) return [];
    return data.candles[selectedTf].map((c) => ({
      time: formatTime(c.time, selectedTf),
      price: c.close,
      high: c.high,
      low: c.low,
      open: c.open,
      volume: c.volume,
      bullish: c.close >= c.open,
    }));
  }, [data, selectedTf]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-emerald-cyber/30 border-t-emerald-cyber rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link
          to="/markets"
          className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase tracking-widest hover:text-emerald-cyber transition-colors"
        >
          <ArrowLeft className="w-3 h-3" /> Back to Markets
        </Link>
        <div className="glass-panel p-8 text-center">
          <p className="text-[10px] font-mono text-red-400 uppercase tracking-widest">
            {error || "Coin not found"}
          </p>
        </div>
      </div>
    );
  }

  const levels = data.levels[selectedTf];
  const priceRange24h = data.high24h - data.low24h;
  const pricePosition =
    priceRange24h > 0 ? ((data.price - data.low24h) / priceRange24h) * 100 : 50;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Link
            to="/markets"
            className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase tracking-widest hover:text-emerald-cyber transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> Back to Markets
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-zinc-deep border border-border-subtle flex items-center justify-center">
              <span className="text-[12px] font-mono font-bold text-white">
                {data.symbol.slice(0, 2)}
              </span>
            </div>
            <div>
              <h1 className="text-lg font-mono font-bold text-white uppercase tracking-wider">
                {data.symbol}{" "}
                <span className="text-zinc-600 text-sm">/ USDT</span>
              </h1>
              <p className="text-[9px] font-mono text-zinc-600 uppercase">
                {data.name}
              </p>
            </div>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-2xl font-mono font-bold text-white tabular-nums">
            ${formatPrice(data.price)}
          </p>
          <div
            className={cn(
              "flex items-center gap-1 text-sm font-mono font-bold sm:justify-end",
              data.change24h >= 0 ? "text-emerald-cyber" : "text-red-400",
            )}
          >
            {data.change24h >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {data.change24h >= 0 ? "+" : ""}
            {data.change24h.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          {
            label: "24h High",
            value: `$${formatPrice(data.high24h)}`,
            icon: TrendingUp,
          },
          {
            label: "24h Low",
            value: `$${formatPrice(data.low24h)}`,
            icon: TrendingDown,
          },
          {
            label: "24h Volume",
            value: formatVolume(data.volume24h),
            icon: BarChart3,
          },
          {
            label: "24h Trades",
            value: data.trades24h.toLocaleString(),
            icon: Zap,
          },
          {
            label: "RSI (5M)",
            value: data.indicators.rsi14_5m?.toFixed(1) || "N/A",
            icon: Activity,
            color: getRsiColor(data.indicators.rsi14_5m),
          },
          {
            label: "RSI (1H)",
            value: data.indicators.rsi14_1h?.toFixed(1) || "N/A",
            icon: Activity,
            color: getRsiColor(data.indicators.rsi14_1h),
          },
        ].map((stat) => (
          <div key={stat.label} className="glass-panel p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <stat.icon className="w-3 h-3 text-zinc-600" />
              <p className="text-[7px] font-mono text-zinc-600 uppercase tracking-widest">
                {stat.label}
              </p>
            </div>
            <p
              className={cn(
                "text-[12px] font-mono font-bold tabular-nums",
                stat.color || "text-white",
              )}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Price Position in 24h Range */}
      <div className="glass-panel p-4 space-y-2">
        <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
          24h Price Range
        </p>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-mono text-red-400 tabular-nums">
            ${formatPrice(data.low24h)}
          </span>
          <div className="flex-1 h-2 bg-zinc-800 relative rounded-sm overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-500/40 via-zinc-500/40 to-emerald-cyber/40"
              style={{ width: "100%" }}
            />
            <div
              className="absolute top-0 w-2 h-2 bg-white rounded-full shadow-[0_0_6px_rgba(255,255,255,0.5)]"
              style={{ left: `calc(${pricePosition}% - 4px)` }}
            />
          </div>
          <span className="text-[9px] font-mono text-emerald-cyber tabular-nums">
            ${formatPrice(data.high24h)}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-cyber" />
            <h2 className="text-[10px] font-mono font-bold text-white uppercase tracking-[0.2em]">
              Price Chart
            </h2>
          </div>
          <div className="flex gap-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.key}
                onClick={() => setSelectedTf(tf.key)}
                className={cn(
                  "px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest border transition-colors",
                  selectedTf === tf.key
                    ? "border-emerald-cyber/50 text-emerald-cyber bg-emerald-cyber/10"
                    : "border-border-subtle text-zinc-600 hover:text-zinc-300 hover:border-zinc-600",
                )}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 9, fill: "#52525b", fontFamily: "monospace" }}
                tickLine={false}
                axisLine={{ stroke: "#27272a" }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 9, fill: "#52525b", fontFamily: "monospace" }}
                tickLine={false}
                axisLine={{ stroke: "#27272a" }}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(2)
                }
                width={55}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0a0a0a",
                  border: "1px solid #27272a",
                  borderRadius: 0,
                  fontSize: 10,
                  fontFamily: "monospace",
                }}
                labelStyle={{
                  color: "#71717a",
                  textTransform: "uppercase",
                  fontSize: 8,
                }}
                formatter={(value: number) => [
                  `$${formatPrice(value)}`,
                  "Price",
                ]}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#10b981"
                strokeWidth={1.5}
                fill="url(#priceGradient)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Volume Chart */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-cyber" />
          <h2 className="text-[10px] font-mono font-bold text-white uppercase tracking-[0.2em]">
            Volume ({TIMEFRAMES.find((t) => t.key === selectedTf)?.label})
          </h2>
        </div>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 8, fill: "#3f3f46", fontFamily: "monospace" }}
                tickLine={false}
                axisLine={{ stroke: "#27272a" }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 8, fill: "#3f3f46", fontFamily: "monospace" }}
                tickLine={false}
                axisLine={{ stroke: "#27272a" }}
                tickFormatter={(v: number) =>
                  v >= 1e6
                    ? `${(v / 1e6).toFixed(0)}M`
                    : v >= 1e3
                      ? `${(v / 1e3).toFixed(0)}K`
                      : `${v}`
                }
                width={45}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0a0a0a",
                  border: "1px solid #27272a",
                  borderRadius: 0,
                  fontSize: 10,
                  fontFamily: "monospace",
                }}
                formatter={(value: number) => [formatVolume(value), "Volume"]}
              />
              <Bar dataKey="volume" fill="#10b98133" stroke="#10b98155" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Support / Resistance Levels */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-cyber" />
          <h2 className="text-[10px] font-mono font-bold text-white uppercase tracking-[0.2em]">
            Support & Resistance Levels
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {TIMEFRAMES.map((tf) => {
            const l = data.levels[tf.key];
            return (
              <div
                key={tf.key}
                className={cn(
                  "p-3 border space-y-2",
                  selectedTf === tf.key
                    ? "border-emerald-cyber/30 bg-emerald-cyber/5"
                    : "border-border-subtle bg-obsidian/40",
                )}
              >
                <p className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                  {tf.label}
                </p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[8px] font-mono text-zinc-600 uppercase">
                      Resistance
                    </span>
                    <span className="text-[9px] font-mono text-red-400 tabular-nums font-bold">
                      {l?.resistance ? `$${formatPrice(l.resistance)}` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[8px] font-mono text-zinc-600 uppercase">
                      Support
                    </span>
                    <span className="text-[9px] font-mono text-emerald-cyber tabular-nums font-bold">
                      {l?.support ? `$${formatPrice(l.support)}` : "—"}
                    </span>
                  </div>
                  {l?.support && l?.resistance && (
                    <div className="flex justify-between pt-1 border-t border-border-subtle/50">
                      <span className="text-[7px] font-mono text-zinc-700 uppercase">
                        Range
                      </span>
                      <span className="text-[8px] font-mono text-zinc-500 tabular-nums">
                        {(
                          ((l.resistance - l.support) / l.support) *
                          100
                        ).toFixed(2)}
                        %
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RSI Analysis */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-cyber" />
          <h2 className="text-[10px] font-mono font-bold text-white uppercase tracking-[0.2em]">
            RSI Analysis
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              label: "RSI (5M)",
              value: data.indicators.rsi14_5m,
              desc: "Short-term momentum",
            },
            {
              label: "RSI (1H)",
              value: data.indicators.rsi14_1h,
              desc: "Medium-term momentum",
            },
          ].map((rsi) => (
            <div
              key={rsi.label}
              className="p-4 border border-border-subtle bg-obsidian/40 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                    {rsi.label}
                  </p>
                  <p className="text-[8px] font-mono text-zinc-700">
                    {rsi.desc}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      "text-lg font-mono font-bold tabular-nums",
                      getRsiColor(rsi.value),
                    )}
                  >
                    {rsi.value?.toFixed(1) || "—"}
                  </p>
                  <p
                    className={cn(
                      "text-[8px] font-mono uppercase tracking-widest",
                      getRsiColor(rsi.value),
                    )}
                  >
                    {getRsiLabel(rsi.value)}
                  </p>
                </div>
              </div>
              {rsi.value !== null && (
                <div className="h-2 bg-zinc-800 relative rounded-sm overflow-hidden">
                  <div className="absolute inset-0 flex">
                    <div className="w-[30%] bg-emerald-cyber/20" />
                    <div className="flex-1 bg-zinc-700/20" />
                    <div className="w-[30%] bg-red-500/20" />
                  </div>
                  <div
                    className={cn(
                      "absolute top-0 w-2 h-2 rounded-full shadow-lg",
                      rsi.value >= 70
                        ? "bg-red-400"
                        : rsi.value <= 30
                          ? "bg-emerald-cyber"
                          : "bg-white",
                    )}
                    style={{ left: `calc(${rsi.value}% - 4px)` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
