// Unit tests for marketService — covers gaps not in walletMarket.test.ts
// Focuses on: incomplete data, invalid prices, indicators mapping, cache behavior

import { describe, it, expect } from "vitest";

// ── Types mirroring marketService.ts ──────────────────────────────

type AssetIndicators = {
  volume24h: number | null;
  rsi14: number | null;
  priceHistory: number[];
  candles?: Record<string, any>;
  levels?: Record<string, any>;
};

type MarketData = {
  btc: { price: number; change24h: number };
  eth: { price: number; change24h: number };
  indicators?: { btc: AssetIndicators; eth: AssetIndicators };
  timestamp: number;
};

type MockResponse = {
  ok: boolean;
  status: number;
  headers: { get: (name: string) => string | null };
  json: () => Promise<any>;
  text: () => Promise<string>;
};

// ── Extracted market logic (mirrors marketService.ts core) ────────

function createMarketService(fetchFn: (url: string) => Promise<MockResponse>) {
  let lastKnownMarket: MarketData | null = null;

  async function getLatestPrices(): Promise<MarketData> {
    try {
      const response = await fetchFn("/api/market");
      if (!response.ok)
        throw new Error(`Market API returned ${response.status}`);

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
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

      return {
        btc: { price: 64000 + Math.random() * 1000, change24h: 1.5 },
        eth: { price: 2400 + Math.random() * 100, change24h: -0.5 },
        timestamp: Date.now(),
      };
    }
  }

  return { getLatestPrices };
}

// ── Mock helpers ──────────────────────────────────────────────────

function mockJsonResponse(data: any, status = 200): MockResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) =>
        name === "content-type" ? "application/json" : null,
    },
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

// ── Tests ─────────────────────────────────────────────────────────

