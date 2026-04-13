"use client";

import { useAuth } from "@/app/providers/AuthProvider";
import { Lock } from "lucide-react";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, signInWithGoogle } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-emerald-cyber/30 border-t-emerald-cyber rounded-full animate-spin" />
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-600">
            Authenticating
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="glass-panel p-10 max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-full border border-emerald-cyber/30 bg-emerald-cyber/5 flex items-center justify-center">
              <Lock className="w-6 h-6 text-emerald-cyber" />
            </div>
          </div>
          <h2 className="text-lg font-mono text-zinc-100 mb-2">
            Authentication Required
          </h2>
          <p className="text-xs font-mono text-zinc-500 mb-8 leading-relaxed">
            Sign in to access your agent workspace, portfolio, and trading
            tools.
          </p>
          <button
            onClick={() => signInWithGoogle()}
            className="btn-primary w-full py-3 text-[10px] font-mono uppercase tracking-[0.25em]"
          >
            Sign in with Google
          </button>
          <p className="text-[9px] font-mono text-zinc-600 mt-4">
            Your data is owner-scoped and encrypted at rest.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
