import type { Metadata } from "next";
import {
  getRouteMetadata,
  SITE_NAME,
  OG_IMAGE_PATH,
  DEFAULT_THEME_COLOR,
} from "@/app/lib/seo-config";
import OverviewClient from "./OverviewClient";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export function generateMetadata(): Metadata {
  const config = getRouteMetadata("/overview");
  const url = `${appUrl}/overview`;
  return {
    title: config.title,
    description: config.description,
    robots: config.robots ?? "index, follow",
    alternates: { canonical: url },
    openGraph: {
      type: (config.type as "website" | undefined) ?? "website",
      siteName: SITE_NAME,
      title: config.title,
      description: config.description,
      url,
      images: [
        { url: OG_IMAGE_PATH, width: 1200, height: 630, alt: "Forge8004" },
      ],
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: config.title,
      description: config.description,
      images: [OG_IMAGE_PATH],
    },
    other: { "theme-color": DEFAULT_THEME_COLOR },
  };
}

export default function OverviewPage() {
  return <OverviewClient />;
}
