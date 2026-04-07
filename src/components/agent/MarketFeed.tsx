import { cn } from "../../utils/cn";
import React, { useMemo } from "react";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

import { MarketData } from "../../services/marketService";

type MarketAsset = {
  symbol: string;
  name: string;
  price: number;
  change: number;
};

interface MarketFeedProps {
  data?: MarketData | null;
}

const defaultAssets: MarketAsset[] = [
  { symbol: "BTC", name: "Bitcoin", price: 64250.45, change: 1.2 },
  { symbol: "ETH", name: "Ethereum", price: 2450.12, change: -0.8 },
  { symbol: "BASE", name: "Base Index", price: 1.0, change: 0.05 },
];

export default function MarketFeed({ data }: MarketFeedProps) {
  const assets = useMemo<MarketAsset[]>(() => {
    if (!data) return defaultAssets;
    return [
      {
        symbol: "BTC",
        name: "Bitcoin",
        price: data.btc.price,
        change: data.btc.change24h,
      },
      {
        symbol: "ETH",
        name: "Ethereum",
        price: data.eth.price,
        change: data.eth.change24h,
      },
      { symbol: "BASE", name: "Base Index", price: 1.0, change: 0.05 },
    ];
  }, [data]);

  const updatedAt = data?.timestamp
    ? new Date(data.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <h3 className="text-[10px] font-mono font-bold text-white uppercase tracking-[0.2em] flex items-center gap-2">
          <Activity className="w-3 h-3 text-emerald-cyber" />
          Live Market Feed
        </h3>
        <span className="text-[9px] font-mono text-zinc-600 uppercase">
          {updatedAt ? `Updated ${updatedAt}` : "Real-time // 0xBASE"}
        </span>
      </div>

      <div className="space-y-2">
        {assets.map((asset) => (
          <div
            key={asset.symbol}
            className="bg-obsidian/40 border border-border-subtle p-3 flex items-center justify-between group hover:border-emerald-cyber/20 transition-colors duration-200"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 bg-zinc-deep flex items-center justify-center border border-border-subtle group-hover:border-emerald-cyber/30 transition-colors shrink-0">
                <span className="text-[10px] font-mono font-bold text-white">
                  {asset.symbol[0]}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-mono font-bold text-white uppercase truncate">
                  {asset.symbol}
                </p>
                <p className="text-[8px] font-mono text-zinc-600 uppercase truncate">
                  {asset.name}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[11px] font-mono font-bold text-white tabular-nums">
                $
                {asset.price.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <div
                className={cn(
                  "flex items-center justify-end gap-1 text-[9px] font-mono font-bold",
                  asset.change >= 0 ? "text-emerald-cyber" : "text-red-500",
                )}
              >
                {asset.change >= 0 ? (
                  <TrendingUp className="w-2 h-2" />
                ) : (
                  <TrendingDown className="w-2 h-2" />
                )}
                {Math.abs(asset.change).toFixed(2)}%
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 bg-emerald-cyber/5 border border-emerald-cyber/10">
        <p className="text-[8px] font-mono text-emerald-cyber/60 uppercase leading-tight mb-1">
          Data Source: <span className="text-white">Binance API</span>
        </p>
        <p className="text-[8px] font-mono text-emerald-cyber/40 uppercase leading-tight">
          Live market data with multi-timeframe candles for AI decision making.
        </p>
      </div>
    </div>
  );
}
