/**
 * Feature: nextjs-blockchain-wallet, Property 2: Wallet State localStorage Round-Trip
 *
 * For any valid Ethereum address string, after connectWallet() succeeds with that address,
 * localStorage.getItem("forge8004.wallet.address") SHALL equal that address. Similarly,
 * for any valid UUID string, after selectWalletProvider({ info: { uuid } }) is called,
 * localStorage.getItem("forge8004.wallet.selected") SHALL equal that UUID.
 *
 * Validates: Requirements 3.6, 3.7
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fc from "fast-check";

const STORAGE_KEY = "forge8004.wallet.address";
const SELECTED_WALLET_KEY = "forge8004.wallet.selected";

/**
 * Generates a random lowercase hex Ethereum address (0x + 40 hex chars).
 */
const ethAddressArb = fc
  .stringMatching(/^[0-9a-f]{40}$/)
  .map((hex) => `0x${hex}`);

/**
 * Generates a random UUID v4-like string.
 */
const uuidArb = fc.uuid();

/**
 * Creates a minimal in-memory localStorage mock.
 */
function createLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const key of Object.keys(store)) {
        delete store[key];
      }
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}

/**
 * Sets up a fake browser window with localStorage and an ethereum provider
 * that returns the given address from eth_requestAccounts.
 */
function setupBrowserWindow(address?: string) {
  const localStorage = createLocalStorageMock();
  const mockEthereum = {
    request: vi.fn().mockImplementation(async (args: any) => {
      if (args.method === "eth_requestAccounts") {
        return [address];
      }
      return [];
    }),
  };

  (globalThis as any).window = {
    ethereum: mockEthereum,
    localStorage,
    dispatchEvent: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    CustomEvent:
      globalThis.CustomEvent ??
      class CustomEvent extends Event {
        detail: any;
        constructor(type: string, opts?: any) {
          super(type);
          this.detail = opts?.detail;
        }
      },
  };

  // Also expose localStorage on globalThis for direct access
  (globalThis as any).localStorage = localStorage;

  return { localStorage, mockEthereum };
}

function teardownBrowserWindow(originalWindow: any) {
  if (originalWindow === undefined) {
    delete (globalThis as any).window;
  } else {
    (globalThis as any).window = originalWindow;
  }
  delete (globalThis as any).localStorage;
}

/**
 * Dynamically imports wallet.ts after resetting the module registry,
 * so each test iteration gets a fresh module state.
 */
async function freshWalletModule() {
  vi.resetModules();
  const mod = await import("@/src/services/wallet");
  return mod;
}

describe("Property 2: Wallet State localStorage Round-Trip", () => {
  let originalWindow: any;

  beforeEach(() => {
    originalWindow = (globalThis as any).window;
  });

  afterEach(() => {
    teardownBrowserWindow(originalWindow);
    vi.restoreAllMocks();
  });

  it("connectWallet() stores address in localStorage under forge8004.wallet.address", async () => {
    await fc.assert(
      fc.asyncProperty(ethAddressArb, async (address) => {
        // Set up fresh browser window with this address
        const { localStorage } = setupBrowserWindow(address);

        const wallet = await freshWalletModule();
        await wallet.connectWallet();

        expect(localStorage.getItem(STORAGE_KEY)).toBe(address);
      }),
      { numRuns: 100 },
    );
  });

  it("selectWalletProvider() stores UUID in localStorage under forge8004.wallet.selected", async () => {
    await fc.assert(
      fc.asyncProperty(uuidArb, async (uuid) => {
        // Set up fresh browser window (no specific address needed)
        const { localStorage } = setupBrowserWindow();

        const wallet = await freshWalletModule();
        wallet.selectWalletProvider({
          info: { uuid, name: "TestWallet", icon: "" },
          provider: {},
        });

        expect(localStorage.getItem(SELECTED_WALLET_KEY)).toBe(uuid);
      }),
      { numRuns: 100 },
    );
  });
});
