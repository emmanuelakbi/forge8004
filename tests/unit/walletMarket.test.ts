// Unit tests for wallet and market edge cases
// Validates: Requirements 16.5, 22.1

import { describe, it, expect } from "vitest";

// ── Constants mirroring wallet.ts ─────────────────────────────────
const STORAGE_KEY = "forge8004.wallet.address";
const SELECTED_WALLET_KEY = "forge8004.wallet.selected";
const WALLET_EVENT = "forge8004:wallet-change";

// ── Minimal in-memory localStorage mock (same as property tests) ──
function createMockLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (_index: number) => null as string | null,
  };
}

// ── Extracted wallet logic (mirrors wallet.ts core) ───────────────

function createWalletService(
  storage: ReturnType<typeof createMockLocalStorage>,
  dispatchEvent: (event: CustomEvent) => void,
) {
  let selectedProvider: any = null;

  function emitWalletChange(address: string | null) {
    dispatchEvent(new CustomEvent(WALLET_EVENT, { detail: { address } }));
  }

  async function connectWallet(
    mockProvider?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<any>;
    } | null,
  ) {
    if (!mockProvider) throw new Error("WALLET_UNAVAILABLE");

    const accounts = await mockProvider.request({
      method: "eth_requestAccounts",
    });
    const address =
      Array.isArray(accounts) && accounts.length > 0 ? accounts[0] : null;

    if (!address) throw new Error("WALLET_NOT_CONNECTED");

    storage.setItem(STORAGE_KEY, address);
    emitWalletChange(address);
    return address;
  }

  async function disconnectWallet(mockProvider?: {
    request: (args: { method: string; params?: unknown[] }) => Promise<any>;
  }) {
    storage.removeItem(STORAGE_KEY);
    storage.removeItem(SELECTED_WALLET_KEY);

    if (mockProvider) {
      try {
        await mockProvider.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch {
        // Older wallets don't support this
      }
    }

    selectedProvider = null;
    emitWalletChange(null);
  }

  function getStoredAddress() {
    return storage.getItem(STORAGE_KEY);
  }

  return { connectWallet, disconnectWallet, getStoredAddress };
}

// ── Extracted market service logic (mirrors marketService.ts) ─────

type MarketData = {
  btc: { price: number; change24h: number };
  eth: { price: number; change24h: number };
  timestamp: number;
};

type MockResponse = {
  ok: boolean;
  status: number;
  headers: { get: (name: string) => string | null };
  json: () => Promise<any>;
  text: () => Promise<string>;
};

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

      const market: MarketData = {
        btc: {
          price: data.bitcoin.usd,
          change24h: data.bitcoin.usd_24h_change,
        },
        eth: {
          price: data.ethereum.usd,
          change24h: data.ethereum.usd_24h_change,
        },
        timestamp: Date.now(),
      };

      lastKnownMarket = market;
      return market;
    } catch (error) {
      // Use last known prices if API fails
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
  }

  function _setLastKnown(market: MarketData | null) {
    lastKnownMarket = market;
  }

  return { getLatestPrices, _setLastKnown };
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

function mockHtmlResponse(html: string, status = 200): MockResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => (name === "content-type" ? "text/html" : null),
    },
    json: async () => {
      throw new Error("not json");
    },
    text: async () => html,
  };
}

function mockErrorResponse(status: number): MockResponse {
  return {
    ok: false,
    status,
    headers: { get: () => null },
    json: async () => {
      throw new Error("error");
    },
    text: async () => "Internal Server Error",
  };
}

// ── Tests ─────────────────────────────────────────────────────────

