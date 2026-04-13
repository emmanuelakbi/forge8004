"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/app/components/layout/Sidebar";
import TopBar from "@/app/components/layout/TopBar";
import Footer from "@/app/components/layout/Footer";

export default function RoutesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  // Scroll to top and move focus to main content area on route change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    window.scrollTo(0, 0);
    // Small delay to let the new page render
    const timer = setTimeout(() => {
      mainRef.current?.focus({ preventScroll: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-obsidian relative selection:bg-emerald-cyber/30 selection:text-emerald-cyber">
      {/* Aesthetic Overlays */}
      <div className="grain-overlay" />
      <div className="absolute top-0 left-0 w-full h-[1px] bg-emerald-cyber/20 z-50" />

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        menuButtonRef={menuButtonRef}
      />

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <TopBar
          onMenuClick={() => setIsSidebarOpen(true)}
          menuButtonRef={menuButtonRef}
        />

        <main
          ref={mainRef}
          tabIndex={-1}
          className="flex-1 px-4 py-4 md:px-6 md:py-6 xl:px-8 xl:py-8 max-w-7xl mx-auto w-full outline-none"
        >
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
}
