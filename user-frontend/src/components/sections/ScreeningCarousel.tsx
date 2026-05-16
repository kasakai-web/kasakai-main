"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useScreeningEvents } from "@/hooks/useScreeningEvents";
import type { Screening } from "@/components/screening/types";

const SLIDE_DURATION = 15_000;

/* ── Arrow button ── */
function ArrowBtn({ dir, onClick }: { dir: "prev" | "next"; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`scr-arrow scr-arrow-${dir}`} aria-label={dir === "prev" ? "Previous" : "Next"}>
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {dir === "prev" ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
      </svg>
    </button>
  );
}

/* ── Fallback: no events ── */
function FallbackHero() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: "20px" }}>
      <h1 style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "clamp(80px, 15vw, 168px)", letterSpacing: "-.01em", lineHeight: 0.88, color: "var(--white)", animation: "hero-fade-in 0.9s cubic-bezier(0.22,1,0.36,1) 0.15s both" }}>
        PLAY<br /><span style={{ color: "var(--lime)" }}>SMARTER</span><br />
        <span style={{ color: "transparent", WebkitTextStroke: "1.5px rgba(255,255,255,.2)" }}>ORGANISED</span>
      </h1>
      <div className="scr-cta-row" style={{ marginTop: "8px", animation: "hero-fade-in 0.9s cubic-bezier(0.22,1,0.36,1) 0.3s both" }}>
        <a href="/login" className="scr-btn-primary">Football →</a>
        <a href="/screening" className="scr-btn-secondary">Screening →</a>
      </div>
    </div>
  );
}

/* ── Slide content ── */
function SlideContent({ s }: { s: Screening }) {
  return (
    <div className="scr-content" style={{ animation: "scr-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both" }}>

      {/* Badge */}
      <div className="scr-badge-wrap">
        <span className="scr-badge" style={{
          background: s.status === "cancelled" ? "rgba(239,68,68,0.15)" : "rgba(200,241,53,0.1)",
          border: `1px solid ${s.status === "cancelled" ? "rgba(239,68,68,0.35)" : "rgba(200,241,53,0.28)"}`,
        }}>
          {s.status !== "cancelled" && (
            <span className="scr-live-dot" />
          )}
          <span style={{ color: s.status === "cancelled" ? "#ef4444" : "#c8f135" }}>
            {s.status === "cancelled" ? "Cancelled" : "Live Screening"}
          </span>
        </span>
      </div>

      {/* Title */}
      <h2 className="scr-title">{s.matchTitle}</h2>

      {/* Meta — one tight row, no internal wrapping */}
      <div className="scr-meta">
        {s.venueName && (
          <span className="scr-meta-item">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#c8f135" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
            </svg>
            <span className="scr-meta-text">{s.venueName}</span>
            {/* location hidden on mobile via CSS */}
            <span className="scr-location-group">
              <span className="scr-sep">·</span>
              <span className="scr-meta-text scr-muted">{s.location}</span>
            </span>
          </span>
        )}
        {s.date && (
          <span className="scr-meta-item">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#c8f135" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <span className="scr-meta-text">{s.day}, {s.date}</span>
            {s.time && (
              <>
                <span className="scr-sep">·</span>
                <span className="scr-meta-text scr-muted">{s.time}</span>
              </>
            )}
          </span>
        )}
      </div>

      {/* Buttons */}
      <div className="scr-cta-row">
        <a href="/login" className="scr-btn-primary">Football →</a>
        <a href="/screening" className="scr-btn-secondary">Screening →</a>
      </div>
    </div>
  );
}

