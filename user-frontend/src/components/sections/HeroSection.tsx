"use client";

import dynamic from "next/dynamic";

// ssr: false — carousel reads localStorage; skipping SSR avoids hydration mismatch
const ScreeningCarousel = dynamic(
  () => import("./ScreeningCarousel").then((m) => ({ default: m.ScreeningCarousel })),
  { ssr: false }
);

export function HeroSection() {
  return (
    <>
    <section
      id="home"
      className="hero-section"
      style={{
        height: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Carousel fills from below fixed header */}
      <div style={{ position: "absolute", top: "52px", left: 0, right: 0, bottom: 0 }}>
        <ScreeningCarousel />
      </div>

      {/* Subtle pitch-line SVG behind the carousel */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0, opacity: 0.025 }}
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <g stroke="rgba(255,255,255,1)" strokeWidth="1" fill="none">
          <rect x="80" y="60" width="1280" height="780" />
          <line x1="720" y1="60" x2="720" y2="840" />
          <circle cx="720" cy="450" r="140" />
          <circle cx="720" cy="450" r="5" fill="rgba(255,255,255,0.8)" stroke="none" />
          <rect x="80" y="258" width="220" height="384" />
          <rect x="1140" y="258" width="220" height="384" />
          <rect x="80" y="342" width="100" height="216" />
          <rect x="1260" y="342" width="100" height="216" />
          <circle cx="240" cy="450" r="5" fill="rgba(255,255,255,0.8)" stroke="none" />
          <circle cx="1200" cy="450" r="5" fill="rgba(255,255,255,0.8)" stroke="none" />
          <path d="M80,60 a28,28 0 0,1 28,28" />
          <path d="M1360,60 a28,28 0 0,0 -28,28" />
          <path d="M80,840 a28,28 0 0,0 28,-28" />
          <path d="M1360,840 a28,28 0 0,1 -28,-28" />
        </g>
      </svg>

      {/* Side label */}
      <div
        style={{
          position: "absolute", top: "90px", right: "40px", zIndex: 20,
          fontFamily: "var(--mono)", fontSize: "9.5px", letterSpacing: ".18em",
          color: "rgba(255,255,255,0.12)", writingMode: "vertical-rl", textTransform: "uppercase",
          pointerEvents: "none",
        }}
      >
        Kasa Kai — 2025
      </div>
    </section>

    {/* Action strip — Football & Screening, all screen sizes */}
    <div className="hero-strip">
      <a href="/login"     className="hero-strip-btn hero-strip-football">⚽ Football</a>
      <a href="/screening" className="hero-strip-btn hero-strip-screening">🎬 Screening</a>
      <style>{`
        .hero-strip {
          display: flex;
          justify-content: center;
          gap: 14px;
          padding: 16px clamp(18px, 5vw, 80px);
          background: var(--black);
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .hero-strip-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 220px;
          height: 52px;
          font-family: var(--cond);
          font-size: 15px;
          font-weight: 900;
          letter-spacing: .13em;
          text-transform: uppercase;
          text-decoration: none;
          border-radius: 12px;
          position: relative;
          overflow: hidden;
          transition: transform 0.22s cubic-bezier(0.22,1,0.36,1),
                      box-shadow 0.22s cubic-bezier(0.22,1,0.36,1),
                      background 0.22s, border-color 0.22s;
        }
        .hero-strip-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 28px rgba(200,241,53,0.2), 0 2px 8px rgba(0,0,0,0.4);
        }
        .hero-strip-btn:active {
          transform: translateY(-1px) scale(0.97);
          box-shadow: 0 3px 10px rgba(200,241,53,0.12);
        }
        .hero-strip-football,
        .hero-strip-screening {
          background: rgba(200,241,53,0.07);
          border: 1.5px solid rgba(200,241,53,0.38);
          color: #c8f135;
          box-shadow: inset 0 1px 0 rgba(200,241,53,0.08);
        }
        .hero-strip-football:hover,
        .hero-strip-screening:hover {
          background: rgba(200,241,53,0.13);
          border-color: rgba(200,241,53,0.68);
        }

        /* Strip entrance */
        @keyframes strip-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: none; }
        }
        .hero-strip { animation: strip-in 0.6s cubic-bezier(0.22,1,0.36,1) 0.4s both; }

        /* Subtle shimmer sweep on each button after load */
        .hero-strip-btn { position: relative; overflow: hidden; }
        .hero-strip-btn::after {
          content: '';
          position: absolute;
          top: 0; bottom: 0;
          width: 40%;
          background: linear-gradient(90deg, transparent, rgba(200,241,53,0.12), transparent);
          left: -80%;
          animation: btn-shine 2.2s cubic-bezier(0.4,0,0.2,1) 1.2s 1 forwards;
          pointer-events: none;
        }

        /* Mobile: full-width buttons + shrink hero to fit poster+title+dots */
        @media (max-width: 524px) {
          .hero-section { height: calc(133vw + 138px) !important; }
          .hero-strip { padding: 12px 16px; gap: 10px; justify-content: stretch; }
          .hero-strip-btn { width: auto; flex: 1; height: 48px; font-size: 13px; border-radius: 10px; }
        }
      `}</style>
    </div>
    </>
  );
}
