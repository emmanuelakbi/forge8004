import { useEffect, useMemo, useState } from "react";
import { truncateHex } from "../../utils/format";
import { cn } from "../../utils/cn";
import {
  Activity,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cpu,
  Search,
  Shield,
} from "lucide-react";
import { TrustTimelineEvent } from "../../services/trustArtifacts";

function toCompactTime(timestamp: number) {
  const d = new Date(timestamp);
  const date = d.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
  });
  const time = d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} ${time}`;
}

type TimelineGroup = {
  key: string;
  nonce?: string;
  timestamp: number;
  events: TrustTimelineEvent[];
  summary: {
    label: string;
    title: string;
    tone: "approved" | "blocked" | "neutral" | "info";
  };
};

type ValidationTimelinePanelProps = {
  trustTimelineLength: number;
  groupedTimeline: TimelineGroup[];
};

export default function ValidationTimelinePanel({
  trustTimelineLength,
  groupedTimeline,
}: ValidationTimelinePanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 2;

  const filteredTimeline = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return groupedTimeline;

    return groupedTimeline.filter((group) => {
      const haystack = [
        group.summary.label,
        group.summary.title,
        group.nonce,
        group.key,
        ...group.events.flatMap((event) => [
          event.title,
          event.detail,
          event.kind,
          event.nonce,
          event.intentId,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [groupedTimeline, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredTimeline.length / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, groupedTimeline.length]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pageStart = (currentPage - 1) * pageSize;
  const visibleTimelineGroups = filteredTimeline.slice(
    pageStart,
    pageStart + pageSize,
  );

  return (
    <section className="glass-panel p-8 space-y-6">
      <div className="space-y-4 border-l-2 border-emerald-cyber pl-5">
        <div className="max-w-3xl space-y-2">
          <h2 className="flex items-start gap-3 text-sm font-mono font-bold uppercase tracking-[0.2em] text-white">
            <Shield className="w-4 h-4 text-emerald-cyber" />
            <span className="leading-tight sm:text-[15px] md:whitespace-nowrap">
              <span className="md:hidden">
                Validation
                <br />
                Timeline
              </span>
              <span className="hidden md:inline">Validation Timeline</span>
            </span>
          </h2>
          <p className="max-w-2xl text-[10px] font-mono uppercase leading-relaxed tracking-wider text-zinc-600">
            Recent sequences grouped into plain-English checkpoints
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-12 items-center justify-center border border-border-subtle bg-obsidian/50 px-4 sm:min-w-[10rem]">
            <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-zinc-500">
              {trustTimelineLength} Events
            </span>
          </div>
          <div className="relative min-w-[16rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search timeline"
              className="h-12 w-full border border-border-subtle bg-obsidian/50 py-2 pl-9 pr-3 text-[9px] font-mono uppercase tracking-widest text-zinc-300 outline-none transition-colors placeholder:text-zinc-700 focus:border-emerald-cyber/30"
            />
          </div>
          {filteredTimeline.length > 0 ? (
            <div className="ml-auto flex flex-wrap items-center gap-2 max-sm:w-full max-sm:justify-between">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="flex h-12 items-center justify-center gap-1 border border-border-subtle px-4 text-[9px] font-mono uppercase tracking-widest text-zinc-400 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-[8.5rem]"
              >
                <ChevronLeft className="w-3 h-3" />
                Newer
              </button>
              <span className="px-2 text-center text-[9px] font-mono uppercase tracking-[0.22em] text-zinc-600">
                Page {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                disabled={currentPage >= totalPages}
                className="flex h-12 items-center justify-center gap-1 border border-border-subtle px-4 text-[9px] font-mono uppercase tracking-widest text-zinc-400 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-[8.5rem]"
              >
                Older
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {filteredTimeline.length === 0 ? (
        <div className="border border-dashed border-border-subtle bg-obsidian/30 p-10 text-center">
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.2em]">
            {searchQuery
              ? "No matching timeline entries found"
              : "No trust events recorded yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {visibleTimelineGroups.map((group) => (
            <article
              key={group.key}
              className="border border-border-subtle bg-obsidian/40 p-5 sm:p-6"
            >
              <div className="flex flex-col gap-4 border-b border-border-subtle/80 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "px-2 py-1 text-[8px] font-mono uppercase tracking-widest border",
                        group.summary.tone === "approved" &&
                          "border-emerald-cyber/30 text-emerald-cyber",
                        group.summary.tone === "blocked" &&
                          "border-amber-warning/30 text-amber-warning",
                        group.summary.tone === "neutral" &&
                          "border-zinc-700 text-zinc-400",
                        group.summary.tone === "info" &&
                          "border-border-subtle text-zinc-300",
                      )}
                    >
                      {group.summary.label}
                    </span>
                    <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-600">
                      {group.nonce || truncateHex(group.key)}
                    </span>
                  </div>
                  <h3 className="text-[12px] font-mono font-bold text-white uppercase tracking-[0.18em]">
                    {group.summary.title}
                  </h3>
                  <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-600">
                    {group.events.length} checkpoints in this sequence
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-600">
                    Latest Event
                  </p>
                  <p className="mt-1 text-[11px] font-mono text-zinc-300 uppercase tracking-widest">
                    {toCompactTime(group.timestamp)}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {group.events.map((event) => (
                  <div
                    key={event.id}
                    className="grid gap-3 rounded-sm border border-border-subtle/80 bg-obsidian/50 px-4 py-4 md:grid-cols-[9rem,1fr,5rem]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center border bg-obsidian",
                          event.tone === "approved" &&
                            "border-emerald-cyber/30 text-emerald-cyber",
                          event.tone === "blocked" &&
                            "border-amber-warning/30 text-amber-warning",
                          event.tone === "neutral" &&
                            "border-zinc-700 text-zinc-400",
                          event.tone === "info" &&
                            "border-border-subtle text-zinc-300",
                        )}
                      >
                        {event.kind === "INTENT" && (
                          <Clock className="w-4 h-4" />
                        )}
                        {event.kind === "SIGNED" && <Cpu className="w-4 h-4" />}
                        {event.kind === "RISK" && (
                          <Shield className="w-4 h-4" />
                        )}
                        {event.kind === "EXECUTION" && (
                          <Activity className="w-4 h-4" />
                        )}
                        {event.kind === "VALIDATION" && (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[8px] font-mono uppercase tracking-widest text-zinc-600">
                          {event.kind}
                        </p>
                        <p className="mt-1 text-[10px] font-mono font-bold uppercase tracking-wider text-white">
                          {event.title}
                        </p>
                      </div>
                    </div>

                    <p className="text-[10px] font-mono uppercase leading-relaxed tracking-tight text-zinc-400">
                      {event.detail}
                    </p>

                    <div className="text-left md:text-right">
                      <p className="text-[8px] font-mono uppercase tracking-widest text-zinc-600">
                        Time
                      </p>
                      <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-zinc-300">
                        {toCompactTime(event.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
