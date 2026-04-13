import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Globe,
  Layers3,
  Radar,
  Shield,
  Sparkles,
  Target,
  Users,
  Wallet,
  Workflow,
} from "lucide-react";
import { ForgeLogo } from "../../components/brand/Logo";
import { SlideSpec, tones } from "./types";
import { P, Stat, Bars } from "./components";

/* Slide 03 — timing/urgency indicators (unique to Why Now) */
const timingBars = [
  { label: "AI agent deployments", value: "4× YoY", width: 88 },
  { label: "Capital managed by agents", value: "$2.1B+", width: 76 },
  { label: "Regulatory proposals filed", value: "12 in 2024", width: 62 },
  { label: "Trust infrastructure gap", value: "Widening", width: 92 },
];

/* Slide 09 — market sizing data (unique to Market Opportunity) */
const marketSizeBars = [
  { label: "DeFi agent TAM", value: "$18B", width: 90 },
  { label: "Agent oversight tools", value: "$1.2B", width: 58 },
  { label: "On-chain identity layer", value: "$640M", width: 42 },
  { label: "Trust reporting SaaS", value: "$380M", width: 30 },
];

/* Slide 11 — roadmap phases (unique to Roadmap) */
const roadmapPhases = [
  { label: "Hackathon ship", value: "Phase 1", width: 95 },
  { label: "Infrastructure hardening", value: "Phase 2", width: 82 },
  { label: "Quant engine", value: "Phase 3", width: 68 },
  { label: "On-chain capital", value: "Phase 4", width: 54 },
  { label: "Multi-venue routing", value: "Phase 5", width: 40 },
  { label: "Social + marketplace", value: "Phase 6", width: 28 },
];