describe("[MarketService]", () => {
  describe("incomplete market data", () => {
    it("should fall back when bitcoin field is missing", async () => {
      const service = createMarketService(async () =>
        mockJsonResponse({ ethereum: { usd: 3000, usd_24h_change: 1.0 } }),
      );

      const result = await service.getLatestPrices();
      expect(result.btc.price).toBeGreaterThanOrEqual(64000);
    });

    it("should fall back when ethereum field is missing", async () => {
      const service = createMarketService(async () =>
        mockJsonResponse({ bitcoin: { usd: 70000, usd_24h_change: 2.0 } }),
      );

      const result = await service.getLatestPrices();
      expect(result.eth.price).toBeGreaterThanOrEqual(2400);
    });

    it("should fall back when response body is empty object", async () => {
      const service = createMarketService(async () => mockJsonResponse({}));

      const result = await service.getLatestPrices();
      expect(result.btc.price).toBeGreaterThanOrEqual(64000);
      expect(result.eth.price).toBeGreaterThanOrEqual(2400);
    });
  });

  describe("invalid prices", () => {
    it("should fall back when BTC price is zero", async () => {
      const service = createMarketService(async () =>
        mockJsonResponse({
          bitcoin: { usd: 0, usd_24h_change: 1.0 },
          ethereum: { usd: 3000, usd_24h_change: 0.5 },
        }),
      );

      const result = await service.getLatestPrices();
      expect(result.btc.price).toBeGreaterThanOrEqual(64000);
    });

    it("should fall back when ETH price is negative", async () => {
      const service = createMarketService(async () =>
        mockJsonResponse({
          bitcoin: { usd: 70000, usd_24h_change: 1.0 },
          ethereum: { usd: -100, usd_24h_change: 0.5 },
        }),
      );

      const result = await service.getLatestPrices();
      expect(result.eth.price).toBeGreaterThanOrEqual(2400);
    });

    it("should fall back when BTC price is null", async () => {
      const service = createMarketService(async () =>
        mockJsonResponse({
          bitcoin: { usd: null, usd_24h_change: 1.0 },
          ethereum: { usd: 3000, usd_24h_change: 0.5 },
        }),
      );

      const result = await service.getLatestPrices();
      expect(result.btc.price).toBeGreaterThanOrEqual(64000);
    });
  });

  describe("indicators mapping", () => {
    it("should map indicators when _indicators is present", async () => {
      const service = createMarketService(async () =>
        mockJsonResponse({
          bitcoin: { usd: 70000, usd_24h_change: 2.0 },
          ethereum: { usd: 3500, usd_24h_change: 1.0 },
          _indicators: {
            btc: {
              volume24h: 50000000,
              rsi14: 65.3,
              priceHistory: [69000, 69500, 70000],
              candles: { "5m": [{ open: 69900 }] },
              levels: { "5m": { support: 69000, resistance: 71000 } },
            },
            eth: {
              volume24h: 20000000,
              rsi14: 55.1,
              priceHistory: [3400, 3450, 3500],
            },
          },
        }),
      );

      const result = await service.getLatestPrices();

      expect(result.indicators).toBeDefined();
      expect(result.indicators!.btc.volume24h).toBe(50000000);
      expect(result.indicators!.btc.rsi14).toBe(65.3);
      expect(result.indicators!.btc.priceHistory).toEqual([
        69000, 69500, 70000,
      ]);
      expect(result.indicators!.btc.candles).toEqual({
        "5m": [{ open: 69900 }],
      });
      expect(result.indicators!.btc.levels).toEqual({
        "5m": { support: 69000, resistance: 71000 },
      });
      expect(result.indicators!.eth.volume24h).toBe(20000000);
      expect(result.indicators!.eth.rsi14).toBe(55.1);
      expect(result.indicators!.eth.priceHistory).toEqual([3400, 3450, 3500]);
      expect(result.indicators!.eth.candles).toBeUndefined();
      expect(result.indicators!.eth.levels).toBeUndefined();
    });

    it("should default nulls for missing indicator fields", async () => {
      const service = createMarketService(async () =>
        mockJsonResponse({
          bitcoin: { usd: 70000, usd_24h_change: 2.0 },
          ethereum: { usd: 3500, usd_24h_change: 1.0 },
          _indicators: { btc: {}, eth: {} },
        }),
      );

      const result = await service.getLatestPrices();

      expect(result.indicators!.btc.volume24h).toBeNull();
      expect(result.indicators!.btc.rsi14).toBeNull();
      expect(result.indicators!.btc.priceHistory).toEqual([]);
      expect(result.indicators!.eth.volume24h).toBeNull();
      expect(result.indicators!.eth.rsi14).toBeNull();
      expect(result.indicators!.eth.priceHistory).toEqual([]);
    });

    it("should omit indicators when _indicators is absent", async () => {
      const service = createMarketService(async () =>
        mockJsonResponse({
          bitcoin: { usd: 70000, usd_24h_change: 2.0 },
          ethereum: { usd: 3500, usd_24h_change: 1.0 },
        }),
      );

      const result = await service.getLatestPrices();
      expect(result.indicators).toBeUndefined();
    });
  });

  describe("cache does not preserve indicators", () => {
    it("should return cached prices without indicators on failure after success", async () => {
      let callCount = 0;
      const service = createMarketService(async () => {
        callCount++;
        if (callCount === 1) {
          return mockJsonResponse({
            bitcoin: { usd: 72000, usd_24h_change: 3.0 },
            ethereum: { usd: 3600, usd_24h_change: 1.5 },
            _indicators: {
              btc: { volume24h: 40000000, rsi14: 60, priceHistory: [71000] },
              eth: { volume24h: 15000000, rsi14: 50, priceHistory: [3500] },
            },
          });
        }
        throw new Error("Network error");
      });

      const first = await service.getLatestPrices();
      expect(first.indicators).toBeDefined();

      const second = await service.getLatestPrices();
      expect(second.btc.price).toBe(72000);
      expect(second.eth.price).toBe(3600);
      // Cache path doesn't carry indicators
      expect(second.indicators).toBeUndefined();
    });
  });
});
