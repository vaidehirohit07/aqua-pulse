import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  RefreshCw,
  Clock,
  Radio,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  TriangleAlert,
} from "lucide-react";

/* ════════════════════════════════════════════════════════════════
   THE LITTLE LIVE DASHBOARD — ThingSpeak channel 3530682
   • Stat cards poll the JSON API every 20s (values, trends, sparklines)
   • Charts use ThingSpeak's dynamic=true embeds (they live-update
     themselves) + optional gentle auto-reload every 60s
   ════════════════════════════════════════════════════════════════ */

const CHANNEL_ID = 3530682;
const POLL_MS = 20000;
const AUTO_MS = 60; // seconds

type FieldKey = "field1" | "field2" | "field3";

interface Metric {
  id: FieldKey;
  chartNo: number;
  label: string;
  chartTitle: string;
  unit: string;
  decimals: number;
  lineColor: string; // hex (no #) used by the ThingSpeak embed
  deep: string;
  tint: string;
  fill: string;
  hint: string;
  icon: ReactNode;
}

/* ── tiny hand-drawn icons ── */
const IconThermo = (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
    <path d="M10 13.4V5a2 2 0 1 1 4 0v8.4a4.2 4.2 0 1 1-4 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="17.6" r="2.1" fill="currentColor" />
    <path d="M12 15.5V8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M16.2 6h1.9M16.2 9h1.9M16.2 12h1.9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity=".6" />
  </svg>
);
const IconDrop = (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
    <path d="M12 3.4c3.4 4 5.8 6.9 5.8 9.8a5.8 5.8 0 1 1-11.6 0c0-2.9 2.4-5.8 5.8-9.8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M9.2 13.7a2.9 2.9 0 0 0 2.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const IconSonar = (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
    <rect x="2.2" y="8" width="19.6" height="9" rx="3.5" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="8" cy="12.5" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="16" cy="12.5" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="8" cy="12.5" r=".9" fill="currentColor" />
    <circle cx="16" cy="12.5" r=".9" fill="currentColor" />
    <path d="M6 17.5v2.3M18 17.5v2.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M5.2 4.8a7.5 7.5 0 0 1 13.6 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity=".55" />
  </svg>
);

const METRICS: Metric[] = [
  {
    id: "field1",
    chartNo: 1,
    label: "Temperature",
    chartTitle: "Air temperature",
    unit: "°C",
    decimals: 1,
    lineColor: "D9886B",
    deep: "#d98a66",
    tint: "#fbeae3",
    fill: "rgba(217,138,102,.13)",
    hint: "Field 1 · DHT readings",
    icon: IconThermo,
  },
  {
    id: "field2",
    chartNo: 2,
    label: "Humidity",
    chartTitle: "Air humidity",
    unit: "%",
    decimals: 1,
    lineColor: "6FA080",
    deep: "#6fa080",
    tint: "#ecf4ee",
    fill: "rgba(111,160,128,.13)",
    hint: "Field 2 · relative RH",
    icon: IconDrop,
  },
  {
    id: "field3",
    chartNo: 3,
    label: "Distance",
    chartTitle: "Ultrasonic distance",
    unit: "cm",
    decimals: 0,
    lineColor: "D98997",
    deep: "#d98997",
    tint: "#faedef",
    fill: "rgba(217,137,151,.13)",
    hint: "Field 3 · HC-SR04 sensor",
    icon: IconSonar,
  },
];

interface MetricData { cur: number | null; prev: number | null; series: number[] }
type DataState = Record<FieldKey, MetricData>;
const EMPTY: DataState = {
  field1: { cur: null, prev: null, series: [] },
  field2: { cur: null, prev: null, series: [] },
  field3: { cur: null, prev: null, series: [] },
};

const num = (v: unknown): number | null => {
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
};

