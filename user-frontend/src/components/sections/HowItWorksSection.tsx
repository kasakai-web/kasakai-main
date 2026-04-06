"use client";

import { STEPS } from "@/config/steps";

export function HowItWorksSection() {
  return (
    <section
      id="features2"
      style={{ padding: "92px 0", background: "var(--black)" }}
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
          className="how-head reveal"
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "24px",
            flexWrap: "wrap",
            marginBottom: "40px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div
              className="section-eyebrow"
              style={{
                color: "var(--muted)",
                fontFamily: "var(--mono)",
                fontSize: "10px",
                letterSpacing: ".24em",
                textTransform: "uppercase",
              }}
            >
              The process
            </div>
            <div
              className="section-title d1"
              style={{
                color: "var(--white)",
                fontFamily: "var(--cond)",
                fontSize: "clamp(46px, 6.5vw, 84px)",
                fontWeight: 900,
                letterSpacing: ".01em",
                lineHeight: 0.92,
                textWrap: "balance",
                maxWidth: "10ch",
              }}
            >
              How it works.
            </div>
          </div>
          <p
            className="how-copy reveal d2"
            style={{
              maxWidth: "360px",
              fontFamily: "var(--body)",
              fontSize: "14px",
              lineHeight: 1.75,
              color: "var(--muted)",
              marginBottom: "6px",
            }}
          >
            A simple five-step flow for organisers and players, designed to stay readable from mobile screens to wide desktop layouts.
          </p>
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
                    fontSize: "clamp(22px, 2.4vw, 26px)",
                    fontWeight: 800,
                    letterSpacing: ".02em",
                    lineHeight: 1.05,
                    color: "var(--white)",
                  }}
                >
                  {step.title}
                </div>
                <div
                  className="step-desc"
                  style={{
                    fontSize: "14px",
                    color: "var(--muted)",
                    lineHeight: 1.7,
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
