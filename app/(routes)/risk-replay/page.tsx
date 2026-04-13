import type { Metadata } from "next";
import {
  SITE_NAME,
  OG_IMAGE_PATH,
  DEFAULT_THEME_COLOR,
} from "@/app/lib/seo-config";
import RiskReplayClient from "./RiskReplayClient";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export function generateMetadata(): Metadata {
  const title = "Risk Replay | Forge8004";
  const description =
    "Replay and analyze historical risk events, trade decisions, and validation outcomes for your Forge8004 agents.";
  const url = `${appUrl}/risk-replay`;
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

export default function RiskReplayPage() {
  return <RiskReplayClient />;
}
