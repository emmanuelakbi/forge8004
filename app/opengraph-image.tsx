import { ImageResponse } from "next/og";

export const alt =
  "Forge8004 — ERC-8004 Trust Layer for Autonomous DeFi Agents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Forge chain-link logo as inline SVG path data
const LOGO_PATH_1 =
  "M19.3821 23.2895L15.0401 27.6937C13.6029 29.134 11.6622 29.9391 9.64192 29.933C7.62159 29.9268 5.68572 29.11 4.25711 27.6609C2.8285 26.2118 2.02321 24.2481 2.01713 22.1987C2.01102 20.1493 2.80462 18.1808 4.22457 16.723L10.7099 10.1445C10.7066 10.0286 10.7043 9.91248 10.7043 9.79603C10.7036 8.81633 10.8276 7.84064 11.0732 6.89312L2.80432 15.2807C1.00385 17.1201 -0.00454786 19.6085 1.54203e-05 22.2005C0.00457872 24.7926 1.02173 27.2772 2.82866 29.11C4.6356 30.9429 7.08502 31.9746 9.64039 31.9791C12.1958 31.9838 14.6488 30.9609 16.4621 29.1345L20.8039 24.7303L19.3821 23.2895Z";
const LOGO_PATH_2 =
  "M34.1052 32C32.837 32.0021 31.5809 31.7502 30.4091 31.2584C29.2373 30.7669 28.1726 30.0451 27.2765 29.1349L15.0401 16.7226C13.2331 14.8846 12.2192 12.3942 12.221 9.79851C12.2228 7.20278 13.2402 4.71389 15.0497 2.87846C16.8592 1.04304 19.3129 0.0111466 21.872 0.00940821C24.4309 0.00766985 26.886 1.03623 28.6978 2.86919L40.9343 15.2814C42.2855 16.6508 43.2059 18.396 43.5789 20.2964C43.9521 22.1966 43.7608 24.1664 43.0297 25.9564C42.2985 27.7464 41.0603 29.276 39.4716 30.352C37.883 31.4278 36.0154 32.0012 34.1052 32ZM28.6978 27.6937C30.1356 29.1311 32.0753 29.9335 34.094 29.9261C36.1126 29.9187 38.0466 29.1019 39.4741 27.6539C40.9015 26.2061 41.7067 24.2443 41.714 22.1967C41.7212 20.149 40.9302 18.1813 39.5131 16.723L27.2767 4.31075C26.5683 3.5818 25.7249 3.00222 24.7948 2.60541C23.8648 2.2086 22.8665 2.00241 21.8576 1.9987C20.8485 1.99497 19.8488 2.19383 18.9159 2.58378C17.9831 2.97373 17.1355 3.5471 16.422 4.27081C15.7085 4.99452 15.1433 5.85428 14.7589 6.80057C14.3744 7.74686 14.1784 8.76095 14.1821 9.78442C14.1857 10.8079 14.389 11.8205 14.7802 12.764C15.1714 13.7074 15.7427 14.563 16.4614 15.2814L28.6978 27.6937Z";
const LOGO_PATH_3 =
  "M39.5138 2.86921L35.1719 7.27343L36.5931 8.71498L40.9349 4.31076C42.3727 2.87337 44.3124 2.07089 46.3311 2.07831C48.3497 2.08574 50.2837 2.90247 51.7112 4.35043C53.1386 5.79838 53.9438 7.76007 53.9511 9.80776C53.9583 11.8555 53.1673 13.823 51.7502 15.2814L45.2599 21.865C45.2927 22.9626 45.1689 24.0593 44.8924 25.1209L53.1714 16.723C54.9825 14.8859 56 12.3942 56 9.7961C56 7.19801 54.9825 4.70635 53.1714 2.86921C51.3602 1.03209 48.9039 0 46.3425 0C43.7813 0 41.3249 1.03209 39.5138 2.86921Z";

