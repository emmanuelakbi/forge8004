import {
  AlertTriangle,
  BadgeCheck,
  Database,
  Fingerprint,
  LockKeyhole,
  Shield,
  Wallet,
} from "lucide-react";

const trustSections = [
  {
    title: "Agent identity",
    icon: Fingerprint,
    points: [
      "ERC-721 token on Base Sepolia links each agent to a verifiable on-chain identity",
      "Operator ownership enforced — users only see and control their own agents",
      "Strategy type, risk profile, and execution wallet recorded as immutable metadata",
    ],
  },
  {
    title: "Capital controls",
    icon: Wallet,
    points: [
      "Dynamic position sizing: 10% / 25% / 40% of treasury based on risk profile",
      "Daily loss limits, kill-switch drawdown thresholds, and duplicate exposure blocking",
      "Low-conviction entries (score < 65) auto-cut at -1.5% instead of waiting for stop-loss",
    ],
  },
  {
    title: "Validation artifacts",
    icon: BadgeCheck,
    points: [
      "Every trade intent scored 0–100 with risk checks, AI reasoning, and checkpoint data",
      "Validation timeline grouped by nonce — searchable, paginated, and timestamped",
      "Blocked trades produce explanation artifacts showing which policy was violated",
    ],
  },
  {
    title: "Data integrity",
    icon: Database,
    points: [
      "Firestore security rules enforce field-level validation and document ownership",
      "Deep undefined stripping on all writes prevents silent data corruption",
      "Unique nonces per cycle with random suffix prevent grouping collisions",
    ],
  },
];

const securityNotes = [
  "Trade execution is currently simulated — not routed through a live on-chain settlement contract.",
  "EIP-712 typed intents and EIP-1271 smart-wallet verification are planned but not yet implemented.",
  "The risk router enforces rules in application logic today. On-chain enforcement is the Phase 4 goal.",
  "API keys and private keys are server-side only — never exposed to the client bundle.",
];

export default function TrustCenter() {
  return (
    <div className="page-shell">
      <section className="page-header">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-emerald-cyber">
            Trust Center
          </p>
          <h1 className="mt-3 text-3xl font-mono font-bold uppercase tracking-tight text-white sm:text-4xl lg:text-5xl">
            How Forge8004
            <span className="block text-emerald-cyber">
              earns operator trust
            </span>
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            Trust is not a label — it is a system of verifiable artifacts. This
            page documents the safeguards active in the protocol today and the
            boundaries that still exist while the trust layer matures toward
            on-chain enforcement.
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {trustSections.map((section) => (
          <article
            key={section.title}
            className="glass-panel p-6 sm:p-8 space-y-5"
          >
            <div className="flex items-center gap-3">
              <section.icon className="h-5 w-5 text-emerald-cyber" />
              <h2 className="text-xl font-mono font-bold uppercase tracking-tight text-white">
                {section.title}
              </h2>
            </div>
            <div className="space-y-3">
              {section.points.map((point) => (
                <div
                  key={point}
                  className="flex items-start gap-3 border border-border-subtle bg-obsidian/40 px-4 py-4"
                >
                  <Shield className="mt-0.5 h-4 w-4 text-emerald-cyber" />
                  <p className="text-[11px] font-mono uppercase leading-relaxed tracking-[0.16em] text-zinc-300">
                    {point}
                  </p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr),minmax(0,0.9fr)]">
        <div className="glass-panel p-6 sm:p-8 space-y-5 border border-emerald-cyber/20 bg-emerald-cyber/[0.04]">
          <div className="flex items-center gap-3">
            <LockKeyhole className="h-5 w-5 text-emerald-cyber" />
            <h2 className="text-2xl font-mono font-bold uppercase tracking-tight text-white">
              Current trust model
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-300">
            Forge8004 enforces trust through structured intent validation,
            pre-trade risk routing, checkpoint persistence, and owner-scoped
            data access. Every agent action is auditable from decision through
            outcome.
          </p>
          <p className="text-sm leading-relaxed text-zinc-400">
            The protocol is evolving toward fully on-chain enforcement — capital
            vault contracts, trustless risk routers, and DEX-settled execution
            on Base Mainnet. Today it operates as a verifiable sandbox with real
            market data and AI-driven decision logic.
          </p>
        </div>

        <div className="glass-panel p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-warning" />
            <h2 className="text-xl font-mono font-bold uppercase tracking-tight text-white">
              Honest boundaries
            </h2>
          </div>
          <div className="space-y-3">
            {securityNotes.map((note) => (
              <div
                key={note}
                className="border border-border-subtle bg-obsidian/40 px-4 py-4"
              >
                <p className="text-[11px] font-mono uppercase leading-relaxed tracking-[0.16em] text-zinc-300">
                  {note}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