const timeAgo = (d: Date | null): string => {
  if (!d) return "—";
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s ago`;
};

/* ── smooth number tween ── */
function useTween(target: number | null): number | null {
  const [display, setDisplay] = useState<number | null>(null);
  const last = useRef<number | null>(null);
  useEffect(() => {
    if (target === null) return;
    const from = last.current ?? target;
    if (from === target) { setDisplay(target); last.current = target; return; }
    const t0 = performance.now();
    const DUR = 700;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / DUR);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (target - from) * e);
      if (p < 1) raf = requestAnimationFrame(step);
      else last.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return display;
}

/* ── sparkline ── */
function Sparkline({ points, color, fill }: { points: number[]; color: string; fill: string }) {
  if (points.length < 2) return <svg className="sparkline" viewBox="0 0 100 30" preserveAspectRatio="none" />;
  const w = 100, h = 30, pad = 3.5;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const dx = (w - pad * 2) / (points.length - 1);
  const pts = points.map(
    (v, i) => [pad + i * dx, pad + (1 - (v - min) / span) * (h - pad * 2)] as const
  );
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`;
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path d={area} fill={fill} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="2.4" fill={color} stroke="#fff" strokeWidth="1.2" />
    </svg>
  );
}

/* ── sparkle (CSS cross) ── */
const SPARK_COLORS = ["sp-terra", "sp-butter", "sp-blush", "sp-sage"] as const;
function Sparkles({ seed = 0 }: { seed?: number }) {
  const spots = [
    { top: 16, right: 20, anim: "tw1" },
    { top: 34, right: 44, anim: "tw2" },
    { bottom: 70, left: 18, anim: "tw3" },
  ];
  return (
    <>
      {spots.map((s, i) => (
        <span
          key={i}
          className={`sparkle ${SPARK_COLORS[(seed + i) % SPARK_COLORS.length]} ${s.anim}`}
          style={{ top: s.top, right: s.right, bottom: s.bottom, left: s.left }}
        />
      ))}
    </>
  );
}

/* ── hero scene illustration: a little sensor station ── */
function Scene() {
  return (
    <svg viewBox="0 0 340 208" fill="none" role="img" aria-label="Little sensor station illustration">
      <ellipse cx="172" cy="118" rx="156" ry="96" fill="#fbe9df" opacity=".55" />
      {/* sun */}
      <circle cx="272" cy="38" r="17" fill="#f2d897" stroke="#eccb75" strokeWidth="2" className="scene-blink" />
      <path d="M272 12v-7M272 64v7M298 38h7M239 38h7" stroke="#eccb75" strokeWidth="2.4" strokeLinecap="round" />
      {/* cloud */}
      <g className="scene-bob" style={{ animationDuration: "7s" }}>
        <circle cx="66" cy="44" r="13" fill="#fff" stroke="#f0dccf" strokeWidth="2" />
        <circle cx="82" cy="38" r="16" fill="#fff" stroke="#f0dccf" strokeWidth="2" />
        <circle cx="98" cy="44" r="12" fill="#fff" stroke="#f0dccf" strokeWidth="2" />
        <rect x="58" y="42" width="48" height="14" rx="7" fill="#fff" />
      </g>
      {/* ground shadow */}
      <ellipse cx="168" cy="188" rx="88" ry="10" fill="#f4e3d8" />
      {/* device */}
      <g className="scene-bob">
        <rect x="96" y="92" width="144" height="88" rx="22" fill="#fff" stroke="#f0dccf" strokeWidth="2.5" />
        <rect x="111" y="107" width="74" height="46" rx="10" fill="#fdf6ef" stroke="#f3e2d4" strokeWidth="2" />
        <polyline points="115,144 126,129 136,135 149,116 159,124 173,112" stroke="#d9886b" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="206" cy="116" r="6.5" fill="#bcd6c0" stroke="#7fae8a" strokeWidth="1.6" />
        <circle cx="206" cy="138" r="6.5" fill="#f0bfc4" stroke="#e39aa4" strokeWidth="1.6" />
        <path d="M222 112h6M222 138h6" stroke="#e8d8cb" strokeWidth="2.4" strokeLinecap="round" />
        <rect x="122" y="172" width="12" height="9" rx="3.5" fill="#e2a184" />
        <rect x="202" y="172" width="12" height="9" rx="3.5" fill="#e2a184" />
        <line x1="168" y1="92" x2="168" y2="56" stroke="#d9886b" strokeWidth="3" strokeLinecap="round" />
        <circle cx="168" cy="50" r="6" fill="#e2a184" />
        <path d="M157 43a15 15 0 0 1 22 0" stroke="#e39aa4" strokeWidth="2.4" strokeLinecap="round" className="scene-ping1" />
        <path d="M149 35a26 26 0 0 1 38 0" stroke="#dda08f" strokeWidth="2.2" strokeLinecap="round" className="scene-ping2" />
        {/* cheeks */}
        <circle cx="124" cy="166" r="4" fill="#f7dbe0" />
        <circle cx="212" cy="166" r="4" fill="#f7dbe0" />
      </g>
      {/* plant */}
      <g className="scene-bob" style={{ animationDuration: "6s", animationDelay: "0.6s" }}>
        <ellipse cx="262" cy="138" rx="5" ry="15" fill="#bcd6c0" transform="rotate(-16 262 138)" />
        <ellipse cx="274" cy="140" rx="4.5" ry="12" fill="#7fae8a" opacity=".85" transform="rotate(16 274 140)" />
        <path d="M268 152v-16" stroke="#7fae8a" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M256 154h24l-3 22a6 6 0 0 1-6 5h-6a6 6 0 0 1-6-5l-3-22z" fill="#e2a184" stroke="#d9886b" strokeWidth="1.6" />
      </g>
      {/* svg sparkles */}
      <path d="M54 114v11M48.5 119.5h11" stroke="#eccb75" strokeWidth="2.6" strokeLinecap="round" className="tw1" />
      <path d="M298 108v10M293 113h10" stroke="#e39aa4" strokeWidth="2.6" strokeLinecap="round" className="tw2" />
      <path d="M46 168v9M41.5 172.5h9" stroke="#7fae8a" strokeWidth="2.4" strokeLinecap="round" className="tw3" />
    </svg>
  );
}

