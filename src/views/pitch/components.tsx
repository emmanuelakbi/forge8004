import React from 'react';
import { AccentKey, tones } from './types';

export const P: React.FC<{ children: React.ReactNode; accent: AccentKey; className?: string; style?: React.CSSProperties }> = ({ children, accent, className = '', style }) => (
  <div className={`border ${className}`} style={{ background: tones[accent].panel, borderColor: tones[accent].border, ...style }}>{children}</div>
);

export function Stat({ accent, label, value, note }: { accent: AccentKey; label: string; value: string; note: string }) {
  return (
    <P accent={accent} className="p-4">
      <p className="text-[10px] font-mono uppercase tracking-[0.25em]" style={{ color: '#71717A' }}>{label}</p>
      <p className="mt-3 text-2xl font-mono font-bold uppercase text-white">{value}</p>
      <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.15em]" style={{ color: tones[accent].accent }}>{note}</p>
    </P>
  );
}

export function Bars({ accent, rows }: { accent: AccentKey; rows: { label: string; value: string; width: number }[] }) {
  const t = tones[accent];
  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <div key={r.label} className="space-y-2">
          <div className="flex justify-between text-[11px] font-mono uppercase tracking-[0.12em]">
            <span style={{ color: '#A1A1AA' }}>{r.label}</span>
            <span style={{ color: '#FFF' }}>{r.value}</span>
          </div>
          <div className="h-2 w-full overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="h-full" style={{ width: `${r.width}%`, background: `linear-gradient(90deg, ${t.accent}, rgba(255,255,255,0.7))` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
