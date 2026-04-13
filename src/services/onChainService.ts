"use client";

import { BrowserProvider, Contract } from "ethers";
import AgentRegistryABI from "../lib/AgentRegistryABI.json";
import { CONFIG } from "../lib/config";

/** Returns a BrowserProvider wrapping the injected wallet, or null in SSR / no-wallet contexts. */
function getProvider() {
  if (typeof window === "undefined" || !(window as any).ethereum) return null;
  return new BrowserProvider((window as any).ethereum);
}

/**
 * Returns an ethers Contract instance for the AgentRegistry.
 *
 * When `withSigner` is true the function first requests the wallet to switch
 * to Base Sepolia (chain ID from CONFIG). If the chain is not yet added to
 * the wallet it will be added automatically via `wallet_addEthereumChain`.
 * This ensures write transactions are always submitted on the correct network.
 *
 * @param withSigner - If true, returns a signer-connected contract for write ops.
 * @returns Contract instance, or null if provider/address is unavailable.
 */
async function getContract(withSigner = false) {
  const address = CONFIG.REGISTRIES.IDENTITY;
  if (!address || address.startsWith("0x1234")) return null; // placeholder check

  const provider = getProvider();
  if (!provider) return null;

  if (withSigner) {
    // Ensure MetaMask is on Base Sepolia before sending transactions
    try {
      await (window as any).ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${CONFIG.CHAIN_ID.toString(16)}` }],
      });
    } catch (switchError: any) {
      // Chain not added to MetaMask — add it
      if (switchError.code === 4902) {
        await (window as any).ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: `0x${CONFIG.CHAIN_ID.toString(16)}`,
              chainName: "Base Sepolia",
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: [CONFIG.RPC_URL],
              blockExplorerUrls: ["https://sepolia.basescan.org"],
            },
          ],
        });
      }
    }
    const signer = await provider.getSigner();
    return new Contract(address, AgentRegistryABI, signer);
  }
  return new Contract(address, AgentRegistryABI, provider);
}

export const onChainService = {
  isAvailable(): boolean {
    if (typeof window === "undefined") return false;
    const address = CONFIG.REGISTRIES.IDENTITY;
    return (
      !!(window as any).ethereum && !!address && !address.startsWith("0x1234")
    );
  },

  async registerAgent(
    firestoreId: string,
    name: string,
    strategyType: string,
  ): Promise<{ tokenId: number; txHash: string } | null> {
    try {
      const contract = await getContract(true);
      if (!contract) return null;

      const signer = await getProvider()!.getSigner();
      const tx = await contract.registerAgent(
        signer.address,
        firestoreId,
        name,
        strategyType,
      );
      const receipt = await tx.wait();

      // Parse the AgentRegistered event to get tokenId
      const event = receipt.logs.find((log: any) => {
        try {
          return contract.interface.parseLog(log)?.name === "AgentRegistered";
        } catch {
          return false;
        }
      });

      const parsed = event ? contract.interface.parseLog(event) : null;
      const tokenId = parsed ? Number(parsed.args.tokenId) : 0;

      return { tokenId, txHash: receipt.hash };
    } catch (error: any) {
      console.error("[OnChain] registerAgent failed:", error.message || error);
      return null;
    }
  },

  async anchorCheckpoint(
    tokenId: number,
    checkpointHash: string,
  ): Promise<{ txHash: string } | null> {
    try {
      const contract = await getContract(true);
      if (!contract) return null;

      const tx = await contract.anchorCheckpoint(tokenId, checkpointHash);
      const receipt = await tx.wait();
      return { txHash: receipt.hash };
    } catch (error: any) {
      console.error(
        "[OnChain] anchorCheckpoint failed:",
        error.message || error,
      );
      return null;
    }
  },

  async getAgentMeta(tokenId: number): Promise<{
    strategyType: string;
    name: string;
    registeredAt: number;
  } | null> {
    try {
      const contract = await getContract();
      if (!contract) return null;

      const meta = await contract.agents(tokenId);
      return {
        strategyType: meta.strategyType,
        name: meta.name,
        registeredAt: Number(meta.registeredAt),
      };
    } catch {
      return null;
    }
  },

  async getCheckpointAnchor(
    tokenId: number,
  ): Promise<{ hash: string; timestamp: number } | null> {
    try {
      const contract = await getContract();
      if (!contract) return null;

      const [hash, ts] = await Promise.all([
        contract.checkpointAnchors(tokenId),
        contract.checkpointTimestamps(tokenId),
      ]);
      if (hash === "0x" + "0".repeat(64)) return null;
      return { hash, timestamp: Number(ts) };
    } catch {
      return null;
    }
  },

  async getTokenIdForAgent(firestoreId: string): Promise<number | null> {
    try {
      const contract = await getContract();
      if (!contract) return null;

      const tokenId = Number(await contract.firestoreToToken(firestoreId));
      return tokenId > 0 ? tokenId : null;
    } catch {
      return null;
    }
  },
};
