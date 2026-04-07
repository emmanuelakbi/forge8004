import { cn } from "../../utils/cn";
import React, { useState, useEffect, useRef } from "react";
import {
  Wallet,
  ChevronDown,
  Globe,
  Menu,
  LogIn,
  LogOut,
  Mail,
  UserPlus,
  X,
} from "lucide-react";
import {
  auth,
  signInWithPopup,
  signInWithRedirect,
  googleProvider,
  subscribeToAuthState,
  resolveRedirectSignInResult,
  User,
  browserPopupRedirectResolver,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  resolvedFirebaseConfig,
} from "../../data/firebase";
import {
  connectWallet as connectBrowserWallet,
  disconnectWallet,
  getConnectedWalletAddress,
  onWalletChange,
} from "../../services/wallet";
import WalletPickerModal from "./WalletPickerModal";
import {
  getAvailableWallets,
  startWalletDiscovery,
} from "../../services/walletProviders";

export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isAuthPanelOpen, setIsAuthPanelOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isGoogleReachable, setIsGoogleReachable] = useState<boolean | null>(
    null,
  );
  const [gasPrice, setGasPrice] = useState<string | null>(null);
  const [gasPriceEth, setGasPriceEth] = useState<string | null>(null);
  const [isWalletPickerOpen, setIsWalletPickerOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const authPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    resolveRedirectSignInResult().catch(() => null);

    const unsubscribe = subscribeToAuthState((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setAuthError(null);
        setIsAuthPanelOpen(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    getConnectedWalletAddress()
      .then((addr) => {
        if (addr) setWalletAddress(addr);
      })
      .catch(() => {
        /* keep existing wallet state on error */
      });

    const unsubscribeWallet = onWalletChange(setWalletAddress);

    return () => {
      unsubscribeWallet();
    };
  }, []);

  useEffect(() => {
    const fetchGas = async () => {
      if (!walletAddress) return;
      try {
        const provider = (window as any).ethereum;
        if (!provider) return;
        const hex = await provider.request({ method: "eth_gasPrice" });
        const gasPriceWei = parseInt(hex, 16);
        // Typical tx ~100k gas. Convert to ETH, then to USD.
        const txCostEth = (gasPriceWei * 100_000) / 1e18;
        // Format ETH cost
        setGasPriceEth(
          txCostEth < 0.00001 ? "<0.00001 ETH" : `~${txCostEth.toFixed(5)} ETH`,
        );
        // Fetch ETH price
        const res = await fetch("/api/market");
        if (res.ok) {
          const data = await res.json();
          const ethPrice = data.ethereum?.usd || 2500;
          const txCostUsd = txCostEth * ethPrice;
          setGasPrice(
            txCostUsd < 0.01 ? "<$0.01" : `~$${txCostUsd.toFixed(2)}`,
          );
        } else {
          setGasPrice(
            txCostEth < 0.000001
              ? "<$0.01"
              : `~$${(txCostEth * 2500).toFixed(2)}`,
          );
        }
      } catch {
        /* ignore */
      }
    };
    fetchGas();
    const interval = setInterval(fetchGas, 60_000);
    return () => clearInterval(interval);
  }, [walletAddress]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const controller = new AbortController();
    const authDomain = resolvedFirebaseConfig.authDomain;

    if (!authDomain) {
      setIsGoogleReachable(false);
      return;
    }

    const probeAuthHandler = async () => {
      try {
        const timeoutId = window.setTimeout(() => controller.abort(), 4000);
        await fetch(`https://${authDomain}/__/auth/iframe`, {
          method: "GET",
          mode: "no-cors",
          cache: "no-store",
          signal: controller.signal,
        });
        window.clearTimeout(timeoutId);
        setIsGoogleReachable(true);
      } catch {
        setIsGoogleReachable(false);
      }
    };

    void probeAuthHandler();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!isProfileMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isProfileMenuOpen]);

  useEffect(() => {
    if (!isAuthPanelOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!authPanelRef.current?.contains(event.target as Node)) {
        setIsAuthPanelOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAuthPanelOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isAuthPanelOpen]);

  const handleConnectWallet = async () => {
    startWalletDiscovery();
    const wallets = getAvailableWallets();
    if (wallets.length > 1) {
      // Multiple wallets — show picker
      setIsWalletPickerOpen(true);
    } else if (wallets.length === 1) {
      // Single wallet — connect directly
      try {
        const { selectWalletProvider } = await import("../../services/wallet");
        selectWalletProvider(wallets[0]);
        const address = await connectBrowserWallet();
        setWalletAddress(address);
      } catch (err: any) {
        if (err?.message === "WALLET_UNAVAILABLE") {
          alert("Please install MetaMask or another Web3 wallet.");
          return;
        }
        console.error("Wallet connection failed:", err);
      }
    } else {
      alert("Please install MetaMask or another Web3 wallet.");
    }
  };

  const handleDisconnectWallet = async () => {
    await disconnectWallet();
    setWalletAddress(null);
  };

  const handleLogin = async () => {
    try {
      setIsProfileMenuOpen(false);
      setAuthError(null);
      await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
    } catch (err: any) {
      const errorCode = typeof err?.code === "string" ? err.code : "";

      if (
        errorCode === "auth/popup-blocked" ||
        errorCode === "auth/popup-closed-by-user" ||
        errorCode === "auth/cancelled-popup-request" ||
        errorCode === "auth/web-storage-unsupported"
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectError) {
          console.error("Redirect login failed:", redirectError);
        }
      }

      if (errorCode === "auth/unauthorized-domain") {
        setAuthError(
          "Firebase needs localhost added to Authorized Domains before Google sign-in can work here.",
        );
      } else if (errorCode === "auth/operation-not-allowed") {
        setAuthError(
          "Google sign-in is not enabled in this Firebase project yet. Turn on Google under Authentication > Sign-in method.",
        );
      } else if (errorCode === "auth/network-request-failed") {
        setAuthError(
          "Google sign-in could not reach Firebase. Try again in a normal browser tab and disable VPN, ad blockers, or strict privacy shields for localhost.",
        );
      } else {
        setAuthError(
          "Authentication failed. Try again, and if the popup is blocked the app will retry with redirect mode.",
        );
      }
      console.error("Login failed:", err);
    }
  };

  const handleEmailAuth = async () => {
    try {
      setAuthError(null);
      setIsAuthSubmitting(true);

      if (authMode === "register") {
        const credential = await createUserWithEmailAndPassword(
          auth,
          authEmail.trim(),
          authPassword,
        );
        if (authName.trim()) {
          await updateProfile(credential.user, {
            displayName: authName.trim(),
          });
        }
      } else {
        await signInWithEmailAndPassword(auth, authEmail.trim(), authPassword);
      }

      setAuthName("");
      setAuthEmail("");
      setAuthPassword("");
      setIsAuthPanelOpen(false);
    } catch (err: any) {
      const errorCode = typeof err?.code === "string" ? err.code : "";

      if (errorCode === "auth/operation-not-allowed") {
        setAuthError(
          "Email/password sign-in is not enabled in this Firebase project yet. Turn it on under Authentication > Sign-in method.",
        );
      } else if (errorCode === "auth/email-already-in-use") {
        setAuthError(
          "That email is already in use. Switch to Sign In or use a different email.",
        );
      } else if (errorCode === "auth/weak-password") {
        setAuthError("Password is too weak. Use at least 6 characters.");
      } else if (errorCode === "auth/invalid-email") {
        setAuthError("Please enter a valid email address.");
      } else if (
        errorCode === "auth/invalid-credential" ||
        errorCode === "auth/wrong-password" ||
        errorCode === "auth/user-not-found"
      ) {
        setAuthError("Email or password is incorrect.");
      } else if (errorCode === "auth/network-request-failed") {
        setAuthError(
          "Could not reach Firebase right now. Check your network or try again in another browser tab.",
        );
      } else {
        setAuthError("Email sign-in failed. Please try again.");
      }

      console.error("Email auth failed:", err);
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsProfileMenuOpen(false);
      await auth.signOut();
      await disconnectWallet();
      setWalletAddress(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <>
      <header className="relative min-h-20 border-b border-border-subtle bg-obsidian/80 backdrop-blur-xl flex items-center justify-between gap-4 px-4 py-4 md:px-8 sticky top-0 z-40">
        <div className="flex min-w-0 items-center gap-3 md:gap-6">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-zinc-500 hover:text-emerald-cyber transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex min-w-0 flex-col">
            <span className="text-[9px] uppercase tracking-[0.3em] text-zinc-600 font-bold mb-1 hidden sm:block">
              Active Network
            </span>
            <div className="flex items-center gap-2 px-2 sm:px-3 py-1 bg-zinc-deep border border-border-subtle group cursor-help min-w-0">
              <Globe className="w-3 h-3 text-emerald-cyber group-hover:rotate-180 transition-transform duration-700" />
              <span className="text-[9px] sm:text-[10px] font-mono font-bold text-zinc-300 uppercase tracking-widest truncate">
                Base Sepolia
              </span>
              <div className="w-1 h-1 bg-emerald-cyber rounded-none shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
            </div>
          </div>

          <div className="h-8 w-[1px] bg-border-subtle hidden md:block" />

          <div className="hidden md:flex flex-col">
            <span className="text-[9px] uppercase tracking-[0.3em] text-zinc-600 font-bold mb-1">
              Network Fee
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-emerald-cyber uppercase tracking-widest">
                {gasPrice || "—"}
              </span>
              {gasPriceEth && (
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                  {gasPriceEth}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          {/* Wallet Connection — only visible when authenticated */}
          {user && (
            <div className="flex items-center gap-2">
              {walletAddress && (
                <button
                  onClick={handleDisconnectWallet}
                  className="hidden md:flex items-center px-3 py-2 border border-zinc-700 font-mono text-[10px] text-zinc-400 uppercase tracking-widest hover:border-red-500/40 hover:text-red-400 transition-all"
                >
                  Disconnect
                </button>
              )}
              <button
                onClick={
                  walletAddress ? handleDisconnectWallet : handleConnectWallet
                }
                className={cn(
                  "md:hidden flex items-center justify-center w-9 h-9 border transition-all",
                  walletAddress
                    ? "border-emerald-cyber/50 text-emerald-cyber bg-emerald-cyber/5"
                    : "border-border-subtle text-zinc-500",
                )}
                title={
                  walletAddress
                    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} — tap to disconnect`
                    : "Connect Wallet"
                }
              >
                <Wallet className="w-4 h-4" />
              </button>
              <button
                onClick={handleConnectWallet}
                className={cn(
                  "hidden md:flex items-center gap-2 px-4 py-2 border font-mono text-[10px] uppercase tracking-widest transition-all max-w-[220px]",
                  walletAddress
                    ? "border-emerald-cyber/50 text-emerald-cyber bg-emerald-cyber/5"
                    : "border-border-subtle text-zinc-500 hover:text-white hover:border-zinc-700",
                )}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span className="truncate">
                  {walletAddress
                    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                    : "Connect Wallet"}
                </span>
              </button>
            </div>
          )}

          <div className="hidden sm:flex flex-col items-end mr-2">
            <span className="text-[9px] uppercase tracking-[0.3em] text-zinc-600 font-bold mb-1">
              Account
            </span>
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
              {user ? user.displayName || "Operator" : "Not Connected"}
            </span>
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              <div ref={profileMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen((open) => !open)}
                  className={cn(
                    "w-10 h-10 border bg-zinc-deep flex items-center justify-center transition-[border-color,transform,background-color] duration-200 ease-out cursor-pointer overflow-hidden",
                    isProfileMenuOpen
                      ? "border-emerald-cyber/50 bg-emerald-cyber/5"
                      : "border-border-subtle hover:border-emerald-cyber/50",
                  )}
                  aria-haspopup="menu"
                  aria-expanded={isProfileMenuOpen}
                >
                  <img
                    src={
                      user.photoURL ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`
                    }
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </button>
                <div
                  className={cn(
                    "absolute right-0 top-full pt-2 w-48 z-50 transition-[opacity,transform,visibility] duration-150 ease-out",
                    isProfileMenuOpen
                      ? "opacity-100 visible translate-y-0"
                      : "opacity-0 invisible -translate-y-1",
                  )}
                >
                  <div className="bg-obsidian border border-border-subtle rounded-lg shadow-xl p-2">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-mono text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition-colors uppercase tracking-widest"
                    >
                      <LogOut className="w-4 h-4" />
                      Terminate Session
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div ref={authPanelRef} className="relative">
              <button
                type="button"
                onClick={() => setIsAuthPanelOpen((open) => !open)}
                className="btn-primary flex items-center gap-2 text-[10px] sm:text-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Authenticate</span>
                <span className="sm:hidden">Login</span>
              </button>
              {isAuthPanelOpen ? (
                <div className="absolute right-0 top-full z-50 mt-3 w-[min(30rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] border border-border-subtle bg-obsidian/95 p-4 shadow-2xl backdrop-blur-xl sm:p-5">
                  <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-600">
                        Authenticate
                      </p>
                    </div>
                    <div className="grid w-full grid-cols-2 border border-border-subtle sm:w-auto sm:min-w-[13rem]">
                      <button
                        type="button"
                        onClick={() => setAuthMode("login")}
                        className={cn(
                          "px-3 py-3 text-center text-[10px] font-mono uppercase leading-none tracking-[0.25em] whitespace-nowrap",
                          authMode === "login"
                            ? "bg-emerald-cyber text-obsidian"
                            : "text-zinc-500",
                        )}
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthMode("register")}
                        className={cn(
                          "px-3 py-3 text-center text-[10px] font-mono uppercase leading-none tracking-[0.25em] whitespace-nowrap",
                          authMode === "register"
                            ? "bg-emerald-cyber text-obsidian"
                            : "text-zinc-500",
                        )}
                      >
                        Register
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogin}
                    disabled={isGoogleReachable === false}
                    className={cn(
                      "mb-4 flex w-full items-center justify-center gap-2 border px-4 py-3 text-center text-[10px] font-mono uppercase tracking-[0.25em] transition-colors",
                      isGoogleReachable === false
                        ? "cursor-not-allowed border-border-subtle text-zinc-600 opacity-60"
                        : "border-border-subtle text-zinc-200 hover:border-emerald-cyber/50 hover:text-emerald-cyber",
                    )}
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span className="whitespace-nowrap">
                      {isGoogleReachable === false
                        ? "Google unavailable on this network"
                        : "Continue with Google"}
                    </span>
                  </button>

                  <div className="mb-4 flex items-center gap-3">
                    <div className="h-px flex-1 bg-border-subtle" />
                    <span className="whitespace-nowrap text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-600">
                      Or use email
                    </span>
                    <div className="h-px flex-1 bg-border-subtle" />
                  </div>

                  <div className="space-y-3">
                    {authMode === "register" ? (
                      <label className="block">
                        <span className="mb-2 block text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-600">
                          Display Name
                        </span>
                        <input
                          value={authName}
                          onChange={(event) => setAuthName(event.target.value)}
                          className="w-full border border-border-subtle bg-zinc-deep px-3 py-3 text-sm text-white outline-none transition-colors focus:border-emerald-cyber/50"
                          placeholder="Forge Operator"
                        />
                      </label>
                    ) : null}

                    <label className="block">
                      <span className="mb-2 block text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-600">
                        Email
                      </span>
                      <div className="flex items-center border border-border-subtle bg-zinc-deep px-3">
                        <Mail className="h-4 w-4 text-zinc-500" />
                        <input
                          type="email"
                          value={authEmail}
                          onChange={(event) => setAuthEmail(event.target.value)}
                          className="min-w-0 w-full bg-transparent px-3 py-3 text-sm text-white outline-none"
                          placeholder="you@example.com"
                          autoComplete="email"
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-600">
                        Password
                      </span>
                      <div className="flex items-center border border-border-subtle bg-zinc-deep px-3">
                        <UserPlus className="h-4 w-4 text-zinc-500" />
                        <input
                          type="password"
                          value={authPassword}
                          onChange={(event) =>
                            setAuthPassword(event.target.value)
                          }
                          className="min-w-0 w-full bg-transparent px-3 py-3 text-sm text-white outline-none"
                          placeholder="Minimum 6 characters"
                          autoComplete={
                            authMode === "register"
                              ? "new-password"
                              : "current-password"
                          }
                        />
                      </div>
                    </label>

                    <button
                      type="button"
                      onClick={handleEmailAuth}
                      disabled={
                        isAuthSubmitting ||
                        !authEmail.trim() ||
                        !authPassword.trim()
                      }
                      className="w-full border border-emerald-cyber/40 bg-emerald-cyber/10 px-4 py-3 text-center text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-cyber transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isAuthSubmitting
                        ? "Working..."
                        : authMode === "register"
                          ? "Create account with email"
                          : "Sign in with email"}
                    </button>

                    <p className="text-xs leading-relaxed text-zinc-500">
                      If this is your first email sign-in, make sure{" "}
                      <span className="font-mono text-zinc-400">
                        Email/Password
                      </span>{" "}
                      is enabled in Firebase Authentication.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <button className="hidden sm:flex w-10 h-10 border border-border-subtle bg-zinc-deep items-center justify-center text-zinc-500 hover:text-emerald-cyber hover:border-emerald-cyber/50 transition-colors">
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
        {authError ? (
          <div className="absolute left-4 right-4 bottom-0 translate-y-full border border-amber-warning/20 bg-obsidian/95 px-4 py-3 text-[10px] font-mono uppercase tracking-wider text-amber-warning sm:left-auto sm:right-8 sm:w-[28rem]">
            {authError}
          </div>
        ) : null}
      </header>
      <WalletPickerModal
        open={isWalletPickerOpen}
        onClose={() => setIsWalletPickerOpen(false)}
        onConnected={(address) => setWalletAddress(address)}
      />
    </>
  );
}
