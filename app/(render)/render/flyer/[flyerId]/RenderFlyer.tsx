"use client";

import { use } from "react";
import { FLYERS } from "@/src/views/social/flyers";

export default function RenderFlyer({
  params,
}: {
  params: Promise<{ flyerId: string }>;
}) {
  const { flyerId } = use(params);
  const flyer = FLYERS.find((f) => f.id === flyerId);

  if (!flyer) return <div>Flyer not found</div>;

  return (
    <div
      id="export-target"
      style={{ width: flyer.width, height: flyer.height, overflow: "hidden" }}
    >
      {flyer.content(flyer.width, flyer.height)}
    </div>
  );
}
