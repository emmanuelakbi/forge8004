import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { cn } from "../../utils/cn";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  BarChart3,
  Clock,
  Layers,
  Zap,
} from "lucide-react";
import CoinDetail from "./CoinDetail";

type CoinSummary = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  trades24h: number;
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

function formatVolume(vol: number) {
  if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `$${(vol / 1e6).toFixed(1)}M`;
  return `$${vol.toLocaleString()}`;
}

export default function MarketsPage() {
  const { coinId } = useParams();

  if (coinId) {
    return <CoinDetail coinId={coinId} />;
  }

  return <CoinList />;
}

function CoinList() {
  const [coins, setCoins] = useState<CoinSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const fetchCoins = async () => {
      try {
        const res = await fetch("/api/market/coins");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (mounted) {
          setCoins(data);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError("Failed to load market data");
          setLoading(false);
        }
      }
    };

    fetchCoins();
    const interval = setInterval(fetchCoins, 15_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-emerald-cyber" />
          <h1 className="text-sm font-mono font-bold text-white uppercase tracking-[0.2em]">
            Live Market Feed
          </h1>
        </div>
        <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider max-w-xl">
          Real-time prices from Binance. Click any coin for detailed
          multi-timeframe analysis.
        </p>
      </section>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-emerald-cyber/30 border-t-emerald-cyber rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="glass-panel p-8 text-center">
          <p className="text-[10px] font-mono text-red-400 uppercase tracking-widest">
            {error}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coins.map((coin) => (
            <button
              key={coin.id}
              onClick={() => navigate(`/markets/${coin.id}`)}
              className="glass-panel p-5 text-left transition-all hover:border-emerald-cyber/30 group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-deep border border-border-subtle flex items-center justify-center group-hover:border-emerald-cyber/30 transition-colors">
                    <span className="text-[10px] font-mono font-bold text-white">
                      {coin.symbol.slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="text-[11px] font-mono font-bold text-white uppercase">
                      {coin.symbol}
                    </p>
                    <p className="text-[8px] font-mono text-zinc-600 uppercase">
                      {coin.name}
                    </p>
                  </div>
                </div>
                <div
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono font-bold",
                    coin.change24h >= 0
                      ? "text-emerald-cyber bg-emerald-cyber/10 border border-emerald-cyber/20"
                      : "text-red-400 bg-red-500/10 border border-red-500/20",
                  )}
                >
                  {coin.change24h >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {coin.change24h >= 0 ? "+" : ""}
                  {coin.change24h.toFixed(2)}%
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-lg font-mono font-bold text-white tabular-nums">
                  ${formatPrice(coin.price)}
                </p>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[7px] font-mono text-zinc-700 uppercase tracking-widest">
                      24h High
                    </p>
                    <p className="text-[9px] font-mono text-zinc-400 tabular-nums">
                      ${formatPrice(coin.high24h)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[7px] font-mono text-zinc-700 uppercase tracking-widest">
                      24h Low
                    </p>
                    <p className="text-[9px] font-mono text-zinc-400 tabular-nums">
                      ${formatPrice(coin.low24h)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[7px] font-mono text-zinc-700 uppercase tracking-widest">
                      Volume
                    </p>
                    <p className="text-[9px] font-mono text-zinc-400 tabular-nums">
                      {formatVolume(coin.volume24h)}
                    </p>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
