# Forge8004 — Product Roadmap

## Vision

Forge8004 is an ERC-8004 trust layer for autonomous DeFi trading agents. The goal is not just to show that an agent can trade — the goal is to prove who the agent is, what it is allowed to do, how it behaves under risk, and why it can be trusted with capital.

The strongest version of the product combines:

- Autonomous trading-agent behavior with quantitative depth
- ERC-8004 identity, reputation, and validation registries
- On-chain capital controls enforced by smart contracts
- Transparent telemetry for judges, users, and operators
- Multi-venue execution across DEX and CEX platforms

## Core Pillars

### 1. Agent Identity

Each agent has a clear on-chain and off-chain identity: ERC-8004 registration, linked wallet, operator ownership, and strategy metadata.

### 2. Capital Safety

Agents operate inside enforced controls: allocation limits, daily loss caps, kill switches, and position sizing rules — eventually enforced on-chain, not just in application logic.

### 3. Validation and Trust

Every important action produces a trust artifact: signed trade intents, risk checks, strategy checkpoints, validation scores, and audit-friendly execution history.

### 4. Reputation

Performance is measurable, explainable, and durable: stablecoin-denominated PnL, Sharpe-like scoring, drawdown tracking, and persistent reputation history.

### 5. Transparency

The interface makes trust legible: what the agent decided, why, what risk gates were applied, how much capital is active, and what changed after each cycle.

---

## Phase 1: Hackathon Ship

**Timeline:** Now → April 12, 2026
**Objective:** Make the current product reliable, consistent, and demo-safe.

### What Success Looks Like

- Every authenticated user sees only their own agents
- All 8 strategy types work without crashes or data corruption
- AI loops fail safely and display friendly errors
- Grid bot (Bybit-style) panel shows accurate real-time metrics
- Take profit and stop loss execute within 15 seconds of being hit
- Sessions survive page refreshes via auto-resume
- The product can be demoed end-to-end without hand-waving

### Priority Work

#### Strategy Fixes (All Types)

- Range Trading: side override from market conditions, TP/SL magnitude validation, no SELL entries on spot
- Spot Grid Bot: configurable price range and grid count, bot-level trailing stop / SL / TP, withdraw from running grid, modify parameters, AI-suggested range from Groq
- Momentum, Mean Reversion, Arbitrage, Yield, Market Making, Risk Off: audit each strategy's decision logic, trailing stop behavior, and reassessment thresholds

#### Progress — April 2, 2026

##### AI Trading Intelligence Overhaul

- Dedicated reassessment AI endpoint (`/api/ai/reassess-position`) — asks "should I keep or close this?" instead of reusing the entry prompt. Defaults to KEEP on error so positions aren't closed because the AI is down.
- HOLD override now respects AI conviction — low-score HOLDs (< 60 for balanced, < 70 for conservative, < 50 for aggressive) stay as HOLD instead of being forced into trades.
- Low-conviction entries (score < 65) that go against the trader get cut early at -1.5% instead of waiting for the stop-loss. High-conviction entries are trusted until the stop.
- Risk profile deeply integrated into AI prompts — conservative/balanced/aggressive each get specific behavioral instructions, not just a label.
- SELL signals in spot mode now convert to LIMIT BUY at support for range-based strategies (range_trading, mean_reversion, market_making) instead of just HOLDing.

##### Market Data Migration (CoinGecko → Binance)

- Replaced CoinGecko API with Binance public API (no key needed, no rate limit issues).
- Multi-timeframe OHLCV candle data: 5M, 15M, 1H intervals with 20 candles each.
- Support/resistance levels computed from candle highs/lows per timeframe.
- RSI computed from actual 5M candle closes instead of accumulated price snapshots.
- AI prompts now include multi-timeframe support/resistance levels and recent 5M candles.
- Cache TTL reduced from 60s to 30s for fresher data.

##### Pending / Limit Orders

- AI can return `orderType: "LIMIT"` with a `limitPrice` when a nearby support/resistance level would be a better entry.
- Pending orders reserve capital immediately, fill when market hits the limit price, and expire after 2× the strategy's maxHoldMinutes.
- Pending order reassessment: if price drifts >3% from the limit, the AI re-evaluates and can cancel the order to free capital.
- Re-validation at fill time: if position cap is full or duplicate exposure exists when the limit is hit, the order is cancelled with a proper artifact.
- Firestore persistence (`pending_orders` collection) with security rules deployed.
- UI: Pending Orders section below Active Positions showing limit price, current price, distance %, reserved capital, and expiry countdown.

