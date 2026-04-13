/**
 * Unit tests for consumer component hydration safety
 *
 * Source-level verification that wallet-dependent components follow
 * the correct SSR-safe patterns to prevent hydration mismatches.
 *
 * Validates: Requirements 7.6, 7.7, 9.7
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const readSource = (relativePath: string): string =>
  readFileSync(resolve(__dirname, "../..", relativePath), "utf-8");

describe("Component hydration safety", () => {
  describe("TopBar — wallet state deferred to useEffect", () => {
    const source = readSource("app/components/layout/TopBar.tsx");

    it("should initialize walletAddress state as null via useState", () => {
      // Verify useState<string | null>(null) pattern for walletAddress
      const stateInitPattern = /useState<string\s*\|\s*null>\s*\(\s*null\s*\)/;
      expect(source).toMatch(stateInitPattern);
    });

    it("should only call getStoredWalletAddress() inside a useEffect callback", () => {
      // Extract all lines that call getStoredWalletAddress
      const lines = source.split("\n");
      const callLines: number[] = [];
      lines.forEach((line, idx) => {
        if (
          line.includes("getStoredWalletAddress()") ||
          line.includes("getStoredWalletAddress(")
        ) {
          // Skip import lines
          if (
            !line.trim().startsWith("import") &&
            !line.trim().startsWith("//")
          ) {
            callLines.push(idx);
          }
        }
      });

      // There should be at least one call
      expect(callLines.length).toBeGreaterThan(0);

      // Each call should be inside a useEffect block
      for (const lineIdx of callLines) {
        // Walk backwards from the call to find the enclosing useEffect
        let foundUseEffect = false;
        let braceDepth = 0;
        for (let i = lineIdx; i >= 0; i--) {
          const line = lines[i];
          // Count braces to track scope
          for (const ch of line) {
            if (ch === "}") braceDepth++;
            if (ch === "{") braceDepth--;
          }
          if (line.includes("useEffect(") && braceDepth <= 0) {
            foundUseEffect = true;
            break;
          }
        }
        expect(foundUseEffect).toBe(true);
      }
    });

    it("should not call getStoredWalletAddress() in the component body or render path", () => {
      // The function body starts after the component function declaration.
      // Verify getStoredWalletAddress is NOT called at the top level of the component
      // (i.e., not as a direct argument to useState or in a variable assignment outside useEffect).
      const unsafePatterns = [
        /useState\(\s*getStoredWalletAddress\s*\(\)/,
        /const\s+\w+\s*=\s*getStoredWalletAddress\s*\(\)/,
        /let\s+\w+\s*=\s*getStoredWalletAddress\s*\(\)/,
      ];

      for (const pattern of unsafePatterns) {
        expect(source).not.toMatch(pattern);
      }
    });
  });

  describe("WalletPickerModal — discovery order", () => {
    const source = readSource("src/components/layout/WalletPickerModal.tsx");

    it("should call startWalletDiscovery() before getAvailableWallets()", () => {
      // Find the positions of both calls within useEffect blocks
      const discoveryIdx = source.indexOf("startWalletDiscovery()");
      const getWalletsIdx = source.indexOf("getAvailableWallets()");

      // Both should exist
      expect(discoveryIdx).toBeGreaterThan(-1);
      expect(getWalletsIdx).toBeGreaterThan(-1);

      // startWalletDiscovery must appear before getAvailableWallets
      expect(discoveryIdx).toBeLessThan(getWalletsIdx);
    });

    it("should call startWalletDiscovery inside a useEffect callback", () => {
      const lines = source.split("\n");
      const callLineIdx = lines.findIndex(
        (l) =>
          l.includes("startWalletDiscovery()") &&
          !l.trim().startsWith("import"),
      );
      expect(callLineIdx).toBeGreaterThan(-1);

      // Walk backwards to find enclosing useEffect
      let foundUseEffect = false;
      let braceDepth = 0;
      for (let i = callLineIdx; i >= 0; i--) {
        for (const ch of lines[i]) {
          if (ch === "}") braceDepth++;
          if (ch === "{") braceDepth--;
        }
        if (lines[i].includes("useEffect(") && braceDepth <= 0) {
          foundUseEffect = true;
          break;
        }
      }
      expect(foundUseEffect).toBe(true);
    });
  });

  describe("Hydration mismatch prevention", () => {
    it("TopBar walletAddress should be null on initial render (matches server output)", () => {
      const source = readSource("app/components/layout/TopBar.tsx");

      // The useState for walletAddress must initialize to null
      // This ensures server HTML and initial client HTML match (both render with null)
      const match = source.match(
        /const\s+\[walletAddress,\s*setWalletAddress\]\s*=\s*useState<[^>]*>\s*\(\s*null\s*\)/,
      );
      expect(match).not.toBeNull();
    });

    it("WalletPickerModal wallets state should be initialized as empty array (matches server output)", () => {
      const source = readSource("src/components/layout/WalletPickerModal.tsx");

      // wallets state initialized as empty array — safe for SSR
      const match = source.match(
        /const\s+\[wallets,\s*setWallets\]\s*=\s*useState<[^>]*>\s*\(\s*\[\s*\]\s*\)/,
      );
      expect(match).not.toBeNull();
    });

    it("TopBar should subscribe to wallet changes via onWalletChange inside useEffect", () => {
      const source = readSource("app/components/layout/TopBar.tsx");

      // Verify onWalletChange is called inside a useEffect (event subscription is client-only)
      const lines = source.split("\n");
      const callLineIdx = lines.findIndex(
        (l) => l.includes("onWalletChange(") && !l.trim().startsWith("import"),
      );
      expect(callLineIdx).toBeGreaterThan(-1);

      let foundUseEffect = false;
      let braceDepth = 0;
      for (let i = callLineIdx; i >= 0; i--) {
        for (const ch of lines[i]) {
          if (ch === "}") braceDepth++;
          if (ch === "{") braceDepth--;
        }
        if (lines[i].includes("useEffect(") && braceDepth <= 0) {
          foundUseEffect = true;
          break;
        }
      }
      expect(foundUseEffect).toBe(true);
    });
  });
});
