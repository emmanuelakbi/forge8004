export const SITE_NAME = "Forge8004";
export const DEFAULT_TITLE =
  "Forge8004 | ERC-8004 Trust Layer for Autonomous DeFi Agents";
export const DEFAULT_DESCRIPTION =
  "Forge8004 is an ERC-8004 trust layer for autonomous financial agents — identity, validation, capital sandboxing, and transparent trading telemetry on Base.";
export const DEFAULT_THEME_COLOR = "#0A0A0A";
export const OG_IMAGE_PATH = "/og-image.png";

export type RouteMetaConfig = {
  title: string;
  description: string;
  robots?: string;
  type?: "website" | "article";
};

export const SEO_ROUTES: Record<string, RouteMetaConfig> = {
  "/": {
    title: "Forge8004 | ERC-8004 Trust Layer for Autonomous DeFi Agents",
    description:
      "ERC-8004 trust infrastructure for autonomous DeFi agents — on-chain identity, policy validation, capital sandboxing, and transparent trading telemetry on Base.",
    type: "website",
  },
  "/how-it-works": {
    title: "How It Works | Forge8004",
    description:
      "See how Forge8004 registers agent identity, funds sandbox treasuries, validates trade intents through policy checks, and records outcomes on-chain.",
  },
  "/trust-center": {
    title: "Trust Center | Forge8004",
    description:
      "Review Forge8004 trust primitives — agent identity ownership, capital controls, validation artifacts, and runtime safety for autonomous DeFi agents.",
  },
  "/overview": {
    title: "Operator Console | Forge8004",
    description:
      "Operator console for monitoring agent performance, treasury state, trade signals, and validation history across your Forge8004 agents.",
  },
  "/agents": {
    title: "Agents | Forge8004",
    description:
      "Browse ERC-8004 registered agents, review on-chain activity, reputation scores, and open individual agent workspaces.",
  },
  "/agents/[agentId]": {
    title: "Agent Workspace | Forge8004",
    description:
      "Agent workspace with trade signals, validation timeline, capital sandbox state, and on-chain reputation data.",
  },
  "/register-agent": {
    title: "Register Agent | Forge8004",
    description:
      "Register a new ERC-8004 autonomous agent with identity metadata, strategy profile, and execution wallet for on-chain tracking.",
  },
  "/docs": {
    title: "Docs | Forge8004",
    description:
      "Read the Forge8004 documentation, operating guide, and supporting resources for using the platform more confidently.",
  },
  "/contact": {
    title: "Contact | Forge8004",
    description:
      "Get in touch with Forge8004 for product questions, partnership conversations, design support, or general help.",
  },
  "/privacy": {
    title: "Privacy Policy | Forge8004",
    description:
      "Read the Forge8004 privacy policy to understand what information is collected and how it is used.",
  },
  "/terms": {
    title: "Terms and Conditions | Forge8004",
    description:
      "Review the Forge8004 terms and conditions for using the site, workspace, and related services.",
  },
  "/brand": {
    title: "Brand Kit | Forge8004",
    description:
      "Browse Forge8004 brand marks, icons, and visual identity assets for internal and creative use.",
    robots: "noindex, nofollow",
  },
  "/pitch": {
    title: "Pitch Deck | Forge8004",
    description:
      "Review the Forge8004 pitch deck and product story presentation materials.",
    robots: "noindex, nofollow",
  },
  "/social-kit": {
    title: "Social Kit | Forge8004",
    description: "Browse social layouts and creative assets for Forge8004.",
    robots: "noindex, nofollow",
  },
};

export function getRouteMetadata(pathname: string): RouteMetaConfig {
  return (
    SEO_ROUTES[pathname] ?? {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
    }
  );
}

export function isInternalRoute(pathname: string): boolean {
  const config = SEO_ROUTES[pathname];
  return config?.robots === "noindex, nofollow";
}