##### Dynamic Trade Sizing

- Replaced hardcoded notional caps ($1200/$2500/$4000) with percentage-based allocation (10%/25%/40% of total treasury).
- Trade sizes now scale with the agent's capital — a $50k agent trades proportionally larger than a $10k agent.
- $50 minimum floor that yields to the cap for tiny accounts.
- Server-side AI prompt tells the AI both the dollar cap and the percentage context.

##### Strategy Tuning (All Types)

- Range Trading: maxHoldMinutes 45→120, holdBias 0.58→0.78, reassessmentThreshold 76→68
- Arbitrage: maxHoldMinutes 30→60, holdBias 0.40→0.55, reassessmentThreshold 80→72
- Market Making: maxHoldMinutes 30→60, holdBias 0.70→0.75, reassessmentThreshold 77→70
- Mean Reversion: holdBias 0.52→0.72, reassessmentThreshold 74→68
- Spot Grid Bot: reassessmentThreshold 82→72
- Momentum, Yield, Risk Off: unchanged (already well-tuned)

##### New Features

- Live Market Feed page (`/markets`): 12 coins with live prices, 24h stats, auto-refresh. Click any coin for detailed view with multi-timeframe price chart, volume chart, support/resistance levels across 5 timeframes, and RSI analysis.
- AI Trading Signals page (`/signals`): AI analyzes all 12 coins in a single Groq call every 10 minutes and generates 3-5 structured signals with entry, multiple take-profit levels, stop-loss, risk/reward ratio, confidence score, timeframe, and reasoning.
- Validation timeline and table now show dates alongside times.
- Multi-wallet support: EIP-6963 wallet discovery with picker modal when multiple extensions are installed. Selected wallet persists across page refreshes.

##### Bug Fixes

- Wallet `getConnectedWalletAddress` no longer calls `eth_accounts` on page load (avoids extension conflicts). Returns stored address from localStorage instead.
- Gas price fetch guarded — only runs when a wallet is connected.
- Firestore security rules deployed for `pending_orders` collection.

#### Data Integrity

- Deep `stripUndefined` on all Firestore writes (prevents silent write failures)
- Unique nonces per cycle (random suffix prevents grouping collisions)
- Position reconstruction from intents if active_positions doc is lost
- Backfill new GridRuntimeState fields for legacy data

#### Execution Reliability

- Real-time TP/SL monitor (checks every 15s on market data refresh, independent of AI cycle)
- Settling guard (`isSettlingRef`) prevents double/triple closes
- Immediate ref updates after position changes (prevents stale data in next cycle)
- System error HOLDs (failed fetch, rate limit) never get normalized into trades
- Market stability HOLDs silently skipped (no noise in validation timeline)
- Autonomous cycles always use simulated signatures (no MetaMask popups during sessions)

#### UI Polish

- GridStatusPanel: Bybit-style layout with P&L, APR, profit/grid, withdraw/modify modals
- Validation Timeline: paginated (2 per page), search, grouped by nonce
- Wallet disconnect button in TopBar with MetaMask permission revocation
- Wallet state synced between TopBar and agent detail via event listener
- Full Groq sentiment display (no line-clamp truncation)
- Overview and AgentDetail: useMemo hooks before early returns (Rules of Hooks)
- Error states with reload buttons on Overview and AgentsList
- Avatar fallback to DiceBear on broken URLs

#### Infrastructure

- Firestore security rules updated for new grid fields, `stopped` status, withdrawal transactions
- GPT OSS 120B model (upgraded from Llama 3.3 70B) for better trade decision quality
- Market data polling at 15s intervals (balance between performance and TP/SL responsiveness)

### Current Tech Stack

- Frontend: React 19, TypeScript, Vite 6, Tailwind CSS 4
- Backend: Express server with Groq SDK (GPT OSS 120B)
- Market Data: Binance public API (24hr tickers, multi-timeframe OHLCV klines)
- Data: Firebase Auth + Firestore
- Blockchain: Solidity 0.8.28, ERC-721 on Base Sepolia, Hardhat
- Client chain interaction: viem
- Wallet: EIP-6963 multi-provider discovery + legacy window.ethereum fallback

