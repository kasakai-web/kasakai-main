"use client";

import { memo } from "react";
import type { Ticket } from "./types";

interface Props {
  bookings: Ticket[];
  onFindEvents: () => void;
  loading?: boolean;
  error?: string | null;
}

export function ScreeningMyBookings({ bookings, onFindEvents, loading, error }: Props) {
  return (
    <div>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #1a1a1a" }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-14" style={{ paddingTop: "52px", paddingBottom: "32px" }}>
          <p className="text-center sm:text-left" style={{ fontSize: "10px", fontWeight: 900, color: "#c8f135", textTransform: "uppercase", letterSpacing: "0.25em", marginBottom: "10px" }}>
            Your Tickets
          </p>
          <div className="flex flex-col sm:flex-row items-center sm:items-end sm:justify-between gap-4">
            <h1 className="text-center sm:text-left" style={{ fontSize: "clamp(26px,5vw,40px)", fontWeight: 900, color: "#f0f0f0", textTransform: "uppercase", letterSpacing: "-0.01em", lineHeight: 1 }}>
              My Bookings
              <span style={{ fontSize: "14px", fontWeight: 900, color: "#333", marginLeft: "12px", letterSpacing: "0.04em" }}>
                {bookings.length > 0 ? `${bookings.length} active` : ""}
              </span>
            </h1>
            {bookings.length > 0 && (
              <button onClick={onFindEvents} style={{
                display: "flex", alignItems: "center", gap: "7px",
                padding: "8px 16px", border: "1px solid #2a2a2a",
                background: "none", color: "#666", cursor: "pointer",
                fontSize: "10px", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase",
                transition: "color 0.15s, border-color 0.15s", flexShrink: 0,
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#ccc"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#555"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#666"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#2a2a2a"; }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
                Browse Events
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-14" style={{ paddingTop: "32px", paddingBottom: "32px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
            <svg className="animate-spin" width="28" height="28" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="#c8f135" strokeWidth="3" strokeOpacity="0.2" />
              <path d="M12 2a10 10 0 0110 10" stroke="#c8f135" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        ) : error ? (
          <div style={{ padding: "80px 0", textAlign: "center" }}>
            <p style={{ fontSize: "13px", color: "#ef4444", marginBottom: "16px" }}>{error}</p>
            <button onClick={onFindEvents} style={{ fontSize: "11px", fontWeight: 900, color: "#666", background: "none", border: "1px solid #2a2a2a", padding: "8px 20px", cursor: "pointer", letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Back to Events
            </button>
          </div>
        ) : bookings.length === 0 ? (
          <div style={{ padding: "80px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", textAlign: "center" }}>
            <div style={{ width: "72px", height: "72px", border: "1px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round">
                <rect x="2" y="7" width="20" height="10" rx="1" /><circle cx="7.5" cy="12" r="1.5" fill="#333" stroke="none" />
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: "18px", fontWeight: 900, color: "#f0f0f0", marginBottom: "8px" }}>No bookings yet</h3>
              <p style={{ fontSize: "13px", color: "#555", maxWidth: "260px", lineHeight: 1.6 }}>Reserve your spot at a live screening event.</p>
            </div>
            <button onClick={onFindEvents} style={{
              padding: "11px 26px", background: "#c8f135", color: "#000",
              fontSize: "11px", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase",
              border: "none", cursor: "pointer",
            }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#d4f545")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#c8f135")}
            >Find Screenings</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookings.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}
          </div>
        )}
      </div>
    </div>
  );
}

const TicketCard = memo(function TicketCard({ ticket }: { ticket: Ticket }) {
  const { screening } = ticket;
  return (
    <div style={{ background: "#111", border: "1px solid #222", overflow: "hidden" }}>

      {/* ── Top status bar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "9px 16px", background: "#0d0d0d", borderBottom: "1px solid #1a1a1a",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c8f135", display: "inline-block" }} />
          <span style={{ fontSize: "9px", fontWeight: 900, color: "#c8f135", letterSpacing: "0.2em", textTransform: "uppercase" }}>Confirmed</span>
        </div>
        <span style={{ fontSize: "9px", fontWeight: 900, color: "#3a3a3a", letterSpacing: "0.14em", textTransform: "uppercase" }}>{ticket.id}</span>
        <span style={{ fontSize: "9px", fontWeight: 900, color: "#3a3a3a", letterSpacing: "0.1em" }}>{ticket.bookingTime.split(",")[0]}</span>
      </div>

      {/* ── Match info row ── */}
      <div style={{ display: "flex", alignItems: "stretch" }}>
        {/* Image */}
        <div style={{ width: "100px", minHeight: "120px", flexShrink: 0, overflow: "hidden", alignSelf: "stretch", background: "#1a1a1a" }}>
          <img src={screening.image ?? undefined} alt={screening.matchTitle}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", minHeight: "120px" }} />
        </div>

        {/* Details */}
        <div style={{ flex: 1, padding: "14px 18px", display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 }}>
          <h3 style={{ fontSize: "14px", fontWeight: 900, color: "#f0f0f0", lineHeight: 1.25, margin: 0 }}
            className="line-clamp-2">{screening.matchTitle}</h3>

          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
            </svg>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.1em" }}
              className="truncate">{screening.venueName}</span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {[`${screening.day}, ${screening.date}`, screening.time].map((label) => (
              <span key={label} style={{
                fontSize: "9px", fontWeight: 900, color: "#c8f135",
                padding: "3px 8px",
                background: "rgba(200,241,53,0.06)", border: "1px solid rgba(200,241,53,0.15)",
                letterSpacing: "0.1em", textTransform: "uppercase",
              }}>{label}</span>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "2px" }}>
            {ticket.tiers.map(({ tier, quantity }) => (
              <span key={tier.id} style={{
                fontSize: "9px", fontWeight: 700, color: "#555",
                padding: "2px 7px", background: "#161616", border: "1px solid #1e1e1e",
              }}>{quantity}× {tier.name}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Perforated divider ── */}
      <div style={{ position: "relative", margin: "0 16px" }}>
        <div style={{ borderTop: "2px dashed #1e1e1e" }} />
        <div style={{ position: "absolute", left: "-24px", top: "-9px", width: "18px", height: "18px", borderRadius: "50%", background: "#000" }} />
        <div style={{ position: "absolute", right: "-24px", top: "-9px", width: "18px", height: "18px", borderRadius: "50%", background: "#000" }} />
      </div>

      {/* ── Entry code + amount ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 18px",
      }}>
        <div>
          <span style={{ fontSize: "8px", fontWeight: 900, color: "#444", textTransform: "uppercase", letterSpacing: "0.22em", display: "block", marginBottom: "5px" }}>
            Entry Code
          </span>
          <span style={{ fontSize: "20px", fontWeight: 900, color: "#c8f135", letterSpacing: "0.22em", lineHeight: 1 }}>
            {ticket.entryCode}
          </span>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: "8px", fontWeight: 900, color: "#444", textTransform: "uppercase", letterSpacing: "0.22em", display: "block", marginBottom: "5px" }}>
            Total Paid
          </span>
          <span style={{ fontSize: "22px", fontWeight: 900, color: "#f0f0f0", lineHeight: 1 }}>
            ₹{ticket.totalAmount.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
});
