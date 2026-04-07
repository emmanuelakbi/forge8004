# Forge8004 — Complete Project Overview

## What Is Forge8004?

Forge8004 is a trust layer for autonomous AI trading agents operating on the Base blockchain. It answers the questions that most AI trading platforms skip:

- **Who is this agent?** — Every agent has a verifiable on-chain identity.
- **What is it allowed to do?** — Risk rules define what the agent can and cannot trade.
- **Did it follow its rules?** — Every decision is validated and recorded as a trust artifact.
- **Can I verify its track record?** — Reputation builds over time from real outcomes, not claims.

The name comes from **ERC-8004**, the trust standard the project implements. "Forge" represents the idea that trust is built — forged — through consistent, verifiable behavior.

---

## Glossary — Key Terms Explained

### Blockchain Terms

| Term                 | What It Means                                                                                                                                                               |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Blockchain**       | A shared digital ledger that records transactions. Once something is written, it can't be changed. Think of it as a permanent, public receipt book.                         |
| **Ethereum**         | The most widely used blockchain for applications (not just currency). It runs programs called "smart contracts."                                                            |
| **Base**             | A blockchain network built by Coinbase on top of Ethereum. It's faster and cheaper than Ethereum mainnet but inherits its security. Think of it as Ethereum's express lane. |
| **Sepolia**          | A test network (testnet). It works exactly like the real blockchain but uses fake money, so developers can build and test without risking real funds.                       |
| **Base Sepolia**     | The test version of Base. This is where Forge8004 currently runs.                                                                                                           |
| **Smart Contract**   | A program that lives on the blockchain. Once deployed, it runs exactly as written — no one can change the rules. Forge8004's agent registry is a smart contract.            |
| **Solidity**         | The programming language used to write smart contracts for Ethereum and Base.                                                                                               |
| **Gas**              | The small fee you pay to run operations on the blockchain. On Base, gas costs are very low (fractions of a cent).                                                           |
| **Wallet**           | Software that holds your blockchain identity (a pair of cryptographic keys). MetaMask is the most common wallet. Your wallet address is like your account number.           |
| **Transaction (tx)** | Any action on the blockchain — sending tokens, minting an NFT, calling a smart contract function. Each transaction has a unique hash (ID).                                  |

### Token Standards (ERCs and EIPs)

| Term         | What It Means                                                                                                                                                                                 |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ERC**      | "Ethereum Request for Comments" — the naming system for standards on Ethereum. Like how the web has RFCs, Ethereum has ERCs.                                                                  |
| **ERC-721**  | The standard for NFTs (non-fungible tokens). Each token is unique and has one owner. In Forge8004, every agent is an ERC-721 token — that's its unique, verifiable identity.                  |
| **ERC-8004** | The trust standard Forge8004 implements. It extends agent identity with reputation tracking, validation artifacts, and trust scoring. This is the protocol layer the project is built around. |
| **EIP**      | "Ethereum Improvement Proposal" — a broader category that includes ERCs. EIPs can propose changes to the network itself, not just token standards.                                            |
| **EIP-712**  | A standard for signing structured data. Instead of signing a raw hash, wallets can show users exactly what they're approving in a readable format. Planned for Forge8004's trade intents.     |
| **EIP-1271** | Lets smart contracts (not just wallets) verify signatures. Relevant for smart-wallet support in the future.                                                                                   |
| **EIP-6963** | The standard Forge8004 uses for wallet discovery. Instead of assuming MetaMask is the only wallet, it detects all installed wallet extensions and lets the user pick.                         |
| **NFT**      | Non-Fungible Token — a unique digital item on the blockchain. In Forge8004, each agent IS an NFT. The NFT proves the agent exists and who owns it.                                            |

### Libraries and Tools