---

## Phase 2: Infrastructure Migration

**Timeline:** Post-hackathon (April–May 2026)
**Objective:** Replace Firebase with InsForge, move trading engine to server-side.

### What Success Looks Like

- All data lives in Postgres (relational, queryable, no more undefined crashes)
- Trading engine runs as server-side edge functions on a schedule
- Agents trade 24/7 without a browser tab open
- Users can close the browser and come back to see results
- Self-hosted on VPS via Docker

### Priority Work

#### Database Migration (Firebase → InsForge Postgres)

- Design relational schema: agents, reputation, intents, checkpoints, validations, positions, vault_transactions, grid_runtime, nonce_registry, pnl_history, ai_accuracy
- Migrate `erc8004Client.ts` from Firestore SDK to InsForge REST/SQL API calls
- Replace Firestore security rules with Postgres row-level security (RLS) policies
- Migrate existing user data from Firestore to Postgres
- Add proper indexes for common queries (agent by owner, intents by timestamp, leaderboard ranking)

#### Auth Migration

- Evaluate: keep Firebase Auth alongside InsForge, or migrate to InsForge built-in auth
- If keeping Firebase Auth: bridge Firebase UID to InsForge user records
- If migrating: implement Google OAuth + email/password via InsForge auth

#### Server-Side Trading Engine

- Extract trading logic from `useAgentDetail.ts` into standalone service modules
- Create InsForge edge functions for:
  - `runTradeCycle(agentId)` — AI decision, position management, trailing stops
  - `runGridCycle(agentId)` — grid bot evaluation, level fills, rebuilds
  - `checkTPSL(agentId)` — real-time TP/SL monitoring
  - `fetchMarketData()` — centralized market data with caching
- Schedule functions via InsForge cron: trade cycles every 2-15 min (per strategy cadence), TP/SL checks every 15s
- Agent sessions persist in database, not in React state
- Remove browser-side `setInterval` trading loop

#### Real-Time Updates

- Use InsForge pub/sub to push position updates, trade fills, and checkpoint events to the frontend
- Replace polling with WebSocket subscriptions for live data
- Frontend becomes read-only display + controls (start/stop session, modify grid, withdraw)

#### AI Model Gateway

- Evaluate InsForge's built-in AI model gateway (OpenRouter-compatible) as replacement for direct Groq integration
- If viable: route AI calls through InsForge gateway for unified billing and model switching
- If not: keep direct Groq/OpenRouter calls from edge functions

### Infrastructure

- Self-host InsForge on VPS via Docker
- Set up Postgres backups and monitoring
- Configure edge function deployment pipeline

---

## Phase 3: Quantitative Engine

**Timeline:** May–July 2026
**Objective:** Replace AI-only decisions with a hybrid quantitative + AI system.

### What Success Looks Like

- Each strategy has rule-based entry/exit logic backed by technical indicators
- Market regime is automatically detected and strategies adapt accordingly
- Backtesting validates strategy performance on historical data
- Signal quality is measurably better than AI-only decisions
- The system is understandable, disciplined, risk-controlled, reviewable, and consistent

### Priority Work

#### Feature Pipeline

- Compute 15+ technical features from OHLCV data:
  - Moving averages: SMA(20), SMA(50), EMA(12), EMA(26)
  - Volatility: Bollinger Bands, ATR(14), standard deviation
  - Momentum: RSI(14), MACD, Stochastic RSI, ROC
  - Volume: OBV, VWAP, volume profile, volume change ratio
  - Orderbook: bid-ask spread, depth imbalance (when available)
- Feature normalization per asset (BTC vs ETH have different scales)
- Feature caching (60s TTL) to reduce redundant calculations
- Feature schema validation before inference

#### Regime Detection

- Classify market into 5 regimes: trending_up, trending_down, ranging, high_volatility, low_volatility
- Use feature pipeline outputs as inputs to regime classifier
- Start with rule-based regime detection (volatility thresholds, trend slope, range detection)
- Later: train lightweight ML model (scikit-learn/XGBoost, CPU-only, sub-500ms inference)
- Auto-adjust strategy behavior based on detected regime:
  - Range Trading: only active in `ranging` or `low_volatility` regimes
  - Momentum: only active in `trending_up` or `trending_down` regimes
  - Grid Bot: only active in `ranging` regime, auto-pause in `high_volatility`
  - Risk Off: activates in `high_volatility`, reduces exposure in `trending_down`

