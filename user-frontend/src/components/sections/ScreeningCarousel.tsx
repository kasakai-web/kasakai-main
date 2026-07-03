"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useScreeningEvents } from "@/hooks/useScreeningEvents";
import { fetchPublicScreeningCarousels } from "@/utils/screening-api";

const SLIDE_DURATION = 15_000;
const CAROUSEL_CACHE_KEY = 'kk_scr_carousels';
const CAROUSEL_CACHE_TTL =  5 * 60 * 1000;
const CAROUSEL_POLL_MS = 30 * 1000;

type CarouselFallback = {
  title: string;
  banner: string;
  poster: string;
};

type SlideData = {
  id: string;
  title: string;
  image: string;
  poster?: string | null;
  status?: 'published' | 'cancelled';
  type?: 'event' | 'carousel';
};

function readCarouselCache(): CarouselFallback[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(CAROUSEL_CACHE_KEY);
    if (!raw) return [];
    const entry = JSON.parse(raw) as { slides: CarouselFallback[]; ts: number };
    return entry.slides ?? [];
  } catch {
    return [];
  }
}

function isCarouselCacheFresh(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const raw = localStorage.getItem(CAROUSEL_CACHE_KEY);
    if (!raw) return false;
    const entry = JSON.parse(raw) as { slides: CarouselFallback[]; ts: number };
    return Date.now() - entry.ts < CAROUSEL_CACHE_TTL;
  } catch {
    return false;
  }
}

function writeCarouselCache(slides: CarouselFallback[]) {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CAROUSEL_CACHE_KEY, JSON.stringify({ slides, ts: Date.now() }));
  } catch {}
}

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
    </div>
  );
}

/* ── Slide content — title only, clean ── */
function SlideContent({ s }: { s: SlideData }) {
  const status = s.status ?? 'published';
  const isEvent = s.type === 'event' || !s.type; // Default to event for backward compatibility
  
  return (
    <div className="scr-content" style={{ animation: "scr-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both" }}>
      {/* Live badge — only for events, not carousels */}
      {isEvent && (
        <div className="scr-badge-wrap">
          <span className="scr-badge" style={{
            background: status === "cancelled" ? "rgba(239,68,68,0.15)" : "rgba(200,241,53,0.1)",
            border: `1px solid ${status === "cancelled" ? "rgba(239,68,68,0.35)" : "rgba(200,241,53,0.28)"}`,
          }}>
            {status !== "cancelled" && <span className="scr-live-dot" />}
            <span style={{ color: status === "cancelled" ? "#ef4444" : "#c8f135" }}>
              {status === "cancelled" ? "Cancelled" : "Live Screening"}
            </span>
          </span>
        </div>
      )}

      {/* Title */}
      <h2 className="scr-title">{s.title}</h2>
    </div>
  );
}

