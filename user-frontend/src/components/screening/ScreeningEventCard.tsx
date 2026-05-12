"use client";

import { memo } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Screening } from "./types";

interface Props {
  screening: Screening;
  onBook: (screening: Screening) => void;
}

export const ScreeningEventCard = memo(function ScreeningEventCard({ screening }: Props) {
  return (
    <div
      className="group flex flex-col overflow-hidden transition-all duration-200"
      style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "16px" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2a2a2a")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1e1e1e")}
    >
      {/* Image */}
      <Link href={`/screening/${screening.id}`} className="no-underline" tabIndex={-1}>
        <div className="relative overflow-hidden flex-shrink-0" style={{ height: "200px", background: "#1a1a1a" }}>
          {screening.image ? (
            <Image
              src={screening.image}
              alt={screening.matchTitle}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%)" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #111 0%, rgba(17,17,17,0.4) 45%, transparent 100%)" }} />

          {/* Live badge */}
          <div className="absolute top-3 left-3">
            <div className="flex items-center gap-1.5"
              style={{ padding: "5px 10px", background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "999px" }}>
              <span className="w-[6px] h-[6px] rounded-full bg-red-500 animate-pulse flex-shrink-0" />
              <span style={{ fontSize: "9px", fontWeight: 900, color: "#fff", letterSpacing: "0.18em", textTransform: "uppercase" }}>Live Now</span>
            </div>
          </div>

          {/* Price chip */}
          <div className="absolute bottom-3 right-3">
            <div style={{ padding: "4px 10px", background: "#c8f135", borderRadius: "4px" }}>
              <span style={{ fontSize: "11px", fontWeight: 900, color: "#000", letterSpacing: "0.04em" }}>from ₹{screening.startingPrice}</span>
            </div>
          </div>
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
            <span style={{ fontWeight: 500, color: "#555" }}> · {screening.location}</span>
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
          <span style={{ color: "#3a4a20", fontSize: "11px", fontWeight: 700, flexShrink: 0 }}>·</span>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#c8f135" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0">
            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
          </svg>
          <span style={{ fontSize: "10px", fontWeight: 900, color: "#c8f135", letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
            {screening.time}
          </span>
        </div>

        {/* CTA */}
        <div className="flex items-center justify-between" style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #1e1e1e" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#555" }}>
            {screening.tiers.length} {screening.tiers.length === 1 ? "option" : "options"} available
          </span>
          <Link
            href={`/screening/${screening.id}`}
            className="no-underline"
            style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "8px 16px", background: "transparent", color: "#c8f135", fontSize: "11px", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", borderRadius: "8px", border: "1.5px solid rgba(200,241,53,0.4)", transition: "background 0.15s, border-color 0.15s" }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "rgba(200,241,53,0.1)"; el.style.borderColor = "rgba(200,241,53,0.75)"; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "transparent"; el.style.borderColor = "rgba(200,241,53,0.4)"; }}
          >
            Explore
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
});
