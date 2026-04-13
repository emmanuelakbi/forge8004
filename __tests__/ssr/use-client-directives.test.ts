/**
 * Unit test: "use client" directive presence on all client components
 *
 * Validates: Requirements 1.1, 1.2, 2.1, 2.2, 3.1, 3.2
 *
 * Reads each client component file and asserts the first non-empty line
 * is a "use client" directive (single or double quotes, with semicolon).
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const CLIENT_COMPONENT_FILES = [
  // app/components/layout
  "app/components/layout/Sidebar.tsx",
  "app/components/layout/TopBar.tsx",

  // app/(routes) client components
  "app/(routes)/agents/[agentId]/AgentDetailClient.tsx",
  "app/(routes)/agents/AgentsListClient.tsx",
  "app/(routes)/overview/OverviewClient.tsx",
  "app/(routes)/register-agent/RegisterAgentClient.tsx",
  "app/(routes)/markets/[coinId]/CoinDetailClient.tsx",
  "app/(routes)/LandingPageClient.tsx",
  "app/(routes)/brand/BrandClient.tsx",
  "app/(routes)/compare/CompareClient.tsx",
  "app/(routes)/contact/ContactClient.tsx",
  "app/(routes)/docs/DocsClient.tsx",
  "app/(routes)/how-it-works/HowItWorksClient.tsx",
  "app/(routes)/markets/MarketsClient.tsx",
  "app/(routes)/portfolio/PortfolioClient.tsx",
  "app/(routes)/privacy/PrivacyClient.tsx",
  "app/(routes)/risk-replay/RiskReplayClient.tsx",
  "app/(routes)/terms/TermsClient.tsx",
  "app/(routes)/trust-center/TrustCenterClient.tsx",
  "app/(routes)/layout.tsx",

  // app/providers & auth
  "app/providers/AuthProvider.tsx",
  "app/components/auth/ProtectedRoute.tsx",

  // app/hooks
  "app/hooks/useClientValue.ts",
  "app/hooks/useAuthGuard.ts",

  // src/ components imported into app/
  "src/components/agent/GridStatusPanel.tsx",
  "src/components/agent/AgentPnLChart.tsx",
  "src/components/agent/AgentStatsGrid.tsx",
  "src/components/layout/WalletPickerModal.tsx",
];

describe('"use client" directive presence', () => {
  it.each(CLIENT_COMPONENT_FILES)(
    '%s should have "use client" as the first non-empty line',
    (filePath) => {
      const absolutePath = path.resolve(process.cwd(), filePath);
      const content = fs.readFileSync(absolutePath, "utf-8");
      const firstNonEmptyLine = content
        .split("\n")
        .map((line) => line.trim())
        .find((line) => line.length > 0);

      expect(
        firstNonEmptyLine === '"use client";' ||
          firstNonEmptyLine === "'use client';",
      ).toBe(true);
    },
  );
});
