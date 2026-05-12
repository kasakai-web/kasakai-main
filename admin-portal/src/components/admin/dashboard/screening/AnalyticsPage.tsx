"use client";
import React, { useState } from "react";
import { ScrEvent, backBtnStyle } from "./types";
import type { ScrAnalyticsData } from "@/lib/screening-api";

type TrafficSource = { label: string; visits: number; orders: number; color: string };
type DailyTraffic  = { day: string; visits: number };

const MOCK_SOURCES: TrafficSource[] = [
  { label: "Direct",        visits: 9, orders: 0, color: "#5be6b2" },
  { label: "Instagram",     visits: 5, orders: 0, color: "#a78bfa" },
  { label: "WhatsApp",      visits: 3, orders: 0, color: "#34d399" },
  { label: "Google Search", visits: 2, orders: 0, color: "#60a5fa" },
  { label: "Others",        visits: 2, orders: 0, color: "#f59e0b" },
];
const MOCK_DAILY: DailyTraffic[] = [
  { day: "Mon", visits: 3 }, { day: "Tue", visits: 2 }, { day: "Wed", visits: 5 },
  { day: "Thu", visits: 1 }, { day: "Fri", visits: 4 }, { day: "Sat", visits: 4 }, { day: "Sun", visits: 2 },
];
const MOCK_TOTAL_VISITS = MOCK_SOURCES.reduce((s, t) => s + t.visits, 0);

// Stat card
function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px 22px", flex: 1, minWidth: 140, borderLeft: `3px solid ${color}` }}>
      <p style={{ margin: "0 0 8px", fontSize: "10px", fontWeight: 800, color: "var(--muted)", letterSpacing: "0.14em", textTransform: "uppercase" }}>{label}</p>
      <p style={{ margin: "0 0 4px", fontSize: "26px", fontWeight: 800, color: "var(--white)", lineHeight: 1.1 }}>{value}</p>
      {sub && <p style={{ margin: 0, fontSize: "11px", color: "var(--muted)" }}>{sub}</p>}
    </div>
  );
}

// Bar chart
function FunnelChart({ sources }: { sources: TrafficSource[] }) {
  const max = Math.max(...sources.map(t => t.visits), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {sources.map(s => (
        <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "11px", color: "var(--muted)", width: "96px", flexShrink: 0, textAlign: "right" }}>{s.label}</span>
          <div style={{ flex: 1, height: "22px", borderRadius: "5px", background: "var(--surface2)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(s.visits / max) * 100}%`, background: s.color, borderRadius: "5px", opacity: 0.85, transition: "width 0.4s" }} />
          </div>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--white)", width: "24px", flexShrink: 0 }}>{s.visits}</span>
        </div>
      ))}
    </div>
  );
}

// Donut
function DonutChart({ sources, total }: { sources: TrafficSource[]; total: number }) {
  const r = 52; const cx = 64; const cy = 64; const stroke = 20;
  let cum = -Math.PI / 2;
  const slices = sources.map(s => {
    const a = (s.visits / (total || 1)) * 2 * Math.PI;
    const start = cum; cum += a;
    return { ...s, start, end: cum };
  });
  function arc(start: number, end: number) {
    const x1 = cx + r * Math.cos(start); const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);   const y2 = cy + r * Math.sin(end);
    const large = end - start > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  }
  return (
    <div style={{ display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
      <svg width={128} height={128} viewBox="0 0 128 128" style={{ flexShrink: 0 }}>
        {slices.map(s => <path key={s.label} d={arc(s.start, s.end)} fill="none" stroke={s.color} strokeWidth={stroke} opacity={0.85} />)}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={18} fontWeight={800} fill="var(--white)" fontFamily="inherit">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize={9} fill="var(--muted)" fontFamily="inherit">visits</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
        {sources.map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: "12px", color: "var(--muted)", minWidth: "90px" }}>{s.label}</span>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--white)" }}>{((s.visits / (total || 1)) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Line chart
function TrendChart({ data }: { data: DailyTraffic[] }) {
  const max = Math.max(...data.map(p => p.visits), 1);
  const W = 380; const H = 110; const pad = { t: 10, b: 26, l: 8, r: 8 };
  const iW = W - pad.l - pad.r; const iH = H - pad.t - pad.b;
  const pts = data.map((p, i) => ({ ...p, x: pad.l + (i / (data.length - 1)) * iW, y: pad.t + iH - (p.visits / max) * iH }));
  const line = pts.map(p => `${p.x},${p.y}`).join(" ");
  const area = `M ${pts[0].x} ${pts[0].y} ${pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ")} L ${pts[pts.length-1].x} ${H-pad.b} L ${pts[0].x} ${H-pad.b} Z`;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible", maxWidth: "440px" }}>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5be6b2" stopOpacity={0.25} />
          <stop offset="100%" stopColor="#5be6b2" stopOpacity={0} />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map(f => {
        const y = pad.t + iH * (1 - f);
        return <line key={f} x1={pad.l} y1={y} x2={W-pad.r} y2={y} stroke="var(--border)" strokeWidth={1} />;
      })}
      <path d={area} fill="url(#lg)" />
      <polyline points={line} fill="none" stroke="#5be6b2" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map(p => (
        <g key={p.day}>
          <circle cx={p.x} cy={p.y} r={4} fill="#5be6b2" />
          <text x={p.x} y={H - pad.b + 14} textAnchor="middle" fontSize={10} fill="var(--muted)" fontFamily="inherit">{p.day}</text>
        </g>
      ))}
    </svg>
  );
}

