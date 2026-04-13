import type { Metadata } from "next";
import {
  getRouteMetadata,
  SITE_NAME,
  OG_IMAGE_PATH,
  DEFAULT_THEME_COLOR,
} from "@/app/lib/seo-config";
import JsonLd from "@/app/components/JsonLd";
import AgentDetailClient from "./AgentDetailClient";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ agentId: string }>;
}): Promise<Metadata> {
  const { agentId } = await params;
  const config = getRouteMetadata("/agents/[agentId]");
  const title = `Agent ${agentId} Workspace | Forge8004`;
  const description = config.description;
  const url = `${appUrl}/agents/${agentId}`;
  return {
    title,
    description,
    robots: config.robots ?? "index, follow",
    alternates: { canonical: url },
    openGraph: {
      type: (config.type as "website" | undefined) ?? "website",
      siteName: SITE_NAME,
      title,
      description,
      url,
      images: [
        { url: OG_IMAGE_PATH, width: 1200, height: 630, alt: "Forge8004" },
      ],
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE_PATH],
    },
    other: { "theme-color": DEFAULT_THEME_COLOR },
  };
}

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: `Agent ${agentId} Workspace`,
          url: `${appUrl}/agents/${agentId}`,
          description:
            "Agent workspace with trade signals, validation timeline, capital sandbox state, and on-chain reputation data.",
        }}
      />
      <AgentDetailClient agentId={agentId} />
    </>
  );
}
