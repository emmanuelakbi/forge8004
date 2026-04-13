"use client";

import { useEffect, useState } from "react";
import { X, Wallet } from "lucide-react";
import { cn } from "@/src/utils/cn";
import {
  getAvailableWallets,
  startWalletDiscovery,
  type WalletProvider,
} from "@/src/services/walletProviders";
import { selectWalletProvider, connectWallet } from "@/src/services/wallet";

interface WalletPickerModalProps {
  open: boolean;
  onClose: () => void;
  onConnected: (address: string) => void;
}

export default function WalletPickerModal({
  open,
  onClose,
  onConnected,
}: WalletPickerModalProps) {
  const [wallets, setWallets] = useState<WalletProvider[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startWalletDiscovery();
    // Small delay to let EIP-6963 announcements arrive
    const timer = setTimeout(() => {
      setWallets(getAvailableWallets());
    }, 150);
    return () => clearTimeout(timer);
  }, [open]);

  const handleSelect = async (wallet: WalletProvider) => {
    setConnecting(wallet.info.uuid);
    setError(null);
    try {
      selectWalletProvider(wallet);
      const address = await connectWallet();
      onConnected(address);
      onClose();
    } catch (err: any) {
      setError(
        err?.message === "WALLET_UNAVAILABLE"
          ? "Wallet not available"
          : "Connection failed. Try again.",
      );
    } finally {
      setConnecting(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm mx-4 border border-border-subtle bg-obsidian p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-cyber" />
            <h3 className="text-[11px] font-mono font-bold text-white uppercase tracking-[0.2em]">
              Connect Wallet
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-600 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {wallets.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              No wallets detected
            </p>
            <p className="text-[9px] font-mono text-zinc-700">
              Install MetaMask or another Web3 wallet extension.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {wallets.map((wallet) => (
              <button
                key={wallet.info.uuid}
                onClick={() => handleSelect(wallet)}
                disabled={connecting !== null}
                className={cn(
                  "w-full flex items-center gap-3 p-3 border border-border-subtle bg-obsidian/50 transition-all",
                  "hover:border-emerald-cyber/30 hover:bg-emerald-cyber/5",
                  connecting === wallet.info.uuid &&
                    "border-emerald-cyber/50 bg-emerald-cyber/10",
                  connecting !== null &&
                    connecting !== wallet.info.uuid &&
                    "opacity-40",
                )}
              >
                {wallet.info.icon ? (
                  <img
                    src={wallet.info.icon}
                    alt={wallet.info.name}
                    className="w-8 h-8 rounded"
                  />
                ) : (
                  <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-zinc-500" />
                  </div>
                )}
                <div className="text-left flex-1">
                  <p className="text-[10px] font-mono font-bold text-white uppercase tracking-wider">
                    {wallet.info.name}
                  </p>
                  {wallet.info.rdns && (
                    <p className="text-[8px] font-mono text-zinc-600 tracking-wider">
                      {wallet.info.rdns}
                    </p>
                  )}
                </div>
                {connecting === wallet.info.uuid && (
                  <span className="text-[8px] font-mono text-emerald-cyber uppercase tracking-widest animate-pulse">
                    Connecting...
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {error && (
          <p className="text-[9px] font-mono text-red-400 uppercase tracking-wider text-center">
            {error}
          </p>
        )}

        <p className="text-[8px] font-mono text-zinc-700 text-center uppercase tracking-wider">
          Select the wallet you want to use
        </p>
      </div>
    </div>
  );
}
