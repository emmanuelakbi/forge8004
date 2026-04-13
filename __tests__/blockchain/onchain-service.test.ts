/**
 * Unit tests for onChainService SSR safety
 *
 * Validates: Requirements 2.1, 2.3, 2.4, 2.6, 2.7, 2.8
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// Mock ethers before importing the service
vi.mock("ethers", () => {
  const MockContract = vi.fn();
  const MockBrowserProvider = vi.fn();
  return {
    BrowserProvider: MockBrowserProvider,
    Contract: MockContract,
  };
});

describe("onChainService", () => {
  describe("'use client' directive", () => {
    it("should have 'use client' as the first statement in the file", () => {
      const source = readFileSync(
        resolve(__dirname, "../../src/services/onChainService.ts"),
        "utf-8",
      );
      const trimmed = source.trimStart();
      expect(trimmed.startsWith('"use client"')).toBe(true);
    });
  });

  describe("SSR safety (no window)", () => {
    // In Node/vitest default env, `window` is undefined — this IS the SSR scenario

    it("isAvailable() should return false during SSR", async () => {
      vi.resetModules();
      const { onChainService } = await import("@/src/services/onChainService");
      expect(onChainService.isAvailable()).toBe(false);
    });

    it("registerAgent should return null during SSR (no provider)", async () => {
      vi.resetModules();
      const { onChainService } = await import("@/src/services/onChainService");
      const result = await onChainService.registerAgent(
        "agent-1",
        "TestAgent",
        "momentum",
      );
      expect(result).toBeNull();
    });

    it("anchorCheckpoint should return null during SSR (no provider)", async () => {
      vi.resetModules();
      const { onChainService } = await import("@/src/services/onChainService");
      const result = await onChainService.anchorCheckpoint(1, "0xabc");
      expect(result).toBeNull();
    });

    it("getAgentMeta should return null during SSR", async () => {
      vi.resetModules();
      const { onChainService } = await import("@/src/services/onChainService");
      const result = await onChainService.getAgentMeta(1);
      expect(result).toBeNull();
    });

    it("getCheckpointAnchor should return null during SSR", async () => {
      vi.resetModules();
      const { onChainService } = await import("@/src/services/onChainService");
      const result = await onChainService.getCheckpointAnchor(1);
      expect(result).toBeNull();
    });

    it("getTokenIdForAgent should return null during SSR", async () => {
      vi.resetModules();
      const { onChainService } = await import("@/src/services/onChainService");
      const result = await onChainService.getTokenIdForAgent("agent-1");
      expect(result).toBeNull();
    });
  });

  describe("contract failure error handling", () => {
    let originalWindow: any;

    beforeEach(() => {
      originalWindow = globalThis.window;
    });

    afterEach(() => {
      if (originalWindow === undefined) {
        delete (globalThis as any).window;
      } else {
        (globalThis as any).window = originalWindow;
      }
      vi.restoreAllMocks();
    });

    it("registerAgent should return null and log error on contract failure", async () => {
      // Set up a fake window.ethereum and a non-placeholder identity address
      (globalThis as any).window = { ethereum: {} };

      vi.resetModules();

      // Mock config to use a non-placeholder address
      vi.doMock("@/src/lib/config", () => ({
        CONFIG: {
          CHAIN_ID: 84532,
          RPC_URL: "https://sepolia.base.org",
          REGISTRIES: {
            IDENTITY: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            REPUTATION: "0x0000000000000000000000000000000000000000",
            VALIDATION: "0x0000000000000000000000000000000000000000",
            RISK_ROUTER: "0x0000000000000000000000000000000000000000",
            VAULT: "0x0000000000000000000000000000000000000000",
            CAPITAL_VAULT: "0x0000000000000000000000000000000000000000",
          },
        },
      }));

      // Mock ethers so BrowserProvider/Contract throw
      vi.doMock("ethers", () => ({
        BrowserProvider: vi.fn().mockImplementation(() => ({
          getSigner: vi.fn().mockRejectedValue(new Error("signer failed")),
        })),
        Contract: vi.fn().mockImplementation(() => ({
          registerAgent: vi.fn().mockRejectedValue(new Error("tx failed")),
        })),
      }));

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const { onChainService } = await import("@/src/services/onChainService");
      const result = await onChainService.registerAgent(
        "agent-1",
        "TestAgent",
        "momentum",
      );

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[OnChain] registerAgent failed:"),
        expect.anything(),
      );

      consoleSpy.mockRestore();
    });

    it("anchorCheckpoint should return null and log error on contract failure", async () => {
      (globalThis as any).window = { ethereum: {} };

      vi.resetModules();

      vi.doMock("@/src/lib/config", () => ({
        CONFIG: {
          CHAIN_ID: 84532,
          RPC_URL: "https://sepolia.base.org",
          REGISTRIES: {
            IDENTITY: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            REPUTATION: "0x0000000000000000000000000000000000000000",
            VALIDATION: "0x0000000000000000000000000000000000000000",
            RISK_ROUTER: "0x0000000000000000000000000000000000000000",
            VAULT: "0x0000000000000000000000000000000000000000",
            CAPITAL_VAULT: "0x0000000000000000000000000000000000000000",
          },
        },
      }));

      vi.doMock("ethers", () => ({
        BrowserProvider: vi.fn().mockImplementation(() => ({
          getSigner: vi.fn().mockRejectedValue(new Error("signer failed")),
        })),
        Contract: vi.fn().mockImplementation(() => ({
          anchorCheckpoint: vi
            .fn()
            .mockRejectedValue(new Error("anchor failed")),
        })),
      }));

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const { onChainService } = await import("@/src/services/onChainService");
      const result = await onChainService.anchorCheckpoint(1, "0xabc123");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[OnChain] anchorCheckpoint failed:"),
        expect.anything(),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("chain switching (wallet_switchEthereumChain)", () => {
    let originalWindow: any;

    const VALID_CONFIG = {
      CHAIN_ID: 84532,
      RPC_URL: "https://sepolia.base.org",
      REGISTRIES: {
        IDENTITY: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        REPUTATION: "0x0000000000000000000000000000000000000000",
        VALIDATION: "0x0000000000000000000000000000000000000000",
        RISK_ROUTER: "0x0000000000000000000000000000000000000000",
        VAULT: "0x0000000000000000000000000000000000000000",
        CAPITAL_VAULT: "0x0000000000000000000000000000000000000000",
      },
    };

    beforeEach(() => {
      originalWindow = globalThis.window;
    });

    afterEach(() => {
      if (originalWindow === undefined) {
        delete (globalThis as any).window;
      } else {
        (globalThis as any).window = originalWindow;
      }
      vi.restoreAllMocks();
    });

    it("should call wallet_switchEthereumChain with correct chainId before getting signer", async () => {
      const mockRequest = vi.fn().mockResolvedValue(null);
      (globalThis as any).window = { ethereum: { request: mockRequest } };

      vi.resetModules();
      vi.doMock("@/src/lib/config", () => ({ CONFIG: VALID_CONFIG }));

      const mockSigner = { address: "0xuser" };
      vi.doMock("ethers", () => ({
        BrowserProvider: function () {
          this.getSigner = vi.fn().mockResolvedValue(mockSigner);
        },
        Contract: function () {
          this.registerAgent = vi.fn().mockResolvedValue({
            wait: vi.fn().mockResolvedValue({ hash: "0xtx", logs: [] }),
          });
        },
      }));

      const { onChainService } = await import("@/src/services/onChainService");
      await onChainService.registerAgent("agent-1", "Test", "momentum");

      expect(mockRequest).toHaveBeenCalledWith({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x14a34" }],
      });
    });

    it("should call wallet_addEthereumChain when switch fails with code 4902", async () => {
      const switchError = Object.assign(new Error("chain not found"), {
        code: 4902,
      });
      const mockRequest = vi.fn().mockImplementation(({ method }: any) => {
        if (method === "wallet_switchEthereumChain")
          return Promise.reject(switchError);
        return Promise.resolve(null);
      });
      (globalThis as any).window = { ethereum: { request: mockRequest } };

      vi.resetModules();
      vi.doMock("@/src/lib/config", () => ({ CONFIG: VALID_CONFIG }));

      const mockSigner = { address: "0xuser" };
      vi.doMock("ethers", () => ({
        BrowserProvider: function () {
          this.getSigner = vi.fn().mockResolvedValue(mockSigner);
        },
        Contract: function () {
          this.registerAgent = vi.fn().mockResolvedValue({
            wait: vi.fn().mockResolvedValue({ hash: "0xtx", logs: [] }),
          });
        },
      }));

      const { onChainService } = await import("@/src/services/onChainService");
      await onChainService.registerAgent("agent-1", "Test", "momentum");

      expect(mockRequest).toHaveBeenCalledWith({
        method: "wallet_addEthereumChain",
        params: [
          expect.objectContaining({
            chainId: "0x14a34",
            chainName: "Base Sepolia",
            rpcUrls: [VALID_CONFIG.RPC_URL],
          }),
        ],
      });
    });

    it("should not call wallet_addEthereumChain when switch fails with non-4902 error", async () => {
      const otherError = Object.assign(new Error("user rejected"), {
        code: 4001,
      });
      const mockRequest = vi.fn().mockImplementation(({ method }: any) => {
        if (method === "wallet_switchEthereumChain")
          return Promise.reject(otherError);
        return Promise.resolve(null);
      });
      (globalThis as any).window = { ethereum: { request: mockRequest } };

      vi.resetModules();
      vi.doMock("@/src/lib/config", () => ({ CONFIG: VALID_CONFIG }));

      const mockSigner = { address: "0xuser" };
      vi.doMock("ethers", () => ({
        BrowserProvider: function () {
          this.getSigner = vi.fn().mockResolvedValue(mockSigner);
        },
        Contract: function () {
          this.registerAgent = vi.fn().mockResolvedValue({
            wait: vi.fn().mockResolvedValue({ hash: "0xtx", logs: [] }),
          });
        },
      }));

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const { onChainService } = await import("@/src/services/onChainService");
      await onChainService.registerAgent("agent-1", "Test", "momentum");

      expect(mockRequest).not.toHaveBeenCalledWith(
        expect.objectContaining({ method: "wallet_addEthereumChain" }),
      );

      consoleSpy.mockRestore();
    });

    it("should not attempt chain switching for read-only calls (withSigner=false)", async () => {
      const mockRequest = vi.fn().mockResolvedValue(null);
      (globalThis as any).window = { ethereum: { request: mockRequest } };

      vi.resetModules();
      vi.doMock("@/src/lib/config", () => ({ CONFIG: VALID_CONFIG }));

      vi.doMock("ethers", () => ({
        BrowserProvider: function () {},
        Contract: function () {
          this.agents = vi.fn().mockResolvedValue({
            strategyType: "momentum",
            name: "Test",
            registeredAt: BigInt(1000),
          });
        },
      }));

      const { onChainService } = await import("@/src/services/onChainService");
      await onChainService.getAgentMeta(1);

      expect(mockRequest).not.toHaveBeenCalledWith(
        expect.objectContaining({ method: "wallet_switchEthereumChain" }),
      );
    });
  });

  describe("public API surface", () => {
    it("should export all expected methods on onChainService", async () => {
      vi.resetModules();
      const { onChainService } = await import("@/src/services/onChainService");

      const expectedMethods = [
        "isAvailable",
        "registerAgent",
        "anchorCheckpoint",
        "getAgentMeta",
        "getCheckpointAnchor",
        "getTokenIdForAgent",
      ];

      for (const method of expectedMethods) {
        expect(onChainService).toHaveProperty(method);
        expect(typeof (onChainService as any)[method]).toBe("function");
      }
    });
  });
});
