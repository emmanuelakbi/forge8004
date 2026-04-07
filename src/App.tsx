import { lazy, Suspense, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import LayoutSidebar from "./components/layout/LayoutSidebar";
import TopBar from "./components/layout/TopBar";
import SeoManager from "./components/layout/SeoManager";

// Lazy-loaded route pages — each becomes its own chunk
const LandingPage = lazy(() => import("./pages/landing"));
const Overview = lazy(() => import("./pages/overview"));
const HowItWorks = lazy(() => import("./pages/how-it-works"));
const TrustCenter = lazy(() => import("./pages/trust-center"));
const AgentsList = lazy(() => import("./pages/agents-list"));
const AgentDetail = lazy(() => import("./pages/agent-detail"));
const AgentCompare = lazy(() => import("./pages/compare"));
const RiskReplay = lazy(() => import("./pages/risk-replay"));
const Portfolio = lazy(() => import("./pages/portfolio"));
const TrustReport = lazy(() => import("./pages/trust-report"));
const RegisterAgent = lazy(() => import("./pages/register-agent"));
const ContactPage = lazy(() => import("./pages/contact"));
const PrivacyPolicy = lazy(() => import("./pages/privacy"));
const TermsConditions = lazy(() => import("./pages/terms"));
const BrandKit = lazy(() => import("./pages/brand"));
const PitchDeck = lazy(() => import("./pages/pitch"));
const SocialMediaKit = lazy(() => import("./pages/social"));
const Docs = lazy(() => import("./pages/docs"));
const Markets = lazy(() => import("./pages/markets"));
const Signals = lazy(() => import("./pages/signals"));

function RouteLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-emerald-cyber/30 border-t-emerald-cyber rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <Router>
      <SeoManager />
      <div className="flex min-h-screen bg-obsidian relative selection:bg-emerald-cyber/30 selection:text-emerald-cyber">
        {/* Aesthetic Overlays */}
        <div className="grain-overlay" />
        <div className="absolute top-0 left-0 w-full h-[1px] bg-emerald-cyber/20 z-50" />

        <LayoutSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <div className="flex-1 flex flex-col min-w-0 relative z-10">
          <TopBar onMenuClick={() => setIsSidebarOpen(true)} />

          <main className="flex-1 px-4 py-4 md:px-6 md:py-6 xl:px-8 xl:py-8 max-w-7xl mx-auto w-full">
            <Suspense fallback={<RouteLoader />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/overview" element={<Overview />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/trust-center" element={<TrustCenter />} />
                <Route path="/agents" element={<AgentsList />} />
                <Route path="/agents/:agentId" element={<AgentDetail />} />
                <Route path="/compare" element={<AgentCompare />} />
                <Route path="/risk-replay" element={<RiskReplay />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route
                  path="/agents/:agentId/trust-report"
                  element={<TrustReport />}
                />
                <Route path="/register-agent" element={<RegisterAgent />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsConditions />} />
                <Route path="/brand" element={<BrandKit />} />
                {/* <Route path="/pitch" element={<PitchDeck />} /> */}
                {/* <Route path="/social-kit" element={<SocialMediaKit />} /> */}
                <Route path="/docs" element={<Docs />} />
                <Route path="/markets" element={<Markets />} />
                <Route path="/markets/:coinId" element={<Markets />} />
                {/* <Route path="/signals" element={<Signals />} /> */}
              </Routes>
            </Suspense>
          </main>

          <footer className="border-t border-border-subtle px-4 py-4 md:px-6 xl:px-8 flex flex-col gap-3 text-center sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:text-left text-[10px] font-mono text-zinc-600 uppercase tracking-[0.2em]">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
              <span>System: Forge8004 Grid v1.0.4</span>
              <span>Base Sepolia Network // Active</span>
              <span>© 2026 Trust Protocol</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-end">
              <Link
                to="/privacy"
                className="hover:text-emerald-cyber transition-colors"
              >
                Privacy
              </Link>
              <Link
                to="/terms"
                className="hover:text-emerald-cyber transition-colors"
              >
                Terms
              </Link>
              <Link
                to="/contact"
                className="hover:text-emerald-cyber transition-colors"
              >
                Contact
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </Router>
  );
}
