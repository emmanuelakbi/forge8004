/**
 * Unit tests for EIP-712 signing edge cases
 *
 * Validates: Requirements 5.4, 5.8
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AgentIdentity, TradeIntent } from "@/src/lib/types";

// Hoisted mock control — accessible inside the vi.mock factory
const { mockRecoverAddress } = vi.hoisted(() => {
  const mockRecoverAddress = vi.fn();
  return { mockRecoverAddress };
});

vi.mock("viem", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    recoverTypedDataAddress: mockRecoverAddress,
  };
});

/**
 * Creates a browser window mock with real EventTarget-based event dispatch/listen.
 */
function createBrowserWindowMock(defaultAddress: string) {
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
  };

  const mockEthereum = {
    request: vi.fn().mockImplementation(async (args: any) => {
      if (args.method === "eth_requestAccounts") {
        return [defaultAddress];
      }
      if (args.method === "eth_accounts") {
        return [defaultAddress];
      }
      if (args.method === "eth_signTypedData_v4") {
        return `0x${"ab".repeat(65)}`;
      }
      if (args.method === "wallet_revokePermissions") {
        return null;
      }
      return [];
    }),
  };

  const windowMock = {
    ethereum: mockEthereum,
    localStorage,
    addEventListener: eventTarget.addEventListener.bind(eventTarget),
    removeEventListener: eventTarget.removeEventListener.bind(eventTarget),
    dispatchEvent: eventTarget.dispatchEvent.bind(eventTarget),
    CustomEvent: globalThis.CustomEvent,
  };

  return { windowMock, mockEthereum };
}

const identity: AgentIdentity = {
  agentId: "agent-test-1",
  owner: "owner-1",
  name: "TestAgent",
  description: "A test agent",
  strategyType: "momentum",
  riskProfile: "balanced",
};

const holdIntent: TradeIntent = {
  agentId: "agent-test-1",
  side: "HOLD",
  asset: "ETH",
  size: 1.0,
  timestamp: 1700000000000,
};

const buyIntent: TradeIntent = {
  agentId: "agent-test-1",
  side: "BUY",
  asset: "ETH",
  size: 1.5,
  timestamp: 1700000000000,
};

describe("EIP-712 signing edge cases", () => {
  let originalWindow: any;
  let originalBigIntToJSON: any;

  beforeEach(() => {
    originalWindow = (globalThis as any).window;
    mockRecoverAddress.mockReset();
    // BigInt can't be serialized by JSON.stringify — add a toJSON so the
    // eth_signTypedData_v4 call in wallet.ts doesn't throw in tests.
    originalBigIntToJSON = (BigInt.prototype as any).toJSON;
    (BigInt.prototype as any).toJSON = function () {
      return this.toString();
    };
  });

  afterEach(() => {
    if (originalBigIntToJSON === undefined) {
      delete (BigInt.prototype as any).toJSON;
    } else {
      (BigInt.prototype as any).toJSON = originalBigIntToJSON;
    }
    if (originalWindow === undefined) {
      delete (globalThis as any).window;
    } else {
      (globalThis as any).window = originalWindow;
    }
    delete (globalThis as any).localStorage;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  describe("HOLD intent returns NOT_REQUIRED without signing", () => {
    it("should return signature.status NOT_REQUIRED and scheme EIP-712 without calling eth_signTypedData_v4", async () => {
      const signerAddress = "0xaabbccddee1234567890aabbccddee1234567890";
      const { windowMock, mockEthereum } =
        createBrowserWindowMock(signerAddress);
      (globalThis as any).window = windowMock;
      (globalThis as any).localStorage = windowMock.localStorage;

      const { signTradeIntentWithWallet } =
        await import("@/src/services/wallet");

      const result = await signTradeIntentWithWallet(identity, holdIntent);

      expect(result.signature.status).toBe("NOT_REQUIRED");
      expect(result.signature.scheme).toBe("EIP-712");

      // eth_signTypedData_v4 should NOT have been called
      const signCalls = mockEthereum.request.mock.calls.filter(
        (call: any) => call[0]?.method === "eth_signTypedData_v4",
      );
      expect(signCalls).toHaveLength(0);
    });
  });

  describe("signature mismatch throws SIGNATURE_VERIFICATION_FAILED", () => {
    it("should throw SIGNATURE_VERIFICATION_FAILED when recovered address differs from signer", async () => {
      const signerAddress = "0xaabbccddee1234567890aabbccddee1234567890";
      const differentAddress = "0x1111111111111111111111111111111111111111";
      const { windowMock } = createBrowserWindowMock(signerAddress);
      (globalThis as any).window = windowMock;
      (globalThis as any).localStorage = windowMock.localStorage;

      // recoverTypedDataAddress returns a different address than the signer
      mockRecoverAddress.mockResolvedValue(differentAddress);

      const { signTradeIntentWithWallet } =
        await import("@/src/services/wallet");

      await expect(
        signTradeIntentWithWallet(identity, buyIntent),
      ).rejects.toThrow("SIGNATURE_VERIFICATION_FAILED");
    });
  });
});
