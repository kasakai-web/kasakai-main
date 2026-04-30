"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "How do I join a game?",
    a: "Browse open games in your area, select one that fits your schedule, and pay the entry fee through your in-app wallet. Your spot is confirmed instantly.",
  },
  {
    q: "What if I need to cancel?",
    a: "You can cancel up to 24 hours before the game for a full refund to your wallet. Cancellations within 24 hours are non-refundable unless your spot is filled by someone from the waitlist.",
  },
  {
    q: "How does team balancing work?",
    a: "The algorithm distributes players based on their skill level and preferred positions to create fair and competitive teams. Organisers can also manually adjust teams before the game starts.",
  },
  {
    q: "Is KasaKai available in my city?",
    a: "We are currently live in Mumbai, Delhi, Bangalore, and Pune, and expanding rapidly. Enter your location to see games near you.",
  },
  {
    q: "How does the wallet work?",
    a: "Top up via UPI, card, or net banking through Razorpay. When you join a game the fee is locked and released to the organiser after the game completes. Refunds land back in your wallet instantly.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <section
      id="support"
      style={{
        background: "var(--black)",
        padding: "100px 0 80px",
        borderTop: "1px solid var(--border)",
      }}
    >
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "0 24px" }}>

        {/* Label */}
        <p style={{
          fontFamily: "var(--mono)",
          fontSize: "10px",
          letterSpacing: ".22em",
          textTransform: "uppercase",
          color: "var(--muted)",
          marginBottom: "16px",
        }}>
          Support
        </p>

        {/* Heading */}
        <h2 style={{
          fontFamily: "var(--cond)",
          fontWeight: 900,
          fontSize: "clamp(52px, 10vw, 80px)",
          letterSpacing: "-.01em",
          lineHeight: 0.9,
          color: "var(--white)",
          marginBottom: "8px",
        }}>
          COMMON
        </h2>
        <h2 style={{
          fontFamily: "var(--cond)",
          fontWeight: 900,
          fontSize: "clamp(52px, 10vw, 80px)",
          letterSpacing: "-.01em",
          lineHeight: 0.9,
          color: "var(--lime)",
          marginBottom: "56px",
        }}>
          QUESTIONS
        </h2>

        {/* Accordion */}
        <div>
          {FAQS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                style={{
                  borderBottom: "1px solid var(--border)",
                  background: isOpen ? "rgba(196,213,108,0.04)" : "transparent",
                  transition: "background 0.2s ease",
                }}
              >
                <button
                  onClick={() => toggle(i)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "20px",
                    padding: "24px 20px",
                    textAlign: "left",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {/* Number + Question */}
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: 0 }}>
                    <span style={{
                      fontFamily: "var(--mono)",
                      fontSize: "10px",
                      color: isOpen ? "var(--lime)" : "#3a3a3a",
                      letterSpacing: ".1em",
                      flexShrink: 0,
                      transition: "color 0.2s ease",
                    }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span style={{
                      fontFamily: "var(--cond)",
                      fontWeight: 700,
                      fontSize: "clamp(18px, 3.5vw, 22px)",
                      letterSpacing: ".02em",
                      lineHeight: 1.2,
                      color: isOpen ? "var(--white)" : "#c0bdb8",
                      transition: "color 0.2s ease",
                    }}>
                      {item.q}
                    </span>
                  </div>

                  {/* Toggle icon */}
                  <span style={{
                    width: "32px",
                    height: "32px",
                    minWidth: "32px",
                    border: `1px solid ${isOpen ? "var(--lime)" : "var(--border)"}`,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: isOpen ? "var(--lime)" : "var(--muted)",
                    fontSize: "20px",
                    lineHeight: 1,
                    transform: isOpen ? "rotate(45deg)" : "none",
                    transition: "transform 0.25s ease, border-color 0.2s ease, color 0.2s ease",
                    flexShrink: 0,
                  }}>
                    +
                  </span>
                </button>

                {/* Answer */}
                <div style={{
                  maxHeight: isOpen ? "500px" : "0",
                  overflow: "hidden",
                  transition: "max-height 0.35s ease",
                }}>
                  <p style={{
                    fontFamily: "var(--body)",
                    fontSize: "14px",
                    fontWeight: 400,
                    lineHeight: 1.85,
                    color: "var(--muted)",
                    padding: "0 20px 26px 62px",
                    margin: 0,
                  }}>
                    {item.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