/* ── Main carousel ── */
export function ScreeningCarousel() {
  const { screenings, loading } = useScreeningEvents();
  const [current, setCurrent]   = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const timerRef                = useRef<ReturnType<typeof setInterval> | null>(null);

  // Detect <525px breakpoint
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 524px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Mobile: only events with a poster. Desktop: all events.
  const filtered = isMobile
    ? screenings.filter((s) => s.poster)
    : screenings;

  const count = filtered.length;

  // Reset index when filtered list changes length
  useEffect(() => {
    setCurrent((i) => (count === 0 ? 0 : i >= count ? 0 : i));
  }, [count]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (count <= 1) return;
    timerRef.current = setInterval(() => setCurrent((i) => (i + 1) % count), SLIDE_DURATION);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [current, count]);

  const goTo = useCallback((idx: number) => setCurrent(idx), []);
  const prev  = useCallback(() => setCurrent((i) => (i - 1 + count) % count), [count]);
  const next  = useCallback(() => setCurrent((i) => (i + 1) % count), [count]);

  // Show fallback hero while loading with no data (first-time visitors)
  // Returning visitors: localStorage cache means loading=false and data is instant
  if (count === 0) return <FallbackHero />;

  const s      = filtered[current];
  // Mobile: portrait poster. Desktop: landscape banner, fall back to poster.
  const imgSrc = isMobile ? s.poster : (s.image || s.poster);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "#050505" }}>

      {/* Poster as background-div — immune to img CSS resets and intrinsic dimensions */}
      {imgSrc && (
        <div
          className="scr-poster"
          style={{ backgroundImage: `url(${imgSrc})` }}
          aria-hidden="true"
        />
      )}

      {/* Gradient */}
      <div className="scr-gradient" style={{ background: imgSrc ? undefined : "#050505" }} />
      <div style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none", background: "linear-gradient(to right, rgba(0,0,0,0.25) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.25) 100%)" }} />

      {/* Arrows */}
      {count > 1 && (<><ArrowBtn dir="prev" onClick={prev} /><ArrowBtn dir="next" onClick={next} /></>)}

      {/* Content */}
      <SlideContent key={`content-${current}`} s={s} />

      {/* Dots — pinned to bottom-center, outside the text content */}
      {count > 1 && (
        <div className="scr-dots-bar">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Slide ${i + 1}`}
              className={`scr-dot ${i === current ? "scr-dot-active" : ""}`}
            />
          ))}
        </div>
      )}

      <style>{`
        /* ─── Poster — cover for all sizes ─── */
        .scr-poster {
          position: absolute; inset: 0;
          background-size: cover;
          background-position: center 35%;
          background-repeat: no-repeat;
        }
        /* Mobile (<525px): portrait poster — anchor near top */
        @media (max-width: 524px) {
          .scr-poster {
            background-position: center 12%;
          }
        }

        /* ─── Gradient ─── */
        .scr-gradient {
          position: absolute; inset: 0; z-index: 2; pointer-events: none;
          background:
            linear-gradient(to top,
              rgba(0,0,0,0.97) 0%,
              rgba(0,0,0,0.88) 20%,
              rgba(0,0,0,0.60) 40%,
              rgba(0,0,0,0.25) 60%,
              rgba(0,0,0,0.08) 80%,
              transparent 100%
            ),
            linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 18%);
        }

        /* Mobile: cinematic gradient — shows top 65% of portrait poster clearly */
        @media (max-width: 524px) {
          .scr-gradient {
            background:
              linear-gradient(to top,
                rgba(0,0,0,1.00)  0%,
                rgba(0,0,0,0.99) 20%,
                rgba(0,0,0,0.90) 34%,
                rgba(0,0,0,0.60) 47%,
                rgba(0,0,0,0.18) 60%,
                rgba(0,0,0,0.00) 72%
              ),
              linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 10%);
          }
        }

        /* ─── Content block ─── */
        .scr-content {
          position: absolute; bottom: 0; left: 0; right: 0; z-index: 5;
          padding: 0 clamp(20px, 5vw, 80px) clamp(20px, 4vh, 48px);
        }

        /* ─── Badge ─── */
        .scr-badge-wrap { margin-bottom: 10px; }
        .scr-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 11px;
          font-size: 9px; font-weight: 900; letter-spacing: 0.2em; text-transform: uppercase;
        }
        .scr-live-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #ef4444;
          display: inline-block; animation: pulse 2s infinite; flex-shrink: 0;
        }

        /* ─── Title ─── */
        .scr-title {
          font-family: var(--cond); font-weight: 900;
          font-size: clamp(24px, 4.5vw, 72px);
          letter-spacing: -0.01em; line-height: 1.05;
          color: #fff; margin: 0 0 10px;
          text-shadow: 0 2px 20px rgba(0,0,0,1);
          max-width: 700px;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        /* ─── Meta row ─── */
        .scr-meta {
          display: flex; flex-wrap: nowrap; align-items: center;
          gap: 12px; margin-bottom: 16px;
          overflow: hidden;
        }
        .scr-meta-item {
          display: inline-flex; align-items: center; gap: 4px;
          white-space: nowrap; flex-shrink: 0;
        }
        .scr-meta-text { font-size: 11px; font-weight: 700; color: #ccc; }
        .scr-muted     { color: #888; font-weight: 500; }
        .scr-sep       { color: #444; font-size: 12px; }
        .scr-location-group { display: inline-flex; align-items: center; gap: 4px; }

        /* ─── CTA row — always one line ─── */
        .scr-cta-row {
          display: flex; flex-wrap: nowrap;
          gap: 10px; align-items: center;
        }

        /* ─── Primary button ─── */
        .scr-btn-primary {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 8px; background: #c8f135; color: #000;
          font-family: var(--cond); font-size: 13px; font-weight: 900;
          letter-spacing: .16em; text-transform: uppercase;
          padding: 0 26px; height: 46px;
          text-decoration: none; white-space: nowrap; flex-shrink: 0;
          box-shadow: 0 0 24px rgba(200,241,53,0.25);
          transition: background 0.18s, box-shadow 0.18s, transform 0.12s;
        }
        .scr-btn-primary:hover {
          background: #d4f545;
          box-shadow: 0 0 40px rgba(200,241,53,0.42);
          transform: translateY(-1px);
        }

        /* ─── Secondary button ─── */
        .scr-btn-secondary {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 8px; background: rgba(200,241,53,0.07); color: #c8f135;
          font-family: var(--cond); font-size: 13px; font-weight: 900;
          letter-spacing: .16em; text-transform: uppercase;
          padding: 0 26px; height: 46px;
          text-decoration: none; white-space: nowrap; flex-shrink: 0;
          border: 1.5px solid rgba(200,241,53,0.38);
          transition: background 0.18s, border-color 0.18s, transform 0.12s;
        }
        .scr-btn-secondary:hover {
          background: rgba(200,241,53,0.14);
          border-color: rgba(200,241,53,0.7);
          transform: translateY(-1px);
        }

        /* ── Small tablet (≤640px): compact ── */
        @media (max-width: 640px) {
          .scr-content { padding: 0 18px 44px; }
          .scr-badge-wrap { margin-bottom: 8px; }
          .scr-badge { padding: 3px 10px; font-size: 8px; }
          .scr-title { font-size: clamp(20px, 6.5vw, 30px); margin-bottom: 10px; }
          .scr-meta { gap: 8px; margin-bottom: 14px; }
          .scr-meta-text { font-size: 10px; }
          .scr-location-group { display: none; }
          .scr-cta-row { gap: 8px; width: 100%; }
          .scr-btn-primary, .scr-btn-secondary {
            flex: 1; padding: 0 10px; height: 42px;
            font-size: 11px; letter-spacing: .08em;
          }
        }

        /* ── Portrait mobile (<525px): optimised for portrait poster layout ── */
        @media (max-width: 524px) {
          .scr-content {
            padding: 0 18px 52px;
            /* frosted backdrop behind text for readability over any poster */
            background: linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%);
          }
          .scr-badge-wrap { margin-bottom: 6px; }
          .scr-title {
            font-size: clamp(22px, 7.5vw, 32px);
            margin-bottom: 8px;
            -webkit-line-clamp: 3;
          }
          .scr-meta { gap: 6px; margin-bottom: 14px; }
          .scr-meta-item:first-child { display: none; } /* hide venue on portrait — date/time only */
          .scr-cta-row { gap: 10px; }
          .scr-btn-primary, .scr-btn-secondary {
            flex: 1; height: 44px; font-size: 12px; letter-spacing: .10em;
          }
        }

        /* ─── Dots — bottom-center, always outside content ─── */
        .scr-dots-bar {
          position: absolute;
          bottom: 14px;
          left: 0; right: 0;
          z-index: 9;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          pointer-events: auto;
        }
        .scr-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: rgba(255,255,255,0.28); border: none; padding: 0;
          cursor: pointer; flex-shrink: 0;
          transition: background 0.25s, transform 0.25s;
        }
        .scr-dot-active {
          background: #c8f135; transform: scale(1.35);
          box-shadow: 0 0 8px rgba(200,241,53,0.55);
        }
        /* Larger tap target on mobile */
        @media (max-width: 524px) {
          .scr-dots-bar { bottom: 16px; gap: 10px; }
          .scr-dot { width: 8px; height: 8px; }
        }

        /* ─── Arrows ─── */
        .scr-arrow {
          position: absolute; top: 50%; transform: translateY(-50%);
          z-index: 8; width: 48px; height: 48px;
          background: rgba(5,5,5,0.55);
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: background 0.18s, border-color 0.18s, transform 0.18s;
        }
        .scr-arrow:hover {
          background: rgba(200,241,53,0.15);
          border-color: rgba(200,241,53,0.5);
          transform: translateY(-50%) scale(1.1);
        }
        .scr-arrow-prev { left: clamp(14px, 3vw, 36px); }
        .scr-arrow-next { right: clamp(14px, 3vw, 36px); }
        @media (max-width: 480px) {
          .scr-arrow { width: 36px; height: 36px; }
          .scr-arrow-prev { left: 10px; }
          .scr-arrow-next { right: 10px; }
        }
        /* Hide arrows on portrait mobile — dots handle navigation */
        @media (max-width: 524px) {
          .scr-arrow { display: none; }
        }

        /* ─── Keyframes ─── */
        @keyframes scr-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes hero-fade-in {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}
