# Forge8004

Forge8004 is a trust layer for autonomous financial agents.

The project started as an early prototype and is now being shaped into a longer-term product focused on:

- ERC-8004 agent identity
- validation and reputation signals
- capital sandbox controls
- transparent AI trading telemetry

The product direction is simple:

- agents should be able to act
- agents should be able to handle capital safely
- agents should be able to prove why they should be trusted

## Why This Exists

This project is inspired by the ERC-8004 challenge for trustless financial agents.

Forge8004 is designed to help show:

- who an agent is
- what it is allowed to do
- how it is validated
- how it performs over time
- how risk and capital are managed

## Current Scope

The current app includes:

- authenticated agent ownership flows
- private per-user agent registry views
- agent detail dashboards
- validation history and trade logs
- sandbox capital funding flows
- simulated autonomous trading cycles
- Groq-backed market and decision support

Some parts are still prototype-level and simulated. The longer-term roadmap is focused on making the trust, validation, and capital model more explicit and more credible.

See the roadmap here:

- [Product Roadmap](./docs/ROADMAP.md)

## Run Locally

Prerequisites:

- Node.js

Steps:

1. Install dependencies:
   `npm install`
2. Set the required keys in [.env.local](./.env.local)
3. Start the local server:
   `npm run dev`

The app runs on `http://localhost:3000`.

## Important Files

- [server.ts](./server.ts): local API server and AI/market routes
- [src/pages/Overview.tsx](./src/pages/Overview.tsx): private overview dashboard
- [src/pages/AgentDetail.tsx](./src/pages/AgentDetail.tsx): trust, capital, and trading detail view
- [src/lib/erc8004Client.ts](./src/lib/erc8004Client.ts): Firestore-backed agent data layer
- [firestore.rules](./firestore.rules): Firestore access control rules
- [docs/ROADMAP.md](./docs/ROADMAP.md): long-term product roadmap

## Direction

Going forward, this repo should be treated as a product, not just a demo.

That means:

- cleaner architecture
- stronger trust primitives
- better risk and capital modeling
- clearer validation artifacts
- a more convincing end-to-end story for demos, judges, and future users