| Term             | What It Means                                                                                                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **OpenZeppelin** | A library of audited, battle-tested smart contract code. Forge8004's contract inherits from their ERC-721 and Ownable implementations instead of writing security-critical code from scratch. |
| **Hardhat**      | The development tool for compiling, testing, and deploying Solidity smart contracts. Like Vite but for blockchain code.                                                                       |
| **viem**         | A TypeScript library for interacting with the blockchain from the frontend — reading contract data, sending transactions, connecting wallets.                                                 |
| **Groq**         | The AI inference platform Forge8004 uses. It runs the GPT OSS 120B model that makes trade decisions and analyzes markets.                                                                     |

### DeFi Terms

| Term                 | What It Means                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **DeFi**             | Decentralized Finance — financial services (trading, lending, etc.) built on blockchains instead of traditional banks.                |
| **DEX**              | Decentralized Exchange — a trading platform that runs on a smart contract. No company holds your funds. Examples: Uniswap, Aerodrome. |
| **CEX**              | Centralized Exchange — a traditional trading platform run by a company. Examples: Coinbase, Bybit, Binance.                           |
| **USDC**             | A stablecoin pegged to the US dollar. 1 USDC = $1. Used as the base currency for measuring agent performance.                         |
| **PnL**              | Profit and Loss — how much money an agent has made or lost.                                                                           |
| **Sharpe Ratio**     | A measure of risk-adjusted returns. A high Sharpe means the agent makes good returns relative to the risk it takes.                   |
| **Drawdown**         | The largest peak-to-trough decline in an agent's capital. If an agent went from $10,000 to $8,500, the max drawdown is 15%.           |
| **Stop-Loss (SL)**   | A price level where a losing trade is automatically closed to limit damage.                                                           |
| **Take-Profit (TP)** | A price level where a winning trade is automatically closed to lock in gains.                                                         |
| **Trailing Stop**    | A stop-loss that moves up as the price moves in your favor, protecting profits while letting winners run.                             |

---

## How It Works — The Full Flow

### 1. Agent Registration

An operator (you) creates an agent by defining:

- **Name** — A display name for the agent
- **Strategy** — One of 8 trading strategies (see below)
- **Risk Profile** — Conservative, balanced, or aggressive
- **Execution Wallet** — The blockchain address the agent uses

When registered, the agent is minted as an **ERC-721 token** on Base Sepolia. This creates a permanent, verifiable on-chain identity linking the agent to its operator, strategy, and wallet.

The agent also gets a Firestore record for off-chain data (trade history, reputation, checkpoints). The on-chain token ID and the Firestore record are linked together.

### 2. Capital Funding

The operator deposits test capital into the agent's treasury. This is sandbox money — not real funds — but the system treats it as real for all calculations.

Position sizing is dynamic and scales with the treasury:

- **Conservative**: 10% of total treasury per trade
- **Balanced**: 25% of total treasury per trade
- **Aggressive**: 40% of total treasury per trade

A $50,000 agent trades proportionally larger than a $10,000 agent. There's a $50 minimum floor.

### 3. AI Trade Decision

When an autonomous session is running, the AI engine (GPT OSS 120B via Groq) analyzes:

- **Live market data** from Binance — BTC and ETH prices, 24h changes, volume
- **Multi-timeframe candles** — 5-minute, 15-minute, and 1-hour OHLCV data (20 candles each)
- **Support/resistance levels** — Computed from candle highs and lows across timeframes
- **RSI (Relative Strength Index)** — Momentum indicator computed from 5-minute candle closes
- **Current positions** — What the agent already holds and unrealized PnL
- **Available capital** — How much the agent can still deploy

The AI produces a structured **trade intent** — a decision artifact containing:

- Side (BUY, SELL, or HOLD)
- Asset (BTC or ETH)
- Size (position amount)
- Stop-loss and take-profit price levels
- Order type (MARKET or LIMIT)
- Reasoning (why the AI made this decision, referencing specific indicators)
- Validation score (0–100) and comment

### 4. Risk Validation

Before any capital moves, the trade intent passes through the **risk router**:

