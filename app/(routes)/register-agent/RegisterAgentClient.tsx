"use client";

import AuthGate from "@/app/components/auth/AuthGate";
import RegisterAgent from "@/src/views/register-agent";

export default function RegisterAgentClient() {
  return (
    <AuthGate>
      <RegisterAgent />
    </AuthGate>
  );
}
