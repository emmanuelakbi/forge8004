import type { Metadata } from "next";
import {
  SITE_NAME,
  OG_IMAGE_PATH,
  DEFAULT_THEME_COLOR,
} from "@/app/lib/seo-config";
import PortfolioClient from "./PortfolioClient";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export function generateMetadata(): Metadata {
  const title = "Portfolio | Forge8004";
  const description =
    "View your portfolio of ERC-8004 agents, aggregate performance, and capital allocation across all active strategies.";
  const url = `${appUrl}/portfolio`;
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

export default function PortfolioPage() {
  return <PortfolioClient />;
}
