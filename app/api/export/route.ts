import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { jsPDF } from "jspdf";

const ALLOWED_TYPES = ["pitch-slide", "pitch-deck", "flyer"] as const;
type ExportType = (typeof ALLOWED_TYPES)[number];

/** Derives the base URL from the incoming request so it always matches the running server. */
function getBaseUrl(req: NextRequest) {
  const host = req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

/**
 * Launches a headless Puppeteer browser, navigates to `url`, waits for the
 * `#export-target` element, and returns a high-DPI screenshot buffer.
 *
 * @param url    - Internal render page URL
 * @param width  - Viewport width in CSS pixels
 * @param height - Viewport height in CSS pixels
 * @param format - Image format ("png" or "jpeg")
 * @returns Screenshot buffer
 */
async function screenshotPage(
  url: string,
  width: number,
  height: number,
  format: "png" | "jpeg" = "png",
): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({
      width,
      height,
      deviceScaleFactor: 2,
    });
    await page.goto(url, { waitUntil: "networkidle0", timeout: 15000 });

    // Wait for the export target element
    await page.waitForSelector("#export-target", { timeout: 10000 });

    // Small delay for fonts and rendering to settle
    await new Promise((r) => setTimeout(r, 500));

    const element = await page.$("#export-target");
    if (!element) throw new Error("Export target not found");

    const screenshot = await element.screenshot({
      type: format,
      quality: format === "jpeg" ? 95 : undefined,
      omitBackground: false,
    });

    return Buffer.from(screenshot);
  } finally {
    await browser.close();
  }
}

