import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import {
  Download,
  MonitorSmartphone,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Flyer } from "./primitives";
import { FLYERS } from "./flyers";

function ScaledPreview({ flyer }: { flyer: Flyer }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const u = () => setW(el.getBoundingClientRect().width);
    u();
    const o = new ResizeObserver(u);
    o.observe(el);
    return () => o.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: `${flyer.width}/${flyer.height}` }}
    >
      {w > 0 && (
        <div
          style={{
            width: flyer.width,
            height: flyer.height,
            transform: `scale(${w / flyer.width})`,
            transformOrigin: "top left",
          }}
        >
          {flyer.content(flyer.width, flyer.height)}
        </div>
      )}
    </div>
  );
}

function sanitizeClone(doc: Document) {
  const fix = (t: string) =>
    t
      ?.replace(/oklch\([^)]+\)/g, "#10B981")
      .replace(/oklab\([^)]+\)/g, "#10B981") ?? t;
  Array.from(doc.getElementsByTagName("style")).forEach((s) => {
    if (s.textContent) s.textContent = fix(s.textContent);
  });
  Array.from(doc.getElementsByTagName("*")).forEach((el) => {
    const h = el as HTMLElement;
    const sa = h.getAttribute("style");
    if (sa) h.setAttribute("style", fix(sa));
    try {
      const c = window.getComputedStyle(h);
      const r = (v: string, f: string) =>
        !v || v.includes("oklch") || v.includes("oklab") ? f : v;
      h.style.color = r(c.color, "#FFF");
      h.style.backgroundColor = r(c.backgroundColor, "transparent");
      h.style.borderColor = r(c.borderColor, "transparent");
    } catch {}
  });
  const s = doc.createElement("style");
  s.innerHTML =
    "*{transition:none!important;animation:none!important;backdrop-filter:none!important}body{background:#0A0A0B!important}";
  doc.head.appendChild(s);
}

export default function SocialMediaKit() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [exportFlyer, setExportFlyer] = useState<Flyer | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 6;
  const totalPages = Math.ceil(FLYERS.length / PAGE_SIZE);
  const visible = FLYERS.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  async function handleExport(flyer: Flyer) {
    setDownloading(flyer.id);
    setExportFlyer(flyer);
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
    try {
      if ("fonts" in document)
        await (document as Document & { fonts: FontFaceSet }).fonts.ready;
      if (!exportRef.current) return;
      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#0A0A0B",
        logging: false,
        width: flyer.width,
        height: flyer.height,
        onclone: (d) => {
          try {
            sanitizeClone(d);
          } catch {}
        },
      });
      const a = document.createElement("a");
      a.download = `forge8004-${flyer.id}-${flyer.width}x${flyer.height}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    } catch (e) {
      console.error(e);
    } finally {
      setExportFlyer(null);
      setDownloading(null);
    }
  }

  return (
    <div className="page-shell pb-20">
      <section className="glass-panel p-6 sm:p-8 lg:p-10 space-y-6">
        <div className="inline-flex items-center gap-3 border border-emerald-cyber/20 bg-emerald-cyber/5 px-4 py-2">
          <MonitorSmartphone className="h-4 w-4 text-emerald-cyber" />
          <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-emerald-cyber">
            Social Media Kit
          </span>
        </div>
        <h1 className="text-3xl font-mono font-bold uppercase leading-[0.95] text-white sm:text-4xl lg:text-5xl">
          10 unique designs for
          <span className="block text-emerald-cyber">
            every channel and message
          </span>
        </h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          Each flyer has its own layout, purpose, and visual composition. Export
          any design as a full-resolution PNG.
        </p>
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-400">
            {FLYERS.length} designs — page {page + 1} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="border border-border-subtle px-3 py-2 text-zinc-400 hover:text-white disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="border border-border-subtle px-3 py-2 text-zinc-400 hover:text-white disabled:opacity-40"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-2">
        {visible.map((flyer) => (
          <article
            key={flyer.id}
            className="glass-panel border border-border-subtle p-5"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-mono font-bold uppercase text-white">
                  {flyer.name}
                </h2>
                <p className="mt-1 text-[11px] font-mono uppercase text-zinc-500">
                  {flyer.desc}
                </p>
                <p className="mt-1 text-[10px] font-mono uppercase text-zinc-600">
                  {flyer.width} × {flyer.height} — {flyer.platform}
                </p>
              </div>
              <button
                onClick={() => handleExport(flyer)}
                disabled={downloading !== null}
                className="inline-flex items-center gap-2 border border-emerald-cyber/30 bg-emerald-cyber/8 px-4 py-2 text-[9px] font-mono uppercase tracking-[0.18em] text-emerald-cyber transition hover:bg-emerald-cyber/15 disabled:opacity-40"
              >
                {downloading === flyer.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                PNG
              </button>
            </div>
            <div className="overflow-hidden border border-border-subtle">
              <div
                className="mx-auto w-full"
                style={{ maxWidth: flyer.height > flyer.width ? 420 : 600 }}
              >
                <ScaledPreview flyer={flyer} />
              </div>
            </div>
          </article>
        ))}
      </section>

      <div className="pointer-events-none fixed -left-[200vw] top-0 opacity-0">
        {exportFlyer && (
          <div
            ref={exportRef}
            style={{ width: exportFlyer.width, height: exportFlyer.height }}
          >
            {exportFlyer.content(exportFlyer.width, exportFlyer.height)}
          </div>
        )}
      </div>
    </div>
  );
}
