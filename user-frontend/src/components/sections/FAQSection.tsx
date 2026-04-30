"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "How do I join a game?",
    a: "Browse open games, select one that fits your schedule, and pay the entry fee from your in-app wallet. Your spot is confirmed instantly. If the game is full, you can join the waitlist and get in automatically when a spot opens.",
  },
  {
    q: "What if I want to back out of a game?",
    a: "You can withdraw before the game takes place. Your registration fee is refunded to your Kasa Kai wallet — not to your bank account. The exact refund amount depends on the organiser's backout policy for that game, which is shown clearly before you confirm your withdrawal.",
  },
  {
    q: "What happens if the organiser cancels the game?",
    a: "If the organiser cancels, all registered players receive a full refund to their Kasa Kai wallet within minutes of the cancellation. No action is needed from your side.",
  },
  {
    q: "Can I withdraw money from my wallet to my bank?",
    a: "No. Wallet balances cannot be withdrawn as cash or transferred to a bank account. All refunds — from backouts or cancellations — are credited to your in-app wallet only. If a top-up payment fails and money is deducted from your account, Razorpay will automatically reverse it to your bank within 5–7 business days.",
  },
  {
    q: "How does team balancing work?",
    a: "Once the game is confirmed, the algorithm builds balanced sides using each player's skill rating, preferred position, and team preference. The organiser gets an edit window to adjust before the team sheet is published to all players.",
  },
  {
    q: "Is my payment information safe?",
    a: "Yes. Kasa Kai never stores your card number, UPI ID, or banking credentials. All payments are processed by Razorpay. We only store your wallet balance and transaction IDs for reconciliation. All traffic is HTTPS-encrypted and payment callbacks are verified via HMAC-SHA256.",
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
          marginBottom: "56px",
        }}>
          FAQ
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
        </div>

      </div>
    </section>
  );
}
