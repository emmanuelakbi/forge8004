/**
 * Unit tests for Overview component
 *
 * Source-level verification that the Overview component follows
 * correct auth-gating, data-fetching, and rendering patterns.
 *
 * Validates: auth scoping, SSR-safe state init, error handling,
 * computed derivations (activeAgents, topAgents, trustRankedAgents)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const source = readFileSync(
  resolve(__dirname, "../../src/views/overview/Overview.tsx"),
  "utf-8",
);

describe("Overview", () => {
  describe("exports", () => {
    it("should have a default export function", () => {
      expect(source).toMatch(/export\s+default\s+function\s+Overview\s*\(/);
    });
  });

  describe("auth state management", () => {
    it("should initialize authReady as false", () => {
      expect(source).toMatch(/useState\s*<?\s*\(?\s*false\s*\)?/);
      expect(source).toContain("setAuthReady");
    });

    it("should initialize user as null", () => {
      expect(source).toMatch(
        /useState\s*<\s*User\s*\|\s*null\s*>\s*\(\s*null\s*\)/,
      );
    });

    it("should subscribe to auth state via subscribeToAuthState inside useEffect", () => {
      const lines = source.split("\n");
      const callIdx = lines.findIndex(
        (l) =>
          l.includes("subscribeToAuthState(") && !l.trim().startsWith("import"),
      );
      expect(callIdx).toBeGreaterThan(-1);

      // Walk backwards to find enclosing useEffect
      let found = false;
      let braceDepth = 0;
      for (let i = callIdx; i >= 0; i--) {
        for (const ch of lines[i]) {
          if (ch === "}") braceDepth++;
          if (ch === "{") braceDepth--;
        }
        if (lines[i].includes("useEffect(") && braceDepth <= 0) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    });

    it("should unsubscribe from auth state on cleanup", () => {
      // The useEffect with subscribeToAuthState should return unsubscribe
      expect(source).toMatch(/return\s*\(\)\s*=>\s*unsubscribe\s*\(\)/);
    });
  });

  describe("data fetching", () => {
    it("should guard data fetch behind authReady and user checks", () => {
      expect(source).toContain("if (!authReady) return");
      expect(source).toContain("if (!user)");
    });

    it("should fetch agents via erc8004Client.getAllAgents()", () => {
      expect(source).toContain("erc8004Client");
      expect(source).toMatch(/\.getAllAgents\s*\(\s*\)/);
    });

    it("should clear agents and stop loading when user is null", () => {
      // When user is null after auth ready, agents should be emptied
      expect(source).toContain("setAgents([])");
      expect(source).toContain("setLoading(false)");
    });

    it("should handle fetch errors with a user-facing message", () => {
      expect(source).toMatch(/\.catch\s*\(/);
      expect(source).toContain("Failed to load agent data");
    });
  });

  describe("computed derivations", () => {
    it("should filter activeAgents excluding deactivated status", () => {
      expect(source).toMatch(
        /agents\.filter\s*\(\s*\(a\)\s*=>\s*a\.identity\.status\s*!==\s*["']deactivated["']\s*\)/,
      );
    });

    it("should sort topAgents by sharpeLikeScore descending and take top 4", () => {
      expect(source).toContain("sharpeLikeScore");
      expect(source).toMatch(
        /\.sort\s*\(\s*\(a,\s*b\)\s*=>\s*b\.reputation\.sharpeLikeScore/,
      );
      expect(source).toMatch(/\.slice\s*\(\s*0\s*,\s*4\s*\)/);
    });

    it("should sort trustRankedAgents by getTrustScore descending and take top 5", () => {
      expect(source).toContain("getTrustScore");
      expect(source).toMatch(
        /\.sort\s*\(\s*\(a,\s*b\)\s*=>\s*getTrustScore\s*\(\s*b\s*\)/,
      );
      expect(source).toMatch(/\.slice\s*\(\s*0\s*,\s*5\s*\)/);
    });

    it("should compute latestValidationTimestamp as max across all agents", () => {
      expect(source).toMatch(/agents\.reduce\s*\(/);
      expect(source).toContain("Math.max(latest, timestamp)");
    });

    it("should wrap all computed values in useMemo", () => {
      const memoCount = (source.match(/useMemo\s*\(/g) || []).length;
      // activeAgents, topAgents, trustRankedAgents, latestValidationTimestamp
      expect(memoCount).toBeGreaterThanOrEqual(4);
    });
  });

  describe("render states", () => {
    it("should render a loading spinner when loading is true", () => {
      expect(source).toContain("Synchronizing Protocol Data");
      expect(source).toContain("animate-spin");
    });

    it("should render sign-in prompt when user is null", () => {
      expect(source).toContain("Sign in to load");
      expect(source).toContain("Private Workspace");
    });

    it("should render error state with reload button", () => {
      expect(source).toContain("window.location.reload()");
      expect(source).toContain("Reload Page");
    });

    it("should render Trust Leaderboard section", () => {
      expect(source).toContain("Trust Leaderboard");
    });

    it("should render Top Performing Strategies section", () => {
      expect(source).toContain("Top Performing Strategies");
    });

    it("should render empty state for trust leaderboard when no agents", () => {
      expect(source).toContain("No trust telemetry available yet");
    });
  });

  describe("navigation links", () => {
    it("should link to register-agent page", () => {
      expect(source).toContain('href="/register-agent"');
    });

    it("should link to agents registry page", () => {
      expect(source).toContain('href="/agents"');
    });
  });

  describe("imports", () => {
    it("should import erc8004Client from app/lib path", () => {
      expect(source).toMatch(
        /import\s*\{[^}]*erc8004Client[^}]*\}\s*from\s*["']@\/app\/lib\/erc8004Client["']/,
      );
    });

    it("should import subscribeToAuthState from app/lib/firebase", () => {
      expect(source).toMatch(
        /import\s*\{[^}]*subscribeToAuthState[^}]*\}\s*from\s*["']@\/app\/lib\/firebase["']/,
      );
    });

    it("should import getTrustScore from trustArtifacts service", () => {
      expect(source).toMatch(
        /import\s*\{[^}]*getTrustScore[^}]*\}\s*from\s*["'][^"']*trustArtifacts["']/,
      );
    });
  });
});
