"use client";

import AuthGate from "@/app/components/auth/AuthGate";
import Compare from "@/src/views/compare";

export default function CompareClient() {
  return (
    <AuthGate>
      <Compare />
    </AuthGate>
  );
}
