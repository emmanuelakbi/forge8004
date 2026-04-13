"use client";

import AuthGate from "@/app/components/auth/AuthGate";
import AgentDetail from "@/src/views/agent-detail";
import { onChainService } from "@/src/services/onChainService";

export default function AgentDetailClient({ agentId }: { agentId: string }) {
  return (
    <AuthGate>
      <AgentDetail />
    </AuthGate>
  );
}

// Re-export onChainService for agent detail on-chain interactions.
export { onChainService };
