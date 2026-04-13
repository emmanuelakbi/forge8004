import React from 'react';

export const SW = 1280;
export const SH = 720;

export type AccentKey = 'emerald' | 'amber' | 'sky' | 'violet' | 'rose';

export type SlideSpec = {
  id: string;
  num: string;
  title: string;
  subtitle: string;
  accent: AccentKey;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  content: React.ReactNode;
};

export const tones: Record<AccentKey, { accent: string; soft: string; glow: string; panel: string; border: string }> = {
  emerald: { accent: '#10B981', soft: 'rgba(16,185,129,0.12)', glow: 'rgba(16,185,129,0.18)', panel: 'rgba(10,21,18,0.78)', border: 'rgba(16,185,129,0.28)' },
  amber: { accent: '#F59E0B', soft: 'rgba(245,158,11,0.12)', glow: 'rgba(245,158,11,0.16)', panel: 'rgba(24,18,7,0.8)', border: 'rgba(245,158,11,0.26)' },
  sky: { accent: '#38BDF8', soft: 'rgba(56,189,248,0.12)', glow: 'rgba(56,189,248,0.16)', panel: 'rgba(8,19,27,0.8)', border: 'rgba(56,189,248,0.24)' },
  violet: { accent: '#8B5CF6', soft: 'rgba(139,92,246,0.12)', glow: 'rgba(139,92,246,0.16)', panel: 'rgba(18,11,27,0.82)', border: 'rgba(139,92,246,0.24)' },
  rose: { accent: '#F43F5E', soft: 'rgba(244,63,94,0.12)', glow: 'rgba(244,63,94,0.16)', panel: 'rgba(26,10,15,0.82)', border: 'rgba(244,63,94,0.24)' },
};
