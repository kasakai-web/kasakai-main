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
      <div className="hero-rules">
        <span
          style={{
            top: "28%",
            position: "absolute",
            left: 0,
            right: 0,
            height: "1px",
            background: "var(--border)",
          }}
        ></span>
        <span
          style={{
            top: "56%",
            position: "absolute",
            left: 0,
            right: 0,
            height: "1px",
            background: "var(--border)",
          }}
        ></span>
        <span
          style={{
            top: "80%",
            position: "absolute",
            left: 0,
            right: 0,
            height: "1px",
            background: "var(--border)",
          }}
        ></span>
      </div>
      <div
        className="hero-side-label"
        style={{
          position: "absolute",
          top: "90px",
          right: "40px",
          fontFamily: "var(--mono)",
          fontSize: "9.5px",
          letterSpacing: ".18em",
          color: "#1e1e1e",
          writingMode: "vertical-rl",
          textTransform: "uppercase",
        }}
      >
        Kasa Kai — 2025
      </div>
      <div
        className="hero-inner reveal"
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
        }}
      >
        <div
          className="hero-badge"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            fontFamily: "var(--mono)",
            fontSize: "10px",
            letterSpacing: ".22em",
            textTransform: "uppercase",
            color: "var(--muted)",
            border: "1px solid var(--border)",
            padding: "6px 16px",
          }}
        >
          <span
            className="hero-badge-dot"
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: "var(--lime)",
              animation: "blink 2s infinite",
            }}
          ></span>
          Now live in your city
        </div>
        <h1
          className="hero-title"
          style={{
            fontFamily: "var(--cond)",
            fontWeight: 900,
            fontSize: "clamp(80px, 15vw, 168px)",
            letterSpacing: "-.01em",
            lineHeight: 0.88,
            color: "var(--white)",
          }}
        >
          PLAY
          <br />
          <span className="lime" style={{ color: "var(--lime)" }}>
            SMARTER
          </span>
          <br />
          <span
            className="stroke"
            style={{
              color: "transparent",
              WebkitTextStroke: "1.5px rgba(255,255,255,.2)",
            }}
          >
            ORGANISED
          </span>
        </h1>
        <p
          className="hero-sub"
          style={{
            fontFamily: "var(--body)",
            fontSize: "14px",
            fontWeight: 400,
            color: "var(--muted)",
            letterSpacing: ".07em",
            textTransform: "uppercase",
            lineHeight: 1.9,
            maxWidth: "320px",
          }}
        >
          List games · manage payments
          <br />
          auto-distribute teams · show up
        </p>
        <div
          className="hero-ctas"
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <a className="btn-primary" href="#features">
            <span>Explore Features</span>
          </a>
          <a className="btn-ghost" href="#roles">
            Choose your role
          </a>
        </div>
      </div>
      <div
        className="scroll-cue"
        style={{
          position: "absolute",
          bottom: "36px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
          fontFamily: "var(--mono)",
          fontSize: "9.5px",
          letterSpacing: ".2em",
          textTransform: "uppercase",
          color: "#2a2a2a",
        }}
      >
        <div
          className="scroll-line"
          style={{
            width: "1px",
            height: "40px",
            background: "linear-gradient(to bottom, transparent, #333)",
            animation: "scrollLine 2s infinite",
          }}
        ></div>
        <span>Scroll</span>
      </div>
    </section>
  );
}
