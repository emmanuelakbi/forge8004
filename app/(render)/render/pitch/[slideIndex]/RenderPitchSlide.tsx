"use client";

import { use } from "react";
import { slides } from "@/src/views/pitch/slides";
import { PitchSlide } from "@/src/views/pitch/PitchSlide";

export default function RenderPitchSlide({
  params,
}: {
  params: Promise<{ slideIndex: string }>;
}) {
  const { slideIndex } = use(params);
  const idx = parseInt(slideIndex, 10);
  const slide = slides[idx];

  if (!slide) return <div>Slide not found</div>;

  return (
    <div
      id="export-target"
      style={{ width: 1280, height: 720, overflow: "hidden" }}
    >
      <PitchSlide slide={slide} index={idx} idPrefix="r-" />
    </div>
  );
}
