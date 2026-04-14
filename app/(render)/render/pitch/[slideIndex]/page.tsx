import RenderPitchSlide from "./RenderPitchSlide";

export default function RenderPitchSlidePage({
  params,
}: {
  params: Promise<{ slideIndex: string }>;
}) {
  return <RenderPitchSlide params={params} />;
}
