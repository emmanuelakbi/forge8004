import React from "react";
import { ForgeLogo } from "../../components/brand/Logo";

export type Flyer = {
  id: string;
  name: string;
  desc: string;
  width: number;
  height: number;
  platform: string;
  content: (w: number, h: number) => React.ReactNode;
};

export function toRgba(hex: string, a: number) {
  const v = hex.replace("#", "");
  const n =
    v.length === 3
      ? v
          .split("")
          .map((c) => c + c)
          .join("")
      : v;
  const i = parseInt(n, 16);
  return `rgba(${(i >> 16) & 255},${(i >> 8) & 255},${i & 255},${a})`;
}

export function Grid({ id, w, h }: { id: string; w: number; h: number }) {
  return (
    <svg
      className="absolute inset-0"
      style={{ width: w, height: h, opacity: 0.07 }}
    >
      <defs>
        <pattern id={id} width="60" height="60" patternUnits="userSpaceOnUse">
          <path
            d="M 60 0 L 0 0 0 60"
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width={w} height={h} fill={`url(#${id})`} />
    </svg>
  );
}

export function Glow({
  color,
  style,
}: {
  color: string;
  style: React.CSSProperties;
}) {
  return (
    <div
      className="absolute rounded-full"
      style={{
        ...style,
        background: `radial-gradient(circle, ${toRgba(color, 0.14)}, transparent 70%)`,
      }}
    />
  );
}

export function Frame({ pad }: { pad: number }) {
  return (
    <div
      className="absolute"
      style={{
        left: pad * 0.5,
        top: pad * 0.5,
        right: pad * 0.5,
        bottom: pad * 0.5,
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    />
  );
}

export function Logo({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ForgeLogo className="h-full w-full" />
    </div>
  );
}

export function Footer({ w, pad, s }: { w: number; pad: number; s: number }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: pad * 0.3,
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <span
        className="font-mono uppercase"
        style={{ fontSize: s, letterSpacing: "0.2em", color: "#71717A" }}
      >
        Forge8004 // 2026
      </span>
      <span
        className="font-mono uppercase"
        style={{ fontSize: s, letterSpacing: "0.15em", color: "#A1A1AA" }}
      >
        forge8004.xyz
      </span>
    </div>
  );
}

export function Panel({
  accent,
  children,
  style,
  ...rest
}: {
  accent: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      style={{
        border: `1px solid ${toRgba(accent, 0.25)}`,
        backgroundColor: toRgba(accent, 0.06),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function DarkPanel({
  children,
  style,
  ...rest
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        backgroundColor: "rgba(0,0,0,0.25)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
