"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { PnLPoint } from "../../lib/types";

export default function AgentPnLChart({
  data,
  height = 200,
}: {
  data: PnLPoint[];
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#27272a"
            vertical={false}
          />
          <XAxis dataKey="timestamp" hide />
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="glass-panel p-3 border-emerald-cyber/30 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-emerald-cyber" />
                        <p className="text-[9px] text-zinc-500 uppercase font-mono tracking-widest">
                          Timestamp //{" "}
                          {new Date(
                            payload[0].payload.timestamp,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-xs font-mono font-bold text-emerald-cyber">
                        VAL: ${Number(payload[0].value).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorValue)"
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
