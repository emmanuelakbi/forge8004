export type CandleData = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
};

export type SupportResistance = {
  support: number | null;
  resistance: number | null;
};

export type AssetIndicators = {
  volume24h: number | null;
  rsi14: number | null;
  priceHistory: number[];
  candles?: {
    "5m": CandleData[];
    "15m": CandleData[];
    "1h": CandleData[];
  };
  levels?: {
    "5m": SupportResistance;
    "15m": SupportResistance;
    "1h": SupportResistance;
  };
};

export type MarketData = {
  btc: { price: number; change24h: number };
  eth: { price: number; change24h: number };
  indicators?: { btc: AssetIndicators; eth: AssetIndicators };
  timestamp: number;
};

let lastKnownMarket: MarketData | null = null;

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = 8000,
) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export const marketService = {
  async getLatestPrices(): Promise<MarketData> {
    try {
      const url = window.location.origin + "/api/market";
      const response = await fetchWithTimeout(url, undefined, 15000);
      if (!response.ok)
        throw new Error(`Market API returned ${response.status}`);

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        if (
          text.includes("Please wait while your application starts") ||
          text.includes("<title>Starting Server...</title>")
        ) {
          console.warn(
            "Market API: Server is still starting up, using fallback data.",
          );
        } else {
          console.error(
            "Market API returned non-JSON response:",
            text.substring(0, 200),
          );
        }
        throw new Error("Market API returned non-JSON response");
      }

      const data = await response.json();

      if (!data.bitcoin || !data.ethereum) {
        throw new Error("Market data incomplete from API");
      }

      const btcPrice = data.bitcoin.usd;
      const ethPrice = data.ethereum.usd;
      if (!btcPrice || btcPrice <= 0 || !ethPrice || ethPrice <= 0) {
        throw new Error("Market data returned invalid prices");
      }

      const indicators = data._indicators
        ? {
            btc: {
              volume24h: data._indicators.btc?.volume24h ?? null,
              rsi14: data._indicators.btc?.rsi14 ?? null,
              priceHistory: data._indicators.btc?.priceHistory || [],
              candles: data._indicators.btc?.candles,
              levels: data._indicators.btc?.levels,
            },
            eth: {
              volume24h: data._indicators.eth?.volume24h ?? null,
              rsi14: data._indicators.eth?.rsi14 ?? null,
              priceHistory: data._indicators.eth?.priceHistory || [],
              candles: data._indicators.eth?.candles,
              levels: data._indicators.eth?.levels,
            },
          }
        : undefined;

      const market: MarketData = {
        btc: {
          price: data.bitcoin.usd,
          change24h: data.bitcoin.usd_24h_change,
        },
        eth: {
          price: data.ethereum.usd,
          change24h: data.ethereum.usd_24h_change,
        },
        indicators,
        timestamp: Date.now(),
      };

      lastKnownMarket = market;
      return market;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        console.warn("Market data fetch timed out — using cached data.");
      } else {
        console.error("Failed to fetch market data:", error);
      }

      // Use last known prices if API fails (no random walk to avoid compounding drift)
      if (lastKnownMarket) {
        return {
          btc: {
            price: lastKnownMarket.btc.price,
            change24h: lastKnownMarket.btc.change24h,
          },
          eth: {
            price: lastKnownMarket.eth.price,
            change24h: lastKnownMarket.eth.change24h,
          },
          timestamp: Date.now(),
        };
      }

      // Initial fallback if we never got a successful response
      return {
        btc: { price: 64000 + Math.random() * 1000, change24h: 1.5 },
        eth: { price: 2400 + Math.random() * 100, change24h: -0.5 },
        timestamp: Date.now(),
      };
    }
  },
};
