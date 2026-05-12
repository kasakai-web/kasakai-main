"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Screening, TicketTier } from "./types";
import { ScreeningHeader } from "./ScreeningHeader";
import "@/components/screening/screening.css";

const HIGHLIGHTS = [
  { label: "4K Giant Screen",  d: "M2 3h20v14H2zM8 21h8M12 17v4" },
  { label: "Food & Drinks",    d: "M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" },
  { label: "Electric Crowd",   d: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" },
];

const THINGS_TO_KNOW: { text: string; paths: string[]; warn?: boolean }[] = [
  {
    text: "English & Hindi",
    paths: ["M12 2a10 10 0 100 20A10 10 0 0012 2zM2 12h20M12 2c-2.5 4-4 8-4 10s1.5 6 4 10M12 2c2.5 4 4 8 4 10s-1.5 6-4 10"],
  },
  {
    text: "Duration: 4h 29m",
    paths: ["M12 2a10 10 0 100 20A10 10 0 0012 2z", "M12 6v6l4 2"],
  },
  {
    text: "18+ ticket required",
    paths: ["M20 12V22H4V12", "M22 7H2v5h20V7z", "M12 7v15"],
  },
  {
    text: "18+ entry only",
    paths: ["M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2", "M12 11a4 4 0 100-8 4 4 0 000 8"],
  },
  {
    text: "Indoor venue",
    paths: ["M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z", "M9 22V12h6v10"],
  },
  {
    text: "Seated & Standing",
    paths: ["M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"],
  },
  {
    text: "No kids",
    paths: ["M12 2a10 10 0 100 20A10 10 0 0012 2z", "M4.93 4.93l14.14 14.14"],
    warn: true,
  },
  {
    text: "No pets",
    paths: ["M12 2a10 10 0 100 20A10 10 0 0012 2z", "M4.93 4.93l14.14 14.14"],
    warn: true,
  },
];

const TERMS = [
  "Please carry a valid ID proof along with you.",
  "No refunds on purchased tickets are possible, even in case of any rescheduling.",
  "Security procedures, including frisking remain the right of the management.",
  "No dangerous or potentially hazardous objects including but not limited to weapons, knives, guns, fireworks, helmets, laser devices, bottles, musical instruments will be allowed in the venue.",
  "The sponsors/performers/organizers are not responsible for any injury or damage occurring due to the event. Any claims would be settled in courts in Mumbai.",
  "People in an inebriated state may not be allowed entry.",
  "Organizers hold the right to deny late entry to the event.",
  "Venue rules apply.",
];

// ── Stepper ────────────────────────────────────────────────────────────────
const Stepper = memo(function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <button
        className="sd-step-btn"
        style={{ borderRadius: "6px 0 0 6px" }}
        disabled={value === 0}
        onClick={() => onChange(Math.max(0, value - 1))}
      >−</button>
      <div className="sd-step-val" style={{ color: value > 0 ? "#c8f135" : "#333" }}>{value}</div>
      <button
        className="sd-step-btn"
        style={{ borderRadius: "0 6px 6px 0" }}
        disabled={value >= 10}
        onClick={() => onChange(Math.min(10, value + 1))}
      >+</button>
    </div>
  );
});

// ── Tier row ───────────────────────────────────────────────────────────────
const TierRow = memo(function TierRow({ tier, qty, onChange }: { tier: TicketTier; qty: number; onChange: (n: number) => void }) {
  return (
    <div className={`sd-tier${qty > 0 ? " active" : ""}`}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
            <p style={{ fontSize: "13px", fontWeight: 900, color: qty > 0 ? "#e8e8e8" : "#777", margin: 0 }}>
              {tier.name}
            </p>
            {qty > 0 && (
              <span style={{ fontSize: "9px", fontWeight: 900, color: "#c8f135", background: "rgba(200,241,53,.1)", border: "1px solid rgba(200,241,53,.18)", padding: "2px 7px", borderRadius: "999px", letterSpacing: ".1em", textTransform: "uppercase" }}>
                ×{qty}
              </span>
            )}
          </div>
          {tier.description && (
            <p style={{ fontSize: "11px", color: "#555", margin: "0 0 7px", lineHeight: 1.5 }}>{tier.description}</p>
          )}
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
            <span style={{ fontSize: "15px", fontWeight: 900, color: "#c8f135" }}>₹{tier.price.toLocaleString()}</span>
            <span style={{ fontSize: "10px", color: "#555", fontWeight: 600 }}>/ person</span>
          </div>
        </div>
        <Stepper value={qty} onChange={onChange} />
      </div>
    </div>
  );
});

