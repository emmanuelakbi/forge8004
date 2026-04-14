import { useEffect, useRef, useState } from "react";
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

export default function SocialMediaKit() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 6;
  const totalPages = Math.ceil(FLYERS.length / PAGE_SIZE);
  const visible = FLYERS.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  async function handleExport(
    flyer: Flyer,
    format: "png" | "jpeg" | "pdf" = "png",
  ) {
    setDownloading(`${flyer.id}-${format}`);
    try {
      const res = await fetch("/api/export", {
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
      if (!res.ok) throw new Error(await res.text());
      const ext = format;
      await downloadBlob(
        res,
        `forge8004-${flyer.id}-${flyer.width}x${flyer.height}.${ext}`,
      );
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
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
          any design as PNG, JPEG, or PDF.
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExport(flyer, "png")}
                  disabled={downloading !== null}
                  className="inline-flex items-center gap-2 border border-emerald-cyber/30 bg-emerald-cyber/8 px-3 py-2 text-[9px] font-mono uppercase tracking-[0.18em] text-emerald-cyber transition hover:bg-emerald-cyber/15 disabled:opacity-40"
                >
                  {downloading === `${flyer.id}-png` ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  PNG
                </button>
                <button
                  onClick={() => handleExport(flyer, "jpeg")}
                  disabled={downloading !== null}
                  className="text-[9px] font-mono uppercase tracking-[0.18em] text-zinc-500 transition hover:text-emerald-cyber disabled:opacity-40"
                >
                  JPEG
                </button>
                <button
                  onClick={() => handleExport(flyer, "pdf")}
                  disabled={downloading !== null}
                  className="text-[9px] font-mono uppercase tracking-[0.18em] text-zinc-500 transition hover:text-emerald-cyber disabled:opacity-40"
                >
                  PDF
                </button>
              </div>
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
    </div>
  );
}