#### Strategy Quantification

- Momentum: entry on EMA crossover + volume confirmation, exit on MACD divergence or trailing stop
- Mean Reversion: entry on Bollinger Band touch + RSI extreme, exit on mean reversion to SMA(20)
- Range Trading: detect support/resistance from recent price action, entry near boundaries, exit at opposite boundary
- Spot Grid Bot: true ladder math with arithmetic/geometric spacing, profit-per-grid calculation from actual fills
- Arbitrage: tighter entry conditions based on spread deviation from mean
- Market Making: spread capture with inventory management
- Risk Off: reduce position sizes proportionally to volatility increase
- Yield: accumulate on dips with DCA logic, longer hold periods

#### Signal Scoring and Confidence

- Each strategy produces a confidence score (0.0–1.0) based on feature alignment
- Confidence scales position size (high confidence = larger position, low = smaller or skip)
- Signal scoring replaces the current `validationScore` from Groq as the primary sizing input
- AI (Groq) becomes a second opinion / external validator, not the primary decision maker

#### Backtesting

- Use same inference pipeline as live trading (no look-ahead bias)
- Process historical OHLCV data in strict chronological order
- Generate performance reports: win rate, Sharpe ratio, max drawdown, profit factor
- Compare strategy variants (e.g., RSI threshold 30 vs 25 for mean reversion)
- Point-in-time model loading for historical regime detection accuracy

#### Model Registry (if ML is added)

- Versioned model artifacts with training metadata
- Feature schema compatibility validation on load
- Deterministic inference (fixed random seeds)
- CPU-only models (scikit-learn, XGBoost, LightGBM) — no GPU dependency
- RAM budget: <512MB per loaded model

---

## Phase 4: Real Capital & On-Chain Enforcement

**Timeline:** July–September 2026
**Objective:** Move from sandbox simulation to real capital with trustless on-chain controls.

### What Success Looks Like

- Users deposit real USDC into a smart contract vault
- Risk router rules are enforced by the contract, not just application logic
- The agent literally cannot overspend because the contract won't allow it
- Protocol earns fees on every trade execution
- Gas costs are under $0.50/month per user on Base Mainnet

### Priority Work

#### Capital Vault Contract (Solidity)

- Deploy on Base Mainnet (chain ID 8453)
- User deposits USDC into vault via MetaMask approval + deposit transaction
- Per-agent allocation limits (e.g., agent can only use 20% of vault)
- Daily withdrawal limits enforced on-chain
- Kill switch — owner can freeze the vault at any time
- Only whitelisted agent wallets can request funds
- Proceeds from closed trades flow back to vault automatically
- PnL tracked on-chain, not just in database

#### Trade Execution via DEX

- Integrate Uniswap V3 or Aerodrome on Base for spot swaps
- Agent requests capital release from vault → vault approves → USDC swaps to ETH/cbBTC on DEX
- Slippage protection with configurable max slippage per trade
- Trade receipts (tx hash, fill price, gas used) stored as trust artifacts

#### Protocol Fees

- Smart contract takes 0.05–0.1% of trade notional on each settlement
- Fee sent to Forge8004 treasury wallet automatically
- Fee structure, treasury address, and fee history all on-chain and auditable
- Fee displayed in UI before trade confirmation

#### Wallet-Based Auth

- User connects MetaMask → wallet address is their identity
- No email signup needed for Live Mode
- Demo Mode (current Firebase auth) still available for exploration
- Existing agents can be "upgraded" to on-chain by minting retroactively

#### Contract Architecture

- `AgentRegistry.sol` — ERC-721 agent identity (already deployed on Sepolia)
- `CapitalVault.sol` — USDC deposits, allocations, withdrawals, kill switch
- `RiskRouter.sol` — on-chain risk policy enforcement (allocation %, daily loss, leverage cap)
- `FeeCollector.sol` — protocol fee collection and treasury management

#### Migration Path