// ── Booking widget ─────────────────────────────────────────────────────────
const BookingWidget = memo(function BookingWidget({
  screening, quantities, onChange, isLoggedIn,
}: {
  screening: Screening;
  quantities: Record<string, number>;
  onChange: (id: string, n: number) => void;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [booked, setBooked] = useState(false);
  const [entryCode] = useState(() => "EVT-" + Math.random().toString(36).toUpperCase().slice(2, 7));

  const totalQty = Object.values(quantities).reduce((a, b) => a + b, 0);
  const totalAmt = screening.tiers.reduce((s, t) => s + (quantities[t.id] ?? 0) * t.price, 0);
  const hasTickets = totalQty > 0;

  const handleBook = () => {
    if (!isLoggedIn) { router.push(`/screening/login?redirect=/screening/${screening.id}`); return; }
    if (!hasTickets) return;
    setBooked(true);
  };

  if (booked) {
    return (
      <div className="sd-confirmed">
        <div className="sd-widget-lime" />
        <div style={{ padding: "28px 22px", textAlign: "center" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(200,241,53,.08)", border: "1.5px solid rgba(200,241,53,.22)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", boxShadow: "0 0 28px rgba(200,241,53,.08)" }}>
            <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="#c8f135" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <p style={{ fontSize: "9px", fontWeight: 900, color: "#c8f135", letterSpacing: ".28em", textTransform: "uppercase", marginBottom: "8px" }}>Booking Confirmed</p>
          <h3 style={{ fontSize: "20px", fontWeight: 900, color: "#e8e8e8", margin: "0 0 6px" }}>You&apos;re all set!</h3>
          <p style={{ fontSize: "12px", color: "#444", lineHeight: 1.65, margin: "0 0 20px" }}>Show this code at the venue entrance.</p>

          <div className="sd-code-box">
            <p style={{ fontSize: "9px", fontWeight: 900, color: "#2a2a2a", letterSpacing: ".22em", textTransform: "uppercase", marginBottom: "8px" }}>Entry Code</p>
            <p className="sd-code-val">{entryCode}</p>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", padding: "11px 14px", background: "#0e0e0e", border: "1px solid #181818", borderRadius: "8px" }}>
            <span style={{ fontSize: "11px", color: "#555", fontWeight: 700 }}>{totalQty} ticket{totalQty > 1 ? "s" : ""}</span>
            <span style={{ fontSize: "16px", fontWeight: 900, color: "#e8e8e8" }}>₹{totalAmt.toLocaleString()}</span>
          </div>

          <Link
            href="/screening"
            className="no-underline"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", height: "44px", background: "transparent", color: "#444", border: "1px solid #1e1e1e", borderRadius: "8px", fontSize: "11px", fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", transition: "border-color .15s,color .15s" }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = "#2a2a2a"; el.style.color = "#777"; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = "#1e1e1e"; el.style.color = "#444"; }}
          >
            Browse More Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="sd-widget">
      <div className="sd-widget-lime" />
      <div className="sd-widget-body">
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "16px" }}>
          <p style={{ fontSize: "10px", fontWeight: 900, color: "#444", letterSpacing: ".2em", textTransform: "uppercase", margin: 0 }}>Select Tickets</p>
          <p style={{ fontSize: "11px", color: "#3a3a3a", margin: 0, fontWeight: 600 }}>
            from <span style={{ color: "#c8f135", fontWeight: 900 }}>₹{screening.startingPrice}</span>
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "18px" }}>
          {screening.tiers.map((t) => (
            <TierRow key={t.id} tier={t} qty={quantities[t.id] ?? 0} onChange={(n) => onChange(t.id, n)} />
          ))}
        </div>

        <div style={{ borderTop: "1px solid #141414", margin: "0 0 14px" }} />

        <div style={{ marginBottom: "16px" }}>
          <p style={{ fontSize: "9px", fontWeight: 900, color: "#444", letterSpacing: ".18em", textTransform: "uppercase", marginBottom: "4px" }}>
            {hasTickets ? `${totalQty} ticket${totalQty > 1 ? "s" : ""}` : "No tickets selected"}
          </p>
          <p style={{ fontSize: "22px", fontWeight: 900, lineHeight: 1, color: hasTickets ? "#e8e8e8" : "#333", margin: 0 }}>
            {hasTickets ? `₹${totalAmt.toLocaleString()}` : "—"}
          </p>
        </div>

        <button onClick={handleBook} className={`sd-cta ${hasTickets || !isLoggedIn ? "lime" : "inactive"}`}>
          {isLoggedIn ? (
            hasTickets
              ? <>Confirm Booking <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>
              : "Select tickets above"
          ) : (
            <><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg> Login to Book</>
          )}
        </button>

        <div className="sd-trust">
          {[
            { d: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z", l: "Verified" },
            { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", l: "Secure" },
            { d: "M13 10V3L4 14h7v7l9-11h-7z", l: "Instant" },
          ].map(({ d, l }) => (
            <div key={l} className="sd-trust-item">
              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="rgba(200,241,53,.45)" strokeWidth="2" strokeLinecap="round"><path d={d}/></svg>
              <span className="sd-trust-label">{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// ── Section header ─────────────────────────────────────────────────────────
const SH = memo(function SH({ children }: { children: React.ReactNode }) {
  return (
    <div className="sd-section-head">
      <div className="sd-section-bar" />
      <h2 className="sd-section-label">{children}</h2>
    </div>
  );
});

// ── Terms & Conditions Modal ───────────────────────────────────────────────
function TCModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="sd-tc-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sd-tc-modal">

        <div className="sd-tc-header">
          <div>
            <p style={{ fontSize: "9px", fontWeight: 900, color: "#444", letterSpacing: ".22em", textTransform: "uppercase", marginBottom: "4px" }}>Event Policy</p>
            <h3 style={{ fontSize: "17px", fontWeight: 900, color: "#e8e8e8", margin: 0 }}>Terms &amp; Conditions</h3>
          </div>
          <button className="sd-tc-close" onClick={onClose}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#666" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="sd-tc-body scr-scroll">
          <ul className="sd-terms-list">
            {TERMS.map((t, i) => (
              <li key={i} className="sd-terms-item">
                <span className="sd-terms-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="sd-terms-text">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="sd-tc-footer">
          <button className="sd-tc-ok" onClick={onClose}>Got It</button>
        </div>

      </div>
    </div>
  );
}

// ── 404 ────────────────────────────────────────────────────────────────────
function NotFound() {
  return (
    <div className="sd-not-found">
      <div style={{ width: 64, height: 64, border: "1px solid #1c1c1c", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#2e2e2e" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
        </svg>
      </div>
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: 900, color: "#e8e8e8", marginBottom: "8px" }}>Event not found</h1>
        <p style={{ color: "#444", fontSize: "13px", lineHeight: 1.6 }}>This screening may have ended or the link is incorrect.</p>
      </div>
      <Link href="/screening" className="no-underline" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 26px", background: "#c8f135", color: "#000", fontSize: "11px", fontWeight: 900, letterSpacing: ".14em", textTransform: "uppercase", borderRadius: "8px" }}>
        ← Browse Screenings
      </Link>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export function ScreeningDetailClient({ screening }: { screening: Screening | null }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [tcModalOpen, setTcModalOpen] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("authToken"));
    const h = () => setIsLoggedIn(!!localStorage.getItem("authToken"));
    window.addEventListener("kk-auth-changed", h);
    return () => window.removeEventListener("kk-auth-changed", h);
  }, []);

  const setQty = useCallback((id: string, n: number) =>
    setQuantities((p) => ({ ...p, [id]: n })), []);

  const totalQty = useMemo(
    () => Object.values(quantities).reduce((a: number, b: number) => a + b, 0),
    [quantities]
  );

  const totalAmt = useMemo(
    () => screening
      ? screening.tiers.reduce((s, t) => s + (quantities[t.id] ?? 0) * t.price, 0)
      : 0,
    [quantities, screening]
  );

  if (!screening) return <NotFound />;

  return (
    <div className="sd-page">

      <ScreeningHeader isLoggedIn={isLoggedIn} />

      {/* ── Hero ── */}
      <div className="sd-hero" style={{ position: "relative" }}>
        {screening.image ? (
          <Image
            src={screening.image}
            alt={screening.matchTitle}
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #0d0d1a 0%, #0a0a0a 100%)" }} />
        )}
        <div className="sd-hero-grad" />
        <div className="sd-hero-grad-l" />

        <div className="sd-hero-top">
          <Link href="/screening" className="sd-back-pill">
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            All Screenings
          </Link>
        </div>

        <div className="sd-hero-bottom">
          <div className="sd-live-badge">
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "sd-blink 2s infinite" }} />
            <span style={{ fontSize: "9px", fontWeight: 900, color: "#f87171", letterSpacing: ".22em", textTransform: "uppercase" }}>Live Event</span>
          </div>
          <h1 className="sd-hero-title">{screening.matchTitle}</h1>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="sd-wrap" style={{ paddingTop: 0 }}>

        {/* Info strip */}
        <div className="sd-strip">
          {[
            {
              icon: <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#c8f135" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
              text: `${screening.day}, ${screening.date}`,
            },
            {
              icon: <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#c8f135" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
              text: screening.time,
            },
            {
              icon: <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
              text: `${screening.venueName}, ${screening.location}`,
            },
            {
              icon: <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#888" strokeWidth="2" strokeLinecap="round"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>,
              text: `from ₹${screening.startingPrice}`,
            },
          ].map(({ icon, text }, i) => (
            <div key={i} className="sd-chip">
              {icon}
              <span className="sd-chip-text">{text}</span>
            </div>
          ))}
        </div>

        {/* Two-column grid */}
        <div className="sd-grid">

          {/* ── Left column ── */}
          <div className="sd-content">

            {/* About */}
            <div className="sd-section">
              <SH>About This Event</SH>
              <p style={{ fontSize: "14px", color: "#888", lineHeight: 1.85, margin: 0 }}>
                {screening.description}
              </p>
            </div>

            {/* Highlights */}
            <div className="sd-section">
              <SH>What to Expect</SH>
              <div className="sd-highlights">
                {HIGHLIGHTS.map(({ label, d }) => (
                  <div key={label} className="sd-hl-card">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#c8f135" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0 }}>
                      <path d={d} />
                    </svg>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile booking widget */}
            <div className="sd-mob-widget">
              <SH>Book Tickets</SH>
              <BookingWidget screening={screening} quantities={quantities} onChange={setQty} isLoggedIn={isLoggedIn} />
            </div>

            {/* Venue */}
            <div className="sd-section">
              <SH>Venue</SH>
              <div className="sd-venue-card">
                <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "10px", background: "rgba(200,241,53,.06)", border: "1px solid rgba(200,241,53,.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#c8f135" strokeWidth="2" strokeLinecap="round">
                      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "15px", fontWeight: 900, color: "#d0d0d0", marginBottom: "4px" }}>{screening.venueName}</p>
                    <p style={{ fontSize: "12px", color: "#666", lineHeight: 1.65, marginBottom: "12px" }}>{screening.location}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      <span style={{ fontSize: "10px", fontWeight: 800, color: "#333", padding: "4px 11px", background: "#0e0e0e", border: "1px solid #1c1c1c", borderRadius: "999px", letterSpacing: ".1em", textTransform: "uppercase" }}>
                        Sports Bar
                      </span>
                      <span style={{ fontSize: "10px", fontWeight: 800, color: "#333", padding: "4px 11px", background: "#0e0e0e", border: "1px solid #1c1c1c", borderRadius: "999px", letterSpacing: ".1em", textTransform: "uppercase" }}>
                        {screening.location.includes(",") ? screening.location.split(",")[1].trim() : screening.location}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Things to Know */}
            <div className="sd-section">
              <SH>Things to Know</SH>
              <div className="sd-know-grid2">
                {THINGS_TO_KNOW.map(({ text, paths, warn }) => (
                  <div key={text} className="sd-know-cell">
                    <div className="sd-know-icon">
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke={warn ? "#5a2020" : "#3a3a3a"} strokeWidth="1.8" strokeLinecap="round">
                        {paths.map((d, i) => <path key={i} d={d} />)}
                      </svg>
                    </div>
                    <span className="sd-know-text" style={warn ? { color: "#4a2020" } : undefined}>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Organized By */}
            <div className="sd-section">
              <SH>Organized By</SH>
              <div className="sd-organizer">
                <div className="sd-org-avatar">
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#2e2e2e" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <p className="sd-org-name">GLOBAL DEVINE FOODS &amp; BEVERAGES LLP</p>
                  <div className="sd-org-stats">
                    <div className="sd-org-stat">
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="#7a2222">
                          <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
                        </svg>
                        <span className="sd-org-stat-val">100%</span>
                      </div>
                      <span className="sd-org-stat-lbl">Liked</span>
                    </div>
                    <div className="sd-org-stat">
                      <span className="sd-org-stat-val">1</span>
                      <span className="sd-org-stat-lbl">Events</span>
                    </div>
                    <div className="sd-org-stat">
                      <span className="sd-org-stat-val">1 mo</span>
                      <span className="sd-org-stat-lbl">Hosting</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms & Conditions — opens popup */}
            <div className="sd-section">
              <SH>Terms &amp; Conditions</SH>
              <button className="sd-tc-btn" onClick={() => setTcModalOpen(true)}>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#888", margin: 0 }}>View event terms &amp; refund policy</p>
                  <p style={{ fontSize: "11px", color: "#555", margin: "3px 0 0", fontWeight: 600 }}>{TERMS.length} conditions apply</p>
                </div>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#444" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            </div>

            {/* Back to screenings */}
            <div style={{ paddingBottom: "8px" }}>
              <Link href="/screening" className="sd-back-btn">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M19 12H5M12 5l-7 7 7 7"/>
                </svg>
                Back to All Screenings
              </Link>
            </div>

          </div>

          {/* ── Right column (sticky, desktop only) ── */}
          <div className="sd-sidebar">
            <BookingWidget screening={screening} quantities={quantities} onChange={setQty} isLoggedIn={isLoggedIn} />
          </div>

        </div>
      </div>

      {/* ── T&C Modal ── */}
      {tcModalOpen && <TCModal onClose={() => setTcModalOpen(false)} />}

      {/* ── Mobile bottom bar ── */}
      <div className="sd-bottom-bar">
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "9px", fontWeight: 900, color: "#2a2a2a", letterSpacing: ".18em", textTransform: "uppercase", marginBottom: "3px" }}>
            {totalQty > 0 ? `${totalQty} ticket${totalQty > 1 ? "s" : ""}` : "Starting from"}
          </p>
          <p style={{ fontSize: "18px", fontWeight: 900, color: "#c8f135", lineHeight: 1, margin: 0 }}>
            {totalQty > 0 ? `₹${totalAmt.toLocaleString()}` : `₹${screening.startingPrice}`}
          </p>
        </div>
        <Link
          href={isLoggedIn ? "#" : `/screening/login?redirect=/screening/${screening.id}`}
          className="no-underline"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "0 24px", height: "46px", background: "#c8f135", color: "#000", fontSize: "11px", fontWeight: 900, letterSpacing: ".14em", textTransform: "uppercase", borderRadius: "8px", boxShadow: "0 0 18px rgba(200,241,53,.18)", transition: "background .15s" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "#d4f545")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "#c8f135")}
        >
          {isLoggedIn ? "Book Now" : "Login to Book"}
        </Link>
      </div>

    </div>
  );
}
