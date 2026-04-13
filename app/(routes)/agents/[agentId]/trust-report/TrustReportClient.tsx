"use client";

import AuthGate from "@/app/components/auth/AuthGate";
import TrustReport from "@/src/views/trust-report";

export default function TrustReportClient({ agentId }: { agentId: string }) {
  return (
    <AuthGate>
      <TrustReport />
    </AuthGate>
  );
}
