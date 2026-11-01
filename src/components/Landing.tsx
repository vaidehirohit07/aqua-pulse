import { ShieldCheck, Zap, LineChart, ArrowRight, LogIn } from "lucide-react";
import { Scene, BrandMark } from "./Dashboard";

const FEATURES = [
  {
    title: "Live, always",
    body: "Charts refresh themselves the moment a new reading reaches ThingSpeak — no reloading, no fuss.",
    icon: <Zap size={22} strokeWidth={2.2} />,
    tint: "#fbf3e0",
    deep: "#d9a84e",
  },
  {
    title: "Four sensors, one glance",
    body: "Temperature, humidity, TDS and distance — each with a trend chip and a gentle sparkline.",
    icon: <LineChart size={22} strokeWidth={2.2} />,
    tint: "#ecf4ee",
    deep: "#6fa080",
  },
  {
    title: "Yours only",
    body: "Sign in with email or Google. Your dashboard stays behind a soft little lock.",
    icon: <ShieldCheck size={22} strokeWidth={2.2} />,
    tint: "#faedef",
    deep: "#d98997",
  },
];

const STEPS = [
  { n: "01", t: "Sensors speak", d: "Your board posts readings to ThingSpeak channel 3530682." },
  { n: "02", t: "We listen", d: "The dashboard polls the API every 20 seconds, quietly." },
  { n: "03", t: "You glance", d: "Numbers tween, charts redraw, trends update themselves." },
];

export default function Landing({ onAuth }: { onAuth: (mode: "in" | "up") => void }) {
  return (
    <>
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />
      <div className="blob blob-4" />

      <div className="page">
        {/* nav */}
        <header className="topbar rise">
          <div className="brand">
            <BrandMark />
            <div className="brand-text">
              <b>The Little Sensor Station</b>
              <span>grown-up telemetry, softly drawn</span>
            </div>
          </div>
          <div className="top-actions">
            <button className="ghost-btn" onClick={() => onAuth("in")}>
              <LogIn size={14} strokeWidth={2.4} /> Sign in
            </button>
            <button className="btn" onClick={() => onAuth("up")}>
              Get started <ArrowRight size={14} strokeWidth={2.6} />
            </button>
          </div>
        </header>

        {/* hero */}
        <section className="hero land-hero">
          <div className="rise" style={{ animationDelay: "60ms" }}>
            <div className="eyebrow">IoT dashboard · live telemetry</div>
            <h1 className="land-h1">
              Watch your sensors breathe, in <span className="accent">real time</span>.
            </h1>
            <p className="lede">
              A soft, quiet home for your ThingSpeak data. Temperature, humidity, TDS and
              distance — gathered every few moments and drawn in pastel. Sign in to open
              your dashboard.
            </p>
            <div className="hero-meta" style={{ gap: 12 }}>
              <button className="btn" onClick={() => onAuth("up")}>
                Create your account <ArrowRight size={14} strokeWidth={2.6} />
              </button>
              <button className="ghost-btn" onClick={() => onAuth("in")}>
                I already have one
              </button>
            </div>
            <p className="tiny-hint">no credit card, no clutter — just your readings</p>
          </div>
          <div className="hero-scene rise" style={{ animationDelay: "140ms" }}>
            <Scene />
          </div>
        </section>

        {/* features */}
        <h2 className="section-label rise" style={{ animationDelay: "200ms" }}>Why you'll like it</h2>
        <section className="stats-grid">
          {FEATURES.map((f, i) => (
            <article key={f.title} className="card feature-card rise" style={{ animationDelay: `${240 + i * 110}ms` }}>
              <div className="stat-icon" style={{ background: f.tint, color: f.deep, width: 50, height: 50, borderRadius: 16 }}>
                {f.icon}
              </div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-body">{f.body}</p>
            </article>
          ))}
        </section>

        {/* steps */}
        <h2 className="section-label rise" style={{ animationDelay: "560ms" }}>How it works</h2>
        <section className="steps-grid">
          {STEPS.map((s, i) => (
            <div key={s.n} className="step rise" style={{ animationDelay: `${600 + i * 100}ms` }}>
              <span className="step-n">{s.n}</span>
              <div>
                <b>{s.t}</b>
                <p>{s.d}</p>
              </div>
            </div>
          ))}
        </section>

        {/* cta */}
        <section className="card cta-card rise" style={{ animationDelay: "900ms" }}>
          <span className="sparkle sp-butter tw1" style={{ top: 22, right: 36 }} />
          <span className="sparkle sp-blush tw2" style={{ bottom: 26, left: 40 }} />
          <h2>Ready to peek at your data?</h2>
          <p>It takes about nine seconds to make an account.</p>
          <button className="btn" onClick={() => onAuth("up")}>
            Open the dashboard <ArrowRight size={14} strokeWidth={2.6} />
          </button>
        </section>

        <footer className="foot">
          <div className="dots">
            <span style={{ background: "#e2a184" }} />
            <span style={{ background: "#f2d897" }} />
            <span style={{ background: "#f0bfc4" }} />
            <span style={{ background: "#bcd6c0" }} />
          </div>
          <br />
          Built with React + Vite · data from ThingSpeak channel 3530682
        </footer>
      </div>
    </>
  );
}
