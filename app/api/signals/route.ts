import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getRateLimitHeaders } from "@/app/lib/rate-limiter";
import { getGroqClient } from "@/app/lib/groq-client";
import { cache, CACHE_TTL } from "@/app/lib/cache";
import { AI_MODEL, MARKET_COINS } from "@/app/lib/constants";
import { fetchBinance, computeRSI } from "@/app/lib/market";
import { cleanAiJsonResponse } from "@/app/lib/ai-helpers";
import { validateSignal, type RawSignal } from "@/app/lib/signal-validator";

export async function GET(request: NextRequest) {
  // 1. Rate limit check (this endpoint calls Groq)
  const rateLimitResponse = checkRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const now = Date.now();

  // 2. Check cache
  const cached = cache.get<any>("signals");
  if (cached) {
    return NextResponse.json(
      { ...cached.data, _cached: true },
      { headers: getRateLimitHeaders(request) },
    );
  }

  // 3. Check Groq client
  const groq = getGroqClient();
  if (!groq) {
    return NextResponse.json(
      { error: "GROQ_API_KEY_MISSING" },
      { status: 500 },
    );
  }

  try {
    // 4. Fetch tickers + 1H klines for all coins
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

    // 5. Build rich market summary for the AI
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
        let line = `${c.symbol}: ${c.price} (${c.change24h >= 0 ? "+" : ""}${c.change24h.toFixed(2)}%) | Vol:${(c.volume / 1e6).toFixed(0)}M`;
        if (c.rsi1h != null) line += ` | RSI(1H):${c.rsi1h}`;
        if (c.levelsShort.support)
          line += ` | 12H S:${c.levelsShort.support.toFixed(2)} R:${c.levelsShort.resistance.toFixed(2)}`;
        if (c.levelsLong.support)
          line += ` | 48H S:${c.levelsLong.support.toFixed(2)} R:${c.levelsLong.resistance.toFixed(2)}`;
        if (c.recent1h.length > 0) {
          const last3 = c.recent1h.slice(-3);
          line += ` | Last 3 1H: ${last3.map((k: any) => `[O:${k.open.toFixed(0)} H:${k.high.toFixed(0)} L:${k.low.toFixed(0)} C:${k.close.toFixed(0)}]`).join(" ")}`;
        }
        return line;
      })
      .join("\n");

    // 6. Call Groq with signal generation prompt
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

    content = cleanAiJsonResponse(content);
    const parsed = JSON.parse(content);

    // 7. Normalize raw signals
    const rawSignals: RawSignal[] = Array.isArray(parsed.signals)
      ? parsed.signals
          .filter(
            (s: any) =>
              s && typeof s.symbol === "string" && typeof s.side === "string",
          )
          .map((s: any) => ({
            symbol: String(s.symbol).toUpperCase(),
            side: s.side === "SHORT" ? ("SHORT" as const) : ("LONG" as const),
            orderType:
              s.orderType === "LIMIT"
                ? ("LIMIT" as const)
                : ("MARKET" as const),
            entry: typeof s.entry === "number" ? s.entry : 0,
            stopLoss: typeof s.stopLoss === "number" ? s.stopLoss : 0,
            targets: Array.isArray(s.targets)
              ? s.targets.filter((t: any) => typeof t === "number")
              : [],
            riskReward: typeof s.riskReward === "string" ? s.riskReward : "N/A",
            confidence:
              typeof s.confidence === "number"
                ? Math.min(10, Math.max(1, Math.round(s.confidence)))
                : 5,
            timeframe: (["SCALP", "SWING", "POSITION"] as const).includes(
              s.timeframe,
            )
              ? s.timeframe
              : ("SWING" as const),
            reasoning:
              typeof s.reasoning === "string" ? s.reasoning.slice(0, 500) : "",
          }))
      : [];

    // 8. Validate and filter signals, limit to 6
    const signals = rawSignals
      .map((s) => validateSignal(s))
      .filter((s): s is RawSignal => s !== null)
      .slice(0, 6);

    const result = {
      signals,
      generatedAt: now,
      nextRefreshAt: now + CACHE_TTL.SIGNALS,
      coinCount: coinSummaries.length,
      filteredOut: rawSignals.length - signals.length,
    };

    // 9. Cache result
    cache.set("signals", result, CACHE_TTL.SIGNALS);

    const headers = getRateLimitHeaders(request);
    return NextResponse.json(result, { headers });
  } catch (error: any) {
    console.error("Signal generation failed:", error);
    // Fall back to stale cached signals on Groq failure
    const stale = cache.getStale<any>("signals");
    if (stale) {
      return NextResponse.json(
        { ...stale, _cached: true },
        { headers: getRateLimitHeaders(request) },
      );
    }
    return NextResponse.json(
      { error: "Failed to generate signals" },
      { status: 500 },
    );
  }
}
