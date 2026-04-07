export type AgentStrategyType =
  | "range_trading"
  | "spot_grid_bot"
  | "momentum"
  | "mean_reversion"
  | "arbitrage"
  | "yield"
  | "market_making"
  | "risk_off";

export type GridSubType =
  | "spot_grid"
  | "futures_grid"
  | "futures_martingale"
  | "futures_combo";

export type AgentStatus = "active" | "deactivated";

export type AgentIdentity = {
  agentId: string; // tokenId as string
  owner: string; // authenticated operator id
  agentWallet?: string;
  name: string;
  description: string;
  avatarUrl?: string;
  strategyType: AgentStrategyType;
  gridSubType?: GridSubType;
  status?: AgentStatus;
  riskProfile: "conservative" | "balanced" | "aggressive";
  onChain?: { tokenId: number; txHash: string; chainId: number };
};

export type AgentReputation = {
  agentId: string;
  cumulativePnl: number; // in stablecoin terms
  totalFunds: number; // Current capital in treasury
  maxDrawdown: number; // percentage or absolute
  tradesCount: number;
  sharpeLikeScore: number; // simplified risk-adjusted metric
};

export type ValidationRecord = {
  id: string;
  agentId: string;
  validator: string;
  validationType: "TRADE_INTENT" | "RISK_CHECK" | "CHECKPOINT";
  score: number; // 0-100
  comment?: string;
  timestamp: number; // unix ms
};

export type AggregatedAgentView = {
  identity: AgentIdentity;
  reputation: AgentReputation;
  latestValidation?: ValidationRecord;
  validationAverageScore?: number;
};

export type TradeIntent = {
  agentId: string;
  intentId?: string;
  artifactType?:
    | "TRADE_INTENT"
    | "POSITION_CLOSE"
    | "SYSTEM_HOLD"
    | "RISK_BLOCK";
  nonce?: string;
  chainId?: number;
  side: "BUY" | "SELL" | "HOLD";
  asset: string; // e.g. 'ETH', 'BTC', 'USDC-ETH-LP'
  size: number; // position notional
  engine?: string;
  capitalAllocated?: number;
  leverage?: number;
  capitalAvailableBefore?: number;
  capitalAvailableAfter?: number;
  entryPrice?: number; // Price at time of signal
  exitPrice?: number; // Price at time of exit (TP/SL)
  stopLoss?: number;
  initialStopLoss?: number;
  currentStopLoss?: number;
  takeProfit?: number;
  trailingStopActive?: boolean;
  trailingStopActivatedAt?: number;
  profitProtected?: number;
  peakFavorablePrice?: number;
  lastReviewedAt?: number;
  orderType?: "MARKET" | "LIMIT";
  limitPrice?: number;
  expiresAt?: number;
  timestamp: number;
  status?:
    | "OPEN"
    | "CLOSED"
    | "PENDING"
    | "EXECUTED"
    | "HIT_TP"
    | "HIT_SL"
    | "CANCELLED";
  reason?: string; // Why the AI is making this trade
  validation?: { score: number; comment: string }; // Risk router validation
  riskCheck?: {
    status: "APPROVED" | "BLOCKED" | "SAFE_HOLD";
    score: number;
    comment: string;
    route: "RISK_ROUTER";
    maxAllowedNotional?: number;
    capitalUtilizationPct?: number;
  };
  signer?: {
    owner: string;
    agentWallet: string;
    mode: "OWNER_WALLET_EIP712" | "SIMULATED_EIP712";
    verification: "RECOVERED_EOA" | "EIP1271_READY";
  };
  signature?: {
    status:
      | "SIGNED_VERIFIED"
      | "SIMULATED_SIGNED"
      | "SIGNATURE_REQUIRED"
      | "NOT_REQUIRED";
    scheme: "EIP-712";
    digest: string;
    value: string;
  };
  typedIntent?: {
    primaryType: "TradeIntent";
    domain: {
      name: string;
      version: string;
      chainId: number;
      verifyingContract: string;
    };
    message: {
      intentId: string;
      agentId: string;
      agentWallet: string;
      side: "BUY" | "SELL" | "HOLD";
      asset: string;
      size: number;
      capitalAllocated: number;
      stopLoss: number;
      takeProfit: number;
      timestamp: number;
      nonce: string;
    };
  };
  policySnapshot?: {
    allocationPct: number;
    maxAllocationNotional: number;
    dailyLossLimitPct: number;
    leverageCap: number;
    maxOpenPositions: number;
    killSwitchDrawdownPct: number;
    allowedAssets: string[];
    executionMode: "SPOT_SANDBOX";
  };
  execution?: {
    status:
      | "PENDING_ROUTER"
      | "ROUTED"
      | "FILLED"
      | "REJECTED"
      | "CLOSED"
      | "NOT_EXECUTED";
    venue: "FORGE_SANDBOX";
    mode: "SPOT";
    settlement: "OPEN_POSITION" | "CLOSE_POSITION" | "NO_FILL";
    fillPrice?: number;
    realizedPnl?: number;
    rejectionReason?: string;
  };
  rawAiDecision?: {
    side: "BUY" | "SELL" | "HOLD";
    asset: string;
    reason?: string;
    score?: number;
  };
};

