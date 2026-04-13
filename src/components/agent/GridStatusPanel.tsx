"use client";

import React, { useState } from "react";
import { Activity, Settings, ArrowDownToLine, X } from "lucide-react";
import { cn } from "../../utils/cn";
import { formatCurrency, formatEnumLabel } from "../../utils/format";
import { useClientValue } from "@/app/hooks/useClientValue";
import type { GridRuntimeState } from "../../lib/types";
import type { MarketData } from "../../services/marketService";
import type { ModifyGridParams } from "../../services/gridBotService";

type GridHelpers = {
  getGridEquity: (runtime: GridRuntimeState, price: number) => number;
  getGridPnL: (runtime: GridRuntimeState, price: number) => number;
  getGridPnLPct: (runtime: GridRuntimeState, price: number) => number;
  getGridAPR: (
    profit: number,
    investment: number,
    startedAt: number,
    now?: number,
  ) => number;
  getTotalAPR: (
    equity: number,
    investment: number,
    startedAt: number,
    now?: number,
  ) => number;
  getProfitPerGrid: (
    low: number,
    high: number,
    levels: number,
  ) => [number, number];
  getMaxWithdrawable: (runtime: GridRuntimeState) => number;
  getGridPriceForAsset: (
    asset: "BTC" | "ETH",
    marketData: MarketData,
  ) => number;
  handleGridModify: (mods: ModifyGridParams) => Promise<void>;
  handleGridWithdraw: (amount: number) => Promise<void>;
  handleGridTerminate: () => Promise<void>;
};

type Props = {
  runtime: GridRuntimeState;
  marketData: MarketData | null;
  helpers: GridHelpers;
};

function StatCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-obsidian/50 border border-border-subtle px-4 py-4 space-y-2">
      <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
        {label}
      </p>
      <p
        className={cn(
          "text-sm font-mono font-bold uppercase break-words",
          highlight ? "text-emerald-cyber" : "text-white",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ModifyModal({
  runtime,
  onClose,
  onConfirm,
}: {
  runtime: GridRuntimeState;
  onClose: () => void;
  onConfirm: (mods: ModifyGridParams) => void;
}) {
  const [rangeLow, setRangeLow] = useState(String(runtime.rangeLow));
  const [rangeHigh, setRangeHigh] = useState(String(runtime.rangeHigh));
  const [gridLevels, setGridLevels] = useState(String(runtime.gridLevels));
  const [trailingStopPct, setTrailingStopPct] = useState(
    String(runtime.trailingStopPct ?? ""),
  );
  const [stopLossPrice, setStopLossPrice] = useState(
    String(runtime.stopLossPrice ?? ""),
  );
  const [takeProfitPrice, setTakeProfitPrice] = useState(
    String(runtime.takeProfitPrice ?? ""),
  );

  const handleSubmit = () => {
    const mods: ModifyGridParams = {};
    const low = parseFloat(rangeLow);
    const high = parseFloat(rangeHigh);
    const levels = parseInt(gridLevels, 10);
    if (!isNaN(low) && low > 0 && low !== runtime.rangeLow) mods.rangeLow = low;
    if (!isNaN(high) && high > 0 && high !== runtime.rangeHigh)
      mods.rangeHigh = high;
    if (!isNaN(levels) && levels >= 2 && levels !== runtime.gridLevels)
      mods.gridLevels = levels;
    const ts = parseFloat(trailingStopPct);
    if (!isNaN(ts) && ts >= 0) mods.trailingStopPct = ts || undefined;
    else if (trailingStopPct === "" && runtime.trailingStopPct)
      mods.trailingStopPct = undefined;
    const sl = parseFloat(stopLossPrice);
    if (!isNaN(sl) && sl >= 0) mods.stopLossPrice = sl || undefined;
    else if (stopLossPrice === "" && runtime.stopLossPrice)
      mods.stopLossPrice = undefined;
    const tp = parseFloat(takeProfitPrice);
    if (!isNaN(tp) && tp >= 0) mods.takeProfitPrice = tp || undefined;
    else if (takeProfitPrice === "" && runtime.takeProfitPrice)
      mods.takeProfitPrice = undefined;

    if (Object.keys(mods).length === 0) {
      onClose();
      return;
    }
    onConfirm(mods);
    onClose();
  };

  const inputClass =
    "w-full bg-obsidian border border-border-subtle px-3 py-2 text-sm font-mono text-white focus:border-emerald-cyber/50 focus:outline-none";
  const labelClass =
    "text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Modify grid parameters"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-panel border border-emerald-cyber/20 p-6 w-full max-w-md space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-[0.15em]">
            Modify Parameters
          </h3>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="text-zinc-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[9px] font-mono text-zinc-600 uppercase">
          Grid adjustments are recorded as trust artifacts.
        </p>
        {runtime.heldBase > 0 && (
          <div className="border border-amber-warning/30 bg-amber-warning/5 px-3 py-2.5 space-y-1">
            <p className="text-[9px] font-mono text-amber-warning uppercase tracking-widest font-bold">
              Open positions detected
            </p>
            <p className="text-[8px] font-mono text-amber-warning/70 leading-relaxed">
              Changing the price range or grid count will close your{" "}
              {runtime.heldBase.toFixed(6)} {runtime.asset} at current market
              price and rebuild the grid. Trailing stop, stop loss, and take
              profit changes do not affect open positions.
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className={labelClass}>Range Low (USDC)</p>
            <input
              type="number"
              aria-label="Range Low (USDC)"
              className={inputClass}
              value={rangeLow}
              onChange={(e) => setRangeLow(e.target.value)}
            />
          </div>
          <div>
            <p className={labelClass}>Range High (USDC)</p>
            <input
              type="number"
              aria-label="Range High (USDC)"
              className={inputClass}
              value={rangeHigh}
              onChange={(e) => setRangeHigh(e.target.value)}
            />
          </div>
        </div>
        <div>
          <p className={labelClass}>Grids</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Decrease grid levels"
              className="btn-secondary px-3 py-1 text-xs"
              onClick={() =>
                setGridLevels(
                  String(Math.max(2, parseInt(gridLevels, 10) - 1 || 2)),
                )
              }
            >
              −
            </button>
            <input
              type="number"
              aria-label="Grid levels"
              className={cn(inputClass, "text-center")}
              value={gridLevels}
              onChange={(e) => setGridLevels(e.target.value)}
            />
            <button
              type="button"
              aria-label="Increase grid levels"
              className="btn-secondary px-3 py-1 text-xs"
              onClick={() =>
                setGridLevels(
                  String(Math.min(50, parseInt(gridLevels, 10) + 1 || 2)),
                )
              }
            >
              +
            </button>
          </div>
        </div>
        <div>
          <p className={labelClass}>Trailing Stop (%)</p>
          <input
            type="number"
            aria-label="Trailing Stop (%)"
            className={inputClass}
            placeholder="Optional"
            value={trailingStopPct}
            onChange={(e) => setTrailingStopPct(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className={labelClass}>Stop Loss (USDC)</p>
            <input
              type="number"
              aria-label="Stop Loss (USDC)"
              className={inputClass}
              placeholder="Optional"
              value={stopLossPrice}
              onChange={(e) => setStopLossPrice(e.target.value)}
            />
          </div>
          <div>
            <p className={labelClass}>Take Profit (USDC)</p>
            <input
              type="number"
              aria-label="Take Profit (USDC)"
              className={inputClass}
              placeholder="Optional"
              value={takeProfitPrice}
              onChange={(e) => setTakeProfitPrice(e.target.value)}
            />
          </div>
        </div>
        <button
          onClick={handleSubmit}
          className="btn-primary w-full py-3 text-xs font-mono uppercase tracking-widest"
        >
          Modify
        </button>
      </div>
    </div>
  );
}

function WithdrawModal({
  runtime,
  maxWithdrawable,
  onClose,
  onConfirm,
}: {
  runtime: GridRuntimeState;
  maxWithdrawable: number;
  onClose: () => void;
  onConfirm: (amount: number) => void;
}) {
  const [amount, setAmount] = useState("");
  const presets = [10, 25, 50, 75, 100];

  const handleSubmit = () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0 || val > maxWithdrawable) return;
    onConfirm(val);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Withdraw funds"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-panel border border-emerald-cyber/20 p-6 w-full max-w-sm space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-[0.15em]">
            Withdraw
          </h3>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="text-zinc-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div>
          <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2">
            Amount to Withdraw (USDC)
          </p>
          <input
            type="number"
            aria-label="Amount to Withdraw (USDC)"
            className="w-full bg-obsidian border border-border-subtle px-3 py-3 text-sm font-mono text-white focus:border-emerald-cyber/50 focus:outline-none"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {presets.map((pct) => (
            <button
              type="button"
              key={pct}
              className="flex-1 border border-border-subtle px-2 py-1.5 text-[9px] font-mono text-zinc-400 uppercase hover:border-emerald-cyber/30 hover:text-emerald-cyber transition-colors"
              onClick={() =>
                setAmount(
                  String(
                    Math.floor(((maxWithdrawable * pct) / 100) * 100) / 100,
                  ),
                )
              }
            >
              {pct}%
            </button>
          ))}
        </div>
        <div className="space-y-1.5 text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
          <div className="flex justify-between">
            <span>Max. Withdrawal</span>
            <span className="text-white">
              {formatCurrency(maxWithdrawable)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Previously Withdrawn</span>
            <span className="text-white">
              {formatCurrency(runtime.previouslyWithdrawn)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Grid Profit</span>
            <span className="text-white">
              {formatCurrency(runtime.cumulativeGridProfit)}
            </span>
          </div>
        </div>
        <p className="text-[8px] font-mono text-amber-warning/70 uppercase">
          Withdrawals reduce available grid capital.
        </p>
        <button
          onClick={handleSubmit}
          className="btn-primary w-full py-3 text-xs font-mono uppercase tracking-widest"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

export default function GridStatusPanel({
  runtime,
  marketData,
  helpers,
}: Props) {
  const [showModify, setShowModify] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const currentPrice = marketData
    ? helpers.getGridPriceForAsset(runtime.asset, marketData)
    : 0;
  const equity = helpers.getGridEquity(runtime, currentPrice);
  const pnl = helpers.getGridPnL(runtime, currentPrice);
  const pnlPct = helpers.getGridPnLPct(runtime, currentPrice);
  const gridAPR = helpers.getGridAPR(
    runtime.cumulativeGridProfit,
    runtime.totalInvestment,
    runtime.startedAt,
  );
  const totalAPR = helpers.getTotalAPR(
    equity,
    runtime.totalInvestment,
    runtime.startedAt,
  );
  const [profitPerGridLow, profitPerGridHigh] = helpers.getProfitPerGrid(
    runtime.rangeLow,
    runtime.rangeHigh,
    runtime.gridLevels,
  );
  const maxWithdrawable = helpers.getMaxWithdrawable(runtime);
  const isStopped = runtime.status === "stopped";

  // Elapsed time — deferred to avoid SSR/hydration mismatch
  const elapsedLabel = useClientValue(() => {
    const elapsedMs = Date.now() - runtime.startedAt;
    const days = Math.floor(elapsedMs / 86400000);
    const hours = Math.floor((elapsedMs % 86400000) / 3600000);
    const mins = Math.floor((elapsedMs % 3600000) / 60000);
    return `${days > 0 ? `${days}D ` : ""}${hours}h ${mins}m`;
  }, "—");

  return (
    <section className="glass-panel p-6 space-y-6 border border-emerald-cyber/20">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-4 h-4 text-emerald-cyber" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-bold text-white uppercase">
                {runtime.asset}/USDC
              </span>
              <span className="text-[9px] font-mono text-zinc-500 uppercase">
                Spot Grid Bot
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  runtime.status === "active"
                    ? "bg-emerald-cyber animate-pulse"
                    : runtime.status === "stopped"
                      ? "bg-red-500"
                      : "bg-amber-warning",
                )}
              />
              <span className="text-[9px] font-mono text-zinc-500 uppercase">
                {formatEnumLabel(runtime.status)} — {elapsedLabel}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "px-3 py-1 border text-[9px] font-mono uppercase tracking-widest",
              runtime.configMode === "ai"
                ? "border-emerald-cyber/30 text-emerald-cyber bg-emerald-cyber/5"
                : "border-zinc-600 text-zinc-400 bg-zinc-900",
            )}
          >
            {runtime.configMode === "ai" ? "AI Strategy" : "Manual"}
          </span>
          <div
            className={cn(
              "px-3 py-1 border text-[9px] font-mono uppercase tracking-widest",
              runtime.status === "active" &&
                "border-emerald-cyber/30 text-emerald-cyber bg-emerald-cyber/5",
              runtime.status === "rebuilding" &&
                "border-amber-warning/30 text-amber-warning bg-amber-warning/5",
              runtime.status === "paused" &&
                "border-zinc-700 text-zinc-400 bg-zinc-900",
              runtime.status === "stopped" &&
                "border-red-500/30 text-red-400 bg-red-500/5",
            )}
          >
            {formatEnumLabel(runtime.status)}
          </div>
        </div>
      </div>

      {/* P&L Header */}
      <div className="flex items-baseline gap-4">
        <div>
          <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
            Investment (USDC)
          </p>
          <p className="text-lg font-mono font-bold text-white">
            {runtime.totalInvestment.toLocaleString()}
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
            P&L (USDC)
          </p>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-lg font-mono font-bold",
                pnl >= 0 ? "text-emerald-cyber" : "text-red-400",
              )}
            >
              {pnl >= 0 ? "+" : ""}
              {pnl.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              })}
            </span>
            <span
              className={cn(
                "px-2 py-0.5 text-[9px] font-mono font-bold",
                pnl >= 0
                  ? "bg-emerald-cyber/20 text-emerald-cyber"
                  : "bg-red-500/20 text-red-400",
              )}
            >
              {pnl >= 0 ? "+" : ""}
              {pnlPct.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCell
          label="Equity (USDC)"
          value={equity.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        />
        <StatCell
          label="Grid Profit (USDC)"
          value={`+${runtime.cumulativeGridProfit.toFixed(4)}`}
          highlight
        />
        <StatCell
          label="Total APR"
          value={`${totalAPR >= 0 ? "+" : ""}${totalAPR.toLocaleString()}%`}
          highlight={totalAPR > 0}
        />
        <StatCell
          label="Grid APR"
          value={`${gridAPR >= 0 ? "+" : ""}${gridAPR.toLocaleString()}%`}
          highlight={gridAPR > 0}
        />
        <StatCell
          label="Profitable Trades"
          value={String(runtime.profitableTradesCount)}
        />
        <StatCell
          label="Total Trades"
          value={String(runtime.totalTradesCount)}
        />
        <StatCell
          label="Previously Withdrawn"
          value={formatCurrency(runtime.previouslyWithdrawn)}
        />
        <StatCell
          label="Profit/Grid"
          value={`${profitPerGridLow}% - ${profitPerGridHigh}%`}
        />
      </div>

      {/* Config Details */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCell label="Pair" value={`${runtime.asset}/USDC`} />
        <StatCell
          label="Price Range (USDC)"
          value={`${formatCurrency(runtime.rangeLow)} - ${formatCurrency(runtime.rangeHigh)}`}
        />
        <StatCell label="Grids" value={String(runtime.gridLevels)} />
        <StatCell
          label="Current Price (USDC)"
          value={
            currentPrice > 0
              ? currentPrice.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })
              : "—"
          }
        />
        <StatCell
          label="Trailing Stop"
          value={
            runtime.trailingStopPct ? `${runtime.trailingStopPct}%` : "Off"
          }
        />
        <StatCell
          label="Stop Loss"
          value={
            runtime.stopLossPrice
              ? formatCurrency(runtime.stopLossPrice)
              : "Off"
          }
        />
        <StatCell
          label="Take Profit"
          value={
            runtime.takeProfitPrice
              ? formatCurrency(runtime.takeProfitPrice)
              : "Off"
          }
        />
        <StatCell label="Base Held" value={runtime.heldBase.toFixed(6)} />
      </div>

      {/* Grid Levels — Bybit-style order book view */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
              Current Price (USDC)
            </p>
            <p className="text-sm font-mono font-bold text-white">
              {currentPrice > 0
                ? currentPrice.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })
                : "\u2014"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
              Qty/Grid
            </p>
            <p className="text-sm font-mono font-bold text-white">
              {runtime.levels.find(
                (l) => l.side === "BUY" && l.quoteAllocated > 0,
              )
                ? `$${runtime.levels.find((l) => l.side === "BUY" && l.quoteAllocated > 0)!.quoteAllocated.toFixed(0)}`
                : "\u2014"}
            </p>
          </div>
        </div>

        {(() => {
          const buyLevels = runtime.levels.filter((l) => l.side === "BUY");
          const sellLevels = runtime.levels.filter((l) => l.side === "SELL");
          const buyPct =
            (buyLevels.length /
              Math.max(1, buyLevels.length + sellLevels.length)) *
            100;
          return (
            <div className="space-y-2">
              <div className="flex h-2 w-full overflow-hidden">
                <div
                  className="bg-emerald-cyber/80 transition-all"
                  style={{ width: `${buyPct}%` }}
                />
                <div
                  className="bg-red-500/80 transition-all"
                  style={{ width: `${100 - buyPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-widest">
                <span className="text-emerald-cyber">
                  Buy {buyLevels.length}
                </span>
                <span className="text-red-400">Sell {sellLevels.length}</span>
              </div>
            </div>
          );
        })()}

        <div className="border border-border-subtle">
          <div className="grid grid-cols-3 gap-0 px-3 py-2 border-b border-border-subtle bg-obsidian/50">
            <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
              Qty / Status
            </span>
            <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest text-center">
              Price (USDC)
            </span>
            <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest text-right">
              Qty / Status
            </span>
          </div>
          {(() => {
            const buys = runtime.levels
              .filter((l) => l.side === "BUY")
              .sort((a, b) => b.price - a.price);
            const sells = runtime.levels
              .filter((l) => l.side === "SELL")
              .sort((a, b) => a.price - b.price);
            const rows: React.JSX.Element[] = [];
            for (let i = 0; i < Math.max(buys.length, sells.length); i++) {
              const buy = buys[i];
              const sell = sells[i];
              rows.push(
                <div
                  key={`row-${i}`}
                  className="grid grid-cols-3 gap-0 px-3 py-2 border-b border-border-subtle/50 last:border-b-0"
                >
                  <div className="flex flex-col">
                    {buy ? (
                      <>
                        <span
                          className={cn(
                            "text-[10px] font-mono",
                            buy.status === "filled"
                              ? "text-emerald-cyber font-bold"
                              : "text-zinc-500",
                          )}
                        >
                          {buy.status === "filled" && buy.quantity > 0
                            ? buy.quantity.toFixed(6)
                            : `$${buy.quoteAllocated.toFixed(0)}`}
                        </span>
                        <span
                          className={cn(
                            "text-[8px] font-mono uppercase",
                            buy.status === "filled"
                              ? "text-emerald-cyber/60"
                              : "text-zinc-700",
                          )}
                        >
                          {buy.status === "filled" ? "filled" : "waiting"}
                        </span>
                      </>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    {buy && (
                      <span className="text-[10px] font-mono text-emerald-cyber">
                        {buy.price.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    )}
                    {sell && (
                      <span className="text-[10px] font-mono text-red-400">
                        {sell.price.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end">
                    {sell ? (
                      <>
                        <span
                          className={cn(
                            "text-[10px] font-mono",
                            sell.status === "waiting" && sell.quantity > 0
                              ? "text-red-400 font-bold"
                              : "text-zinc-600",
                          )}
                        >
                          {sell.status === "waiting" && sell.quantity > 0
                            ? sell.quantity.toFixed(6)
                            : "\u2014"}
                        </span>
                        <span
                          className={cn(
                            "text-[8px] font-mono uppercase",
                            sell.status === "waiting" && sell.quantity > 0
                              ? "text-red-400/60"
                              : "text-zinc-700",
                          )}
                        >
                          {sell.status === "waiting" && sell.quantity > 0
                            ? "armed"
                            : "idle"}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>,
              );
            }
            return rows;
          })()}
        </div>
        <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-wider leading-relaxed">
          Green = buy levels waiting below price. Red = sell levels armed above.
          When price drops to a buy, it fills and arms the paired sell. When
          price rises to the sell, profit is captured.
        </p>
      </div>

      {/* Action Buttons */}
      {!isStopped && (
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => setShowWithdraw(true)}
            disabled={maxWithdrawable <= 0}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 border text-[9px] font-mono uppercase tracking-widest transition-colors",
              maxWithdrawable > 0
                ? "border-emerald-cyber/30 text-emerald-cyber hover:bg-emerald-cyber/10"
                : "border-zinc-800 text-zinc-600 cursor-not-allowed",
            )}
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            Withdraw
          </button>
          <button
            onClick={() => setShowModify(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-zinc-700 text-[9px] font-mono text-zinc-400 uppercase tracking-widest hover:border-emerald-cyber/30 hover:text-emerald-cyber transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Modify
          </button>
          <button
            onClick={() => {
              if (
                window.confirm(
                  runtime.heldBase > 0
                    ? `Terminate the grid? This will close ${runtime.heldBase.toFixed(6)} ${runtime.asset} at current market price and stop the grid bot.`
                    : "Terminate the grid? This will stop the grid bot and clear all levels.",
                )
              ) {
                helpers.handleGridTerminate();
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 border border-red-500/30 text-[9px] font-mono text-red-400 uppercase tracking-widest hover:bg-red-500/10 hover:border-red-500/50 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Terminate
          </button>
        </div>
      )}

      {/* Modals */}
      {showModify && (
        <ModifyModal
          runtime={runtime}
          onClose={() => setShowModify(false)}
          onConfirm={(mods) => helpers.handleGridModify(mods)}
        />
      )}
      {showWithdraw && (
        <WithdrawModal
          runtime={runtime}
          maxWithdrawable={maxWithdrawable}
          onClose={() => setShowWithdraw(false)}
          onConfirm={(amt) => helpers.handleGridWithdraw(amt)}
        />
      )}
    </section>
  );
}
