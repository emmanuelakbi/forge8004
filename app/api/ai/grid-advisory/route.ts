import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getRateLimitHeaders } from "@/app/lib/rate-limiter";
import { getGroqClient } from "@/app/lib/groq-client";
import { validateGridAdvisoryBody } from "@/app/lib/validators";
import {
  cleanAiJsonResponse,
  validateAndClampGridRange,
} from "@/app/lib/ai-helpers";
import { AI_MODEL } from "@/app/lib/constants";

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const validationError = validateGridAdvisoryBody(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const { marketData, currentAsset } = body;

  // Return defaults if no GROQ_API_KEY
  const groq = getGroqClient();
  if (!groq) {
    return NextResponse.json({
      recommendedAsset: currentAsset || "BTC",
      shouldActivate: true,
      spacingBias: "normal",
      reason: "No AI key — using defaults.",
    });
  }

  const rateLimitResponse = checkRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
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
Market: BTC ${marketData.btc.price} (${marketData.btc.change24h}% 24h)${btcInd?.rsi14 != null ? ` RSI:${btcInd.rsi14}` : ""}${btcInd?.volume24h ? ` Vol:${(btcInd.volume24h / 1e9).toFixed(1)}B` : ""}${btcInd?.levels?.["1h"] ? ` | 1H S:${btcInd.levels["1h"].support?.toFixed(0) || "N/A"} R:${btcInd.levels["1h"].resistance?.toFixed(0) || "N/A"}` : ""} | ETH ${marketData.eth.price} (${marketData.eth.change24h}% 24h)${ethInd?.rsi14 != null ? ` RSI:${ethInd.rsi14}` : ""}${ethInd?.volume24h ? ` Vol:${(ethInd.volume24h / 1e9).toFixed(1)}B` : ""}${ethInd?.levels?.["1h"] ? ` | 1H S:${ethInd.levels["1h"].support?.toFixed(0) || "N/A"} R:${ethInd.levels["1h"].resistance?.toFixed(0) || "N/A"}` : ""}

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

    content = cleanAiJsonResponse(content);
    const parsed = JSON.parse(content);

    const chosenAsset = parsed.recommendedAsset === "ETH" ? "ETH" : "BTC";
    const chosenPrice =
      chosenAsset === "BTC"
        ? marketData.btc?.price || 0
        : marketData.eth?.price || 0;

    const suggestedGridLevels =
      typeof parsed.suggestedGridLevels === "number" &&
      parsed.suggestedGridLevels >= 2 &&
      parsed.suggestedGridLevels <= 50
        ? Math.round(parsed.suggestedGridLevels)
        : undefined;

    const { rangeLow: suggestedRangeLow, rangeHigh: suggestedRangeHigh } =
      validateAndClampGridRange(
        parsed.suggestedRangeLow,
        parsed.suggestedRangeHigh,
        chosenPrice,
        chosenAsset,
      );

    const headers = getRateLimitHeaders(request);
    return NextResponse.json(
      {
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
      },
      { headers },
    );
  } catch {
    return NextResponse.json({
      recommendedAsset: currentAsset || "BTC",
      shouldActivate: true,
      spacingBias: "normal",
      reason: "AI advisory unavailable — using defaults.",
    });
  }
}
