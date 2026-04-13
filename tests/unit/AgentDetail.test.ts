// @vitest-environment node
// Tests for the next/dynamic import of AgentPnLChart in AgentDetail.tsx
// Validates: ssr: false, loading placeholder, and no static import of AgentPnLChart

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const SOURCE_PATH = resolve(
  __dirname,
  "../../src/views/agent-detail/AgentDetail.tsx",
);
const source = readFileSync(SOURCE_PATH, "utf-8");

describe("[AgentDetail]", () => {
  describe("dynamic import of AgentPnLChart", () => {
    it("should import next/dynamic", () => {
      expect(source).toContain('import dynamic from "next/dynamic"');
    });

    it("should load AgentPnLChart via dynamic() instead of a static import", () => {
      // Must NOT have a plain static import of AgentPnLChart
      const staticImportPattern =
        /import\s+AgentPnLChart\s+from\s+["'].*AgentPnLChart["']/;
      expect(source).not.toMatch(staticImportPattern);

      // Must have a dynamic() call referencing AgentPnLChart
      expect(source).toContain("const AgentPnLChart = dynamic(");
      expect(source).toMatch(/import\(["'].*AgentPnLChart["']\)/);
    });

    it("should disable SSR for AgentPnLChart", () => {
      expect(source).toMatch(/ssr:\s*false/);
    });

    it("should provide a loading placeholder", () => {
      // The loading function should render a spinner container
      expect(source).toMatch(/loading:\s*\(\)\s*=>/);
      expect(source).toContain("animate-spin");
    });
  });
});
