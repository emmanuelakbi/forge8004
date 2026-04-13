import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-border-subtle px-4 py-4 md:px-6 xl:px-8 flex flex-col gap-3 text-center sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:text-left text-[10px] font-mono text-zinc-600 uppercase tracking-[0.2em]">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
        <span>System: Forge8004 Grid v1.0.4</span>
        <span>Base Sepolia Network // Active</span>
        <span>© 2026 Trust Protocol</span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-end">
        <Link
          href="/privacy"
          className="hover:text-emerald-cyber transition-colors"
        >
          Privacy
        </Link>
        <Link
          href="/terms"
          className="hover:text-emerald-cyber transition-colors"
        >
          Terms
        </Link>
        <Link
          href="/contact"
          className="hover:text-emerald-cyber transition-colors"
        >
          Contact
        </Link>
      </div>
    </footer>
  );
}
