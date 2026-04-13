"use client";

import { hashTypedData, recoverTypedDataAddress, type Address } from "viem";
import { AgentIdentity, TradeIntent } from "../lib/types";
import { createIntentEnvelope } from "./trustArtifacts";
import {
  type WalletProvider,
  startWalletDiscovery,
  findWalletByUuid,
} from "./walletProviders";

const STORAGE_KEY = "forge8004.wallet.address";
const SELECTED_WALLET_KEY = "forge8004.wallet.selected";
const WALLET_EVENT = "forge8004:wallet-change";

let selectedProvider: any = null;

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<any>;
      on?: (event: string, listener: (...args: any[]) => void) => void;
      removeListener?: (
        event: string,
        listener: (...args: any[]) => void,
      ) => void;
    };
  }
}

function emitWalletChange(address: string | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WALLET_EVENT, { detail: { address } }));
}

function getProvider() {
  // Restore selected provider on page refresh
  if (!selectedProvider && typeof window !== "undefined") {
    const savedUuid = window.localStorage.getItem(SELECTED_WALLET_KEY);
    if (savedUuid) {
      startWalletDiscovery();
      const wallet = findWalletByUuid(savedUuid);
      if (wallet) selectedProvider = wallet.provider;
    }
  }
  return (
    selectedProvider ||
    (typeof window !== "undefined" ? window.ethereum : undefined)
  );
}

/** Select a specific wallet provider (from EIP-6963 discovery) */
export function selectWalletProvider(wallet: WalletProvider) {
  selectedProvider = wallet.provider;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SELECTED_WALLET_KEY, wallet.info.uuid);
  }
}

/** Clear the selected provider */
export function clearSelectedProvider() {
  selectedProvider = null;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(SELECTED_WALLET_KEY);
  }
}

export function getStoredWalletAddress() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export async function getConnectedWalletAddress() {
  // On page load, just return the stored address — don't call the provider.
  // This avoids triggering wallet extension conflicts (e.g. ME wallet vs MetaMask).
  // The provider is only called when the user explicitly connects via connectWallet().
  const stored = getStoredWalletAddress();
  if (stored) return stored;

  // No stored address — try the provider as a last resort
  const provider = getProvider();
  if (typeof window === "undefined" || !provider) {
    return null;
  }

  try {
    const accounts = await provider.request({ method: "eth_accounts" });
    const address =
      Array.isArray(accounts) && accounts.length > 0 ? accounts[0] : null;

    if (address) {
      window.localStorage.setItem(STORAGE_KEY, address);
    }

    return address || getStoredWalletAddress();
  } catch {
    // Wallet extension error (e.g. multiple extensions conflicting)
    return getStoredWalletAddress();
  }
}

export async function connectWallet() {
  const provider = getProvider();
  if (typeof window === "undefined" || !provider) {
    throw new Error("WALLET_UNAVAILABLE");
  }

  const accounts = await provider.request({
    method: "eth_requestAccounts",
  });
  const address =
    Array.isArray(accounts) && accounts.length > 0 ? accounts[0] : null;

  if (!address) {
    throw new Error("WALLET_NOT_CONNECTED");
  }

  window.localStorage.setItem(STORAGE_KEY, address);
  emitWalletChange(address);
  return address;
}

export async function disconnectWallet() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(SELECTED_WALLET_KEY);

  const provider = getProvider();
  if (provider) {
    try {
      await provider.request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch {
      // Older wallets don't support this — that's fine
    }
  }

  selectedProvider = null;
  emitWalletChange(null);
}

export function onWalletChange(listener: (address: string | null) => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handle = (event: Event) => {
    const customEvent = event as CustomEvent<{ address: string | null }>;
    listener(customEvent.detail?.address ?? null);
  };

  window.addEventListener(WALLET_EVENT, handle);
  return () => window.removeEventListener(WALLET_EVENT, handle);
}

export async function signTradeIntentWithWallet(
  identity: AgentIdentity,
  intent: TradeIntent,
) {
  const signerAddress = await connectWallet();
  return signTradeIntentWithWalletInternal(identity, intent, signerAddress);
}

