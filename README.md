# Forge8004

An ERC-8004 trust layer for autonomous DeFi trading agents on Base Sepolia.

Forge8004 gives AI trading agents a verifiable on-chain identity (ERC-721), runs autonomous trading cycles with real market data, validates every decision through scored risk checks and checkpoint artifacts, and tracks reputation with stablecoin-denominated PnL, Sharpe-like scoring, and max drawdown metrics — all scoped to authenticated agent operators.

---

## Live Demo

**App**: [forge8004.vercel.app](https://forge8004.vercel.app)

**Smart Contract (Base Sepolia)**:
[`0xA6f85Ad3CC0E251624F066052172e76e6edF2380`](https://sepolia.basescan.org/address/0xA6f85Ad3CC0E251624F066052172e76e6edF2380) — ERC-721 AgentRegistry (Solidity 0.8.28, OpenZeppelin v5)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js 15 App Router                    │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────────┐ │
│  │  Pages    │  │  API Routes  │  │  Server Components (SSR)  │ │
│  │ (routes)  │→ │  /api/ai/*   │→ │  Metadata, JSON-LD, SEO   │ │
│  └──────────┘  │  /api/market  │  └───────────────────────────┘ │
│                │  /api/signals │                                 │
│                └──────┬───────┘                                  │
├─────────────────────────────────────────────────────────────────┤
│                    Services Layer                                │
│  ┌────────────┐ ┌──────────────┐ ┌────────────┐ ┌───────────┐  │
│  │ aiService  │ │ gridBotSvc   │ │ onChainSvc │ │ walletSvc │  │
│  │ (Groq AI)  │ │ (Grid Bot)   │ │ (ERC-721)  │ │ (EIP6963) │  │
│  └─────┬──────┘ └──────┬───────┘ └─────┬──────┘ └─────┬─────┘  │
├────────┼───────────────┼───────────────┼───────────────┼────────┤
│        ▼               ▼               ▼               ▼        │
│  ┌──────────┐   ┌───────────┐   ┌───────────┐   ┌──────────┐   │
│  │ Groq API │   │ Binance   │   │ Base      │   │ Browser  │   │
│  │ GPT-OSS  │   │ Market    │   │ Sepolia   │   │ Wallet   │   │
│  │ 120B     │   │ Data API  │   │ (84532)   │   │ (EIP6963)│   │
│  └──────────┘   └───────────┘   └───────────┘   └──────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## What's Implemented

### On-Chain (Verified on Base Sepolia)

- **AgentRegistry** — ERC-721 contract ([source](./contracts/AgentRegistry.sol))
  - `registerAgent(to, firestoreId, name, strategyType)` → mints identity token
  - `anchorCheckpoint(tokenId, checkpointHash)` → anchors trust artifacts on-chain
  - `firestoreToToken` mapping links off-chain Firestore records to on-chain tokens
  - OpenZeppelin ERC721 + Ownable, Solidity 0.8.28

### AI Trading Engine

- **Model**: Groq `openai/gpt-oss-120b` via server-side API routes
- **8 strategy types**: `range_trading`, `spot_grid_bot`, `momentum`, `mean_reversion`, `arbitrage`, `yield`, `market_making`, `risk_off`
- **Decision normalization**: Strategy-aware side selection, asset scoring (BTC/ETH), risk-profile position sizing, stop-loss/take-profit clamping, confidence scaling
- **Grid Bot**: Spot grid trading with AI-advised range/spacing, trailing stops, config history, and Bybit-style enhancements
- **Rate limiting**: IP-based sliding window, 20 req/min on AI endpoints

### Trust & Validation Pipeline

Every trade intent goes through:

1. **AI Decision** → Groq generates side/asset/size with reasoning
2. **Normalization** → Strategy-specific rules adjust position sizing, SL/TP, asset selection
3. **Risk Check** → Scored 0–100 with approval/block status and capital utilization check
4. **EIP-712 Typed Data** → Structured intent with domain separator (ready for signature verification)
5. **Checkpoint Anchoring** → Each stage produces a checkpoint artifact (INTENT → SIGNED → RISK → EXECUTION → VALIDATION)
6. **Nonce Registry** → Sequential nonce tracking per agent (RESERVED → CONSUMED → VOID)

### Reputation Metrics (Per Agent)

| Metric            | Description                                   |
| ----------------- | --------------------------------------------- |
| `cumulativePnl`   | Stablecoin-denominated cumulative profit/loss |
| `sharpeLikeScore` | Simplified risk-adjusted return metric        |
| `maxDrawdown`     | Worst peak-to-trough decline                  |
| `tradesCount`     | Total executed trades                         |
| `totalFunds`      | Current capital in sandbox treasury           |

### Capital Sandbox

- Deposit/withdrawal tracking with vault transactions
- Policy snapshots per trade (allocation %, max notional, daily loss limit, leverage cap, kill-switch drawdown)
- Position sizing by risk profile: conservative (10%), balanced (25%), aggressive (40%)
- Minimum trade notional: $50

### Data Layer

- **Firebase/Firestore** with field-level security rules ([`firestore.rules`](./firestore.rules))
- All queries owner-scoped via `getCurrentUserId()` — users only see their own agents
- Collections: `agents`, `reputation`, `active_positions`, `pending_orders` + sub-collections for `validations`, `pnl_history`, `vault_transactions`, `intents`, `checkpoints`, `nonce_registry`, `runtime`, `ai_accuracy`
- Firebase Auth (Google sign-in + email/password)

### Market Data

- Live prices from Binance (`data-api.binance.vision`) — tickers, 24h klines
- In-memory cache with 30s TTL
- Coin detail pages with price charts

---

## Tech Stack

| Layer      | Technology                                              |
| ---------- | ------------------------------------------------------- |
| Framework  | Next.js 15 (App Router), React 19, TypeScript ~5.8      |
| Styling    | Tailwind CSS 4, Framer Motion, Recharts, Lucide React   |
| AI         | Groq SDK (`openai/gpt-oss-120b`)                        |
| Data       | Firebase/Firestore, Firebase Auth                       |
| Blockchain | Solidity 0.8.28, OpenZeppelin v5, Hardhat, Base Sepolia |
| Wallet     | EIP-6963 discovery, automatic chain switching           |
| Deployment | Vercel                                                  |

---

## Getting Started

```bash
npm install
cp .env.example .env.local
# Fill in GROQ_API_KEY and Firebase config
npm run dev
```

The app runs on [http://localhost:3000](http://localhost:3000).

## Scripts

| Command                                                    | Description                    |
| ---------------------------------------------------------- | ------------------------------ |
| `npm run dev`                                              | Next.js dev server (port 3000) |
| `npm run build`                                            | Production build               |
| `npm run start`                                            | Production server (port 3000)  |
| `npm run lint`                                             | Type check (`tsc --noEmit`)    |
| `npm run test`                                             | Run tests (`vitest --run`)     |
| `npx hardhat compile`                                      | Compile Solidity contracts     |
| `npx hardhat run scripts/deploy.cjs --network baseSepolia` | Deploy contract                |

## Environment Variables

See [`.env.example`](./.env.example) for the full list.

| Variable                        | Scope  | Required | Purpose                                                               |
| ------------------------------- | ------ | -------- | --------------------------------------------------------------------- |
| `GROQ_API_KEY`                  | Server | Yes      | AI trade cycles and market sentiment                                  |
| `APP_URL`                       | Server | No       | Production URL for SEO/sitemap                                        |
| `DEPLOYER_PRIVATE_KEY`          | Server | No       | Hardhat contract deployment                                           |
| `NEXT_PUBLIC_RPC_URL`           | Client | Yes      | Base Sepolia JSON-RPC endpoint                                        |
| `NEXT_PUBLIC_IDENTITY_REGISTRY` | Client | Yes      | AgentRegistry contract address                                        |
| `NEXT_PUBLIC_*_REGISTRY`        | Client | No       | Other contract addresses (reputation, validation, risk router, vault) |

## Project Structure

```
app/                        # Next.js App Router
├── (routes)/               # Route group — shared layout (sidebar, topbar, footer)
│   ├── page.tsx            # Landing page (server) → LandingPageClient.tsx
│   ├── agents/             # /agents, /agents/[agentId], /agents/[agentId]/trust-report
│   ├── markets/            # /markets, /markets/[coinId]
│   ├── overview/           # Authenticated dashboard
│   └── ...                 # brand, compare, contact, pitch, portfolio, etc.
├── api/                    # API route handlers
│   ├── ai/                 # trade-cycle, reassess-position, market-sentiment, grid-advisory, config
│   ├── market/             # overview, coins list, coin detail (Binance proxy + cache)
│   ├── signals/            # AI trading signals
│   └── agents/             # Agent CRUD (deprecated → 410)
├── components/             # Auth (AuthGate), layout (Sidebar, TopBar, Footer), JsonLd
├── hooks/                  # useAuthGuard, useClientValue
├── lib/                    # Server modules: firebase, erc8004Client, cache, rate-limiter, validators
└── providers/              # AuthProvider (React Context)
src/
├── views/                  # Page content components (one folder per route)
├── components/agent/       # AgentCard, AgentPnLChart, AgentStatsGrid, GridStatusPanel
├── services/               # aiService, gridBotService, onChainService, wallet, walletProviders
├── lib/                    # types.ts, config.ts, abis.ts, mockData.ts
└── utils/                  # cn(), format, aiMessage
contracts/
└── AgentRegistry.sol       # ERC-721 agent identity (deployed on Base Sepolia)
```

## Current Limitations

- Trade execution is **simulated** — intents are not routed through a real on-chain risk router
- EIP-712 typed data is structured but **signature verification is simulated** (EIP-1271 smart-wallet support planned)
- Only BTC and ETH are supported as trading assets
- Reputation metrics are computed from simulated trades, not real exchange fills

## License

All rights reserved.
