import { cn } from "../../utils/cn";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Cpu, Info, CheckCircle2, AlertCircle } from "lucide-react";
import { erc8004Client } from "@/app/lib/erc8004Client";
import { subscribeToAuthState, User } from "@/app/lib/firebase";
import { AgentIdentity, GridSubType } from "../../lib/types";
import { deriveSandboxWallet } from "../../services/trustArtifacts";
import { onChainService } from "../../services/onChainService";

const strategyOptions: Array<{
  value: AgentIdentity["strategyType"];
  label: string;
}> = [
  { value: "range_trading", label: "Range Trading" },
  { value: "spot_grid_bot", label: "Grid Trading" },
  { value: "momentum", label: "Momentum" },
  { value: "mean_reversion", label: "Mean Reversion" },
  { value: "arbitrage", label: "Low-Volatility Scalp" },
  { value: "yield", label: "Patient Accumulation" },
  { value: "market_making", label: "Spread Trading" },
  { value: "risk_off", label: "Risk Off" },
];

const gridSubTypeOptions: Array<{
  value: GridSubType;
  label: string;
  available: boolean;
}> = [
  { value: "spot_grid", label: "Spot Grid", available: true },
  // { value: "futures_grid", label: "Futures Grid", available: false },
  // { value: "futures_martingale", label: "Futures Martingale", available: false },
  // { value: "futures_combo", label: "Futures Combo", available: false },
];

const strategyHelperCopy: Record<AgentIdentity["strategyType"], string> = {
  range_trading:
    "A discretionary range-biased style that works best in calmer markets and prefers smaller entries with tighter reviews.",
  spot_grid_bot:
    "Select a grid bot type below. Grid bots automate buy and sell orders across a price range to capture profits from market fluctuations.",
  momentum:
    "Follows stronger moves, gives winners more room, and is more willing to keep a good trend open.",
  mean_reversion:
    "Looks for overstretched moves and fades extremes instead of chasing them.",
  arbitrage:
    "Uses the shortest-hold, smallest-size sandbox profile and quickly waits when the edge is unclear.",
  yield:
    "Prefers patience, slower changes, and fewer new positions when the market is calm enough.",
  market_making:
    "Leans toward quieter conditions, smaller position sizes, and faster protective stop updates.",
  risk_off:
    "Prioritizes capital preservation, opens fewer trades, and prefers managing exposure over adding more.",
};