/**
 * POST /api/export
 *
 * Exports pitch slides, full pitch decks, or flyers as PNG, JPEG, or PDF.
 * Uses Puppeteer to screenshot internal render pages and jsPDF for PDF assembly.
 *
 * Body params:
 *  - type: "pitch-slide" | "pitch-deck" | "flyer"
 *  - format?: "png" | "jpeg" | "pdf" (default "png")
 *  - slideIndex?: number (required for pitch-slide)
 *  - slideCount?: number (optional for pitch-deck, default 12)
 *  - flyerId?: string (required for flyer)
 *  - width?: number (optional for flyer, default 1080)
 *  - height?: number (optional for flyer, default 1080)
 *
 * Returns: Binary image or PDF with Content-Disposition attachment header.
 *
 * Errors:
 *  - 400: Invalid type, missing slideIndex, or missing flyerId
 *  - 500: Puppeteer/rendering failure
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      type,
      format = "png",
      slideIndex,
      flyerId,
    } = body as {
      type: ExportType;
      format?: "png" | "jpeg" | "pdf";
      slideIndex?: number;
      flyerId?: string;
      width?: number;
      height?: number;
    };

    if (!ALLOWED_TYPES.includes(type)) {
      return NextResponse.json(
        {
          error: "INVALID_EXPORT_TYPE",
          message: "Type must be one of: pitch-slide, pitch-deck, flyer",
        },
        { status: 400 },
      );
    }

    const base = getBaseUrl(req);

    if (type === "pitch-slide") {
      if (slideIndex === undefined || slideIndex < 0) {
        return NextResponse.json(
          {
            error: "MISSING_SLIDE_INDEX",
            message: "slideIndex is required and must be >= 0",
          },
          { status: 400 },
        );
      }

      const url = `${base}/render/pitch/${slideIndex}`;
      const imgBuf = await screenshotPage(
        url,
        1280,
        720,
        format === "pdf" ? "jpeg" : format,
      );

      if (format === "pdf") {
        // Use custom page size matching the 16:9 slide ratio (in mm)
        const pdfW = 338.67; // 1280px at 96dpi ≈ 338.67mm
        const pdfH = 190.5; // 720px at 96dpi ≈ 190.5mm
        const pdf = new jsPDF("l", "mm", [pdfW, pdfH]);
        const dataUrl = `data:image/jpeg;base64,${imgBuf.toString("base64")}`;
        pdf.addImage(dataUrl, "JPEG", 0, 0, pdfW, pdfH);
        const pdfBuf = Buffer.from(pdf.output("arraybuffer"));
        return new NextResponse(pdfBuf, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="forge8004-slide-${String((slideIndex ?? 0) + 1).padStart(2, "0")}.pdf"`,
          },
        });
      }

      const mime = format === "jpeg" ? "image/jpeg" : "image/png";
      return new NextResponse(imgBuf, {
        headers: {
          "Content-Type": mime,
          "Content-Disposition": `attachment; filename="forge8004-slide-${String((slideIndex ?? 0) + 1).padStart(2, "0")}.${format}"`,
        },
      });
    }

    if (type === "pitch-deck") {
      // Export all slides as a single PDF with custom 16:9 page size
      const pdfW = 338.67; // 1280px at 96dpi ≈ 338.67mm
      const pdfH = 190.5; // 720px at 96dpi ≈ 190.5mm
      const pdf = new jsPDF("l", "mm", [pdfW, pdfH]);

      const slideCount = body.slideCount || 12;

      for (let i = 0; i < slideCount; i++) {
        if (i > 0) pdf.addPage([pdfW, pdfH], "l");
        const url = `${base}/render/pitch/${i}`;
        const imgBuf = await screenshotPage(url, 1280, 720, "jpeg");
        const dataUrl = `data:image/jpeg;base64,${imgBuf.toString("base64")}`;
        pdf.addImage(dataUrl, "JPEG", 0, 0, pdfW, pdfH);
      }

      const pdfBuf = Buffer.from(pdf.output("arraybuffer"));
      return new NextResponse(pdfBuf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition":
            'attachment; filename="forge8004-pitch-deck.pdf"',
        },
      });
    }

    if (type === "flyer") {
      if (!flyerId) {
        return NextResponse.json(
          {
            error: "MISSING_FLYER_ID",
            message: "flyerId is required for flyer exports",
          },
          { status: 400 },
        );
      }

      const w = body.width || 1080;
      const h = body.height || 1080;
      const url = `${base}/render/flyer/${flyerId}`;
      const imgFormat = format === "pdf" ? "jpeg" : (format as "png" | "jpeg");
      const imgBuf = await screenshotPage(url, w, h, imgFormat);

      if (format === "pdf") {
        const landscape = w > h;
        // Convert px to mm (1px ≈ 0.2646mm at 96dpi) for exact aspect ratio
        const pdfW = w * 0.2646;
        const pdfH = h * 0.2646;
        const pdf = new jsPDF(landscape ? "l" : "p", "mm", [
          landscape ? pdfW : pdfH,
          landscape ? pdfH : pdfW,
        ]);
        const dataUrl = `data:image/jpeg;base64,${imgBuf.toString("base64")}`;
        pdf.addImage(
          dataUrl,
          "JPEG",
          0,
          0,
          pdf.internal.pageSize.getWidth(),
          pdf.internal.pageSize.getHeight(),
        );
        const pdfBuf = Buffer.from(pdf.output("arraybuffer"));
        return new NextResponse(pdfBuf, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="forge8004-${flyerId}.pdf"`,
          },
        });
      }

      const mime = format === "jpeg" ? "image/jpeg" : "image/png";
      return new NextResponse(imgBuf, {
        headers: {
          "Content-Type": mime,
          "Content-Disposition": `attachment; filename="forge8004-${flyerId}-${w}x${h}.${format}"`,
        },
      });
    }

    return NextResponse.json(
      { error: "UNKNOWN_TYPE", message: "Unrecognized export type" },
      { status: 400 },
    );
  } catch (err) {
    console.error("Export error:", err);
    return NextResponse.json(
      {
        error: "EXPORT_FAILED",
        message: err instanceof Error ? err.message : "Export failed",
      },
      { status: 500 },
    );
  }
}
