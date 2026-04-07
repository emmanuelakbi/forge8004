import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AggregatedAgentView,
  ValidationRecord,
  TradeIntent,
  PnLPoint,
  VaultTransaction,
  AgentCheckpoint,
  AgentRuntimeState,
  AgentReputation,
  GridRuntimeState,
} from "../../lib/types";
import { erc8004Client } from "../../data/erc8004Client";
import { subscribeToAuthState, User } from "../../data/firebase";
import { marketService, MarketData } from "../../services/marketService";
import { aiService } from "../../services/aiService";
import { groqService } from "../../services/groqService";
import { CONFIG } from "../../lib/config";
import {
  buildTrustTimeline,
  calculateDrawdownPct,
  calculateSharpeLikeScore,
  calculateTradePnl,
  createCheckpointsForIntent,
  createIntentEnvelope,
  createIntentId,
  createIntentNonce,
  createSignedIntentMetadata,
  evaluateAiAccuracy,
  getAgentExecutionWallet,
  getAllTimeNetRealizedPnl,
  getAllTimeRealizedLoss,
  getAllTimeRealizedProfit,
  getCommittedCapital,
  getCurrentStopLoss,
  getDailyRealizedLoss,
  getDailyRealizedProfit,
  getExecutionProfile,
  getProfitProtectedAmount,
  getRiskPolicy,
  getRiskRouterDecision,
  getStrategyBehavior,
  getTrailingDistancePct,
  getTrailingStopFloor,
  getUnrealizedPnlPct,
  parseIntentNonceCounter,
  TRAILING_PROFIT_TRIGGER_PCT,
  TrustTimelineEvent,
} from "../../services/trustArtifacts";
import {
  getConnectedWalletAddress,
  signTradeIntentWithAvailableWallet,
  disconnectWallet,
  onWalletChange,
} from "../../services/wallet";
import {
  mapIntentToValidationType,
  deriveValidationRecordsFromIntents,
  formatMinutesLabel,
  SENTIMENT_REFRESH_INTERVAL_MS,
} from "./utils";
import {
  createSpotGridRuntime,
  deriveGridActivePositions,
  evaluateSpotGridRuntime,
  modifySpotGrid,
  withdrawFromGrid,
  getMaxWithdrawable,
  getGridEquity,
  getGridPnL,
  getGridPnLPct,
  getGridAPR,
  getTotalAPR,
  getProfitPerGrid,
  getGridPriceForAsset,
  performInitialMarketBuy,
  type ModifyGridParams,
} from "../../services/gridBotService";
import { onChainService } from "../../services/onChainService";
import { externalValidate } from "../../services/externalValidator";

