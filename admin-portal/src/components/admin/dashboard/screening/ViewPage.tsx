"use client";
import React, { useState } from "react";
import styles from "../dashboard.module.css";
import { ScrEvent, scrStatusBadge, backBtnStyle } from "./types";

const SCR_THINGS_TO_KNOW = [
  { icon: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>, label: "Event will be in English" },
  { icon: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>, label: "Duration: 2 Hours" },
  { icon: <><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></>, label: "Ticket needed for ages 16+" },
  { icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>, label: "Entry allowed for ages 16+" },
  { icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></>, label: "Layout: Indoor" },
  { icon: <><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></>, label: "Seating: Seated & Standing" },
  { icon: <><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></>, label: "Kids not allowed" },
  { icon: <><path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 1 1.261-.472 1.96-1.45 2.344-2.5"/><path d="M14.267 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.96-1.45-2.344-2.5"/><path d="M8 14v.5"/><path d="M16 14v.5"/><path d="M11.25 16.25h1.5L12 17l-.75-.75z"/><path d="M4.42 11.247A13.152 13.152 0 004 14.556C4 18.682 7.582 22 12 22s8-3.318 8-7.444c0-1.273-.288-2.46-.793-3.444"/><path d="M11.083 5.104c-.35-.2-.744-.309-1.083-.309-1.657 0-3.3 1.88-3.3 4.2 0 .25.02.5.05.75"/><path d="M13.0007 4.791c.35-.2.745-.309 1.084-.309 1.657 0 3.3 1.88 3.3 4.2 0 .25-.02.5-.05.75"/></>, label: "Pets not allowed" },
];

export function ScrViewEventPage({ ev, onBack }: { ev: ScrEvent; onBack: () => void }) {
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [termsExpanded, setTermsExpanded] = useState(false);
  const badge = scrStatusBadge(ev.status);

  const venueParts = ev.venue.split(",");
  const venueName = venueParts[0]?.trim() ?? ev.venue;
  const venueCity = venueParts.slice(1).join(",").trim();
  const dateParts = ev.date.split("|");
  const dateLabel = dateParts[0]?.trim() ?? ev.date;
  const timeLabel = dateParts[1]?.trim() ?? "";

  const aboutText = `When two giants clash, it's never just a match — it's history in the making. Every tackle, every goal, every breathless moment becomes part of the legend.\n\nAnd the best part? You don't watch it alone. Surrounded by fans, the atmosphere inside is electric. Whether you're here for the tactics or the drama, this is where memories are made.\n\nGrab your seat and be part of the story.`;

  return (
    <div style={{ paddingBottom: 48 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "20px", flexWrap: "wrap" }}>
        <button type="button" onClick={onBack} style={backBtnStyle}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 800, color: "#5be6b2", letterSpacing: "0.15em", textTransform: "uppercase" }}>Screening Events</p>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "var(--white)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</h2>
        </div>
        <span style={{ flexShrink: 0, marginTop: "4px", padding: "4px 12px", borderRadius: "999px", fontSize: "11px", fontWeight: 700, background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color }}>{badge.label}</span>
      </div>

      {/* Hero image */}
      <div style={{ position: "relative", borderRadius: "16px", overflow: "hidden", height: "340px", marginBottom: "24px", background: "var(--surface2)" }}>
        <img src={ev.image} alt={ev.title}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(10px)", transform: "scale(1.1)", opacity: 0.5 }} />
        <img src={ev.image} alt={ev.title}
          style={{ position: "relative", display: "block", width: "100%", height: "100%", objectFit: "contain" }} />
      </div>

      {/* Title block */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: "24px", fontWeight: 800, color: "var(--white)", lineHeight: 1.3 }}>{ev.title}</h1>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#5be6b2" }}>{dateLabel}</span>
          {timeLabel && <><span style={{ color: "var(--muted)", fontSize: "13px" }}>|</span><span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>{timeLabel}</span></>}
          <span style={{ color: "var(--muted)", fontSize: "13px" }}>|</span>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>{ev.venue}</span>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className={styles.scrViewLayout}>

        {/* ── LEFT COLUMN ── */}
        <div>
          {/* About */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px", marginBottom: "16px" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "17px", fontWeight: 800, color: "var(--white)" }}>About</h3>
            <div style={{ fontSize: "14px", color: "var(--text)", lineHeight: 1.8, overflow: "hidden", ...(aboutExpanded ? {} : { display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical" as const }) }}>
              {aboutText.split("\n\n").map((para, i) => (
                <p key={i} style={{ margin: i === 0 ? 0 : "14px 0 0" }}>{para}</p>
              ))}
            </div>
            <button type="button" onClick={() => setAboutExpanded(v => !v)}
              style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "12px", background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--white)", fontSize: "13px", fontWeight: 600 }}>
              {aboutExpanded ? "Read less" : "Read more"}
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ transition: "transform 0.2s", transform: aboutExpanded ? "rotate(180deg)" : "rotate(0deg)" }}><path d="M7.5 9.75l4.5 4.5 4.5-4.5"/></svg>
            </button>
          </div>

          {/* Things to know */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px", marginBottom: "16px" }}>
            <h3 style={{ margin: "0 0 18px", fontSize: "17px", fontWeight: 800, color: "var(--white)" }}>Things to know</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0" }}>
              {SCR_THINGS_TO_KNOW.map((item, i) => (
                <div key={i}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 0" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "8px", background: "rgba(91,230,178,0.08)", border: "1px solid rgba(91,230,178,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#5be6b2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{item.icon}</svg>
                    </div>
                    <span style={{ fontSize: "13px", color: "var(--text)", lineHeight: 1.4 }}>{item.label}</span>
                  </div>
                  {i < SCR_THINGS_TO_KNOW.length - 2 && (
                    <div style={{ height: "1px", background: "var(--border)", marginLeft: "42px" }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* More / T&C */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "17px", fontWeight: 800, color: "var(--white)" }}>More</h3>
            <button type="button" onClick={() => setTermsExpanded(v => !v)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "12px 14px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "10px", cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--white)" }}>Terms and Conditions</span>
              </div>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" style={{ transition: "transform 0.2s", transform: termsExpanded ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}><path d="M7.5 9.75l4.5 4.5 4.5-4.5"/></svg>
            </button>
            {termsExpanded && (
              <div style={{ marginTop: "12px", padding: "14px 16px", background: "var(--bg)", borderRadius: "8px", fontSize: "12px", color: "var(--muted)", lineHeight: 1.8 }}>
                <p style={{ margin: "0 0 8px", fontWeight: 700, color: "var(--text)" }}>Event Terms</p>
                <ul style={{ margin: 0, paddingLeft: "16px" }}>
                  <li>All sales are final. No refunds unless the event is cancelled by the organiser.</li>
                  <li>Valid ID required at entry for age verification.</li>
                  <li>Entry is subject to availability and venue capacity.</li>
                  <li>The organiser reserves the right to refuse entry without explanation.</li>
                  <li>Food and beverages may be available for separate purchase at the venue.</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", position: "sticky", top: "24px" }}>
          {/* Venue card */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
            <div style={{ padding: "20px" }}>
              <p style={{ margin: "0 0 14px", fontSize: "12px", fontWeight: 800, color: "#5be6b2", letterSpacing: "0.14em", textTransform: "uppercase" }}>Venue</p>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "14px" }}>
                <div style={{ width: 40, height: 40, borderRadius: "10px", background: "rgba(91,230,178,0.08)", border: "1px solid rgba(91,230,178,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#5be6b2" strokeWidth="1.8" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <div>
                  <p style={{ margin: "0 0 2px", fontSize: "14px", fontWeight: 700, color: "var(--white)" }}>{venueName}</p>
                  {venueCity && <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)" }}>{venueCity}</p>}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ width: 40, height: 40, borderRadius: "10px", background: "rgba(91,230,178,0.08)", border: "1px solid rgba(91,230,178,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#5be6b2" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div>
                  <p style={{ margin: "0 0 2px", fontSize: "14px", fontWeight: 700, color: "var(--white)" }}>Gates open at {timeLabel || "TBD"}</p>
                  <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)" }}>{dateLabel}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Ticket / status card */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px" }}>
            <p style={{ margin: "0 0 14px", fontSize: "12px", fontWeight: 800, color: "#5be6b2", letterSpacing: "0.14em", textTransform: "uppercase" }}>Ticket Status</p>
            {ev.status === "published" ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
                  <span style={{ fontSize: "13px", color: "var(--muted)" }}>Cover Charge</span>
                  <span style={{ fontSize: "16px", fontWeight: 800, color: "var(--white)" }}>{ev.pricePaise ? `₹${Math.round(ev.pricePaise / 100)}` : "₹499"}</span>
                </div>
                <p style={{ margin: "0 0 16px", fontSize: "11px", color: "var(--muted)" }}>per person · inclusive of all taxes</p>
                <button type="button"
                  style={{ width: "100%", padding: "12px", background: "rgba(91,230,178,0.12)", border: "1.5px solid rgba(91,230,178,0.4)", borderRadius: "10px", color: "#5be6b2", fontSize: "14px", fontWeight: 800, cursor: "pointer", letterSpacing: "0.02em" }}>
                  Book Now
                </button>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <span style={{ display: "inline-block", padding: "8px 20px", borderRadius: "999px", fontSize: "13px", fontWeight: 700, background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color }}>{badge.label}</span>
                <p style={{ margin: "12px 0 0", fontSize: "12px", color: "var(--muted)" }}>
                  {ev.status === "cancelled" ? "This event has been cancelled." : "This event is not yet published."}
                </p>
              </div>
            )}
          </div>

          {/* Admin actions card */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "16px" }}>
            <p style={{ margin: "0 0 10px", fontSize: "12px", fontWeight: 800, color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase" }}>Admin Actions</p>
            {[
              { label: "Edit Event Details", icon: <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/> },
              { label: "View Guest List",    icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></> },
              { label: "Export Attendees",   icon: <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></> },
            ].map(({ label, icon }) => (
              <button key={label} type="button"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "9px 0", background: "none", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", color: "var(--muted)", fontSize: "12px", fontWeight: 500, transition: "color 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--white)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">{icon}</svg>
                  {label}
                </div>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
