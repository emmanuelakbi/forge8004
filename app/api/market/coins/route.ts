import { NextResponse } from "next/server";
import { fetchBinance } from "@/app/lib/market";
import { cache, CACHE_TTL } from "@/app/lib/cache";
import { MARKET_COINS } from "@/app/lib/constants";

const CACHE_KEY = "coins";

export async function GET() {
  // Return cache if fresh
  const cached = cache.get<any>(CACHE_KEY);
  if (cached) {
    return NextResponse.json(cached.data);
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

    cache.set(CACHE_KEY, coins, CACHE_TTL.COIN_LIST);
    return NextResponse.json(coins);
  } catch (error) {
    console.error("Failed to fetch coin list:", error);

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
