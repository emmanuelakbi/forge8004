import { NextResponse } from "next/server";
import {
  fetchBinance,
  parseKlines,
  computeRSI,
  computeSupportResistance,
} from "@/app/lib/market";
import { cache, CACHE_TTL } from "@/app/lib/cache";

const CACHE_KEY = "market";

export async function GET() {
  // Return cache if fresh
  const cached = cache.get<any>(CACHE_KEY);
  if (cached) {
    return NextResponse.json({
      ...cached.data,
      _cached: true,
      _cacheAge: cached.age,
    });
  }

  try {
    // Phase 1: Fetch tickers
    const [btcTicker, ethTicker] = await Promise.all([
      fetchBinance(
        "https://data-api.binance.vision/api/v3/ticker/24hr?symbol=BTCUSDT",
      ),
      fetchBinance(
        "https://data-api.binance.vision/api/v3/ticker/24hr?symbol=ETHUSDT",
      ),
    ]);

    // Phase 2: Fetch klines for indicators
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

    cache.set(CACHE_KEY, enriched, CACHE_TTL.MARKET);
    return NextResponse.json(enriched);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      console.warn("Binance API request timed out — using cached data");
    } else {
      console.error("Failed to fetch market data from Binance:", error);
    }

    const stale = cache.getStale<any>(CACHE_KEY);
    if (stale) {
      return NextResponse.json(stale);
    }

    return NextResponse.json(
      { error: "Failed to fetch market data" },
      { status: 500 },
    );
  }
}
