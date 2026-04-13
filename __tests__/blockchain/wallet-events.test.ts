/**
 * Feature: nextjs-blockchain-wallet, Property 6: Wallet Change Listener Notification
 *
 * For any sequence of connectWallet() and disconnectWallet() operations, a listener
 * registered via onWalletChange() SHALL be invoked once per operation with the connected
 * address (on connect) or null (on disconnect), in the order the operations occurred.
 *
 * Validates: Requirements 8.1, 8.4
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fc from "fast-check";

const WALLET_EVENT = "forge8004:wallet-change";

/**
 * Generates a random lowercase hex Ethereum address (0x + 40 hex chars).
 */
const ethAddressArb = fc
  .stringMatching(/^[0-9a-f]{40}$/)
  .map((hex) => `0x${hex}`);

/**
 * Generates a random operation: either connect with a random address, or disconnect.
 */
const walletOpArb = fc.oneof(
  ethAddressArb.map((addr) => ({ type: "connect" as const, address: addr })),
  fc.constant({ type: "disconnect" as const, address: null as string | null }),
);

/**
 * Generates a non-empty array of wallet operations (1–10 ops).
 */
const walletOpsArb = fc.array(walletOpArb, { minLength: 1, maxLength: 10 });

/**
 * Creates a browser window mock with real EventTarget-based event dispatch/listen.
 * This is critical — we need actual addEventListener/removeEventListener/dispatchEvent
 * to work so that onWalletChange() and emitWalletChange() interact correctly.
 */
function createBrowserWindowMock(defaultAddress?: string) {
  const eventTarget = new EventTarget();
  const localStorageStore: Record<string, string> = {};

  const localStorage = {
    getItem: (key: string) => localStorageStore[key] ?? null,
    setItem: (key: string, value: string) => {
      localStorageStore[key] = value;
    },
    removeItem: (key: string) => {
      delete localStorageStore[key];
    },
    clear: () => {
      for (const key of Object.keys(localStorageStore)) {
        delete localStorageStore[key];
      }
    },
    get length() {
      return Object.keys(localStorageStore).length;
    },
    key: (index: number) => Object.keys(localStorageStore)[index] ?? null,
  };

  const mockEthereum = {
    request: vi.fn().mockImplementation(async (args: any) => {
      if (args.method === "eth_requestAccounts") {
        return [mockEthereum._currentAddress];
      }
      if (args.method === "eth_accounts") {
        return mockEthereum._currentAddress
          ? [mockEthereum._currentAddress]
          : [];
      }
      if (args.method === "wallet_revokePermissions") {
        return null;
      }
      return [];
    }),
    _currentAddress: defaultAddress ?? (null as string | null),
  };

  const windowMock = {
    ethereum: mockEthereum,
    localStorage,
    addEventListener: eventTarget.addEventListener.bind(eventTarget),
    removeEventListener: eventTarget.removeEventListener.bind(eventTarget),
    dispatchEvent: eventTarget.dispatchEvent.bind(eventTarget),
    CustomEvent: globalThis.CustomEvent,
  };

  return { windowMock, mockEthereum, localStorage };
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

describe("Property 6: Wallet Change Listener Notification", () => {
  let originalWindow: any;

  beforeEach(() => {
    originalWindow = (globalThis as any).window;
  });

  afterEach(() => {
    if (originalWindow === undefined) {
      delete (globalThis as any).window;
    } else {
      (globalThis as any).window = originalWindow;
    }
    delete (globalThis as any).localStorage;
    vi.restoreAllMocks();
  });

  it(
    "listener registered via onWalletChange() is invoked once per connect/disconnect " +
      "operation with the correct address or null, in order",
    async () => {
      await fc.assert(
        fc.asyncProperty(walletOpsArb, async (ops) => {
          // Set up a fresh browser window with real event dispatch
          const { windowMock, mockEthereum } = createBrowserWindowMock();
          (globalThis as any).window = windowMock;
          (globalThis as any).localStorage = windowMock.localStorage;

          const wallet = await freshWalletModule();

          // Register a listener and collect all notifications
          const receivedValues: (string | null)[] = [];
          const unsubscribe = wallet.onWalletChange((address) => {
            receivedValues.push(address);
          });

          // Build expected values and execute operations
          const expectedValues: (string | null)[] = [];

          for (const op of ops) {
            if (op.type === "connect") {
              mockEthereum._currentAddress = op.address;
              await wallet.connectWallet();
              expectedValues.push(op.address);
            } else {
              await wallet.disconnectWallet();
              expectedValues.push(null);
            }
          }

          // Verify: listener was called once per operation, in order, with correct values
          expect(receivedValues).toEqual(expectedValues);
          expect(receivedValues.length).toBe(ops.length);

          // Clean up the subscription
          unsubscribe();
        }),
        { numRuns: 100 },
      );
    },
  );
});
