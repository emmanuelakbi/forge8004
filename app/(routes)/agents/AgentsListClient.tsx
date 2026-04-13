"use client";

import AuthGate from "@/app/components/auth/AuthGate";
import AgentsList from "@/src/views/agents-list";

export default function AgentsListClient() {
  return (
    <AuthGate>
      <AgentsList />
    </AuthGate>
  );
}
