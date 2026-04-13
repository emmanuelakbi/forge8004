import { useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { SW, SH } from "./types";
import { slides } from "./slides";
import { PitchSlide, ScaledSlidePreview } from "./PitchSlide";

function resolveColor(colorValue: string): string {
  const temp = document.createElement("div");
  temp.style.color = colorValue;
  document.body.appendChild(temp);
  const resolved = getComputedStyle(temp).color;
  document.body.removeChild(temp);
  return resolved || "#10B981";
}

function sanitizeClone(doc: Document) {
  const fix = (t: string) =>
    t
      ?.replace(/oklch\([^)]+\)/g, (match) => resolveColor(match))
      .replace(/oklab\([^)]+\)/g, (match) => resolveColor(match)) ?? t;
  Array.from(doc.getElementsByTagName("style")).forEach((s) => {
    if (s.textContent) s.textContent = fix(s.textContent);
  });

  const layoutProps = [
    "display",
    "position",
    "top",
    "right",
    "bottom",
    "left",
    "width",
    "height",
    "minWidth",
    "minHeight",
    "maxWidth",
    "maxHeight",
    "margin",
    "marginTop",
    "marginRight",
    "marginBottom",
    "marginLeft",
    "padding",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "flexDirection",
    "flexWrap",
    "flexGrow",
    "flexShrink",
    "flexBasis",
    "justifyContent",
    "alignItems",
    "alignSelf",
    "gap",
    "rowGap",
    "columnGap",
    "gridTemplateColumns",
    "gridTemplateRows",
    "gridColumn",
    "gridRow",
    "overflow",
    "overflowX",
    "overflowY",
    "borderWidth",
    "borderStyle",
    "borderColor",
    "borderRadius",
    "fontSize",
    "fontFamily",
    "fontWeight",
    "lineHeight",
    "letterSpacing",
    "textTransform",
    "textAlign",
    "whiteSpace",
    "color",
    "backgroundColor",
    "opacity",
    "backgroundImage",
    "backgroundSize",
    "backgroundPosition",
    "boxSizing",
    "verticalAlign",
  ] as const;

  Array.from(doc.getElementsByTagName("*")).forEach((el) => {
    const h = el as HTMLElement;
    const sa = h.getAttribute("style");
    if (sa) h.setAttribute("style", fix(sa));
    try {
      const c = window.getComputedStyle(h);
      const fixColor = (v: string, f: string) =>
        !v || v.includes("oklch") || v.includes("oklab") ? f : v;
      for (const prop of layoutProps) {
        const val = (c as any)[prop];
        if (
          val &&
          val !== "" &&
          val !== "normal" &&
          val !== "none" &&
          val !== "auto" &&
          val !== "0px"
        ) {
          if (
            typeof val === "string" &&
            (val.includes("oklch") || val.includes("oklab"))
          ) {
            (h.style as any)[prop] = resolveColor(val);
          } else {
            (h.style as any)[prop] = val;
          }
        }
      }
      h.style.color = fixColor(c.color, "#FFFFFF");
      h.style.backgroundColor = fixColor(c.backgroundColor, "transparent");
      h.style.borderColor = fixColor(c.borderColor, "transparent");
      if (h instanceof SVGElement) {
        const fill = c.getPropertyValue("fill"),
          stroke = c.getPropertyValue("stroke");
        if (fill.includes("oklch") || fill.includes("oklab"))
          h.style.fill = resolveColor(fill);
        if (stroke.includes("oklch") || stroke.includes("oklab"))
          h.style.stroke = resolveColor(stroke);
      }
    } catch {
      /* skip */
    }
  });
  const s = doc.createElement("style");
  s.innerHTML =
    "*{transition:none!important;animation:none!important;backdrop-filter:none!important}body{background:#0A0A0B!important}";
  doc.head.appendChild(s);
}

export default function PitchDeck() {
  const [isGenerating, setIsGenerating] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);

  async function render(el: HTMLElement) {
    return html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#0A0A0B",
      logging: false,
      width: SW,
      height: SH,
      onclone: (d) => {
        try {
          sanitizeClone(d);
        } catch {}
      },
    });
  }

  async function exportAll() {
    if (!exportRef.current) return;
    setIsGenerating(true);
    try {
      if ("fonts" in document)
        await (document as Document & { fonts: FontFaceSet }).fonts.ready;
      const els = exportRef.current.querySelectorAll<HTMLElement>(
        "[data-export-slide]",
      );
      const pdf = new jsPDF("l", "mm", "a4");
      const pw = pdf.internal.pageSize.getWidth(),
        ph = pdf.internal.pageSize.getHeight();
      for (let i = 0; i < els.length; i++) {
        if (i > 0) pdf.addPage();
        pdf.addImage(
          (await render(els[i])).toDataURL("image/jpeg", 0.98),
          "JPEG",
          0,
          0,
          pw,
          ph,
        );
      }
      pdf.save("forge8004-pitch-deck.pdf");
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  }

  async function exportSlide(idx: number, fmt: "png" | "pdf") {
    if (!exportRef.current) return;
    setIsGenerating(true);
    try {
      if ("fonts" in document)
        await (document as Document & { fonts: FontFaceSet }).fonts.ready;
      const el = exportRef.current.querySelectorAll<HTMLElement>(
        "[data-export-slide]",
      )[idx];
      if (!el) return;
      const canvas = await render(el);
      const name = `forge8004-slide-${String(idx + 1).padStart(2, "0")}`;
      if (fmt === "png") {
        const a = document.createElement("a");
        a.download = `${name}.png`;
        a.href = canvas.toDataURL("image/png");
        a.click();
      } else {
        const pdf = new jsPDF("l", "mm", "a4");
        pdf.addImage(
          canvas.toDataURL("image/jpeg", 0.98),
          "JPEG",
          0,
          0,
          pdf.internal.pageSize.getWidth(),
          pdf.internal.pageSize.getHeight(),
        );
        pdf.save(`${name}.pdf`);
      }
    } catch (e) {
      console.error(e);
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

      <div
        style={{
          position: "fixed",
          left: -9999,
          top: 0,
          width: SW,
          pointerEvents: "none" as const,
        }}
      >
        <div ref={exportRef}>
          {slides.map((slide, index) => (
            <PitchSlide
              key={`e-${slide.id}`}
              slide={slide}
              index={index}
              idPrefix="e-"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
