"use client";

function ShieldIcon() {
  return (
    <svg width="72" height="86" viewBox="0 0 84 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rzpShieldGrad" x1="42" y1="0" x2="42" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d5e87a" />
          <stop offset="1" stopColor="#9ab83c" />
        </linearGradient>
      </defs>
      <path d="M42 0L6 12V46C6 70 42 100 42 100C42 100 78 70 78 46V12L42 0Z" fill="url(#rzpShieldGrad)" />
      <path d="M42 2L8 13V46C8 68 42 96 42 96C42 96 76 68 76 46V13L42 2Z" stroke="white" strokeOpacity="0.18" strokeWidth="1.5" />
      {/* Razorpay slash mark */}
      <path d="M46.5 32H29.5L24 43H30L21.5 68H30.5L41.5 43H34L46.5 32Z" fill="rgba(0,0,0,0.42)" />
    </svg>
  );
}

function AuthenticIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="9" r="6" stroke="#c4d56c" strokeWidth="1.8" />
      <path d="M9.5 9.2L11.2 11L14.5 7.5" stroke="#c4d56c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 16.5L6.5 22L12 20L17.5 22L15.5 16.5" stroke="#c4d56c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FraudIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 21C12 21 4 17 4 11V5L12 2L20 5V11C20 17 12 21 12 21Z" stroke="#c4d56c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 11.5L11 13.5L15.5 9" stroke="#c4d56c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DisputeIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke="#c4d56c" strokeWidth="1.8" />
      <path d="M12 7.5V12L15 14.5" stroke="#c4d56c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.5 4.5L21 8L17.5 8" stroke="#c4d56c" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type BenefitProps = {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
};

function Benefit({ icon, title, subtitle }: BenefitProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "14px" }}>
      <div style={{
        width: 68,
        height: 68,
        borderRadius: "16px",
        background: "rgba(196,213,108,0.07)",
        border: "1px solid rgba(196,213,108,0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <p style={{
          fontFamily: "var(--cond)",
          fontWeight: 800,
          fontSize: "17px",
          letterSpacing: ".02em",
          color: "var(--white)",
          lineHeight: 1.2,
          marginBottom: "2px",
        }}>
          {title}
        </p>
        <p style={{
          fontFamily: "var(--body)",
          fontSize: "13px",
          color: "var(--muted)",
          fontWeight: 500,
        }}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}

export function RazorpayTrustSection() {
  return (
    <section
      id="trust"
      style={{
        background: "var(--black)",
        padding: "80px 0 100px",
        borderTop: "1px solid var(--border)",
      }}
    >
      <style>{`
        .rzp-trust-card {
          display: flex;
          flex-direction: row;
          align-items: center;
        }
        .rzp-brand {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          flex-shrink: 0;
          padding-right: 52px;
          margin-right: 52px;
          border-right: 1px solid var(--border);
        }
        .rzp-grid {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 36px;
        }
        @media (max-width: 760px) {
          .rzp-trust-card { flex-direction: column; }
          .rzp-brand {
            border-right: none;
            border-bottom: 1px solid var(--border);
            padding-right: 0;
            margin-right: 0;
            padding-bottom: 36px;
            margin-bottom: 36px;
            width: 100%;
          }
          .rzp-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            width: 100%;
          }
        }
        @media (max-width: 480px) {
          .rzp-grid { grid-template-columns: 1fr; gap: 28px; }
        }
        .rzp-shield-wrap {
          filter: drop-shadow(0 8px 18px rgba(196,213,108,0.22));
          margin-bottom: 20px;
        }
      `}</style>

      <div className="container">

        {/* Label */}
        <p
          className="reveal"
          style={{
            fontFamily: "var(--mono)",
            fontSize: "10px",
            letterSpacing: ".22em",
            textTransform: "uppercase",
            color: "var(--muted)",
            marginBottom: "40px",
            textAlign: "center",
          }}
        >
          Payments & Security
        </p>

        {/* Card */}
        <div
          className="rzp-trust-card reveal"
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(196,213,108,0.14)",
            borderRadius: "20px",
            padding: "clamp(28px,5vw,56px)",
          }}
        >

          {/* ── Brand ── */}
          <div className="rzp-brand">
            <div className="rzp-shield-wrap">
              <ShieldIcon />
            </div>
            <h3 style={{
              fontFamily: "var(--cond)",
              fontWeight: 900,
              fontStyle: "italic",
              fontSize: "clamp(22px,3.5vw,30px)",
              letterSpacing: "-.02em",
              color: "var(--white)",
              lineHeight: 1,
              marginBottom: "5px",
            }}>
              razorpay
            </h3>
            <p style={{
              fontFamily: "var(--cond)",
              fontWeight: 800,
              fontSize: "10px",
              letterSpacing: ".26em",
              textTransform: "uppercase",
              color: "var(--lime)",
            }}>
              TRUSTED BUSINESS
            </p>
          </div>

          {/* ── Benefits ── */}
          <div className="rzp-grid">
            <Benefit
              icon={<AuthenticIcon />}
              title="Authentic"
              subtitle="Business"
            />
            <Benefit
              icon={<FraudIcon />}
              title="Fraud-proof"
              subtitle="Transactions"
            />
            <Benefit
              icon={<DisputeIcon />}
              title="Fast Dispute"
              subtitle="Resolution"
            />
          </div>

        </div>

        {/* Fine print */}
        <p
          className="reveal"
          style={{
            fontFamily: "var(--body)",
            fontSize: "12px",
            color: "var(--muted)",
            textAlign: "center",
            marginTop: "20px",
            opacity: 0.6,
          }}
        >
          All payments are processed securely by Razorpay. Kasa Kai never stores your card or banking credentials.
        </p>

      </div>
    </section>
  );
}
