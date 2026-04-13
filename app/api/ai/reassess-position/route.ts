import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getRateLimitHeaders } from "@/app/lib/rate-limiter";
import { getGroqClient } from "@/app/lib/groq-client";
import { validateReassessBody } from "@/app/lib/validators";
import {
  buildMarketPromptBlock,
  cleanAiJsonResponse,
  sanitizeReassessResponse,
} from "@/app/lib/ai-helpers";
import { AI_MODEL, STRATEGY_DESCRIPTIONS } from "@/app/lib/constants";

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

  const validationError = validateReassessBody(body);
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

  const { strategy, riskProfile, marketData, position } = body;
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
        candleContext += `\n              - ${tf.toUpperCase()}: Support ${l.support?.toFixed(0) ?? "N/A"} | Resistance ${l.resistance?.toFixed(0) ?? "N/A"}`;
    }
  }
  if (ind?.candles?.["5m"]?.length > 0) {
    const recent = ind.candles["5m"].slice(-5);
    candleContext += `\n              ${asset} Recent 5M Candles: ${recent.map((c: any) => `[O:${c.open.toFixed(0)} H:${c.high.toFixed(0)} L:${c.low.toFixed(0)} C:${c.close.toFixed(0)}]`).join(" ")}`;
  }

  const userPrompt = [
    `You have an OPEN ${position.side} position in ${asset}. Decide whether to KEEP it open or CLOSE it.`,
    "",
    "POSITION DETAILS:",
    `- Side: ${position.side}`,
    `- Asset: ${asset}`,
    `- Entry Price: ${entryPrice}`,
    `- Current Price: ${currentPrice}`,
    `- Unrealized PnL: ${unrealizedPnlPct.toFixed(3)}%`,
    `- Hold Duration: ${holdMinutes} minutes`,
    `- Stop Loss: ${position.stopLoss || "N/A"}`,
    `- Take Profit: ${position.takeProfit || "N/A"}`,
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

  try {
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

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) throw new Error("No content from Groq");

    const cleaned = cleanAiJsonResponse(rawContent);
    const parsed = JSON.parse(cleaned);
    const result = sanitizeReassessResponse(parsed);

    const headers = getRateLimitHeaders(request);
    return NextResponse.json(result, { headers });
  } catch {
    // Fail-safe: default to KEEP on error
    return NextResponse.json({
      action: "KEEP",
      confidence: 50,
      reason: "AI reassessment unavailable — defaulting to keep position open.",
    });
  }
}
