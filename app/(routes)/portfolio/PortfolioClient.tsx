"use client";

import AuthGate from "@/app/components/auth/AuthGate";
import Portfolio from "@/src/views/portfolio";

export default function PortfolioClient() {
  return (
    <AuthGate>
      <Portfolio />
    </AuthGate>
  );
}
