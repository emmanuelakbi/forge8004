# Forge8004

Forge8004 is an ERC-8004 trust layer for autonomous DeFi trading agents on Base Sepolia.

## What It Does

- Registers AI trading agents with on-chain ERC-721 identity
- Runs AI-powered autonomous trading cycles (BTC/ETH) with strategy-specific decision logic
- Validates every trade intent through risk checks, scoring, and checkpoint artifacts
- Manages sandbox capital with deposit/withdrawal tracking and exposure controls
- Provides per-user, auth-scoped dashboards for trust, reputation, and performance data

## Tech Stack

- **Framework** — Next.js 15 (App Router) with React 19 and TypeScript
- **Styling** — Tailwind CSS 4, Framer Motion, Recharts, Lucide React
- **AI** — Groq SDK (`openai/gpt-oss-120b`) for trade decisions and market sentiment
- **Data** — Firebase/Firestore (owner-scoped), Firebase Auth (Google + email/password)
- **Blockchain** — Solidity 0.8.28 (ERC-721 via OpenZeppelin), Hardhat, Base Sepolia
- **Deployment** — Vercel

## Getting Started

Prerequisites: Node.js 18+

```bash
npm install
```

Copy `.env.example` to `.env.local` and fill in the required keys:

```bash
cp .env.example .env.local
```

Then start the dev server:

```bash
npm run dev
```

The app runs on [http://localhost:3000](http://localhost:3000).

## Scripts

| Command               | Description                    |
| --------------------- | ------------------------------ |
| `npm run dev`         | Next.js dev server (port 3000) |
| `npm run build`       | Production build               |
| `npm run start`       | Production server (port 3000)  |
| `npm run lint`        | Type check (`tsc --noEmit`)    |
| `npm run test`        | Run tests (`vitest --run`)     |
| `npx hardhat compile` | Compile Solidity contracts     |

## Project Structure

```
app/                    # Next.js App Router
├── (routes)/           # Route group with shared layout
├── api/                # API route handlers (ai, market, signals, agents)
├── components/         # Auth, layout, JSON-LD components
├── hooks/              # useAuthGuard, useClientValue
├── lib/                # Server/shared modules (firebase, cache, config, etc.)
└── providers/          # AuthProvider (React Context)
src/                    # Shared source
├── views/              # Page content components (one per route)
├── components/         # Agent UI, brand components
├── services/           # Business logic (AI, market, grid bot, on-chain, wallet)
├── lib/                # Types, config, ABIs, mock data
└── utils/              # cn(), formatting, AI message helpers
contracts/              # Solidity smart contracts
```

## Environment Variables

See [`.env.example`](./.env.example) for the full list. Key variables:

- `GROQ_API_KEY` — required for AI trade cycles and sentiment (server-only)
- `APP_URL` — production URL for SEO/sitemap
- `DEPLOYER_PRIVATE_KEY` — Hardhat contract deployment (server-only)
- `NEXT_PUBLIC_*` — client-side config for RPC URL and contract addresses

## Current State

Trade execution is simulated — not routed through a real on-chain risk router. EIP-712 typed intents and EIP-1271 smart-wallet support are planned but not yet implemented.

## License

Private — all rights reserved.