export function useAgentDetail() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<AggregatedAgentView | null>(null);
  const [validations, setValidations] = useState<ValidationRecord[]>([]);
  const [pnlData, setPnlData] = useState<PnLPoint[]>([]);
  const [vaultTransactions, setVaultTransactions] = useState<
    VaultTransaction[]
  >([]);
  const [checkpoints, setCheckpoints] = useState<AgentCheckpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadNotice, setLoadNotice] = useState<string | null>(null);
  const [isFunding, setIsFunding] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [intents, setIntents] = useState<TradeIntent[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<number | null>(null);
  const [hasGroqKey, setHasGroqKey] = useState<boolean>(false);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [simulatedBalance, setSimulatedBalance] = useState<number>(0);
  const [activePositions, setActivePositions] = useState<TradeIntent[]>([]);
  const [pendingOrders, setPendingOrders] = useState<TradeIntent[]>([]);
  const [totalRealizedPnL, setTotalRealizedPnL] = useState<number>(0);
  const [runtimeState, setRuntimeState] = useState<AgentRuntimeState | null>(
    null,
  );
  const [gridRuntime, setGridRuntime] = useState<GridRuntimeState | null>(null);
  const [countdownNow, setCountdownNow] = useState(() => Date.now());
  const [isScanning, setIsScanning] = useState(false);
  const [quotaStatus, setQuotaStatus] = useState(aiService.getQuotaStatus());
  const [marketSentiment, setMarketSentiment] = useState<string>(
    "Waiting for the first live sentiment snapshot.",
  );
  const [marketSentimentState, setMarketSentimentState] = useState<
    "idle" | "loading" | "live" | "limited"
  >("idle");
  const [marketSentimentUpdatedAt, setMarketSentimentUpdatedAt] = useState<
    number | null
  >(null);
  const [deferredDataReady, setDeferredDataReady] = useState(false);

  const activePositionsRef = useRef(activePositions);
  const pendingOrdersRef = useRef(pendingOrders);
  const intentsRef = useRef(intents);
  const balanceRef = useRef(simulatedBalance);
  const agentRef = useRef(agent);
  const pnlDataRef = useRef(pnlData);
  const gridRuntimeRef = useRef(gridRuntime);
  const lastSentimentRequestAtRef = useRef(0);
  const lastSentimentRequestIdRef = useRef(0);
  const loopRef = useRef<NodeJS.Timeout | null>(null);
  const autoReviewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSettlingRef = useRef(false);

  useEffect(() => {
    activePositionsRef.current = activePositions;
  }, [activePositions]);
  useEffect(() => {
    pendingOrdersRef.current = pendingOrders;
  }, [pendingOrders]);
  useEffect(() => {
    intentsRef.current = intents;
  }, [intents]);
  useEffect(() => {
    balanceRef.current = simulatedBalance;
  }, [simulatedBalance]);
  useEffect(() => {
    agentRef.current = agent;
  }, [agent]);
  useEffect(() => {
    pnlDataRef.current = pnlData;
  }, [pnlData]);
  useEffect(() => {
    gridRuntimeRef.current = gridRuntime;
  }, [gridRuntime]);
  useEffect(() => {
    const interval = setInterval(() => setCountdownNow(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    return () => {
      if (loopRef.current) {
        clearInterval(loopRef.current);
        loopRef.current = null;
      }
      if (autoReviewTimeoutRef.current)
        clearTimeout(autoReviewTimeoutRef.current);
    };
  }, []);
  useEffect(() => {
    const unsubscribe = subscribeToAuthState((currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);
  useEffect(() => {
    getConnectedWalletAddress()
      .then((addr) => {
        if (addr) setWalletAddress(addr);
      })
      .catch(() => {
        /* keep existing wallet state on error */
      });
    // Listen for wallet changes from the TopBar disconnect/connect
    const unsubscribeWallet = onWalletChange((address) => {
      setWalletAddress(address);
    });
    return () => unsubscribeWallet();
  }, []);
  useEffect(() => {
    const fetchMarket = async () => {
      try {
        const data = await marketService.getLatestPrices();
        setMarketData(data);
      } catch (err) {
        console.error("Market refresh failed:", err);
      }
    };
    fetchMarket();
    const interval = setInterval(fetchMarket, 15000);
    return () => clearInterval(interval);
  }, []);

  const appendCheckpoints = (nextCheckpoints: AgentCheckpoint[]) => {
    if (nextCheckpoints.length === 0) return;
    setCheckpoints((prev) =>
      [...nextCheckpoints, ...prev].sort(
        (left, right) => right.timestamp - left.timestamp,
      ),
    );
  };

  const syncRuntimeState = (patch: Partial<AgentRuntimeState>) => {
    if (!agentId) return;
    setRuntimeState((prev) => ({
      agentId,
      nonceCounter: prev?.nonceCounter || 0,
      ...prev,
      ...patch,
      updatedAt: Date.now(),
    }));
    if (user) {
      // Always include required fields so the first write (create) passes Firestore rules
      const currentRuntime = runtimeState;
      void erc8004Client.updateRuntimeState(agentId, {
        agentId,
        nonceCounter: currentRuntime?.nonceCounter || 0,
        ...patch,
      });
    }
  };

  const syncRuntimeWithNonce = (nonce: string, intentId?: string) => {
    if (!agentId) return;
    const parsedCounter = parseIntentNonceCounter(nonce);
    setRuntimeState((prev) => ({
      agentId,
      nonceCounter: parsedCounter ?? Math.max(0, prev?.nonceCounter || 0),
      sessionActive: prev?.sessionActive,
      lastCycleAt: prev?.lastCycleAt,
      lastNonce: nonce,
      lastIntentId: intentId || prev?.lastIntentId,
      updatedAt: Date.now(),
    }));
  };

  const syncGridRuntimeState = (nextRuntime: GridRuntimeState | null) => {
    setGridRuntime(nextRuntime);
    if (agentId && user && nextRuntime) {
      void erc8004Client.updateGridRuntimeState(agentId, nextRuntime);
    }
  };

  const stopSessionLoop = (persist = true) => {
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
    setIsRunning(false);
    if (persist) {
      syncRuntimeState({ sessionActive: false });
      // Anchor checkpoint hash on-chain if available
      void anchorCheckpointsOnChain();
    }
  };

  const anchorCheckpointsOnChain = async () => {
    try {
      if (!onChainService.isAvailable() || !agentId) return;
      const currentAgent = agentRef.current;
      const tokenId = currentAgent?.identity?.onChain?.tokenId;
      if (!tokenId) {
        // Try to look up by firestoreId
        const lookedUp = await onChainService.getTokenIdForAgent(agentId);
        if (!lookedUp) return;
        await anchorWithTokenId(lookedUp);
      } else {
        await anchorWithTokenId(tokenId);
      }
    } catch (err) {
      console.warn("[OnChain] Checkpoint anchor skipped:", err);
    }
  };

  const anchorWithTokenId = async (tokenId: number) => {
    const currentIntents = intentsRef.current;
    if (currentIntents.length === 0) return;
    // Hash the last 20 intents as a batch
    const batch = currentIntents
      .slice(0, 20)
      .map((i) => `${i.intentId}:${i.side}:${i.asset}:${i.timestamp}`)
      .join("|");
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(batch),
    );
    const hashHex =
      "0x" +
      Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    const result = await onChainService.anchorCheckpoint(tokenId, hashHex);
    if (result) {
      console.log(`[OnChain] Checkpoint anchored: ${result.txHash}`);
    }
  };

  const startSessionLoop = (runImmediately = true) => {
    if (!agent) return;
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }

    const executionProfile = getExecutionProfile(agent.identity.strategyType);
    setIsRunning(true);
    syncRuntimeState({ sessionActive: true });

    if (runImmediately) {
      void runAutonomousCycle();
    }

    loopRef.current = setInterval(() => {
      void runAutonomousCycle();
    }, executionProfile.decisionCadenceMinutes * 60_000);
  };

  const reserveIntentNonceForCycle = async (fallbackTimestamp: number) => {
    if (!agentId || !user) {
      return createIntentNonce(fallbackTimestamp);
    }
    const nonce = await erc8004Client.reserveIntentNonce(agentId);
    syncRuntimeWithNonce(nonce);
    return nonce;
  };

  const persistIntentArtifact = async (intent: TradeIntent) => {
    const nextCheckpoints = createCheckpointsForIntent(intent);
    const nextValidation = intent.validation
      ? ({
          agentId: intent.agentId,
          validator:
            `${intent.engine || "forge"}_${intent.asset || "system"}`.toUpperCase(),
          validationType: mapIntentToValidationType(intent),
          score: intent.validation.score,
          comment: intent.validation.comment,
          timestamp: intent.timestamp + 3,
        } satisfies Omit<ValidationRecord, "id">)
      : null;

    setIntents((prev) =>
      [intent, ...prev].sort((left, right) => right.timestamp - left.timestamp),
    );
    appendCheckpoints(nextCheckpoints);
    if (nextValidation) {
      const localValidationId = `local_${intent.intentId || `${intent.agentId}_${intent.timestamp}`}`;
      setValidations((prev) => {
        if (prev.some((entry) => entry.id === localValidationId)) return prev;
        return [{ id: localValidationId, ...nextValidation }, ...prev].sort(
          (left, right) => right.timestamp - left.timestamp,
        );
      });
    }
    if (intent.nonce) syncRuntimeWithNonce(intent.nonce, intent.intentId);
    if (user) {
      await erc8004Client.persistIntentBundle(
        intent,
        nextCheckpoints,
        nextValidation || undefined,
      );
    }
  };

  const persistSystemHoldArtifact = async ({
    timestamp,
    engine,
    asset,
    reason,
    validation,
    riskComment,
    capitalBefore,
    capitalAfter,
    policy,
    score,
    deployedCapitalNow,
    totalTreasuryForUtilization,
  }: {
    timestamp: number;
    engine: string;
    asset: string;
    reason: string;
    validation: { score: number; comment: string };
    riskComment: string;
    capitalBefore: number;
    capitalAfter: number;
    policy: ReturnType<typeof getRiskPolicy>;
    score: number;
    deployedCapitalNow: number;
    totalTreasuryForUtilization: number;
  }) => {
    const currentIdentity = agentRef.current?.identity || agent?.identity;
    if (!currentIdentity || !agentId) return;
    const nonce = await reserveIntentNonceForCycle(timestamp);
    const holdBase: TradeIntent = {
      intentId: createIntentId(agentId, timestamp),
      agentId,
      artifactType: "SYSTEM_HOLD",
      nonce,
      chainId: CONFIG.CHAIN_ID,
      side: "HOLD",
      asset,
      size: 0,
      engine,
      capitalAllocated: 0,
      leverage: 1,
      capitalAvailableBefore: capitalBefore,
      capitalAvailableAfter: capitalAfter,
      timestamp,
      status: "CANCELLED",
      reason,
      validation,
      riskCheck: {
        status: "SAFE_HOLD",
        score,
        comment: riskComment,
        route: "RISK_ROUTER",
        maxAllowedNotional: Math.min(
          capitalAfter,
          policy.maxAllocationNotional,
        ),
        capitalUtilizationPct:
          totalTreasuryForUtilization > 0
            ? (deployedCapitalNow / totalTreasuryForUtilization) * 100
            : 0,
      },
      policySnapshot: policy,
      execution: {
        status: "NOT_EXECUTED",
        venue: "FORGE_SANDBOX",
        mode: "SPOT",
        settlement: "NO_FILL",
      },
    };
    const holdIntent: TradeIntent = {
      ...holdBase,
      ...createIntentEnvelope(currentIdentity, holdBase),
      signature: {
        status: "NOT_REQUIRED",
        scheme: "EIP-712",
        digest: `0x${"0".repeat(64)}`,
        value: `0x${"0".repeat(130)}`,
      },
    };
    await persistIntentArtifact(holdIntent);
  };

  const persistReputationMetrics = async ({
    realizedPnl,
    timestamp,
    tradeCountDelta = 0,
  }: {
    realizedPnl: number;
    timestamp: number;
    tradeCountDelta?: number;
  }) => {
    const currentAgent = agentRef.current;
    if (!currentAgent) return;
    const currentReputation = currentAgent.reputation;
    const currentEquity = currentReputation.totalFunds;
    const nextTotalFunds = Math.max(0, currentEquity + realizedPnl);
    const nextCumulativePnl = currentReputation.cumulativePnl + realizedPnl;
    const nextTradesCount = currentReputation.tradesCount + tradeCountDelta;
    const equitySeries = [
      ...pnlDataRef.current.map((point) => point.value),
      nextTotalFunds,
    ];
    const nextReputation: AgentReputation = {
      ...currentReputation,
      totalFunds: nextTotalFunds,
      cumulativePnl: nextCumulativePnl,
      tradesCount: nextTradesCount,
      maxDrawdown: Number(calculateDrawdownPct(equitySeries).toFixed(2)),
      sharpeLikeScore: Number(
        calculateSharpeLikeScore(equitySeries).toFixed(2),
      ),
    };
    const nextPoint: PnLPoint = { timestamp, value: nextTotalFunds };
    setAgent((prev) => (prev ? { ...prev, reputation: nextReputation } : prev));
    setPnlData((prev) => [...prev.slice(-39), nextPoint]);
    if (user) {
      await Promise.all([
        erc8004Client.saveReputation(nextReputation),
        erc8004Client.savePnLPoint(agentId!, nextPoint),
      ]);
    }
  };

  const settlePositionClose = async ({
    position,
    exitPrice,
    timestamp,
    engine,
    validation,
    reason,
    policy,
    capitalBefore,
    totalTreasury,
    status,
  }: {
    position: TradeIntent;
    exitPrice: number;
    timestamp: number;
    engine: string;
    validation: { score: number; comment: string };
    reason: string;
    policy: ReturnType<typeof getRiskPolicy>;
    capitalBefore: number;
    totalTreasury: number;
    status: NonNullable<TradeIntent["status"]>;
  }) => {
    const currentAgentIdentity = agentRef.current?.identity || agent?.identity;
    if (!currentAgentIdentity)
      throw new Error("Agent identity unavailable during position settlement.");

    const realizedPnl = calculateTradePnl(position, exitPrice);
    const releasedCapital = getCommittedCapital(position);
    const closeNonce = await reserveIntentNonceForCycle(timestamp);

    const closeBase: TradeIntent = {
      intentId: createIntentId(agentId!, timestamp),
      agentId: agentId!,
      artifactType: "POSITION_CLOSE",
      nonce: closeNonce,
      chainId: CONFIG.CHAIN_ID,
      side: position.side,
      asset: position.asset,
      size: position.size,
      engine,
      capitalAllocated: releasedCapital,
      leverage: position.leverage || 1,
      capitalAvailableBefore: capitalBefore,
      capitalAvailableAfter: capitalBefore + releasedCapital + realizedPnl,
      entryPrice: position.entryPrice,
      exitPrice,
      stopLoss: position.stopLoss,
      takeProfit: position.takeProfit,
      initialStopLoss: position.initialStopLoss || position.stopLoss,
      currentStopLoss: getCurrentStopLoss(position),
      trailingStopActive: position.trailingStopActive,
      trailingStopActivatedAt: position.trailingStopActivatedAt,
      profitProtected: getProfitProtectedAmount(position),
      peakFavorablePrice: position.peakFavorablePrice,
      timestamp,
      status,
      reason,
      validation,
      riskCheck: {
        status: "APPROVED",
        score: validation.score,
        comment: validation.comment,
        route: "RISK_ROUTER",
        maxAllowedNotional: Math.min(
          capitalBefore + releasedCapital,
          policy.maxAllocationNotional,
        ),
        capitalUtilizationPct:
          totalTreasury > 0 ? (releasedCapital / totalTreasury) * 100 : 0,
      },
      policySnapshot: policy,
      execution: {
        status: "CLOSED",
        venue: "FORGE_SANDBOX",
        mode: "SPOT",
        settlement: "CLOSE_POSITION",
        fillPrice: exitPrice,
        realizedPnl,
      },
    };

    const closeIntent: TradeIntent = {
      ...closeBase,
      ...createIntentEnvelope(currentAgentIdentity, closeBase),
      signature: {
        status: "NOT_REQUIRED",
        scheme: "EIP-712",
        digest: `0x${"0".repeat(64)}`,
        value: `0x${"0".repeat(130)}`,
      },
    };

    await persistIntentArtifact(closeIntent);
    setIntents((prev) =>
      prev.map((entry) =>
        entry.intentId === position.intentId
          ? {
              ...entry,
              status,
              exitPrice,
              execution: {
                ...(entry.execution || {
                  venue: "FORGE_SANDBOX" as const,
                  mode: "SPOT" as const,
                  settlement: "CLOSE_POSITION" as const,
                  status: "CLOSED" as const,
                }),
                status: "CLOSED",
                settlement: "CLOSE_POSITION",
                fillPrice: exitPrice,
                realizedPnl,
              },
            }
          : entry,
      ),
    );

    // Track AI accuracy if the original intent had a raw AI decision
    if (position.rawAiDecision && position.entryPrice && user) {
      const accuracyRecord = evaluateAiAccuracy({
        intentId: position.intentId || "",
        agentId: agentId!,
        rawAiDecision: position.rawAiDecision,
        finalSide: position.side,
        finalAsset: position.asset,
        entryPrice: position.entryPrice,
        exitPrice,
        realizedPnl,
        timestamp,
      });
      if (accuracyRecord) {
        void erc8004Client.saveAiAccuracy(accuracyRecord);
      }
    }

    return { closeIntent, realizedPnl, releasedCapital };
  };

  const persistGridLifecycleArtifact = async ({
    engine,
    asset,
    timestamp,
    reason,
    validation,
    riskComment,
    policy,
    capitalBefore,
    capitalAfter,
    score,
    totalTreasuryForUtilization,
    deployedCapitalNow,
  }: {
    engine:
      | "SPOT_GRID_BOT_INIT"
      | "SPOT_GRID_BOT_REBUILD"
      | "SPOT_GRID_BOT_PAUSE";
    asset: string;
    timestamp: number;
    reason: string;
    validation: { score: number; comment: string };
    riskComment: string;
    policy: ReturnType<typeof getRiskPolicy>;
    capitalBefore: number;
    capitalAfter: number;
    score: number;
    totalTreasuryForUtilization: number;
    deployedCapitalNow: number;
  }) => {
    await persistSystemHoldArtifact({
      timestamp,
      engine,
      asset,
      reason,
      validation,
      riskComment,
      capitalBefore,
      capitalAfter,
      policy,
      score,
      deployedCapitalNow,
      totalTreasuryForUtilization,
    });
  };

  const persistGridBuyIntent = async ({
    timestamp,
    asset,
    quantity,
    entryPrice,
    quoteAllocated,
    pairedSellPrice,
    policy,
    capitalBefore,
    capitalAfter,
    totalTreasury,
    rangeLow,
  }: {
    timestamp: number;
    asset: "BTC" | "ETH";
    quantity: number;
    entryPrice: number;
    quoteAllocated: number;
    pairedSellPrice: number;
    policy: ReturnType<typeof getRiskPolicy>;
    capitalBefore: number;
    capitalAfter: number;
    totalTreasury: number;
    rangeLow: number;
  }) => {
    const currentIdentity = agentRef.current?.identity || agent?.identity;
    if (!currentIdentity || !agentId) return;

    // Run grid buys through the risk router for daily loss / kill switch checks
    // Grid bots manage their own position limits via grid levels, so we override the position cap
    const gridPositions = activePositionsRef.current;
    const gridPolicy = { ...policy, maxOpenPositions: 50 };
    const routerResult = getRiskRouterDecision({
      policy: gridPolicy,
      totalTreasury,
      availableCapital: capitalBefore,
      activePositions: gridPositions,
      intents: intentsRef.current,
      asset,
      side: "BUY",
      tradeNotional: quoteAllocated,
      leverage: 1,
      currentDrawdownPct: 0,
      isFlipTrade: false,
      isGridBot: true,
    });

    const nonce = await reserveIntentNonceForCycle(timestamp);

    if (!routerResult.approved) {
      const blockBase: TradeIntent = {
        intentId: createIntentId(agentId, timestamp),
        agentId,
        artifactType: "RISK_BLOCK",
        nonce,
        chainId: CONFIG.CHAIN_ID,
        side: "BUY",
        asset,
        size: quantity,
        engine: "SPOT_GRID_BOT",
        capitalAllocated: 0,
        leverage: 1,
        capitalAvailableBefore: capitalBefore,
        capitalAvailableAfter: capitalBefore,
        timestamp,
        status: "CANCELLED",
        reason: `Grid buy blocked by risk router: ${routerResult.comment}`,
        validation: {
          score: 80,
          comment: "Risk router blocked a grid fill to protect capital.",
        },
        riskCheck: {
          status: "BLOCKED",
          score: 80,
          comment: routerResult.comment,
          route: "RISK_ROUTER",
          maxAllowedNotional: routerResult.maxAllowedNotional,
          capitalUtilizationPct: 0,
        },
        policySnapshot: policy,
        execution: {
          status: "REJECTED",
          venue: "FORGE_SANDBOX",
          mode: "SPOT",
          settlement: "NO_FILL",
          rejectionReason: routerResult.code,
        },
      };
      const blockIntent = {
        ...blockBase,
        ...createIntentEnvelope(currentIdentity, blockBase),
        signature: {
          status: "NOT_REQUIRED" as const,
          scheme: "EIP-712" as const,
          digest: `0x${"0".repeat(64)}`,
          value: `0x${"0".repeat(130)}`,
        },
      } satisfies TradeIntent;
      await persistIntentArtifact(blockIntent);
      return;
    }

    const baseIntent: TradeIntent = {
      intentId: createIntentId(agentId, timestamp),
      agentId,
      artifactType: "TRADE_INTENT",
      nonce,
      chainId: CONFIG.CHAIN_ID,
      side: "BUY",
      asset,
      size: quantity,
      engine: "SPOT_GRID_BOT",
      capitalAllocated: quoteAllocated,
      leverage: 1,
      capitalAvailableBefore: capitalBefore,
      capitalAvailableAfter: capitalAfter,
      entryPrice,
      stopLoss: rangeLow,
      initialStopLoss: rangeLow,
      currentStopLoss: rangeLow,
      takeProfit: pairedSellPrice,
      trailingStopActive: false,
      profitProtected: 0,
      peakFavorablePrice: entryPrice,
      timestamp,
      status: "OPEN",
      reason: `Grid buy filled at ${entryPrice.toFixed(2)} and armed a paired sell at ${pairedSellPrice.toFixed(2)}.`,
      validation: {
        score: 84,
        comment:
          "A lower grid level filled inside the active range, so the ladder opened a spot buy leg.",
      },
      riskCheck: {
        status: "APPROVED",
        score: 84,
        comment: routerResult.comment,
        route: "RISK_ROUTER",
        maxAllowedNotional: routerResult.maxAllowedNotional,
        capitalUtilizationPct:
          totalTreasury > 0 ? (quoteAllocated / totalTreasury) * 100 : 0,
      },
      policySnapshot: policy,
      execution: {
        status: "FILLED",
        venue: "FORGE_SANDBOX",
        mode: "SPOT",
        settlement: "OPEN_POSITION",
        fillPrice: entryPrice,
      },
    };

    // Autonomous grid cycles always use simulated signatures
    const intent: TradeIntent = {
      ...baseIntent,
      ...createSignedIntentMetadata(currentIdentity, baseIntent),
    };

    await persistIntentArtifact(intent);
  };

  const persistGridSellIntent = async ({
    timestamp,
    asset,
    quantity,
    entryPrice,
    exitPrice,
    quoteAllocated,
    realizedProfit,
    policy,
    capitalBefore,
    capitalAfter,
    totalTreasury,
    rangeLow,
  }: {
    timestamp: number;
    asset: "BTC" | "ETH";
    quantity: number;
    entryPrice: number;
    exitPrice: number;
    quoteAllocated: number;
    realizedProfit: number;
    policy: ReturnType<typeof getRiskPolicy>;
    capitalBefore: number;
    capitalAfter: number;
    totalTreasury: number;
    rangeLow: number;
  }) => {
    const currentIdentity = agentRef.current?.identity || agent?.identity;
    if (!currentIdentity || !agentId) return;

    const nonce = await reserveIntentNonceForCycle(timestamp);
    const baseIntent: TradeIntent = {
      intentId: createIntentId(agentId, timestamp),
      agentId,
      artifactType: "POSITION_CLOSE",
      nonce,
      chainId: CONFIG.CHAIN_ID,
      side: "BUY",
      asset,
      size: quantity,
      engine: "SPOT_GRID_BOT",
      capitalAllocated: quoteAllocated,
      leverage: 1,
      capitalAvailableBefore: capitalBefore,
      capitalAvailableAfter: capitalAfter,
      entryPrice,
      exitPrice,
      stopLoss: rangeLow,
      initialStopLoss: rangeLow,
      currentStopLoss: rangeLow,
      takeProfit: exitPrice,
      trailingStopActive: false,
      profitProtected: Math.max(0, realizedProfit),
      peakFavorablePrice: exitPrice,
      timestamp,
      status: "CLOSED",
      reason: `Grid sell filled at ${exitPrice.toFixed(2)} and captured ${realizedProfit.toFixed(2)} USD inside the active range.`,
      validation: {
        score: 88,
        comment:
          "A paired grid sell closed one ladder step above the fill and locked in spot grid profit.",
      },
      riskCheck: {
        status: "APPROVED",
        score: 88,
        comment:
          "Grid profit was captured inside the configured range under current spot sandbox policy.",
        route: "RISK_ROUTER",
        maxAllowedNotional: Math.min(
          capitalBefore,
          policy.maxAllocationNotional,
        ),
        capitalUtilizationPct:
          totalTreasury > 0 ? (quoteAllocated / totalTreasury) * 100 : 0,
      },
      policySnapshot: policy,
      execution: {
        status: "CLOSED",
        venue: "FORGE_SANDBOX",
        mode: "SPOT",
        settlement: "CLOSE_POSITION",
        fillPrice: exitPrice,
        realizedPnl: realizedProfit,
      },
    };

    // Autonomous grid cycles always use simulated signatures
    const intent: TradeIntent = {
      ...baseIntent,
      ...createSignedIntentMetadata(currentIdentity, baseIntent),
    };

    await persistIntentArtifact(intent);
  };

  const runSpotGridCycle = async ({
    currentAgent,
    latestMarket,
    riskPolicy,
    totalTreasury,
  }: {
    currentAgent: AggregatedAgentView;
    latestMarket: MarketData;
    riskPolicy: ReturnType<typeof getRiskPolicy>;
    totalTreasury: number;
  }) => {
    const timestamp = Date.now();
    let runtime = gridRuntimeRef.current;
    let currentBalance = balanceRef.current;

    // If we don't have a runtime loaded yet but the agent has been running before,
    // skip this cycle — the data is still loading from Firestore
    if (!runtime && !deferredDataReady) {
      console.log("[Grid] Waiting for grid runtime to load from Firestore...");
      return;
    }

    // Ask AI for grid guidance on init and rebuilds
    const advisory = await groqService.getGridAdvisory(
      latestMarket,
      runtime?.asset,
    );

    if (!advisory.shouldActivate && !runtime) {
      await persistSystemHoldArtifact({
        timestamp,
        engine: "SPOT_GRID_BOT_INIT",
        asset: advisory.recommendedAsset,
        reason: `AI advisory recommended against activating the grid: ${advisory.reason}`,
        validation: {
          score: 78,
          comment: "Grid activation deferred based on AI market assessment.",
        },
        riskComment: advisory.reason,
        capitalBefore: currentBalance,
        capitalAfter: currentBalance,
        policy: riskPolicy,
        score: 78,
        deployedCapitalNow: 0,
        totalTreasuryForUtilization: totalTreasury,
      });
      return;
    }

    if (!runtime || runtime.status === "stopped") {
      // Clear stopped runtime so a fresh grid can be created
      if (runtime?.status === "stopped") {
        runtime = null;
        syncGridRuntimeState(null);
      }
      const initialCapitalReserved = Math.min(
        Math.max(0, currentBalance),
        Math.max(0, riskPolicy.maxAllocationNotional),
      );
      if (initialCapitalReserved <= 0) {
        console.warn(
          "[Grid] No capital available to initialize grid. Skipping.",
        );
        return;
      }
      runtime = createSpotGridRuntime({
        agentId: currentAgent.identity.agentId,
        marketData: latestMarket,
        capitalReserved: initialCapitalReserved,
        advisory,
        timestamp,
      });

      syncGridRuntimeState(runtime);
      const armedSellCount = 0;
      const filledBuyCount = 0;
      await persistGridLifecycleArtifact({
        engine: "SPOT_GRID_BOT_INIT",
        asset: runtime.asset,
        timestamp,
        reason: `Spot grid initialized on ${runtime.asset} with ${runtime.gridLevels} ladder levels inside a ${runtime.rangeLow.toFixed(2)} - ${runtime.rangeHigh.toFixed(2)} range. Mode: ${runtime.configMode}. ${filledBuyCount > 0 ? `Initial market buy filled ${filledBuyCount} levels, arming ${armedSellCount} sell levels above current price.` : "Waiting for price to reach buy levels."} AI advisory: ${advisory.reason}`,
        validation: {
          score: 90,
          comment:
            "The grid bot created a bounded spot ladder before any fill was attempted.",
        },
        riskComment: `Grid capital reserved: ${runtime.capitalReserved.toFixed(2)} USD across ${runtime.gridLevels} total levels. ${filledBuyCount > 0 ? `${filledBuyCount} initial buys at market price, ${armedSellCount} sells armed.` : ""} Spacing bias: ${advisory.spacingBias}.`,
        policy: riskPolicy,
        capitalBefore: currentBalance,
        capitalAfter: currentBalance,
        score: 90,
        totalTreasuryForUtilization: totalTreasury,
        deployedCapitalNow: 0,
      });
    }

    if (!runtime) return;

    const evaluation = evaluateSpotGridRuntime({
      runtime,
      marketData: latestMarket,
      totalTreasury,
      maxOpenPositions: Math.floor(runtime.gridLevels / 2),
      maxAllocationNotional: riskPolicy.maxAllocationNotional,
      advisory,
    });

    runtime = evaluation.runtime;
    syncGridRuntimeState(runtime);

    for (const [index, event] of evaluation.events.entries()) {
      const eventTimestamp = event.timestamp + index;

      if (event.type === "paused") {
        await persistGridLifecycleArtifact({
          engine: "SPOT_GRID_BOT_PAUSE",
          asset: event.runtime.asset,
          timestamp: eventTimestamp,
          reason: event.reason,
          validation: {
            score: 82,
            comment:
              "The grid paused instead of chasing price outside its safe bounded area.",
          },
          riskComment:
            "Grid ladder paused while price sits outside the active range.",
          policy: riskPolicy,
          capitalBefore: currentBalance,
          capitalAfter: currentBalance,
          score: 82,
          totalTreasuryForUtilization: totalTreasury,
          deployedCapitalNow: 0,
        });
      }

      if (event.type === "rebuilt") {
        await persistGridLifecycleArtifact({
          engine: "SPOT_GRID_BOT_REBUILD",
          asset: event.runtime.asset,
          timestamp: eventTimestamp,
          reason: event.reason,
          validation: {
            score: 86,
            comment:
              "The grid rebuilt itself around a new market area instead of forcing the old ladder.",
          },
          riskComment: `New range: ${event.runtime.rangeLow.toFixed(2)} - ${event.runtime.rangeHigh.toFixed(2)}.`,
          policy: riskPolicy,
          capitalBefore: currentBalance,
          capitalAfter: currentBalance,
          score: 86,
          totalTreasuryForUtilization: totalTreasury,
          deployedCapitalNow: 0,
        });
      }

      if (event.type === "buy_filled") {
        const pairedSell = event.runtime.levels.find(
          (level) => level.id === event.level.pairedLevelId,
        );
        await persistGridBuyIntent({
          timestamp: eventTimestamp,
          asset: event.runtime.asset,
          quantity: event.level.quantity,
          entryPrice: event.level.price,
          quoteAllocated: event.level.quoteAllocated,
          pairedSellPrice: pairedSell?.price || event.level.price,
          policy: riskPolicy,
          capitalBefore: currentBalance,
          capitalAfter: event.runtime.availableQuote,
          totalTreasury,
          rangeLow: event.runtime.rangeLow,
        });
        currentBalance = event.runtime.availableQuote;
      }

      if (event.type === "sell_filled") {
        await persistGridSellIntent({
          timestamp: eventTimestamp,
          asset: event.runtime.asset,
          quantity: event.pairedBuyLevel.quantity || event.level.quantity,
          entryPrice: event.pairedBuyLevel.price,
          exitPrice: event.level.price,
          quoteAllocated: event.pairedBuyLevel.quoteAllocated,
          realizedProfit: event.realizedProfit,
          policy: riskPolicy,
          capitalBefore: currentBalance,
          capitalAfter: event.runtime.availableQuote,
          totalTreasury,
          rangeLow: event.runtime.rangeLow,
        });
        await persistReputationMetrics({
          realizedPnl: event.realizedProfit,
          timestamp: eventTimestamp,
          tradeCountDelta: 1,
        });
        setTotalRealizedPnL((prev) => prev + event.realizedProfit);
        currentBalance = event.runtime.availableQuote;
      }

      if (
        event.type === "trailing_stop_hit" ||
        event.type === "stop_loss_hit" ||
        event.type === "take_profit_hit"
      ) {
        const engineLabel =
          event.type === "trailing_stop_hit"
            ? "SPOT_GRID_BOT_TRAILING_STOP"
            : event.type === "stop_loss_hit"
              ? "SPOT_GRID_BOT_STOP_LOSS"
              : "SPOT_GRID_BOT_TAKE_PROFIT";
        const score =
          event.type === "take_profit_hit"
            ? 92
            : event.type === "trailing_stop_hit"
              ? 87
              : 70;
        await persistGridLifecycleArtifact({
          engine: engineLabel as any,
          asset: event.runtime.asset,
          timestamp: eventTimestamp,
          reason: event.reason,
          validation: {
            score,
            comment: `Bot-level ${event.type.replace(/_/g, " ")} terminated the grid. This is a trust-relevant capital protection event.`,
          },
          riskComment: event.reason,
          policy: riskPolicy,
          capitalBefore: currentBalance,
          capitalAfter: event.runtime.availableQuote,
          score,
          totalTreasuryForUtilization: totalTreasury,
          deployedCapitalNow: 0,
        });
        // Stop the session loop since the grid is terminated
        stopSessionLoop(true);
      }
    }

    const derivedPositions = deriveGridActivePositions(runtime);
    setGridRuntime(runtime);
    setActivePositions(derivedPositions);
    setSimulatedBalance(runtime.availableQuote);
    if (user && agentId) {
      await Promise.all([
        erc8004Client.updateGridRuntimeState(agentId, runtime),
        erc8004Client.updateActivePositions(agentId, derivedPositions),
      ]);
    }
  };

  const handleGridModify = async (modifications: ModifyGridParams) => {
    const currentAgent = agentRef.current;
    const currentRuntime = gridRuntimeRef.current;
    const latestMarket = marketData;
    if (!currentAgent || !currentRuntime || !latestMarket || !agentId) return;

    const riskPolicy = getRiskPolicy(
      currentAgent.identity.riskProfile,
      currentAgent.reputation.totalFunds || 0,
    );
    const timestamp = Date.now();
    const { runtime: nextRuntime, event } = modifySpotGrid(
      currentRuntime,
      modifications,
      latestMarket,
      timestamp,
    );

    syncGridRuntimeState(nextRuntime);
    const derivedPositions = deriveGridActivePositions(nextRuntime);
    setActivePositions(derivedPositions);
    setSimulatedBalance(nextRuntime.availableQuote);

    await persistGridLifecycleArtifact({
      engine: "SPOT_GRID_BOT_REBUILD",
      asset: nextRuntime.asset,
      timestamp,
      reason: event.reason,
      validation: {
        score: 85,
        comment:
          "Grid parameters were modified by the operator. The change is recorded as a trust artifact.",
      },
      riskComment: `Modified config: range ${nextRuntime.rangeLow.toFixed(0)}-${nextRuntime.rangeHigh.toFixed(0)}, ${nextRuntime.gridLevels} grids.`,
      policy: riskPolicy,
      capitalBefore: balanceRef.current,
      capitalAfter: nextRuntime.availableQuote,
      score: 85,
      totalTreasuryForUtilization: currentAgent.reputation.totalFunds || 0,
      deployedCapitalNow: 0,
    });

    if (user) {
      await Promise.all([
        erc8004Client.updateGridRuntimeState(agentId, nextRuntime),
        erc8004Client.updateActivePositions(agentId, derivedPositions),
      ]);
    }
  };

  const handleGridWithdraw = async (amount: number) => {
    const currentAgent = agentRef.current;
    const currentRuntime = gridRuntimeRef.current;
    if (!currentAgent || !currentRuntime || !agentId) return;

    const result = withdrawFromGrid(currentRuntime, amount);
    if (!result) return;

    const riskPolicy = getRiskPolicy(
      currentAgent.identity.riskProfile,
      currentAgent.reputation.totalFunds || 0,
    );
    const timestamp = Date.now();

    syncGridRuntimeState(result.runtime);
    setSimulatedBalance(result.runtime.availableQuote);

    // Record as a vault transaction
    const tx: VaultTransaction = {
      id: `grid_withdraw_${timestamp}`,
      agentId,
      amount,
      type: "WITHDRAWAL",
      status: "COMPLETED",
      timestamp,
    };
    setVaultTransactions((prev) => [tx, ...prev]);

    await persistGridLifecycleArtifact({
      engine: "SPOT_GRID_BOT_PAUSE",
      asset: currentRuntime.asset,
      timestamp,
      reason: result.event.reason,
      validation: {
        score: 83,
        comment:
          "Grid profit withdrawal recorded. The grid continues operating with reduced available capital.",
      },
      riskComment: `Withdrew ${amount.toFixed(2)} USDC from accumulated grid profit. Total withdrawn: ${result.runtime.previouslyWithdrawn.toFixed(2)} USDC.`,
      policy: riskPolicy,
      capitalBefore: currentRuntime.availableQuote,
      capitalAfter: result.runtime.availableQuote,
      score: 83,
      totalTreasuryForUtilization: currentAgent.reputation.totalFunds || 0,
      deployedCapitalNow: 0,
    });

    if (user) {
      await Promise.all([
        erc8004Client.updateGridRuntimeState(agentId, result.runtime),
        erc8004Client.saveVaultTransaction(agentId, tx),
      ]);
    }
  };

  const handleGridTerminate = async () => {
    const currentAgent = agentRef.current;
    const currentRuntime = gridRuntimeRef.current;
    if (!currentAgent || !currentRuntime || !agentId) return;

    const riskPolicy = getRiskPolicy(
      currentAgent.identity.riskProfile,
      currentAgent.reputation.totalFunds || 0,
    );
    const timestamp = Date.now();

    // Mark grid as stopped
    const terminatedRuntime: GridRuntimeState = {
      ...currentRuntime,
      status: "stopped",
      lastGridEventAt: timestamp,
      updatedAt: timestamp,
    };

    syncGridRuntimeState(terminatedRuntime);
    setActivePositions([]);
    activePositionsRef.current = [];
    stopSessionLoop(true);

    await persistGridLifecycleArtifact({
      engine: "SPOT_GRID_BOT_TERMINATE" as any,
      asset: currentRuntime.asset,
      timestamp,
      reason: `Grid terminated by operator. ${currentRuntime.heldBase > 0 ? `${currentRuntime.heldBase.toFixed(6)} ${currentRuntime.asset} was liquidated at market price.` : "No open positions to close."}`,
      validation: {
        score: 85,
        comment:
          "Grid bot terminated by operator. All positions closed and grid levels cleared.",
      },
      riskComment: `Grid terminated. Cumulative profit: ${currentRuntime.cumulativeGridProfit.toFixed(2)} USDC. Total trades: ${currentRuntime.totalTradesCount}.`,
      policy: riskPolicy,
      capitalBefore: currentRuntime.availableQuote,
      capitalAfter: currentRuntime.availableQuote,
      score: 85,
      totalTreasuryForUtilization: currentAgent.reputation.totalFunds || 0,
      deployedCapitalNow: 0,
    });

    if (user) {
      await Promise.all([
        erc8004Client.updateGridRuntimeState(agentId, terminatedRuntime),
        erc8004Client.updateActivePositions(agentId, []),
      ]);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!agentId || !authReady) return;
      setLoading(true);
      setLoadError(null);
      setLoadNotice(null);
      setDeferredDataReady(false);

      if (!user) {
        // Auth ready but no user yet — don't clear state, just wait for user to arrive
        // The effect will re-run when user changes
        setLoading(false);
        return;
      }

      try {
        console.log(`[AgentDetail] Fetching data for agent ${agentId}...`);

        // Phase 1: Fast — get agent identity, positions, runtime, market (enough to render the page shell)
        const fastResults = await Promise.allSettled([
          erc8004Client.getAgentById(agentId),
          erc8004Client.getActivePositions(agentId),
          erc8004Client.getRuntimeState(agentId),
          erc8004Client.getGridRuntimeState(agentId),
          marketService.getLatestPrices(),
          groqService.checkConfig(),
          erc8004Client.getPendingOrders(agentId),
        ]);

        const agentData =
          fastResults[0].status === "fulfilled"
            ? (fastResults[0].value as AggregatedAgentView | null)
            : null;
        const savedPositions =
          fastResults[1].status === "fulfilled"
            ? (fastResults[1].value as TradeIntent[])
            : [];
        const savedRuntimeState =
          fastResults[2].status === "fulfilled"
            ? (fastResults[2].value as AgentRuntimeState | null)
            : null;
        const savedGridRuntime =
          fastResults[3].status === "fulfilled"
            ? (fastResults[3].value as GridRuntimeState | null)
            : null;
        const initialMarket =
          fastResults[4].status === "fulfilled"
            ? (fastResults[4].value as MarketData)
            : null;
        const isConfigured =
          fastResults[5].status === "fulfilled"
            ? (fastResults[5].value as boolean)
            : false;
        const savedPendingOrders =
          fastResults[6].status === "fulfilled"
            ? (fastResults[6].value as TradeIntent[])
            : [];

        const effectivePositions = savedGridRuntime
          ? deriveGridActivePositions(savedGridRuntime)
          : savedPositions;
        const totalCommittedCapital = effectivePositions.reduce(
          (sum, position) => sum + getCommittedCapital(position),
          0,
        );
        const pendingReservedCapital = savedPendingOrders.reduce(
          (sum, order) => sum + (order.capitalAllocated || 0),
          0,
        );

        // Render the page shell immediately with what we have
        setAgent(agentData);
        setActivePositions(effectivePositions);
        setPendingOrders(savedPendingOrders);
        setRuntimeState(savedRuntimeState);
        setGridRuntime(savedGridRuntime);
        if (initialMarket) setMarketData(initialMarket);
        setHasGroqKey(isConfigured);
        setSimulatedBalance(
          Math.max(
            0,
            (agentData?.reputation.totalFunds || 0) -
              totalCommittedCapital -
              pendingReservedCapital,
          ),
        );
        setTotalRealizedPnL(agentData?.reputation.cumulativePnl || 0);
        setLoading(false);

        // Phase 2: Deferred — load history, validations, intents, checkpoints, vault in background
        const deferredResults = await Promise.allSettled([
          erc8004Client.getPnLHistory(agentId),
          erc8004Client.getValidationHistory(agentId),
          erc8004Client.getVaultTransactions(agentId),
          erc8004Client.getTradeIntents(agentId),
          erc8004Client.getCheckpoints(agentId),
        ]);

        const historyData =
          deferredResults[0].status === "fulfilled"
            ? (deferredResults[0].value as PnLPoint[])
            : [];
        const validationsData =
          deferredResults[1].status === "fulfilled"
            ? (deferredResults[1].value as ValidationRecord[])
            : [];
        const transactionsData =
          deferredResults[2].status === "fulfilled"
            ? (deferredResults[2].value as VaultTransaction[])
            : [];
        const savedIntents =
          deferredResults[3].status === "fulfilled"
            ? (deferredResults[3].value as TradeIntent[])
            : [];
        const savedCheckpoints =
          deferredResults[4].status === "fulfilled"
            ? (deferredResults[4].value as AgentCheckpoint[])
            : [];

        const derivedValidations =
          validationsData.length > 0
            ? validationsData
            : deriveValidationRecordsFromIntents(agentId, savedIntents);
        const normalizedHistory =
          historyData.length > 0
            ? historyData
            : agentData?.reputation.totalFunds
              ? [
                  {
                    timestamp: Date.now(),
                    value: agentData.reputation.totalFunds,
                  },
                ]
              : [];

        setValidations(derivedValidations);
        setPnlData(normalizedHistory);
        setVaultTransactions(transactionsData);
        setIntents(savedIntents);
        setCheckpoints(savedCheckpoints);

        // Reconstruct active positions from intents if the active_positions doc was empty/lost
        // but intents show open trades that were never closed
        if (
          effectivePositions.length === 0 &&
          savedIntents.length > 0 &&
          !savedGridRuntime
        ) {
          const openIntentIds = new Set(
            savedIntents
              .filter(
                (i) =>
                  i.artifactType === "TRADE_INTENT" &&
                  i.execution?.status === "FILLED" &&
                  i.status === "OPEN",
              )
              .map((i) => i.intentId),
          );
          // Remove any that have a matching POSITION_CLOSE
          savedIntents
            .filter((i) => i.artifactType === "POSITION_CLOSE")
            .forEach((close) => {
              // Match by asset + side from the same agent
              savedIntents
                .filter(
                  (open) =>
                    openIntentIds.has(open.intentId) &&
                    open.asset === close.asset,
                )
                .forEach((matched) => openIntentIds.delete(matched.intentId));
            });
          const reconstructed = savedIntents.filter((i) =>
            openIntentIds.has(i.intentId),
          );
          if (reconstructed.length > 0) {
            console.log(
              `[AgentDetail] Reconstructed ${reconstructed.length} open position(s) from intents.`,
            );
            setActivePositions(reconstructed);
            activePositionsRef.current = reconstructed;
            const committedCapital = reconstructed.reduce(
              (sum, p) => sum + getCommittedCapital(p),
              0,
            );
            setSimulatedBalance(
              Math.max(
                0,
                (agentData?.reputation.totalFunds || 0) - committedCapital,
              ),
            );
            if (user) {
              void erc8004Client.updateActivePositions(agentId, reconstructed);
            }
          }
        }

        setDeferredDataReady(true);

        if (agentData?.reputation.totalFunds && historyData.length === 0) {
          void erc8004Client
            .ensurePnLHistoryBaseline(agentId, agentData.reputation.totalFunds)
            .catch((e) =>
              console.error("Failed to seed baseline performance history:", e),
            );
        }

        const deferredLabels = [
          "performance history",
          "validation registry",
          "vault history",
          "trade logs",
          "checkpoint timeline",
        ];
        const deferredFailures = deferredResults
          .map((r, i) => ({ result: r, label: deferredLabels[i] }))
          .filter((entry) => entry.result.status === "rejected");
        const fastFailures = fastResults
          .slice(0, 4)
          .map((r, i) => ({
            result: r,
            label: [
              "agent identity",
              "active positions",
              "nonce runtime",
              "grid runtime",
            ][i],
          }))
          .filter((entry) => entry.result.status === "rejected");

        if (fastFailures.length > 0) {
          setLoadError(
            `Some saved agent records did not load: ${fastFailures.map((e) => e.label).join(", ")}.`,
          );
        } else if (deferredFailures.length > 0) {
          setLoadNotice(
            `Live refresh is temporarily limited for ${deferredFailures.map((e) => e.label).join(" and ")}. Your saved agent data still loaded normally.`,
          );
        }
      } catch (error) {
        console.error(`[AgentDetail] Failed to fetch agent ${agentId}`, error);
        setAgent(null);
        setLoadError(
          "Agent workspace failed to load completely. Please refresh and try again.",
        );
        setLoading(false);
      }
    };
    fetchData();
  }, [agentId, authReady, user]);

  const runAutonomousCycle = async () => {
    if (!agentId || !agent || isScanning) return;
    console.log(`[Autonomous Cycle] Starting cycle for agent ${agentId}...`);
    syncRuntimeState({ lastCycleAt: Date.now() });

    const status = aiService.getQuotaStatus();
    setQuotaStatus(status);
    if (status.isExhausted) {
      console.warn("AI Engine is in cooldown. Skipping cycle.");
      return;
    }

    setIsScanning(true);
    setLastScanTime(Date.now());

    try {
      const latestMarket = await marketService.getLatestPrices();
      // Skip cycle if market data is stale (failed fetch returned old cache)
      const marketAge = Date.now() - (latestMarket.timestamp || 0);
      if (marketAge > 60_000) {
        console.warn(
          `[Autonomous Cycle] Market data is ${Math.round(marketAge / 1000)}s old. Skipping cycle.`,
        );
        return;
      }
      setMarketData(latestMarket);

      const currentAgent = agentRef.current || agent;
      const totalTreasury = currentAgent.reputation.totalFunds || 0;
      const riskPolicy = getRiskPolicy(
        currentAgent.identity.riskProfile,
        totalTreasury,
      );
      const executionProfile = getExecutionProfile(
        currentAgent.identity.strategyType,
      );
      const strategyBehavior = getStrategyBehavior(
        currentAgent.identity.strategyType,
      );
      const trailingActivationThresholdPct = TRAILING_PROFIT_TRIGGER_PCT * 100;
      let availableCapitalAfterMaintenance = balanceRef.current;

      if (currentAgent.identity.strategyType === "spot_grid_bot") {
        await runSpotGridCycle({
          currentAgent,
          latestMarket,
          riskPolicy,
          totalTreasury,
        });
        return;
      }

      // Check pending orders for fills and expiry
      const now = Date.now();
      const pendingToFill: TradeIntent[] = [];
      const pendingToKeep: TradeIntent[] = [];
      const pendingToExpire: TradeIntent[] = [];

      for (const order of pendingOrdersRef.current) {
        const currentPrice =
          order.asset === "BTC"
            ? latestMarket.btc.price
            : latestMarket.eth.price;

        // Check expiry first
        if (order.expiresAt && now >= order.expiresAt) {
          pendingToExpire.push(order);
          continue;
        }

        // Check if limit price is hit
        const limitPrice = order.limitPrice || 0;
        const shouldFill =
          order.side === "BUY"
            ? currentPrice <= limitPrice
            : currentPrice >= limitPrice;

        if (shouldFill && limitPrice > 0) {
          pendingToFill.push(order);
        } else {
          pendingToKeep.push(order);
        }
      }

      // Expire stale pending orders
      if (pendingToExpire.length > 0) {
        for (const [expIdx, order] of pendingToExpire.entries()) {
          const expireTs = now + expIdx;
          const expireNonce = await reserveIntentNonceForCycle(expireTs);
          const currentIdentity = agentRef.current?.identity || agent?.identity;
          if (!currentIdentity) continue;
          const expireBase: TradeIntent = {
            intentId: createIntentId(agentId, expireTs),
            agentId,
            artifactType: "SYSTEM_HOLD",
            nonce: expireNonce,
            chainId: CONFIG.CHAIN_ID,
            side: order.side,
            asset: order.asset,
            size: 0,
            engine: "RISK_ROUTER_EXPIRY",
            orderType: "LIMIT",
            limitPrice: order.limitPrice,
            capitalAllocated: 0,
            leverage: 1,
            capitalAvailableBefore: balanceRef.current,
            capitalAvailableAfter:
              balanceRef.current + (order.capitalAllocated || 0),
            timestamp: expireTs,
            status: "CANCELLED",
            reason: `Limit ${order.side} order for ${order.asset} at $${order.limitPrice?.toFixed(2)} expired without being filled.`,
            validation: {
              score: 60,
              comment: "Pending order expired — capital released.",
            },
            riskCheck: {
              status: "SAFE_HOLD",
              score: 60,
              comment:
                "Expired limit order. Capital returned to available pool.",
              route: "RISK_ROUTER",
            },
            policySnapshot: riskPolicy,
            execution: {
              status: "NOT_EXECUTED",
              venue: "FORGE_SANDBOX",
              mode: "SPOT",
              settlement: "NO_FILL",
            },
          };
          const expireIntent: TradeIntent = {
            ...expireBase,
            ...createIntentEnvelope(currentIdentity, expireBase),
            signature: {
              status: "NOT_REQUIRED",
              scheme: "EIP-712",
              digest: `0x${"0".repeat(64)}`,
              value: `0x${"0".repeat(130)}`,
            },
          };
          await persistIntentArtifact(expireIntent);
          // Release reserved capital
          const released = order.capitalAllocated || 0;
          availableCapitalAfterMaintenance += released;
          setSimulatedBalance((prev) => prev + released);
          balanceRef.current += released;
        }
      }

      // Fill triggered pending orders
      if (pendingToFill.length > 0) {
        for (const [fillIdx, order] of pendingToFill.entries()) {
          const fillTs = now + 100 + fillIdx;
          const fillPrice =
            order.asset === "BTC"
              ? latestMarket.btc.price
              : latestMarket.eth.price;

          // Re-validate: check position cap and duplicate exposure before filling
          const currentPositionCount = activePositionsRef.current.length;
          const hasDuplicateExposure = activePositionsRef.current.some(
            (p) => p.asset === order.asset && p.side === order.side,
          );
          if (
            currentPositionCount >= riskPolicy.maxOpenPositions ||
            hasDuplicateExposure
          ) {
            // Position cap full or duplicate — cancel the pending order, release capital
            const cancelNonce = await reserveIntentNonceForCycle(fillTs);
            const cancelIdentity =
              agentRef.current?.identity || agent?.identity;
            if (cancelIdentity) {
              const reason = hasDuplicateExposure
                ? `Limit ${order.side} ${order.asset} order cancelled — duplicate exposure already exists.`
                : `Limit ${order.side} ${order.asset} order cancelled — position cap (${riskPolicy.maxOpenPositions}) already reached.`;
              const cancelBase: TradeIntent = {
                intentId: createIntentId(agentId, fillTs),
                agentId,
                artifactType: "SYSTEM_HOLD",
                nonce: cancelNonce,
                chainId: CONFIG.CHAIN_ID,
                side: order.side,
                asset: order.asset,
                size: 0,
                engine: "RISK_ROUTER_CANCEL",
                orderType: "LIMIT",
                limitPrice: order.limitPrice,
                capitalAllocated: 0,
                leverage: 1,
                capitalAvailableBefore: balanceRef.current,
                capitalAvailableAfter:
                  balanceRef.current + (order.capitalAllocated || 0),
                timestamp: fillTs,
                status: "CANCELLED",
                reason,
                validation: {
                  score: 65,
                  comment:
                    "Pending order cancelled at fill time — risk constraints changed.",
                },
                riskCheck: {
                  status: "BLOCKED",
                  score: 65,
                  comment: reason,
                  route: "RISK_ROUTER",
                },
                policySnapshot: riskPolicy,
                execution: {
                  status: "REJECTED",
                  venue: "FORGE_SANDBOX",
                  mode: "SPOT",
                  settlement: "NO_FILL",
                  rejectionReason: hasDuplicateExposure
                    ? "DUPLICATE_EXPOSURE"
                    : "MAX_OPEN_POSITIONS",
                },
              };
              const cancelIntent: TradeIntent = {
                ...cancelBase,
                ...createIntentEnvelope(cancelIdentity, cancelBase),
                signature: {
                  status: "NOT_REQUIRED",
                  scheme: "EIP-712",
                  digest: `0x${"0".repeat(64)}`,
                  value: `0x${"0".repeat(130)}`,
                },
              };
              await persistIntentArtifact(cancelIntent);
            }
            // Release reserved capital
            const released = order.capitalAllocated || 0;
            availableCapitalAfterMaintenance += released;
            setSimulatedBalance((prev) => prev + released);
            balanceRef.current += released;
            continue;
          }

          // Use the better of limit price or current price (simulating limit fill)
          const effectiveFillPrice =
            order.side === "BUY"
              ? Math.min(fillPrice, order.limitPrice || fillPrice)
              : Math.max(fillPrice, order.limitPrice || fillPrice);

          const fillNonce = await reserveIntentNonceForCycle(fillTs);
          const currentIdentity = agentRef.current?.identity || agent?.identity;
          if (!currentIdentity) continue;

          const filledPosition: TradeIntent = {
            ...order,
            intentId: createIntentId(agentId, fillTs),
            nonce: fillNonce,
            entryPrice: effectiveFillPrice,
            status: "OPEN",
            orderType: "LIMIT",
            peakFavorablePrice: effectiveFillPrice,
            trailingStopActive: false,
            profitProtected: 0,
            timestamp: fillTs,
            execution: {
              status: "FILLED",
              venue: "FORGE_SANDBOX",
              mode: "SPOT",
              settlement: "OPEN_POSITION",
              fillPrice: effectiveFillPrice,
            },
            reason: `Limit ${order.side} order filled at $${effectiveFillPrice.toFixed(2)} (limit: $${order.limitPrice?.toFixed(2)}).${order.reason ? ` Original thesis: ${order.reason}` : ""}`,
          };

          // Persist the fill as a new intent artifact
          const fillIntent: TradeIntent = {
            ...filledPosition,
            ...createIntentEnvelope(currentIdentity, filledPosition),
            signature: {
              status: "NOT_REQUIRED",
              scheme: "EIP-712",
              digest: `0x${"0".repeat(64)}`,
              value: `0x${"0".repeat(130)}`,
            },
          };
          await persistIntentArtifact(fillIntent);

          // Update the original pending intent to show it was filled
          setIntents((prev) =>
            prev.map((entry) =>
              entry.intentId === order.intentId
                ? { ...entry, status: "EXECUTED" as const }
                : entry,
            ),
          );

          // Add as active position
          const updatedPositions = [
            ...activePositionsRef.current,
            filledPosition,
          ];
          setActivePositions(updatedPositions);
          activePositionsRef.current = updatedPositions;
          if (user)
            await erc8004Client.updateActivePositions(
              agentId,
              updatedPositions,
            );
        }
      }
      // Reassess pending orders that haven't filled — cancel if thesis is broken
      const pendingToCancel: TradeIntent[] = [];
      const pendingStillValid: TradeIntent[] = [];

      for (const order of pendingToKeep) {
        const currentPrice =
          order.asset === "BTC"
            ? latestMarket.btc.price
            : latestMarket.eth.price;
        const limitPrice = order.limitPrice || 0;
        if (limitPrice <= 0) {
          pendingStillValid.push(order);
          continue;
        }

        // How far has price drifted from the limit?
        const driftPct =
          order.side === "BUY"
            ? ((currentPrice - limitPrice) / limitPrice) * 100
            : ((limitPrice - currentPrice) / currentPrice) * 100;

        // Only reassess if price has moved >3% away (order is unlikely to fill soon)
        if (driftPct > 3) {
          try {
            const reassessment = await aiService.reassessPosition(
              currentAgent.identity.strategyType,
              currentAgent.identity.riskProfile,
              latestMarket,
              { ...order, entryPrice: limitPrice },
            );

            if (
              reassessment.action === "CLOSE" &&
              reassessment.confidence >= 60
            ) {
              pendingToCancel.push(order);
              // Create cancellation artifact
              const cancelTs = now + 200 + pendingToCancel.length;
              const cancelNonce = await reserveIntentNonceForCycle(cancelTs);
              const currentIdentity =
                agentRef.current?.identity || agent?.identity;
              if (currentIdentity) {
                const cancelBase: TradeIntent = {
                  intentId: createIntentId(agentId, cancelTs),
                  agentId,
                  artifactType: "SYSTEM_HOLD",
                  nonce: cancelNonce,
                  chainId: CONFIG.CHAIN_ID,
                  side: order.side,
                  asset: order.asset,
                  size: 0,
                  engine: "RISK_ROUTER_REASSESSMENT",
                  orderType: "LIMIT",
                  limitPrice: order.limitPrice,
                  capitalAllocated: 0,
                  leverage: 1,
                  capitalAvailableBefore: balanceRef.current,
                  capitalAvailableAfter:
                    balanceRef.current + (order.capitalAllocated || 0),
                  timestamp: cancelTs,
                  status: "CANCELLED",
                  reason: `Limit ${order.side} ${order.asset} at $${limitPrice.toFixed(2)} cancelled — ${reassessment.reason}`,
                  validation: {
                    score: reassessment.confidence,
                    comment: "AI reassessment cancelled the pending order.",
                  },
                  riskCheck: {
                    status: "SAFE_HOLD",
                    score: reassessment.confidence,
                    comment: `Price drifted ${driftPct.toFixed(1)}% from limit. AI cancelled the order.`,
                    route: "RISK_ROUTER",
                  },
                  policySnapshot: riskPolicy,
                  execution: {
                    status: "NOT_EXECUTED",
                    venue: "FORGE_SANDBOX",
                    mode: "SPOT",
                    settlement: "NO_FILL",
                  },
                };
                const cancelIntent: TradeIntent = {
                  ...cancelBase,
                  ...createIntentEnvelope(currentIdentity, cancelBase),
                  signature: {
                    status: "NOT_REQUIRED",
                    scheme: "EIP-712",
                    digest: `0x${"0".repeat(64)}`,
                    value: `0x${"0".repeat(130)}`,
                  },
                };
                await persistIntentArtifact(cancelIntent);
              }
              // Release reserved capital
              const released = order.capitalAllocated || 0;
              availableCapitalAfterMaintenance += released;
              setSimulatedBalance((prev) => prev + released);
              balanceRef.current += released;
            } else {
              pendingStillValid.push(order);
            }
          } catch {
            // On error, keep the order — don't cancel because AI is down
            pendingStillValid.push(order);
          }
        } else {
          pendingStillValid.push(order);
        }
      }

      // Update pending orders state
      const pendingChanged =
        pendingToFill.length > 0 ||
        pendingToExpire.length > 0 ||
        pendingToCancel.length > 0;
      const finalPendingOrders = pendingStillValid;
      if (pendingChanged) {
        setPendingOrders(finalPendingOrders);
        pendingOrdersRef.current = finalPendingOrders;
        if (user)
          await erc8004Client.updatePendingOrders(agentId, finalPendingOrders);
      }

      // Settle active positions for TP/SL/trailing stop and flag aged positions
      const positionsToKeep: TradeIntent[] = [];
      const positionsNeedingReassessment: TradeIntent[] = [];
      const trailingEventQueue: Array<{
        type: "activated" | "raised";
        position: TradeIntent;
        previousStop?: number;
      }> = [];
      const positionsToClose: Array<{
        position: TradeIntent;
        exitPrice: number;
        status: NonNullable<TradeIntent["status"]>;
        reason: string;
        validation: { score: number; comment: string };
      }> = [];

      activePositionsRef.current.forEach((position) => {
        const currentPrice =
          position.asset === "BTC"
            ? latestMarket.btc.price
            : latestMarket.eth.price;
        const reviewAnchor = position.lastReviewedAt || position.timestamp;
        const positionAgeMinutes = Math.max(
          0,
          (Date.now() - reviewAnchor) / 60000,
        );
        const unrealizedPnlPct = getUnrealizedPnlPct(position, currentPrice);
        const previousStop = getCurrentStopLoss(position);
        const nextPosition: TradeIntent = { ...position };
        let trailingChanged = false;

        if (
          unrealizedPnlPct >= trailingActivationThresholdPct &&
          currentPrice > 0
        ) {
          const priorPeak =
            typeof position.peakFavorablePrice === "number"
              ? position.peakFavorablePrice
              : position.entryPrice || currentPrice;
          const nextPeak =
            position.side === "SELL"
              ? Math.min(priorPeak, currentPrice)
              : Math.max(priorPeak, currentPrice);
          const distancePct = getTrailingDistancePct(
            currentAgent.identity.strategyType,
            currentAgent.identity.riskProfile,
          );
          const rawCandidateStop =
            position.side === "SELL"
              ? nextPeak * (1 + distancePct)
              : nextPeak * (1 - distancePct);
          const stopFloor = getTrailingStopFloor(position);
          const candidateStop =
            position.side === "SELL"
              ? Math.min(rawCandidateStop, stopFloor)
              : Math.max(rawCandidateStop, stopFloor);

          nextPosition.trailingStopActive = true;
          nextPosition.trailingStopActivatedAt =
            position.trailingStopActivatedAt || Date.now();
          nextPosition.peakFavorablePrice = nextPeak;

          if (typeof previousStop === "number") {
            nextPosition.currentStopLoss =
              position.side === "SELL"
                ? Math.min(previousStop, candidateStop)
                : Math.max(previousStop, candidateStop);
          } else {
            nextPosition.currentStopLoss = candidateStop;
          }

          nextPosition.profitProtected = getProfitProtectedAmount(nextPosition);
          trailingChanged =
            nextPosition.currentStopLoss !== previousStop ||
            !position.trailingStopActive;

          if (trailingChanged) {
            trailingEventQueue.push({
              type: position.trailingStopActive ? "raised" : "activated",
              position: nextPosition,
              previousStop,
            });
          }
        } else {
          nextPosition.peakFavorablePrice =
            position.peakFavorablePrice || position.entryPrice;
          nextPosition.currentStopLoss =
            position.currentStopLoss ||
            position.initialStopLoss ||
            position.stopLoss;
          nextPosition.profitProtected = position.profitProtected || 0;
        }

        const activeStopLoss = getCurrentStopLoss(nextPosition);

        if (position.side === "BUY") {
          if (
            nextPosition.trailingStopActive &&
            activeStopLoss &&
            currentPrice <= activeStopLoss
          ) {
            positionsToClose.push({
              position: nextPosition,
              exitPrice: currentPrice,
              status: "CLOSED",
              reason: `Trailing stop protected profit and closed ${position.asset}.`,
              validation: {
                score: 90,
                comment:
                  "Trailing stop locked in profit after the trade moved clearly in favor.",
              },
            });
            return;
          }
          if (position.takeProfit && currentPrice >= position.takeProfit) {
            positionsToClose.push({
              position: nextPosition,
              exitPrice: currentPrice,
              status: "HIT_TP",
              reason: `Take-profit target reached for ${position.asset}.`,
              validation: {
                score: 92,
                comment:
                  "Take-profit trigger executed under sandbox settlement policy.",
              },
            });
            return;
          }
          if (activeStopLoss && currentPrice <= activeStopLoss) {
            positionsToClose.push({
              position: nextPosition,
              exitPrice: currentPrice,
              status: "HIT_SL",
              reason: `Stop-loss threshold reached for ${position.asset}.`,
              validation: {
                score: 61,
                comment:
                  "Stop-loss trigger executed under sandbox settlement policy.",
              },
            });
            return;
          }
        } else {
          if (
            nextPosition.trailingStopActive &&
            activeStopLoss &&
            currentPrice >= activeStopLoss
          ) {
            positionsToClose.push({
              position: nextPosition,
              exitPrice: currentPrice,
              status: "CLOSED",
              reason: `Trailing stop protected profit and closed ${position.asset}.`,
              validation: {
                score: 90,
                comment:
                  "Trailing stop locked in profit after the trade moved clearly in favor.",
              },
            });
            return;
          }
          if (position.takeProfit && currentPrice <= position.takeProfit) {
            positionsToClose.push({
              position: nextPosition,
              exitPrice: currentPrice,
              status: "HIT_TP",
              reason: `Take-profit target reached for ${position.asset}.`,
              validation: {
                score: 92,
                comment:
                  "Take-profit trigger executed under sandbox settlement policy.",
              },
            });
            return;
          }
          if (activeStopLoss && currentPrice >= activeStopLoss) {
            positionsToClose.push({
              position: nextPosition,
              exitPrice: currentPrice,
              status: "HIT_SL",
              reason: `Stop-loss threshold reached for ${position.asset}.`,
              validation: {
                score: 61,
                comment:
                  "Stop-loss trigger executed under sandbox settlement policy.",
              },
            });
            return;
          }
        }
        positionsToKeep.push(nextPosition);
        if (positionAgeMinutes >= executionProfile.maxHoldMinutes)
          positionsNeedingReassessment.push(nextPosition);
      });

      if (positionsToClose.length > 0) {
        let capitalAfterSettlement = balanceRef.current;
        let totalSettledPnl = 0;
        for (const [index, settled] of positionsToClose.entries()) {
          const closeEngine = settled.reason
            .toLowerCase()
            .includes("trailing stop")
            ? "RISK_ROUTER_TRAILING_STOP"
            : settled.status === "CLOSED"
              ? "RISK_ROUTER_TIME_EXIT"
              : "RISK_ROUTER_AUTO_CLOSE";
          const result = await settlePositionClose({
            position: settled.position,
            exitPrice: settled.exitPrice,
            timestamp: Date.now() + index,
            engine: closeEngine,
            validation: settled.validation,
            reason: settled.reason,
            policy: riskPolicy,
            capitalBefore: capitalAfterSettlement,
            totalTreasury,
            status: settled.status,
          });
          capitalAfterSettlement += result.releasedCapital + result.realizedPnl;
          totalSettledPnl += result.realizedPnl;
          await persistReputationMetrics({
            realizedPnl: result.realizedPnl,
            timestamp: result.closeIntent.timestamp,
            tradeCountDelta: 1,
          });
        }
        setTotalRealizedPnL((prev) => prev + totalSettledPnl);
        setSimulatedBalance(capitalAfterSettlement);
        setActivePositions(positionsToKeep);
        // Update ref immediately so the next cycle doesn't see stale positions
        activePositionsRef.current = positionsToKeep;
        balanceRef.current = capitalAfterSettlement;
        availableCapitalAfterMaintenance = capitalAfterSettlement;
        if (user && agentId)
          await erc8004Client.updateActivePositions(agentId, positionsToKeep);
      }

      const trailingManagedPositions = positionsToKeep;
      const hasTrailingUpdates =
        trailingEventQueue.length > 0 && positionsToClose.length === 0;
      if (hasTrailingUpdates) {
        setActivePositions(trailingManagedPositions);
        if (user && agentId) {
          await erc8004Client.updateActivePositions(
            agentId,
            trailingManagedPositions,
          );
        }
      }

      if (trailingEventQueue.length > 0) {
        const deployedCapitalNow = trailingManagedPositions.reduce(
          (sum, p) => sum + getCommittedCapital(p),
          0,
        );
        for (const [index, event] of trailingEventQueue.entries()) {
          const protectionLabel =
            event.position.profitProtected && event.position.profitProtected > 0
              ? ` Profit protected: ${event.position.profitProtected.toFixed(2)} USD.`
              : "";
          await persistSystemHoldArtifact({
            timestamp: Date.now() + index + 5,
            engine: "RISK_ROUTER_TRAILING_STOP",
            asset: event.position.asset,
            reason:
              event.type === "activated"
                ? `Trailing stop activated for ${event.position.asset}. Current stop now protects the trade.${protectionLabel}`
                : `Trailing stop raised for ${event.position.asset}. The stop tightened to protect more of the open profit.${protectionLabel}`,
            validation: {
              score: event.type === "activated" ? 86 : 89,
              comment:
                event.type === "activated"
                  ? `Trailing protection armed after the trade moved more than ${trailingActivationThresholdPct.toFixed(0)}% into profit.`
                  : "Trailing protection tightened as the trade made a new favorable move.",
            },
            riskComment:
              event.type === "activated"
                ? `Trailing stop armed at ${event.position.currentStopLoss?.toFixed(2) || "n/a"} after the trade crossed the profit trigger.`
                : `Trailing stop moved from ${event.previousStop?.toFixed(2) || "n/a"} to ${event.position.currentStopLoss?.toFixed(2) || "n/a"}.`,
            capitalBefore: balanceRef.current,
            capitalAfter: availableCapitalAfterMaintenance,
            policy: riskPolicy,
            score: event.type === "activated" ? 86 : 89,
            deployedCapitalNow,
            totalTreasuryForUtilization: totalTreasury,
          });
        }
      }

      // AI Decision
      const {
        decision,
        validation: validationResult,
        engine,
        rawAiDecision,
      } = await aiService.processTradeCycle(
        agentId,
        currentAgent.identity.strategyType,
        currentAgent.identity.riskProfile,
        latestMarket,
        trailingManagedPositions,
        availableCapitalAfterMaintenance,
        totalTreasury,
      );
      setQuotaStatus(aiService.getQuotaStatus());

      console.log(
        `[AI Decision] side=${decision.side}, asset=${decision.asset}, score=${validationResult.score}, raw=${rawAiDecision?.side}/${rawAiDecision?.asset}, orderType=${decision.orderType}, limitPrice=${decision.limitPrice}`,
      );

      let positionsAfterReview = trailingManagedPositions;
      let capitalAfterReview = availableCapitalAfterMaintenance;

      // Reassessment of aged positions
      if (positionsNeedingReassessment.length > 0) {
        const reviewTimestamp = Date.now();
        const reassessmentResults: Array<{
          position: TradeIntent;
          keep: boolean;
          reason: string;
          confidence: number;
        }> = [];

        // Call the dedicated reassessment AI for each position
        for (const position of positionsNeedingReassessment) {
          const currentPrice =
            position.asset === "BTC"
              ? latestMarket.btc.price
              : latestMarket.eth.price;
          const profitProtected = getProfitProtectedAmount(position);
          const unrealizedPnlPct = getUnrealizedPnlPct(position, currentPrice);

          let keep = false;
          let reason = "";
          let confidence = 50;

          try {
            const aiReassessment = await aiService.reassessPosition(
              currentAgent.identity.strategyType,
              currentAgent.identity.riskProfile,
              latestMarket,
              position,
            );
            confidence = aiReassessment.confidence;
            reason = aiReassessment.reason;

            if (aiReassessment.action === "KEEP") {
              // AI says keep — but factor in the original entry conviction.
              // A losing trade that was marginal to begin with should be cut sooner.
              const stopLoss = position.currentStopLoss || position.stopLoss;
              const isAboveStopLoss = stopLoss
                ? position.side === "BUY"
                  ? currentPrice > stopLoss
                  : currentPrice < stopLoss
                : unrealizedPnlPct >= -5;

              const originalScore = position.validation?.score || 50;
              const wasLowConviction = originalScore < 65;
              const isLosing = unrealizedPnlPct < -0.5;

              if (!isAboveStopLoss) {
                // Below stop-loss — close regardless
                keep = false;
              } else if (
                wasLowConviction &&
                isLosing &&
                unrealizedPnlPct < -1.5
              ) {
                // Low-conviction entry that's losing more than 1.5% — cut it
                keep = false;
                reason = `Original entry had low conviction (score: ${originalScore}) and the trade is down ${Math.abs(unrealizedPnlPct).toFixed(1)}%. Cutting the loss early.`;
              } else {
                keep = true;
              }
            } else {
              // AI says close — but give profitable/protected positions a second chance
              const pnlBonus =
                unrealizedPnlPct > 0 ? Math.min(unrealizedPnlPct * 4, 15) : 0;
              const protectionBonus = profitProtected > 0 ? 10 : 0;
              const trailingBonus = position.trailingStopActive ? 8 : 0;
              const holdBiasBonus = strategyBehavior.holdBias * 12;
              const effectiveConfidence =
                confidence -
                pnlBonus -
                protectionBonus -
                trailingBonus -
                holdBiasBonus;

              if (confidence >= 85 && unrealizedPnlPct <= 0) {
                // AI is very confident AND position is losing — respect the close signal
                keep = false;
              } else {
                // Otherwise, only close if effective confidence is still high after bonuses
                // effectiveConfidence > 60 means the AI is still quite sure even after
                // accounting for profit, trailing stop, and strategy hold bias
                keep = effectiveConfidence < 60;
              }
            }
          } catch {
            // On error, default to keeping — don't close positions because AI is down
            keep = true;
            reason =
              "Reassessment unavailable — keeping position open for safety.";
          }

          reassessmentResults.push({ position, keep, reason, confidence });
        }

        const stillStrongPositions = reassessmentResults
          .filter((r) => r.keep)
          .map((r) => r.position);
        const positionsToExitAfterReview = reassessmentResults
          .filter((r) => !r.keep)
          .map((r) => r.position);

        if (positionsToExitAfterReview.length > 0) {
          let settledPnl = 0;
          for (const [
            index,
            position,
          ] of positionsToExitAfterReview.entries()) {
            const exitPrice =
              position.asset === "BTC"
                ? latestMarket.btc.price
                : latestMarket.eth.price;
            const matchingResult = reassessmentResults.find(
              (r) => r.position.intentId === position.intentId,
            );
            const closeReason =
              matchingResult?.reason ||
              `Reassessment after ${formatMinutesLabel(executionProfile.maxHoldMinutes)} did not justify keeping ${position.asset} open.`;
            const result = await settlePositionClose({
              position,
              exitPrice,
              timestamp: reviewTimestamp + index + 10,
              engine: "RISK_ROUTER_REASSESSMENT",
              validation: {
                score: Math.min(
                  78,
                  matchingResult?.confidence || validationResult.score,
                ),
                comment: `Timed review closed the ${position.asset} position: ${closeReason}`,
              },
              reason: closeReason,
              policy: riskPolicy,
              capitalBefore: capitalAfterReview,
              totalTreasury,
              status: "CLOSED",
            });
            capitalAfterReview += result.releasedCapital + result.realizedPnl;
            settledPnl += result.realizedPnl;
            await persistReputationMetrics({
              realizedPnl: result.realizedPnl,
              timestamp: result.closeIntent.timestamp,
              tradeCountDelta: 1,
            });
          }
          positionsAfterReview = positionsToKeep
            .filter(
              (position) =>
                !positionsToExitAfterReview.some(
                  (closed) => closed.intentId === position.intentId,
                ),
            )
            .map((position) =>
              stillStrongPositions.some(
                (kept) => kept.intentId === position.intentId,
              )
                ? { ...position, lastReviewedAt: reviewTimestamp }
                : position,
            );
          setActivePositions(positionsAfterReview);
          activePositionsRef.current = positionsAfterReview;
          setSimulatedBalance(capitalAfterReview);
          balanceRef.current = capitalAfterReview;
          setTotalRealizedPnL((prev) => prev + settledPnl);
          if (user)
            await erc8004Client.updateActivePositions(
              agentId,
              positionsAfterReview,
            );
          return;
        }

        if (stillStrongPositions.length > 0) {
          const refreshedPositions = positionsAfterReview.map((position) =>
            stillStrongPositions.some(
              (kept) => kept.intentId === position.intentId,
            )
              ? { ...position, lastReviewedAt: reviewTimestamp }
              : position,
          );
          positionsAfterReview = refreshedPositions;
          setActivePositions(refreshedPositions);
          if (user)
            await erc8004Client.updateActivePositions(
              agentId,
              refreshedPositions,
            );

          const strongestPosition =
            refreshedPositions.find((position) =>
              stillStrongPositions.some(
                (kept) => kept.intentId === position.intentId,
              ),
            ) || stillStrongPositions[0];
          const deployedCapitalNow = refreshedPositions.reduce(
            (sum, p) => sum + getCommittedCapital(p),
            0,
          );
          const profitProtected = getProfitProtectedAmount(strongestPosition);
          await persistSystemHoldArtifact({
            timestamp: reviewTimestamp,
            engine,
            asset: strongestPosition.asset,
            reason: `${strongestPosition.asset} stayed open after its timed review because the setup still looks strong.${profitProtected > 0 ? ` The trade is also protecting ${profitProtected.toFixed(2)} USD.` : ""}`,
            validation: {
              score: Math.max(
                strategyBehavior.reassessmentThreshold,
                validationResult.score,
              ),
              comment: `${executionProfile.label} review kept the ${strongestPosition.side} ${strongestPosition.asset} position open after ${formatMinutesLabel(executionProfile.maxHoldMinutes)}.`,
            },
            riskComment:
              "Timed review passed. The existing position remains open under the current thesis.",
            capitalBefore: capitalAfterReview,
            capitalAfter: capitalAfterReview,
            policy: riskPolicy,
            score: Math.max(
              strategyBehavior.reassessmentThreshold,
              validationResult.score,
            ),
            deployedCapitalNow,
            totalTreasuryForUtilization: totalTreasury,
          });
          return;
        }
      }

      // Spot mode: SELL entries are not allowed — you can only buy and then close.
      // Instead of just HOLDing, convert to a limit BUY at support (the AI sees resistance,
      // so price is likely heading to support — place a buy order there).
      if (decision.side === "SELL") {
        console.log(
          `Agent ${agentId} wanted to SELL ${decision.asset} but spot mode only allows BUY entries.`,
        );

        // Only convert SELL to limit BUY for range-based strategies where it makes sense
        const rangeStrategies = new Set([
          "range_trading",
          "mean_reversion",
          "market_making",
        ]);
        const canConvertToLimitBuy = rangeStrategies.has(
          currentAgent.identity.strategyType,
        );

        // Use the raw AI's asset choice — normalization may have swapped it
        const sellAsset =
          rawAiDecision?.asset === "BTC" || rawAiDecision?.asset === "ETH"
            ? rawAiDecision.asset
            : decision.asset || "ETH";
        const assetKey = sellAsset === "BTC" ? "btc" : "eth";
        const currentPrice = latestMarket[assetKey].price;

        // Find the best support level to place a limit buy
        // Prefer 1H support (wider range, more significant level) over 15M
        const levels15m = latestMarket.indicators?.[assetKey]?.levels?.["15m"];
        const levels1h = latestMarket.indicators?.[assetKey]?.levels?.["1h"];
        const support15m = levels15m?.support;
        const support1h = levels1h?.support;

        // Use the higher of the two support levels (closer to current price = more likely to fill)
        // But prefer 1H support if it's reasonably close — it's a stronger level
        const supportPrice =
          support1h && support15m
            ? support1h > currentPrice * 0.95
              ? support1h
              : Math.max(support15m, support1h)
            : support1h || support15m;

        // Only place limit buy if support is below current price by at least 0.3% and within 10%
        const hasPendingOnAsset = pendingOrdersRef.current.some(
          (o) => o.asset === sellAsset,
        );
        const hasActiveOnAsset = positionsAfterReview.some(
          (p) => p.asset === sellAsset,
        );
        const supportIsValid =
          supportPrice &&
          supportPrice < currentPrice * 0.997 &&
          supportPrice > currentPrice * 0.9;

        console.log(
          `[SELL→LIMIT] ${sellAsset}: price=$${currentPrice.toFixed(2)}, support=$${supportPrice?.toFixed(2) || "none"}, valid=${supportIsValid}, pending=${hasPendingOnAsset}, active=${hasActiveOnAsset}`,
        );

        if (
          supportIsValid &&
          !hasPendingOnAsset &&
          !hasActiveOnAsset &&
          canConvertToLimitBuy
        ) {
          // Convert SELL-at-resistance into LIMIT-BUY-at-support
          console.log(
            `Converting SELL ${sellAsset} signal to LIMIT BUY at support $${supportPrice.toFixed(2)}`,
          );
          decision.side = "BUY";
          decision.asset = sellAsset;
          decision.orderType = "LIMIT";
          decision.limitPrice = Math.round(supportPrice * 100) / 100;
          decision.reason = `${decision.reason || "AI identified resistance."} // Spot mode converted SELL signal to LIMIT BUY at support ($${decision.limitPrice.toFixed(2)}) — anticipating price will retrace from resistance.`;
          // Recalculate stops relative to the limit price
          const targetRule =
            currentAgent.identity.riskProfile === "conservative"
              ? { stopLossPct: 0.025, takeProfitPct: 0.05 }
              : currentAgent.identity.riskProfile === "aggressive"
                ? { stopLossPct: 0.06, takeProfitPct: 0.11 }
                : { stopLossPct: 0.04, takeProfitPct: 0.075 };
          decision.stopLoss =
            Math.round(
              decision.limitPrice *
                (1 -
                  targetRule.stopLossPct *
                    strategyBehavior.stopLossMultiplier) *
                100,
            ) / 100;
          decision.takeProfit =
            Math.round(
              decision.limitPrice *
                (1 +
                  targetRule.takeProfitPct *
                    strategyBehavior.takeProfitMultiplier) *
                100,
            ) / 100;
          // Recalculate size for the correct asset and limit price
          const limitNotional = Math.min(
            capitalAfterReview *
              (currentAgent.identity.riskProfile === "conservative"
                ? 0.1
                : currentAgent.identity.riskProfile === "aggressive"
                  ? 0.4
                  : 0.25),
            capitalAfterReview,
          );
          decision.capitalAllocated = Math.round(limitNotional * 100) / 100;
          decision.size =
            Math.round((limitNotional / decision.limitPrice) * 10000) / 10000;
        } else {
          // Can't place a useful limit buy — just HOLD
          decision.side = "HOLD";
          decision.reason = `${decision.reason || "AI suggested a short entry."} // Converted to HOLD because spot mode does not support opening short positions.${!canConvertToLimitBuy ? ` ${currentAgent.identity.strategyType} strategy does not convert SELL signals to limit buys.` : ""}${supportIsValid ? "" : " No valid support level found for a limit buy."}${hasPendingOnAsset ? " A pending order already exists for this asset." : ""}${hasActiveOnAsset ? " An active position already exists for this asset." : ""}`;
        }
      }

      // HOLD decision
      if (decision.side === "HOLD") {
        console.log(`Agent ${agentId} decided to HOLD: ${decision.reason}`);
        // Skip persisting "Market stability" system HOLDs — they're noise from the client-side cache
        const isMarketStabilityHold =
          typeof decision.reason === "string" &&
          decision.reason.includes("Market stability detected");
        if (isMarketStabilityHold) {
          return;
        }
        const timestamp = Date.now();
        const deployedCapitalNow = positionsAfterReview.reduce(
          (sum, p) => sum + getCommittedCapital(p),
          0,
        );
        const holdNonce = await reserveIntentNonceForCycle(timestamp);
        const holdBase: TradeIntent = {
          intentId: createIntentId(agentId, timestamp),
          agentId,
          artifactType: "SYSTEM_HOLD",
          nonce: holdNonce,
          chainId: CONFIG.CHAIN_ID,
          side: "HOLD",
          asset: decision.asset || "N/A",
          size: 0,
          engine,
          capitalAllocated: 0,
          leverage: 1,
          capitalAvailableBefore: capitalAfterReview,
          capitalAvailableAfter: capitalAfterReview,
          timestamp,
          status: "CANCELLED",
          reason:
            decision.reason || "Market conditions do not warrant a trade.",
          validation: validationResult,
          riskCheck: {
            status: "SAFE_HOLD",
            score: validationResult.score,
            comment: validationResult.comment,
            route: "RISK_ROUTER",
            maxAllowedNotional: Math.min(
              balanceRef.current,
              riskPolicy.maxAllocationNotional,
            ),
            capitalUtilizationPct:
              totalTreasury > 0
                ? (deployedCapitalNow / totalTreasury) * 100
                : 0,
          },
          policySnapshot: riskPolicy,
          execution: {
            status: "NOT_EXECUTED",
            venue: "FORGE_SANDBOX",
            mode: "SPOT",
            settlement: "NO_FILL",
          },
        };
        const holdIntent: TradeIntent = {
          ...holdBase,
          ...createIntentEnvelope(currentAgent.identity, holdBase),
          signature: {
            status: "NOT_REQUIRED",
            scheme: "EIP-712",
            digest: `0x${"0".repeat(64)}`,
            value: `0x${"0".repeat(130)}`,
          },
        };
        await persistIntentArtifact(holdIntent);
        return;
      }

      const currentPrice =
        decision.asset === "BTC"
          ? latestMarket.btc.price
          : latestMarket.eth.price;
      const tradeNotional =
        decision.capitalAllocated || (decision.size || 0) * currentPrice || 0;
      if (tradeNotional <= 0 || currentPrice <= 0) {
        console.warn(
          `[Trade Execution] Invalid trade parameters: notional=${tradeNotional}, price=${currentPrice}. Skipping.`,
        );
        return;
      }
      const tradeSize =
        decision.size ||
        Math.round((tradeNotional / currentPrice) * 10000) / 10000;
      const leverage = 1;
      const timestamp = Date.now();
      const capitalBefore = capitalAfterReview;

      console.log(
        `[Trade Execution] Agent ${agentId} decided to ${decision.side} ${tradeSize} ${decision.asset} at ${currentPrice}`,
      );

      // Check for existing position to close or flip
      const workingPositions = positionsAfterReview;
      const existingPosIdx = workingPositions.findIndex(
        (p) => p.asset === decision.asset,
      );
      // Also check if there's a pending order for this asset
      const existingPendingOrder = pendingOrdersRef.current.find(
        (o) => o.asset === decision.asset,
      );
      if (existingPendingOrder) {
        console.log(
          `Pending ${existingPendingOrder.side} order already exists for ${decision.asset}. Skipping new trade.`,
        );
        return;
      }
      let positionsAfterFlipCheck = workingPositions;
      let tradeCapitalBefore = capitalBefore;

      if (existingPosIdx !== -1) {
        const existingPos = workingPositions[existingPosIdx];
        if (existingPos.side !== decision.side) {
          const flipClose = await settlePositionClose({
            position: existingPos,
            exitPrice: currentPrice,
            timestamp: timestamp + 1,
            engine,
            validation: validationResult,
            reason: `Flipping ${existingPos.asset} exposure from ${existingPos.side} to ${decision.side}.`,
            policy: riskPolicy,
            capitalBefore,
            totalTreasury,
            status:
              calculateTradePnl(existingPos, currentPrice) >= 0
                ? "HIT_TP"
                : "HIT_SL",
          });
          await persistReputationMetrics({
            realizedPnl: flipClose.realizedPnl,
            timestamp: flipClose.closeIntent.timestamp,
            tradeCountDelta: 1,
          });
          setTotalRealizedPnL((prev) => prev + flipClose.realizedPnl);
          tradeCapitalBefore =
            capitalBefore + flipClose.releasedCapital + flipClose.realizedPnl;
          setSimulatedBalance(tradeCapitalBefore);
          balanceRef.current = tradeCapitalBefore;
          positionsAfterFlipCheck = workingPositions.filter(
            (_, index) => index !== existingPosIdx,
          );
          setActivePositions(positionsAfterFlipCheck);
          activePositionsRef.current = positionsAfterFlipCheck;
          if (user)
            await erc8004Client.updateActivePositions(
              agentId,
              positionsAfterFlipCheck,
            );
        } else {
          console.log(
            `Already have a ${existingPos.side} position on ${decision.asset}. Keeping the current trade open.`,
          );
          const duplicateHoldNonce =
            await reserveIntentNonceForCycle(timestamp);
          const deployedCapitalNow = positionsAfterFlipCheck.reduce(
            (sum, p) => sum + getCommittedCapital(p),
            0,
          );
          const duplicateHoldBase: TradeIntent = {
            intentId: createIntentId(agentId, timestamp),
            agentId,
            artifactType: "SYSTEM_HOLD",
            nonce: duplicateHoldNonce,
            chainId: CONFIG.CHAIN_ID,
            side: "HOLD",
            asset: existingPos.asset,
            size: 0,
            engine,
            capitalAllocated: 0,
            leverage: 1,
            capitalAvailableBefore: tradeCapitalBefore,
            capitalAvailableAfter: tradeCapitalBefore,
            timestamp,
            status: "CANCELLED",
            reason: `The existing ${existingPos.side} ${existingPos.asset} position still matches the new idea, so the agent kept holding it.`,
            validation: {
              score: Math.max(72, validationResult.score),
              comment:
                "The open position already reflects the current thesis, so no extra trade was added.",
            },
            riskCheck: {
              status: "SAFE_HOLD",
              score: Math.max(72, validationResult.score),
              comment:
                "Same-side exposure already exists. The agent stayed with the current position instead of stacking another one.",
              route: "RISK_ROUTER",
              maxAllowedNotional: Math.min(
                tradeCapitalBefore,
                riskPolicy.maxAllocationNotional,
              ),
              capitalUtilizationPct:
                totalTreasury > 0
                  ? (deployedCapitalNow / totalTreasury) * 100
                  : 0,
            },
            policySnapshot: riskPolicy,
            execution: {
              status: "NOT_EXECUTED",
              venue: "FORGE_SANDBOX",
              mode: "SPOT",
              settlement: "NO_FILL",
            },
          };
          const duplicateHoldIntent: TradeIntent = {
            ...duplicateHoldBase,
            ...createIntentEnvelope(currentAgent.identity, duplicateHoldBase),
            signature: {
              status: "NOT_REQUIRED",
              scheme: "EIP-712",
              digest: `0x${"0".repeat(64)}`,
              value: `0x${"0".repeat(130)}`,
            },
          };
          await persistIntentArtifact(duplicateHoldIntent);
          return;
        }
      }

      // Risk router check — use rolling drawdown from recent equity, not permanent high-water mark
      const recentEquity = pnlDataRef.current.slice(-20).map((p) => p.value);
      const rollingDrawdown =
        recentEquity.length >= 2 ? calculateDrawdownPct(recentEquity) : 0;
      const routerDecision = getRiskRouterDecision({
        policy: riskPolicy,
        totalTreasury,
        availableCapital: tradeCapitalBefore,
        activePositions: positionsAfterFlipCheck,
        intents: intentsRef.current,
        asset: decision.asset || "ETH",
        side: decision.side as "BUY" | "SELL",
        tradeNotional,
        leverage,
        currentDrawdownPct: rollingDrawdown,
        isFlipTrade:
          existingPosIdx !== -1 &&
          workingPositions[existingPosIdx]?.side !== decision.side,
      });

      if (!routerDecision.approved) {
        console.warn(`Trade blocked by router policy: ${routerDecision.code}`);
        const blockedNonce = await reserveIntentNonceForCycle(timestamp);
        const isMaxPos = routerDecision.code === "MAX_OPEN_POSITIONS";
        const blockedBase: TradeIntent = {
          intentId: createIntentId(agentId, timestamp),
          agentId,
          artifactType: isMaxPos ? "SYSTEM_HOLD" : "RISK_BLOCK",
          nonce: blockedNonce,
          chainId: CONFIG.CHAIN_ID,
          side: isMaxPos ? "HOLD" : (decision.side as "BUY" | "SELL"),
          asset: isMaxPos ? "N/A" : decision.asset || "ETH",
          size: isMaxPos ? 0 : tradeSize,
          engine,
          capitalAllocated: isMaxPos ? 0 : tradeNotional,
          leverage,
          capitalAvailableBefore: tradeCapitalBefore,
          capitalAvailableAfter: tradeCapitalBefore,
          entryPrice: isMaxPos ? undefined : currentPrice,
          stopLoss: decision.stopLoss,
          takeProfit: decision.takeProfit,
          timestamp,
          status: "CANCELLED",
          reason: isMaxPos
            ? "The portfolio is already at its open-position limit, so this cycle stayed in management mode."
            : routerDecision.comment,
          validation: isMaxPos
            ? {
                score: 92,
                comment:
                  "Position cap reached. Existing trades remain under watch until one closes.",
              }
            : validationResult,
          riskCheck: {
            status: isMaxPos ? "SAFE_HOLD" : "BLOCKED",
            score: isMaxPos ? 92 : validationResult.score,
            comment: routerDecision.comment,
            route: "RISK_ROUTER",
            maxAllowedNotional: routerDecision.maxAllowedNotional,
            capitalUtilizationPct:
              totalTreasury > 0 ? (tradeNotional / totalTreasury) * 100 : 0,
          },
          policySnapshot: riskPolicy,
          execution: {
            status: isMaxPos ? "NOT_EXECUTED" : "REJECTED",
            venue: "FORGE_SANDBOX",
            mode: "SPOT",
            settlement: "NO_FILL",
            rejectionReason: isMaxPos ? undefined : routerDecision.code,
          },
        };
        const blockedIntent: TradeIntent = {
          ...blockedBase,
          ...createIntentEnvelope(currentAgent.identity, blockedBase),
          signature: {
            status: "NOT_REQUIRED",
            scheme: "EIP-712",
            digest: `0x${"0".repeat(64)}`,
            value: `0x${"0".repeat(130)}`,
          },
        };
        await persistIntentArtifact(blockedIntent);
        return;
      }

      // Execute trade — MARKET or LIMIT
      const isLimitOrder =
        decision.orderType === "LIMIT" &&
        typeof decision.limitPrice === "number" &&
        decision.limitPrice > 0;

      const tradeNonce = await reserveIntentNonceForCycle(timestamp);

      if (isLimitOrder) {
        // Create pending limit order — don't execute yet
        const expiryMinutes = executionProfile.maxHoldMinutes * 2 || 240;
        const pendingBase: TradeIntent = {
          intentId: createIntentId(agentId, timestamp),
          agentId,
          artifactType: "TRADE_INTENT",
          nonce: tradeNonce,
          chainId: CONFIG.CHAIN_ID,
          side: decision.side as "BUY" | "SELL",
          asset: decision.asset || "ETH",
          size: tradeSize,
          engine,
          capitalAllocated: tradeNotional,
          leverage,
          capitalAvailableBefore: tradeCapitalBefore,
          capitalAvailableAfter: Math.max(
            0,
            tradeCapitalBefore - tradeNotional,
          ),
          orderType: "LIMIT",
          limitPrice: decision.limitPrice,
          expiresAt: timestamp + expiryMinutes * 60_000,
          stopLoss:
            decision.stopLoss ||
            (decision.side === "BUY"
              ? decision.limitPrice! * 0.98
              : decision.limitPrice! * 1.02),
          initialStopLoss:
            decision.stopLoss ||
            (decision.side === "BUY"
              ? decision.limitPrice! * 0.98
              : decision.limitPrice! * 1.02),
          currentStopLoss:
            decision.stopLoss ||
            (decision.side === "BUY"
              ? decision.limitPrice! * 0.98
              : decision.limitPrice! * 1.02),
          takeProfit:
            decision.takeProfit ||
            (decision.side === "BUY"
              ? decision.limitPrice! * 1.05
              : decision.limitPrice! * 0.95),
          trailingStopActive: false,
          profitProtected: 0,
          timestamp,
          status: "PENDING",
          reason:
            decision.reason ||
            `Limit ${decision.side} at $${decision.limitPrice?.toFixed(2)}`,
          validation: validationResult,
          riskCheck: {
            status: "APPROVED",
            score: validationResult.score,
            comment: `${routerDecision.comment} Limit order placed — capital reserved.`,
            route: "RISK_ROUTER",
            maxAllowedNotional: routerDecision.maxAllowedNotional,
            capitalUtilizationPct:
              totalTreasury > 0 ? (tradeNotional / totalTreasury) * 100 : 0,
          },
          policySnapshot: riskPolicy,
          execution: {
            status: "PENDING_ROUTER",
            venue: "FORGE_SANDBOX",
            mode: "SPOT",
            settlement: "NO_FILL",
          },
          rawAiDecision,
        };

        const pendingIntent: TradeIntent = {
          ...pendingBase,
          ...createSignedIntentMetadata(currentAgent.identity, pendingBase),
        };

        await persistIntentArtifact(pendingIntent);

        // Add to pending orders and reserve capital
        const nextPending = [...pendingOrdersRef.current, pendingIntent];
        setPendingOrders(nextPending);
        pendingOrdersRef.current = nextPending;
        const nextBalance = Math.max(0, tradeCapitalBefore - tradeNotional);
        setSimulatedBalance(nextBalance);
        balanceRef.current = nextBalance;
        if (user) {
          await erc8004Client.updatePendingOrders(agentId, nextPending);
        }
        return;
      }

      // MARKET order — execute immediately
      const intentBase: TradeIntent = {
        intentId: createIntentId(agentId, timestamp),
        agentId,
        artifactType: "TRADE_INTENT",
        nonce: tradeNonce,
        chainId: CONFIG.CHAIN_ID,
        side: decision.side as "BUY" | "SELL",
        asset: decision.asset || "ETH",
        size: tradeSize,
        engine,
        capitalAllocated: tradeNotional,
        leverage,
        capitalAvailableBefore: tradeCapitalBefore,
        capitalAvailableAfter: Math.max(0, tradeCapitalBefore - tradeNotional),
        entryPrice: currentPrice,
        stopLoss:
          decision.stopLoss ||
          (decision.side === "BUY" ? currentPrice * 0.98 : currentPrice * 1.02),
        initialStopLoss:
          decision.stopLoss ||
          (decision.side === "BUY" ? currentPrice * 0.98 : currentPrice * 1.02),
        currentStopLoss:
          decision.stopLoss ||
          (decision.side === "BUY" ? currentPrice * 0.98 : currentPrice * 1.02),
        takeProfit:
          decision.takeProfit ||
          (decision.side === "BUY" ? currentPrice * 1.05 : currentPrice * 0.95),
        trailingStopActive: false,
        profitProtected: 0,
        peakFavorablePrice: currentPrice,
        timestamp,
        status: "OPEN",
        reason: decision.reason || "Technical analysis",
        validation: validationResult,
        riskCheck: {
          status: "APPROVED",
          score: validationResult.score,
          comment: routerDecision.comment,
          route: "RISK_ROUTER",
          maxAllowedNotional: routerDecision.maxAllowedNotional,
          capitalUtilizationPct:
            totalTreasury > 0 ? (tradeNotional / totalTreasury) * 100 : 0,
        },
        policySnapshot: riskPolicy,
        execution: {
          status: "FILLED",
          venue: "FORGE_SANDBOX",
          mode: "SPOT",
          settlement: "OPEN_POSITION",
          fillPrice: currentPrice,
        },
        rawAiDecision,
      };

      let intent: TradeIntent;
      // Autonomous cycles always use simulated signatures — wallet signing
      // requires user interaction (MetaMask popup) which doesn't work in automated loops.
      intent = {
        ...intentBase,
        ...createSignedIntentMetadata(currentAgent.identity, intentBase),
      };

      await persistIntentArtifact(intent);
      // External validation — rule-based second opinion
      const extResult = externalValidate(intent, intentsRef.current);
      if (user) {
        void erc8004Client.saveValidation({
          agentId: agentId!,
          validator: "RULE_ENGINE_V1",
          validationType: "TRADE_INTENT",
          score: extResult.score,
          comment: `[${extResult.verdict}] ${extResult.reasons.join(" ")}`,
          timestamp: Date.now(),
        });
      }

      const nextOpenPositions = [...positionsAfterFlipCheck, intent];
      setActivePositions(nextOpenPositions);
      activePositionsRef.current = nextOpenPositions;
      const nextBalance = Math.max(0, tradeCapitalBefore - tradeNotional);
      setSimulatedBalance(nextBalance);
      balanceRef.current = nextBalance;
      if (user)
        await erc8004Client.updateActivePositions(agentId, nextOpenPositions);
    } finally {
      setIsScanning(false);
    }
  };

  // Market sentiment effect
  useEffect(() => {
    if (!marketData) return;
    if (!hasGroqKey) {
      setMarketSentimentState("limited");
      setMarketSentiment("Groq API key required for sentiment analysis.");
      return;
    }
    const quota = aiService.getQuotaStatus();
    if (quota.isExhausted) {
      setMarketSentimentState("limited");
      if (!marketSentimentUpdatedAt)
        setMarketSentiment(
          "Live sentiment is paused until the Groq cooldown clears.",
        );
      return;
    }
    const now = Date.now();
    const isFirstSnapshot = marketSentimentUpdatedAt === null;
    const isRefreshDue =
      now - lastSentimentRequestAtRef.current >= SENTIMENT_REFRESH_INTERVAL_MS;
    if (!isFirstSnapshot && !isRefreshDue) return;
    const requestId = ++lastSentimentRequestIdRef.current;
    lastSentimentRequestAtRef.current = now;
    if (isFirstSnapshot) setMarketSentimentState("loading");
    groqService
      .getMarketSentiment(marketData)
      .then((nextSentiment) => {
        if (requestId !== lastSentimentRequestIdRef.current) return;
        if (nextSentiment === "Sentiment analysis unavailable.") {
          setMarketSentimentState("limited");
          if (!marketSentimentUpdatedAt)
            setMarketSentiment(
              "Waiting for the first live sentiment snapshot.",
            );
          return;
        }
        setMarketSentiment(nextSentiment);
        setMarketSentimentState("live");
        setMarketSentimentUpdatedAt(Date.now());
      })
      .catch(() => {
        if (requestId !== lastSentimentRequestIdRef.current) return;
        setMarketSentimentState("limited");
        if (!marketSentimentUpdatedAt)
          setMarketSentiment("Waiting for the first live sentiment snapshot.");
      });
  }, [marketData, hasGroqKey, marketSentimentUpdatedAt]);

  // Auto-resume session on page load if it was active before refresh/navigation
  useEffect(() => {
    if (
      !agent ||
      !authReady ||
      !user ||
      !deferredDataReady ||
      !runtimeState?.sessionActive
    ) {
      return;
    }
    // If the loop is already running, don't restart
    if (loopRef.current) return;

    const executionProfile = getExecutionProfile(agent.identity.strategyType);
    const cadenceMs = executionProfile.decisionCadenceMinutes * 60_000;
    const shouldRunImmediately =
      !runtimeState.lastCycleAt ||
      Date.now() - runtimeState.lastCycleAt >= cadenceMs;
    startSessionLoop(shouldRunImmediately);
  }, [agent, authReady, user, deferredDataReady, runtimeState?.sessionActive]);

  // Real-time TP/SL monitor — checks every market update (10s) instead of waiting for the next AI cycle
  useEffect(() => {
    if (
      !agent ||
      !marketData ||
      isScanning ||
      activePositions.length === 0 ||
      agent.identity.strategyType === "spot_grid_bot"
    ) {
      return;
    }

    // Don't trigger TP/SL on stale market data — could cause phantom closes
    const dataAge = Date.now() - (marketData.timestamp || 0);
    if (dataAge > 60_000) {
      return;
    }

    const positionsToClose: Array<{
      position: TradeIntent;
      exitPrice: number;
      status: NonNullable<TradeIntent["status"]>;
      reason: string;
      validation: { score: number; comment: string };
    }> = [];

    for (const position of activePositions) {
      const currentPrice =
        position.asset === "BTC" ? marketData.btc.price : marketData.eth.price;
      if (!currentPrice || currentPrice <= 0) continue;

      const activeStopLoss = getCurrentStopLoss(position);

      if (position.side === "BUY") {
        if (position.takeProfit && currentPrice >= position.takeProfit) {
          positionsToClose.push({
            position,
            exitPrice: currentPrice,
            status: "HIT_TP",
            reason: `Take-profit target reached for ${position.asset} at ${currentPrice.toFixed(2)}.`,
            validation: {
              score: 92,
              comment:
                "Take-profit trigger executed under sandbox settlement policy.",
            },
          });
        } else if (activeStopLoss && currentPrice <= activeStopLoss) {
          positionsToClose.push({
            position,
            exitPrice: currentPrice,
            status: position.trailingStopActive ? "CLOSED" : "HIT_SL",
            reason: position.trailingStopActive
              ? `Trailing stop protected profit and closed ${position.asset}.`
              : `Stop-loss threshold reached for ${position.asset}.`,
            validation: {
              score: position.trailingStopActive ? 90 : 61,
              comment: position.trailingStopActive
                ? "Trailing stop locked in profit."
                : "Stop-loss trigger executed under sandbox settlement policy.",
            },
          });
        }
      } else {
        if (position.takeProfit && currentPrice <= position.takeProfit) {
          positionsToClose.push({
            position,
            exitPrice: currentPrice,
            status: "HIT_TP",
            reason: `Take-profit target reached for ${position.asset} at ${currentPrice.toFixed(2)}.`,
            validation: {
              score: 92,
              comment:
                "Take-profit trigger executed under sandbox settlement policy.",
            },
          });
        } else if (activeStopLoss && currentPrice >= activeStopLoss) {
          positionsToClose.push({
            position,
            exitPrice: currentPrice,
            status: position.trailingStopActive ? "CLOSED" : "HIT_SL",
            reason: position.trailingStopActive
              ? `Trailing stop protected profit and closed ${position.asset}.`
              : `Stop-loss threshold reached for ${position.asset}.`,
            validation: {
              score: position.trailingStopActive ? 90 : 61,
              comment: position.trailingStopActive
                ? "Trailing stop locked in profit."
                : "Stop-loss trigger executed under sandbox settlement policy.",
            },
          });
        }
      }
    }

    if (positionsToClose.length === 0) return;

    // Settle the breached positions
    const settleBreached = async () => {
      if (isScanning || isSettlingRef.current) return;
      isSettlingRef.current = true;
      try {
        const currentAgent = agentRef.current;
        if (!currentAgent) return;
        const totalTreasury = currentAgent.reputation.totalFunds || 0;
        const riskPolicy = getRiskPolicy(
          currentAgent.identity.riskProfile,
          totalTreasury,
        );
        let capitalAfter = balanceRef.current;
        const remaining = activePositionsRef.current.filter(
          (p) =>
            !positionsToClose.some((c) => c.position.intentId === p.intentId),
        );

        // Update refs immediately to prevent re-entry
        activePositionsRef.current = remaining;

        for (const [index, settled] of positionsToClose.entries()) {
          const closeEngine = settled.position.trailingStopActive
            ? "RISK_ROUTER_TRAILING_STOP"
            : "RISK_ROUTER_AUTO_CLOSE";
          const result = await settlePositionClose({
            position: settled.position,
            exitPrice: settled.exitPrice,
            timestamp: Date.now() + index,
            engine: closeEngine,
            validation: settled.validation,
            reason: settled.reason,
            policy: riskPolicy,
            capitalBefore: capitalAfter,
            totalTreasury,
            status: settled.status,
          });
          capitalAfter += result.releasedCapital + result.realizedPnl;
          await persistReputationMetrics({
            realizedPnl: result.realizedPnl,
            timestamp: result.closeIntent.timestamp,
            tradeCountDelta: 1,
          });
        }

        setActivePositions(remaining);
        setSimulatedBalance(capitalAfter);
        balanceRef.current = capitalAfter;
        if (user && agentId)
          await erc8004Client.updateActivePositions(agentId, remaining);
      } finally {
        isSettlingRef.current = false;
      }
    };

    void settleBreached();
  }, [marketData, isScanning, activePositions, agent]);

  useEffect(() => {
    if (autoReviewTimeoutRef.current) {
      clearTimeout(autoReviewTimeoutRef.current);
      autoReviewTimeoutRef.current = null;
    }

    if (
      !agent ||
      !authReady ||
      !user ||
      isRunning ||
      isScanning ||
      activePositions.length === 0 ||
      agent.identity.strategyType === "spot_grid_bot"
    ) {
      return;
    }

    const executionProfile = getExecutionProfile(agent.identity.strategyType);
    const nextReviewAt = Math.min(
      ...activePositions.map(
        (position) =>
          (position.lastReviewedAt || position.timestamp) +
          executionProfile.maxHoldMinutes * 60_000,
      ),
    );

    if (!Number.isFinite(nextReviewAt)) {
      return;
    }

    const delayMs = Math.max(0, nextReviewAt - Date.now());
    autoReviewTimeoutRef.current = setTimeout(() => {
      // Restart the full session so the agent keeps monitoring after this review
      startSessionLoop(true);
    }, delayMs);

    return () => {
      if (autoReviewTimeoutRef.current) {
        clearTimeout(autoReviewTimeoutRef.current);
        autoReviewTimeoutRef.current = null;
      }
    };
  }, [agent, authReady, user, isRunning, isScanning, activePositions]);

  const toggleLoop = () => {
    if (!agent || agent.identity.status === "deactivated") return;
    if (isRunning) {
      stopSessionLoop();
    } else {
      startSessionLoop(true);
    }
  };

  const handleVaultFunding = async () => {
    if (!agentId || !agent || isFunding) return;
    setIsFunding(true);
    try {
      const amount = 25000;
      const tx = await erc8004Client.fundAgent(agentId, amount);
      const previousFunds = agent.reputation.totalFunds || 0;
      setAgent((prev) =>
        prev
          ? {
              ...prev,
              reputation: {
                ...prev.reputation,
                totalFunds: (prev.reputation.totalFunds || 0) + amount,
              },
            }
          : null,
      );
      setVaultTransactions((prev) => [tx, ...prev]);
      setSimulatedBalance((prev) => prev + amount);
      setPnlData((prev) => {
        const baseline =
          prev.length > 0
            ? prev
            : [{ timestamp: tx.timestamp - 1, value: previousFunds }];
        return [
          ...baseline.slice(-39),
          { timestamp: tx.timestamp, value: previousFunds + amount },
        ];
      });
      console.log(
        `[VAULT] Successfully funded agent ${agentId} with ${amount} tokens. TX: ${tx.txHash}`,
      );
    } catch (error) {
      console.error("Failed to fund agent via vault:", error);
    } finally {
      setIsFunding(false);
    }
  };

  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const handleDisconnectWallet = () => {
    disconnectWallet();
    setWalletAddress(null);
  };

  const handleDeleteAgent = async () => {
    if (!agentId || !user || isDeleting) return;
    setIsDeleting(true);
    try {
      stopSessionLoop(false);
      await erc8004Client.deleteAgent(agentId);
      navigate("/agents");
    } catch (error) {
      console.error("Failed to delete agent:", error);
      setIsDeleting(false);
    }
  };

  const handleDeactivateAgent = async () => {
    if (!agentId || !user || isDeactivating) return;
    setIsDeactivating(true);
    try {
      stopSessionLoop(false);
      await erc8004Client.deactivateAgent(agentId);
      setAgent((prev) =>
        prev
          ? { ...prev, identity: { ...prev.identity, status: "deactivated" } }
          : prev,
      );
    } catch (error) {
      console.error("Failed to deactivate agent:", error);
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleReactivateAgent = async () => {
    if (!agentId || !user || isDeactivating) return;
    setIsDeactivating(true);
    try {
      await erc8004Client.reactivateAgent(agentId);
      setAgent((prev) =>
        prev
          ? { ...prev, identity: { ...prev.identity, status: "active" } }
          : prev,
      );
    } catch (error) {
      console.error("Failed to reactivate agent:", error);
    } finally {
      setIsDeactivating(false);
    }
  };

  return {
    agentId,
    agent,
    validations,
    pnlData,
    vaultTransactions,
    checkpoints,
    loading,
    loadError,
    loadNotice,
    isFunding,
    isRunning,
    intents,
    user,
    authReady,
    lastScanTime,
    hasGroqKey,
    marketData,
    walletAddress,
    simulatedBalance,
    activePositions,
    pendingOrders,
    totalRealizedPnL,
    runtimeState,
    gridRuntime,
    countdownNow,
    isScanning,
    quotaStatus,
    marketSentiment,
    marketSentimentState,
    marketSentimentUpdatedAt,
    toggleLoop,
    handleVaultFunding,
    handleDeleteAgent,
    isDeleting,
    handleDeactivateAgent,
    handleReactivateAgent,
    handleDisconnectWallet,
    isDeactivating,
    runAutonomousCycle,
    setQuotaStatus,
    buildTrustTimeline,
    getCommittedCapital,
    getDailyRealizedLoss,
    getDailyRealizedProfit,
    getAllTimeRealizedProfit,
    getAllTimeRealizedLoss,
    getAllTimeNetRealizedPnl,
    getRiskPolicy,
    getExecutionProfile,
    getAgentExecutionWallet,
    // Grid enhancements
    handleGridModify,
    handleGridWithdraw,
    handleGridTerminate,
    getMaxWithdrawable,
    getGridEquity,
    getGridPnL,
    getGridPnLPct,
    getGridAPR,
    getTotalAPR,
    getProfitPerGrid,
    getGridPriceForAsset,
  };
}
