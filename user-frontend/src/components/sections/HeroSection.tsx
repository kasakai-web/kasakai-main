"use client";

import dynamic from "next/dynamic";

// ssr: false — carousel reads localStorage; skipping SSR avoids hydration mismatch
const ScreeningCarousel = dynamic(
  () => import("./ScreeningCarousel").then((m) => ({ default: m.ScreeningCarousel })),
  { ssr: false }
);

export function HeroSection() {
  return (
    <section
      id="home"
      style={{
        height: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Carousel fills from below fixed header */}
      <div style={{ position: "absolute", top: "66px", left: 0, right: 0, bottom: 0 }}>
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
  );
}
