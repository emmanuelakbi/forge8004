import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import path from "path";
import Groq from "groq-sdk";

dotenv.config({ path: ".env.local" });
dotenv.config();

const AI_MODEL = "openai/gpt-oss-120b";
const NOTIONAL_GUIDE_BY_RISK = {
  conservative: 1200,
  balanced: 2500,
  aggressive: 4000,
} as const;

const STRATEGY_DESCRIPTIONS: Record<string, string> = {
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

const RISK_PROFILE_DESCRIPTIONS: Record<string, string> = {
  conservative:
    "You are CONSERVATIVE. Prioritize capital preservation above all. Only trade when the setup is very clear and conviction is high. Use smaller position sizes (well under the cap). Set tight stop-losses (2-3% max). Prefer HOLD over marginal setups. Require strong confirmation from multiple timeframes before entering. If in doubt, stay out.",
  balanced:
    "You are BALANCED. Take trades with reasonable conviction but manage risk carefully. Use moderate position sizes (around 60-80% of the cap). Set stop-losses at 3-5%. Enter when the setup aligns with the strategy and at least one confirming signal is present. Balance opportunity with protection.",
  aggressive:
    "You are AGGRESSIVE. Maximize opportunity when setups appear. Use larger position sizes (up to the full cap). Accept wider stop-losses (5-7%) to give trades room. Enter on earlier signals without waiting for full confirmation. Favor action over caution, but still respect the strategy logic.",
};

const VALID_SIDES = new Set(["BUY", "SELL", "HOLD"]);
const VALID_ASSETS = new Set(["BTC", "ETH"]);

/** Build a multi-timeframe market summary string for AI prompts */
function buildMarketPromptBlock(marketData: any): string {
  const btcInd = marketData._indicators?.btc;
  const ethInd = marketData._indicators?.eth;

  let block = `Market Data:
              - BTC: $${marketData.btc.price} (24h Change: ${marketData.btc.change24h}%)`;
  if (btcInd) {
    block += ` | Vol: $${(btcInd.volume24h / 1e9).toFixed(1)}B`;
    if (btcInd.rsi14 != null) block += ` | RSI(14): ${btcInd.rsi14}`;
  }
  block += `\n              - ETH: $${marketData.eth.price} (24h Change: ${marketData.eth.change24h}%)`;
  if (ethInd) {
    block += ` | Vol: $${(ethInd.volume24h / 1e9).toFixed(1)}B`;
    if (ethInd.rsi14 != null) block += ` | RSI(14): ${ethInd.rsi14}`;
  }

  // Multi-timeframe support/resistance levels
  if (btcInd?.levels) {
    block += `\n\n              BTC Multi-Timeframe Levels:`;
    for (const tf of ["5m", "15m", "1h"] as const) {
      const l = btcInd.levels[tf];
      if (l)
        block += `\n              - ${tf.toUpperCase()}: Support $${l.support?.toFixed(0) ?? "N/A"} | Resistance $${l.resistance?.toFixed(0) ?? "N/A"}`;
    }
  }
  if (ethInd?.levels) {
    block += `\n              ETH Multi-Timeframe Levels:`;
    for (const tf of ["5m", "15m", "1h"] as const) {
      const l = ethInd.levels[tf];
      if (l)
        block += `\n              - ${tf.toUpperCase()}: Support $${l.support?.toFixed(0) ?? "N/A"} | Resistance $${l.resistance?.toFixed(0) ?? "N/A"}`;
    }
  }

  // Recent 5M candles (last 5 for context)
  if (btcInd?.candles?.["5m"]?.length > 0) {
    const recent = btcInd.candles["5m"].slice(-5);
    block += `\n\n              BTC Recent 5M Candles: ${recent.map((c: any) => `[O:${c.open.toFixed(0)} H:${c.high.toFixed(0)} L:${c.low.toFixed(0)} C:${c.close.toFixed(0)}]`).join(" ")}`;
  }
  if (ethInd?.candles?.["5m"]?.length > 0) {
    const recent = ethInd.candles["5m"].slice(-5);
    block += `\n              ETH Recent 5M Candles: ${recent.map((c: any) => `[O:${c.open.toFixed(0)} H:${c.high.toFixed(0)} L:${c.low.toFixed(0)} C:${c.close.toFixed(0)}]`).join(" ")}`;
  }

  return block;
}

function validateAiTradeResponse(result: any): {
  valid: boolean;
  sanitized: any;
} {
  if (!result || typeof result !== "object")
    return { valid: false, sanitized: null };
  const d = result.decision;
  const v = result.validation;
  if (!d || typeof d !== "object" || !v || typeof v !== "object")
    return { valid: false, sanitized: null };

  const side = typeof d.side === "string" ? d.side.toUpperCase() : "HOLD";
  if (!VALID_SIDES.has(side)) return { valid: false, sanitized: null };

  const asset = typeof d.asset === "string" ? d.asset.toUpperCase() : "BTC";
  const score =
    typeof v.score === "number" && v.score >= 0 && v.score <= 100
      ? v.score
      : 50;

  return {
    valid: true,
    sanitized: {
      decision: {
        side,
        asset: VALID_ASSETS.has(asset) ? asset : "BTC",
        size:
          typeof d.size === "number" && Number.isFinite(d.size)
            ? d.size
            : undefined,
        stopLoss:
          typeof d.stopLoss === "number" && Number.isFinite(d.stopLoss)
            ? d.stopLoss
            : undefined,
        takeProfit:
          typeof d.takeProfit === "number" && Number.isFinite(d.takeProfit)
            ? d.takeProfit
            : undefined,
        orderType:
          typeof d.orderType === "string" &&
          d.orderType.toUpperCase() === "LIMIT"
            ? "LIMIT"
            : "MARKET",
        limitPrice:
          typeof d.limitPrice === "number" && Number.isFinite(d.limitPrice)
            ? d.limitPrice
            : undefined,
        reason:
          typeof d.reason === "string"
            ? d.reason.slice(0, 500)
            : "No rationale provided.",
      },
      validation: {
        score,
        comment:
          typeof v.comment === "string"
            ? v.comment.slice(0, 300)
            : "Validation recorded.",
      },
    },
  };
}

const aiRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 20, // Stay under Groq free tier (30/min) with headroom
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "RATE_LIMITED",
    message: "Too many AI requests. Please wait.",
  },
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3001);
  const isLocalDev = process.env.NODE_ENV !== "production";
  const siteUrl = (process.env.APP_URL || `http://localhost:${PORT}`).replace(
    /\/+$/,
    "",
  );
  const noIndexPaths = ["/brand", "/pitch", "/social-kit"];
  const sitemapPaths = [
    "/",
    "/how-it-works",
    "/trust-center",
    "/docs",
    "/contact",
    "/privacy",
    "/terms",
  ];

  const applyRobotsHeader = (req: express.Request, res: express.Response) => {
    const pathname = req.path;
    if (
      noIndexPaths.some(
        (blockedPath) =>
          pathname === blockedPath || pathname.startsWith(`${blockedPath}/`),
      )
    ) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
    }
  };

  app.disable("x-powered-by");
  app.use(express.json({ limit: "100kb" }));
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    applyRobotsHeader(req, res);
    if (!isLocalDev) {
      res.setHeader("X-Frame-Options", "DENY");
    }
    next();
  });

  const sendDeprecatedAgentRoute = (res: express.Response) => {
    res.status(410).json({
      error: "AGENT_ROUTE_DEPRECATED",
      message:
        "This demo agent route has been retired. The app now reads agent data directly from the authenticated Firestore workspace.",
    });
  };

  app.get("/robots.txt", (_req, res) => {
    res
      .type("text/plain")
      .send(
        [
          "User-agent: *",
          "Allow: /",
          "Disallow: /brand",
          "Disallow: /pitch",
          "Disallow: /social-kit",
          "",
          `Sitemap: ${siteUrl}/sitemap.xml`,
        ].join("\n"),
      );
  });

  app.get("/sitemap.xml", (_req, res) => {
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapPaths.map((pathname) => `  <url><loc>${siteUrl}${pathname}</loc></url>`).join("\n")}
</urlset>`;
    res.type("application/xml").send(body);
  });

  // API Routes
  app.get("/api/agents", (_req, res) => sendDeprecatedAgentRoute(res));
  app.get("/api/agents/:agentId", (_req, res) => sendDeprecatedAgentRoute(res));
  app.post("/api/agents/:agentId/trade-intent", (_req, res) =>
    sendDeprecatedAgentRoute(res),
  );

  // Groq AI Endpoints
  app.post("/api/ai/trade-cycle", aiRateLimiter, async (req, res) => {
    const {
      agentId,
      strategy,
      riskProfile,
      marketData,
      activePositions,
      availableCapital,
      totalTreasury,
    } = req.body;
    const apiKey = process.env.GROQ_API_KEY;
    const normalizedRiskProfile =
      riskProfile === "conservative" || riskProfile === "aggressive"
        ? riskProfile
        : "balanced";
    const allocationPct =
      normalizedRiskProfile === "conservative"
        ? 0.1
        : normalizedRiskProfile === "aggressive"
          ? 0.4
          : 0.25;
    const dynamicNotionalCap =
      typeof totalTreasury === "number" && totalTreasury > 0
        ? Math.min(
            totalTreasury * allocationPct,
            typeof availableCapital === "number" && availableCapital > 0
              ? availableCapital
              : totalTreasury * allocationPct,
          )
        : NOTIONAL_GUIDE_BY_RISK[normalizedRiskProfile]; // Fallback to hardcoded if no treasury info
    const suggestedNotionalCap = Math.max(50, dynamicNotionalCap);
    const strategyDescription =
      STRATEGY_DESCRIPTIONS[strategy] || STRATEGY_DESCRIPTIONS.momentum;
    const riskProfileDescription =
      RISK_PROFILE_DESCRIPTIONS[normalizedRiskProfile] ||
      RISK_PROFILE_DESCRIPTIONS.balanced;

    if (!apiKey) {
      return res.status(500).json({ error: "GROQ_API_KEY_MISSING" });
    }

    try {
      const groq = new Groq({ apiKey });
      const marketBlock = buildMarketPromptBlock(marketData);
      const positionsBlock =
        activePositions && activePositions.length > 0
          ? activePositions
              .map(
                (p: any) =>
                  `- ${p.side} ${p.size} ${p.asset} at ${p.entryPrice} (Unrealized PnL: ${p.unrealizedPnL.toFixed(2)}%)`,
              )
              .join("\n")
          : "None";

      const userPrompt = [
        "Perform two tasks and return the result in JSON format:",
        "",
        "TASK 1: TRADE DECISION",
        `Strategy: "${strategy}"`,
        `Strategy behavior: ${strategyDescription}`,
        `Risk Profile: ${riskProfileDescription}`,
        `Capital guide: max ~$${suggestedNotionalCap.toLocaleString()} per trade (${Math.round(allocationPct * 100)}% of total funds).`,
        marketBlock,
        "",
        "Current Active Positions:",
        positionsBlock,
        "",
        "Decide if you should BUY or SELL BTC or ETH, or HOLD.",
        "",
        "GUIDELINES:",
        "- Follow the strategy behavior description above. Your decision MUST align with the strategy logic.",
        "- Evaluate BOTH BTC and ETH every cycle instead of defaulting to BTC.",
        "- Only reuse the same asset if it still has the clearest edge.",
        "- Use the multi-timeframe support/resistance levels to identify where price is within the range. BUY near support, SELL near resistance.",
        "- Use the 5M candle data to confirm short-term price action and momentum direction.",
        "- If you already have a position in an asset, consider if you should HOLD it, add to it, or CLOSE it.",
        "- 'size' must be the asset amount. Scale your size based on the risk profile — conservative should use well under the cap, aggressive can use up to the full cap.",
        "- If neither BTC nor ETH has a convincing setup, return HOLD.",
        "- Provide 'stopLoss' and 'takeProfit' as absolute price levels.",
        "- Provide a clear 'reason' that references specific indicators (RSI, volume, price trend, support/resistance levels).",
        "- If RSI > 70, the asset may be overbought (favor SELL or HOLD). If RSI < 30, it may be oversold (favor BUY or HOLD).",
        "- Use volume to gauge conviction: high volume confirms moves, low volume suggests caution.",
        '- \'side\' MUST be exactly one of: "BUY", "SELL", or "HOLD". No other values.',
        '- \'asset\' MUST be exactly "BTC" or "ETH".',
        "",
        "ORDER TYPE:",
        '- You may set "orderType" to "MARKET" (execute now) or "LIMIT" (wait for a better price).',
        "- Use LIMIT when price is not at an ideal entry but a nearby support/resistance level would be better.",
        '- If orderType is "LIMIT", you MUST provide "limitPrice" — the price at which the order should fill.',
        "- For a LIMIT BUY, limitPrice must be BELOW the current price (you want to buy cheaper).",
        "- For a LIMIT SELL, limitPrice must be ABOVE the current price (you want to sell higher).",
        "- If unsure, default to MARKET.",
        "",
        "TASK 2: RISK VALIDATION",
        `Risk Profile: "${riskProfile}"`,
        "Score the trade decision against the risk profile (0-100).",
        "- Conservative: score HIGH (80+) only if the setup is very clear, size is small, and stop-loss is tight. Score LOW if the trade feels speculative.",
        "- Balanced: score based on setup quality and risk/reward ratio. 60-80 for decent setups, 80+ for strong ones.",
        "- Aggressive: be more lenient. Score 60+ for any reasonable setup. Only score below 50 if the trade contradicts the strategy.",
        "Provide a score (0-100) and a short comment.",
        "",
        'Return JSON: { "decision": { "side": "BUY"|"SELL"|"HOLD", "asset": "BTC"|"ETH", "size": number, "stopLoss": number, "takeProfit": number, "orderType": "MARKET"|"LIMIT", "limitPrice": number|null, "reason": "string" }, "validation": { "score": number, "comment": "string" } }',
      ].join("\n");

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are an expert AI crypto trading system. You analyze market data and execute trades based on a specific strategy and risk profile. You MUST return ONLY a valid JSON object. Do not include any other text, markdown, or explanations.",
          },
          { role: "user", content: userPrompt },
        ],
        model: AI_MODEL,
        response_format: { type: "json_object" },
      });

      let content = completion.choices[0]?.message?.content;
      if (!content) throw new Error("No content from Groq");

      console.log(`[Groq AI] Trade cycle response: ${content}`);

      // Clean potential markdown or prefixes
      content = content.trim();
      if (content.includes("```json")) {
        content = content.split("```json")[1].split("```")[0].trim();
      } else if (content.includes("```")) {
        content = content.split("```")[1].split("```")[0].trim();
      }

      const firstBrace = content.indexOf("{");
      const lastBrace = content.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1) {
        content = content.substring(firstBrace, lastBrace + 1);
      }

      try {
        const parsed = JSON.parse(content);
        const { valid, sanitized } = validateAiTradeResponse(parsed);
        if (!valid) {
          console.error("AI response failed schema validation:", content);
          throw new Error("AI response did not match expected schema");
        }
        res.json(sanitized);
      } catch (parseError) {
        console.error("Failed to parse Groq response:", content);
        throw new Error("Invalid JSON response from AI engine");
      }
    } catch (error: any) {
      console.error("Groq trade cycle failed:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  // Dedicated reassessment endpoint — asks AI "should I keep or close this position?"
  app.post("/api/ai/reassess-position", aiRateLimiter, async (req, res) => {
    const { strategy, riskProfile, marketData, position } = req.body;
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "GROQ_API_KEY_MISSING" });

    const strategyDescription =
      STRATEGY_DESCRIPTIONS[strategy] || STRATEGY_DESCRIPTIONS.momentum;
    const asset = position.asset || "BTC";
    const currentPrice =
      asset === "BTC" ? marketData.btc?.price : marketData.eth?.price;
    const entryPrice = position.entryPrice || currentPrice || 1;
    const unrealizedPnlPct =
      position.side === "BUY"
        ? ((currentPrice - entryPrice) / entryPrice) * 100
        : ((entryPrice - currentPrice) / entryPrice) * 100;
    const holdMinutes = position.holdMinutes || 0;

    // Build candle context for the position's asset
    const assetKey = asset === "BTC" ? "btc" : "eth";
    const ind = marketData._indicators?.[assetKey];
    let candleContext = "";
    if (ind?.levels) {
      candleContext += `\n              ${asset} Multi-Timeframe Levels:`;
      for (const tf of ["5m", "15m", "1h"]) {
        const l = ind.levels[tf];
        if (l)
          candleContext += `\n              - ${tf.toUpperCase()}: Support $${l.support?.toFixed(0) ?? "N/A"} | Resistance $${l.resistance?.toFixed(0) ?? "N/A"}`;
      }
    }
    if (ind?.candles?.["5m"]?.length > 0) {
      const recent = ind.candles["5m"].slice(-5);
      candleContext += `\n              ${asset} Recent 5M Candles: ${recent.map((c: any) => `[O:${c.open.toFixed(0)} H:${c.high.toFixed(0)} L:${c.low.toFixed(0)} C:${c.close.toFixed(0)}]`).join(" ")}`;
    }

    try {
      const groq = new Groq({ apiKey });

      const userPrompt = [
        `You have an OPEN ${position.side} position in ${asset}. Decide whether to KEEP it open or CLOSE it.`,
        "",
        "POSITION DETAILS:",
        `- Side: ${position.side}`,
        `- Asset: ${asset}`,
        `- Entry Price: $${entryPrice}`,
        `- Current Price: $${currentPrice}`,
        `- Unrealized PnL: ${unrealizedPnlPct.toFixed(3)}%`,
        `- Hold Duration: ${holdMinutes} minutes`,
        `- Stop Loss: $${position.stopLoss || "N/A"}`,
        `- Take Profit: $${position.takeProfit || "N/A"}`,
        `- Trailing Stop Active: ${position.trailingStopActive ? "Yes" : "No"}`,
        "",
        `STRATEGY: "${strategy}"`,
        `Strategy behavior: ${strategyDescription}`,
        `Risk Profile: "${riskProfile}"`,
        "",
        buildMarketPromptBlock(marketData),
        candleContext,
        "",
        "GUIDELINES:",
        "- This is a REVIEW of an existing position, NOT a new entry decision.",
        "- Use the support/resistance levels to evaluate if the original thesis is still intact.",
        "- For range_trading: if price is still within the 15M/1H range and hasn't broken support, KEEP.",
        "- Favor KEEP if the position is profitable or near breakeven and the trend hasn't reversed.",
        "- Favor CLOSE only if there are clear signs the setup has broken down (price broke through key levels, RSI extreme against the position, trend reversal on 15M/1H).",
        "- A flat or slightly negative position is NOT a reason to close — the thesis may still play out.",
        '- \'action\' MUST be exactly "KEEP" or "CLOSE".',
        "",
        'Return JSON: { "action": "KEEP"|"CLOSE", "confidence": number (0-100), "reason": "string explaining why" }',
      ].join("\n");

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are an expert AI crypto position manager. You review EXISTING open positions and decide whether to KEEP them open or CLOSE them. You MUST return ONLY a valid JSON object.",
          },
          { role: "user", content: userPrompt },
        ],

        model: AI_MODEL,
        response_format: { type: "json_object" },
      });

      let content = completion.choices[0]?.message?.content;
      if (!content) throw new Error("No content from Groq");

      console.log(`[Groq AI] Reassessment response: ${content}`);

      content = content.trim();
      if (content.includes("```json")) {
        content = content.split("```json")[1].split("```")[0].trim();
      } else if (content.includes("```")) {
        content = content.split("```")[1].split("```")[0].trim();
      }
      const firstBrace = content.indexOf("{");
      const lastBrace = content.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1) {
        content = content.substring(firstBrace, lastBrace + 1);
      }

      const parsed = JSON.parse(content);
      const action =
        typeof parsed.action === "string" &&
        parsed.action.toUpperCase() === "CLOSE"
          ? "CLOSE"
          : "KEEP";
      const confidence =
        typeof parsed.confidence === "number" &&
        parsed.confidence >= 0 &&
        parsed.confidence <= 100
          ? parsed.confidence
          : 50;
      const reason =
        typeof parsed.reason === "string"
          ? parsed.reason.slice(0, 500)
          : "Reassessment completed.";

      res.json({ action, confidence, reason });
    } catch (error: any) {
      console.error("Groq reassessment failed:", error);
      // Default to KEEP on error — don't close positions because the AI is down
      res.json({
        action: "KEEP",
        confidence: 50,
        reason:
          "AI reassessment unavailable — defaulting to keep position open.",
      });
    }
  });

  app.post("/api/ai/market-sentiment", aiRateLimiter, async (req, res) => {
    const { marketData } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "GROQ_API_KEY_MISSING" });
    }

    try {
      const groq = new Groq({ apiKey });
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are a senior financial analyst. Return a JSON object with a 'sentiment' key containing a detailed 2-3 sentence market analysis including trends and potential outlook.",
          },
          {
            role: "user",
            content: `Analyze the following market data and provide a detailed sentiment analysis in JSON format: BTC $${marketData.btc.price} (${marketData.btc.change24h}% 24h), ETH $${marketData.eth.price} (${marketData.eth.change24h}% 24h).`,
          },
        ],
        model: AI_MODEL,
        response_format: { type: "json_object" },
      });

      let content = completion.choices[0]?.message?.content;
      if (!content) throw new Error("No content from Groq");

      console.log(`[Groq AI] Sentiment response: ${content}`);

      // Clean potential markdown or prefixes if the model ignores the instruction
      content = content.trim();
      if (content.includes("```json")) {
        content = content.split("```json")[1].split("```")[0].trim();
      } else if (content.includes("```")) {
        content = content.split("```")[1].split("```")[0].trim();
      }

      // If it still starts with something else, try to find the first '{'
      const firstBrace = content.indexOf("{");
      const lastBrace = content.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1) {
        content = content.substring(firstBrace, lastBrace + 1);
      }

      try {
        const result = JSON.parse(content);
        res.json({ sentiment: result.sentiment || "Market neutral." });
      } catch (parseError) {
        console.error("Failed to parse Groq sentiment response:", content);
        throw new Error("Invalid JSON response from AI engine");
      }
    } catch (error: any) {
      console.error("Groq sentiment analysis failed:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  app.get("/api/ai/config", (req, res) => {
    res.json({
      hasGroqKey: !!process.env.GROQ_API_KEY,
    });
  });

  app.post("/api/ai/grid-advisory", aiRateLimiter, async (req, res) => {
    const { marketData, currentAsset } = req.body;
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey)
      return res.json({
        recommendedAsset: currentAsset || "BTC",
        shouldActivate: true,
        spacingBias: "normal",
        reason: "No AI key — using defaults.",
      });

    try {
      const groq = new Groq({ apiKey });
      const btcInd = marketData._indicators?.btc;
      const ethInd = marketData._indicators?.eth;
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a grid trading advisor. Return ONLY valid JSON.",
          },
          {
            role: "user",
            content: `A spot grid bot needs guidance. Current grid asset: ${currentAsset || "none"}.
Market: BTC $${marketData.btc.price} (${marketData.btc.change24h}% 24h)${btcInd?.rsi14 != null ? ` RSI:${btcInd.rsi14}` : ""}${btcInd?.volume24h ? ` Vol:$${(btcInd.volume24h / 1e9).toFixed(1)}B` : ""}${btcInd?.levels?.["1h"] ? ` | 1H S:$${btcInd.levels["1h"].support?.toFixed(0) || "N/A"} R:$${btcInd.levels["1h"].resistance?.toFixed(0) || "N/A"}` : ""} | ETH $${marketData.eth.price} (${marketData.eth.change24h}% 24h)${ethInd?.rsi14 != null ? ` RSI:${ethInd.rsi14}` : ""}${ethInd?.volume24h ? ` Vol:$${(ethInd.volume24h / 1e9).toFixed(1)}B` : ""}${ethInd?.levels?.["1h"] ? ` | 1H S:$${ethInd.levels["1h"].support?.toFixed(0) || "N/A"} R:$${ethInd.levels["1h"].resistance?.toFixed(0) || "N/A"}` : ""}

Return JSON: { "recommendedAsset": "BTC"|"ETH", "shouldActivate": true|false, "spacingBias": "tighter"|"normal"|"wider", "reason": "string", "suggestedRangeLow": number, "suggestedRangeHigh": number, "suggestedGridLevels": number }

Rules:
- recommendedAsset: pick the asset with lower volatility and more range-bound behavior.
- shouldActivate: false if both assets have >3% 24h moves or RSI is extreme (<20 or >80).
- spacingBias: "wider" if volatility is elevated, "tighter" if very calm, "normal" otherwise.
- suggestedRangeLow: use the 1H support level as a guide. For BTC typically 1-3% below current price; for ETH 2-4% below. Keep the range TIGHT.
- suggestedRangeHigh: use the 1H resistance level as a guide. For BTC typically 1-3% above current price; for ETH 2-4% above.
- The total range should be 2-5% of current price for BTC, 3-7% for ETH. Grid bots profit from frequent fills, not wide ranges.
- suggestedGridLevels: 6-12 levels. Each grid spacing should be $100-$300 for BTC, $5-$20 for ETH.
- reason: 1 sentence explaining your choice.`,
          },
        ],
        model: AI_MODEL,
        response_format: { type: "json_object" },
      });

      let content = completion.choices[0]?.message?.content?.trim();
      if (!content) throw new Error("No content");
      const firstBrace = content.indexOf("{");
      const lastBrace = content.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1)
        content = content.substring(firstBrace, lastBrace + 1);

      const parsed = JSON.parse(content);
      const chosenAsset = parsed.recommendedAsset === "ETH" ? "ETH" : "BTC";
      const chosenPrice =
        chosenAsset === "BTC"
          ? marketData.btc?.price || 0
          : marketData.eth?.price || 0;

      // Validate suggested range makes sense
      let suggestedRangeLow =
        typeof parsed.suggestedRangeLow === "number" &&
        parsed.suggestedRangeLow > 0
          ? parsed.suggestedRangeLow
          : undefined;
      let suggestedRangeHigh =
        typeof parsed.suggestedRangeHigh === "number" &&
        parsed.suggestedRangeHigh > 0
          ? parsed.suggestedRangeHigh
          : undefined;
      const suggestedGridLevels =
        typeof parsed.suggestedGridLevels === "number" &&
        parsed.suggestedGridLevels >= 2 &&
        parsed.suggestedGridLevels <= 50
          ? Math.round(parsed.suggestedGridLevels)
          : undefined;

      // Sanity: range must contain current price and low < high
      if (suggestedRangeLow && suggestedRangeHigh) {
        if (
          suggestedRangeLow >= suggestedRangeHigh ||
          (chosenPrice > 0 &&
            (suggestedRangeLow > chosenPrice ||
              suggestedRangeHigh < chosenPrice))
        ) {
          suggestedRangeLow = undefined;
          suggestedRangeHigh = undefined;
        }
      }

      // Clamp range to max 3% below and 3% above current price for BTC, 4% for ETH
      if (suggestedRangeLow && suggestedRangeHigh && chosenPrice > 0) {
        const maxRangePct = chosenAsset === "BTC" ? 0.03 : 0.04;
        const minLow = chosenPrice * (1 - maxRangePct);
        const maxHigh = chosenPrice * (1 + maxRangePct);
        suggestedRangeLow = Math.max(suggestedRangeLow, minLow);
        suggestedRangeHigh = Math.min(suggestedRangeHigh, maxHigh);
      }

      res.json({
        recommendedAsset: chosenAsset,
        shouldActivate:
          typeof parsed.shouldActivate === "boolean"
            ? parsed.shouldActivate
            : true,
        spacingBias: ["tighter", "normal", "wider"].includes(parsed.spacingBias)
          ? parsed.spacingBias
          : "normal",
        reason:
          typeof parsed.reason === "string"
            ? parsed.reason.slice(0, 300)
            : "AI advisory processed.",
        suggestedRangeLow,
        suggestedRangeHigh,
        suggestedGridLevels,
      });
    } catch (error) {
      console.error("Grid advisory AI failed:", error);
      res.json({
        recommendedAsset: currentAsset || "BTC",
        shouldActivate: true,
        spacingBias: "normal",
        reason: "AI advisory unavailable — using defaults.",
      });
    }
  });

  app.get("/api/agents/:agentId/trade-history", (_req, res) =>
    sendDeprecatedAgentRoute(res),
  );

  // ─── Live Market Feed Endpoints ──────────────────────────────────────────

  const MARKET_COINS = [
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
  ];

  let coinListCache: any = null;
  let coinListCacheTime = 0;
  const COIN_LIST_TTL = 15_000;

  app.get("/api/market/coins", async (_req, res) => {
    const now = Date.now();
    if (coinListCache && now - coinListCacheTime < COIN_LIST_TTL) {
      return res.json(coinListCache);
    }

    try {
      const symbols = MARKET_COINS.map((c) => c.symbol);
      const tickerUrl = `https://data-api.binance.vision/api/v3/ticker/24hr?symbols=${JSON.stringify(symbols)}`;
      const data = await fetchBinance(tickerUrl, 8000);

      const coins = MARKET_COINS.map((coin) => {
        const ticker = data.find((t: any) => t.symbol === coin.symbol);
        if (!ticker) return null;
        return {
          id: coin.id,
          symbol: coin.shortName,
          name: coin.name,
          binanceSymbol: coin.symbol,
          price: parseFloat(ticker.lastPrice),
          change24h: parseFloat(ticker.priceChangePercent),
          high24h: parseFloat(ticker.highPrice),
          low24h: parseFloat(ticker.lowPrice),
          volume24h: parseFloat(ticker.quoteVolume),
          trades24h: parseInt(ticker.count, 10),
        };
      }).filter(Boolean);

      coinListCache = coins;
      coinListCacheTime = now;
      res.json(coins);
    } catch (error) {
      console.error("Failed to fetch coin list:", error);
      if (coinListCache) return res.json(coinListCache);
      res.status(500).json({ error: "Failed to fetch market data" });
    }
  });

  const coinDetailCache = new Map<string, { data: any; time: number }>();
  const COIN_DETAIL_TTL = 20_000;

  app.get("/api/market/coins/:coinId", async (req, res) => {
    const coinId = req.params.coinId.toLowerCase();
    const coin = MARKET_COINS.find((c) => c.id === coinId);
    if (!coin) return res.status(404).json({ error: "Coin not found" });

    const now = Date.now();
    const cached = coinDetailCache.get(coinId);
    if (cached && now - cached.time < COIN_DETAIL_TTL) {
      return res.json(cached.data);
    }

    try {
      const [ticker, klines5m, klines15m, klines1h, klines4h, klines1d] =
        await Promise.all([
          fetchBinance(
            `https://data-api.binance.vision/api/v3/ticker/24hr?symbol=${coin.symbol}`,
          ),
          fetchBinance(
            `https://data-api.binance.vision/api/v3/klines?symbol=${coin.symbol}&interval=5m&limit=50`,
          ),
          fetchBinance(
            `https://data-api.binance.vision/api/v3/klines?symbol=${coin.symbol}&interval=15m&limit=50`,
          ),
          fetchBinance(
            `https://data-api.binance.vision/api/v3/klines?symbol=${coin.symbol}&interval=1h&limit=50`,
          ),
          fetchBinance(
            `https://data-api.binance.vision/api/v3/klines?symbol=${coin.symbol}&interval=4h&limit=50`,
          ),
          fetchBinance(
            `https://data-api.binance.vision/api/v3/klines?symbol=${coin.symbol}&interval=1d&limit=30`,
          ),
        ]);

      const parse = (raw: any[]) =>
        raw.map((k: any) => ({
          time: k[0],
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
        }));

      const candles5m = parse(klines5m);
      const candles1h = parse(klines1h);
      const candles1d = parse(klines1d);

      const closes5m = candles5m.map((c: any) => c.close);
      const closes1h = candles1h.map((c: any) => c.close);

      const sr = (candles: any[]) => {
        if (candles.length < 3) return { support: null, resistance: null };
        return {
          support: Math.min(...candles.map((c: any) => c.low)),
          resistance: Math.max(...candles.map((c: any) => c.high)),
        };
      };

      const result = {
        id: coin.id,
        symbol: coin.shortName,
        name: coin.name,
        binanceSymbol: coin.symbol,
        price: parseFloat(ticker.lastPrice),
        change24h: parseFloat(ticker.priceChangePercent),
        high24h: parseFloat(ticker.highPrice),
        low24h: parseFloat(ticker.lowPrice),
        volume24h: parseFloat(ticker.quoteVolume),
        trades24h: parseInt(ticker.count, 10),
        openPrice: parseFloat(ticker.openPrice),
        indicators: {
          rsi14_5m: computeRSI(closes5m),
          rsi14_1h: computeRSI(closes1h),
        },
        levels: {
          "5m": sr(candles5m),
          "15m": sr(parse(klines15m)),
          "1h": sr(candles1h),
          "4h": sr(parse(klines4h)),
          "1d": sr(candles1d),
        },
        candles: {
          "5m": candles5m,
          "15m": parse(klines15m),
          "1h": candles1h,
          "4h": parse(klines4h),
          "1d": candles1d,
        },
      };

      coinDetailCache.set(coinId, { data: result, time: now });
      res.json(result);
    } catch (error) {
      console.error(`Failed to fetch coin detail for ${coinId}:`, error);
      if (cached) return res.json(cached.data);
      res.status(500).json({ error: "Failed to fetch coin data" });
    }
  });

  // ─── AI Trading Signals Endpoint ──────────────────────────────────────────

  let signalsCache: any = null;
  let signalsCacheTime = 0;
  const SIGNALS_CACHE_TTL = 10 * 60_000; // 10 minutes — one AI call per 10 min
  const MIN_RISK_REWARD = 1.5; // Filter out signals below 1:1.5

  app.get("/api/signals", aiRateLimiter, async (_req, res) => {
    const now = Date.now();
    if (signalsCache && now - signalsCacheTime < SIGNALS_CACHE_TTL) {
      return res.json({ ...signalsCache, _cached: true });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GROQ_API_KEY_MISSING" });
    }

    try {
      // Fetch tickers + 1H klines for all coins (keep it lean to avoid timeouts)
      const symbols = MARKET_COINS.map((c) => c.symbol);
      const tickerUrl = `https://data-api.binance.vision/api/v3/ticker/24hr?symbols=${JSON.stringify(symbols)}`;
      const [tickers, ...klineResults] = await Promise.all([
        fetchBinance(tickerUrl, 12000),
        ...MARKET_COINS.map((c) =>
          fetchBinance(
            `https://data-api.binance.vision/api/v3/klines?symbol=${c.symbol}&interval=1h&limit=48`,
            10000,
          ),
        ),
      ]);

      // Build rich market summary for the AI
      const coinSummaries = MARKET_COINS.map((coin, idx) => {
        const ticker = tickers.find((t: any) => t.symbol === coin.symbol);
        if (!ticker) return null;

        const klines1h = klineResults[idx] || [];

        const parse = (k: any[]) =>
          k.map((c: any) => ({
            close: parseFloat(c[4]),
            high: parseFloat(c[2]),
            low: parseFloat(c[3]),
            open: parseFloat(c[1]),
          }));

        const c1h = parse(klines1h);
        const c1hRecent = c1h.slice(-12); // Last 12 hours for short-term levels
        const c1hFull = c1h; // Full 48 hours for longer-term levels

        const sr = (candles: any[]) => {
          if (candles.length < 3) return { support: null, resistance: null };
          return {
            support: Math.min(...candles.map((c: any) => c.low)),
            resistance: Math.max(...candles.map((c: any) => c.high)),
          };
        };

        return {
          symbol: coin.shortName,
          price: parseFloat(ticker.lastPrice),
          change24h: parseFloat(ticker.priceChangePercent),
          high24h: parseFloat(ticker.highPrice),
          low24h: parseFloat(ticker.lowPrice),
          volume: parseFloat(ticker.quoteVolume),
          rsi1h: computeRSI(c1h.map((c: any) => c.close)),
          levelsShort: sr(c1hRecent),
          levelsLong: sr(c1hFull),
          recent1h: c1h.slice(-5),
        };
      }).filter(Boolean);

      const marketBlock = coinSummaries
        .map((c: any) => {
          let line = `${c.symbol}: $${c.price} (${c.change24h >= 0 ? "+" : ""}${c.change24h.toFixed(2)}%) | Vol:$${(c.volume / 1e6).toFixed(0)}M`;
          if (c.rsi1h != null) line += ` | RSI(1H):${c.rsi1h}`;
          if (c.levelsShort.support)
            line += ` | 12H S:$${c.levelsShort.support.toFixed(2)} R:$${c.levelsShort.resistance.toFixed(2)}`;
          if (c.levelsLong.support)
            line += ` | 48H S:$${c.levelsLong.support.toFixed(2)} R:$${c.levelsLong.resistance.toFixed(2)}`;
          if (c.recent1h.length > 0) {
            const last3 = c.recent1h.slice(-3);
            line += ` | Last 3 1H: ${last3.map((k: any) => `[O:${k.open.toFixed(0)} H:${k.high.toFixed(0)} L:${k.low.toFixed(0)} C:${k.close.toFixed(0)}]`).join(" ")}`;
          }
          return line;
        })
        .join("\n");

      const groq = new Groq({ apiKey });
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are an expert crypto trading signal generator. Analyze multi-timeframe market data and produce high-quality actionable trading signals. Return ONLY valid JSON.",
          },
          {
            role: "user",
            content: [
              "Analyze these coins using multi-timeframe data and generate trading signals for the BEST 3-5 setups.",
              "Only generate a signal if there is a clear, high-probability setup. Quality over quantity.",
              "",
              "MARKET DATA (with 15M, 1H, and 4H support/resistance levels + recent 1H candles):",
              marketBlock,
              "",
              "For each signal, provide:",
              "- symbol: the coin ticker",
              "- side: LONG or SHORT",
              "- orderType: MARKET (enter now) or LIMIT (wait for better price)",
              "- entry: entry price (current price for MARKET, target price for LIMIT)",
              "- stopLoss: stop-loss price — MUST be placed just beyond a real support level (for LONG) or resistance level (for SHORT). Do NOT place stops in the middle of a range.",
              "- targets: array of 3-6 take-profit levels, ordered from nearest to farthest. Space them progressively.",
              "- riskReward: risk/reward ratio as a string like '1:2.5' — minimum 1:1.5 required",
              "- confidence: 1-10 rating of how strong the setup is",
              "- timeframe: SCALP (minutes-hours), SWING (hours-days), or POSITION (days-weeks)",
              "- reasoning: 2-3 sentences explaining the setup referencing specific multi-timeframe levels, RSI, volume, and candle patterns",
              "",
              "CRITICAL RULES:",
              "- Stop-loss MUST be below a real support level (LONG) or above a real resistance level (SHORT) — use the 1H or 4H levels, not arbitrary percentages",
              "- Risk-reward must be at least 1:1.5. If you can't find a setup with good R:R, skip that coin",
              "- Use multi-timeframe confluence: a signal is stronger when 15M, 1H, and 4H levels align",
              "- If RSI > 70 on 1H, favor SHORT. If RSI < 30 on 1H, favor LONG",
              "- Prefer LIMIT entries at key levels over MARKET entries — better risk-reward",
              "- Each target should correspond to a real resistance level (LONG) or support level (SHORT)",
              "- If the market is choppy with no clear levels, return fewer signals or none",
              "",
              'Return JSON: { "signals": [ { "symbol": "BTC", "side": "LONG"|"SHORT", "orderType": "MARKET"|"LIMIT", "entry": number, "stopLoss": number, "targets": [number, ...], "riskReward": "string", "confidence": number, "timeframe": "SCALP"|"SWING"|"POSITION", "reasoning": "string" } ] }',
            ].join("\n"),
          },
        ],
        model: AI_MODEL,
        response_format: { type: "json_object" },
      });

      let content = completion.choices[0]?.message?.content;
      if (!content) throw new Error("No content from Groq");

      console.log(`[Groq AI] Signals response: ${content}`);

      content = content.trim();
      if (content.includes("```json")) {
        content = content.split("```json")[1].split("```")[0].trim();
      } else if (content.includes("```")) {
        content = content.split("```")[1].split("```")[0].trim();
      }
      const firstBrace = content.indexOf("{");
      const lastBrace = content.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1) {
        content = content.substring(firstBrace, lastBrace + 1);
      }

      const parsed = JSON.parse(content);
      const rawSignals = Array.isArray(parsed.signals)
        ? parsed.signals
            .filter(
              (s: any) =>
                s && typeof s.symbol === "string" && typeof s.side === "string",
            )
            .map((s: any) => ({
              symbol: String(s.symbol).toUpperCase(),
              side: s.side === "SHORT" ? "SHORT" : "LONG",
              orderType: s.orderType === "LIMIT" ? "LIMIT" : "MARKET",
              entry: typeof s.entry === "number" ? s.entry : 0,
              stopLoss: typeof s.stopLoss === "number" ? s.stopLoss : 0,
              targets: Array.isArray(s.targets)
                ? s.targets.filter((t: any) => typeof t === "number")
                : [],
              riskReward:
                typeof s.riskReward === "string" ? s.riskReward : "N/A",
              confidence:
                typeof s.confidence === "number"
                  ? Math.min(10, Math.max(1, Math.round(s.confidence)))
                  : 5,
              timeframe: ["SCALP", "SWING", "POSITION"].includes(s.timeframe)
                ? s.timeframe
                : "SWING",
              reasoning:
                typeof s.reasoning === "string"
                  ? s.reasoning.slice(0, 500)
                  : "",
            }))
        : [];

      // Post-AI validation filters
      const signals = rawSignals
        .filter((s: any) => {
          if (s.entry <= 0 || s.stopLoss <= 0) return false;
          if (s.targets.length === 0) return false;

          // Validate stop-loss is on the correct side
          if (s.side === "LONG" && s.stopLoss >= s.entry) return false;
          if (s.side === "SHORT" && s.stopLoss <= s.entry) return false;

          // Filter out garbage targets (concatenated numbers from AI)
          // Each target must be within 50% of entry price
          s.targets = s.targets.filter(
            (t: number) => t > s.entry * 0.5 && t < s.entry * 1.5,
          );
          if (s.targets.length === 0) return false;

          // Validate targets are on the correct side
          const lastTarget = s.targets[s.targets.length - 1];
          if (s.side === "LONG" && lastTarget <= s.entry) return false;
          if (s.side === "SHORT" && lastTarget >= s.entry) return false;

          // Stop-loss must be within 15% of entry (not absurdly far)
          const slDistance = Math.abs(s.entry - s.stopLoss) / s.entry;
          if (slDistance > 0.15 || slDistance < 0.001) return false;

          // Check minimum risk-reward ratio
          const risk = Math.abs(s.entry - s.stopLoss);
          const reward = Math.abs(lastTarget - s.entry);
          if (risk <= 0 || reward / risk < MIN_RISK_REWARD) return false;

          // Recalculate the actual risk-reward string
          s.riskReward = `1:${(reward / risk).toFixed(1)}`;

          return true;
        })
        .slice(0, 6);

      const result = {
        signals,
        generatedAt: now,
        nextRefreshAt: now + SIGNALS_CACHE_TTL,
        coinCount: coinSummaries.length,
        filteredOut: rawSignals.length - signals.length,
      };

      signalsCache = result;
      signalsCacheTime = now;
      res.json(result);
    } catch (error: any) {
      console.error("Signal generation failed:", error);
      if (signalsCache) return res.json({ ...signalsCache, _cached: true });
      res.status(500).json({ error: "Failed to generate signals" });
    }
  });

  let marketCache: any = null;
  let lastFetchTime = 0;
  const CACHE_TTL = 30000; // 30 seconds cache (Binance is generous with rate limits)

  type Kline = [
    number,
    string,
    string,
    string,
    string,
    string,
    number,
    string,
    number,
    string,
    string,
    string,
  ];

  function computeRSI(closes: number[], period = 14): number | null {
    if (closes.length < period + 1) return null;
    const recent = closes.slice(-(period + 1));
    let gains = 0,
      losses = 0;
    for (let i = 1; i < recent.length; i++) {
      const diff = recent[i] - recent[i - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return Math.round((100 - 100 / (1 + rs)) * 10) / 10;
  }

  function parseKlines(raw: Kline[]) {
    return raw.map((k) => ({
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
      closeTime: k[6],
    }));
  }

  function computeSupportResistance(candles: ReturnType<typeof parseKlines>) {
    if (candles.length < 3) return { support: null, resistance: null };
    const lows = candles.map((c) => c.low);
    const highs = candles.map((c) => c.high);
    return {
      support: Math.min(...lows),
      resistance: Math.max(...highs),
    };
  }

  async function fetchBinance(url: string, timeoutMs = 15000): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`Binance ${response.status}`);
      return response.json();
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  }

  app.get("/api/market", async (req, res) => {
    const now = Date.now();

    // Return cache if it's still fresh
    if (marketCache && now - lastFetchTime < CACHE_TTL) {
      return res.json({
        ...marketCache,
        _cached: true,
        _cacheAge: now - lastFetchTime,
      });
    }

    try {
      // Phase 1: Fetch tickers (critical for price display)
      const [btcTicker, ethTicker] = await Promise.all([
        fetchBinance(
          "https://data-api.binance.vision/api/v3/ticker/24hr?symbol=BTCUSDT",
        ),
        fetchBinance(
          "https://data-api.binance.vision/api/v3/ticker/24hr?symbol=ETHUSDT",
        ),
      ]);

      // Phase 2: Fetch klines for indicators (less critical, staggered to avoid connection saturation)
      const [btc5m, btc15m, btc1h, eth5m, eth15m, eth1h] = await Promise.all([
        fetchBinance(
          "https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=5m&limit=20",
        ),
        fetchBinance(
          "https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=15m&limit=20",
        ),
        fetchBinance(
          "https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=20",
        ),
        fetchBinance(
          "https://data-api.binance.vision/api/v3/klines?symbol=ETHUSDT&interval=5m&limit=20",
        ),
        fetchBinance(
          "https://data-api.binance.vision/api/v3/klines?symbol=ETHUSDT&interval=15m&limit=20",
        ),
        fetchBinance(
          "https://data-api.binance.vision/api/v3/klines?symbol=ETHUSDT&interval=1h&limit=20",
        ),
      ]);

      const btcPrice = parseFloat(btcTicker.lastPrice);
      const ethPrice = parseFloat(ethTicker.lastPrice);
      const btcChange24h = parseFloat(btcTicker.priceChangePercent);
      const ethChange24h = parseFloat(ethTicker.priceChangePercent);
      const btcVolume24h = parseFloat(btcTicker.quoteVolume);
      const ethVolume24h = parseFloat(ethTicker.quoteVolume);

      if (!btcPrice || btcPrice <= 0 || !ethPrice || ethPrice <= 0) {
        throw new Error("Binance returned invalid prices");
      }

      const btcCandles5m = parseKlines(btc5m);
      const btcCandles15m = parseKlines(btc15m);
      const btcCandles1h = parseKlines(btc1h);
      const ethCandles5m = parseKlines(eth5m);
      const ethCandles15m = parseKlines(eth15m);
      const ethCandles1h = parseKlines(eth1h);

      const btcCloses5m = btcCandles5m.map((c) => c.close);
      const ethCloses5m = ethCandles5m.map((c) => c.close);

      const btcSR5m = computeSupportResistance(btcCandles5m);
      const btcSR15m = computeSupportResistance(btcCandles15m);
      const btcSR1h = computeSupportResistance(btcCandles1h);
      const ethSR5m = computeSupportResistance(ethCandles5m);
      const ethSR15m = computeSupportResistance(ethCandles15m);
      const ethSR1h = computeSupportResistance(ethCandles1h);

      // Keep backward-compatible response shape for the client parser
      const enriched = {
        bitcoin: {
          usd: btcPrice,
          usd_24h_change: btcChange24h,
          usd_24h_vol: btcVolume24h,
        },
        ethereum: {
          usd: ethPrice,
          usd_24h_change: ethChange24h,
          usd_24h_vol: ethVolume24h,
        },
        _indicators: {
          btc: {
            volume24h: btcVolume24h,
            rsi14: computeRSI(btcCloses5m),
            priceHistory: btcCloses5m.slice(-10),
            candles: {
              "5m": btcCandles5m,
              "15m": btcCandles15m,
              "1h": btcCandles1h,
            },
            levels: {
              "5m": btcSR5m,
              "15m": btcSR15m,
              "1h": btcSR1h,
            },
          },
          eth: {
            volume24h: ethVolume24h,
            rsi14: computeRSI(ethCloses5m),
            priceHistory: ethCloses5m.slice(-10),
            candles: {
              "5m": ethCandles5m,
              "15m": ethCandles15m,
              "1h": ethCandles1h,
            },
            levels: {
              "5m": ethSR5m,
              "15m": ethSR15m,
              "1h": ethSR1h,
            },
          },
        },
      };

      marketCache = enriched;
      lastFetchTime = now;
      return res.json(enriched);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        console.warn("Binance API request timed out — using cached data");
      } else {
        console.error("Failed to fetch market data from Binance:", error);
      }

      if (marketCache) {
        return res.json(marketCache);
      }

      res.status(500).json({ error: "Failed to fetch market data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Fallback for SPA in development
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const fs = await import("fs");
        let template = await fs.promises.readFile(
          path.resolve(process.cwd(), "index.html"),
          "utf-8",
        );
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    console.log(`[Production] Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      console.log(`[Production] SPA fallback for: ${req.originalUrl}`);
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
