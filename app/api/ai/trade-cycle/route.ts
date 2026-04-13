import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getRateLimitHeaders } from "@/app/lib/rate-limiter";
import { getGroqClient } from "@/app/lib/groq-client";
import {
  validateTradeCycleBody,
  normalizeRiskProfile,
} from "@/app/lib/validators";
import {
  buildMarketPromptBlock,
  validateAiTradeResponse,
  cleanAiJsonResponse,
  computeDynamicNotionalCap,
} from "@/app/lib/ai-helpers";
import {
  AI_MODEL,
  STRATEGY_DESCRIPTIONS,
  RISK_PROFILE_DESCRIPTIONS,
} from "@/app/lib/constants";

export async function POST(request: NextRequest) {
  const rateLimitResponse = checkRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const validationError = validateTradeCycleBody(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const groq = getGroqClient();
  if (!groq) {
    return NextResponse.json(
      { error: "GROQ_API_KEY_MISSING" },
      { status: 500 },
    );
  }

  const {
    strategy,
    riskProfile,
    marketData,
    activePositions,
    availableCapital,
    totalTreasury,
  } = body;

  const normalizedRiskProfile = normalizeRiskProfile(riskProfile);
  const allocationPct =
    normalizedRiskProfile === "conservative"
      ? 0.1
      : normalizedRiskProfile === "aggressive"
        ? 0.4
        : 0.25;

  const suggestedNotionalCap = computeDynamicNotionalCap(
    totalTreasury,
    availableCapital,
    normalizedRiskProfile,
  );

  const strategyDescription =
    STRATEGY_DESCRIPTIONS[strategy] || STRATEGY_DESCRIPTIONS.momentum;
  const riskProfileDescription =
    RISK_PROFILE_DESCRIPTIONS[normalizedRiskProfile] ||
    RISK_PROFILE_DESCRIPTIONS.balanced;

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
    `Capital guide: max ~${suggestedNotionalCap.toLocaleString()} per trade (${Math.round(allocationPct * 100)}% of total funds).`,
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

  try {
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

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) throw new Error("No content from Groq");

    const cleaned = cleanAiJsonResponse(rawContent);
    const parsed = JSON.parse(cleaned);
    const { valid, sanitized } = validateAiTradeResponse(parsed);

    if (!valid) {
      return NextResponse.json(
        { error: "AI response did not match expected schema" },
        { status: 500 },
      );
    }

    const headers = getRateLimitHeaders(request);
    return NextResponse.json(sanitized, { headers });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
