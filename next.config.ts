import type { NextConfig } from "next";

const requiredPublicVars = [
  "NEXT_PUBLIC_RPC_URL",
  "NEXT_PUBLIC_IDENTITY_REGISTRY",
  "NEXT_PUBLIC_REPUTATION_REGISTRY",
  "NEXT_PUBLIC_VALIDATION_REGISTRY",
  "NEXT_PUBLIC_RISK_ROUTER",
  "NEXT_PUBLIC_VAULT",
  "NEXT_PUBLIC_CAPITAL_VAULT",
];

export function validateEnvVars(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const warnings: string[] = [];
  for (const varName of requiredPublicVars) {
    if (!env[varName]) {
      warnings.push(
        `⚠️  Missing environment variable: ${varName}. Some features may not work correctly.`,
      );
    }
  }
  return warnings;
}

// Emit warnings at build time
const envWarnings = validateEnvVars();
for (const warning of envWarnings) {
  console.warn(warning);
}

const nextConfig: NextConfig = {
  transpilePackages: [
    "firebase",
    "viem",
    "lucide-react",
    "framer-motion",
    "motion",
    "recharts",
  ],

  images: {
    unoptimized: true,
  },

  serverExternalPackages: [
    "hardhat",
    "ethers",
    "puppeteer",
    "puppeteer-core",
    "@sparticuz/chromium",
  ],

  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        source: "/(brand|pitch|social-kit|render)(.*)",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },

  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ["**/contracts/**", "**/artifacts/**", "**/cache/**"],
    };
    return config;
  },
};

export default nextConfig;