export async function signTradeIntentWithAvailableWallet(
  identity: AgentIdentity,
  intent: TradeIntent,
) {
  const provider = getProvider();
  if (typeof window === "undefined" || !provider) {
    throw new Error("WALLET_UNAVAILABLE");
  }

  const signerAddress = await getConnectedWalletAddress();
  if (!signerAddress) {
    throw new Error("WALLET_NOT_CONNECTED");
  }

  return signTradeIntentWithWalletInternal(identity, intent, signerAddress);
}

async function signTradeIntentWithWalletInternal(
  identity: AgentIdentity,
  intent: TradeIntent,
  signerAddress: string,
) {
  const envelope = createIntentEnvelope(identity, intent);

  if (intent.side === "HOLD") {
    return {
      ...envelope,
      signer: {
        ...envelope.signer,
        owner: signerAddress,
        mode: "OWNER_WALLET_EIP712" as const,
        verification: "RECOVERED_EOA" as const,
      },
      signature: {
        status: "NOT_REQUIRED" as const,
        scheme: "EIP-712" as const,
        digest: `0x${"0".repeat(64)}`,
        value: `0x${"0".repeat(130)}`,
      },
    };
  }

  if (!getProvider()) {
    throw new Error("WALLET_UNAVAILABLE");
  }

  const typedDataForWallet = {
    domain: envelope.typedIntent.domain as {
      chainId?: number | bigint;
      name?: string;
      salt?: `0x${string}`;
      verifyingContract?: `0x${string}`;
      version?: string;
    },
    primaryType: envelope.typedIntent.primaryType,
    types: {
      TradeIntent: [
        { name: "intentId", type: "string" },
        { name: "agentId", type: "string" },
        { name: "agentWallet", type: "address" },
        { name: "side", type: "string" },
        { name: "asset", type: "string" },
        { name: "size", type: "uint256" },
        { name: "capitalAllocated", type: "uint256" },
        { name: "stopLoss", type: "uint256" },
        { name: "takeProfit", type: "uint256" },
        { name: "timestamp", type: "uint256" },
        { name: "nonce", type: "string" },
      ],
    },
    message: {
      ...envelope.typedIntent.message,
      agentWallet: envelope.typedIntent.message.agentWallet as Address,
      size: BigInt(Math.round(envelope.typedIntent.message.size * 100_000_000)),
      capitalAllocated: BigInt(
        Math.round(envelope.typedIntent.message.capitalAllocated * 100),
      ),
      stopLoss: BigInt(Math.round(envelope.typedIntent.message.stopLoss * 100)),
      takeProfit: BigInt(
        Math.round(envelope.typedIntent.message.takeProfit * 100),
      ),
      timestamp: BigInt(envelope.typedIntent.message.timestamp),
    },
  } as const;

  const signature = await getProvider().request({
    method: "eth_signTypedData_v4",
    params: [signerAddress, JSON.stringify(typedDataForWallet)],
  });

  const recovered = await recoverTypedDataAddress({
    domain: typedDataForWallet.domain,
    primaryType: typedDataForWallet.primaryType,
    types: typedDataForWallet.types,
    message: typedDataForWallet.message,
    signature,
  });

  if (recovered.toLowerCase() !== signerAddress.toLowerCase()) {
    throw new Error("SIGNATURE_VERIFICATION_FAILED");
  }

  const digest = hashTypedData({
    domain: typedDataForWallet.domain,
    primaryType: typedDataForWallet.primaryType,
    types: typedDataForWallet.types,
    message: typedDataForWallet.message,
  });

  return {
    ...envelope,
    signer: {
      ...envelope.signer,
      owner: signerAddress,
      mode: "OWNER_WALLET_EIP712" as const,
      verification: "RECOVERED_EOA" as const,
    },
    signature: {
      status: "SIGNED_VERIFIED" as const,
      scheme: "EIP-712" as const,
      digest,
      value: signature,
    },
  };
}
