import { useEffect, useState } from "react";
import Link from "next/link";
import { AggregatedAgentView } from "../../lib/types";
import AgentCard from "../../components/agent/AgentCard";
import { Search, Filter } from "lucide-react";
import { erc8004Client } from "@/app/lib/erc8004Client";
import { subscribeToAuthState, User } from "@/app/lib/firebase";
import { cn } from "../../utils/cn";

export default function AgentsList() {
  const [agents, setAgents] = useState<AggregatedAgentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeactivated, setShowDeactivated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setAgents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    erc8004Client
      .getAllAgents()
      .then((data) => {
        setAgents(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch agents:", err);
        setError("Failed to load agents. Please try refreshing.");
        setLoading(false);
      });
  }, [authReady, user]);

  const filteredAgents = agents.filter(
    (a) =>
      (showDeactivated || a.identity.status !== "deactivated") &&
      (a.identity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.identity.strategyType
          .toLowerCase()
          .includes(searchTerm.toLowerCase())),
  );

  if (loading)
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-2 border-emerald-cyber/20 border-t-emerald-cyber animate-spin mb-4" />
        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em] animate-pulse">
          Scanning Registry...
        </p>
      </div>
    );

  if (error) {
    return (
      <div className="page-shell">
        <div className="glass-panel p-8 sm:p-12 border border-red-500/20 bg-red-500/[0.03] space-y-4 text-center">
          <p className="text-sm font-mono text-red-400 uppercase tracking-wider">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary inline-flex items-center justify-center px-5 py-3 text-[10px] tracking-[0.2em]"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page-shell">
        <section className="glass-panel p-8 sm:p-12 border border-emerald-cyber/20 bg-emerald-cyber/[0.03] space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-cyber animate-pulse" />
            <span className="text-[10px] font-mono text-emerald-cyber uppercase tracking-widest">
              Private Agent Registry
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-mono font-bold text-white uppercase tracking-tighter">
            Sign in to browse{" "}
            <span className="text-emerald-cyber">your agents</span>
          </h1>
          <p className="max-w-2xl text-[11px] sm:text-xs font-mono text-zinc-500 uppercase tracking-wider leading-relaxed">
            The registry now scopes agents, validations, positions, and vault
            activity to the authenticated owner, so this page stays empty until
            your session is active.
          </p>
          <Link
            href="/register-agent"
            className="inline-flex px-6 py-3 bg-emerald-cyber text-obsidian font-mono font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-emerald-cyber/90 transition-all"
          >
            Register Agent
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell">
      {/* Header Section */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-emerald-cyber" />
            <span className="text-[10px] font-mono text-emerald-cyber uppercase tracking-widest">
              Registry // Connected
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-mono font-bold text-white tracking-tighter uppercase">
            Strategy <span className="text-emerald-cyber">Agents</span>
          </h1>
          <p className="text-zinc-500 text-xs font-mono mt-2 uppercase tracking-wider">
            Browse and manage your autonomous trading fleet.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Link
            href="/register-agent"
            className="btn-primary inline-flex items-center justify-center px-5 py-3 text-[10px] tracking-[0.2em] self-start sm:self-auto"
          >
            Register Agent
          </Link>
          <div className="relative group w-full sm:w-auto">
            <Search className="w-4 h-4 text-zinc-600 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-emerald-cyber transition-colors" />
            <input
              type="text"
              placeholder="SEARCH REGISTRY..."
              className="bg-obsidian border border-border-subtle pl-12 pr-6 py-3 text-[10px] font-mono text-white focus:outline-none focus:border-emerald-cyber/50 transition-all w-full sm:w-72 uppercase tracking-widest placeholder:text-zinc-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="p-3 bg-obsidian border border-border-subtle text-zinc-500 hover:text-emerald-cyber hover:border-emerald-cyber/30 transition-all self-start sm:self-auto">
            <Filter className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowDeactivated((prev) => !prev)}
            className={cn(
              "px-4 py-3 font-mono text-[9px] uppercase tracking-widest border transition-all self-start sm:self-auto",
              showDeactivated
                ? "border-emerald-cyber/30 text-emerald-cyber bg-emerald-cyber/5"
                : "border-border-subtle text-zinc-600 bg-obsidian hover:text-zinc-400",
            )}
          >
            {showDeactivated ? "Hiding Inactive" : "Show Inactive"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredAgents.map((agent: AggregatedAgentView) => (
          <div key={agent.identity.agentId}>
            <AgentCard agent={agent} />
          </div>
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <div className="text-center py-20 border border-dashed border-border-subtle bg-obsidian/30 space-y-5">
          <p className="text-zinc-600 font-mono text-[10px] uppercase tracking-[0.3em]">
            No matching entities found in registry
          </p>
          <Link
            href="/register-agent"
            className="btn-secondary inline-flex items-center justify-center px-5 py-3 text-[10px] tracking-[0.2em]"
          >
            Register Your First Agent
          </Link>
        </div>
      )}
    </div>
  );
}
