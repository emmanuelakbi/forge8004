# Forge8004 — Video Script

## Opening (10s)

"This is Forge8004 — a trust layer for autonomous AI trading agents on Base."

---

## The Problem (20s)

Right now, AI agents can trade crypto autonomously — but there's no standard way to answer basic trust questions:

- Who is this agent?
- What is it allowed to do?
- Did it follow its own rules?
- Can I verify its track record?

Most agent platforms skip this entirely. You just have to trust the operator's word.

---

## What Forge8004 Does (30s)

Forge8004 solves this by building a verifiable trust layer around every agent.

Here's how it works:

1. **Identity** — Each agent is minted as an ERC-721 token on Base Sepolia. That's its on-chain identity — linked to its operator, strategy, risk profile, and wallet.

2. **Validation** — Every trade the AI proposes goes through a risk router before capital moves. If it breaks a rule — too large, duplicate exposure, exceeds loss limits — it gets blocked. And that block is recorded as an artifact.

3. **Reputation** — Every outcome feeds back into the agent's trust profile: PnL, Sharpe ratio, max drawdown, validation scores. It's not just "did it make money" — it's "did it behave well while doing it."

---

## Live Walkthrough (2–3 min)

### Agent Registration

- Show creating a new agent — picking a strategy, risk profile, funding the treasury
- Point out the ERC-721 mint on Base Sepolia

### AI Trading Cycle

- Start an autonomous session
- Show the AI analyzing BTC/ETH market data from Binance (multi-timeframe candles, support/resistance, RSI)
- Show a trade intent being generated — with side, size, stop-loss, take-profit, and AI reasoning
- Show the risk router approving or blocking the intent

### Validation Timeline

- Walk through the checkpoint trail — intent, risk check, execution, validation score
- Show a blocked trade and explain why it was rejected

### Reputation Dashboard

- Show cumulative PnL, Sharpe score, drawdown, trade count
- Explain how this builds over time as the agent trades

### Grid Bot (Optional)

- Show the spot grid bot panel — Bybit-style layout
- AI-suggested range and spacing
- Live P&L, profit per grid, trailing stop config

### Markets & Signals

- Quick look at the live market feed (12 coins, real-time Binance data)
- Show AI trading signals — structured entries with TP levels, stop-loss, confidence score

---

## The Bigger Picture (20s)

Right now, Forge8004 runs as a sandbox with real market data and simulated execution.

The roadmap takes it to:

- Server-side trading engine (agents trade 24/7 without a browser)
- Quantitative strategy engine (technical indicators + AI as a second opinion)
- Real capital on Base Mainnet with on-chain risk enforcement
- Multi-venue execution across DEX and CEX
- Public leaderboard and copy trading

---

## Closing (10s)

"Forge8004 is building the standard for how autonomous agents earn trust in DeFi. Identity, validation, reputation — all verifiable, all on-chain."

---

## Key Talking Points (Reference)

- ERC-8004 trust protocol on Base Sepolia
- ERC-721 agent identity
- 8 strategy types (grid bot, momentum, range trading, mean reversion, arbitrage, yield, market making, risk off)
- GPT OSS 120B for AI trade decisions
- Live Binance market data (multi-timeframe)
- Pre-trade risk validation with scored artifacts
- Stablecoin-denominated reputation (PnL, Sharpe, drawdown)
- Owner-scoped — every user only sees their own agents
- Firebase Auth + Firestore for data, viem for chain interaction
- React 19 + TypeScript + Vite 6 + Tailwind CSS 4
