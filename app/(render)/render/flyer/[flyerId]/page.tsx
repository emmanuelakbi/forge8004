import RenderFlyer from "./RenderFlyer";

export default function RenderFlyerPage({
  params,
}: {
  params: Promise<{ flyerId: string }>;
}) {
  return <RenderFlyer params={params} />;
}
