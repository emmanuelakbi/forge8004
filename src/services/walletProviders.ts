"use client";

/**
 * EIP-6963 multi-wallet provider detection.
 * Discovers all injected wallet extensions and lets the user pick one.
 */

export type WalletProvider = {
  info: {
    uuid: string;
    name: string;
    icon: string;
    rdns?: string;
  };
  provider: any;
};

const discoveredProviders: WalletProvider[] = [];
let discoveryStarted = false;

/** Start listening for EIP-6963 wallet announcements */
export function startWalletDiscovery() {
  if (discoveryStarted || typeof window === "undefined") return;
  discoveryStarted = true;

  window.addEventListener("eip6963:announceProvider", ((event: CustomEvent) => {
    const { info, provider } = event.detail || {};
    if (!info?.uuid || !provider) return;
    // Avoid duplicates
    if (discoveredProviders.some((w) => w.info.uuid === info.uuid)) return;
    discoveredProviders.push({ info, provider });
  }) as EventListener);

  // Request announcements from all installed wallets
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

/** Get all discovered wallet providers */
export function getAvailableWallets(): WalletProvider[] {
  if (typeof window === "undefined") return [];
  // Also check for legacy window.ethereum if no EIP-6963 providers found
  if (discoveredProviders.length === 0 && window.ethereum) {
    // Check if window.ethereum has a providers array (some wallets expose this)
    const legacyProviders = (window.ethereum as any).providers;
    if (Array.isArray(legacyProviders) && legacyProviders.length > 0) {
      return legacyProviders.map((p: any, i: number) => ({
        info: {
          uuid: `legacy-${i}`,
          name: p.isMetaMask
            ? "MetaMask"
            : p.isCoinbaseWallet
              ? "Coinbase Wallet"
              : p.isPhantom
                ? "Phantom"
                : `Wallet ${i + 1}`,
          icon: "",
          rdns: p.isMetaMask ? "io.metamask" : undefined,
        },
        provider: p,
      }));
    }

    // Single legacy provider
    return [
      {
        info: {
          uuid: "legacy-0",
          name: (window.ethereum as any).isMetaMask
            ? "MetaMask"
            : (window.ethereum as any).isCoinbaseWallet
              ? "Coinbase Wallet"
              : "Browser Wallet",
          icon: "",
        },
        provider: window.ethereum,
      },
    ];
  }

  return [...discoveredProviders];
}

/** Check if multiple wallets are available */
export function hasMultipleWallets(): boolean {
  return getAvailableWallets().length > 1;
}

/** Find a wallet provider by its stored UUID */
export function findWalletByUuid(uuid: string): WalletProvider | undefined {
  return getAvailableWallets().find((w) => w.info.uuid === uuid);
}
