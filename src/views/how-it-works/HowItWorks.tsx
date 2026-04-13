import {
  ArrowRight,
  BadgeCheck,
  ShieldCheck,
  Wallet,
  Waypoints,
} from "lucide-react";
import Link from "next/link";

const steps = [
  {
    step: "01",
    title: "Mint the agent identity",
    text: "Register an ERC-721 agent on Base Sepolia with its operator, strategy type, risk profile, execution wallet, and on-chain metadata — creating a verifiable identity.",
  },
  {
    step: "02",
    title: "Fund the capital sandbox",
    text: "Deposit test capital into the agent treasury. Position sizing scales dynamically with the balance — 10%, 25%, or 40% allocation depending on risk profile.",
  },
  {
    step: "03",
    title: "AI generates a trade intent",
    text: "GPT OSS 120B analyzes multi-timeframe Binance data (5M, 15M, 1H candles), support/resistance levels, RSI, and current exposure to propose a structured trade intent or hold.",
  },
  {
    step: "04",
    title: "Risk router validates the intent",
    text: "The intent passes through allocation caps, daily loss limits, duplicate exposure checks, and kill-switch thresholds. Actions that break policy are blocked with an explanation artifact.",
  },
  {
    step: "05",
    title: "Execute and record checkpoints",
    text: "Approved intents execute with TP/SL monitoring every 15 seconds. Each cycle produces signed checkpoints — intent, risk check, execution state, and validation score (0–100).",
  },
  {
    step: "06",
    title: "Build durable reputation",
    text: "Stablecoin-denominated PnL, Sharpe-like scoring, max drawdown, and trade count accumulate into a persistent reputation profile tied to the agent's on-chain identity.",
  },
];

const panels = [
  {
    icon: Wallet,
    title: "Structured trade intents",
    text: "Every decision is a typed artifact — side, asset, size, stop-loss, take-profit, AI reasoning, risk checks, and nonce tracking with replay protection.",
  },
  {
    icon: ShieldCheck,
    title: "Pre-trade risk enforcement",
    text: "The risk router can reject. Oversized positions, duplicate exposure, policy violations, and low-conviction entries are blocked before capital moves.",
  },
  {
    icon: BadgeCheck,
    title: "Auditable trust trail",
    text: "Operators see exactly what the agent decided, which checks it passed or failed, and how the outcome affected its trust score — grouped by nonce and cycle.",
  },
];

export default function HowItWorks() {
  return (
    <div className="page-shell">
      <section className="page-header">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-emerald-cyber">
            Protocol Flow
          </p>
          <h1 className="mt-3 text-3xl font-mono font-bold uppercase tracking-tight text-white sm:text-4xl lg:text-5xl">
            How the trust layer
            <span className="block text-emerald-cyber">
              validates every trade
            </span>
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            From agent registration to reputation scoring, every step in
            Forge8004 produces verifiable trust artifacts. Nothing moves without
            a checkpoint.
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {panels.map((panel) => (
          <article
            key={panel.title}
            className="glass-panel p-6 sm:p-8 space-y-4"
          >
            <panel.icon className="h-5 w-5 text-emerald-cyber" />
            <h2 className="text-xl font-mono font-bold uppercase tracking-tight text-white">
              {panel.title}
            </h2>
            <p className="text-sm leading-relaxed text-zinc-400">
              {panel.text}
            </p>
          </article>
        ))}
      </section>

      <section className="glass-panel p-6 sm:p-8 lg:p-10">
        <div className="mb-8 flex items-center gap-3">
          <Waypoints className="h-5 w-5 text-emerald-cyber" />
          <h2 className="text-2xl font-mono font-bold uppercase tracking-tight text-white">
            Agent lifecycle
          </h2>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {steps.map((item) => (
            <div
              key={item.step}
              className="border border-border-subtle bg-obsidian/40 p-5 sm:p-6"
            >
              <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-emerald-cyber">
                {item.step}
              </p>
              <h3 className="mt-3 text-lg font-mono font-bold uppercase tracking-tight text-white">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-panel p-6 sm:p-8 border border-emerald-cyber/20 bg-emerald-cyber/[0.04]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-emerald-cyber">
              Next step
            </p>
            <h2 className="mt-2 text-2xl font-mono font-bold uppercase tracking-tight text-white">
              See the trust model up close
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/trust-center"
              className="btn-secondary inline-flex items-center justify-center gap-3 px-5 py-3 text-[11px] tracking-[0.2em]"
            >
              Trust Center
            </Link>
            <Link
              href="/overview"
              className="btn-primary inline-flex items-center justify-center gap-3 px-5 py-3 text-[11px] tracking-[0.2em]"
            >
              Open Console
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
