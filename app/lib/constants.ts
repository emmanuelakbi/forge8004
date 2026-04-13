export const AI_MODEL = "openai/gpt-oss-120b";

export const MARKET_COINS = [
  { symbol: "BTCUSDT", id: "btc", name: "Bitcoin", shortName: "BTC" },
  { symbol: "ETHUSDT", id: "eth", name: "Ethereum", shortName: "ETH" },
  { symbol: "SOLUSDT", id: "sol", name: "Solana", shortName: "SOL" },
  { symbol: "BNBUSDT", id: "bnb", name: "BNB", shortName: "BNB" },
  { symbol: "XRPUSDT", id: "xrp", name: "XRP", shortName: "XRP" },
  { symbol: "ADAUSDT", id: "ada", name: "Cardano", shortName: "ADA" },
  { symbol: "DOGEUSDT", id: "doge", name: "Dogecoin", shortName: "DOGE" },
  { symbol: "AVAXUSDT", id: "avax", name: "Avalanche", shortName: "AVAX" },
  { symbol: "DOTUSDT", id: "dot", name: "Polkadot", shortName: "DOT" },
  { symbol: "LINKUSDT", id: "link", name: "Chainlink", shortName: "LINK" },
  { symbol: "MATICUSDT", id: "matic", name: "Polygon", shortName: "MATIC" },
  { symbol: "ARBUSDT", id: "arb", name: "Arbitrum", shortName: "ARB" },
] as const;

export const STRATEGY_DESCRIPTIONS: Record<string, string> = {
  momentum:
    "Follow clear directional trends. BUY when price is rising with conviction, SELL when falling. Avoid choppy or flat markets.",
  mean_reversion:
    "Fade overstretched moves. BUY after sharp drops, SELL after sharp rallies. Avoid trending markets.",
  range_trading:
    "Trade inside bounded ranges. BUY near support, SELL near resistance. Avoid breakouts.",
  market_making:
    "Capture spread in low-volatility conditions. Prefer smaller positions with tight stops. Avoid directional bets.",
  arbitrage:
    "Take low-volatility scalp opportunities with very short holds and tight risk. Only act when dislocations are clear.",
  yield:
    "Accumulate patiently in calm markets. Prefer longer holds and smaller sizes. Avoid high-volatility entries.",
  risk_off:
    "Preserve capital above all. Only enter in the safest conditions. Prefer BTC. Stay in HOLD if uncertain.",
  spot_grid_bot:
    "Operate a grid ladder inside a bounded range. This is handled separately — return HOLD.",
};

export const RISK_PROFILE_DESCRIPTIONS: Record<string, string> = {
  conservative:
    "You are CONSERVATIVE. Prioritize capital preservation above all. Only trade when the setup is very clear and conviction is high. Use smaller position sizes (well under the cap). Set tight stop-losses (2-3% max). Prefer HOLD over marginal setups. Require strong confirmation from multiple timeframes before entering. If in doubt, stay out.",
  balanced:
    "You are BALANCED. Take trades with reasonable conviction but manage risk carefully. Use moderate position sizes (around 60-80% of the cap). Set stop-losses at 3-5%. Enter when the setup aligns with the strategy and at least one confirming signal is present. Balance opportunity with protection.",
  aggressive:
    "You are AGGRESSIVE. Maximize opportunity when setups appear. Use larger position sizes (up to the full cap). Accept wider stop-losses (5-7%) to give trades room. Enter on earlier signals without waiting for full confirmation. Favor action over caution, but still respect the strategy logic.",
};

export const NOTIONAL_GUIDE_BY_RISK = {
  conservative: 1200,
  balanced: 2500,
  aggressive: 4000,
} as const;

export const VALID_SIDES = new Set(["BUY", "SELL", "HOLD"]);
export const VALID_ASSETS = new Set(["BTC", "ETH"]);
