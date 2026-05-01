"use client";

export function HeroSection() {

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
        @keyframes hero-fade-in {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: none; }
        }
        .hero-inner-visible {
          animation: hero-fade-in 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both;
        }
      `}</style>

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
        </p>

        <style>{`
          .hero-arrow-btn {
            display: inline-flex;
            align-items: center;
            gap: 0;
            text-decoration: none;
            border: 1.5px solid var(--lime);
            background: transparent;
            color: var(--lime);
            font-family: var(--cond);
            font-size: 14px;
            font-weight: 700;
            letter-spacing: .16em;
            text-transform: uppercase;
            padding: 0;
            overflow: hidden;
            transition: background 0.22s ease, color 0.22s ease, box-shadow 0.22s ease;
          }
          .hero-arrow-btn:hover {
            background: var(--lime);
            color: #000;
            box-shadow: 0 0 24px rgba(196,213,108,0.25);
          }
          .hero-arrow-btn .btn-label {
            padding: 12px 24px;
            border-right: 1.5px solid var(--lime);
          }
          .hero-arrow-btn .btn-arrow {
            padding: 12px 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.22s ease;
          }
          .hero-arrow-btn:hover .btn-arrow {
            transform: translateX(4px);
          }
        `}</style>

        <div className="hero-ctas" style={{ display: "flex", justifyContent: "center" }}>
          <a href="/login" className="hero-arrow-btn">
            <span className="btn-label">Login</span>
            <span className="btn-arrow">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </a>
        </div>
      </div>

    </section>
  );
}
