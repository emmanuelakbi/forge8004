import { NextRequest, NextResponse } from "next/server";
import { fetchBinance, computeRSI } from "@/app/lib/market";
import { cache, CACHE_TTL } from "@/app/lib/cache";
import { MARKET_COINS } from "@/app/lib/constants";

function parseCoinKlines(raw: any[]) {
  return raw.map((k: any) => ({
    time: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));
}

function sr(candles: any[]) {
  if (candles.length < 3) return { support: null, resistance: null };
  return {
    support: Math.min(...candles.map((c: any) => c.low)),
    resistance: Math.max(...candles.map((c: any) => c.high)),
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ coinId: string }> },
) {
  const { coinId: rawCoinId } = await params;
  const coinId = rawCoinId.toLowerCase();
  const coin = MARKET_COINS.find((c) => c.id === coinId);
  if (!coin) {
    return NextResponse.json({ error: "Coin not found" }, { status: 404 });
  }

  const cacheKey = `coin-${coinId}`;

  // Return cache if fresh
  const cached = cache.get<any>(cacheKey);
  if (cached) {
    return NextResponse.json(cached.data);
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

    const candles5m = parseCoinKlines(klines5m);
    const candles15m = parseCoinKlines(klines15m);
    const candles1h = parseCoinKlines(klines1h);
    const candles4h = parseCoinKlines(klines4h);
    const candles1d = parseCoinKlines(klines1d);

    const closes5m = candles5m.map((c: any) => c.close);
    const closes1h = candles1h.map((c: any) => c.close);

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
        "15m": sr(candles15m),
        "1h": sr(candles1h),
        "4h": sr(candles4h),
        "1d": sr(candles1d),
      },
      candles: {
        "5m": candles5m,
        "15m": candles15m,
        "1h": candles1h,
        "4h": candles4h,
        "1d": candles1d,
      },
    };

    cache.set(cacheKey, result, CACHE_TTL.COIN_DETAIL);
    return NextResponse.json(result);
  } catch (error) {
    console.error(`Failed to fetch coin detail for ${coinId}:`, error);

    const stale = cache.getStale<any>(cacheKey);
    if (stale) {
      return NextResponse.json(stale);
    }

    return NextResponse.json(
      { error: "Failed to fetch coin data" },
      { status: 500 },
    );
  }
}
