import { cn } from "../../utils/cn";
import { useEffect, useMemo, useState } from "react";
import { ValidationRecord } from "../../lib/types";
import { Clock, ChevronLeft, ChevronRight, Search } from "lucide-react";

const PAGE_SIZE = 6;

export default function ValidationTable({
  records,
}: {
  records: ValidationRecord[];
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRecords = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return records;

    return records.filter((record) => {
      const haystack = [record.validationType, record.validator, record.comment]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [records, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [records.length, searchQuery]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredRecords.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, filteredRecords]);

  const rangeStart =
    filteredRecords.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd =
    filteredRecords.length === 0 ? 0 : rangeStart + paginatedRecords.length - 1;

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-border-subtle bg-obsidian/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search registry"
            className="w-full border border-border-subtle bg-obsidian/50 py-2 pl-9 pr-3 text-[9px] font-mono uppercase tracking-widest text-zinc-300 outline-none transition-colors placeholder:text-zinc-700 focus:border-emerald-cyber/30"
          />
        </div>
        <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.2em]">
          {filteredRecords.length} matching records
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-border-subtle bg-obsidian/50">
              <th className="py-5 px-6 text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-600">
                Type // Signal
              </th>
              <th className="py-5 px-6 text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-600">
                Validator // Node
              </th>
              <th className="py-5 px-6 text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-600">
                Score // Confidence
              </th>
              <th className="py-5 px-6 text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-600">
                Comment // Metadata
              </th>
              <th className="py-5 px-6 text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-600">
                Timestamp
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                    No validation records yet
                  </p>
                </td>
              </tr>
            ) : (
              paginatedRecords.map((record) => (
                <tr
                  key={record.id}
                  className="hover:bg-emerald-cyber/[0.02] transition-colors group"
                >
                  <td className="py-5 px-6">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-1.5 h-1.5",
                          record.validationType === "TRADE_INTENT"
                            ? "bg-blue-500"
                            : record.validationType === "RISK_CHECK"
                              ? "bg-amber-warning"
                              : "bg-emerald-cyber",
                        )}
                      />
                      <span className="text-[10px] font-mono font-bold text-zinc-300 uppercase tracking-widest">
                        {record.validationType}
                      </span>
                    </div>
                  </td>
                  <td className="py-5 px-6">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-tight">
                      0x{record.validator.slice(0, 6)}...
                      {record.validator.slice(-4)}
                    </span>
                  </td>
                  <td className="py-5 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-1 bg-zinc-900 overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all duration-500",
                            record.score > 90
                              ? "bg-emerald-cyber"
                              : record.score > 70
                                ? "bg-amber-warning"
                                : "bg-red-500",
                          )}
                          style={{ width: `${record.score}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-zinc-300 tabular-nums">
                        {record.score}%
                      </span>
                    </div>
                  </td>
                  <td className="py-5 px-6">
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-tight max-w-xs truncate group-hover:text-zinc-300 transition-colors">
                      {record.comment}
                    </p>
                  </td>
                  <td className="py-5 px-6">
                    <div className="flex items-center gap-2 text-zinc-600 font-mono">
                      <Clock className="w-3 h-3" />
                      <span className="text-[9px] tabular-nums uppercase">
                        {(() => {
                          const d = new Date(record.timestamp);
                          return `${d.toLocaleDateString([], { day: "2-digit", month: "short" })} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
                        })()}
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredRecords.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-border-subtle bg-obsidian/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.2em]">
            Showing {rangeStart}-{rangeEnd} of {filteredRecords.length} records
          </p>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-2 border border-border-subtle px-3 py-2 text-[9px] font-mono uppercase tracking-widest text-zinc-400 transition-colors hover:border-emerald-cyber/30 hover:text-emerald-cyber disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3 w-3" />
              Prev
            </button>

            <div className="min-w-20 text-center text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500">
              Page {currentPage} / {totalPages}
            </div>

            <button
              type="button"
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
              disabled={currentPage === totalPages}
              className="flex items-center gap-2 border border-border-subtle px-3 py-2 text-[9px] font-mono uppercase tracking-widest text-zinc-400 transition-colors hover:border-emerald-cyber/30 hover:text-emerald-cyber disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