type BadgeStyle = { label: string; color: string; bg: string; border: string };

export function ScrAnalyticsPage({ ev, analytics, badge, onBack }: {
  ev: ScrEvent;
  analytics: ScrAnalyticsData;
  badge: BadgeStyle;
  onBack: () => void;
}) {
  const [mainTab, setMainTab] = useState<"tickets" | "traffic">("tickets");
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("weekly");

  const sectionCard = (title: string, children: React.ReactNode, extra?: React.ReactNode) => (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "22px", marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
        <p style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "var(--white)" }}>{title}</p>
        {extra}
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ paddingBottom: 48 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "8px", flexWrap: "wrap" }}>
        <button type="button" onClick={onBack} style={backBtnStyle}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 800, color: "#a78bfa", letterSpacing: "0.15em", textTransform: "uppercase" }}>Event Analytics</p>
          <h2 style={{ margin: "0 0 2px", fontSize: "20px", fontWeight: 800, color: "var(--white)" }}>Analytics Dashboard</h2>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>{ev.title}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, marginTop: "2px" }}>
          <span style={{ padding: "4px 12px", borderRadius: "999px", fontSize: "11px", fontWeight: 700, background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color }}>{badge.label}</span>
          <button type="button" style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "7px 13px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--muted)", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </button>
          <button type="button" style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "7px 13px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--muted)", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
            Refresh
          </button>
        </div>
      </div>

      <div style={{ height: "1px", background: "var(--border)", margin: "16px 0 20px" }} />

      {/* Main tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "24px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "4px" }}>
        {([
          { key: "tickets", label: "Ticket Insights", icon: <><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></>, color: "#5be6b2" },
          { key: "traffic", label: "Traffic Insights", icon: <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>, color: "#a78bfa" },
        ] as const).map(t => (
          <button key={t.key} type="button" onClick={() => setMainTab(t.key)}
            style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "7px", padding: "10px 16px", borderRadius: "7px", border: "none", fontSize: "13px", fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
              background: mainTab === t.key ? "var(--bg)" : "transparent",
              color: mainTab === t.key ? t.color : "var(--muted)",
              boxShadow: mainTab === t.key ? "0 1px 4px rgba(0,0,0,0.3)" : "none" }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">{t.icon}</svg>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TICKET INSIGHTS ── */}
      {mainTab === "tickets" && (
        <div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
            <StatCard label="Tickets Sold"   value={analytics.totalTicketsSold.toString()} sub={`of ${analytics.totalCapacity} capacity`} color="#5be6b2" />
            <StatCard label="Gross Revenue"  value={analytics.totalRevenuePaise > 0 ? `₹${(analytics.totalRevenuePaise/100).toLocaleString("en-IN")}` : "₹0"} sub={analytics.totalTicketsSold > 0 ? "from ticket sales" : "No sales yet"} color="#a78bfa" />
            <StatCard label="Checked In"     value={`${analytics.usedCount} / ${analytics.confirmedCount + analytics.usedCount}`} sub={`${analytics.checkInRate}% check-in rate`} color="#60a5fa" />
          </div>

          {sectionCard("Tier Breakdown",
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", minWidth: "520px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Ticket Type", "Capacity", "Sold", "Available", "Price", "Revenue"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "var(--muted)", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analytics.tierStats.map(t => (
                    <tr key={t.tierId} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "11px 14px", color: "var(--white)", fontWeight: 600 }}>{t.tierName}</td>
                      <td style={{ padding: "11px 14px", color: "var(--text)" }}>{t.capacity}</td>
                      <td style={{ padding: "11px 14px", color: "#5be6b2", fontWeight: 700 }}>{t.sold}</td>
                      <td style={{ padding: "11px 14px", color: "var(--text)" }}>{t.capacity - t.sold}</td>
                      <td style={{ padding: "11px 14px", color: "var(--text)" }}>₹{Math.round(t.pricePaise / 100).toLocaleString("en-IN")}</td>
                      <td style={{ padding: "11px 14px", color: "var(--text)" }}>{t.revenuePaise > 0 ? `₹${(t.revenuePaise/100).toLocaleString("en-IN")}` : "₹0"}</td>
                    </tr>
                  ))}
                  <tr style={{ background: "rgba(91,230,178,0.03)" }}>
                    <td style={{ padding: "11px 14px", color: "#5be6b2", fontWeight: 800 }}>Totals</td>
                    <td style={{ padding: "11px 14px", fontWeight: 700, color: "var(--white)" }}>{analytics.totalCapacity}</td>
                    <td style={{ padding: "11px 14px", fontWeight: 700, color: "#5be6b2" }}>{analytics.totalTicketsSold}</td>
                    <td style={{ padding: "11px 14px", fontWeight: 700, color: "var(--white)" }}>{analytics.totalCapacity - analytics.totalTicketsSold}</td>
                    <td style={{ padding: "11px 14px", color: "var(--muted)" }}>—</td>
                    <td style={{ padding: "11px 14px", fontWeight: 700, color: "var(--white)" }}>{analytics.totalRevenuePaise > 0 ? `₹${(analytics.totalRevenuePaise/100).toLocaleString("en-IN")}` : "₹0"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
            {[
              { label: "Confirmed",     value: analytics.confirmedCount.toString() },
              { label: "Checked In",    value: analytics.usedCount.toString() },
              { label: "Pending",       value: analytics.pendingCount.toString() },
              { label: "Cancelled",     value: analytics.cancelledCount.toString() },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px" }}>
                <p style={{ margin: "0 0 6px", fontSize: "10px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</p>
                <p style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "var(--white)" }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TRAFFIC INSIGHTS ── */}
      {mainTab === "traffic" && (
        <div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
            <StatCard label="Total Visits"    value={MOCK_TOTAL_VISITS.toString()} sub="Across all sources" color="#a78bfa" />
            <StatCard label="Total Orders"    value={analytics.totalTicketsSold.toString()} sub="Ticket bookings" color="#5be6b2" />
            <StatCard label="Gross Revenue"   value={analytics.totalRevenuePaise > 0 ? `₹${(analytics.totalRevenuePaise/100).toLocaleString("en-IN")}` : "₹0"} sub="From ticket sales" color="#60a5fa" />
          </div>

          {sectionCard("Traffic by Source", <FunnelChart sources={MOCK_SOURCES} />)}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "22px" }}>
              <p style={{ margin: "0 0 18px", fontSize: "14px", fontWeight: 800, color: "var(--white)" }}>Distribution</p>
              <DonutChart sources={MOCK_SOURCES} total={MOCK_TOTAL_VISITS} />
            </div>
            {sectionCard("Traffic Trend",
              <TrendChart data={MOCK_DAILY} />,
              <div style={{ display: "flex", gap: "4px" }}>
                {(["daily", "weekly", "monthly"] as const).map(p => (
                  <button key={p} type="button" onClick={() => setPeriod(p)}
                    style={{ padding: "4px 10px", fontSize: "10px", fontWeight: 700, textTransform: "capitalize", borderRadius: "6px", cursor: "pointer", border: "1px solid", transition: "all 0.15s",
                      background: period === p ? "rgba(91,230,178,0.12)" : "transparent",
                      borderColor: period === p ? "rgba(91,230,178,0.4)" : "var(--border)",
                      color: period === p ? "#5be6b2" : "var(--muted)" }}>{p}</button>
                ))}
              </div>
            )}
          </div>

          {sectionCard("Source Breakdown",
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Source", "Visits", "Share", ""].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "var(--muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_SOURCES.map(s => (
                    <tr key={s.label} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                          <span style={{ color: "var(--white)", fontWeight: 600 }}>{s.label}</span>
                        </div>
                      </td>
                      <td style={{ padding: "11px 14px", color: "var(--text)" }}>{s.visits}</td>
                      <td style={{ padding: "11px 14px", color: "var(--muted)" }}>
                        {`${Math.round((s.visits/MOCK_TOTAL_VISITS)*100)}%`}
                      </td>
                      <td />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
