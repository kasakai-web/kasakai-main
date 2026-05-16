"use client";


function IconAuth() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9.5 9.2L11.2 11L14.5 7.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 16.5L6.5 22L12 20L17.5 22L15.5 16.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M12 21C12 21 4 17 4 11V5L12 2L20 5V11C20 17 12 21 12 21Z"
        stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 11.5L11 13.5L15.5 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 8V12L14.5 14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Data ───────────────────────────────────────────────────────────────────── */

const BENEFITS = [
  {
    icon: <IconAuth />,
    num: "01",
    title: "AUTHENTIC\nBUSINESS",
    desc: "Verified & KYC-compliant merchant, registered with Razorpay.",
  },
  {
    icon: <IconShield />,
    num: "02",
    title: "FRAUD-PROOF\nTRANSACTIONS",
    desc: "Every payment verified via HMAC-SHA256 signature. No spoofing.",
  },
  {
    icon: <IconClock />,
    num: "03",
    title: "FAST DISPUTE\nRESOLUTION",
    desc: "Payment disputes handled with priority through Razorpay support.",
  },
];

/* ── Component ──────────────────────────────────────────────────────────────── */

export function RazorpayTrustSection() {
  return (
    <section
      id="trust"
      style={{ background: "var(--black)", padding: "80px 0 88px", position: "relative", overflow: "hidden" }}
    >
      <style>{`
        /* ── Animations ── */
        @keyframes rzp-shimmer {
          0%   { transform: translateX(-100%) skewX(-10deg); }
          100% { transform: translateX(260%) skewX(-10deg); }
        }

        @keyframes rzp-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: none; }
        }
        .rzp-card      { animation: rzp-fade-up 0.4s cubic-bezier(0.22,1,0.36,1) both; }
        .rzp-brand     { animation: rzp-fade-up 0.4s cubic-bezier(0.22,1,0.36,1) 0.05s both; }
        .rzp-benefit-1 { animation: rzp-fade-up 0.4s cubic-bezier(0.22,1,0.36,1) 0.08s both; }
        .rzp-benefit-2 { animation: rzp-fade-up 0.4s cubic-bezier(0.22,1,0.36,1) 0.12s both; }
        .rzp-benefit-3 { animation: rzp-fade-up 0.4s cubic-bezier(0.22,1,0.36,1) 0.16s both; }
        .rzp-fine      { animation: rzp-fade-up 0.4s cubic-bezier(0.22,1,0.36,1) 0.18s both; }

        /* ── Page glow — matches Kasakai hero/footer radial style ── */
        .rzp-bg-glow {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(ellipse 900px 480px at 10% 60%, rgba(51,149,255,0.08) 0%, transparent 65%),
            radial-gradient(ellipse 700px 400px at 90% 30%, rgba(196,213,108,0.05) 0%, transparent 60%);
        }

        /* ── Outer wrapper ── */
        .rzp-outer {
          position: relative;
          z-index: 1;
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 clamp(20px, 5vw, 64px);
        }

        /* ── Section label — lime mono like footer nav labels ── */
        .rzp-label-row {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 22px;
        }
        .rzp-label-text {
          font-family: var(--mono);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: var(--lime);
          white-space: nowrap;
        }
        .rzp-label-rule {
          flex: 1;
          max-width: 72px;
          height: 1px;
          background: var(--border);
        }

        /* ── Outer card shell ── */
        .rzp-card {
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(255,255,255,0.022) 0%, rgba(51,149,255,0.04) 100%);
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.06),
            0 40px 90px rgba(0,0,0,0.6),
            0 0 0 1px rgba(51,149,255,0.06);
          overflow: hidden;
        }

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
          gap: 20px;
          padding: 56px 44px;
          border-right: 1px solid rgba(255,255,255,0.07);
          flex-shrink: 0;
          min-width: 264px;
          text-align: center;
          background: radial-gradient(ellipse 250px 230px at 50% 50%, rgba(51,149,255,0.1) 0%, transparent 70%);
        }

        /* ── Razorpay logo on white pill ── */
        .rzp-logo-pill {
          background: #ffffff;
          border-radius: 10px;
          padding: 18px 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            0 6px 28px rgba(0,0,0,0.35),
            0 0 0 1px rgba(255,255,255,0.08);
        }
        .rzp-logo-pill img {
          display: block;
          height: 28px;
          width: auto;
        }

        /* ── Trusted badge ── */
        .rzp-trusted-badge {
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
          padding: 5px 12px;
          border-radius: 2px;
        }
        .rzp-trusted-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: var(--lime);
          flex-shrink: 0;
          box-shadow: 0 0 8px rgba(196,213,108,0.7);
        }

        .rzp-brand-sub {
          font-family: var(--mono);
          font-size: 9.5px;
          color: var(--muted);
          letter-spacing: .1em;
          text-transform: uppercase;
          opacity: 0.5;
          line-height: 1.7;
        }

        /* ── Benefits: now a flex of individual cards with a gap ── */
        .rzp-benefits {
          flex: 1;
          min-width: 0;
          display: flex;
          gap: 14px;
          padding: 22px;
          align-items: stretch;
        }

        /* ── Single benefit card ──
             Gradient border via background-clip trick:
               layer 1 (top) → solid fill clipped to padding-box
               layer 2 (bottom) → gradient clipped to border-box
             The solid fill covers the gradient everywhere except in the
             1px border area, so the gradient shows only on the border.
        ── */
        .rzp-benefit {
          position: relative;
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0;
          padding: 28px 24px 28px;
          border-radius: 10px;
          border: 1px solid transparent;
          background:
            linear-gradient(rgba(10,12,16,0.92), rgba(10,12,16,0.92)) padding-box,
            linear-gradient(135deg, rgba(51,149,255,0.3), rgba(255,255,255,0.06) 50%, rgba(51,149,255,0.13)) border-box;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.05),
            0 4px 20px rgba(0,0,0,0.35);
          overflow: hidden;
          transition:
            transform 0.38s cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 0.38s;
        }

        /* Shimmer sweep — slides left→right on hover */
        .rzp-benefit::before {
          content: '';
          position: absolute;
          top: 0; bottom: 0;
          left: 0; width: 45%;
          background: linear-gradient(90deg, transparent, rgba(51,149,255,0.08), transparent);
          opacity: 0;
          pointer-events: none;
          transform: translateX(-100%) skewX(-10deg);
        }

        /* Corner arc — decorative bracket in top-right */
        .rzp-benefit::after {
          content: '';
          position: absolute;
          top: -1px; right: -1px;
          width: 52px; height: 52px;
          border-bottom-left-radius: 46px;
          border-left: 1px solid rgba(51,149,255,0.15);
          border-bottom: 1px solid rgba(51,149,255,0.15);
          pointer-events: none;
          transition: border-color 0.35s;
        }

        /* Hover: lift + glow + vivid border + shimmer + icon glow */
        .rzp-benefit:hover {
          transform: translateY(-5px);
          background:
            linear-gradient(rgba(9,17,30,0.95), rgba(9,17,30,0.95)) padding-box,
            linear-gradient(135deg, rgba(51,149,255,0.62), rgba(196,213,108,0.22) 50%, rgba(51,149,255,0.42)) border-box;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.07),
            0 20px 56px rgba(51,149,255,0.15),
            0 8px 24px rgba(0,0,0,0.5);
        }
        .rzp-benefit:hover::before {
          opacity: 1;
          animation: rzp-shimmer 2s ease-in-out infinite;
        }
        .rzp-benefit:hover::after {
          border-color: rgba(51,149,255,0.4);
        }

        /* ── Inside a benefit card ── */
        .rzp-benefit-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .rzp-icon-box {
          width: 58px; height: 58px;
          border-radius: 12px;
          background: rgba(51,149,255,0.08);
          border: 1px solid rgba(51,149,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3395FF;
          flex-shrink: 0;
          transition: background 0.3s, border-color 0.3s, box-shadow 0.3s;
        }
        .rzp-benefit:hover .rzp-icon-box {
          background: rgba(51,149,255,0.14);
          border-color: rgba(51,149,255,0.38);
          box-shadow: 0 0 18px rgba(51,149,255,0.22);
        }

        .rzp-num {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: .14em;
          color: rgba(255,255,255,0.11);
          font-weight: 500;
        }

        /* Big all-caps condensed — same style as hero PLAY / SMARTER */
        .rzp-benefit-title {
          font-family: var(--cond);
          font-weight: 900;
          font-size: clamp(16px, 1.4vw, 20px);
          letter-spacing: -.01em;
          color: var(--white);
          line-height: 1.1;
          white-space: pre-line;
          text-transform: uppercase;
          word-break: normal;
          overflow-wrap: normal;
          margin-bottom: 14px;
        }

        /* Thin hairline between title and desc */
        .rzp-benefit-sep {
          height: 1px;
          background: rgba(255,255,255,0.06);
          margin-bottom: 14px;
          flex-shrink: 0;
        }

        .rzp-benefit-desc {
          font-family: var(--body);
          font-size: 13.5px;
          font-weight: 400;
          color: var(--muted);
          line-height: 1.72;
          word-break: break-word;
        }

        /* ── Fine print bar ── */
        .rzp-fine {
          border-top: 1px solid rgba(255,255,255,0.06);
          padding: 13px 40px;
          text-align: center;
          font-family: var(--mono);
          font-size: 10px;
          color: var(--muted);
          letter-spacing: .07em;
          text-transform: uppercase;
          opacity: 0.38;
        }

        /* ── Tablet ── */
        @media (max-width: 960px) {
          .rzp-strip { flex-direction: column; }
          .rzp-brand {
            border-right: none;
            border-bottom: 1px solid rgba(255,255,255,0.07);
            flex-direction: row;
            text-align: left;
            padding: 36px 32px;
            gap: 24px;
            min-width: unset;
            justify-content: flex-start;
            background: radial-gradient(ellipse 320px 180px at 15% 50%, rgba(51,149,255,0.08) 0%, transparent 70%);
          }
          .rzp-brand-inner { align-items: flex-start !important; }
          .rzp-benefits { padding: 20px; gap: 12px; }
          .rzp-benefit { padding: 24px 20px; }
          .rzp-fine { padding: 13px 28px; }
        }

        /* ── Mobile ── */
        @media (max-width: 600px) {
          .rzp-card { border-radius: 10px; }
          .rzp-label-rule { max-width: 36px; }
          .rzp-brand { flex-direction: column; text-align: center; align-items: center; }
          .rzp-brand-inner { align-items: center !important; }
          .rzp-benefits { flex-direction: column; gap: 12px; padding: 16px; }
          .rzp-benefit { padding: 24px 20px; }
          .rzp-benefit-title { font-size: 17px; }
          .rzp-fine { font-size: 9.5px; padding: 13px 20px; }
          /* disable lift on touch screens — no hover intent */
          .rzp-benefit:hover { transform: none; }
        }
      `}</style>

      {/* Page-level glow */}
      <div className="rzp-bg-glow" />

      <div className="rzp-outer">

        <div className="rzp-card">
          <div className="rzp-strip">

            {/* ── Brand ── */}
            <div className="rzp-brand">
              <div
                className="rzp-brand-inner"
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}
              >
                <div className="rzp-logo-pill">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/razorpay-logo.svg" alt="Razorpay" />
                </div>
                <span className="rzp-trusted-badge">
                  <span className="rzp-trusted-dot" />
                  TRUSTED BUSINESS
                </span>
                <span className="rzp-brand-sub">
                  Official Payment<br />Partner
                </span>
              </div>
            </div>

            {/* ── Benefits: 3 individual animated cards ── */}
            <div className="rzp-benefits">
              {BENEFITS.map((b, i) => (
                <div key={i} className={`rzp-benefit rzp-benefit-${i + 1}`}>
                  <div className="rzp-benefit-top">
                    <div className="rzp-icon-box">{b.icon}</div>
                    <span className="rzp-num">{b.num}</span>
                  </div>
                  <p className="rzp-benefit-title">{b.title}</p>
                  <div className="rzp-benefit-sep" />
                  <p className="rzp-benefit-desc">{b.desc}</p>
                </div>
              ))}
            </div>

          </div>

          {/* Fine print */}
          <div className="rzp-fine">
            All payments are processed securely by Razorpay — Kasa Kai never stores your card, UPI ID, or banking credentials.
          </div>
        </div>

      </div>
    </section>
  );
}