- **Allocation cap check** — Is the trade size within the risk profile's percentage limit?
- **Daily loss limit** — Has the agent already lost too much today?
- **Duplicate exposure** — Does the agent already have a position in this asset?
- **Kill-switch threshold** — Has drawdown exceeded the emergency limit?
- **Low-conviction filter** — Entries with a validation score below 65 get tighter stop-losses (-1.5% auto-cut)

If any check fails, the trade is **blocked** and the block is recorded as a trust artifact with an explanation of which rule was violated.

### 5. Execution and Monitoring

Approved trades execute in the sandbox. The system then monitors continuously:

- **TP/SL checks every 15 seconds** — Independent of the AI cycle, using fresh Binance data
- **Trailing stops** — Move up as price moves favorably
- **Position reassessment** — A dedicated AI endpoint (`/api/ai/reassess-position`) periodically asks "should I keep or close this?" using a different prompt than the entry decision
- **Settling guard** — Prevents double or triple closes from race conditions

### 6. Checkpoint Trail

Every cycle produces a chain of **checkpoints** — structured records of what happened:

| Checkpoint          | What It Records                                       |
| ------------------- | ----------------------------------------------------- |
| INTENT_CREATED      | The AI's raw decision with reasoning                  |
| INTENT_SIGNED       | Simulated EIP-712 signature (real signing planned)    |
| RISK_REVIEWED       | Risk router verdict — approved or blocked, with score |
| EXECUTION_RECORDED  | Fill price, settlement status, venue                  |
| VALIDATION_RECORDED | Final validation score and commentary                 |

Checkpoints are grouped by **nonce** (a unique identifier per cycle with replay protection) and displayed in a searchable, paginated timeline.

### 7. Reputation Building

Every outcome feeds back into the agent's reputation profile:

- **Cumulative PnL** — Total profit/loss in stablecoin terms
- **Sharpe-like score** — Risk-adjusted performance metric
- **Max drawdown** — Worst peak-to-trough decline
- **Trade count** — Total number of executed trades
- **Validation average** — Mean score across all validation records

Reputation is persistent and tied to the agent's on-chain identity. It can't be reset or faked.

---

## The 8 Trading Strategies

| Strategy           | How It Works                                                                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Momentum**       | Follow clear directional trends. BUY when price is rising with conviction, SELL when falling. Avoid choppy or flat markets.                                    |
| **Mean Reversion** | Fade overstretched moves. BUY after sharp drops, SELL after sharp rallies. Bet that price returns to the average.                                              |
| **Range Trading**  | Trade inside bounded ranges. BUY near support, SELL near resistance. Avoid breakouts.                                                                          |
| **Spot Grid Bot**  | Place a ladder of buy and sell orders across a price range. Profits from price bouncing between levels. Bybit-style panel with AI-suggested range and spacing. |
| **Arbitrage**      | Take low-volatility scalp opportunities with very short holds and tight risk. Only act when price dislocations are clear.                                      |
| **Market Making**  | Capture spread in low-volatility conditions. Smaller positions with tight stops. Avoid directional bets.                                                       |
| **Yield**          | Accumulate patiently in calm markets. Longer holds, smaller sizes. Buy dips with DCA (dollar-cost averaging) logic.                                            |
| **Risk Off**       | Preserve capital above all. Only enter in the safest conditions. Prefer BTC. Stay in HOLD if uncertain.                                                        |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React 19)               │
│  Pages: Landing, Overview, Agent Detail, Markets,    │
│         Signals, Grid Bot, Trust Center, etc.        │
│  State: React hooks + Firestore real-time            │
│  Chain: viem + EIP-6963 wallet discovery             │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              Express Server (server.ts)              │
│  /api/ai/trade-cycle      → AI trade decisions       │
│  /api/ai/reassess-position → Position review         │
│  /api/ai/market-sentiment  → Market analysis         │
│  /api/ai/grid-advisory     → Grid bot config         │
│  /api/ai/trading-signals   → Multi-coin signals      │
│  Rate limited: 20 req/min                            │
└──────────────────────┬──────────────────────────────┘
                       │
              ┌────────┴────────┐
              ▼                 ▼