- Deploy contracts to Base Mainnet
- Update `config.ts` with mainnet contract addresses and chain ID 8453
- Replace simulated balance with real USDC vault balance
- Replace simulated trade execution with actual DEX swaps
- Keep sandbox mode available for testing (Base Sepolia)

### Gas Cost Estimates (Base Mainnet)

| Action                          | When                  | Estimated Cost |
| ------------------------------- | --------------------- | -------------- |
| Register agent (mint ERC-721)   | Once per agent        | ~$0.01–0.05    |
| Anchor checkpoint hash          | Once per session stop | ~$0.005–0.02   |
| Deposit capital to vault        | Once when funding     | ~$0.01–0.03    |
| Withdraw capital from vault     | When user withdraws   | ~$0.01–0.03    |
| Individual trades               | Never (off-chain)     | $0.00          |
| **Monthly total (active user)** |                       | **< $0.50**    |

---

## Phase 5: Multi-Venue & Advanced Trading

**Timeline:** September–November 2026
**Objective:** Support multiple exchanges and advanced trading modes.

### What Success Looks Like

- Agents can trade on DEX (Uniswap on Base) and CEX (Bybit) from the same interface
- Futures/margin mode enables short selling with leverage
- More trading pairs beyond BTC and ETH
- Grid bot supports trailing up (Bybit-style)
- The trust layer works identically regardless of venue

### Priority Work

#### CEX Integration (Bybit)

- Adapter pattern from RegimeForge: client layer → service layer → adapter layer
- Secure API credential management (encrypted storage, rotation support)
- Rate limiting per exchange API limits
- Order types: market, limit, stop-market, stop-limit
- WebSocket for real-time order fills and position updates
- Reconciliation between off-chain records and exchange state

#### Futures/Margin Mode

- SELL (short) entries enabled for futures venues
- Leverage configuration per agent (1x–10x, capped by risk profile)
- Margin requirements tracked and enforced
- Liquidation price monitoring with early warning
- Funding rate tracking for perpetual contracts
- Cross-margin vs isolated margin support

#### Expanded Asset Coverage

- Base Mainnet: cbBTC/USDC, ETH/USDC, AERO/USDC, DEGEN/USDC
- Bybit: BTCUSDT, ETHUSDT, and top-20 altcoins by volume
- Asset whitelisting per agent (configurable in risk policy)
- Per-asset risk parameters (different allocation limits for BTC vs altcoins)

#### Grid Bot Enhancements

- Trailing up: shift grid range upward as price rises (Bybit-style)
- Geometric grid spacing (equal percentage between levels, better for volatile assets)
- AI Strategy vs Manual toggle with backtested stats (Grid Profit Ratio, Drawdown Ratio, Volatility Ratio)
- Confirmation summary before grid creation
- Copy grid configuration from another agent

#### Advanced Order Types

- Limit orders with time-in-force (GTC, IOC, FOK)
- Trailing stop orders (exchange-native, not simulated)
- OCO (one-cancels-other) for TP/SL pairs
- Iceberg orders for large positions

#### Venue Abstraction

- Unified `TradeVenue` interface that works for both DEX and CEX
- Agent configuration specifies venue preference
- Trust artifacts include venue metadata (which exchange, which pool)
- Same risk router logic applies regardless of venue

#### CEX Revenue Model

- Register as a broker/affiliate with Bybit (and other CEXs) to earn a percentage of trading fees the exchange collects from users trading through Forge8004 — zero extra cost to the user
- Protocol fee on CEX trades: deduct 0.05–0.1% of trade notional from the user's Forge8004 vault balance before executing the trade on the exchange — fee stays in Forge8004 treasury
- Both revenue streams stack: broker commission from the exchange + protocol fee from Forge8004
- Fee transparency: every trade artifact shows the protocol fee amount, and the broker commission is invisible to the user (paid by the exchange to Forge8004)
- This is the standard model used by 3Commas, Pionex, and other trading bot platforms

---

## Phase 6: Scale & Monetize

**Timeline:** November 2026 → ongoing
**Objective:** Move from single-user tool to multi-user platform with revenue.

### What Success Looks Like

- Public leaderboard ranks agents across all users by trust score
- Users can copy top-performing agent configurations
- Protocol generates sustainable revenue from trading fees
- Demo mode provides frictionless onboarding, Live mode handles real capital
- The platform is self-sustaining

### Priority Work

