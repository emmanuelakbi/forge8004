/**
 * Unit tests for Docs component
 *
 * Source-level verification that the Docs component follows
 * correct structure, exports, and rendering patterns.
 *
 * Validates: default export, sections data, operational steps,
 * client directive, imports, and static content.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const source = readFileSync(
  resolve(__dirname, "../../src/views/docs/Docs.tsx"),
  "utf-8",
);

describe("Docs", () => {
  describe("exports", () => {
    it("should have a default export function", () => {
      expect(source).toMatch(/export\s+default\s+function\s+Docs\s*\(/);
    });
  });

  describe("client directive", () => {
    it('should have "use client" directive at the top', () => {
      const firstLine = source.trimStart().split("\n")[0];
      expect(firstLine).toContain('"use client"');
    });
  });

  describe("imports", () => {
    it("should import Link from next/link", () => {
      expect(source).toMatch(/import\s+Link\s+from\s+["']next\/link["']/);
    });

    it("should import icons from lucide-react", () => {
      expect(source).toMatch(
        /import\s*\{[^}]*\}\s*from\s*["']lucide-react["']/,
      );
    });

    it("should import FileText icon", () => {
      expect(source).toMatch(
        /import\s*\{[^}]*FileText[^}]*\}\s*from\s*["']lucide-react["']/,
      );
    });

    it("should import Shield icon", () => {
      expect(source).toMatch(
        /import\s*\{[^}]*Shield[^}]*\}\s*from\s*["']lucide-react["']/,
      );
    });

    it("should import Database icon", () => {
      expect(source).toMatch(
        /import\s*\{[^}]*Database[^}]*\}\s*from\s*["']lucide-react["']/,
      );
    });

    it("should import TrendingUp icon", () => {
      expect(source).toMatch(
        /import\s*\{[^}]*TrendingUp[^}]*\}\s*from\s*["']lucide-react["']/,
      );
    });
  });

  describe("sections data", () => {
    it("should define a sections array", () => {
      expect(source).toMatch(/const\s+sections\s*=\s*\[/);
    });

    it("should include Protocol Overview section", () => {
      expect(source).toContain("Protocol Overview");
    });

    it("should include Agent Lifecycle section", () => {
      expect(source).toContain("Agent Lifecycle");
    });

    it("should include Validation Engine section", () => {
      expect(source).toContain("Validation Engine");
    });

    it("should include API Integration section", () => {
      expect(source).toContain("API Integration");
    });

    it("should assign an icon to each section", () => {
      expect(source).toMatch(/icon:\s*Shield/);
      expect(source).toMatch(/icon:\s*Cpu/);
      expect(source).toMatch(/icon:\s*Zap/);
      expect(source).toMatch(/icon:\s*Code/);
    });
  });

  describe("operational steps data", () => {
    it("should define an operationalSteps array", () => {
      expect(source).toMatch(/const\s+operationalSteps\s*=\s*\[/);
    });

    it("should include Capital Funding step", () => {
      expect(source).toContain("01 // Capital Funding");
    });

    it("should include Market Synchronization step", () => {
      expect(source).toContain("02 // Market Synchronization");
    });
  });

  describe("launch readiness checklist", () => {
    it("should include Launch Readiness Checklist heading", () => {
      expect(source).toContain("Launch Readiness Checklist");
    });

    it("should include Technical Requirements subsection", () => {
      expect(source).toContain("01 // Technical Requirements");
    });

    it("should include Submission Assets subsection", () => {
      expect(source).toContain("02 // Submission Assets");
    });

    it("should list all technical requirement items", () => {
      const items = [
        "ERC-8004 Compliance Verified",
        "Groq AI Brain Integration Active",
        "Real-time Market Feed Connected",
        "Base Sepolia Contract Addresses Updated",
        "Firestore Database Provisioned",
      ];
      for (const item of items) {
        expect(source).toContain(item);
      }
    });

    it("should list all submission asset items", () => {
      const items = [
        "Pitch Deck PDF (Download from /pitch)",
        "Brand Kit Assets (Download from /brand)",
        "Demo Video (Autonomous Loop in /agents/:id)",
        "GitHub Repository Link",
        "Project Description (metadata.json)",
      ];
      for (const item of items) {
        expect(source).toContain(item);
      }
    });
  });

  describe("contract setup guide", () => {
    it("should include Contract Setup Guide heading", () => {
      expect(source).toContain("Contract Setup Guide");
    });

    it("should reference src/lib/config.ts for configuration", () => {
      expect(source).toContain("src/lib/config.ts");
    });

    it("should list address source locations", () => {
      expect(source).toContain("Surge Discord");
      expect(source).toContain("Surge Portal");
      expect(source).toContain("Base Explorer");
    });

    it("should show REGISTRIES config snippet with IDENTITY and REPUTATION keys", () => {
      expect(source).toContain("REGISTRIES");
      expect(source).toContain("IDENTITY");
      expect(source).toContain("REPUTATION");
    });
  });

  describe("contract registry table", () => {
    it("should include Contract Registry heading", () => {
      expect(source).toContain("Contract Registry");
    });

    it("should define table column headers", () => {
      expect(source).toContain("Registry Name");
      expect(source).toContain("Standard");
      expect(source).toContain("Status");
    });

    it("should list all registry rows", () => {
      const registries = [
        "Identity Registry",
        "Reputation Registry",
        "Validation Registry",
        "Treasury Vault",
      ];
      for (const name of registries) {
        expect(source).toContain(name);
      }
    });

    it("should reference correct standards for each registry", () => {
      expect(source).toContain("ERC-721");
      expect(source).toContain("ERC-8004");
      expect(source).toContain("ERC-4626");
    });

    it("should include Active and Standby statuses", () => {
      expect(source).toContain('"Active"');
      expect(source).toContain('"Standby"');
    });
  });

  describe("footer note", () => {
    it("should include the protocol quote", () => {
      expect(source).toContain(
        "The grid is autonomous, but the protocol is immutable. Trust is",
      );
    });
  });
});
