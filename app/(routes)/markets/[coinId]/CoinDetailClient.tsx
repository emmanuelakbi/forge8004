"use client";

import dynamic from "next/dynamic";

const Markets = dynamic(() => import("@/src/views/markets"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[400px]">
      <div className="w-5 h-5 border-2 border-emerald-cyber/30 border-t-emerald-cyber rounded-full animate-spin" />
    </div>
  ),
});

export default function CoinDetailClient({ coinId }: { coinId: string }) {
  return <Markets />;
}
