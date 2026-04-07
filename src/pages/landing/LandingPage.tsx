import {
  ArrowRight,
  BadgeCheck,
  Bot,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { Link } from "react-router-dom";

const coreBenefits = [
  {
    title: "On-chain agent identity",
    text: "Every agent is minted as an ERC-721 token on Base Sepolia, linking its wallet, strategy, and operator to a verifiable on-chain record.",
    icon: Bot,
  },
  {
    title: "Pre-trade risk validation",
    text: "Each trade intent passes through risk checks, scoring, and checkpoint artifacts before capital moves. Actions that exceed limits get blocked automatically.",
    icon: ShieldCheck,
  },
  {
    title: "Auditable trust history",
    text: "Decisions, safety checks, and outcomes are recorded as structured trust artifacts — building a transparent, reviewable reputation over time.",
    icon: BadgeCheck,
  },
];

const quickPoints = [
  "ERC-8004 trust layer on Base Sepolia",
  "8 autonomous trading strategies",
  "AI-powered decisions via GPT OSS 120B",
  "Live BTC & ETH market data from Binance",
];

const useCases = [
  "Register and deploy autonomous trading agents",
  "Monitor AI decisions, risk checks, and trade outcomes",
  "Track reputation: PnL, Sharpe ratio, drawdown, trust score",
  "Review why any trade was accepted, held, or blocked",
];

export default function LandingPage() {
  return (
    <div className="page-shell">
      <section className="page-header">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-cyber animate-pulse" />
            <span className="text-[10px] font-mono text-emerald-cyber uppercase tracking-widest">
              ERC-8004 Trust Protocol
            </span>
          </div>
          <h1 className="max-w-5xl text-3xl font-mono font-bold uppercase tracking-tight text-white sm:text-4xl lg:text-5xl xl:text-6xl">
            The trust layer for
            <span className="block text-emerald-cyber">
              autonomous DeFi agents
            </span>
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            Forge8004 gives every AI trading agent a verifiable identity,
            defines what it is allowed to do, tracks how it behaves under risk,
            and builds the case for why it can be trusted with capital.
            Identity, validation, and reputation — all on-chain.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 md:w-auto md:min-w-[18rem]">
          <Link
            to="/overview"
            className="btn-primary inline-flex items-center justify-center gap-3 px-6 py-4 text-[11px] tracking-[0.22em]"
          >
            Open Operator Console
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/how-it-works"
            className="btn-secondary inline-flex items-center justify-center gap-3 px-6 py-4 text-[11px] tracking-[0.22em]"
          >
            See How It Works
          </Link>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr),minmax(0,0.85fr)]">
        <div className="glass-panel p-6 sm:p-8 lg:p-10 space-y-8">
          <div className="space-y-3">
            <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-zinc-600">
              What Forge8004 does
            </p>
            <h2 className="text-2xl font-mono font-bold uppercase tracking-tight text-white sm:text-3xl">
              Verifiable trust for
              <span className="block text-emerald-cyber">
                AI trading agents
              </span>
            </h2>
            <p className="max-w-3xl text-sm leading-relaxed text-zinc-400">
              Agents operate inside enforced controls — allocation limits, risk
              checks, and position sizing rules. Every decision produces a trust
              artifact so operators, judges, and users can verify behavior
              instead of guessing.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {quickPoints.map((item) => (
              <div
                key={item}
                className="border border-border-subtle bg-obsidian/40 px-4 py-4"
              >
                <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-zinc-300">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-6 sm:p-8 space-y-5">
          <div className="border-b border-border-subtle pb-4">
            <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-zinc-600">
              At a glance
            </p>
            <h2 className="mt-2 text-2xl font-mono font-bold uppercase tracking-tight text-white">
              Protocol Runtime
            </h2>
          </div>

          <div className="space-y-3">
            <div className="border border-border-subtle bg-obsidian/40 p-4">
              <p className="text-[8px] font-mono uppercase tracking-[0.22em] text-zinc-600">
                Standard
              </p>
              <p className="mt-2 text-[12px] font-mono font-bold uppercase tracking-[0.16em] text-white">
                ERC-8004 + ERC-721
              </p>
            </div>
            <div className="border border-border-subtle bg-obsidian/40 p-4">
              <p className="text-[8px] font-mono uppercase tracking-[0.22em] text-zinc-600">
                Network
              </p>
              <p className="mt-2 text-[12px] font-mono font-bold uppercase tracking-[0.16em] text-white">
                Base Sepolia (84532)
              </p>
            </div>
            <div className="border border-border-subtle bg-obsidian/40 p-4">
              <p className="text-[8px] font-mono uppercase tracking-[0.22em] text-zinc-600">
                Strategies
              </p>
              <p className="mt-2 text-[12px] font-mono font-bold uppercase tracking-[0.16em] text-white">
                8 types — Grid, Momentum, Range +5
              </p>
            </div>
            <div className="border border-border-subtle bg-obsidian/40 p-4">
              <p className="text-[8px] font-mono uppercase tracking-[0.22em] text-zinc-600">
                Trust Flow
              </p>
              <p className="mt-2 text-[12px] font-mono font-bold uppercase tracking-[0.16em] text-white">
                Decide {"->"} Validate {"->"} Execute {"->"} Score
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {coreBenefits.map((item) => (
          <article
            key={item.title}
            className="glass-panel p-6 sm:p-8 space-y-5"
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-5 w-5 text-emerald-cyber" />
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-600">
                Core pillar
              </p>
            </div>
            <h2 className="text-xl font-mono font-bold uppercase tracking-tight text-white">
              {item.title}
            </h2>
            <p className="text-sm leading-relaxed text-zinc-400">{item.text}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr),minmax(0,1fr)]">
        <div className="glass-panel p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <Workflow className="h-5 w-5 text-emerald-cyber" />
            <h2 className="text-2xl font-mono font-bold uppercase tracking-tight text-white">
              Why this matters
            </h2>
          </div>
          <div className="space-y-3">
            <div className="border border-border-subtle bg-obsidian/40 p-5">
              <p className="text-[9px] font-mono uppercase tracking-[0.24em] text-zinc-600">
                The problem
              </p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                Autonomous agents trade capital without proving who they are,
                what rules they follow, or whether their track record is real.
                There is no standard for agent trust in DeFi.
              </p>
            </div>
            <div className="border border-emerald-cyber/20 bg-emerald-cyber/[0.04] p-5">
              <p className="text-[9px] font-mono uppercase tracking-[0.24em] text-emerald-cyber">
                The Forge8004 approach
              </p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-200">
                Every agent gets an on-chain identity. Every trade intent is
                validated and scored. Every outcome builds durable reputation.
                Trust becomes verifiable, not assumed.
              </p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 sm:p-8 space-y-5">
          <h2 className="text-2xl font-mono font-bold uppercase tracking-tight text-white">
            What you can do
          </h2>
          <div className="space-y-3">
            {useCases.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 border border-border-subtle bg-obsidian/40 px-4 py-4"
              >
                <div className="mt-[2px] h-2 w-2 bg-emerald-cyber shrink-0" />
                <p className="text-[11px] font-mono uppercase leading-relaxed tracking-[0.12em] text-zinc-300">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
