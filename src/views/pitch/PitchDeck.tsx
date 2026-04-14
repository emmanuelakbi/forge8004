import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { slides } from "./slides";
import { ScaledSlidePreview } from "./PitchSlide";

async function downloadBlob(res: Response, fallbackName: string) {
  const disposition = res.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || fallbackName;
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function PitchDeck() {
  const [isGenerating, setIsGenerating] = useState(false);

  async function exportAll() {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "pitch-deck",
          slideCount: slides.length,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await downloadBlob(res, "forge8004-pitch-deck.pdf");
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      setIsGenerating(false);
    }
  }

  async function exportSlide(idx: number, fmt: "png" | "pdf") {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "pitch-slide",
          slideIndex: idx,
          format: fmt,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const ext = fmt;
      await downloadBlob(
        res,
        `forge8004-slide-${String(idx + 1).padStart(2, "0")}.${ext}`,
      );
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="page-shell pb-20">
      <section className="glass-panel space-y-6 p-6 sm:p-8 lg:p-10">
        <div className="flex flex-col gap-6 border-b border-border-subtle pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <div className="h-2 w-2 bg-emerald-cyber" />
              <span className="text-[10px] font-mono uppercase tracking-[0.28em] text-emerald-cyber">
                Forge8004 // Pitch Deck
              </span>
            </div>
            <h1 className="text-3xl font-mono font-bold uppercase leading-[0.95] text-white sm:text-4xl lg:text-5xl">
              A sharper story for
              <span className="block text-emerald-cyber">
                clarity, control, and trust
              </span>
            </h1>
          </div>
          <button
            onClick={exportAll}
            disabled={isGenerating}
            className="inline-flex items-center justify-center gap-3 border border-emerald-cyber bg-emerald-cyber px-6 py-4 text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-obsidian transition hover:bg-emerald-cyber/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isGenerating ? "Exporting..." : "Export all as PDF"}
          </button>
        </div>
      </section>

      <div className="space-y-12">
        {slides.map((slide, index) => (
          <section key={slide.id} className="space-y-4">
            <div className="flex items-center justify-between">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="h-2 w-2 bg-emerald-cyber" />
                <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-zinc-500">
                  {slide.title}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => exportSlide(index, "png")}
                  disabled={isGenerating}
                  className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500 transition hover:text-emerald-cyber disabled:opacity-40"
                >
                  PNG
                </button>
                <button
                  onClick={() => exportSlide(index, "pdf")}
                  disabled={isGenerating}
                  className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500 transition hover:text-emerald-cyber disabled:opacity-40"
                >
                  PDF
                </button>
                <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-zinc-600">
                  Slide {slide.num}
                </p>
              </div>
            </div>
            <ScaledSlidePreview slide={slide} index={index} />
          </section>
        ))}
      </div>
    </div>
  );
}
