import type { Metadata } from "next";
import {
  SITE_NAME,
  OG_IMAGE_PATH,
  DEFAULT_THEME_COLOR,
} from "@/app/lib/seo-config";
import JsonLd from "@/app/components/JsonLd";
import TrustReportClient from "./TrustReportClient";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ agentId: string }>;
}): Promise<Metadata> {
  const { agentId } = await params;
  const title = `Trust Report — Agent ${agentId} | Forge8004`;
  const description = `Full trust report for agent ${agentId} including validation history, risk checks, and on-chain reputation data.`;
  const url = `${appUrl}/agents/${agentId}/trust-report`;
  return {
    title,
    description,
    robots: "index, follow",
    alternates: { canonical: url },
    openGraph: {
      type: "website",
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

export default async function TrustReportPage({
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
          name: `Trust Report — Agent ${agentId}`,
          url: `${appUrl}/agents/${agentId}/trust-report`,
          description: `Full trust report for agent ${agentId} including validation history, risk checks, and on-chain reputation data.`,
        }}
      />
      <TrustReportClient agentId={agentId} />
    </>
  );
}
