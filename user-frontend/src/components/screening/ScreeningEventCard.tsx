"use client";

import { memo, useState } from "react";
import Link from "next/link";
import type { Screening } from "./types";

function TvFallback() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
      style={{ background: "linear-gradient(160deg, #0d0d1a 0%, #090910 100%)" }}>
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="1" width="22" height="15" rx="2" stroke="#1e2240" strokeWidth="1.5" fill="#0c0c1a"/>
        <path d="M12 16v3" stroke="#1e2240" strokeWidth="1.5"/>
        <path d="M8 21h8" stroke="#1e2240" strokeWidth="1.5"/>
        <line x1="3" y1="7" x2="21" y2="7" stroke="#12122a" strokeWidth="0.75"/>
        <line x1="3" y1="11" x2="21" y2="11" stroke="#12122a" strokeWidth="0.75"/>
        <circle cx="12" cy="8.5" r="4" stroke="#1e2240" strokeWidth="1" fill="#10102a"/>
        <polygon points="10.5,6.5 10.5,10.5 14.5,8.5" fill="#1e2240"/>
      </svg>
      <span style={{ fontSize: "8px", fontWeight: 800, color: "#1e2240", letterSpacing: "0.18em", textTransform: "uppercase" }}>No Preview</span>
    </div>
  );
}

interface Props {
  screening: Screening;
  onBook: (screening: Screening) => void;
  isBooked?: boolean;
}

export const ScreeningEventCard = memo(function ScreeningEventCard({ screening, isBooked }: Props) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <div
      className="group flex flex-col overflow-hidden"
      style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "16px", transition: "border-color 0.2s ease, transform 0.22s cubic-bezier(0.22,1,0.36,1), box-shadow 0.22s ease" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#333"; e.currentTarget.style.transform = "translateY(-5px)"; e.currentTarget.style.boxShadow = "0 16px 48px rgba(0,0,0,0.55)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1e1e1e"; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
    >
      {/* Image */}
      <Link href={`/screening/${screening.id}`} className="no-underline" tabIndex={-1}>
        <div className="relative overflow-hidden flex-shrink-0" style={{ height: "215px", background: "#0e0e0e" }}>
          {!imgErr && screening.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={screening.image}
              alt={screening.matchTitle}
              loading="lazy"
              onError={() => setImgErr(true)}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
            />
          ) : (
            <TvFallback />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #111 0%, rgba(17,17,17,0.5) 40%, rgba(17,17,17,0.08) 75%, transparent 100%)" }} />

          {/* Badge: Cancelled / Live */}
          <div className="absolute top-3 left-3">
            {screening.status === 'cancelled' ? (
              <div className="flex items-center gap-1.5"
                style={{ padding: "5px 10px", background: "rgba(239,68,68,0.15)", backdropFilter: "blur(8px)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: "999px" }}>
                <svg width="8" height="8" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth="3" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
                <span style={{ fontSize: "9px", fontWeight: 900, color: "#ef4444", letterSpacing: "0.18em", textTransform: "uppercase" }}>Cancelled</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5"
                style={{ padding: "5px 10px", background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "999px" }}>
                <span className="w-[6px] h-[6px] rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                <span style={{ fontSize: "9px", fontWeight: 900, color: "#fff", letterSpacing: "0.18em", textTransform: "uppercase" }}>Live Now</span>
              </div>
            )}
          </div>

          {/* Price chip — hidden for cancelled events */}
          {screening.status !== 'cancelled' && (
            <div className="absolute bottom-3 right-3">
              <div style={{ padding: "4px 10px", background: screening.startingPrice === 0 ? "#c8f135" : "#c8f135", borderRadius: "4px" }}>
                <span style={{ fontSize: "11px", fontWeight: 900, color: "#000", letterSpacing: "0.04em" }}>
                  {screening.startingPrice === 0 ? "Free" : `from ₹${screening.startingPrice}`}
                </span>
              </div>
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="flex flex-col flex-1" style={{ padding: "20px 20px 18px" }}>
        <Link href={`/screening/${screening.id}`} className="no-underline">
          <h3
            className="line-clamp-2 leading-snug"
            style={{ fontSize: "15px", fontWeight: 900, color: "#fff", letterSpacing: "-0.01em", margin: "0 0 10px", transition: "color 0.15s" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLHeadingElement).style.color = "#c8f135")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLHeadingElement).style.color = "#fff")}
          >
            {screening.matchTitle}
          </h3>
        </Link>

        {/* Venue */}
        <div className="flex items-center gap-2" style={{ marginBottom: "12px" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" className="flex-shrink-0">
            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
          </svg>
          <p className="line-clamp-1" style={{ margin: 0, fontSize: "12px", lineHeight: 1.4 }}>
            <span style={{ fontWeight: 700, color: "#c0c0c0" }}>{screening.venueName}</span>
            <span style={{ fontWeight: 500, color: "#777" }}> · {screening.location}</span>
          </p>
        </div>

        {/* Date + time pill */}
        <div className="flex items-center gap-2" style={{ padding: "7px 12px", background: "rgba(200,241,53,0.05)", border: "1px solid rgba(200,241,53,0.12)", borderRadius: "8px", alignSelf: "flex-start", display: "inline-flex" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#c8f135" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0">
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <span style={{ fontSize: "10px", fontWeight: 900, color: "#c8f135", letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
            {screening.day}, {screening.date}
          </span>
          <span style={{ color: "#5a6e30", fontSize: "11px", fontWeight: 700, flexShrink: 0 }}>·</span>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#c8f135" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0">
            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
          </svg>
          <span style={{ fontSize: "10px", fontWeight: 900, color: "#c8f135", letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
            {screening.time}
          </span>
        </div>

        {/* CTA */}
        <div className="flex items-center justify-between" style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #1e1e1e" }}>
          {screening.status === 'cancelled' ? (
            <div className="flex items-center justify-between w-full">
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#cc4444" }}>This event has been cancelled</span>
              <Link
                href={`/screening/${screening.id}`}
                className="no-underline"
                style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "8px 16px", background: "transparent", color: "#555", fontSize: "11px", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", borderRadius: "8px", border: "1.5px solid #222" }}
              >
                Details
              </Link>
            </div>
          ) : (
            <>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#888" }}>
                {screening.tiers.length} {screening.tiers.length === 1 ? "option" : "options"} available
              </span>
              {isBooked ? (
                <Link
                  href={`/screening/${screening.id}`}
                  className="no-underline"
                  style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "8px 16px", background: "rgba(200,241,53,0.08)", color: "#c8f135", fontSize: "11px", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", borderRadius: "8px", border: "1.5px solid rgba(200,241,53,0.35)", transition: "background 0.15s, border-color 0.15s" }}
                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "rgba(200,241,53,0.15)"; el.style.borderColor = "rgba(200,241,53,0.6)"; }}
                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "rgba(200,241,53,0.08)"; el.style.borderColor = "rgba(200,241,53,0.35)"; }}
                >
                  <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  Booked
                </Link>
              ) : (
                <Link
                  href={`/screening/${screening.id}`}
                  className="no-underline"
                  style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "8px 16px", background: "transparent", color: "#c8f135", fontSize: "11px", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", borderRadius: "8px", border: "1.5px solid rgba(200,241,53,0.4)", transition: "background 0.15s, border-color 0.15s" }}
                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "rgba(200,241,53,0.1)"; el.style.borderColor = "rgba(200,241,53,0.75)"; }}
                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "transparent"; el.style.borderColor = "rgba(200,241,53,0.4)"; }}
                >
                  Book Now
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});
