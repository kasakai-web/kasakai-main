"use client";

import { STEPS } from "@/config/steps";

export function HowItWorksSection() {
  return (
    <section
      id="features2"
      style={{ padding: "96px 0", background: "var(--black)" }}
    >
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
            color: "var(--muted)",
            fontFamily: "var(--mono)",
            fontSize: "10px",
            letterSpacing: ".24em",
            textTransform: "uppercase",
            marginBottom: "14px",
          }}
        >
          The process
        </div>
        <div
          className="section-title reveal d1"
          style={{
            color: "var(--white)",
            fontFamily: "var(--cond)",
            fontSize: "clamp(52px, 7vw, 86px)",
            fontWeight: 900,
            letterSpacing: ".01em",
            lineHeight: 0.92,
            marginBottom: "48px",
          }}
        >
          How it
          <br />
          works.
        </div>
        <div
          className="steps-wrap reveal d2"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            marginTop: "48px",
            border: "1px solid var(--border)",
          }}
        >
          {STEPS.map((step, index) => (
            <div
              className="step-row"
              key={index}
              style={{
                display: "grid",
                gridTemplateColumns: "80px 1fr",
                borderBottom: "1px solid var(--border)",
                position: "relative",
                overflow: "hidden",
                transition: "background .22s",
              }}
            >
              <div
                className="step-num-col"
                style={{
                  borderRight: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--cond)",
                  fontSize: "36px",
                  fontWeight: 900,
                  color: "#222",
                  padding: "28px 0",
                  transition: "color .22s",
                }}
              >
                {step.id}
              </div>
              <div
                className="step-content"
                style={{
                  padding: "28px 32px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div
                  className="step-title"
                  style={{
                    fontFamily: "var(--cond)",
                    fontSize: "26px",
                    fontWeight: 800,
                    letterSpacing: ".04em",
                    color: "var(--white)",
                  }}
                >
                  {step.title}
                </div>
                <div
                  className="step-desc"
                  style={{
                    fontSize: "13.5px",
                    color: "var(--muted)",
                    lineHeight: 1.65,
                  }}
                >
                  {step.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