export const slides: SlideSpec[] = [
  /* ── 01 Hero ─────────────────────────────────────────────── */
  {
    id: "hero",
    num: "01",
    accent: "emerald",
    icon: ForgeLogo,
    title: "Forge8004 — ERC-8004 Trust Layer for Autonomous DeFi Agents",
    subtitle: "Identity, validation, and reputation for every agent action",
    content: (
      <div className="grid h-full grid-cols-2 gap-5">
        <div className="flex flex-col justify-between">
          <p
            className="text-[14px] font-mono uppercase leading-[1.6] tracking-[0.04em]"
            style={{ color: "#D4D4D8" }}
          >
            Forge8004 gives every AI trading agent a verifiable on-chain
            identity, validates each decision through risk checks, and builds a
            permanent reputation trail.
          </p>
          <div className="space-y-3">
            {[
              "On-chain agent identity (ERC-721)",
              "Scored validation for every trade",
              "Transparent reputation history",
              "One operator console for teams",
            ].map((h) => (
              <div
                key={h}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.02)",
                  padding: "10px 14px",
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    flexShrink: 0,
                    backgroundColor: "#10B981",
                  }}
                />
                <span
                  className="text-[11px] font-mono uppercase tracking-[0.14em]"
                  style={{ color: "#E4E4E7" }}
                >
                  {h}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-rows-[1fr_auto] gap-4">
          <P accent="emerald" className="p-5">
            <p
              className="text-[10px] font-mono uppercase tracking-[0.22em]"
              style={{ color: "#71717A" }}
            >
              Current sequence
            </p>
            <p className="mt-4 text-[20px] font-mono font-bold uppercase leading-[1.1] text-white">
              Buy ETH only within safe capital limits
            </p>
            <div className="mt-5 space-y-3">
              {[
                "Capital cap checked",
                "Risk score reviewed",
                "Trade reason recorded",
              ].map((l) => (
                <div
                  key={l}
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  <CheckCircle2
                    style={{
                      width: 16,
                      height: 16,
                      flexShrink: 0,
                      color: "#10B981",
                    }}
                  />
                  <span
                    className="text-[11px] font-mono uppercase tracking-[0.12em]"
                    style={{ color: "#D4D4D8" }}
                  >
                    {l}
                  </span>
                </div>
              ))}
            </div>
          </P>
          <div className="grid grid-cols-2 gap-4">
            <Stat
              accent="emerald"
              label="Signal"
              value="HOLD"
              note="Waiting safely"
            />
            <Stat
              accent="emerald"
              label="Capital"
              value="$18k"
              note="Free to route"
            />
          </div>
        </div>
      </div>
    ),
  },

  /* ── 02 The Problem ──────────────────────────────────────── */
  {
    id: "problem",
    num: "02",
    accent: "amber",
    icon: Shield,
    title: "The problem",
    subtitle: "Agents trade without proving identity and no one can verify why",
    content: (
      <div className="grid h-full grid-cols-2 gap-5">
        <div className="grid grid-rows-2 gap-4">
          {[
            [
              "No provable identity",
              "Agents operate with wallet addresses but no verifiable on-chain identity linking actions to accountability.",
            ],
            [
              "No guardrails before execution",
              "Trade intents go straight to market without risk checks, position limits, or capital caps.",
            ],
          ].map(([t, d]) => (
            <P key={t} accent="amber" className="p-5">
              <p className="text-sm font-mono font-bold uppercase text-white">
                {t}
              </p>
              <p
                className="mt-3 text-[11px] font-mono uppercase leading-relaxed tracking-[0.08em]"
                style={{ color: "#A1A1AA" }}
              >
                {d}
              </p>
            </P>
          ))}
        </div>
        <div className="grid grid-rows-2 gap-4">
          {[
            [
              "Scattered decision logs",
              "Trade reasoning, risk scores, and outcomes live in different systems with no unified trail.",
            ],
            [
              "No standard for trust",
              "There is no shared protocol for scoring agent behavior or comparing reliability across operators.",
            ],
          ].map(([t, d]) => (
            <P key={t} accent="amber" className="p-5">
              <p className="text-sm font-mono font-bold uppercase text-white">
                {t}
              </p>
              <p
                className="mt-3 text-[11px] font-mono uppercase leading-relaxed tracking-[0.08em]"
                style={{ color: "#A1A1AA" }}
              >
                {d}
              </p>
            </P>
          ))}
        </div>
      </div>
    ),
  },

  /* ── 03 Why Now ──────────────────────────────────────────── */
  {
    id: "why-now",
    num: "03",
    accent: "sky",
    icon: Globe,
    title: "Why now",
    subtitle:
      "AI agents are scaling faster than the trust infrastructure around them",
    content: (
      <div className="grid h-full grid-cols-[1fr_1.2fr] gap-5">
        <div className="grid grid-rows-3 gap-4">
          {[
            [
              "Agent growth is exponential",
              "Autonomous trading agents doubled in deployment count every six months through 2024.",
            ],
            [
              "Capital at risk is climbing",
              "Over $2 billion in DeFi capital is now managed by agents with minimal oversight.",
            ],
            [
              "Regulators are watching",
              "Twelve new proposals in 2024 target algorithmic trading accountability and agent disclosure.",
            ],
          ].map(([t, d]) => (
            <P key={t} accent="sky" className="p-5">
              <p className="text-sm font-mono font-bold uppercase text-white">
                {t}
              </p>
              <p
                className="mt-3 text-[11px] font-mono uppercase leading-[1.5] tracking-[0.08em]"
                style={{ color: "#A1A1AA" }}
              >
                {d}
              </p>
            </P>
          ))}
        </div>
        <P accent="sky" className="p-6">
          <p
            className="text-[10px] font-mono uppercase tracking-[0.22em]"
            style={{ color: "#71717A" }}
          >
            Urgency indicators
          </p>
          <div className="mt-5">
            <Bars accent="sky" rows={timingBars} />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              ["Speed", "Agents act in milliseconds"],
              ["Scale", "Billions under management"],
              ["Stakes", "One bad trade cascades fast"],
            ].map(([l, d]) => (
              <P key={l} accent="sky" className="p-3">
                <p
                  className="text-[10px] font-mono uppercase tracking-[0.18em]"
                  style={{ color: "#38BDF8" }}
                >
                  {l}
                </p>
                <p
                  className="mt-2 text-[10px] font-mono uppercase leading-[1.4] tracking-[0.08em]"
                  style={{ color: "#D4D4D8" }}
                >
                  {d}
                </p>
              </P>
            ))}
          </div>
        </P>
      </div>
    ),
  },

  /* ── 04 Inside the Workspace ─────────────────────────────── */
  {
    id: "product",
    num: "04",
    accent: "emerald",
    icon: Layers3,
    title: "Inside the workspace",
    subtitle: "Four live panels that show what every agent is doing right now",
    content: (
      <div className="grid h-full grid-cols-2 gap-5">
        <div className="grid grid-rows-2 gap-4">
          {[
            [
              "Agent dashboard",
              "See every registered agent, its current strategy, last action timestamp, and trust score at a glance.",
            ],
            [
              "Trade signals",
              "Live feed of incoming intents — asset pair, direction, size, and the AI reasoning behind each decision.",
            ],
          ].map(([t, d]) => (
            <P key={t} accent="emerald" className="p-5">
              <p
                className="text-[10px] font-mono uppercase tracking-[0.2em]"
                style={{ color: "#10B981" }}
              >
                {t}
              </p>
              <p
                className="mt-3 text-[12px] font-mono uppercase leading-relaxed tracking-[0.08em]"
                style={{ color: "#D4D4D8" }}
              >
                {d}
              </p>
            </P>
          ))}
        </div>
        <div className="grid grid-rows-2 gap-4">
          {[
            [
              "Capital tracking",
              "Real-time view of deployed vs. free capital, position exposure, and daily PnL across all agents.",
            ],
            [
              "Validation timeline",
              "Chronological record of every risk check, checkpoint, and scored validation artifact.",
            ],
          ].map(([t, d]) => (
            <P key={t} accent="emerald" className="p-5">
              <p
                className="text-[10px] font-mono uppercase tracking-[0.2em]"
                style={{ color: "#10B981" }}
              >
                {t}
              </p>
              <p
                className="mt-3 text-[12px] font-mono uppercase leading-relaxed tracking-[0.08em]"
                style={{ color: "#D4D4D8" }}
              >
                {d}
              </p>
            </P>
          ))}
        </div>
      </div>
    ),
  },

  /* ── 05 How It Works ─────────────────────────────────────── */
  {
    id: "workflow",
    num: "05",
    accent: "violet",
    icon: Workflow,
    title: "How it works",
    subtitle:
      "Five-step sequence from AI decision to permanent reputation record",
    content: (
      <div className="grid h-full grid-cols-5 gap-3">
        {[
          {
            n: "01",
            t: "AI Decision",
            d: "The agent analyzes market data and generates a structured trade intent.",
          },
          {
            n: "02",
            t: "Risk Router",
            d: "Intent passes through position limits, capital caps, and loss guardrails.",
          },
          {
            n: "03",
            t: "Execution",
            d: "Approved trades settle on-chain with full parameter transparency.",
          },
          {
            n: "04",
            t: "Checkpoint",
            d: "Every outcome is scored and recorded as a validation artifact.",
          },
          {
            n: "05",
            t: "Reputation",
            d: "Cumulative PnL, Sharpe ratio, and drawdown update the agent profile.",
          },
        ].map((s) => (
          <P key={s.n} accent="violet" className="p-4 flex flex-col">
            <div
              style={{
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderColor: tones.violet.border,
                backgroundColor: tones.violet.soft,
                border: `1px solid ${tones.violet.border}`,
              }}
            >
              <span
                className="text-[10px] font-mono font-bold"
                style={{ color: "#8B5CF6" }}
              >
                {s.n}
              </span>
            </div>
            <p className="mt-4 text-sm font-mono font-bold uppercase text-white">
              {s.t}
            </p>
            <p
              className="mt-3 text-[11px] font-mono uppercase leading-relaxed tracking-[0.06em]"
              style={{ color: "#A1A1AA" }}
            >
              {s.d}
            </p>
          </P>
        ))}
      </div>
    ),
  },

  /* ── 06 Risk Router ──────────────────────────────────────── */
  {
    id: "risk-router",
    num: "06",
    accent: "amber",
    icon: Shield,
    title: "Risk router",
    subtitle:
      "Allocation caps, daily loss limits, and a kill switch before money moves",
    content: (
      <div className="grid h-full grid-cols-[1fr_0.7fr_1fr] gap-4">
        <P accent="amber" className="p-5">
          <p
            className="text-[10px] font-mono uppercase tracking-[0.22em]"
            style={{ color: "#71717A" }}
          >
            Incoming intent
          </p>
          <div className="mt-4 space-y-3">
            {[
              "Asset pair",
              "Position size",
              "Capital requested",
              "Entry / stop / target",
            ].map((i) => (
              <div
                key={i}
                className="border px-3 py-3 text-[11px] font-mono uppercase tracking-[0.12em]"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  color: "#E4E4E7",
                }}
              >
                {i}
              </div>
            ))}
          </div>
        </P>
        <P
          accent="amber"
          className="flex flex-col items-center justify-center p-5 text-center"
        >
          <div
            className="flex h-24 w-24 items-center justify-center border"
            style={{
              borderColor: tones.amber.border,
              background: `radial-gradient(circle, ${tones.amber.glow}, rgba(10,10,11,0.85))`,
            }}
          >
            <Shield
              style={{ width: 40, height: 40, flexShrink: 0, color: "#F59E0B" }}
            />
          </div>
          <p className="mt-4 text-base font-mono font-bold uppercase text-white">
            Risk router
          </p>
          <p
            className="mt-2 text-[10px] font-mono uppercase leading-relaxed tracking-[0.08em]"
            style={{ color: "#A1A1AA" }}
          >
            Checks sizing, exposure, and loss limits.
          </p>
        </P>
        <div className="grid grid-rows-2 gap-4">
          <P accent="amber" className="p-5">
            <p
              className="text-[10px] font-mono uppercase tracking-[0.22em]"
              style={{ color: "#71717A" }}
            >
              Approved
            </p>
            <div className="mt-4 space-y-3">
              {[
                "Trade can proceed",
                "Capital reserves update",
                "Checkpoint recorded",
              ].map((i) => (
                <div
                  key={i}
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  <CheckCircle2
                    style={{
                      width: 16,
                      height: 16,
                      flexShrink: 0,
                      color: "#F59E0B",
                    }}
                  />
                  <span
                    className="text-[11px] font-mono uppercase tracking-[0.1em]"
                    style={{ color: "#E4E4E7" }}
                  >
                    {i}
                  </span>
                </div>
              ))}
            </div>
          </P>
          <P accent="amber" className="p-5">
            <p
              className="text-[10px] font-mono uppercase tracking-[0.22em]"
              style={{ color: "#71717A" }}
            >
              Blocked
            </p>
            <div className="mt-4 space-y-3">
              {[
                "Trade too large",
                "Too many positions",
                "Daily loss guardrail hit",
              ].map((i) => (
                <div
                  key={i}
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      flexShrink: 0,
                      backgroundColor: "#F59E0B",
                    }}
                  />
                  <span
                    className="text-[11px] font-mono uppercase tracking-[0.1em]"
                    style={{ color: "#E4E4E7" }}
                  >
                    {i}
                  </span>
                </div>
              ))}
            </div>
          </P>
        </div>
      </div>
    ),
  },

  /* ── 07 Trust Layer ──────────────────────────────────────── */
  {
    id: "trust-layer",
    num: "07",
    accent: "sky",
    icon: Radar,
    title: "Trust layer",
    subtitle:
      "ERC-8004 architecture — identity, validation, execution, reputation",
    content: (
      <div className="grid h-full grid-cols-4 gap-4">
        {[
          [
            "Identity",
            "ERC-721 token binds each agent to a wallet, strategy type, and registration timestamp on-chain.",
          ],
          [
            "Validation",
            "Every trade intent receives a scored check (0–100) covering risk limits, capital exposure, and policy compliance.",
          ],
          [
            "Execution",
            "Settlement records capture fill price, slippage, gas cost, and final position state for each trade.",
          ],
          [
            "Reputation",
            "Cumulative PnL, Sharpe ratio, max drawdown, and trade count build a permanent agent profile.",
          ],
        ].map(([t, d], i) => (
          <P key={t} accent="sky" className="p-5 flex flex-col">
            <div
              style={{
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `1px solid ${tones.sky.border}`,
                backgroundColor: tones.sky.soft,
              }}
            >
              <span
                className="text-[10px] font-mono font-bold"
                style={{ color: "#38BDF8" }}
              >
                0{i + 1}
              </span>
            </div>
            <p className="mt-4 text-sm font-mono font-bold uppercase text-white">
              {t}
            </p>
            <p
              className="mt-3 text-[11px] font-mono uppercase leading-relaxed tracking-[0.06em]"
              style={{ color: "#A1A1AA" }}
            >
              {d}
            </p>
          </P>
        ))}
      </div>
    ),
  },

  /* ── 08 Who This Is For ──────────────────────────────────── */
  {
    id: "audience",
    num: "08",
    accent: "emerald",
    icon: Users,
    title: "Who this is for",
    subtitle: "Three personas who need verifiable agent behavior today",
    content: (
      <div className="grid h-full grid-cols-3 gap-5">
        {[
          {
            persona: "Agent operators",
            items: [
              "Deploy agents with on-chain identity",
              "Monitor live risk checks and capital",
              "Export trust reports for stakeholders",
            ],
          },
          {
            persona: "Judges & evaluators",
            items: [
              "Score agent behavior across strategies",
              "Compare reputation metrics at a glance",
              "Audit validation artifacts per trade",
            ],
          },
          {
            persona: "Developers",
            items: [
              "Build on the ERC-8004 trust primitive",
              "Integrate validation scoring via API",
              "Compose agent identity into new protocols",
            ],
          },
        ].map((group) => (
          <P key={group.persona} accent="emerald" className="p-5">
            <p
              className="text-[10px] font-mono uppercase tracking-[0.22em]"
              style={{ color: "#10B981" }}
            >
              {group.persona}
            </p>
            <div className="mt-5 space-y-4">
              {group.items.map((item) => (
                <div
                  key={item}
                  className="border p-4"
                  style={{ borderColor: "rgba(255,255,255,0.08)" }}
                >
                  <p
                    className="text-[11px] font-mono uppercase tracking-[0.08em]"
                    style={{ color: "#D4D4D8" }}
                  >
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </P>
        ))}
      </div>
    ),
  },

  /* ── 09 Market Opportunity ───────────────────────────────── */
  {
    id: "market",
    num: "09",
    accent: "sky",
    icon: BarChart3,
    title: "Market opportunity",
    subtitle:
      "DeFi agent infrastructure is a multi-billion dollar category forming now",
    content: (
      <div className="grid h-full grid-cols-[1.1fr_0.9fr] gap-5">
        <P accent="sky" className="p-6">
          <p
            className="text-[10px] font-mono uppercase tracking-[0.22em]"
            style={{ color: "#71717A" }}
          >
            Addressable market layers
          </p>
          <div className="mt-6">
            <Bars accent="sky" rows={marketSizeBars} />
          </div>
        </P>
        <div className="grid grid-rows-3 gap-4">
          {[
            [
              "No incumbent",
              "Agent trust infrastructure has no dominant player — the category is wide open.",
            ],
            [
              "Protocol-level moat",
              "ERC-8004 creates a composable standard that other protocols can build on top of.",
            ],
            [
              "Network effects",
              "Every new agent registered increases the value of the reputation dataset for all participants.",
            ],
          ].map(([t, d]) => (
            <P key={t} accent="sky" className="p-5">
              <p className="text-sm font-mono font-bold uppercase text-white">
                {t}
              </p>
              <p
                className="mt-2 text-[11px] font-mono uppercase leading-relaxed tracking-[0.08em]"
                style={{ color: "#A1A1AA" }}
              >
                {d}
              </p>
            </P>
          ))}
        </div>
      </div>
    ),
  },

  /* ── 10 Business Model ───────────────────────────────────── */
  {
    id: "business",
    num: "10",
    accent: "emerald",
    icon: Wallet,
    title: "Business model",
    subtitle:
      "Five revenue streams that scale with protocol adoption and trading volume",
    content: (
      <div className="grid h-full grid-cols-[0.85fr_1.15fr] gap-5">
        <div className="grid grid-rows-3 gap-4">
          <Stat
            accent="emerald"
            label="Protocol fees"
            value="0.08%"
            note="Per validated trade"
          />
          <Stat
            accent="emerald"
            label="Copy trading"
            value="15%"
            note="Performance fee share"
          />
          <Stat
            accent="emerald"
            label="API access"
            value="Tiered"
            note="Per-call pricing"
          />
        </div>
        <P accent="emerald" className="p-5">
          <p
            className="text-[10px] font-mono uppercase tracking-[0.22em]"
            style={{ color: "#71717A" }}
          >
            Revenue mechanics
          </p>
          <div className="mt-5 grid grid-cols-2 gap-4">
            {[
              [
                "Protocol trading fees",
                "Basis points on every validated execution",
              ],
              [
                "Copy trading fees",
                "Performance share when users mirror top agents",
              ],
              [
                "Marketplace listings",
                "Agents pay to list strategies for discovery",
              ],
              [
                "CEX broker commissions",
                "Revenue share on routed centralized exchange volume",
              ],
            ].map(([t, d]) => (
              <P key={t} accent="emerald" className="p-4">
                <p className="text-[11px] font-mono font-bold uppercase text-white">
                  {t}
                </p>
                <p
                  className="mt-2 text-[10px] font-mono uppercase tracking-[0.08em]"
                  style={{ color: "#A1A1AA" }}
                >
                  {d}
                </p>
              </P>
            ))}
          </div>
          <div
            className="mt-5 flex items-center gap-3 text-[11px] font-mono uppercase tracking-[0.12em]"
            style={{ color: "#10B981" }}
          >
            <ArrowRight style={{ width: 16, height: 16, flexShrink: 0 }} />
            Revenue compounds with agent count and trading volume
          </div>
        </P>
      </div>
    ),
  },

  /* ── 11 Roadmap ──────────────────────────────────────────── */
  {
    id: "roadmap",
    num: "11",
    accent: "violet",
    icon: Target,
    title: "Roadmap",
    subtitle: "Six phases from hackathon ship to social marketplace",
    content: (
      <div className="grid h-full grid-cols-[0.9fr_1.1fr] gap-5">
        <P accent="violet" className="p-6">
          <p
            className="text-[10px] font-mono uppercase tracking-[0.22em]"
            style={{ color: "#71717A" }}
          >
            Development phases
          </p>
          <div className="mt-5">
            <Bars accent="violet" rows={roadmapPhases} />
          </div>
        </P>
        <div className="grid grid-rows-3 gap-4">
          {[
            [
              "Now — Ship & harden",
              "Launch core console, agent registration, and validated trade pipeline on Base Sepolia.",
            ],
            [
              "Next — Quant & capital",
              "Add quantitative engine, on-chain capital vaults, and multi-strategy support.",
            ],
            [
              "Later — Scale & distribute",
              "Open multi-venue routing, social copy trading, and the agent strategy marketplace.",
            ],
          ].map(([t, d]) => (
            <P key={t} accent="violet" className="p-5">
              <p
                className="text-[10px] font-mono uppercase tracking-[0.2em]"
                style={{ color: "#8B5CF6" }}
              >
                {t}
              </p>
              <p
                className="mt-3 text-[12px] font-mono uppercase leading-relaxed tracking-[0.08em]"
                style={{ color: "#E4E4E7" }}
              >
                {d}
              </p>
            </P>
          ))}
        </div>
      </div>
    ),
  },

  /* ── 12 The Ask ──────────────────────────────────────────── */
  {
    id: "close",
    num: "12",
    accent: "rose",
    icon: Sparkles,
    title: "The ask",
    subtitle: "Pilot users, design partners, and strategic introductions",
    content: (
      <div className="grid h-full grid-cols-2 gap-5">
        <P accent="rose" className="p-5">
          <p
            className="text-[10px] font-mono uppercase tracking-[0.22em]"
            style={{ color: "#71717A" }}
          >
            What we need next
          </p>
          <div className="mt-5 space-y-4">
            {[
              [
                "Pilot users",
                "Teams running autonomous agents who want verifiable trust reporting from day one.",
              ],
              [
                "Design partners",
                "Protocols and DAOs building agent infrastructure who need an identity and validation layer.",
              ],
              [
                "Strategic introductions",
                "Connections to DeFi funds, agent platforms, and compliance-focused organizations.",
              ],
            ].map(([t, d]) => (
              <P key={t} accent="rose" className="p-4">
                <p className="text-[11px] font-mono font-bold uppercase text-white">
                  {t}
                </p>
                <p
                  className="mt-2 text-[10px] font-mono uppercase tracking-[0.08em]"
                  style={{ color: "#D4D4D8" }}
                >
                  {d}
                </p>
              </P>
            ))}
          </div>
        </P>
        <P accent="rose" className="flex flex-col justify-between p-6">
          <div>
            <p
              className="text-[10px] font-mono uppercase tracking-[0.22em]"
              style={{ color: "#71717A" }}
            >
              What Forge8004 delivers
            </p>
            <p className="mt-6 text-[32px] font-mono font-bold uppercase leading-[1.05] text-white">
              Prove the agent. Protect the capital. Build the reputation.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 11,
                fontFamily: "ui-monospace, monospace",
                textTransform: "uppercase" as const,
                letterSpacing: "0.12em",
                color: "#F43F5E",
              }}
            >
              <Activity style={{ width: 16, height: 16, flexShrink: 0 }} />
              The trust layer for autonomous DeFi agents
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 11,
                fontFamily: "ui-monospace, monospace",
                textTransform: "uppercase" as const,
                letterSpacing: "0.12em",
                color: "#FFFFFF",
              }}
            >
              <ChevronRight style={{ width: 16, height: 16, flexShrink: 0 }} />
              forge 8004 // 2026
            </div>
          </div>
        </P>
      </div>
    ),
  },
];