/* ── brand mark ── */
function BrandMark() {
  return (
    <div className="brand-mark">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3.2" fill="#d9886b" />
        <path d="M8.4 8.4a5.1 5.1 0 0 0 0 7.2M15.6 8.4a5.1 5.1 0 0 1 0 7.2" stroke="#e39aa4" strokeWidth="2" strokeLinecap="round" />
        <path d="M5.8 5.8a8.8 8.8 0 0 0 0 12.4M18.2 5.8a8.8 8.8 0 0 1 0 12.4" stroke="#7fae8a" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/* ═══════════════ stat card ═══════════════ */
function StatCard({ metric, data, loaded, delay }: { metric: Metric; data: MetricData; loaded: boolean; delay: number }) {
  const shown = useTween(data.cur);
  const delta = data.cur !== null && data.prev !== null ? data.cur - data.prev : null;
  const trendCls = delta === null || Math.abs(delta) < 0.05 ? "trend-flat" : delta > 0 ? "trend-up" : "trend-down";
  const TrendIcon = delta === null || Math.abs(delta) < 0.05 ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  return (
    <article className="card stat-card rise" style={{ animationDelay: `${delay}ms` }}>
      <Sparkles seed={metric.chartNo} />
      <div className="stat-top">
        <div className="stat-icon" style={{ background: metric.tint, color: metric.deep, animationDelay: `${delay / 600}s` }}>
          {metric.icon}
        </div>
        {delta !== null && (
          <span className={`trend ${trendCls}`}>
            <TrendIcon size={13} strokeWidth={2.6} />
            {Math.abs(delta).toFixed(1)}
          </span>
        )}
      </div>
      <h3 className="stat-label">{metric.label}</h3>
      <div className="stat-value-row">
        {loaded && shown !== null ? (
          <>
            <span className="stat-value">{shown.toFixed(metric.decimals)}</span>
            <span className="stat-unit">{metric.unit}</span>
          </>
        ) : (
          <span className="skeleton" style={{ opacity: loaded ? 0.4 : 1 }} />
        )}
      </div>
      <Sparkline points={data.series} color={metric.deep} fill={metric.fill} />
      <div className="stat-foot">
        <span className="stat-hint">{metric.hint}</span>
        <span className="stat-hint">last 20</span>
      </div>
    </article>
  );
}

/* ═══════════════ chart card ═══════════════ */
function ChartCard({ metric, bust, onRefresh, delay }: { metric: Metric; bust: number; onRefresh: () => void; delay: number }) {
  const src =
    `https://thingspeak.com/channels/${CHANNEL_ID}/charts/${metric.chartNo}` +
    `?bgcolor=%23ffffff&color=%23${metric.lineColor}&dynamic=true&results=8&type=line&b=${bust}`;
  return (
    <article className="card chart-card rise" style={{ animationDelay: `${delay}ms` }}>
      <Sparkles seed={metric.chartNo + 2} />
      <div className="chart-top">
        <div className="chart-icon" style={{ background: metric.tint, color: metric.deep }}>{metric.icon}</div>
        <div className="chart-title">
          <b>{metric.chartTitle}</b>
          <span>ThingSpeak chart {metric.chartNo} · 8 readings</span>
        </div>
        <div className="chart-actions">
          <span className="mini-live"><span className="live-dot" />Live</span>
          <button className="icon-btn" title="Reload this chart" aria-label={`Reload ${metric.label} chart`} onClick={onRefresh}>
            <RefreshCw size={15} strokeWidth={2.4} />
          </button>
        </div>
      </div>
      <div className="chart-wrap">
        <iframe key={`${metric.chartNo}-${bust}`} src={src} title={`${metric.label} chart`} loading="lazy" />
      </div>
      <div className="chart-note">
        <em>auto-updates as new data lands (dynamic embed)</em>
        <a className="chart-link" href={`https://thingspeak.com/channels/${CHANNEL_ID}/charts/${metric.chartNo}`} target="_blank" rel="noreferrer">
          open on ThingSpeak <ExternalLink size={11} strokeWidth={2.4} />
        </a>
      </div>
    </article>
  );
}

/* ═══════════════ app ═══════════════ */
export default function App() {
  const [data, setData] = useState<DataState>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [apiErr, setApiErr] = useState(false);
  const [lastPoll, setLastPoll] = useState<Date | null>(null);
  const [feedAt, setFeedAt] = useState<Date | null>(null);
  const [, setTick] = useState(0);

  const [chartBust, setChartBust] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0 });
  const [auto, setAuto] = useState(false);
  const [autoCount, setAutoCount] = useState(AUTO_MS);

  /* poll the JSON API for live numbers */
  const poll = useCallback(async () => {
    try {
      const res = await fetch(
        `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?results=20&_=${Date.now()}`
      );
      if (!res.ok) throw new Error("bad response");
      const json = await res.json();
      const feeds: Record<string, unknown>[] = Array.isArray(json.feeds) ? json.feeds : [];
      const next = { ...EMPTY };
      (Object.keys(EMPTY) as FieldKey[]).forEach((f) => {
        const series = feeds.map((fd) => num(fd[f])).filter((v): v is number => v !== null);
        next[f] = {
          series: series.slice(-20),
          cur: series.length ? series[series.length - 1] : null,
          prev: series.length > 1 ? series[series.length - 2] : null,
        };
      });
      setData(next);
      setLoaded(true);
      setApiErr(false);
      setLastPoll(new Date());
      const created = feeds.length ? String(feeds[feeds.length - 1].created_at ?? "") : "";
      if (created) setFeedAt(new Date(created));
    } catch {
      setApiErr(true);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [poll]);

  /* 1s ticker for "x s ago" */
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  /* optional gentle chart auto-reload */
  const refreshAll = useCallback(
    () => setChartBust((b) => ({ 1: b[1] + 1, 2: b[2] + 1, 3: b[3] + 1 })),
    []
  );
  useEffect(() => {
    if (!auto) return;
    setAutoCount(AUTO_MS);
    const id = setInterval(() => {
      setAutoCount((c) => {
        if (c <= 1) {
          refreshAll();
          return AUTO_MS;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [auto, refreshAll]);

  const spinRef = useRef(0);

  return (
    <>
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />
      <div className="blob blob-4" />

      <div className="page">
        {/* ── topbar ── */}
        <header className="topbar rise">
          <div className="brand">
            <BrandMark />
            <div className="brand-text">
              <b>The Little Sensor Station</b>
              <span>grown-up telemetry, softly drawn</span>
            </div>
          </div>
          <div className="top-actions">
            <span className="live-pill">
              <span className="live-dot" />
              Live · polls every {POLL_MS / 1000}s
            </span>
            <label className="switch-row" title="Reloads the three charts on a timer. They already self-update via dynamic embeds.">
              <button
                className={`switch ${auto ? "on" : ""}`}
                role="switch"
                aria-checked={auto}
                aria-label="Toggle chart auto reload"
                onClick={() => setAuto((a) => !a)}
              />
              {auto ? `chart reload in ${autoCount}s` : "auto chart reload"}
            </label>
            <button
              className="btn"
              onClick={() => {
                spinRef.current += 1;
                refreshAll();
                poll();
              }}
            >
              <RefreshCw size={14} strokeWidth={2.6} key={spinRef.current} />
              Refresh all
            </button>
          </div>
        </header>

        {/* ── hero ── */}
        <section className="hero">
          <div className="rise" style={{ animationDelay: "60ms" }}>
            <div className="eyebrow">ThingSpeak · Channel {CHANNEL_ID}</div>
            <h1>
              A soft little place for your <span className="accent">live sensors</span>.
            </h1>
            <p className="lede">
              Temperature, humidity and distance — read every few moments, drawn gently,
              and refreshed without lifting a finger. The charts update themselves; the
              numbers below follow along politely.
            </p>
            <div className="hero-meta">
              <span className="meta-chip">
                <Clock size={13} strokeWidth={2.4} />
                stats updated {timeAgo(lastPoll)}
              </span>
              <span className="meta-chip">
                <Radio size={13} strokeWidth={2.4} />
                last feed {feedAt ? feedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}
              </span>
              {apiErr && (
                <span className="meta-chip error">
                  <TriangleAlert size={13} strokeWidth={2.4} />
                  API paused — charts still live
                </span>
              )}
            </div>
          </div>
          <div className="hero-scene rise" style={{ animationDelay: "140ms" }}>
            <Scene />
          </div>
        </section>

        {/* ── stats ── */}
        <h2 className="section-label rise" style={{ animationDelay: "160ms" }}>Right this moment</h2>
        <section className="stats-grid">
          {METRICS.map((m, i) => (
            <StatCard key={m.id} metric={m} data={data[m.id]} loaded={loaded} delay={200 + i * 110} />
          ))}
        </section>

        {/* ── charts ── */}
        <div className="charts-head rise" style={{ animationDelay: "400ms" }}>
          <div>
            <h2>The three little charts</h2>
            <p>from your own ThingSpeak snippets, dressed in the palette</p>
          </div>
        </div>
        <section className="charts-grid">
          {METRICS.map((m, i) => (
            <ChartCard
              key={m.id}
              metric={m}
              bust={chartBust[m.chartNo]}
              delay={460 + i * 110}
              onRefresh={() => setChartBust((b) => ({ ...b, [m.chartNo]: b[m.chartNo] + 1 }))}
            />
          ))}
        </section>

        {/* ── footer ── */}
        <footer className="foot rise" style={{ animationDelay: "800ms" }}>
          <div className="dots">
            <span style={{ background: "#e2a184" }} />
            <span style={{ background: "#f2d897" }} />
            <span style={{ background: "#f0bfc4" }} />
            <span style={{ background: "#bcd6c0" }} />
          </div>
          <br />
          Data by <a href={`https://thingspeak.com/channels/${CHANNEL_ID}`} target="_blank" rel="noreferrer">ThingSpeak channel {CHANNEL_ID}</a>
          {" · "}stat cards poll every {POLL_MS / 1000}s
          {" · "}charts self-update via dynamic embeds
        </footer>
      </div>
    </>
  );
}
