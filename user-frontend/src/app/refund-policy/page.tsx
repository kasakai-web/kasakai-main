import Link from "next/link";

export const metadata = {
  title: "Refund Policy — Kasa Kai",
  description: "Kasa Kai refund policy: all refunds are credited to your in-app wallet.",
};

const sections = [
  { id: "key-point",    title: "Key Point" },
  { id: "topup",        title: "Wallet Top-Up Refunds" },
  { id: "cancellation", title: "Game Cancellation" },
  { id: "backout",      title: "Player Backout" },
  { id: "no-cash",      title: "No Cash Withdrawals" },
  { id: "disputes",     title: "Dispute Resolution" },
];

export default function RefundPolicyPage() {
  return (
    <>
      <style>{`
        .legal-toc-link {
          font-size: 13px;
          color: var(--muted);
          text-decoration: none;
          padding: 8px 12px;
          border-left: 1px solid var(--border);
          display: flex;
          gap: 10px;
          align-items: center;
          transition: color 0.15s, border-color 0.15s;
        }
        .legal-toc-link:hover { color: var(--white); border-left-color: var(--electric); }
        .legal-nav-link { font-size: 12px; color: var(--muted); text-decoration: none; letter-spacing: 0.08em; text-transform: uppercase; transition: color 0.15s; }
        .legal-nav-link:hover { color: var(--white); }
        .legal-footer-link { font-size: 12px; color: var(--muted); text-decoration: none; letter-spacing: 0.08em; text-transform: uppercase; transition: color 0.15s; }
        .legal-footer-link:hover { color: var(--electric); }
        @media (max-width: 767px) {
          .legal-layout { grid-template-columns: 1fr !important; }
          .legal-sidebar { display: none !important; }
          .legal-hero { padding: 48px 20px 36px !important; }
          .legal-body { padding: 40px 20px !important; }
          .legal-nav { padding: 0 20px !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "var(--black)", color: "var(--white)" }}>

        {/* Nav */}
        <nav className="legal-nav" style={{
          borderBottom: "1px solid var(--border)", padding: "0 40px", height: 56,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, background: "rgba(9,9,9,0.96)", backdropFilter: "blur(12px)", zIndex: 50,
        }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <span style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: 20, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--white)" }}>Kasa Kai</span>
          </Link>
          <div style={{ display: "flex", gap: 28 }}>
            <Link href="/terms" className="legal-nav-link">Terms</Link>
            <Link href="/privacy" className="legal-nav-link">Privacy</Link>
          </div>
        </nav>

        {/* Hero */}
        <div className="legal-hero" style={{
          borderBottom: "1px solid var(--border)", padding: "72px 40px 56px",
          background: "linear-gradient(180deg, rgba(111,200,218,0.05) 0%, transparent 100%)",
        }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <p style={{ fontFamily: "var(--cond)", fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--electric)", marginBottom: 16 }}>Legal</p>
            <h1 style={{ fontFamily: "var(--cond)", fontSize: "clamp(52px, 8vw, 96px)", fontWeight: 900, lineHeight: 0.92, textTransform: "uppercase", color: "var(--white)", marginBottom: 24 }}>
              Refund<br /><span style={{ color: "var(--electric)" }}>Policy</span>
            </h1>
            <p style={{ fontSize: 13, color: "var(--muted)", fontFamily: "var(--mono)" }}>Last updated: April 2025 &nbsp;·&nbsp; Version 1.0</p>
          </div>
        </div>

        {/* Body */}
        <div className="legal-body" style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 40px" }}>
          <div className="legal-layout" style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 80, alignItems: "start" }}>

            {/* Sidebar */}
            <aside className="legal-sidebar" style={{ position: "sticky", top: 72 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 16, fontFamily: "var(--cond)" }}>Contents</p>
              <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {sections.map((s, i) => (
                  <a key={s.id} href={`#${s.id}`} className="legal-toc-link">
                    <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--electric)", minWidth: 18 }}>{String(i + 1).padStart(2, "0")}</span>
                    {s.title}
                  </a>
                ))}
              </nav>

              {/* Flow diagram */}
              <div style={{ marginTop: 40, border: "1px solid var(--border)", padding: 16 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 14, fontFamily: "var(--cond)" }}>Refund Flow</p>
                {[
                  { label: "You pay via Razorpay", icon: "💳" },
                  { label: "Wallet is credited", icon: "💰", accent: true },
                  { label: "Game fee deducted", icon: "⚽" },
                  { label: "Refund → Wallet", icon: "↩", accent: true },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 14 }}>{item.icon}</span>
                    <span style={{ fontSize: 12, color: item.accent ? "var(--electric)" : "var(--muted)" }}>{item.label}</span>
                  </div>
                ))}
                <p style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)", fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>
                  Money never returns to your bank account automatically.
                </p>
              </div>
            </aside>

            {/* Content */}
            <main>

              {/* Key point banner */}
              <section id="key-point" style={{ marginBottom: 52, scrollMarginTop: 80 }}>
                <div style={{ border: "1px solid rgba(111,200,218,0.3)", background: "rgba(111,200,218,0.05)", padding: "24px 28px" }}>
                  <p style={{ fontFamily: "var(--cond)", fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--electric)", marginBottom: 10 }}>Most Important</p>
                  <p style={{ fontSize: 16, color: "var(--white)", lineHeight: 1.65, fontWeight: 500 }}>
                    All refunds on Kasa Kai — whether from game cancellations, player backouts, or failed payments — are credited to your{" "}
                    <strong style={{ color: "var(--electric)" }}>in-app wallet</strong>, not to your original payment method or bank account.
                  </p>
                </div>
              </section>

              <Section id="topup" num="01" title="Wallet Top-Up Refunds" accent="electric">
                <P>Once funds have been successfully added to your Kasa Kai wallet, they are non-refundable to your bank account. Wallet credits remain available for use on the platform indefinitely.</P>
                <Callout color="electric">If a wallet top-up payment fails and money is deducted from your account, Razorpay will automatically reverse the charge within 5–7 business days to your original payment method.</Callout>
              </Section>

              <Section id="cancellation" num="02" title="Game Cancellation Refunds" accent="electric">
                <P>If an organiser cancels a game, all registered players receive a full refund credited to their Kasa Kai wallet within minutes of the cancellation.</P>
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0, margin: "20px 0" }}>
                  {["Organiser cancels", "Fees calculated", "Wallet credited", "You're notified"].map((step, i, arr) => (
                    <div key={i} style={{ display: "flex", alignItems: "center" }}>
                      <div style={{ border: "1px solid var(--electric)", padding: "8px 14px", fontSize: 12, color: "var(--electric)", fontFamily: "var(--mono)", background: "rgba(111,200,218,0.06)", whiteSpace: "nowrap" }}>
                        {step}
                      </div>
                      {i < arr.length - 1 && <div style={{ width: 20, height: 1, background: "var(--border)", flexShrink: 0 }} />}
                    </div>
                  ))}
                </div>
              </Section>

              <Section id="backout" num="03" title="Player Backout Refunds" accent="electric">
                <P>If you withdraw from a game before it takes place, your registration fee is refunded to your wallet. The refund amount is subject to the organiser&apos;s backout policy for that specific game.</P>
                <P>Backout fees (if any) will be clearly communicated before you confirm your withdrawal. The net amount is credited to your wallet immediately.</P>
              </Section>

              <Section id="no-cash" num="04" title="No Cash Withdrawals" accent="electric">
                <P>Kasa Kai wallet balances cannot be withdrawn as cash or transferred to a bank account under normal circumstances. All refunds are credited to your in-app wallet only.</P>
                <P>In exceptional circumstances (e.g., account closure), contact us at <a href="mailto:contact@kasakai.in" style={{ color: "var(--electric)", textDecoration: "none" }}>contact@kasakai.in</a> and we will review your case individually.</P>
              </Section>

              <Section id="disputes" num="05" title="Dispute Resolution" accent="electric">
                <P>If you believe a refund has not been credited correctly, contact us within 7 days at <a href="mailto:contact@kasakai.in" style={{ color: "var(--electric)", textDecoration: "none" }}>contact@kasakai.in</a> with your registered phone number and transaction details. We will respond within 3 business days.</P>
              </Section>

              <div style={{ marginTop: 64, paddingTop: 28, borderTop: "1px solid var(--border)", display: "flex", gap: 24, flexWrap: "wrap" }}>
                <Link href="/terms" className="legal-footer-link">→ Terms &amp; Conditions</Link>
                <Link href="/privacy" className="legal-footer-link">→ Privacy Policy</Link>
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}

