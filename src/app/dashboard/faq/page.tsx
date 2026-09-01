"use client";

import { useState,type ReactNode } from "react";

const FAQS: { q: string; a: ReactNode }[] = [
  {
    q: "How do I sign up for a game?",
    a: "Find a game on the listing page and click ‘Book Now’. Make sure your wallet has enough balance.",
  },
  {
    q: "How do I recharge my wallet?",
    a: "Go to your wallet page and click Recharge. Pay via Razorpay to top up your wallet.",
  },
  {
    q: "What if I back out of a game?",
    a: "You will receive a full refund to your wallet automatically.",
  },
  {
    q: "What if I don't show up?",
    a: "No show refunds are not automatic. The organiser will decide on a case-by-case basis.",
  },
  {
    q: "Can I bring a friend?",
    a: "Yes. Add them as a guest during game signup. Their fee comes from your wallet and their behaviour is your responsibility.",
  },
  {
    q: "What if the game is cancelled?",
    a: "You get a fully automatic refund to your wallet. No action needed from your end.",
  },
  {
    q: "What if the game format changes?",
    a: "If you said no to format changes at signup, you are automatically opted out and refunded. If you said yes, you stay in and get notified.",
  },
{
  q: "How do I raise a concern?",
  a: (
    <>
      Contact the organiser after the game. For platform issues, reach out to
      the Kasa Kai team at{" "}
      <a
        href="mailto:contact@kasakai.in"
        style={{
          color: "var(--lime)",
          textDecoration: "underline",
          cursor: "pointer",
        }}
      >
        contact@kasakai.in
      </a>
      .
    </>
  ),
},
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <div className="player-dashboard-container">
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title">Frequently Asked Questions (FAQs)</div>
        </div>
      </div>
        <>
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
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: 0 }}>
                    <span style={{
                      fontFamily: "var(--mono)",
                      fontSize: "clamp(15px, 3vw, 18px)",
                      color: isOpen ? "var(--lime)" : "#3a3a3a",
                      letterSpacing: ".05em",
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

                <div style={{
                  maxHeight: isOpen ? "500px" : "0",
                  overflow: "hidden",
                  transition: "max-height 0.35s ease",
                }}>
                  <p style={{
                    fontFamily: "var(--body)",
                    fontSize: "16px",
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
        </>
      </div>
  );
}