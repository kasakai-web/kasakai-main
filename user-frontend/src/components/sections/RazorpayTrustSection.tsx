"use client";

/* ── Icons ─────────────────────────────────────────────────────────────────── */

function ShieldIcon() {
  return (
    <svg width="90" height="107" viewBox="0 0 84 100" fill="none">
      <defs>
        <linearGradient id="rzpSG" x1="42" y1="0" x2="42" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <path d="M42 0L6 12V46C6 70 42 100 42 100C42 100 78 70 78 46V12L42 0Z" fill="url(#rzpSG)" />
      <path d="M42 3L9 13.5V46C9 68 42 96 42 96C42 96 75 68 75 46V13.5L42 3Z"
        stroke="white" strokeOpacity="0.18" strokeWidth="1" />
      {/* Razorpay slash */}
      <path d="M46.5 32H29.5L24 43H30L21.5 68H30.5L41.5 43H34L46.5 32Z" fill="rgba(255,255,255,0.28)" />
    </svg>
  );
}

function AuthIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9.5 9.2L11.2 11L14.5 7.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 16.5L6.5 22L12 20L17.5 22L15.5 16.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FraudIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <path d="M12 21C12 21 4 17 4 11V5L12 2L20 5V11C20 17 12 21 12 21Z"
        stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 11.5L11 13.5L15.5 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 8V12L14.5 14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 5L21 8L17.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Data ───────────────────────────────────────────────────────────────────── */

const BENEFITS = [
  {
    icon: <AuthIcon />,
    num: "01",
    title: "Authentic\nBusiness",
    desc: "Verified & KYC-compliant merchant, registered with Razorpay.",
  },
  {
    icon: <FraudIcon />,
    num: "02",
    title: "Fraud-proof\nTransactions",
    desc: "Every payment verified via HMAC-SHA256 signature. No spoofing.",
  },
  {
    icon: <ClockIcon />,
    num: "03",
    title: "Fast Dispute\nResolution",
    desc: "Payment disputes handled with priority through Razorpay support.",
  },
];

/* ── Component ──────────────────────────────────────────────────────────────── */

export function RazorpayTrustSection() {
  return (
    <section
      id="trust"
      style={{ background: "var(--black)", borderTop: "1px solid var(--border)" }}
    >
      <style>{`
        /* ── Strip row ── */
        .rzp-strip {
          display: flex;
          align-items: stretch;
        }

        /* ── Brand column ── */
        .rzp-brand {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 20px;
          padding: 52px 56px;
          border-right: 1px solid var(--border);
          flex-shrink: 0;
          min-width: 240px;
          background: radial-gradient(circle at 50% 38%, rgba(59,130,246,0.10) 0%, transparent 68%);
          position: relative;
        }

        /* ── Benefits row ── */
        .rzp-benefits {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
        }
        .rzp-benefit {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 44px 36px;
          border-left: 1px solid var(--border);
          transition: background 0.22s;
        }
        .rzp-benefit:first-child {
          border-left: none;
        }
        .rzp-benefit:hover {
          background: rgba(59,130,246,0.028);
        }

        /* ── Fine print ── */
        .rzp-fine {
          border-top: 1px solid var(--border);
          padding: 13px 40px;
          text-align: center;
          font-family: var(--body);
          font-size: 11.5px;
          color: var(--muted);
          opacity: 0.45;
          letter-spacing: .05em;
        }

        /* ── Shield glow ── */
        .rzp-shield-glow {
          filter: drop-shadow(0 8px 24px rgba(59,130,246,0.40));
        }

        /* ── Trusted badge ── */
        .rzp-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: var(--mono);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: .26em;
          text-transform: uppercase;
          color: var(--lime);
          background: rgba(196,213,108,0.07);
          border: 1px solid rgba(196,213,108,0.22);
          padding: 5px 11px;
        }
        .rzp-badge-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--lime);
          flex-shrink: 0;
        }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .rzp-strip { flex-direction: column; }
          .rzp-brand {
            border-right: none;
            border-bottom: 1px solid var(--border);
            flex-direction: row;
            text-align: left;
            padding: 36px 28px;
            gap: 24px;
            min-width: unset;
            justify-content: flex-start;
            background: radial-gradient(circle at 20% 50%, rgba(59,130,246,0.08) 0%, transparent 65%);
          }
          .rzp-brand-text { align-items: flex-start !important; }
          .rzp-benefit { padding: 32px 24px; }
          .rzp-benefit:first-child { border-left: none; }
          .rzp-fine { padding: 13px 28px; }
        }

        @media (max-width: 560px) {
          .rzp-brand { flex-direction: column; text-align: center; align-items: center; }
          .rzp-brand-text { align-items: center !important; }
          .rzp-benefits { grid-template-columns: 1fr; }
          .rzp-benefit {
            border-left: none;
            border-top: 1px solid var(--border);
            flex-direction: row;
            align-items: flex-start;
            gap: 18px;
            padding: 28px 24px;
          }
          .rzp-benefit-text { flex: 1; }
          .rzp-fine { font-size: 11px; }
        }
      `}</style>

      {/* ── Main strip ── */}
      <div className="rzp-strip">

        {/* Brand */}
        <div className="rzp-brand reveal">
          <div className="rzp-shield-glow">
            <ShieldIcon />
          </div>
          <div
            className="rzp-brand-text"
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}
          >
            <h3 style={{
              fontFamily: "var(--cond)",
              fontWeight: 900,
              fontStyle: "italic",
              fontSize: "clamp(30px, 3.5vw, 42px)",
              letterSpacing: "-.02em",
              color: "var(--white)",
              lineHeight: 0.95,
            }}>
              razorpay
            </h3>
            <span className="rzp-badge">
              <span className="rzp-badge-dot" />
              TRUSTED BUSINESS
            </span>
          </div>
        </div>

        {/* Benefits */}
        <div className="rzp-benefits">
          {BENEFITS.map((b, i) => (
            <div key={i} className={`rzp-benefit reveal d${i + 1}`}>

              {/* Icon + number */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  color: "#5b9cf6",
                  width: 48,
                  height: 48,
                  borderRadius: "10px",
                  background: "rgba(59,130,246,0.07)",
                  border: "1px solid rgba(59,130,246,0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {b.icon}
                </div>
                <span style={{
                  fontFamily: "var(--mono)",
                  fontSize: "11px",
                  color: "#2e2e2e",
                  letterSpacing: ".1em",
                  fontWeight: 500,
                }}>
                  {b.num}
                </span>
              </div>

              {/* Text */}
              <div className="rzp-benefit-text">
                <p style={{
                  fontFamily: "var(--cond)",
                  fontWeight: 800,
                  fontSize: "clamp(20px, 2.2vw, 26px)",
                  letterSpacing: ".01em",
                  color: "var(--white)",
                  lineHeight: 1.05,
                  marginBottom: "8px",
                  whiteSpace: "pre-line",
                }}>
                  {b.title}
                </p>
                <p style={{
                  fontFamily: "var(--body)",
                  fontSize: "13.5px",
                  color: "var(--muted)",
                  lineHeight: 1.65,
                  fontWeight: 400,
                }}>
                  {b.desc}
                </p>
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* Fine print */}
      <div className="rzp-fine reveal">
        All payments are processed securely by Razorpay — Kasa Kai never stores your card, UPI ID, or banking credentials.
      </div>
    </section>
  );
}