┌──────────────────┐  ┌──────────────────┐
│   Groq API       │  │   Binance API    │
│   GPT OSS 120B   │  │   Public data    │
│   AI decisions    │  │   Tickers, OHLCV │
│   & analysis      │  │   30s cache TTL  │
└──────────────────┘  └──────────────────┘

┌─────────────────────────────────────────────────────┐
│                  Data Layer                           │
│  Firebase Auth: Google sign-in + email/password      │
│  Firestore: agents, reputation, validations,         │
│    intents, checkpoints, pnl_history, nonce_registry,│
│    vault_transactions, active_positions,              │
│    pending_orders, ai_accuracy                       │
│  All queries scoped to authenticated user UID        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                  Blockchain Layer                     │
│  Network: Base Sepolia (Chain ID 84532)              │
│  Contract: AgentRegistry.sol (ERC-721 + Ownable)     │
│  Functions: registerAgent(), anchorCheckpoint()       │
│  Events: AgentRegistered, CheckpointAnchored         │
└─────────────────────────────────────────────────────┘
```

---

## The Smart Contract

The `AgentRegistry.sol` contract is an ERC-721 NFT contract on Base Sepolia. It does two things:

### 1. Register Agents

```
registerAgent(to, firestoreId, name, strategyType) → tokenId
```

Mints a new NFT representing the agent. Links the Firestore record ID to the on-chain token. Only the contract owner can call this.

### 2. Anchor Checkpoints

```
anchorCheckpoint(tokenId, checkpointHash)
```

Stores a keccak256 hash of a checkpoint batch on-chain. Only the token owner can anchor. This creates a tamper-proof record that the checkpoint data existed at a specific time.

The contract uses OpenZeppelin's audited ERC-721 and Ownable implementations — no custom security-critical code.

---

## Data Model

### Top-Level Collections (Firestore)

| Collection         | What It Stores                                                                 |
| ------------------ | ------------------------------------------------------------------------------ |
| `agents`           | Agent identity: name, strategy, risk profile, owner, wallet, on-chain metadata |
| `reputation`       | Per-agent reputation: PnL, Sharpe score, drawdown, trade count                 |
| `active_positions` | Currently open positions per agent                                             |
| `pending_orders`   | Limit orders waiting to fill                                                   |

### Per-Agent Subcollections (under `agents/{agentId}/`)

| Subcollection        | What It Stores                                                    |
| -------------------- | ----------------------------------------------------------------- |
| `validations`        | Scored validation records (0–100) with timestamps and comments    |
| `intents`            | Full trade intent artifacts with all metadata                     |
| `checkpoints`        | Checkpoint trail: intent → signed → risk → execution → validation |
| `pnl_history`        | Time-series of portfolio value for equity curve charts            |
| `vault_transactions` | Deposit and withdrawal records                                    |
| `nonce_registry`     | Nonce tracking for replay protection                              |
| `ai_accuracy`        | AI prediction accuracy records                                    |
| `runtime/state`      | Agent runtime state: nonce counter, session status                |
| `runtime/grid`       | Grid bot runtime: levels, fills, P&L, config history              |

All data is owner-scoped. Firestore security rules enforce that users can only read and write their own agent data.

---

## Key Features

### Live Market Feed (`/markets`)

12 coins with live prices from Binance, 24h stats, auto-refresh. Click any coin for a detailed view with multi-timeframe price charts, volume charts, support/resistance levels across 5 timeframes, and RSI analysis.

### AI Trading Signals (`/signals`)

The AI analyzes all 12 coins in a single Groq call every 10 minutes and generates 3–5 structured signals with entry price, multiple take-profit levels, stop-loss, risk/reward ratio, confidence score, timeframe, and reasoning.

### Grid Bot Panel

Bybit-style spot grid trading interface with:

- AI-suggested or manual range and grid configuration
- Live P&L, profit per grid, APR calculation
- Trailing stop, stop-loss, and take-profit at the bot level
- Withdraw from running grid, modify parameters
- Config history tracking

### Validation Timeline

Paginated, searchable timeline of all trust artifacts grouped by nonce and cycle. Each entry shows the checkpoint type, score, and detail — making it easy to trace any decision from intent to outcome.

### Pending / Limit Orders

The AI can propose LIMIT orders when a nearby support/resistance level would be a better entry. Pending orders reserve capital immediately, fill when the market hits the limit price, and expire after a configurable timeout. If price drifts too far, the AI re-evaluates and can cancel.

---

## Security Model

- **Authentication**: Firebase Auth (Google sign-in + email/password)
- **Authorization**: All Firestore queries scoped to `getCurrentUserId()`. Security rules enforce document ownership at the field level.
- **API protection**: Rate limiting on AI endpoints (20 requests/minute)
- **Secrets**: `GROQ_API_KEY` and `DEPLOYER_PRIVATE_KEY` are server-side only, never exposed to the client
- **Client config**: Only `VITE_*` prefixed variables reach the browser — used for RPC URLs and contract addresses, not secrets
- **Smart contract**: Uses OpenZeppelin audited libraries. Only the contract owner can register agents.
- **Data integrity**: Deep `stripUndefined` on all Firestore writes prevents silent data corruption. Unique nonces with random suffixes prevent grouping collisions.

---

## Current Limitations (Honest Boundaries)

- **Trade execution is simulated** — not routed through a real on-chain settlement contract or exchange
- **EIP-712 typed intents** are structured but signatures are simulated, not cryptographically verified
- **EIP-1271 smart-wallet verification** is planned but not implemented
- **The risk router enforces rules in application logic** — on-chain enforcement is a future goal
- **Single-user tool** — no public leaderboard or multi-user features yet
- **Browser-dependent** — trading sessions require the browser tab to be open

---

## Tech Stack Summary

| Layer             | Technology                                             |
| ----------------- | ------------------------------------------------------ |
| Frontend          | React 19, TypeScript ~5.8, Vite 6, Tailwind CSS 4      |
| Routing           | React Router v7 (client-side SPA)                      |
| Animations        | Framer Motion                                          |
| Charts            | Recharts                                               |
| Icons             | Lucide React                                           |
| Backend           | Express, Groq SDK (GPT OSS 120B)                       |
| Market Data       | Binance public API (tickers + OHLCV klines, 30s cache) |
| Database          | Firebase Auth + Firestore                              |
| Blockchain        | Solidity 0.8.28, Hardhat, OpenZeppelin v5              |
| Chain Interaction | viem                                                   |
| Wallet            | EIP-6963 multi-provider discovery                      |
| Network           | Base Sepolia (Chain ID 84532)                          |

---

## Roadmap Summary

| Phase                        | Timeline                | Goal                                                                                                 |
| ---------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------- |
| **Phase 1** — Hackathon Ship | Now → April 12, 2026    | Reliable, demo-safe product with all 8 strategies working                                            |
| **Phase 2** — Infrastructure | April–May 2026          | Replace Firebase with Postgres, server-side trading engine (agents trade 24/7 without a browser)     |
| **Phase 3** — Quant Engine   | May–July 2026           | Technical indicators + regime detection. AI becomes a second opinion, not the primary decision maker |
| **Phase 4** — Real Capital   | July–September 2026     | USDC vault on Base Mainnet, on-chain risk enforcement, DEX execution, protocol fees                  |
| **Phase 5** — Multi-Venue    | September–November 2026 | DEX + CEX trading (Bybit), futures/margin, more trading pairs                                        |
| **Phase 6** — Scale          | November 2026+          | Public leaderboard, copy trading, agent marketplace, revenue model                                   |

---

## Who Is This For?

- **Agent operators** — People managing autonomous trading strategies who need visibility and control
- **Judges and evaluators** — Anyone assessing whether an AI agent can be trusted with capital
- **Developers** — Builders working on the ERC-8004 trust primitive or integrating agent identity into their own protocols
