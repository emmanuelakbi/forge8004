"use client";
import { useState, useEffect } from "react";

export function useClientValue<T>(compute: () => T, fallback: T): T {
  const [value, setValue] = useState<T>(fallback);
  useEffect(() => {
    setValue(compute());
  }, []);
  return value;
}

export function useHasMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
