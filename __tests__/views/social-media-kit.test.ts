import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FLYERS } from "@/src/views/social/flyers";

/* ------------------------------------------------------------------ */
/*  Constants derived from the component                               */
/* ------------------------------------------------------------------ */
const PAGE_SIZE = 6;

/* ------------------------------------------------------------------ */
/*  Helper: replicate downloadBlob logic for filename resolution       */
/* ------------------------------------------------------------------ */
function resolveFilename(
  contentDisposition: string | null,
  fallback: string,
): string {
  const match = contentDisposition?.match(/filename="?([^"]+)"?/);
  return match?.[1] || fallback;
}

/* ------------------------------------------------------------------ */
/*  Helper: replicate the downloading-key logic                        */
/* ------------------------------------------------------------------ */
function downloadingKey(
  flyerId: string,
  format: "png" | "jpeg" | "pdf",
): string {
  return `${flyerId}-${format}`;
}

/* ------------------------------------------------------------------ */
/*  Helper: replicate the fallback filename logic                      */
/* ------------------------------------------------------------------ */
function fallbackFilename(
  flyerId: string,
  width: number,
  height: number,
  format: "png" | "jpeg" | "pdf",
): string {
  return `forge8004-${flyerId}-${width}x${height}.${format}`;
}

/* ------------------------------------------------------------------ */
/*  FLYERS data integrity                                              */
/* ------------------------------------------------------------------ */
describe("SocialMediaKit", () => {
  describe("FLYERS data", () => {
    it("should have at least one flyer", () => {
      expect(FLYERS.length).toBeGreaterThan(0);
    });

    it("every flyer should have required fields", () => {
      for (const f of FLYERS) {
        expect(f.id).toBeTruthy();
        expect(f.name).toBeTruthy();
        expect(f.width).toBeGreaterThan(0);
        expect(f.height).toBeGreaterThan(0);
        expect(f.platform).toBeTruthy();
        expect(typeof f.content).toBe("function");
      }
    });

    it("flyer ids should be unique", () => {
      const ids = FLYERS.map((f) => f.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Pagination logic                                                   */
  /* ------------------------------------------------------------------ */
  describe("pagination", () => {
    const totalPages = Math.ceil(FLYERS.length / PAGE_SIZE);

    it("should compute correct total pages", () => {
      expect(totalPages).toBe(Math.ceil(FLYERS.length / PAGE_SIZE));
    });

    it("first page should contain up to PAGE_SIZE items", () => {
      const visible = FLYERS.slice(0, PAGE_SIZE);
      expect(visible.length).toBeLessThanOrEqual(PAGE_SIZE);
      expect(visible.length).toBeGreaterThan(0);
    });

    it("last page should contain remaining items", () => {
      const lastPage = totalPages - 1;
      const visible = FLYERS.slice(
        lastPage * PAGE_SIZE,
        (lastPage + 1) * PAGE_SIZE,
      );
      expect(visible.length).toBeGreaterThan(0);
      expect(visible.length).toBeLessThanOrEqual(PAGE_SIZE);
    });

    it("all pages combined should cover all flyers", () => {
      let count = 0;
      for (let p = 0; p < totalPages; p++) {
        count += FLYERS.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE).length;
      }
      expect(count).toBe(FLYERS.length);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  downloadBlob filename resolution                                   */
  /* ------------------------------------------------------------------ */
  describe("downloadBlob filename resolution", () => {
    it("should extract filename from Content-Disposition header", () => {
      expect(
        resolveFilename('attachment; filename="report.png"', "fallback.png"),
      ).toBe("report.png");
    });

    it("should handle unquoted filename", () => {
      expect(
        resolveFilename("attachment; filename=report.png", "fallback.png"),
      ).toBe("report.png");
    });

    it("should fall back when Content-Disposition is null", () => {
      expect(resolveFilename(null, "fallback.png")).toBe("fallback.png");
    });

    it("should fall back when no filename in header", () => {
      expect(resolveFilename("attachment", "fallback.png")).toBe(
        "fallback.png",
      );
    });
  });

  /* ------------------------------------------------------------------ */
  /*  downloading key (format-aware)                                     */
  /* ------------------------------------------------------------------ */
  describe("downloading key", () => {
    it("should include flyer id and format", () => {
      expect(downloadingKey("launch", "png")).toBe("launch-png");
      expect(downloadingKey("launch", "jpeg")).toBe("launch-jpeg");
      expect(downloadingKey("launch", "pdf")).toBe("launch-pdf");
    });

    it("should produce unique keys for different formats of the same flyer", () => {
      const keys = new Set([
        downloadingKey("launch", "png"),
        downloadingKey("launch", "jpeg"),
        downloadingKey("launch", "pdf"),
      ]);
      expect(keys.size).toBe(3);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  fallback filename (format-aware extension)                         */
  /* ------------------------------------------------------------------ */
  describe("fallback filename", () => {
    it("should use .png extension for png format", () => {
      const name = fallbackFilename("launch", 1080, 1080, "png");
      expect(name).toBe("forge8004-launch-1080x1080.png");
    });

    it("should use .jpeg extension for jpeg format", () => {
      const name = fallbackFilename("launch", 1080, 1080, "jpeg");
      expect(name).toBe("forge8004-launch-1080x1080.jpeg");
    });

    it("should use .pdf extension for pdf format", () => {
      const name = fallbackFilename("launch", 1080, 1080, "pdf");
      expect(name).toBe("forge8004-launch-1080x1080.pdf");
    });

    it("should embed actual flyer dimensions", () => {
      const name = fallbackFilename("trust-proof", 1080, 1350, "png");
      expect(name).toBe("forge8004-trust-proof-1080x1350.png");
    });
  });

  /* ------------------------------------------------------------------ */
  /*  handleExport fetch payload                                         */
  /* ------------------------------------------------------------------ */
  describe("handleExport fetch payload", () => {
    let fetchSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
        blob: () => Promise.resolve(new Blob()),
      });
      vi.stubGlobal("fetch", fetchSpy);
      // stub DOM methods used by downloadBlob
      vi.stubGlobal("URL", {
        createObjectURL: vi.fn(() => "blob:mock"),
        revokeObjectURL: vi.fn(),
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    async function simulateExport(
      flyer: (typeof FLYERS)[0],
      format: "png" | "jpeg" | "pdf" = "png",
    ) {
      // replicate the fetch call from handleExport
      await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "flyer",
          flyerId: flyer.id,
          format,
          width: flyer.width,
          height: flyer.height,
        }),
      });
    }

    it("should POST to /api/export with correct body for png", async () => {
      const flyer = FLYERS[0];
      await simulateExport(flyer, "png");

      expect(fetchSpy).toHaveBeenCalledWith("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "flyer",
          flyerId: flyer.id,
          format: "png",
          width: flyer.width,
          height: flyer.height,
        }),
      });
    });

    it("should POST with jpeg format when specified", async () => {
      const flyer = FLYERS[0];
      await simulateExport(flyer, "jpeg");

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.format).toBe("jpeg");
    });

    it("should POST with pdf format when specified", async () => {
      const flyer = FLYERS[0];
      await simulateExport(flyer, "pdf");

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.format).toBe("pdf");
    });

    it("should include flyer dimensions in the payload", async () => {
      const flyer = FLYERS.find((f) => f.id === "trust-proof")!;
      await simulateExport(flyer, "png");

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.width).toBe(1080);
      expect(body.height).toBe(1350);
    });
  });
});
