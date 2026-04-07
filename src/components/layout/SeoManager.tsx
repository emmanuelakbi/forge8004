import { useEffect } from "react";
import { matchPath, useLocation } from "react-router-dom";

type SeoConfig = {
  path: string;
  title: string;
  description: string;
  robots?: string;
  type?: "website" | "article";
};

const SITE_NAME = "Forge8004";
const DEFAULT_TITLE =
  "Forge8004 | ERC-8004 Trust Layer for Autonomous DeFi Agents";
const DEFAULT_DESCRIPTION =
  "Forge8004 is an ERC-8004 trust layer for autonomous financial agents — identity, validation, capital sandboxing, and transparent trading telemetry on Base.";
const DEFAULT_ROBOTS = "index, follow";
const DEFAULT_THEME_COLOR = "#0A0A0A";
const DEFAULT_OG_PATH = "/og-image.png";

const SEO_ROUTES: SeoConfig[] = [
  {
    path: "/",
    title: "Forge8004 | ERC-8004 Trust Layer for Autonomous DeFi Agents",
    description:
      "ERC-8004 trust infrastructure for autonomous DeFi agents — on-chain identity, policy validation, capital sandboxing, and transparent trading telemetry on Base.",
    type: "website",
  },
  {
    path: "/how-it-works",
    title: "How It Works | Forge8004",
    description:
      "See how Forge8004 registers agent identity, funds sandbox treasuries, validates trade intents through policy checks, and records outcomes on-chain.",
  },
  {
    path: "/trust-center",
    title: "Trust Center | Forge8004",
    description:
      "Review Forge8004 trust primitives — agent identity ownership, capital controls, validation artifacts, and runtime safety for autonomous DeFi agents.",
  },
  {
    path: "/overview",
    title: "Operator Console | Forge8004",
    description:
      "Operator console for monitoring agent performance, treasury state, trade signals, and validation history across your Forge8004 agents.",
  },
  {
    path: "/agents",
    title: "Agents | Forge8004",
    description:
      "Browse ERC-8004 registered agents, review on-chain activity, reputation scores, and open individual agent workspaces.",
  },
  {
    path: "/agents/:agentId",
    title: "Agent Workspace | Forge8004",
    description:
      "Agent workspace with trade signals, validation timeline, capital sandbox state, and on-chain reputation data.",
  },
  {
    path: "/register-agent",
    title: "Register Agent | Forge8004",
    description:
      "Register a new ERC-8004 autonomous agent with identity metadata, strategy profile, and execution wallet for on-chain tracking.",
  },
  {
    path: "/docs",
    title: "Docs | Forge8004",
    description:
      "Read the Forge8004 documentation, operating guide, and supporting resources for using the platform more confidently.",
  },
  {
    path: "/contact",
    title: "Contact | Forge8004",
    description:
      "Get in touch with Forge8004 for product questions, partnership conversations, design support, or general help.",
  },
  {
    path: "/privacy",
    title: "Privacy Policy | Forge8004",
    description:
      "Read the Forge8004 privacy policy to understand what information is collected and how it is used.",
  },
  {
    path: "/terms",
    title: "Terms and Conditions | Forge8004",
    description:
      "Review the Forge8004 terms and conditions for using the site, workspace, and related services.",
  },
  {
    path: "/brand",
    title: "Brand Kit | Forge8004",
    description:
      "Browse Forge8004 brand marks, icons, and visual identity assets for internal and creative use.",
    robots: "noindex, nofollow",
  },
  {
    path: "/pitch",
    title: "Pitch Deck | Forge8004",
    description:
      "Review the Forge8004 pitch deck and product story presentation materials.",
    robots: "noindex, nofollow",
  },
  {
    path: "/social-kit",
    title: "Social Kit | Forge8004",
    description: "Browse social layouts and creative assets for Forge8004.",
    robots: "noindex, nofollow",
  },
];

function ensureMeta(attribute: "name" | "property", value: string) {
  let element = document.head.querySelector(
    `meta[${attribute}="${value}"]`,
  ) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, value);
    document.head.appendChild(element);
  }
  return element;
}

function ensureLink(rel: string) {
  let element = document.head.querySelector(
    `link[rel="${rel}"]`,
  ) as HTMLLinkElement | null;
  if (!element) {
    element = document.createElement("link");
    element.rel = rel;
    document.head.appendChild(element);
  }
  return element;
}

function getSeoConfig(pathname: string) {
  return (
    SEO_ROUTES.find((entry) =>
      matchPath({ path: entry.path, end: true }, pathname),
    ) ?? {
      path: pathname,
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      robots: DEFAULT_ROBOTS,
      type: "website" as const,
    }
  );
}

export default function SeoManager() {
  const location = useLocation();

  useEffect(() => {
    const config = getSeoConfig(location.pathname);
    const origin = window.location.origin;
    const canonicalUrl = new URL(location.pathname, origin).toString();
    const ogImage = new URL(DEFAULT_OG_PATH, origin).toString();
    const robots = config.robots ?? DEFAULT_ROBOTS;
    const title = config.title || DEFAULT_TITLE;
    const description = config.description || DEFAULT_DESCRIPTION;
    const pageType = config.type ?? "website";

    document.documentElement.lang = "en";
    document.title = title;

    ensureMeta("name", "description").content = description;
    ensureMeta("name", "robots").content = robots;
    ensureMeta("name", "googlebot").content = robots;
    ensureMeta("name", "theme-color").content = DEFAULT_THEME_COLOR;
    ensureMeta("property", "og:type").content = pageType;
    ensureMeta("property", "og:site_name").content = SITE_NAME;
    ensureMeta("property", "og:title").content = title;
    ensureMeta("property", "og:description").content = description;
    ensureMeta("property", "og:url").content = canonicalUrl;
    ensureMeta("property", "og:image").content = ogImage;
    ensureMeta("property", "og:image:width").content = "1200";
    ensureMeta("property", "og:image:height").content = "630";
    ensureMeta("property", "og:image:alt").content = "Forge8004";
    ensureMeta("property", "og:locale").content = "en_US";
    ensureMeta("name", "twitter:card").content = "summary_large_image";
    ensureMeta("name", "twitter:title").content = title;
    ensureMeta("name", "twitter:description").content = description;
    ensureMeta("name", "twitter:image").content = ogImage;

    ensureLink("canonical").href = canonicalUrl;

    const existingJsonLd = document.getElementById("forge-jsonld");
    if (existingJsonLd) {
      existingJsonLd.remove();
    }

    const schema =
      location.pathname === "/"
        ? [
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              name: SITE_NAME,
              url: origin,
              logo: new URL("/favicon.svg", origin).toString(),
              description,
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: SITE_NAME,
              url: origin,
              description,
            },
          ]
        : [
            {
              "@context": "https://schema.org",
              "@type": "WebPage",
              name: title,
              url: canonicalUrl,
              description,
            },
          ];

    const script = document.createElement("script");
    script.id = "forge-jsonld";
    script.type = "application/ld+json";
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
  }, [location.pathname]);

  return null;
}