export default async function OgImage() {
  // Load JetBrains Mono for the OG image
  const fontData = await fetch(
    "https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8SKtjPQ.ttf",
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    <div
      style={{
        width: 1200,
        height: 630,
        background: "#0a0a0b",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "52px 64px",
        fontFamily: "JetBrains Mono",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Emerald glow — top left */}
      <div
        style={{
          position: "absolute",
          top: -160,
          left: -100,
          width: 520,
          height: 520,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(16,185,129,0.14) 0%, rgba(16,185,129,0.03) 45%, transparent 70%)",
        }}
      />
      {/* Emerald glow — bottom right */}
      <div
        style={{
          position: "absolute",
          bottom: -180,
          right: -80,
          width: 480,
          height: 480,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 60%)",
        }}
      />

      {/* Corner accents */}
      <div
        style={{
          position: "absolute",
          top: 28,
          left: 28,
          width: 20,
          height: 20,
          borderTop: "1px solid rgba(16,185,129,0.3)",
          borderLeft: "1px solid rgba(16,185,129,0.3)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 28,
          right: 28,
          width: 20,
          height: 20,
          borderBottom: "1px solid rgba(16,185,129,0.3)",
          borderRight: "1px solid rgba(16,185,129,0.3)",
        }}
      />

      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Logo mark */}
          <svg width="48" height="48" viewBox="0 0 256 256" fill="none">
            <rect width="256" height="256" rx="48" fill="#10B981" />
            <g transform="translate(28, 71) scale(3.57)">
              <path d={LOGO_PATH_1} fill="#0A0A0A" />
              <path d={LOGO_PATH_2} fill="#0A0A0A" />
              <path d={LOGO_PATH_3} fill="#0A0A0A" />
            </g>
          </svg>
          <span
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "#ffffff",
              textTransform: "uppercase",
              letterSpacing: "-0.01em",
            }}
          >
            Forge8004
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 14px",
            border: "1px solid rgba(16,185,129,0.3)",
            fontSize: 10,
            fontWeight: 500,
            color: "#10b981",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              background: "#10b981",
              borderRadius: "50%",
              boxShadow: "0 0 6px rgba(16,185,129,0.6)",
            }}
          />
          Base Sepolia
        </div>
      </div>

      {/* Hero section */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 56,
          flex: 1,
        }}
      >
        {/* Left — headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 11,
              fontWeight: 500,
              color: "#10b981",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
            }}
          >
            <div style={{ width: 28, height: 1, background: "#10b981" }} />
            ERC-8004 Trust Protocol
          </div>
          <div
            style={{
              fontSize: 52,
              fontWeight: 800,
              lineHeight: 1.0,
              color: "#ffffff",
              textTransform: "uppercase",
              letterSpacing: "-0.02em",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>Identity.</span>
            <span>Validation.</span>
            <span style={{ color: "#10b981" }}>Trust.</span>
          </div>
          <div
            style={{
              fontSize: 15,
              color: "rgba(161,161,170,0.85)",
              lineHeight: 1.5,
              maxWidth: 440,
              fontWeight: 400,
            }}
          >
            On-chain agent identity, capital sandboxing, and transparent trading
            telemetry for autonomous DeFi agents.
          </div>
        </div>

        {/* Right — feature cards */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            width: 320,
          }}
        >
          {[
            "ERC-721 Agent Identity",
            "Pre-Trade Risk Validation",
            "Capital Sandbox Controls",
            "Transparent Reputation",
          ].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 18px",
                border: "1px solid rgba(16,185,129,0.18)",
                background: "rgba(16,185,129,0.04)",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid rgba(16,185,129,0.3)",
                  fontSize: 10,
                  color: "#10b981",
                }}
              >
                ◆
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "#e4e4e7",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 16,
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ display: "flex", gap: 28 }}>
          {["Identity", "Validation", "Reputation", "Capital"].map((p) => (
            <div
              key={p}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 10,
                fontWeight: 500,
                color: "rgba(161,161,170,0.6)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              <div
                style={{
                  width: 4,
                  height: 4,
                  background: "rgba(16,185,129,0.5)",
                }}
              />
              {p}
            </div>
          ))}
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "rgba(16,185,129,0.4)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          ERC-721 · Base · 2026
        </span>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "JetBrains Mono",
          data: fontData,
          style: "normal",
          weight: 800,
        },
      ],
    },
  );
}
