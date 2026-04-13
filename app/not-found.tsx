import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-obsidian text-center px-4">
      <p className="text-[120px] font-mono font-bold text-zinc-800 leading-none">
        404
      </p>
      <p className="text-sm font-mono text-zinc-500 uppercase tracking-[0.3em] mt-4">
        Page not found
      </p>
      <p className="text-xs font-mono text-zinc-600 mt-2 max-w-md">
        The route you requested does not exist in the Forge8004 protocol.
      </p>
      <Link
        href="/"
        className="mt-8 px-6 py-3 border border-emerald-cyber/40 bg-emerald-cyber/10 text-emerald-cyber text-[10px] font-mono uppercase tracking-[0.25em] hover:bg-emerald-cyber/20 transition-colors"
      >
        Return to Home
      </Link>
    </div>
  );
}
