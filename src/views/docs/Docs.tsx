"use client";

import Link from "next/link";
import {
  FileText,
  Shield,
  Zap,
  Cpu,
  Code,
  Database,
  TrendingUp,
} from "lucide-react";

export default function Docs() {
  const sections = [
    {
      title: "Protocol Overview",
      icon: Shield,
      content:
        "Forge8004 (ERC-8004) is a decentralized framework for autonomous trading agents. Each agent is represented by a non-fungible token (NFT) that stores identity and performance metadata on-chain.",
    },
    {
      title: "Agent Lifecycle",
      icon: Cpu,
      content:
        "Agents progress through three states: REGISTRATION (Minting), VALIDATION (Intent Verification), and EXECUTION (Live Trading). All state transitions are verified by the Reputation Registry.",
    },
    {
      title: "Validation Engine",
      icon: Zap,
      content:
        "Before any trade is executed, it must pass through the Validation Registry. Validators check for risk compliance, strategy alignment, and treasury constraints.",
    },
    {
      title: "API Integration",
      icon: Code,
      content:
        "Developers can interact with the protocol via standard Web3 libraries. The Registry contracts provide hooks for external risk routers and liquidity providers.",
    },
  ];

  const operationalSteps = [
    {
      title: "01 // Capital Funding",
      desc: "Use the 'Request Capital' button on the Agent Detail page to seed your agent with $25,000 in sandbox tokens from the Forge8004 Vault.",
    },
    {
      title: "02 // Market Synchronization",
      desc: "The agent monitors real-time price feeds for BTC and ETH. Ensure the 'Market Feed' in the sidebar is active and updating.",
    },
    {
      title: "03 // Initialize Autonomous Loop",
      desc: "Click 'Initialize Session' in the Trading Terminal. This starts the agent's internal clock, triggering a market analysis roughly every 2 minutes with on-demand rescans available.",
    },
    {
      title: "04 // AI Decision & Validation",
      desc: "The agent's 'Brain' (Groq AI) generates trade intents. These are sent to the 'Risk Router' for a trust score (0-100%) before being recorded.",
    },
    {
      title: "05 // Reputation Tracking",
      desc: "Successful trades increase the agent's Cumulative PnL and Sharpe Ratio, which are stored in the ERC-8004 Reputation Registry.",
    },
    {
      title: "06 // Trading Signals (Human-in-the-Loop)",
      desc: "Use the 'Trading Signals Log' to view AI-generated BUY/SELL signals with automated Take Profit and Stop Loss levels for manual execution or monitoring.",
    },
  ];

  return (
    <div className="page-shell-narrow">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 bg-emerald-cyber" />
          <span className="text-[10px] font-mono text-emerald-cyber uppercase tracking-widest">
            Documentation // v1.0.4
          </span>
        </div>
        <h1 className="text-4xl font-mono font-bold text-white tracking-tighter uppercase">
          Technical <span className="text-emerald-cyber">Manual</span>
        </h1>
        <p className="text-zinc-500 text-xs font-mono mt-2 uppercase tracking-wider">
          Specifications for the Forge8004 Autonomous Grid.
        </p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {sections.map((section, idx) => (
          <div key={section.title} className="glass-panel p-8 relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <section.icon className="w-12 h-12" />
            </div>

            <div className="flex items-center gap-3 mb-6">
              <span className="text-[10px] font-mono font-bold text-emerald-cyber">
                0{idx + 1}
              </span>
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-widest">
                {section.title}
              </h3>
            </div>

            <p className="text-xs font-mono text-zinc-400 leading-relaxed uppercase tracking-tight">
              {section.content}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <h2 className="text-lg font-mono font-bold text-white uppercase tracking-widest flex items-center gap-3">
          <FileText className="w-5 h-5 text-emerald-cyber" />
          Additional Resources
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "Brand Kit",
              description:
                "View the visual identity, brand directions, and presentation assets for Forge8004.",
              path: "/brand",
              cta: "Open Brand Kit",
            },
            {
              title: "Pitch Deck",
              description:
                "Browse and export the full Forge8004 pitch deck as high-quality PNG or PDF slides.",
              path: "/pitch",
              cta: "Open Pitch Deck",
            },
            {
              title: "Social Media Kit",
              description:
                "10 ready-made flyer designs for every platform — export as PNG, JPEG, or PDF.",
              path: "/social-kit",
              cta: "Open Social Kit",
            },
          ].map((resource) => (
            <div
              key={resource.title}
              className="glass-panel p-6 space-y-4 border border-border-subtle bg-zinc-deep/70"
            >
              <p className="text-[10px] font-mono font-bold text-emerald-cyber uppercase tracking-widest">
                {resource.title}
              </p>
              <p className="text-[11px] font-mono text-zinc-400 uppercase leading-relaxed tracking-tight">
                {resource.description}
              </p>
              <Link
                href={resource.path}
                className="inline-flex items-center justify-center px-4 py-3 border border-emerald-cyber/30 text-emerald-cyber font-mono font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-emerald-cyber/10 transition-all"
              >
                {resource.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Operational Guide */}
      <div className="space-y-6">
        <h2 className="text-lg font-mono font-bold text-white uppercase tracking-widest flex items-center gap-3">
          <Zap className="w-5 h-5 text-emerald-cyber" />
          Operational Guide: Trading with your Agent
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {operationalSteps.map((step) => (
            <div
              key={step.title}
              className="glass-panel p-6 border-l-2 border-emerald-cyber/30 bg-emerald-cyber/[0.02] space-y-3"
            >
              <h4 className="text-[10px] font-mono font-bold text-emerald-cyber uppercase tracking-widest">
                {step.title}
              </h4>
              <p className="text-[11px] font-mono text-zinc-400 uppercase leading-relaxed tracking-tight">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Trading Signals Guide */}
      <div className="space-y-6">
        <h2 className="text-lg font-mono font-bold text-white uppercase tracking-widest flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-emerald-cyber" />
          How to Read Trading Signals
        </h2>

        <div className="glass-panel p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <h4 className="text-xs font-mono font-bold text-emerald-cyber uppercase tracking-widest">
                01 // Signal Types
              </h4>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="text-[10px] font-mono font-bold text-emerald-cyber bg-emerald-cyber/10 px-2 py-1 h-fit">
                    BUY
                  </div>
                  <p className="text-[11px] font-mono text-zinc-400 uppercase leading-relaxed">
                    The AI expects the price to rise. It identifies an entry
                    point and sets targets for profit taking.
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="text-[10px] font-mono font-bold text-red-500 bg-red-500/10 px-2 py-1 h-fit">
                    SELL
                  </div>
                  <p className="text-[11px] font-mono text-zinc-400 uppercase leading-relaxed">
                    The AI expects the price to drop or has identified a trend
                    reversal. It exits positions to preserve capital.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-mono font-bold text-emerald-cyber uppercase tracking-widest">
                02 // Key Metrics
              </h4>
              <ul className="space-y-3">
                <li className="flex flex-col gap-1">
                  <span className="text-[10px] font-mono font-bold text-white uppercase">
                    Take Profit (TP)
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500 uppercase">
                    The target price where the agent will automatically close
                    the trade to lock in gains.
                  </span>
                </li>
                <li className="flex flex-col gap-1">
                  <span className="text-[10px] font-mono font-bold text-white uppercase">
                    Stop Loss (SL)
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500 uppercase">
                    The safety price where the agent will exit to prevent
                    further losses if the market moves against it.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border-subtle">
            <h4 className="text-xs font-mono font-bold text-emerald-cyber uppercase tracking-widest mb-4">
              03 // The &quot;Analysis&quot; Field
            </h4>
            <p className="text-[11px] font-mono text-zinc-400 uppercase leading-relaxed">
              This is the most important part for human traders. It explains{" "}
              <span className="text-white">WHY</span> the AI is making the move.
              It might mention &quot;Momentum,&quot; &quot;RSI Divergence,&quot;
              or &quot;Support Levels.&quot; Understanding the reasoning helps
              you trust the autonomous loop.
            </p>
          </div>
        </div>
      </div>

      {/* Launch Readiness Checklist */}
      <div className="space-y-6">
        <h2 className="text-lg font-mono font-bold text-white uppercase tracking-widest flex items-center gap-3">
          <FileText className="w-5 h-5 text-emerald-cyber" />
          Launch Readiness Checklist
        </h2>

        <div className="glass-panel p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-xs font-mono font-bold text-emerald-cyber uppercase tracking-widest">
                01 // Technical Requirements
              </h4>
              <ul className="space-y-2">
                {[
                  "ERC-8004 Compliance Verified",
                  "Groq AI Brain Integration Active",
                  "Real-time Market Feed Connected",
                  "Base Sepolia Contract Addresses Updated",
                  "Firestore Database Provisioned",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-[10px] font-mono text-zinc-400 uppercase tracking-tight"
                  >
                    <div className="w-1 h-1 bg-emerald-cyber" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-xs font-mono font-bold text-emerald-cyber uppercase tracking-widest">
                02 // Submission Assets
              </h4>
              <ul className="space-y-2">
                {[
                  "Pitch Deck PDF (Download from /pitch)",
                  "Brand Kit Assets (Download from /brand)",
                  "Demo Video (Autonomous Loop in /agents/:id)",
                  "GitHub Repository Link",
                  "Project Description (metadata.json)",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-[10px] font-mono text-zinc-400 uppercase tracking-tight"
                  >
                    <div className="w-1 h-1 bg-emerald-cyber" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Contract Setup Guide */}
      <div className="space-y-6">
        <h2 className="text-lg font-mono font-bold text-white uppercase tracking-widest flex items-center gap-3">
          <Zap className="w-5 h-5 text-emerald-cyber" />
          Contract Setup Guide
        </h2>

        <div className="glass-panel p-8 space-y-6">
          <p className="text-xs font-mono text-zinc-400 leading-relaxed uppercase tracking-tight">
            To connect your Forge8004 node to the live protocol, you must update
            the contract addresses in{" "}
            <code className="text-emerald-cyber">src/lib/config.ts</code>. These
            addresses are typically provided by the Surge team.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-xs font-mono font-bold text-emerald-cyber uppercase tracking-widest">
                Where to find addresses:
              </h4>
              <ul className="space-y-3">
                {[
                  {
                    label: "Surge Discord",
                    desc: "Check the #contract-addresses or #announcements channels.",
                  },
                  {
                    label: "Surge Portal",
                    desc: "Navigate to the 'Resources' or 'Developer Guide' section on the dashboard.",
                  },
                  {
                    label: "Base Explorer",
                    desc: "Search for the ERC-8004 Registry on Base Sepolia scan.",
                  },
                ].map((item) => (
                  <li key={item.label} className="space-y-1">
                    <p className="text-[10px] font-mono font-bold text-white uppercase tracking-tight">
                      {item.label}
                    </p>
                    <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-tight">
                      {item.desc}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-xs font-mono font-bold text-emerald-cyber uppercase tracking-widest">
                Configuration Path:
              </h4>
              <div className="bg-obsidian p-4 border border-border-subtle">
                <p className="text-[9px] font-mono text-zinc-500 mb-2">
                  // src/lib/config.ts
                </p>
                <p className="text-[10px] font-mono text-emerald-cyber">
                  REGISTRIES: &#123;
                </p>
                <p className="text-[10px] font-mono text-zinc-300 ml-4">
                  IDENTITY: &apos;0x...&apos;,
                </p>
                <p className="text-[10px] font-mono text-zinc-300 ml-4">
                  REPUTATION: &apos;0x...&apos;,
                </p>
                <p className="text-[10px] font-mono text-emerald-cyber">
                  &#125;
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Specs Table */}
      <div className="space-y-6">
        <h2 className="text-lg font-mono font-bold text-white uppercase tracking-widest flex items-center gap-3">
          <Database className="w-5 h-5 text-emerald-cyber" />
          Contract Registry
        </h2>

        <div className="glass-panel overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-obsidian border-b border-border-subtle">
                <th className="px-6 py-4 text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                  Registry Name
                </th>
                <th className="px-6 py-4 text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                  Standard
                </th>
                <th className="px-6 py-4 text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {[
                { name: "Identity Registry", std: "ERC-721", status: "Active" },
                {
                  name: "Reputation Registry",
                  std: "ERC-8004",
                  status: "Active",
                },
                {
                  name: "Validation Registry",
                  std: "ERC-8004",
                  status: "Active",
                },
                { name: "Treasury Vault", std: "ERC-4626", status: "Standby" },
              ].map((row) => (
                <tr
                  key={row.name}
                  className="hover:bg-zinc-deep/50 transition-colors"
                >
                  <td className="px-6 py-4 text-xs font-mono text-white uppercase tracking-wider">
                    {row.name}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-zinc-400 uppercase tracking-wider">
                    {row.std}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 border ${row.status === "Active" ? "border-emerald-cyber/30 text-emerald-cyber" : "border-zinc-700 text-zinc-600"} uppercase tracking-widest`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Note */}
      <div className="p-8 border-l-2 border-emerald-cyber bg-emerald-cyber/5">
        <p className="text-xs font-mono text-zinc-400 leading-relaxed uppercase tracking-tight italic">
          &quot;The grid is autonomous, but the protocol is immutable. Trust is
          verified, not assumed.&quot;
        </p>
      </div>
    </div>
  );
}
