import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Shield,
  Sparkles,
  Eye,
  Lock,
  BarChart3,
  Users,
  Zap,
} from "lucide-react";
import {
  Flyer,
  toRgba,
  Grid,
  Glow,
  Frame,
  Logo,
  Footer,
  Panel,
  DarkPanel,
} from "./primitives";

function Flyer1({ w, h }: { w: number; h: number }) {
  const p = w * 0.06,
    s = w * 0.013,
    accent = "#10B981";
  return (
    <div
      className="relative overflow-hidden"
      style={{ width: w, height: h, backgroundColor: "#0A0A0B" }}
    >
      <Grid id="f1" w={w} h={h} />
      <Glow
        color={accent}
        style={{ left: "-10%", top: "-8%", width: w * 0.5, height: w * 0.5 }}
      />
      <Frame pad={p} />
      <div
        className="relative flex flex-col justify-between"
        style={{ padding: p, height: h }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Logo size={w * 0.07} />
          <div
            className="font-mono uppercase"
            style={{
              fontSize: s,
              letterSpacing: "0.2em",
              color: "#71717A",
              display: "flex",
              alignItems: "center",
              gap: 8,
              paddingTop: w * 0.022,
            }}
          >
            <Sparkles
              style={{ width: s * 1.2, height: s * 1.2, color: accent }}
            />
            Now live
          </div>
        </div>
        <div>
          <p
            className="font-mono uppercase"
            style={{ fontSize: s, letterSpacing: "0.3em", color: accent }}
          >
            Introducing Forge8004
          </p>
          <h2
            className="font-mono font-bold uppercase"
            style={{
              fontSize: w * 0.058,
              lineHeight: 0.95,
              color: "#FFF",
              marginTop: p * 0.3,
            }}
          >
            One workspace for every AI agent decision
          </h2>
          <p
            className="font-sans"
            style={{
              fontSize: w * 0.02,
              lineHeight: 1.45,
              color: "#D4D4D8",
              marginTop: p * 0.35,
              maxWidth: "85%",
            }}
          >
            Follow signals, safety checks, capital movement, and outcomes — all
            in one place.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: p * 0.3,
          }}
        >
          {[
            ["Identity", "On-chain agent ID"],
            ["Validation", "Policy checks first"],
            ["Capital", "Sandbox treasury"],
            ["Telemetry", "Transparent logs"],
          ].map(([t, d]) => (
            <DarkPanel key={t} style={{ padding: p * 0.35 }}>
              <p
                className="font-mono font-bold uppercase"
                style={{ fontSize: s * 1.1, color: accent }}
              >
                {t}
              </p>
              <p
                className="font-mono uppercase"
                style={{ fontSize: s, color: "#A1A1AA", marginTop: 4 }}
              >
                {d}
              </p>
            </DarkPanel>
          ))}
        </div>
        <Panel
          accent={accent}
          style={{
            padding: p * 0.35,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <p
            className="font-mono font-bold uppercase"
            style={{ fontSize: w * 0.018, color: "#FFF" }}
          >
            Explore the workspace →
          </p>
          <p
            className="font-mono uppercase"
            style={{ fontSize: s, color: accent }}
          >
            forge8004.xyz
          </p>
        </Panel>
        <Footer w={w} pad={p} s={s} />
      </div>
    </div>
  );
}

// ── Flyer 2: Trust Proof (Portrait 1080x1350) ──
// Big quote, trust timeline steps, credibility bar
function Flyer2({ w, h }: { w: number; h: number }) {
  const p = w * 0.06,
    s = w * 0.013,
    accent = "#38BDF8";
  return (
    <div
      className="relative overflow-hidden"
      style={{ width: w, height: h, backgroundColor: "#0A0A0B" }}
    >
      <Grid id="f2" w={w} h={h} />
      <Glow
        color={accent}
        style={{ right: "-8%", top: "10%", width: w * 0.45, height: w * 0.45 }}
      />
      <Frame pad={p} />
      <div
        className="relative flex flex-col justify-between"
        style={{ padding: p, height: h }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Logo size={w * 0.07} />
          <p
            className="font-mono uppercase"
            style={{ fontSize: s, letterSpacing: "0.2em", color: accent }}
          >
            Trust layer
          </p>
        </div>
        <div>
          <p
            className="font-mono"
            style={{
              fontSize: w * 0.08,
              lineHeight: 1,
              color: toRgba(accent, 0.15),
            }}
          >
            "
          </p>
          <h2
            className="font-mono font-bold uppercase"
            style={{
              fontSize: w * 0.052,
              lineHeight: 0.95,
              color: "#FFF",
              marginTop: -p * 0.2,
            }}
          >
            Trust grows when people can see the full story
          </h2>
        </div>
        <div
          style={{ display: "flex", flexDirection: "column", gap: p * 0.25 }}
        >
          {[
            ["01", "Identity", "Who the agent is and what wallet it uses"],
            ["02", "Validation", "What checks were applied before action"],
            ["03", "Execution", "What actually happened on-chain"],
            ["04", "Reputation", "Steady behavior tracked over time"],
          ].map(([n, t, d]) => (
            <div
              key={n}
              style={{
                display: "flex",
                gap: p * 0.3,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: w * 0.055,
                  height: w * 0.055,
                  border: `1px solid ${toRgba(accent, 0.3)}`,
                  backgroundColor: toRgba(accent, 0.08),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span
                  className="font-mono font-bold"
                  style={{ fontSize: s * 1.1, color: accent }}
                >
                  {n}
                </span>
              </div>
              <div>
                <p
                  className="font-mono font-bold uppercase"
                  style={{ fontSize: w * 0.016, color: "#FFF" }}
                >
                  {t}
                </p>
                <p
                  className="font-mono uppercase"
                  style={{ fontSize: s, color: "#A1A1AA", marginTop: 3 }}
                >
                  {d}
                </p>
              </div>
            </div>
          ))}
        </div>
        <Panel
          accent={accent}
          style={{ padding: p * 0.35, textAlign: "center" as const }}
        >
          <p
            className="font-mono font-bold uppercase"
            style={{ fontSize: w * 0.018, color: "#FFF" }}
          >
            See the proof at forge8004.xyz
          </p>
        </Panel>
        <Footer w={w} pad={p} s={s} />
      </div>
    </div>
  );
}

// ── Flyer 3: Risk Router Explainer (Landscape 1200x628) ──
// 3-column flow: Intent → Router → Outcome
function Flyer3({ w, h }: { w: number; h: number }) {
  const p = w * 0.04,
    s = w * 0.011,
    accent = "#F59E0B";
  return (
    <div
      className="relative overflow-hidden"
      style={{ width: w, height: h, backgroundColor: "#0A0A0B" }}
    >
      <Grid id="f3" w={w} h={h} />
      <Glow
        color={accent}
        style={{ left: "40%", top: "-15%", width: w * 0.35, height: w * 0.35 }}
      />
      <Frame pad={p} />
      <div
        className="relative flex flex-col justify-between"
        style={{ padding: p, height: h }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: p * 0.5 }}>
            <Logo size={h * 0.08} />
            <div>
              <p
                className="font-mono uppercase"
                style={{ fontSize: s, letterSpacing: "0.25em", color: accent }}
              >
                Risk Router
              </p>
              <p
                className="font-mono uppercase"
                style={{ fontSize: s * 0.9, color: "#71717A", marginTop: 2 }}
              >
                The system can say no before money moves
              </p>
            </div>
          </div>
          <p
            className="font-mono uppercase"
            style={{ fontSize: s, color: "#71717A" }}
          >
            Forge8004
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr auto 1fr",
            gap: p * 0.3,
            alignItems: "stretch",
          }}
        >
          <DarkPanel style={{ padding: p * 0.5 }}>
            <p
              className="font-mono uppercase"
              style={{ fontSize: s, color: "#71717A", letterSpacing: "0.2em" }}
            >
              Incoming intent
            </p>
            <div
              style={{
                marginTop: p * 0.3,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {["Asset pair", "Position size", "Capital requested"].map((i) => (
                <div
                  key={i}
                  style={{
                    padding: "6px 10px",
                    border: "1px solid rgba(255,255,255,0.06)",
                    fontSize: s,
                    fontFamily: "monospace",
                    textTransform: "uppercase" as const,
                    color: "#E4E4E7",
                  }}
                >
                  {i}
                </div>
              ))}
            </div>
          </DarkPanel>
          <div style={{ display: "flex", alignItems: "center" }}>
            <ArrowRight style={{ color: accent, width: 20, height: 20 }} />
          </div>
          <Panel
            accent={accent}
            style={{
              padding: p * 0.5,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center" as const,
            }}
          >
            <Shield
              style={{ width: h * 0.08, height: h * 0.08, color: accent }}
            />
            <p
              className="font-mono font-bold uppercase"
              style={{ fontSize: w * 0.016, color: "#FFF", marginTop: 10 }}
            >
              Risk router
            </p>
            <p
              className="font-mono uppercase"
              style={{ fontSize: s, color: "#A1A1AA", marginTop: 4 }}
            >
              Checks sizing, exposure, limits
            </p>
          </Panel>
          <div style={{ display: "flex", alignItems: "center" }}>
            <ArrowRight style={{ color: accent, width: 20, height: 20 }} />
          </div>
          <DarkPanel style={{ padding: p * 0.5 }}>
            <p
              className="font-mono uppercase"
              style={{ fontSize: s, color: "#71717A", letterSpacing: "0.2em" }}
            >
              Outcome
            </p>
            <div
              style={{
                marginTop: p * 0.3,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {[
                "Approved or blocked",
                "Capital updated",
                "Checkpoint saved",
              ].map((i) => (
                <div
                  key={i}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <CheckCircle2
                    style={{
                      width: 14,
                      height: 14,
                      color: accent,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: s,
                      fontFamily: "monospace",
                      textTransform: "uppercase" as const,
                      color: "#E4E4E7",
                    }}
                  >
                    {i}
                  </span>
                </div>
              ))}
            </div>
          </DarkPanel>
        </div>
        <Footer w={w} pad={p} s={s} />
      </div>
    </div>
  );
}

// ── Flyer 4: Stats Dashboard (Square 1080x1080) ──
// 6 stat cards in a grid — performance snapshot
function Flyer4({ w, h }: { w: number; h: number }) {
  const p = w * 0.06,
    s = w * 0.013,
    accent = "#10B981";
  const stats = [
    { label: "Agents", value: "12", note: "Registered" },
    { label: "Sequences", value: "847", note: "Completed" },
    { label: "Blocked", value: "23", note: "By risk router" },
    { label: "Capital", value: "$240k", note: "Under management" },
    { label: "Uptime", value: "99.8%", note: "Last 30 days" },
    { label: "Trust score", value: "A+", note: "Reputation tier" },
  ];
  return (
    <div
      className="relative overflow-hidden"
      style={{ width: w, height: h, backgroundColor: "#0A0A0B" }}
    >
      <Grid id="f4" w={w} h={h} />
      <Glow
        color={accent}
        style={{ right: "-5%", bottom: "-5%", width: w * 0.4, height: w * 0.4 }}
      />
      <Frame pad={p} />
      <div
        className="relative flex flex-col justify-between"
        style={{ padding: p, height: h }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: p * 0.4 }}>
            <Logo size={w * 0.07} />
            <div>
              <p
                className="font-mono font-bold uppercase"
                style={{ fontSize: w * 0.02, color: "#FFF" }}
              >
                Operator snapshot
              </p>
              <p
                className="font-mono uppercase"
                style={{ fontSize: s, color: "#71717A", marginTop: 2 }}
              >
                Real-time agent metrics
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Activity style={{ width: 14, height: 14, color: accent }} />
            <span
              className="font-mono uppercase"
              style={{ fontSize: s, color: accent }}
            >
              Live
            </span>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: p * 0.3,
          }}
        >
          {stats.map((st) => (
            <DarkPanel key={st.label} style={{ padding: p * 0.35 }}>
              <p
                className="font-mono uppercase"
                style={{
                  fontSize: s,
                  letterSpacing: "0.2em",
                  color: "#71717A",
                }}
              >
                {st.label}
              </p>
              <p
                className="font-mono font-bold"
                style={{ fontSize: w * 0.04, color: "#FFF", marginTop: 8 }}
              >
                {st.value}
              </p>
              <p
                className="font-mono uppercase"
                style={{ fontSize: s, color: accent, marginTop: 4 }}
              >
                {st.note}
              </p>
            </DarkPanel>
          ))}
        </div>
        <Footer w={w} pad={p} s={s} />
      </div>
    </div>
  );
}

// ── Flyer 5: Story — How It Works (Story 1080x1920) ──
// Vertical 5-step process flow
function Flyer5({ w, h }: { w: number; h: number }) {
  const p = w * 0.07,
    s = w * 0.013,
    accent = "#8B5CF6";
  const steps = [
    {
      icon: Users,
      t: "Register",
      d: "Define agent identity, strategy, and wallet",
    },
    {
      icon: Lock,
      t: "Fund sandbox",
      d: "Deposit capital into a protected treasury",
    },
    { icon: Eye, t: "Create intent", d: "Agent generates a trade signal" },
    {
      icon: Shield,
      t: "Policy check",
      d: "Risk router validates before execution",
    },
    {
      icon: CheckCircle2,
      t: "Record",
      d: "Outcome saved to validation timeline",
    },
  ];
  return (
    <div
      className="relative overflow-hidden"
      style={{ width: w, height: h, backgroundColor: "#0A0A0B" }}
    >
      <Grid id="f5" w={w} h={h} />
      <Glow
        color={accent}
        style={{ left: "-10%", top: "20%", width: w * 0.5, height: w * 0.5 }}
      />
      <Frame pad={p} />
      <div
        className="relative flex flex-col justify-between"
        style={{ padding: p, height: h }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Logo size={w * 0.08} />
          <p
            className="font-mono uppercase"
            style={{ fontSize: s, color: accent, letterSpacing: "0.2em" }}
          >
            How it works
          </p>
        </div>
        <div>
          <h2
            className="font-mono font-bold uppercase"
            style={{ fontSize: w * 0.06, lineHeight: 0.95, color: "#FFF" }}
          >
            Five steps from signal to record
          </h2>
        </div>
        <div
          style={{ display: "flex", flexDirection: "column", gap: p * 0.35 }}
        >
          {steps.map((st, i) => {
            const Icon = st.icon;
            return (
              <div
                key={i}
                style={{ display: "flex", gap: p * 0.35, alignItems: "center" }}
              >
                <Panel
                  accent={accent}
                  style={{
                    width: w * 0.12,
                    height: w * 0.12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon
                    style={{ width: w * 0.05, height: w * 0.05, color: accent }}
                  />
                </Panel>
                <div style={{ flex: 1 }}>
                  <p
                    className="font-mono font-bold uppercase"
                    style={{ fontSize: w * 0.022, color: "#FFF" }}
                  >
                    <span style={{ color: accent, marginRight: 8 }}>
                      0{i + 1}
                    </span>
                    {st.t}
                  </p>
                  <p
                    className="font-mono uppercase"
                    style={{
                      fontSize: s * 1.05,
                      color: "#A1A1AA",
                      marginTop: 4,
                    }}
                  >
                    {st.d}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <Panel
          accent={accent}
          style={{ padding: p * 0.4, textAlign: "center" as const }}
        >
          <p
            className="font-mono font-bold uppercase"
            style={{ fontSize: w * 0.02, color: "#FFF" }}
          >
            Start building trust → forge8004.xyz
          </p>
        </Panel>
        <Footer w={w} pad={p} s={s} />
      </div>
    </div>
  );
}

// ── Flyer 6: Safety Guarantee (Banner 1600x900) ──
// Split: left big statement, right 3 safety features
function Flyer6({ w, h }: { w: number; h: number }) {
  const p = w * 0.04,
    s = w * 0.009,
    accent = "#F59E0B";
  return (
    <div
      className="relative overflow-hidden"
      style={{ width: w, height: h, backgroundColor: "#0A0A0B" }}
    >
      <Grid id="f6" w={w} h={h} />
      <Glow
        color={accent}
        style={{
          left: "-5%",
          bottom: "-10%",
          width: w * 0.35,
          height: w * 0.35,
        }}
      />
      <Frame pad={p} />
      <div
        className="relative flex flex-col justify-between"
        style={{ padding: p, height: h }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: p * 0.5 }}>
            <Logo size={h * 0.07} />
            <p
              className="font-mono uppercase"
              style={{ fontSize: s, letterSpacing: "0.25em", color: accent }}
            >
              Capital protection
            </p>
          </div>
          <p
            className="font-mono uppercase"
            style={{ fontSize: s, color: "#71717A" }}
          >
            Forge8004
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr",
            gap: p * 0.8,
            alignItems: "center",
          }}
        >
          <div>
            <h2
              className="font-mono font-bold uppercase"
              style={{ fontSize: w * 0.038, lineHeight: 0.95, color: "#FFF" }}
            >
              Your agent should not spend more just because it can
            </h2>
            <p
              className="font-sans"
              style={{
                fontSize: w * 0.014,
                lineHeight: 1.45,
                color: "#A1A1AA",
                marginTop: p * 0.4,
                maxWidth: "90%",
              }}
            >
              Forge8004 enforces position caps, exposure limits, and daily loss
              guardrails before any capital moves.
            </p>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: p * 0.35 }}
          >
            {[
              ["Position caps", "Max size per trade enforced"],
              ["Exposure limits", "Total open risk controlled"],
              ["Loss guardrails", "Daily drawdown ceiling active"],
            ].map(([t, d]) => (
              <Panel key={t} accent={accent} style={{ padding: p * 0.45 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Shield
                    style={{
                      width: 18,
                      height: 18,
                      color: accent,
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <p
                      className="font-mono font-bold uppercase"
                      style={{ fontSize: w * 0.012, color: "#FFF" }}
                    >
                      {t}
                    </p>
                    <p
                      className="font-mono uppercase"
                      style={{ fontSize: s, color: "#A1A1AA", marginTop: 2 }}
                    >
                      {d}
                    </p>
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        </div>
        <Footer w={w} pad={p} s={s} />
      </div>
    </div>
  );
}

// ── Flyer 7: Team Alignment (Square 1080x1080) ──
// Center-focused: big icon, headline, 3 audience rows
function Flyer7({ w, h }: { w: number; h: number }) {
  const p = w * 0.06,
    s = w * 0.013,
    accent = "#8B5CF6";
  return (
    <div
      className="relative overflow-hidden"
      style={{ width: w, height: h, backgroundColor: "#0A0A0B" }}
    >
      <Grid id="f7" w={w} h={h} />
      <Glow
        color={accent}
        style={{ left: "30%", top: "-10%", width: w * 0.45, height: w * 0.45 }}
      />
      <Frame pad={p} />
      <div
        className="relative flex flex-col justify-between"
        style={{ padding: p, height: h }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Logo size={w * 0.07} />
          <p
            className="font-mono uppercase"
            style={{ fontSize: s, color: accent, letterSpacing: "0.2em" }}
          >
            Team visibility
          </p>
        </div>
        <div style={{ textAlign: "center" as const }}>
          <Users
            style={{
              width: w * 0.08,
              height: w * 0.08,
              color: accent,
              margin: "0 auto",
            }}
          />
          <h2
            className="font-mono font-bold uppercase"
            style={{
              fontSize: w * 0.048,
              lineHeight: 0.95,
              color: "#FFF",
              marginTop: p * 0.3,
            }}
          >
            One shared view for the whole team
          </h2>
          <p
            className="font-sans"
            style={{
              fontSize: w * 0.019,
              color: "#A1A1AA",
              marginTop: p * 0.25,
              maxWidth: "80%",
              margin: `${p * 0.25}px auto 0`,
            }}
          >
            From first signal to final result, everyone follows the same clean
            story.
          </p>
        </div>
        <div
          style={{ display: "flex", flexDirection: "column", gap: p * 0.25 }}
        >
          {[
            ["Founders", "Explain what the agent is doing clearly"],
            ["Ops teams", "Supervise signals and risk in one place"],
            ["Partners", "Share a credible product story"],
          ].map(([t, d]) => (
            <DarkPanel
              key={t}
              style={{
                padding: p * 0.35,
                display: "flex",
                alignItems: "center",
                gap: p * 0.3,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  backgroundColor: accent,
                  flexShrink: 0,
                }}
              />
              <div>
                <span
                  className="font-mono font-bold uppercase"
                  style={{ fontSize: w * 0.015, color: "#FFF" }}
                >
                  {t}
                </span>
                <span
                  className="font-mono uppercase"
                  style={{ fontSize: s, color: "#A1A1AA", marginLeft: 12 }}
                >
                  {d}
                </span>
              </div>
            </DarkPanel>
          ))}
        </div>
        <Footer w={w} pad={p} s={s} />
      </div>
    </div>
  );
}

// ── Flyer 8: Performance Leaderboard (Portrait 1080x1350) ──
// Simulated agent ranking table
function Flyer8({ w, h }: { w: number; h: number }) {
  const p = w * 0.06,
    s = w * 0.013,
    accent = "#EF4444";
  const agents = [
    { name: "ALPHA-7", score: "A+", pnl: "+12.4%", status: "Active" },
    { name: "DELTA-3", score: "A", pnl: "+8.1%", status: "Active" },
    { name: "SIGMA-9", score: "B+", pnl: "+5.7%", status: "Paused" },
    { name: "OMEGA-1", score: "B", pnl: "+2.3%", status: "Active" },
  ];
  return (
    <div
      className="relative overflow-hidden"
      style={{ width: w, height: h, backgroundColor: "#0A0A0B" }}
    >
      <Grid id="f8" w={w} h={h} />
      <Glow
        color={accent}
        style={{ right: "-8%", top: "30%", width: w * 0.4, height: w * 0.4 }}
      />
      <Frame pad={p} />
      <div
        className="relative flex flex-col justify-between"
        style={{ padding: p, height: h }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Logo size={w * 0.07} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <BarChart3 style={{ width: 14, height: 14, color: accent }} />
            <span
              className="font-mono uppercase"
              style={{ fontSize: s, color: accent, letterSpacing: "0.2em" }}
            >
              Leaderboard
            </span>
          </div>
        </div>
        <div>
          <h2
            className="font-mono font-bold uppercase"
            style={{ fontSize: w * 0.05, lineHeight: 0.95, color: "#FFF" }}
          >
            Results matter. Safe behavior matters too.
          </h2>
          <p
            className="font-sans"
            style={{
              fontSize: w * 0.019,
              color: "#A1A1AA",
              marginTop: p * 0.3,
            }}
          >
            Forge8004 tracks performance alongside discipline and risk
            compliance.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 0.6fr 0.8fr 0.7fr",
              gap: 0,
              padding: `0 ${p * 0.35}px ${p * 0.2}px`,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {["Agent", "Score", "PnL", "Status"].map((h) => (
              <p
                key={h}
                className="font-mono uppercase"
                style={{
                  fontSize: s * 0.9,
                  color: "#71717A",
                  letterSpacing: "0.2em",
                }}
              >
                {h}
              </p>
            ))}
          </div>
          {agents.map((a, i) => (
            <DarkPanel
              key={a.name}
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 0.6fr 0.8fr 0.7fr",
                padding: p * 0.35,
                alignItems: "center",
              }}
            >
              <p
                className="font-mono font-bold uppercase"
                style={{ fontSize: w * 0.016, color: "#FFF" }}
              >
                {a.name}
              </p>
              <p
                className="font-mono font-bold"
                style={{ fontSize: w * 0.018, color: accent }}
              >
                {a.score}
              </p>
              <p
                className="font-mono"
                style={{ fontSize: w * 0.016, color: "#10B981" }}
              >
                {a.pnl}
              </p>
              <p
                className="font-mono uppercase"
                style={{
                  fontSize: s,
                  color: a.status === "Active" ? "#10B981" : "#71717A",
                }}
              >
                {a.status}
              </p>
            </DarkPanel>
          ))}
        </div>
        <Footer w={w} pad={p} s={s} />
      </div>
    </div>
  );
}

// ── Flyer 9: ERC-8004 Explainer (Landscape 1200x628) ──
// Technical spec card — what the standard covers
function Flyer9({ w, h }: { w: number; h: number }) {
  const p = w * 0.04,
    s = w * 0.011,
    accent = "#10B981";
  return (
    <div
      className="relative overflow-hidden"
      style={{ width: w, height: h, backgroundColor: "#0A0A0B" }}
    >
      <Grid id="f9" w={w} h={h} />
      <Glow
        color={accent}
        style={{ left: "-5%", top: "-10%", width: w * 0.3, height: w * 0.3 }}
      />
      <Frame pad={p} />
      <div
        className="relative flex flex-col justify-between"
        style={{ padding: p, height: h }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: p * 0.5 }}>
            <Logo size={h * 0.07} />
            <p
              className="font-mono font-bold uppercase"
              style={{ fontSize: w * 0.016, color: "#FFF" }}
            >
              ERC-8004
            </p>
          </div>
          <Panel accent={accent} style={{ padding: "4px 12px" }}>
            <p
              className="font-mono uppercase"
              style={{ fontSize: s, color: accent, letterSpacing: "0.15em" }}
            >
              Token standard
            </p>
          </Panel>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: p * 0.4,
          }}
        >
          {[
            {
              icon: Zap,
              t: "Agent NFT",
              d: "Each agent is a non-fungible token storing identity and metadata on-chain",
            },
            {
              icon: Shield,
              t: "Policy engine",
              d: "Validation rules are checked before any capital movement is allowed",
            },
            {
              icon: BarChart3,
              t: "Reputation",
              d: "On-chain performance and behavior history builds trust over time",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <DarkPanel key={item.t} style={{ padding: p * 0.5 }}>
                <Icon
                  style={{ width: h * 0.06, height: h * 0.06, color: accent }}
                />
                <p
                  className="font-mono font-bold uppercase"
                  style={{ fontSize: w * 0.014, color: "#FFF", marginTop: 12 }}
                >
                  {item.t}
                </p>
                <p
                  className="font-mono uppercase"
                  style={{
                    fontSize: s,
                    color: "#A1A1AA",
                    marginTop: 6,
                    lineHeight: 1.5,
                  }}
                >
                  {item.d}
                </p>
              </DarkPanel>
            );
          })}
        </div>
        <Footer w={w} pad={p} s={s} />
      </div>
    </div>
  );
}

// ── Flyer 10: Call to Action (Banner 1600x900) ──
// Bold closing statement with big CTA
function Flyer10({ w, h }: { w: number; h: number }) {
  const p = w * 0.04,
    s = w * 0.009,
    accent = "#10B981";
  return (
    <div
      className="relative overflow-hidden"
      style={{ width: w, height: h, backgroundColor: "#0A0A0B" }}
    >
      <Grid id="f10" w={w} h={h} />
      <Glow
        color={accent}
        style={{ left: "20%", top: "-15%", width: w * 0.5, height: w * 0.5 }}
      />
      <Glow
        color="#8B5CF6"
        style={{
          right: "-5%",
          bottom: "-10%",
          width: w * 0.3,
          height: w * 0.3,
        }}
      />
      <Frame pad={p} />
      <div
        className="relative flex flex-col justify-between"
        style={{ padding: p, height: h }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Logo size={h * 0.07} />
          <p
            className="font-mono uppercase"
            style={{ fontSize: s, color: "#71717A" }}
          >
            Forge8004
          </p>
        </div>
        <div
          style={{
            textAlign: "center" as const,
            maxWidth: "80%",
            margin: "0 auto",
          }}
        >
          <h2
            className="font-mono font-bold uppercase"
            style={{ fontSize: w * 0.045, lineHeight: 0.92, color: "#FFF" }}
          >
            Understand the agent. Protect the money. Share the story.
          </h2>
          <p
            className="font-sans"
            style={{
              fontSize: w * 0.015,
              color: "#A1A1AA",
              marginTop: p * 0.5,
              lineHeight: 1.5,
            }}
          >
            Forge8004 is the ERC-8004 trust layer for autonomous financial
            agents — identity, validation, capital sandboxing, and transparent
            trading telemetry.
          </p>
        </div>
        <div
          style={{ display: "flex", gap: p * 0.4, justifyContent: "center" }}
        >
          <Panel
            accent={accent}
            style={{
              padding: `${p * 0.35}px ${p * 0.8}px`,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <p
              className="font-mono font-bold uppercase"
              style={{ fontSize: w * 0.013, color: "#FFF" }}
            >
              Explore the workspace
            </p>
            <ArrowRight style={{ width: 16, height: 16, color: accent }} />
          </Panel>
          <DarkPanel style={{ padding: `${p * 0.35}px ${p * 0.8}px` }}>
            <p
              className="font-mono font-bold uppercase"
              style={{ fontSize: w * 0.013, color: "#A1A1AA" }}
            >
              forge8004.xyz
            </p>
          </DarkPanel>
        </div>
        <Footer w={w} pad={p} s={s} />
      </div>
    </div>
  );
}

export const FLYERS: Flyer[] = [
  {
    id: "launch",
    name: "Product Launch",
    desc: "Announce Forge8004 with 4 core features",
    width: 1080,
    height: 1080,
    platform: "Instagram / X",
    content: (w, h) => <Flyer1 w={w} h={h} />,
  },
  {
    id: "trust-proof",
    name: "Trust Proof",
    desc: "Show the 4-step trust timeline",
    width: 1080,
    height: 1350,
    platform: "Instagram Portrait",
    content: (w, h) => <Flyer2 w={w} h={h} />,
  },
  {
    id: "risk-router",
    name: "Risk Router",
    desc: "Explain the intent → router → outcome flow",
    width: 1200,
    height: 628,
    platform: "LinkedIn / Share Card",
    content: (w, h) => <Flyer3 w={w} h={h} />,
  },
  {
    id: "stats",
    name: "Operator Snapshot",
    desc: "6 live metrics in a dashboard grid",
    width: 1080,
    height: 1080,
    platform: "Instagram / X",
    content: (w, h) => <Flyer4 w={w} h={h} />,
  },
  {
    id: "how-it-works",
    name: "How It Works",
    desc: "5-step vertical process flow",
    width: 1080,
    height: 1920,
    platform: "Stories / Reels",
    content: (w, h) => <Flyer5 w={w} h={h} />,
  },
  {
    id: "safety",
    name: "Capital Protection",
    desc: "Safety features with bold statement",
    width: 1600,
    height: 900,
    platform: "Wide Banner",
    content: (w, h) => <Flyer6 w={w} h={h} />,
  },
  {
    id: "team",
    name: "Team Alignment",
    desc: "Center-focused audience breakdown",
    width: 1080,
    height: 1080,
    platform: "Instagram / X",
    content: (w, h) => <Flyer7 w={w} h={h} />,
  },
  {
    id: "leaderboard",
    name: "Performance Board",
    desc: "Agent ranking table with scores",
    width: 1080,
    height: 1350,
    platform: "Instagram Portrait",
    content: (w, h) => <Flyer8 w={w} h={h} />,
  },
  {
    id: "erc8004",
    name: "ERC-8004 Explainer",
    desc: "Technical spec — 3 pillars of the standard",
    width: 1200,
    height: 628,
    platform: "LinkedIn / Share Card",
    content: (w, h) => <Flyer9 w={w} h={h} />,
  },
  {
    id: "cta",
    name: "Call to Action",
    desc: "Bold closing statement with dual CTA",
    width: 1600,
    height: 900,
    platform: "Wide Banner",
    content: (w, h) => <Flyer10 w={w} h={h} />,
  },
];
