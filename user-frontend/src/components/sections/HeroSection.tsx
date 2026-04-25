"use client";

import { useEffect, useState } from "react";

interface BallConfig {
  id: number;
  top: string;
  left: string;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  animIndex: number;
}

const BALL_COUNT = 26;

function generateBalls(): BallConfig[] {
  return Array.from({ length: BALL_COUNT }, (_, i) => ({
    id: i,
    top:       `${Math.random() * 96}%`,
    left:      `${Math.random() * 96}%`,
    size:      i < 4 ? 48 + Math.random() * 18 : i < 12 ? 26 + Math.random() * 16 : 11 + Math.random() * 12,
    opacity:   i < 4 ? 0.35 + Math.random() * 0.15 : i < 12 ? 0.45 + Math.random() * 0.2 : 0.55 + Math.random() * 0.2,
    duration:  i < 4 ? 22 + Math.random() * 14 : i < 12 ? 14 + Math.random() * 10 : 8 + Math.random() * 8,
    delay:     -(Math.random() * 20),
    animIndex: i % 6,
  }));
}

export function HeroSection() {
  const [balls, setBalls] = useState<BallConfig[]>([]);

  useEffect(() => {
    setBalls(generateBalls());
  }, []);

  return (
    <section
      id="home"
      style={{
        paddingTop: "66px",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes ball-a {
          0%   { transform: translate(0px, 0px)      rotate(0deg);   }
          20%  { transform: translate(140px, -90px)  rotate(72deg);  }
          40%  { transform: translate(260px, 60px)   rotate(144deg); }
          60%  { transform: translate(180px, 180px)  rotate(216deg); }
          80%  { transform: translate(-80px, 120px)  rotate(288deg); }
          100% { transform: translate(0px, 0px)      rotate(360deg); }
        }
        @keyframes ball-b {
          0%   { transform: translate(0px, 0px)       rotate(0deg);   }
          25%  { transform: translate(-160px, 80px)   rotate(90deg);  }
          50%  { transform: translate(-240px, -60px)  rotate(180deg); }
          75%  { transform: translate(-100px, -180px) rotate(270deg); }
          100% { transform: translate(0px, 0px)       rotate(360deg); }
        }
        @keyframes ball-c {
          0%   { transform: translate(0px, 0px)      rotate(0deg);   }
          33%  { transform: translate(80px, 200px)   rotate(120deg); }
          66%  { transform: translate(-120px, 280px) rotate(240deg); }
          100% { transform: translate(0px, 0px)      rotate(360deg); }
        }
        @keyframes ball-d {
          0%   { transform: translate(0px, 0px)       rotate(0deg);   }
          20%  { transform: translate(-180px, -120px) rotate(72deg);  }
          50%  { transform: translate(60px, -200px)   rotate(180deg); }
          80%  { transform: translate(200px, -80px)   rotate(288deg); }
          100% { transform: translate(0px, 0px)       rotate(360deg); }
        }
        @keyframes ball-e {
          0%   { transform: translate(0px, 0px)      rotate(0deg);   }
          30%  { transform: translate(220px, 140px)  rotate(108deg); }
          60%  { transform: translate(100px, -160px) rotate(216deg); }
          100% { transform: translate(0px, 0px)      rotate(360deg); }
        }
        @keyframes ball-f {
          0%   { transform: translate(0px, 0px)       rotate(0deg);   }
          25%  { transform: translate(-120px, 160px)  rotate(90deg);  }
          50%  { transform: translate(80px, 240px)    rotate(180deg); }
          75%  { transform: translate(160px, -100px)  rotate(270deg); }
          100% { transform: translate(0px, 0px)       rotate(360deg); }
        }
        .fb-ball {
          position: absolute;
          pointer-events: none;
          line-height: 1;
          user-select: none;
          filter: blur(0.5px);
        }
        @keyframes hero-fade-in {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: none; }
        }
        .hero-inner-visible {
          animation: hero-fade-in 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both;
        }
      `}</style>

      {/* Animated balls — zIndex 2 so they sit above the SVG but below text */}
      {balls.map((b) => {
        const animNames = ["ball-a","ball-b","ball-c","ball-d","ball-e","ball-f"];
        return (
          <span
            key={b.id}
            className="fb-ball"
            style={{
              top: b.top,
              left: b.left,
              fontSize: b.size,
              opacity: b.opacity,
              animation: `${animNames[b.animIndex]} ${b.duration}s ${b.delay}s linear infinite`,
              zIndex: 2,
            }}
          >
            ⚽
          </span>
        );
      })}

      {/* Subtle pitch lines via SVG */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }}
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <g stroke="rgba(255,255,255,0.04)" strokeWidth="1" fill="none">
          {/* Outer border */}
          <rect x="80" y="60" width="1280" height="780" />
          {/* Halfway line */}
          <line x1="720" y1="60" x2="720" y2="840" />
          {/* Centre circle */}
          <circle cx="720" cy="450" r="140" />
          {/* Centre dot */}
          <circle cx="720" cy="450" r="5" fill="rgba(255,255,255,0.05)" stroke="none" />
          {/* Left penalty box */}
          <rect x="80" y="258" width="220" height="384" />
          {/* Right penalty box */}
          <rect x="1140" y="258" width="220" height="384" />
          {/* Left goal box */}
          <rect x="80" y="342" width="100" height="216" />
          {/* Right goal box */}
          <rect x="1260" y="342" width="100" height="216" />
          {/* Penalty spots */}
          <circle cx="240" cy="450" r="5" fill="rgba(255,255,255,0.05)" stroke="none" />
          <circle cx="1200" cy="450" r="5" fill="rgba(255,255,255,0.05)" stroke="none" />
          {/* Corner arcs */}
          <path d="M80,60 a28,28 0 0,1 28,28" />
          <path d="M1360,60 a28,28 0 0,0 -28,28" />
          <path d="M80,840 a28,28 0 0,0 28,-28" />
          <path d="M1360,840 a28,28 0 0,1 -28,-28" />
        </g>
      </svg>

      {/* Small dark halo ONLY behind the text block so it stays readable */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3,
        background: "radial-gradient(ellipse 44% 48% at 50% 50%, rgba(9,9,9,0.72) 0%, transparent 100%)",
      }} />

      {/* Horizontal rules */}
      <div className="hero-rules" style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none" }}>
        <span style={{ top: "28%", position: "absolute", left: 0, right: 0, height: "1px", background: "var(--border)" }} />
        <span style={{ top: "56%", position: "absolute", left: 0, right: 0, height: "1px", background: "var(--border)" }} />
        <span style={{ top: "80%", position: "absolute", left: 0, right: 0, height: "1px", background: "var(--border)" }} />
      </div>

      <div
        className="hero-side-label"
        style={{
          position: "absolute", top: "90px", right: "40px", zIndex: 4,
          fontFamily: "var(--mono)", fontSize: "9.5px", letterSpacing: ".18em",
          color: "#1e1e1e", writingMode: "vertical-rl", textTransform: "uppercase",
        }}
      >
        Kasa Kai — 2025
      </div>

      {/* Main content */}
      <div
        className="hero-inner-visible"
        style={{ position: "relative", zIndex: 4, display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}
      >
        <div
          className="hero-badge"
          style={{
            display: "inline-flex", alignItems: "center", gap: "10px",
            fontFamily: "var(--mono)", fontSize: "10px", letterSpacing: ".22em",
            textTransform: "uppercase", color: "var(--muted)",
            border: "1px solid var(--border)", padding: "6px 16px",
          }}
        >
          <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--lime)", animation: "blink 2s infinite", display: "inline-block" }} />
          Now live in your city
        </div>

        <h1
          className="hero-title"
          style={{
            fontFamily: "var(--cond)", fontWeight: 900,
            fontSize: "clamp(80px, 15vw, 168px)", letterSpacing: "-.01em",
            lineHeight: 0.88, color: "var(--white)",
          }}
        >
          PLAY
          <br />
          <span style={{ color: "var(--lime)" }}>SMARTER</span>
          <br />
          <span style={{ color: "transparent", WebkitTextStroke: "1.5px rgba(255,255,255,.2)" }}>ORGANISED</span>
        </h1>

        <p
          className="hero-sub"
          style={{
            fontFamily: "var(--body)", fontSize: "14px", fontWeight: 400,
            color: "var(--muted)", letterSpacing: ".07em", textTransform: "uppercase",
            lineHeight: 1.9, maxWidth: "320px",
          }}
        >
          List games · manage payments
          <br />
          auto-distribute teams · show up
        </p>

        <div className="hero-ctas" style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
          <a className="btn-primary" href="#features"><span>Explore Features</span></a>
          <a className="btn-ghost" href="#roles">Choose your role</a>
        </div>
      </div>

      <div
        className="scroll-cue"
        style={{
          position: "absolute", bottom: "36px", left: "50%", transform: "translateX(-50%)", zIndex: 4,
          display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
          fontFamily: "var(--mono)", fontSize: "9.5px", letterSpacing: ".2em",
          textTransform: "uppercase", color: "#2a2a2a",
        }}
      >
        <div style={{ width: "1px", height: "40px", background: "linear-gradient(to bottom, transparent, #333)", animation: "scrollLine 2s infinite" }} />
        <span>Scroll</span>
      </div>
    </section>
  );
}
