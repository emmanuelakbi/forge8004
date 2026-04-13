/**
 * Feature: nextjs-blockchain-wallet, Property 3: EIP-6963 Provider UUID Deduplication
 *
 * For any sequence of eip6963:announceProvider events containing provider objects with
 * potentially duplicate info.uuid values, getAvailableWallets() SHALL return a list
 * where each info.uuid appears at most once.
 *
 * Validates: Requirements 4.7
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fc from "fast-check";

/**
 * Generates a random UUID v4-like string for provider info.
 */
const uuidArb = fc.uuid();

/**
 * Generates a wallet provider announcement object with a given UUID.
 */
function makeProviderDetail(uuid: string, name?: string) {
  return {
    info: {
      uuid,
      name: name ?? `Wallet-${uuid.slice(0, 8)}`,
      icon: "data:image/svg+xml,<svg/>",
      rdns: `io.test.${uuid.slice(0, 8)}`,
    },
    provider: { isTest: true, uuid },
  };
}

/**
 * Generates an array of provider objects (1–20) where some UUIDs may be duplicated.
 * We pick from a smaller pool of UUIDs to increase duplicate probability.
 */
const providerArrayArb = fc
  .array(uuidArb, { minLength: 1, maxLength: 8 })
  .chain((uuidPool) =>
    fc
      .array(fc.integer({ min: 0, max: uuidPool.length - 1 }), {
        minLength: 1,
        maxLength: 20,
      })
      .map((indices) => indices.map((i) => makeProviderDetail(uuidPool[i]))),
  );

/**
 * Creates a browser window mock with real EventTarget support so that
 * addEventListener/removeEventListener/dispatchEvent work for EIP-6963 events.
 */
function createBrowserWindowMock() {
  const eventTarget = new EventTarget();

  const windowMock = {
    ethereum: undefined, // No legacy provider — we test EIP-6963 path only
    addEventListener: eventTarget.addEventListener.bind(eventTarget),
    removeEventListener: eventTarget.removeEventListener.bind(eventTarget),
    dispatchEvent: eventTarget.dispatchEvent.bind(eventTarget),
    CustomEvent: globalThis.CustomEvent,
  };

  return { windowMock, eventTarget };
}

/**
 * Dynamically imports walletProviders.ts after resetting the module registry,
 * so each test iteration gets a fresh module state (discoveredProviders = [], discoveryStarted = false).
 */
async function freshWalletProvidersModule() {
  vi.resetModules();
  const mod = await import("@/src/services/walletProviders");
  return mod;
}

describe("Property 3: EIP-6963 Provider UUID Deduplication", () => {
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
    vi.restoreAllMocks();
  });

  it("getAvailableWallets() returns at most one entry per info.uuid after announceProvider events", async () => {
    await fc.assert(
      fc.asyncProperty(providerArrayArb, async (providers) => {
        // Set up fresh browser window with real event dispatch
        const { windowMock } = createBrowserWindowMock();
        (globalThis as any).window = windowMock;

        const mod = await freshWalletProvidersModule();

        // Start discovery — registers the eip6963:announceProvider listener
        mod.startWalletDiscovery();

        // Dispatch announceProvider events for each provider in the generated array
        for (const detail of providers) {
          const event = new CustomEvent("eip6963:announceProvider", {
            detail,
          });
          windowMock.dispatchEvent(event);
        }

        // Get the resulting wallet list
        const wallets = mod.getAvailableWallets();

        // Collect all UUIDs from the result
        const resultUuids = wallets.map((w) => w.info.uuid);

        // Property: each UUID appears at most once
        const uniqueUuids = new Set(resultUuids);
        expect(resultUuids.length).toBe(uniqueUuids.size);

        // Also verify: every unique UUID from the input is represented
        const inputUniqueUuids = new Set(providers.map((p) => p.info.uuid));
        for (const uuid of inputUniqueUuids) {
          expect(uniqueUuids.has(uuid)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });
});