#### Public Leaderboard

- Cross-user agent ranking by trust score, Sharpe ratio, PnL, and validation quality
- SQL query on InsForge Postgres: `SELECT * FROM agents JOIN reputation ORDER BY trust_score DESC`
- Anonymized by default (show agent name + strategy, not owner identity)
- Opt-in public profiles for operators who want visibility
- Time-filtered views: 24h, 7d, 30d, all-time

#### Copy Trading

- "Follow this agent" button on leaderboard entries
- Creates a new agent with the same strategy, risk profile, and parameters
- Follower's agent trades independently using their own capital allocation
- Original agent operator earns a small performance fee (e.g., 10% of follower profits)
- Trust artifacts show "copied from Agent X" for transparency

#### Demo Mode vs Live Mode UX

- New user signs up → Demo mode (full features, sandbox capital, no wallet)
- "Go On-Chain" button when ready → connect MetaMask → agents get minted → real capital
- Demo experience feels complete, not crippled
- Clear visual indicator showing which mode the user is in
- Existing demo agents can be upgraded to on-chain retroactively

#### Profit Distribution

- Model A (Vault-based): profits stay in vault, user withdraws whenever (~$0.02 gas)
- Model B (Auto-sweep): smart contract sends profits to user wallet on schedule (daily/weekly)
- Protocol fee revenue tracked and reported transparently
- Treasury management: fee allocation to development, operations, reserves

#### Agent Marketplace

- Operators publish agent configurations as templates
- Users browse and deploy pre-configured agents
- Rating system based on historical performance
- Revenue share between template creator and platform

#### Analytics & Reporting

- SQL-powered analytics dashboard (InsForge Postgres)
- Per-agent performance reports: equity curve, trade log, risk metrics
- Cross-agent comparison tools
- Export to CSV/PDF for external analysis
- API access for programmatic data retrieval

#### Admin Dashboard & Role-Based Access

- Super Admin (founder): full platform access, create/manage other admin roles, treasury withdrawals, contract management, kill switch control
- Operations Admin: monitor all users' agents, freeze/unfreeze accounts, handle support escalations, view cross-platform metrics — cannot touch treasury or contracts
- Finance Admin: view protocol fee revenue, treasury balance, broker commission reports, payout history — read-only on user data
- Support Admin: scoped read-only access to a specific user's agent data when investigating reported issues
- Admin dashboard features: platform-wide agent monitoring, revenue tracking, user management, vault kill switch, CEX broker key management, system health metrics
- Role management: Super Admin creates roles, assigns permissions, revokes access — all actions logged for audit
- Implementation: Postgres `roles` and `permissions` tables with row-level security on InsForge, separate `/admin` route in the frontend with role-gated views

---

## Delivery Principles

- Prefer believable behavior over flashy but inconsistent simulation
- Every critical financial action should be explainable
- Every user-facing metric should have a clear source of truth
- Build the UI around trust evidence, not only aesthetics
- The system should be understandable, disciplined, risk-controlled, reviewable, and consistent
- Keep AI + rules for now, gradually turn each strategy into a more quantitative engine
- On-chain enforcement is the end goal — application logic is the prototype

## Architecture Evolution

```
Phase 1 (Now):
  Browser → Express Server → Groq API
  Browser → Firebase Auth + Firestore
  Browser → Base Sepolia (ERC-721 only)

Phase 2 (InsForge):
  Frontend → InsForge API → Postgres
  InsForge Edge Functions → Groq/OpenRouter
  InsForge Edge Functions → Postgres
  Frontend ← InsForge Pub/Sub (real-time)

Phase 3 (Quant):
  Edge Functions → Feature Pipeline → Regime Detector → Strategy Engine → Trade Decision
  Groq/AI becomes external validator, not primary decision maker

Phase 4 (On-Chain):
  Edge Functions → Capital Vault Contract → DEX Router → On-Chain Settlement
  Risk Router Contract enforces limits trustlessly
  Fee Collector Contract captures protocol revenue

Phase 5 (Multi-Venue):
  Edge Functions → Venue Adapter (DEX or CEX) → Execution
  Same trust layer regardless of venue

Phase 6 (Scale):
  Public leaderboard, copy trading, marketplace
  Revenue from protocol fees + performance fees + marketplace fees
```
