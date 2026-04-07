import { cn } from "../../utils/cn";
import {
  FileText,
  Home,
  Mail,
  ShieldCheck,
  Users,
  Workflow,
  X,
  LayoutDashboard,
  BarChart3,
  History,
  Wallet,
  Activity,
  Zap,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ForgeLogo } from "../brand/Logo";

const navItems = [
  { name: "Home", icon: Home, path: "/" },
  { name: "How It Works", icon: Workflow, path: "/how-it-works" },
  { name: "Trust Center", icon: ShieldCheck, path: "/trust-center" },
  { name: "Console", icon: LayoutDashboard, path: "/overview" },
  { name: "Agents", icon: Users, path: "/agents" },
  { name: "Compare", icon: BarChart3, path: "/compare" },
  { name: "Risk Replay", icon: History, path: "/risk-replay" },
  { name: "Portfolio", icon: Wallet, path: "/portfolio" },
  { name: "Markets", icon: Activity, path: "/markets" },
  // { name: "Signals", icon: Zap, path: "/signals" },
  // { name: 'Brand Kit', icon: ImageIcon, path: '/brand' },
  // { name: 'Pitch Deck', icon: Presentation, path: '/pitch' },
  // { name: 'Social Kit', icon: FileImage, path: '/social-kit' },
  { name: "Docs", icon: FileText, path: "/docs" },
  { name: "Contact", icon: Mail, path: "/contact" },
];

export default function LayoutSidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const location = useLocation();

  const sidebarContent = (
    <div className="flex h-full min-h-full flex-col justify-between">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex items-center justify-between mb-12">
          <Link to="/" className="flex items-center gap-4 group cursor-pointer">
            <ForgeLogo className="w-10 h-10" />
            <div>
              <h1 className="text-xs font-mono font-bold tracking-[0.2em] text-white leading-tight uppercase">
                FORGE
                <br />
                <span className="text-emerald-cyber">8004</span>
              </h1>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-2 text-zinc-500 hover:text-emerald-cyber transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive =
              item.path === "/"
                ? location.pathname === item.path
                : location.pathname === item.path ||
                  location.pathname.startsWith(`${item.path}/`);
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => onClose()}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 text-[11px] font-mono uppercase tracking-widest transition-all relative group",
                  isActive
                    ? "text-emerald-cyber"
                    : "text-zinc-500 hover:text-zinc-200",
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute left-0 w-1 h-full bg-emerald-cyber shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  />
                )}
                <item.icon
                  className={cn(
                    "w-4 h-4 transition-transform group-hover:scale-110",
                    isActive && "text-emerald-cyber",
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-8 border-t border-border-subtle bg-zinc-deep/30">
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <p className="text-[9px] uppercase tracking-[0.3em] text-zinc-600 font-bold">
              Network Status
            </p>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-cyber rounded-none animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <span className="text-[10px] font-mono text-zinc-400 uppercase">
                Base Sepolia // Online
              </span>
            </div>
          </div>

          <div className="h-[1px] w-full bg-border-subtle" />

          <div className="flex flex-col gap-1">
            <p className="text-[9px] uppercase tracking-[0.3em] text-zinc-600 font-bold">
              Protocol Version
            </p>
            <span className="text-[10px] font-mono text-zinc-400 uppercase">
              ERC-8004 // v1.0.4
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-dvh w-72 bg-obsidian border-r border-border-subtle z-[70] lg:hidden"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 self-stretch bg-obsidian border-r border-border-subtle flex-col min-h-screen max-h-screen sticky top-0 z-50">
        {sidebarContent}
      </aside>
    </>
  );
}
