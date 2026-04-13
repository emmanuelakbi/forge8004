import React, { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { SlideSpec, SW, SH, tones } from './types';

export const PitchSlide: React.FC<{ slide: SlideSpec; index: number; idPrefix?: string }> = ({ slide, index, idPrefix = '' }) => {
  const t = tones[slide.accent];
  const Icon = slide.icon;
  return (
    <section data-export-slide className="relative overflow-hidden" style={{ width: SW, height: SH, backgroundColor: '#0A0A0B' }}>
      <svg className="absolute inset-0 h-full w-full" style={{ opacity: 0.3 }}>
        <defs>
          <pattern id={`g-${idPrefix}${index}`} width="64" height="64" patternUnits="userSpaceOnUse">
            <path d="M 64 0 L 0 0 0 64" fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#g-${idPrefix}${index})`}/>
      </svg>
      <div className="absolute -left-[10%] -top-[6%] h-[380px] w-[380px] rounded-full" style={{ background: `radial-gradient(circle, ${t.glow}, transparent 70%)` }} />
      <div className="absolute -right-[6%] -bottom-[16%] h-[360px] w-[360px] rounded-full" style={{ background: `radial-gradient(circle, ${t.soft}, transparent 70%)` }} />
      <div className="absolute inset-[24px] border" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
      <div className="absolute left-8 top-2 text-[120px] font-mono font-bold leading-none" style={{ color: 'rgba(255,255,255,0.025)' }}>{slide.num}</div>

      <div className="relative z-10 flex h-full flex-col" style={{ padding: '40px 48px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', minHeight: 56 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${t.border}`, backgroundColor: 'rgba(22,22,24,0.85)', flexShrink: 0 }}>
              <Icon style={{ width: 24, height: 24, color: t.accent }} />
            </div>
            <div style={{ maxWidth: 700 }}>
              <p style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', textTransform: 'uppercase' as const, letterSpacing: '0.2em', color: '#A1A1AA', lineHeight: 1.3 }}>{slide.subtitle}</p>
              <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${t.border}`, backgroundColor: t.soft, color: t.accent, padding: '3px 10px', fontSize: 10, fontFamily: 'ui-monospace, monospace', textTransform: 'uppercase' as const, letterSpacing: '0.15em' }}>
                <Sparkles style={{ width: 12, height: 12, flexShrink: 0 }} />Pitch deck // {slide.num}
              </div>
            </div>
          </div>
          <p style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', textTransform: 'uppercase' as const, letterSpacing: '0.2em', color: '#71717A', flexShrink: 0 }}>Forge8004</p>
        </div>

        <h2 style={{ marginTop: 20, fontSize: 40, fontFamily: 'ui-monospace, monospace', fontWeight: 700, textTransform: 'uppercase' as const, lineHeight: 0.95, letterSpacing: '-0.02em', color: '#FFFFFF', maxWidth: 700 }}>
          {slide.title}
        </h2>

        <div style={{ marginTop: 20, height: 420, overflow: 'hidden' }}>
          {slide.content}
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <span style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace', textTransform: 'uppercase' as const, letterSpacing: '0.2em', color: '#71717A' }}>Forge8004 // Pitch deck</span>
          <span style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace', textTransform: 'uppercase' as const, letterSpacing: '0.2em', color: '#A1A1AA' }}>Slide {slide.num}</span>
        </div>
      </div>
    </section>
  );
};

export function ScaledSlidePreview({ slide, index }: { slide: SlideSpec; index: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const update = () => setW(el.getBoundingClientRect().width);
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className="relative w-full overflow-hidden border border-border-subtle bg-obsidian/60 shadow-[0_24px_60px_rgba(0,0,0,0.45)]" style={{ aspectRatio: `${SW}/${SH}` }}>
      {w > 0 && (
        <div style={{ width: SW, height: SH, transform: `scale(${w / SW})`, transformOrigin: 'top left' }}>
          <PitchSlide slide={slide} index={index} />
        </div>
      )}
    </div>
  );
}