function Section({ id, num, title, accent = "lime", children }: { id: string; num: string; title: string; accent?: "lime" | "electric" | "violet"; children: React.ReactNode }) {
  const colors = { lime: "var(--lime)", electric: "var(--electric)", violet: "var(--violet)" };
  const c = colors[accent];
  return (
    <section id={id} style={{ marginBottom: 52, scrollMarginTop: 80 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "baseline", marginBottom: 18 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: c, flexShrink: 0 }}>{num}</span>
        <h2 style={{ fontFamily: "var(--cond)", fontSize: 24, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--white)", lineHeight: 1 }}>{title}</h2>
      </div>
      <div style={{ borderLeft: "1px solid var(--border)", paddingLeft: 22 }}>{children}</div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 15, lineHeight: 1.8, color: "#999", marginBottom: 14 }}>{children}</p>;
}

function Callout({ children, color }: { children: React.ReactNode; color: "lime" | "electric" | "violet" }) {
  const map = { lime: { bg: "rgba(196,213,108,0.06)", border: "var(--lime)", text: "var(--lime)" }, electric: { bg: "rgba(111,200,218,0.06)", border: "var(--electric)", text: "var(--electric)" }, violet: { bg: "rgba(138,123,199,0.06)", border: "var(--violet)", text: "var(--violet)" } };
  const c = map[color];
  return (
    <div style={{ background: c.bg, borderLeft: `3px solid ${c.border}`, padding: "14px 18px", marginBottom: 20, fontSize: 14, color: c.text, lineHeight: 1.65, fontWeight: 500 }}>
      {children}
    </div>
  );
}
