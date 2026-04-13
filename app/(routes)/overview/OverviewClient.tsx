"use client";

import AuthGate from "@/app/components/auth/AuthGate";
import Overview from "@/src/views/overview";

export default function OverviewClient() {
  return (
    <AuthGate>
      <Overview />
    </AuthGate>
  );
}
