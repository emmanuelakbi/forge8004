"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";

export function useAuthGuard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  return { user, loading, isAuthenticated: !!user };
}