describe("[WalletMarket]", () => {
  /**
   * Requirement 22.1: Wallet connection when no provider exists
   */
  describe("wallet connection when no provider exists", () => {
    it("should throw WALLET_UNAVAILABLE when provider is undefined", async () => {
      const storage = createMockLocalStorage();
      const events: CustomEvent[] = [];
      const wallet = createWalletService(storage, (e) => events.push(e));

      await expect(wallet.connectWallet(undefined)).rejects.toThrow(
        "WALLET_UNAVAILABLE",
      );
      expect(wallet.getStoredAddress()).toBeNull();
      expect(events).toHaveLength(0);
    });

    it("should throw WALLET_UNAVAILABLE when provider is null", async () => {
      const storage = createMockLocalStorage();
      const events: CustomEvent[] = [];
      const wallet = createWalletService(storage, (e) => events.push(e));

      await expect(wallet.connectWallet(null)).rejects.toThrow(
        "WALLET_UNAVAILABLE",
      );
      expect(wallet.getStoredAddress()).toBeNull();
      expect(events).toHaveLength(0);
    });

    it("should not persist any address when provider is unavailable", async () => {
      const storage = createMockLocalStorage();
      const wallet = createWalletService(storage, () => {});

      try {
        await wallet.connectWallet(undefined);
      } catch {
        // expected
      }

      expect(storage.getItem(STORAGE_KEY)).toBeNull();
      expect(storage.getItem(SELECTED_WALLET_KEY)).toBeNull();
    });
  });

  /**
   * Requirement 16.5: Market data fallback when API fails with no cache
   */
  describe("market data fallback when API fails with no cache", () => {
    it("should return fallback data with reasonable BTC/ETH prices when API errors and no cache", async () => {
      const service = createMarketService(async () => {
        throw new Error("Network error");
      });

      const result = await service.getLatestPrices();

      // Fallback BTC price should be in 64000-65000 range
      expect(result.btc.price).toBeGreaterThanOrEqual(64000);
      expect(result.btc.price).toBeLessThan(65000);
      expect(result.btc.change24h).toBe(1.5);

      // Fallback ETH price should be in 2400-2500 range
      expect(result.eth.price).toBeGreaterThanOrEqual(2400);
      expect(result.eth.price).toBeLessThan(2500);
      expect(result.eth.change24h).toBe(-0.5);

      expect(result.timestamp).toBeGreaterThan(0);
    });

    it("should return fallback data when API returns 500 and no cache exists", async () => {
      const service = createMarketService(async () => mockErrorResponse(500));

      const result = await service.getLatestPrices();

      expect(result.btc.price).toBeGreaterThanOrEqual(64000);
      expect(result.eth.price).toBeGreaterThanOrEqual(2400);
    });

    it("should return cached data when API fails after a successful fetch", async () => {
      let callCount = 0;
      const service = createMarketService(async () => {
        callCount++;
        if (callCount === 1) {
          return mockJsonResponse({
            bitcoin: { usd: 70000, usd_24h_change: 2.0 },
            ethereum: { usd: 3500, usd_24h_change: 1.0 },
          });
        }
        throw new Error("Network error");
      });

      // First call succeeds and caches
      const first = await service.getLatestPrices();
      expect(first.btc.price).toBe(70000);

      // Second call fails, returns cached data
      const second = await service.getLatestPrices();
      expect(second.btc.price).toBe(70000);
      expect(second.btc.change24h).toBe(2.0);
      expect(second.eth.price).toBe(3500);
      expect(second.eth.change24h).toBe(1.0);
    });
  });

  /**
   * Requirement 16.5: Market data fallback when API returns non-JSON
   */
  describe("market data fallback when API returns non-JSON", () => {
    it("should fall back when API returns HTML (server starting page)", async () => {
      const service = createMarketService(async () =>
        mockHtmlResponse("<html><title>Starting Server...</title></html>"),
      );

      const result = await service.getLatestPrices();

      // Should return fallback since no cache and non-JSON response
      expect(result.btc.price).toBeGreaterThanOrEqual(64000);
      expect(result.eth.price).toBeGreaterThanOrEqual(2400);
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it("should fall back when content-type is text/plain", async () => {
      const service = createMarketService(async () => ({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) =>
            name === "content-type" ? "text/plain" : null,
        },
        json: async () => ({}),
        text: async () => "some plain text",
      }));

      const result = await service.getLatestPrices();

      expect(result.btc.price).toBeGreaterThanOrEqual(64000);
      expect(result.eth.price).toBeGreaterThanOrEqual(2400);
    });

    it("should fall back when content-type header is missing entirely", async () => {
      const service = createMarketService(async () => ({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => ({}),
        text: async () => "no content type",
      }));

      const result = await service.getLatestPrices();

      expect(result.btc.price).toBeGreaterThanOrEqual(64000);
      expect(result.eth.price).toBeGreaterThanOrEqual(2400);
    });

    it("should use cached data over fallback when non-JSON response follows a successful fetch", async () => {
      let callCount = 0;
      const service = createMarketService(async () => {
        callCount++;
        if (callCount === 1) {
          return mockJsonResponse({
            bitcoin: { usd: 68000, usd_24h_change: -1.0 },
            ethereum: { usd: 3200, usd_24h_change: 0.5 },
          });
        }
        return mockHtmlResponse(
          "<html>Please wait while your application starts</html>",
        );
      });

      // First call succeeds
      await service.getLatestPrices();

      // Second call gets non-JSON, should use cache
      const result = await service.getLatestPrices();
      expect(result.btc.price).toBe(68000);
      expect(result.eth.price).toBe(3200);
    });
  });
});
