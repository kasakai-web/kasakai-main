"use client";

import type { Ticket } from "./types";

interface Props {
  history: Ticket[];
  onFindEvents: () => void;
  loading?: boolean;
  error?: string | null;
}

export function ScreeningHistory({ history, onFindEvents, loading, error }: Props) {
  return (
    <div>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #1a1a1a" }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-14" style={{ paddingTop: "52px", paddingBottom: "32px" }}>
          <p className="text-center sm:text-left" style={{ fontSize: "10px", fontWeight: 900, color: "#c8f135", textTransform: "uppercase", letterSpacing: "0.25em", marginBottom: "10px" }}>
            Past Screenings
          </p>
          <h1 className="text-center sm:text-left" style={{ fontSize: "clamp(26px,5vw,40px)", fontWeight: 900, color: "#f0f0f0", textTransform: "uppercase", letterSpacing: "-0.01em", lineHeight: 1 }}>
            History
            <span style={{ fontSize: "14px", fontWeight: 900, color: "#333", marginLeft: "12px" }}>
              {history.length > 0 ? `${history.length} attended` : ""}
            </span>
          </h1>
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
        ) : history.length === 0 ? (
          <div style={{ padding: "80px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", textAlign: "center" }}>
            <div style={{ width: "72px", height: "72px", border: "1px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" /><polyline points="12,7 12,12 15.5,14.5" />
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: "18px", fontWeight: 900, color: "#f0f0f0", marginBottom: "8px" }}>No history yet</h3>
              <p style={{ fontSize: "13px", color: "#555", maxWidth: "260px", lineHeight: 1.6 }}>
                Screenings you attend will appear here.
              </p>
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
            {history.map((ticket) => <HistoryCard key={ticket.id} ticket={ticket} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryCard({ ticket }: { ticket: Ticket }) {
  const { screening } = ticket;
  return (
    <div style={{ background: "#0e0e0e", border: "1px solid #1c1c1c", overflow: "hidden", opacity: 0.9 }}>

      {/* ── Top bar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "9px 16px", background: "#0a0a0a", borderBottom: "1px solid #181818",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 12l2 2 4-4M12 2a10 10 0 100 20A10 10 0 0012 2z" />
          </svg>
          <span style={{ fontSize: "9px", fontWeight: 900, color: "#555", letterSpacing: "0.2em", textTransform: "uppercase" }}>Attended</span>
        </div>
        <span style={{ fontSize: "9px", fontWeight: 900, color: "#2e2e2e", letterSpacing: "0.14em", textTransform: "uppercase" }}>{ticket.id}</span>
        <span style={{ fontSize: "9px", fontWeight: 900, color: "#2e2e2e", letterSpacing: "0.1em" }}>{ticket.bookingTime.split(",")[0]}</span>
      </div>

      {/* ── Match info row ── */}
      <div style={{ display: "flex", alignItems: "stretch" }}>
        {/* Image — greyscale */}
        <div style={{ width: "100px", minHeight: "120px", flexShrink: 0, overflow: "hidden", position: "relative", alignSelf: "stretch", background: "#111" }}>
          <img src={screening.image ?? undefined} alt={screening.matchTitle}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", minHeight: "120px", filter: "grayscale(80%) brightness(0.5)" }} />
          {/* Attended stamp */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{
              fontSize: "7.5px", fontWeight: 900, color: "rgba(200,241,53,0.6)",
              border: "1px solid rgba(200,241,53,0.35)",
              padding: "3px 6px", letterSpacing: "0.18em", textTransform: "uppercase",
              transform: "rotate(-20deg)",
              display: "block",
            }}>Attended</span>
          </div>
        </div>

        {/* Details */}
        <div style={{ flex: 1, padding: "14px 18px", display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 }}>
          <h3 style={{ fontSize: "14px", fontWeight: 900, color: "#888", lineHeight: 1.25, margin: 0 }}
            className="line-clamp-2">{screening.matchTitle}</h3>

          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#3a3a3a" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
            </svg>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#3a3a3a", textTransform: "uppercase", letterSpacing: "0.1em" }}
              className="truncate">{screening.venueName}, {screening.location}</span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {[`${screening.day}, ${screening.date}`, screening.time].map((label) => (
              <span key={label} style={{
                fontSize: "9px", fontWeight: 900, color: "#3a3a3a",
                padding: "3px 8px",
                background: "#141414", border: "1px solid #1e1e1e",
                letterSpacing: "0.1em", textTransform: "uppercase",
              }}>{label}</span>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "2px" }}>
            {ticket.tiers.map(({ tier, quantity }) => (
              <span key={tier.id} style={{
                fontSize: "9px", fontWeight: 700, color: "#333",
                padding: "2px 7px", background: "#111", border: "1px solid #1a1a1a",
              }}>{quantity}× {tier.name}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Perforated divider ── */}
      <div style={{ position: "relative", margin: "0 16px" }}>
        <div style={{ borderTop: "2px dashed #181818" }} />
        <div style={{ position: "absolute", left: "-24px", top: "-9px", width: "18px", height: "18px", borderRadius: "50%", background: "#000" }} />
        <div style={{ position: "absolute", right: "-24px", top: "-9px", width: "18px", height: "18px", borderRadius: "50%", background: "#000" }} />
      </div>

      {/* ── Entry code + amount ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 18px",
      }}>
        <div>
          <span style={{ fontSize: "8px", fontWeight: 900, color: "#2e2e2e", textTransform: "uppercase", letterSpacing: "0.22em", display: "block", marginBottom: "5px" }}>
            Entry Code
          </span>
          <span style={{ fontSize: "18px", fontWeight: 900, color: "#333", letterSpacing: "0.22em", lineHeight: 1 }}>
            {ticket.entryCode}
          </span>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: "8px", fontWeight: 900, color: "#2e2e2e", textTransform: "uppercase", letterSpacing: "0.22em", display: "block", marginBottom: "5px" }}>
            Total Paid
          </span>
          <span style={{ fontSize: "20px", fontWeight: 900, color: "#555", lineHeight: 1 }}>
            ₹{ticket.totalAmount.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