export default function RegisterAgent() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    strategyType: "range_trading" as AgentIdentity["strategyType"],
    gridSubType: "spot_grid" as GridSubType,
    riskProfile: "balanced",
    avatarUrl: "",
    agentWallet: "",
  });

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("You must be connected to register an agent.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const agentId = Math.floor(Math.random() * 1000000).toString();
      const newAgent: AgentIdentity = {
        agentId,
        name: formData.name,
        description: formData.description,
        strategyType: formData.strategyType,
        ...(formData.strategyType === "spot_grid_bot"
          ? { gridSubType: formData.gridSubType }
          : {}),
        riskProfile: formData.riskProfile as AgentIdentity["riskProfile"],
        avatarUrl:
          formData.avatarUrl || `https://picsum.photos/seed/${agentId}/400/400`,
        owner: user.uid,
        agentWallet:
          formData.agentWallet || deriveSandboxWallet(user.uid, agentId),
      };

      await erc8004Client.saveAgent(newAgent);

      // Attempt on-chain ERC-721 mint if wallet is available
      if (onChainService.isAvailable()) {
        try {
          const result = await onChainService.registerAgent(
            agentId,
            formData.name,
            formData.strategyType,
          );
          if (result) {
            await erc8004Client.updateAgentOnChainMeta(agentId, {
              tokenId: result.tokenId,
              txHash: result.txHash,
              chainId: 84532,
            });
          }
        } catch (mintErr) {
          console.warn("[Register] On-chain mint skipped:", mintErr);
        }
      }

      setSuccess(true);
      setTimeout(() => router.push(`/agents/${agentId}`), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to register agent.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="w-16 h-16 bg-emerald-cyber/10 border border-emerald-cyber flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-cyber animate-bounce" />
        </div>
        <h2 className="text-2xl font-mono font-bold text-white uppercase tracking-tighter">
          Agent Registered Successfully
        </h2>
        <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">
          Redirecting to agent dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="page-shell-narrow">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 bg-emerald-cyber" />
          <span className="text-[10px] font-mono text-emerald-cyber uppercase tracking-widest">
            Protocol // Identity Registry
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-mono font-bold text-white tracking-tighter uppercase whitespace-nowrap">
          Register <span className="text-emerald-cyber">New Agent</span>
        </h1>
        <p className="text-zinc-500 text-xs font-mono mt-2 uppercase tracking-wider">
          Initialize an autonomous trading entity on the ERC-8004 protocol.
        </p>
      </div>

      {!user ? (
        <div className="glass-panel p-12 text-center space-y-6 border-amber-warning/20">
          <div className="w-12 h-12 bg-amber-warning/10 border border-amber-warning flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 text-amber-warning" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-widest">
              Authentication Required
            </h3>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-tight">
              Please connect your identity to access the registry.
            </p>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-12"
        >
          {/* Left Column: Core Identity */}
          <div className="space-y-8">
            <section className="space-y-6">
              <h2 className="text-xs font-mono font-bold text-white uppercase tracking-widest flex items-center gap-3">
                <Cpu className="w-4 h-4 text-emerald-cyber" />
                Core Identity
              </h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="agent-name"
                    className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest"
                  >
                    Agent Name
                  </label>
                  <input
                    id="agent-name"
                    required
                    type="text"
                    className="w-full bg-obsidian border border-border-subtle p-4 text-xs font-mono text-white focus:outline-none focus:border-emerald-cyber/50 transition-all uppercase tracking-widest"
                    placeholder="E.G. ALPHA_FORGE_01"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="agent-description"
                    className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest"
                  >
                    Strategy Description
                  </label>
                  <textarea
                    id="agent-description"
                    className="w-full bg-obsidian border border-border-subtle p-4 text-xs font-mono text-white focus:outline-none focus:border-emerald-cyber/50 transition-all uppercase tracking-widest min-h-[120px]"
                    placeholder="DESCRIBE THE AGENT'S TRADING LOGIC AND PARAMETERS..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h2 className="text-xs font-mono font-bold text-white uppercase tracking-widest flex items-center gap-3">
                <Shield className="w-4 h-4 text-emerald-cyber" />
                Risk & Strategy
              </h2>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label
                    htmlFor="strategy-type"
                    className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest"
                  >
                    Strategy Type
                  </label>
                  <select
                    id="strategy-type"
                    className="w-full bg-obsidian border border-border-subtle p-4 text-xs font-mono text-white focus:outline-none focus:border-emerald-cyber/50 transition-all uppercase tracking-widest appearance-none cursor-pointer"
                    value={formData.strategyType}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        strategyType: e.target
                          .value as AgentIdentity["strategyType"],
                      }))
                    }
                  >
                    {strategyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-tight leading-relaxed">
                    {strategyHelperCopy[formData.strategyType]}
                  </p>
                </div>

                {formData.strategyType === "spot_grid_bot" && (
                  <div className="space-y-2">
                    <label
                      htmlFor="grid-type"
                      className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest"
                    >
                      Grid Type
                    </label>
                    <div className="border border-border-subtle">
                      {gridSubTypeOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          disabled={!option.available}
                          onClick={() =>
                            option.available &&
                            setFormData((prev) => ({
                              ...prev,
                              gridSubType: option.value,
                            }))
                          }
                          className={cn(
                            "w-full py-3 text-[9px] font-mono uppercase tracking-widest transition-all relative",
                            !option.available
                              ? "bg-obsidian/50 text-zinc-700 cursor-not-allowed"
                              : formData.gridSubType === option.value
                                ? "bg-emerald-cyber text-obsidian font-bold"
                                : "bg-obsidian text-zinc-500 hover:text-white",
                          )}
                        >
                          {option.label}
                          {!option.available && (
                            <span className="absolute top-0.5 right-1.5 text-[7px] text-zinc-600 tracking-widest">
                              Soon
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label
                    id="risk-profile-label"
                    className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest"
                  >
                    Risk Profile
                  </label>
                  <div
                    role="radiogroup"
                    aria-labelledby="risk-profile-label"
                    className="grid grid-cols-3 gap-px bg-border-subtle border border-border-subtle"
                  >
                    {["conservative", "balanced", "aggressive"].map(
                      (profile) => (
                        <button
                          key={profile}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              riskProfile: profile,
                            }))
                          }
                          className={cn(
                            "py-3 text-[9px] font-mono uppercase tracking-widest transition-all",
                            formData.riskProfile === profile
                              ? "bg-emerald-cyber text-obsidian font-bold"
                              : "bg-obsidian text-zinc-500 hover:text-white",
                          )}
                        >
                          {profile}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Visuals & Submit */}
          <div className="space-y-8">
            <section className="space-y-6">
              <h2 className="text-xs font-mono font-bold text-white uppercase tracking-widest flex items-center gap-3">
                <Info className="w-4 h-4 text-emerald-cyber" />
                Visual Identity
              </h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="avatar-url"
                    className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest"
                  >
                    Avatar URL (Optional)
                  </label>
                  <input
                    id="avatar-url"
                    type="url"
                    className="w-full bg-obsidian border border-border-subtle p-4 text-xs font-mono text-white focus:outline-none focus:border-emerald-cyber/50 transition-all tracking-tight"
                    placeholder="HTTPS://..."
                    value={formData.avatarUrl}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        avatarUrl: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="agent-wallet"
                    className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest"
                  >
                    Agent Execution Wallet (Optional)
                  </label>
                  <input
                    id="agent-wallet"
                    type="text"
                    className="w-full bg-obsidian border border-border-subtle p-4 text-xs font-mono text-white focus:outline-none focus:border-emerald-cyber/50 transition-all tracking-tight"
                    placeholder="0X... OR LEAVE BLANK FOR SANDBOX WALLET"
                    value={formData.agentWallet}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        agentWallet: e.target.value,
                      }))
                    }
                  />
                  <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-tight">
                    If left empty, Forge8004 will derive a deterministic sandbox
                    execution wallet for the agent.
                  </p>
                </div>

                <div className="p-6 border border-dashed border-border-subtle bg-obsidian/30 flex flex-col items-center justify-center space-y-4">
                  <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
                    Avatar Preview
                  </p>
                  <img
                    src={
                      formData.avatarUrl ||
                      `https://picsum.photos/seed/preview/400/400`
                    }
                    className="w-32 h-32 bg-zinc-900 border border-border-subtle object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </section>

            <div className="pt-8 space-y-4">
              {error && (
                <div className="p-4 bg-red-500/5 border border-red-500/20 text-red-500 text-[10px] font-mono uppercase tracking-widest">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "w-full py-5 font-mono font-bold text-xs uppercase tracking-[0.3em] transition-all",
                  loading
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    : "bg-emerald-cyber text-obsidian hover:bg-emerald-cyber/90 shadow-[0_0_20px_rgba(0,255,157,0.2)]",
                )}
              >
                {loading
                  ? "Processing Registration..."
                  : "Initialize Agent Protocol"}
              </button>

              <p className="text-[9px] font-mono text-zinc-600 text-center uppercase tracking-widest leading-relaxed">
                By initializing, you agree to the protocol's autonomous
                execution terms and identity registry standards.
              </p>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