export type AgentCheckpoint = {
  id: string;
  agentId: string;
  intentId?: string;
  nonce?: string;
  kind: "INTENT" | "SIGNED" | "RISK" | "EXECUTION" | "VALIDATION";
  stage:
    | "INTENT_CREATED"
    | "INTENT_SIGNED"
    | "RISK_REVIEWED"
    | "EXECUTION_RECORDED"
    | "VALIDATION_RECORDED";
  status: "RECORDED" | "APPROVED" | "BLOCKED" | "PENDING" | "INFO";
  title: string;
  detail: string;
  asset?: string;
  side?: "BUY" | "SELL" | "HOLD";
  score?: number;
  capitalAllocated?: number;
  capitalAvailableAfter?: number;
  engine?: string;
  timestamp: number;
};

export type AgentRuntimeState = {
  agentId: string;
  nonceCounter: number;
  lastNonce?: string;
  lastIntentId?: string;
  sessionActive?: boolean;
  lastCycleAt?: number;
  updatedAt: number;
};

export type GridLevelState = {
  id: string;
  side: "BUY" | "SELL";
  price: number;
  status: "waiting" | "filled" | "closed";
  pairedLevelId?: string;
  quantity: number;
  quoteAllocated: number;
  lastFilledAt?: number;
  lastClosedAt?: number;
  realizedProfit?: number;
};

export type GridConfigSnapshot = {
  rangeLow: number;
  rangeHigh: number;
  gridLevels: number;
  trailingStopPct?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  timestamp: number;
  reason: string;
};

export type GridRuntimeState = {
  agentId: string;
  mode: "spot_grid_bot";
  status: "active" | "rebuilding" | "paused" | "stopped";
  asset: "BTC" | "ETH";
  referencePrice: number;
  rangeLow: number;
  rangeHigh: number;
  gridLevels: number;
  gridSpacingPct: number;
  capitalReserved: number;
  availableQuote: number;
  heldBase: number;
  filledGridLegs: number;
  cumulativeGridProfit: number;
  levels: GridLevelState[];
  lastRebuildAt: number;
  lastGridEventAt?: number;
  updatedAt: number;
  // Bybit-style enhancements
  configMode: "ai" | "manual";
  totalInvestment: number;
  previouslyWithdrawn: number;
  profitableTradesCount: number;
  totalTradesCount: number;
  trailingStopPct?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  trailingUpEnabled?: boolean;
  trailingUpStopPrice?: number;
  configHistory: GridConfigSnapshot[];
  startedAt: number;
};

export type PnLPoint = {
  timestamp: number;
  value: number;
};

export type VaultTransaction = {
  id: string;
  agentId: string;
  amount: number;
  type: "DEPOSIT" | "WITHDRAWAL" | "VAULT_FUNDING";
  status: "PENDING" | "COMPLETED" | "FAILED";
  txHash?: string;
  timestamp: number;
};

export type Asset = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  logoUrl: string;
  description: string;
  riskLevel: "low" | "medium" | "high";
};
