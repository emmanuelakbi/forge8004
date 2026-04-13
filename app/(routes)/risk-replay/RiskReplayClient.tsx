"use client";

import AuthGate from "@/app/components/auth/AuthGate";
import RiskReplay from "@/src/views/risk-replay";

export default function RiskReplayClient() {
  return (
    <AuthGate>
      <RiskReplay />
    </AuthGate>
  );
}
