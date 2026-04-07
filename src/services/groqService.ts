import { MarketData } from "./marketService";
import { TradeIntent } from "../lib/types";
import { normalizeAiMessage } from "../utils/aiMessage";

let lastAiMarketData: MarketData | null = null;
let isGroqExhausted = false;
let groqResetTime = 0;
let lastSentimentText = "";

// Global rate tracking — Groq free tier: 30 req/min, 14,400 req/day
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20; // Leave headroom below Groq's 30/min limit
const requestTimestamps: number[] = [];

function trackRequest() {
  const now = Date.now();
  requestTimestamps.push(now);
  // Prune old entries
  while (
    requestTimestamps.length > 0 &&
    requestTimestamps[0] < now - RATE_WINDOW_MS
  ) {
    requestTimestamps.shift();
  }
}

function isRateLimited(): boolean {
  const now = Date.now();
  while (
    requestTimestamps.length > 0 &&
    requestTimestamps[0] < now - RATE_WINDOW_MS
  ) {
    requestTimestamps.shift();
  }
  return requestTimestamps.length >= MAX_REQUESTS_PER_WINDOW;
}

async function fetchJsonWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = 6000,
) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });

    return response;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export const groqService = {
  async processTradeCycle(
    agentId: string,
    strategy: string,
    riskProfile: string,
    marketData: MarketData,
    activePositions: TradeIntent[],
    availableCapital = 0,
    totalTreasury = 0,
  ): Promise<{
    decision: Partial<TradeIntent>;
    validation: { score: number; comment: string };
  }> {
    if (isGroqExhausted && Date.now() < groqResetTime) {
      throw new Error("GROQ_QUOTA_EXHAUSTED");
    }

    if (isRateLimited()) {
      return {
        decision: {
          side: "HOLD" as any,
          reason: "Rate limit approaching — holding to preserve API budget.",
        },
        validation: {
          score: 100,
          comment: "System: Rate-limited HOLD to stay within API quota.",
        },
      };
    }

    // Optimization: Skip AI call if market hasn't moved significantly (less than 0.15%)
    if (lastAiMarketData) {
      const btcChange =
        Math.abs(marketData.btc.price - lastAiMarketData.btc.price) /
        lastAiMarketData.btc.price;
      const ethChange =
        Math.abs(marketData.eth.price - lastAiMarketData.eth.price) /
        lastAiMarketData.eth.price;

      if (btcChange < 0.0015 && ethChange < 0.0015) {
        return {
          decision: {
            side: "HOLD" as any,
            reason:
              "Market stability detected. No significant price action to warrant a new trade decision.",
          },
          validation: {
            score: 100,
            comment: "System: Market stable. Safety maintained.",
          },
        };
      }
    }

    try {
      const payload = {
        agentId,
        strategy,
        riskProfile,
        availableCapital,
        totalTreasury,
        marketData: {
          btc: marketData.btc,
          eth: marketData.eth,
          _indicators: marketData.indicators
            ? {
                btc: marketData.indicators.btc,
                eth: marketData.indicators.eth,
              }
            : undefined,
        },
        activePositions: activePositions.map((p) => {
          const currentPrice =
            marketData[p.asset === "BTC" ? "btc" : "eth"]?.price || 0;
          const entryPrice = p.entryPrice || currentPrice || 1; // Fallback to current price or 1 to avoid division by zero
          const pnl =
            p.side === "BUY"
              ? ((currentPrice - entryPrice) / entryPrice) * 100
              : ((entryPrice - currentPrice) / entryPrice) * 100;

          return {
            side: p.side,
            asset: p.asset,
            size: p.size,
            entryPrice: entryPrice,
            unrealizedPnL: pnl,
          };
        }),
      };

      const response = await fetch("/api/ai/trade-cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error === "GROQ_API_KEY_MISSING") {
          throw new Error("GROQ_API_KEY_MISSING");
        }
        if (response.status === 429) {
          throw new Error("429");
        }
        throw new Error(errorData.error || "Failed to process trade cycle");
      }

      const result = await response.json();
      trackRequest();

      lastAiMarketData = marketData;

      const decision: Partial<TradeIntent> =
        result.decision.side === "HOLD"
          ? { side: "HOLD" as any, reason: result.decision.reason }
          : {
              side: result.decision.side as "BUY" | "SELL",
              asset: result.decision.asset,
              size: result.decision.size,
              stopLoss: result.decision.stopLoss,
              takeProfit: result.decision.takeProfit,
              orderType: result.decision.orderType || "MARKET",
              limitPrice: result.decision.limitPrice,
              reason: result.decision.reason,
              timestamp: Date.now(),
            };

      return {
        decision,
        validation: result.validation,
      };
    } catch (error: any) {
      if (error.message === "GROQ_API_KEY_MISSING") {
        throw error;
      }

      const errorString = error.message || JSON.stringify(error);
      if (errorString.includes("429")) {
        isGroqExhausted = true;
        groqResetTime = Date.now() + 5 * 60 * 1000; // 5 min cooldown
        console.error("Groq rate limited. Entering 5-minute cooldown.");
        return {
          decision: {
            side: "HOLD" as any,
            reason:
              "AI Engine is currently in cooldown due to rate limits. Maintaining current positions for safety.",
            timestamp: Date.now(),
          },
          validation: {
            score: 100,
            comment: "System: Safety mode active during AI cooldown.",
          },
        };
      }

      console.error("Groq trade cycle failed:", error);
      const normalizedReason = normalizeAiMessage(
        error.message || "Unknown error",
      );
      return {
        decision: {
          side: "HOLD" as any,
          reason: normalizedReason,
          timestamp: Date.now(),
        },
        validation: {
          score: 50,
          comment:
            "System: Risk Router unavailable. Defaulting to neutral safety score.",
        },
      };
    }
  },

  getQuotaStatus() {
    const now = Date.now();
    while (
      requestTimestamps.length > 0 &&
      requestTimestamps[0] < now - RATE_WINDOW_MS
    ) {
      requestTimestamps.shift();
    }
    return {
      isExhausted: isGroqExhausted && Date.now() < groqResetTime,
      resetTime: groqResetTime,
      requestsInWindow: requestTimestamps.length,
      maxRequestsPerWindow: MAX_REQUESTS_PER_WINDOW,
    };
  },

  async getMarketSentiment(marketData: MarketData): Promise<string> {
    if (isGroqExhausted && Date.now() < groqResetTime) {
      return lastSentimentText || "Sentiment analysis unavailable.";
    }
    if (isRateLimited()) {
      return lastSentimentText || "Sentiment paused — rate limit approaching.";
    }

    try {
      // Only send the necessary price data to avoid 413 errors
      const payload = {
        btc: marketData.btc,
        eth: marketData.eth,
      };

      const response = await fetchJsonWithTimeout(
        "/api/ai/market-sentiment",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ marketData: payload }),
        },
        5000,
      );

      if (!response.ok) {
        if (response.status === 429) {
          isGroqExhausted = true;
          groqResetTime = Date.now() + 5 * 60 * 1000;
        }

        return lastSentimentText || "Sentiment analysis unavailable.";
      }

      const data = await response.json();
      trackRequest();
      const sentiment = data.sentiment || "Market neutral.";
      lastSentimentText = sentiment;
      return sentiment;
    } catch (error) {
      return lastSentimentText || "Sentiment analysis unavailable.";
    }
  },

  async checkConfig(): Promise<boolean> {
    try {
      const response = await fetchJsonWithTimeout(
        "/api/ai/config",
        undefined,
        4000,
      );
      const data = await response.json();
      return !!data.hasGroqKey;
    } catch {
      return false;
    }
  },

  resetQuota() {
    isGroqExhausted = false;
    groqResetTime = 0;
  },

  async reassessPosition(
    strategy: string,
    riskProfile: string,
    marketData: MarketData,
    position: TradeIntent,
  ): Promise<{ action: "KEEP" | "CLOSE"; confidence: number; reason: string }> {
    const fallback = {
      action: "KEEP" as const,
      confidence: 50,
      reason: "Reassessment unavailable — defaulting to keep.",
    };

    if (isGroqExhausted && Date.now() < groqResetTime) return fallback;
    if (isRateLimited())
      return { ...fallback, reason: "Rate limit — keeping position open." };

    try {
      const currentPrice =
        marketData[position.asset === "BTC" ? "btc" : "eth"]?.price || 0;
      const entryPrice = position.entryPrice || currentPrice || 1;
      const holdMinutes = position.timestamp
        ? Math.round((Date.now() - position.timestamp) / 60_000)
        : 0;

      const response = await fetchJsonWithTimeout(
        "/api/ai/reassess-position",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            strategy,
            riskProfile,
            marketData: {
              btc: marketData.btc,
              eth: marketData.eth,
              _indicators: marketData.indicators
                ? {
                    btc: marketData.indicators.btc,
                    eth: marketData.indicators.eth,
                  }
                : undefined,
            },
            position: {
              side: position.side,
              asset: position.asset,
              entryPrice,
              stopLoss: position.stopLoss,
              takeProfit: position.takeProfit,
              trailingStopActive: position.trailingStopActive || false,
              holdMinutes,
            },
          }),
        },
        6000,
      );

      if (!response.ok) return fallback;
      const result = await response.json();
      trackRequest();

      return {
        action: result.action === "CLOSE" ? "CLOSE" : "KEEP",
        confidence:
          typeof result.confidence === "number" ? result.confidence : 50,
        reason:
          typeof result.reason === "string"
            ? result.reason
            : "Reassessment completed.",
      };
    } catch {
      return fallback;
    }
  },

  async getGridAdvisory(
    marketData: MarketData,
    currentAsset?: string,
  ): Promise<{
    recommendedAsset: "BTC" | "ETH";
    shouldActivate: boolean;
    spacingBias: "tighter" | "normal" | "wider";
    reason: string;
    suggestedRangeLow?: number;
    suggestedRangeHigh?: number;
    suggestedGridLevels?: number;
  }> {
    const fallback = {
      recommendedAsset: (currentAsset === "ETH" ? "ETH" : "BTC") as
        | "BTC"
        | "ETH",
      shouldActivate: true,
      spacingBias: "normal" as const,
      reason: "Using default grid settings.",
    };
    if (isGroqExhausted && Date.now() < groqResetTime) return fallback;
    if (isRateLimited())
      return {
        ...fallback,
        reason: "Rate limit approaching — using defaults.",
      };

    try {
      const response = await fetchJsonWithTimeout(
        "/api/ai/grid-advisory",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            marketData: {
              btc: marketData.btc,
              eth: marketData.eth,
              _indicators: marketData.indicators
                ? {
                    btc: marketData.indicators.btc,
                    eth: marketData.indicators.eth,
                  }
                : undefined,
            },
            currentAsset,
          }),
        },
        5000,
      );

      if (!response.ok) return fallback;
      const result = await response.json();
      trackRequest();

      return {
        recommendedAsset: result.recommendedAsset === "ETH" ? "ETH" : "BTC",
        shouldActivate: result.shouldActivate !== false,
        spacingBias: ["tighter", "normal", "wider"].includes(result.spacingBias)
          ? result.spacingBias
          : "normal",
        reason:
          typeof result.reason === "string"
            ? result.reason
            : "AI advisory received.",
        suggestedRangeLow:
          typeof result.suggestedRangeLow === "number" &&
          result.suggestedRangeLow > 0
            ? result.suggestedRangeLow
            : undefined,
        suggestedRangeHigh:
          typeof result.suggestedRangeHigh === "number" &&
          result.suggestedRangeHigh > 0
            ? result.suggestedRangeHigh
            : undefined,
        suggestedGridLevels:
          typeof result.suggestedGridLevels === "number" &&
          result.suggestedGridLevels >= 2
            ? result.suggestedGridLevels
            : undefined,
      };
    } catch {
      return fallback;
    }
  },
};
