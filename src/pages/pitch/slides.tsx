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

export const marketBars = [
  { label: "AI agent software", value: "Rising", width: 82 },
  { label: "On-chain operations", value: "Expanding", width: 71 },
  { label: "Team oversight tools", value: "Underserved", width: 63 },
  { label: "Trust reporting", value: "Open lane", width: 88 },
];

export const rolloutBars = [
  { label: "Console adoption", value: "Now", width: 70 },
  { label: "Team controls", value: "Next", width: 58 },
  { label: "Partner APIs", value: "Later", width: 44 },
];

export const slides: SlideSpec[] = [
  {
    id: "hero",
    num: "01",
    accent: "emerald",
    icon: ForgeLogo,
    title: "See every AI agent decision in one place",
    subtitle: "A calmer operator layer for teams using AI trading agents",
    content: (
      <div className="grid h-full grid-cols-2 gap-5">
        <div className="flex flex-col justify-between">
          <p
            className="text-[14px] font-mono uppercase leading-[1.6] tracking-[0.04em]"
            style={{ color: "#D4D4D8" }}
          >
            Forge8004 helps teams follow intent, safety checks, capital use,
            and outcomes without digging through scattered logs.
          </p>
          <div className="space-y-3">
            {[
              "One operator console",
              "Visible safety checks",
              "Readable decision history",
              "Built for teams",
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
  {
    id: "problem",
    num: "02",
    accent: "amber",
    icon: Shield,
    title: "The problem",
    subtitle: "Teams cannot trust what they cannot clearly see",
    content: (
      <div className="grid h-full grid-cols-2 gap-5">
        <div className="grid grid-rows-2 gap-4">
          {[
            ["Blind spots", "People cannot tell why the agent is acting."],
            [
              "Oversized requests",
              "Big trade ideas show up before any sane limits are applied.",
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
              "No shared story",
              "Teams and partners interpret different screens differently.",
            ],
            [
              "Low trust",
              "It becomes hard to onboard users or reviewers with confidence.",
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
  {
    id: "why-now",
    num: "03",
    accent: "sky",
    icon: Globe,
    title: "Why now",
    subtitle: "The need is growing faster than the visibility layer around it",
    content: (
      <div className="grid h-full grid-cols-[1fr_1.2fr] gap-5">
        <div className="grid grid-rows-3 gap-4">
          {[
            [
              "Teams want one view",
              "Operators need one calm screen instead of five tools.",
            ],
            [
              "Capital needs protection",
              "The cost of confusing or oversized trades keeps rising.",
            ],
            [
              "Trust needs proof",
              "People want to see what happened, not just hear the promise.",
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
            Where attention is building
          </p>
          <div className="mt-5">
            <Bars accent="sky" rows={marketBars} />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              ["Operators", "Need safer visibility"],
              ["Builders", "Need stronger confidence"],
              ["Partners", "Need a clearer story"],
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
  {
    id: "product",
    num: "04",
    accent: "emerald",
    icon: Layers3,
    title: "Inside the workspace",
    subtitle: "Connected views, not just one dashboard screen",
    content: (
      <div className="grid h-full grid-cols-2 gap-5">
        <div className="grid grid-rows-2 gap-4">
          {[
            [
              "Signals",
              "Shows what the system wanted to do, in plain language.",
            ],
            [
              "Capital",
              "Shows what is free, what is deployed, and what stayed protected.",
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
              "Safety",
              "Shows when the router allowed, held, or blocked an action.",
            ],
            [
              "History",
              "Shows the sequence trail so reviews are easier later on.",
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
  {
    id: "workflow",
    num: "05",
    accent: "violet",
    icon: Workflow,
    title: "How it works",
    subtitle: "Every agent sequence follows the same readable path",
    content: (
      <div className="grid h-full grid-cols-5 gap-3">
        {[
          {
            n: "01",
            t: "Signal",
            d: "The system decides whether it wants to act.",
          },
          {
            n: "02",
            t: "Sizing",
            d: "Requested capital is compared against safe limits.",
          },
          {
            n: "03",
            t: "Routing",
            d: "The risk router approves, blocks, or holds.",
          },
          {
            n: "04",
            t: "Execution",
            d: "The outcome is shown in plain language.",
          },
          {
            n: "05",
            t: "History",
            d: "A timeline is saved so people can review later.",
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
  {
    id: "risk-router",
    num: "06",
    accent: "amber",
    icon: Shield,
    title: "Risk router",
    subtitle: "The system can say no before money moves",
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
  {
    id: "trust-layer",
    num: "07",
    accent: "sky",
    icon: Radar,
    title: "Trust layer",
    subtitle: "Trust is stronger when the story stays visible over time",
    content: (
      <div className="grid h-full grid-cols-4 gap-4">
        {[
          ["Identity", "Who the agent is and what wallet or account it uses."],
          ["Validation", "What checks were applied before or after an action."],
          ["Execution", "What actually happened once the system made a call."],
          ["Reputation", "A running summary of steady behavior over time."],
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
  {
    id: "audience",
    num: "08",
    accent: "emerald",
    icon: Users,
    title: "Who this is for",
    subtitle: "A clear product wedge with room to expand",
    content: (
      <div className="grid h-full grid-cols-2 gap-5">
        <P accent="emerald" className="p-5">
          <p
            className="text-[10px] font-mono uppercase tracking-[0.22em]"
            style={{ color: "#71717A" }}
          >
            Near-term users
          </p>
          <div className="mt-5 space-y-4">
            {[
              [
                "Founders",
                "Need a cleaner way to explain what the agent is doing",
              ],
              ["Ops teams", "Need one place to supervise signals and risk"],
              ["Community leads", "Need a calmer story for users and partners"],
            ].map(([t, d]) => (
              <div
                key={t}
                className="border p-4"
                style={{ borderColor: "rgba(255,255,255,0.08)" }}
              >
                <p className="text-sm font-mono font-bold uppercase text-white">
                  {t}
                </p>
                <p
                  className="mt-2 text-[11px] font-mono uppercase tracking-[0.08em]"
                  style={{ color: "#A1A1AA" }}
                >
                  {d}
                </p>
              </div>
            ))}
          </div>
        </P>
        <P accent="emerald" className="p-5">
          <p
            className="text-[10px] font-mono uppercase tracking-[0.22em]"
            style={{ color: "#71717A" }}
          >
            Expansion path
          </p>
          <div className="mt-5 space-y-5">
            {[
              ["01", "Console and trust reporting"],
              ["02", "Team controls and workflow rules"],
              ["03", "Partner integrations and distribution"],
              ["04", "Shared oversight across more agent products"],
            ].map(([n, d]) => (
              <div key={n} className="flex items-start gap-4">
                <div
                  style={{
                    width: 36,
                    height: 36,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `1px solid ${tones.emerald.border}`,
                    backgroundColor: tones.emerald.soft,
                  }}
                >
                  <span
                    className="text-[10px] font-mono font-bold"
                    style={{ color: "#10B981" }}
                  >
                    {n}
                  </span>
                </div>
                <p
                  className="text-[11px] font-mono uppercase leading-[1.5] tracking-[0.08em]"
                  style={{ color: "#D4D4D8" }}
                >
                  {d}
                </p>
              </div>
            ))}
          </div>
        </P>
      </div>
    ),
  },
  {
    id: "market",
    num: "09",
    accent: "sky",
    icon: BarChart3,
    title: "Market opportunity",
    subtitle: "Teams need oversight, not more black boxes",
    content: (
      <div className="grid h-full grid-cols-[1.1fr_0.9fr] gap-5">
        <P accent="sky" className="p-6">
          <p
            className="text-[10px] font-mono uppercase tracking-[0.22em]"
            style={{ color: "#71717A" }}
          >
            Where demand is forming
          </p>
          <div className="mt-6">
            <Bars accent="sky" rows={marketBars} />
          </div>
        </P>
        <div className="grid grid-rows-3 gap-4">
          {[
            [
              "More agent activity",
              "Teams need a better operator layer as activity grows.",
            ],
            [
              "More money at stake",
              "Guardrails become a product feature, not just a backend rule.",
            ],
            [
              "More scrutiny",
              "Readable history matters when trust needs to be earned.",
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
  {
    id: "business",
    num: "10",
    accent: "emerald",
    icon: Wallet,
    title: "Business model",
    subtitle:
      "Revenue grows with usage, team adoption, and partner distribution",
    content: (
      <div className="grid h-full grid-cols-[0.85fr_1.15fr] gap-5">
        <div className="grid grid-rows-3 gap-4">
          <Stat
            accent="emerald"
            label="Usage"
            value="Per sequence"
            note="Grow with activity"
          />
          <Stat
            accent="emerald"
            label="Teams"
            value="Workspace plans"
            note="Grow with seats"
          />
          <Stat
            accent="emerald"
            label="Partners"
            value="API / integrations"
            note="Grow with distribution"
          />
        </div>
        <P accent="emerald" className="p-5">
          <p
            className="text-[10px] font-mono uppercase tracking-[0.22em]"
            style={{ color: "#71717A" }}
          >
            Simple expansion loop
          </p>
          <div className="mt-5 grid grid-cols-2 gap-4">
            {[
              ["Clearer product", "Teams understand the system faster"],
              ["Better trust", "Users are more comfortable staying active"],
              ["More usage", "More sessions and reviews inside Forge8004"],
              ["Higher value", "The workspace becomes harder to replace"],
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
            Better clarity compounds product value over time
          </div>
        </P>
      </div>
    ),
  },
  {
    id: "roadmap",
    num: "11",
    accent: "violet",
    icon: Target,
    title: "Roadmap",
    subtitle: "A practical path from stronger console to broader platform",
    content: (
      <div className="grid h-full grid-cols-[0.9fr_1.1fr] gap-5">
        <P accent="violet" className="p-6">
          <p
            className="text-[10px] font-mono uppercase tracking-[0.22em]"
            style={{ color: "#71717A" }}
          >
            Priority ladder
          </p>
          <div className="mt-5">
            <Bars accent="violet" rows={rolloutBars} />
          </div>
          <div className="mt-6 space-y-3">
            {[
              "Improve export-ready storytelling",
              "Make trust history easier to review",
              "Add more team-safe controls",
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
                    color: "#8B5CF6",
                  }}
                />
                <span
                  className="text-[11px] font-mono uppercase tracking-[0.08em]"
                  style={{ color: "#D4D4D8" }}
                >
                  {l}
                </span>
              </div>
            ))}
          </div>
        </P>
        <div className="grid grid-rows-3 gap-4">
          {[
            [
              "Now",
              "Stabilize the core operator experience and export fidelity.",
            ],
            [
              "Next",
              "Add workflow controls, trust reporting, and partner-ready views.",
            ],
            [
              "Later",
              "Open a broader platform layer for integrations and multi-team oversight.",
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
  {
    id: "close",
    num: "12",
    accent: "rose",
    icon: Sparkles,
    title: "The ask",
    subtitle: "A calmer, clearer trust layer for agent teams",
    content: (
      <div className="grid h-full grid-cols-2 gap-5">
        <P accent="rose" className="p-5">
          <p
            className="text-[10px] font-mono uppercase tracking-[0.22em]"
            style={{ color: "#71717A" }}
          >
            What we want next
          </p>
          <div className="mt-5 space-y-4">
            {[
              [
                "Pilot users",
                "Teams willing to shape the operator experience with real feedback.",
              ],
              [
                "Design partners",
                "Builders who need a clearer trust story around their agents.",
              ],
              [
                "Strategic introductions",
                "People who can open the right partner conversations.",
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
              What Forge8004 makes easier
            </p>
            <p className="mt-6 text-[32px] font-mono font-bold uppercase leading-[1.05] text-white">
              Understand the agent. Protect the money. Share the story.
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
              Built for teams who want visibility before scale
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
