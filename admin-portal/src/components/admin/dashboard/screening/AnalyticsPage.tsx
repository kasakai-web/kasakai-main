"use client";
import React, { useState, useCallback } from "react";
import { ScrEvent, backBtnStyle } from "./types";
import type { ScrAnalyticsData, ScrExportRow } from "@/lib/screening-api";
import { scrApi } from "@/lib/screening-api";

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px 22px", flex: 1, minWidth: 140, borderLeft: `3px solid ${color}` }}>
      <p style={{ margin: "0 0 8px", fontSize: "10px", fontWeight: 800, color: "var(--muted)", letterSpacing: "0.14em", textTransform: "uppercase" }}>{label}</p>
      <p style={{ margin: "0 0 4px", fontSize: "26px", fontWeight: 800, color: "var(--white)", lineHeight: 1.1 }}>{value}</p>
      {sub && <p style={{ margin: 0, fontSize: "11px", color: "var(--muted)" }}>{sub}</p>}
    </div>
  );
}

type BadgeStyle = { label: string; color: string; bg: string; border: string };

function generateCsvAndDownload(rows: ScrExportRow[], eventTitle: string) {
  const headers = [
    "Transaction Type","Brand Name","Registered Company Name","Event Name",
    "Event Show","Event Show Start Time","Event Show End Time","Event Show ID",
    "Event Category","Event City","Event Venue Name","Billing Email",
    "User State","Name","Email","Phone","Transaction ID","Shortcode",
    "Transaction Time","Transaction Last Modified Time","Ticket Group",
    "Ticket Name","Ticket List Price","Number of Tickets","Seat Number",
    "Redeemed Status","Printed Status","Gross Amount","Discount","Net Amount",
    "Discount Type","Discount Coupon","Discount Funded By","Offline Payment",
    "CGST %","CGST Amount","SGST %","SGST Amount","IGST %","IGST Amount",
    "Additional Tax 1 Name","Additional Tax 1 Amount","Additional Tax 1 %",
    "Additional Tax 2 Name","Additional Tax 2 Amount","Additional Tax 2 %",
    "Base Price","Commission %","Commission Amount","Transaction Source","Device Platform",
  ];

  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return (s.includes(",") || s.includes('"') || s.includes("\n")) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [
    headers.map(esc).join(","),
    ...rows.map(r => [
      r.transactionType, r.brandName, r.registeredCompanyName, r.eventName,
      r.eventShow, r.showStartTime, r.showEndTime, r.showId,
      r.eventCategory, r.eventCity, r.venueName, r.billingEmail,
      r.userState, r.name, r.email, r.phone, r.transactionId, r.shortcode,
      r.transactionTime, r.transactionLastModifiedTime, r.ticketGroup,
      r.ticketName, r.ticketListPrice, r.numberOfTickets, r.seatNumber,
      r.redeemedStatus, r.printedStatus, r.grossAmount, r.discount, r.netAmount,
      r.discountType, r.discountCoupon, r.discountFundedBy, r.offlinePayment,
      r.cgstPct, r.cgstAmount, r.sgstPct, r.sgstAmount, r.igstPct, r.igstAmount,
      r.tax1Name, r.tax1Amount, r.tax1Pct,
      r.tax2Name, r.tax2Amount, r.tax2Pct,
      r.basePrice, r.commissionPct, r.commissionAmount,
      r.transactionSource, r.devicePlatform,
    ].map(esc).join(",")),
  ];

  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${eventTitle.replace(/[^\w\s-]/g, "").trim()}_tickets_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ScrAnalyticsPage({ ev, eventId, analytics, badge, onBack, onRefresh }: {
  ev: ScrEvent;
  eventId: string;
  analytics: ScrAnalyticsData;
  badge: BadgeStyle;
  onBack: () => void;
  onRefresh?: () => void;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [exporting,  setExporting]  = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  }, [onRefresh, refreshing]);

  const handleExport = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const data = await scrApi.exportTickets(eventId);
      if (!data.rows.length) { alert("No ticket data to export."); return; }
      generateCsvAndDownload(data.rows, data.eventTitle);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }, [eventId, exporting]);

  const sectionCard = (title: string, children: React.ReactNode) => (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "22px", marginBottom: "16px" }}>
      <p style={{ margin: "0 0 18px", fontSize: "14px", fontWeight: 800, color: "var(--white)" }}>{title}</p>
      {children}
    </div>
  );

  const hasSales = analytics.totalTicketsSold > 0;
  const soldTiers = analytics.tierStats.filter(t => t.sold > 0);
  const maxSold   = Math.max(...soldTiers.map(t => t.sold), 1);
  const statusItems = [
    { label: "Confirmed",  value: analytics.confirmedCount,  color: "#60a5fa" },
    { label: "Checked In", value: analytics.usedCount,       color: "#5be6b2" },
    { label: "Pending",    value: analytics.pendingCount,    color: "#fbbf24" },
    { label: "Cancelled",  value: analytics.cancelledCount,  color: "#f87171" },
  ];
  const hasActivity = statusItems.some(s => s.value > 0);
  const maxStatus   = Math.max(...statusItems.map(s => s.value), 1);

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
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, marginTop: "2px", flexWrap: "wrap" }}>
          <span style={{ padding: "4px 12px", borderRadius: "999px", fontSize: "11px", fontWeight: 700, background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color }}>{badge.label}</span>
          {onRefresh && (
            <button type="button" onClick={handleRefresh} disabled={refreshing}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "7px 13px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--muted)", fontSize: "11px", fontWeight: 600, cursor: refreshing ? "not-allowed" : "pointer", opacity: refreshing ? 0.6 : 1 }}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={refreshing ? "animate-spin" : ""}>
                <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          )}
          <button type="button" onClick={handleExport} disabled={exporting}
            style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "7px 14px", background: "rgba(91,230,178,0.1)", border: "1px solid rgba(91,230,178,0.3)", borderRadius: "8px", color: "#5be6b2", fontSize: "11px", fontWeight: 700, cursor: exporting ? "not-allowed" : "pointer", opacity: exporting ? 0.7 : 1 }}>
            {exporting ? (
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.2"/><path d="M12 2a10 10 0 0110 10"/>
              </svg>
            ) : (
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            )}
            {exporting ? "Exporting…" : "Export"}
          </button>
        </div>
      </div>

      <div style={{ height: "1px", background: "var(--border)", margin: "16px 0 20px" }} />

      {/* ── STAT CARDS ── */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
        <StatCard label="Tickets Sold"  value={analytics.totalTicketsSold.toString()} sub={`of ${analytics.totalCapacity} capacity`} color="#5be6b2" />
        <StatCard label="Gross Revenue" value={analytics.totalRevenuePaise > 0 ? `₹${(analytics.totalRevenuePaise / 100).toLocaleString("en-IN")}` : "₹0"} sub={analytics.totalTicketsSold > 0 ? "from ticket sales" : "No sales yet"} color="#a78bfa" />
        <StatCard label="Checked In"    value={`${analytics.usedCount} / ${analytics.confirmedCount + analytics.usedCount}`} sub={`${analytics.checkInRate}% check-in rate`} color="#60a5fa" />
      </div>

      {/* ── NO SALES PLACEHOLDER ── */}
      {!hasSales && (
        <div style={{ background: "var(--surface)", border: "1px dashed var(--border)", borderRadius: "14px", padding: "40px 24px", textAlign: "center", marginBottom: "16px" }}>
          <div style={{ width: 48, height: 48, borderRadius: "12px", background: "rgba(91,230,178,0.08)", border: "1px solid rgba(91,230,178,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#5be6b2" strokeWidth="1.8" strokeLinecap="round"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
          </div>
          <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 800, color: "var(--white)" }}>No Tickets Sold Yet</p>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)" }}>Sales data will appear here once users start booking.</p>
        </div>
      )}

      {/* ── TIER SALES HISTOGRAM (only when there are sales) ── */}
      {hasSales && soldTiers.length > 0 && sectionCard("Tier Sales",
        <div>
          {soldTiers.map(t => {
            const soldPct  = t.capacity > 0 ? Math.min(100, Math.round((t.sold / t.capacity) * 100)) : 0;
            const barPct   = Math.round((t.sold / maxSold) * 100);
            const barColor = soldPct >= 90 ? "#f87171" : soldPct >= 60 ? "#fbbf24" : "#5be6b2";
            return (
              <div key={t.tierId} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--white)" }}>{t.tierName}</span>
                    <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600 }}>₹{Math.round(t.pricePaise / 100).toLocaleString("en-IN")}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>{t.sold} / {t.capacity} sold</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: barColor }}>{soldPct}%</span>
                  </div>
                </div>
                <div style={{ height: 10, background: "rgba(255,255,255,0.04)", borderRadius: 5, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${barPct}%`, background: barColor, borderRadius: 5 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── BOOKING STATUS HISTOGRAM (only when there is activity) ── */}
      {hasActivity && sectionCard("Booking Status",
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 40px" }}>
          {statusItems.filter(s => s.value > 0).map(s => {
            const pct = Math.round((s.value / maxStatus) * 100);
            return (
              <div key={s.label}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.label}</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: "var(--white)", lineHeight: 1 }}>{s.value}</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: s.color, borderRadius: 3 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TIER BREAKDOWN TABLE (always shown — capacity info is useful even with 0 sales) ── */}
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
                  <td style={{ padding: "11px 14px", color: t.sold > 0 ? "#5be6b2" : "var(--muted)", fontWeight: t.sold > 0 ? 700 : 400 }}>{t.sold > 0 ? t.sold : "—"}</td>
                  <td style={{ padding: "11px 14px", color: "var(--text)" }}>{t.capacity - t.sold}</td>
                  <td style={{ padding: "11px 14px", color: "var(--text)" }}>₹{Math.round(t.pricePaise / 100).toLocaleString("en-IN")}</td>
                  <td style={{ padding: "11px 14px", color: "var(--text)" }}>{t.revenuePaise > 0 ? `₹${(t.revenuePaise / 100).toLocaleString("en-IN")}` : "—"}</td>
                </tr>
              ))}
              <tr style={{ background: "rgba(91,230,178,0.03)" }}>
                <td style={{ padding: "11px 14px", color: "#5be6b2", fontWeight: 800 }}>Totals</td>
                <td style={{ padding: "11px 14px", fontWeight: 700, color: "var(--white)" }}>{analytics.totalCapacity}</td>
                <td style={{ padding: "11px 14px", fontWeight: 700, color: hasSales ? "#5be6b2" : "var(--muted)" }}>{hasSales ? analytics.totalTicketsSold : "—"}</td>
                <td style={{ padding: "11px 14px", fontWeight: 700, color: "var(--white)" }}>{analytics.totalCapacity - analytics.totalTicketsSold}</td>
                <td style={{ padding: "11px 14px", color: "var(--muted)" }}>—</td>
                <td style={{ padding: "11px 14px", fontWeight: 700, color: "var(--white)" }}>{analytics.totalRevenuePaise > 0 ? `₹${(analytics.totalRevenuePaise / 100).toLocaleString("en-IN")}` : "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── TRAFFIC — COMING SOON ── */}
      <div style={{ background: "var(--surface)", border: "1px dashed var(--border2)", borderRadius: "14px", padding: "40px 24px", textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: "14px", background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <p style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: 800, color: "var(--white)" }}>Traffic Analytics</p>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)", lineHeight: 1.6, maxWidth: "340px", marginLeft: "auto", marginRight: "auto" }}>
          Page view tracking and traffic source attribution are coming soon. Only ticket sales data is available right now.
        </p>
      </div>
    </div>
  );
}