/* ── Main carousel ── */
export function ScreeningCarousel() {
  const { screenings } = useScreeningEvents();
  const [current, setCurrent] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [carouselSlides, setCarouselSlides] = useState<SlideData[]>([]);
  const [isCarouselLoading, setIsCarouselLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track breakpoint to pick the right image per size
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 524px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Fetch carousel slides with polling
  const loadCarouselSlides = useCallback(async () => {
    setIsCarouselLoading(true);
    try {
    
        const slides = await fetchPublicScreeningCarousels();
        writeCarouselCache(slides);
        setCarouselSlides(slides.map((slide, index) => ({
          id: `carousel-${index}`,
          title: slide.title,
          image: slide.banner,
          poster: slide.poster,
          status: 'published',
          type: 'carousel',
        })));
    } catch {
      setCarouselSlides([]);
    } finally {
      setIsCarouselLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load from localStorage first — instant render for returning users
    const cached = readCarouselCache();
    if (cached.length > 0) {
      setCarouselSlides(cached.map((slide, index) => ({
        id: `carousel-${index}`,
        title: slide.title,
        image: slide.banner,
        poster: slide.poster,
        status: 'published',
        type: 'carousel',
      })));
      setIsCarouselLoading(false);
    }
    // Skip network fetch if cache is still fresh
    if (isCarouselCacheFresh()) { 

      const pid=setInterval(loadCarouselSlides, CAROUSEL_POLL_MS);
      return () => clearInterval(pid);
    } 

    loadCarouselSlides();
      
    // Set up polling interval regardless of cache state
    const pollId = setInterval(loadCarouselSlides, CAROUSEL_POLL_MS);
    return () => clearInterval(pollId);
  }, [loadCarouselSlides]);

  // Combine slides: up to 4 events + remaining slots filled with carousels (up to 6 total)
  const eventSlides: SlideData[] = screenings.slice(0, 4).map((s) => ({
    id: s.id, 
    title: s.matchTitle,
    image: s.image || s.poster || '',
    poster: s.poster || null,
    status: s.status,
    type: 'event',
  }));

  // If we have fewer than 4 events, fill remaining slots with carousels
  // Otherwise, add up to 2 carousels after the 4 events
  const remainingSlots = 6 - eventSlides.length;
  const carouselsToAdd = carouselSlides.slice(0, Math.max(2, remainingSlots));
  const slides = [...eventSlides, ...carouselsToAdd];
  const count = slides.length;

  useEffect(() => {
    setCurrent((i) => (count === 0 ? 0 : i >= count ? 0 : i));
  }, [count]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (count <= 1) return;
    timerRef.current = setInterval(() => setCurrent((i) => (i + 1) % count), SLIDE_DURATION);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [count]);

  const goTo = useCallback((idx: number) => setCurrent(idx), []);
  const prev = useCallback(() => setCurrent((i) => (i - 1 + count) % count), [count]);
  const next = useCallback(() => setCurrent((i) => (i + 1) % count), [count]);

  if (count === 0) {
    return isCarouselLoading ? <FallbackHero /> : <FallbackHero />;
  }

  const s = slides[Math.min(current, count - 1)];
  // Mobile ≤524px: portrait poster fills tall screen best
  // Desktop >524px: landscape banner image
  const imgSrc = isMobile
    ? (s.poster || s.image)
    : (s.image  || s.poster);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "#050505" }}>

      {/* Layer 1 — blurred fill: covers the whole container behind the poster */}
      {imgSrc && (
        <div
          className="scr-blur-bg"
          style={{ backgroundImage: `url(${imgSrc})` }}
          aria-hidden="true"
        />
      )}

      {/* Layer 2 — full image (contain): never cropped, always fully visible */}
      {imgSrc && (
        <div
          className="scr-poster"
          style={{ backgroundImage: `url(${imgSrc})` }}
          aria-hidden="true"
        />
      )}

      {/* Layer 3 — gradient: text readability at bottom */}
      <div className="scr-gradient" />

      {/* Arrows — desktop only (mobile uses dots) */}
      {count > 1 && (<><ArrowBtn dir="prev" onClick={prev} /><ArrowBtn dir="next" onClick={next} /></>)}

      {/* Title */}
      <SlideContent key={`content-${current}`} s={s} />

      {/* Dots */}
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
        /* ── Blurred fill — all sizes ── */
        .scr-blur-bg {
          position: absolute; inset: 0; z-index: 0;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          filter: blur(22px) brightness(0.35) saturate(0.6);
          transform: scale(1.12);
        }

        /* ── Main poster: contain — full image always visible ── */
        .scr-poster {
          position: absolute; inset: 0; z-index: 1;
          background-size: contain;
          background-position: center 6%;
          background-repeat: no-repeat;
        }

        /* ── Gradient — bottom only, text readability ── */
        .scr-gradient {
          position: absolute; inset: 0; z-index: 2; pointer-events: none;
          background:
            linear-gradient(to top,
              rgba(0,0,0,0.98)  0%,
              rgba(0,0,0,0.90) 14%,
              rgba(0,0,0,0.55) 26%,
              rgba(0,0,0,0.10) 40%,
              rgba(0,0,0,0.00) 52%
            );
        }

        /* ── Content: title only, bottom-left ── */
        .scr-content {
          position: absolute; bottom: 0; left: 0; right: 0; z-index: 5;
          padding: 0 clamp(18px, 5vw, 80px) 36px;
        }

        /* ── Badge ── */
        .scr-badge-wrap { margin-bottom: 6px; }
        .scr-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 9px;
          font-size: 8px; font-weight: 900; letter-spacing: 0.2em; text-transform: uppercase;
        }
        .scr-live-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #ef4444;
          display: inline-block; animation: pulse 2s infinite; flex-shrink: 0;
        }

        /* ── Title ── */
        .scr-title {
          font-family: var(--cond); font-weight: 900;
          font-size: clamp(18px, 3vw, 52px);
          letter-spacing: -0.01em; line-height: 1.05;
          color: #fff; margin: 0;
          text-shadow: 0 2px 24px rgba(0,0,0,1);
          max-width: 800px;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        /* ── Dots ── */
        .scr-dots-bar {
          position: absolute; bottom: 14px; left: 0; right: 0;
          z-index: 9; display: flex; justify-content: center; align-items: center; gap: 8px;
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

        /* ── Arrows — desktop only ── */
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

        /* Mobile: hide arrows, title just below poster, dots just below title */
        @media (max-width: 524px) {
          .scr-arrow { display: none; }
          .scr-title { font-size: clamp(15px, 5vw, 20px); }
          /* Content anchored just below portrait poster (133vw tall at full width) */
          .scr-content {
            top: calc(133vw + 10px);
            bottom: auto;
            padding: 0 18px;
          }
          /* Dots: badge(22px) + gap(6px) + title(~22px) + gap(8px) = ~58px below content top */
          .scr-dots-bar {
            bottom: auto;
            top: calc(133vw + 68px);
            gap: 10px;
          }
          .scr-dot { width: 8px; height: 8px; }
        }

        /* ── Keyframes ── */
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
