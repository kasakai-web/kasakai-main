"use client";

import { FEATURES } from "@/config/features";

export function FeaturesSection() {
  return (
    <section
      id="features"
      style={{
        background: "var(--lime)",
        padding: "96px 0",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: "-20px",
          top: "50%",
          transform: "translateY(-50%)",
          fontFamily: "var(--cond)",
          fontSize: "200px",
          fontWeight: 900,
          color: "rgba(0,0,0,.05)",
          lineHeight: 1,
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}
      >
        FEATURES
      </div>
      <div
        className="container"
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "0 40px",
        }}
      >
        <div
          className="section-eyebrow reveal"
          style={{
            fontFamily: "var(--mono)",
            fontSize: "10px",
            letterSpacing: ".24em",
            textTransform: "uppercase",
            color: "rgba(0,0,0,.45)",
            marginBottom: "14px",
          }}
        >
          What we do
        </div>
        <div
          className="section-title reveal d1"
          style={{
            fontFamily: "var(--cond)",
            fontSize: "clamp(52px, 7vw, 86px)",
            fontWeight: 900,
            letterSpacing: ".01em",
            lineHeight: 0.92,
            color: "#000",
            marginBottom: "48px",
          }}
        >
          Everything
          <br />
          you need.
        </div>
        <div
          className="features-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1px",
            background: "#000",
            border: "1px solid #000",
          }}
        >
          {FEATURES.map((feature, index) => (
            <div
              className={`feat-card reveal d${index + 1}`}
              key={index}
              style={{
                background: "var(--lime)",
                padding: "32px 28px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                position: "relative",
                overflow: "hidden",
                transition: "background .22s",
              }}
            >
              <div
                className="feat-num"
                style={{
                  fontFamily: "var(--cond)",
                  fontSize: "52px",
                  fontWeight: 900,
                  color: "rgba(0,0,0,.1)",
                  lineHeight: 1,
                  position: "relative",
                  zIndex: 1,
                  transition: "color .22s",
                }}
              >
                {feature.id}
              </div>
              <div
                className="feat-icon"
                style={{
                  fontSize: "26px",
                  position: "relative",
                  zIndex: 1,
                  transition: "color .22s",
                  marginTop: "-12px",
                }}
              >
                {feature.icon}
              </div>
              <div
                className="feat-title"
                style={{
                  fontFamily: "var(--cond)",
                  fontSize: "22px",
                  fontWeight: 800,
                  letterSpacing: ".04em",
                  color: "#000",
                  position: "relative",
                  zIndex: 1,
                  transition: "color .22s",
                }}
              >
                {feature.title}
              </div>
              <div
                className="feat-desc"
                style={{
                  fontSize: "13.5px",
                  fontWeight: 400,
                  color: "rgba(0,0,0,.6)",
                  lineHeight: 1.65,
                  position: "relative",
                  zIndex: 1,
                  transition: "color .22s",
                }}
              >
                {feature.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
