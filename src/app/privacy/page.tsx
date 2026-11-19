import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Kasa Kai",
  description: "How Kasa Kai collects, uses, and protects your personal data.",
};

const sections = [
  { id: "collect",   title: "Information We Collect" },
  { id: "use",       title: "How We Use It" },
  { id: "razorpay",  title: "Payment Data & Razorpay" },
  { id: "sharing",   title: "Data Sharing" },
  { id: "security",  title: "Data Security" },
  { id: "retention", title: "Data Retention" },
  { id: "rights",    title: "Your Rights" },
  { id: "cookies",   title: "Cookies" },
  { id: "contact",   title: "Contact" },
];

export default function PrivacyPolicyPage() {
  return (
    <>
      <style>{`
        .legal-toc-link {
          font-size: 13px; color: var(--muted); text-decoration: none;
          padding: 8px 12px; border-left: 1px solid var(--border);
          display: flex; gap: 10px; align-items: center;
          transition: color 0.15s, border-color 0.15s;
        }
        .legal-toc-link:hover { color: var(--white); border-left-color: var(--violet); }
        .legal-nav-link { font-size: 12px; color: var(--muted); text-decoration: none; letter-spacing: 0.08em; text-transform: uppercase; transition: color 0.15s; }
        .legal-nav-link:hover { color: var(--white); }
        .legal-footer-link { font-size: 12px; color: var(--muted); text-decoration: none; letter-spacing: 0.08em; text-transform: uppercase; transition: color 0.15s; }
        .legal-footer-link:hover { color: var(--violet); }
        .data-card { border: 1px solid var(--border); padding: 16px 18px; margin-bottom: 10px; transition: border-color 0.15s; }
        .data-card:hover { border-color: rgba(138,123,199,0.4); }
        .security-card { border: 1px solid var(--border); padding: 14px 16px; transition: border-color 0.15s; }
        .security-card:hover { border-color: rgba(138,123,199,0.4); }
        @media (max-width: 767px) {
          .legal-layout { grid-template-columns: 1fr !important; }
          .legal-sidebar { display: none !important; }
          .legal-hero { padding: 48px 20px 36px !important; }
          .legal-body { padding: 40px 20px !important; }
          .legal-nav { padding: 0 20px !important; }
          .security-grid { grid-template-columns: 1fr !important; }
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
            <Link href="/refund-policy" className="legal-nav-link">Refunds</Link>
          </div>
        </nav>

        {/* Hero */}
        <div className="legal-hero" style={{
          borderBottom: "1px solid var(--border)", padding: "72px 40px 56px",
          background: "linear-gradient(180deg, rgba(138,123,199,0.06) 0%, transparent 100%)",
        }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <p style={{ fontFamily: "var(--cond)", fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--violet)", marginBottom: 16 }}>Legal</p>
            <h1 style={{ fontFamily: "var(--cond)", fontSize: "clamp(52px, 8vw, 96px)", fontWeight: 900, lineHeight: 0.92, textTransform: "uppercase", color: "var(--white)", marginBottom: 24 }}>
              Privacy<br /><span style={{ color: "var(--violet)" }}>Policy</span>
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
                    <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--violet)", minWidth: 18 }}>{String(i + 1).padStart(2, "0")}</span>
                    {s.title}
                  </a>
                ))}
              </nav>

              <div style={{ marginTop: 40, border: "1px solid var(--border)", padding: 16 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 14, fontFamily: "var(--cond)" }}>We Store</p>
                {[
                  { label: "Name & Phone", icon: "👤" },
                  { label: "Wallet Balance", icon: "💰" },
                  { label: "Game History", icon: "⚽" },
                  { label: "Order IDs only", icon: "🔑" },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, fontSize: 12, color: "var(--muted)" }}>
                    <span style={{ fontSize: 14 }}>{item.icon}</span>
                    {item.label}
                  </div>
                ))}
                <p style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)", fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>
                  We never store card numbers or bank credentials.
                </p>
              </div>
            </aside>

            {/* Content */}
            <main>
              <Section id="collect" num="01" title="Information We Collect" accent="violet">
                <div className="data-card">
                  <p style={{ fontFamily: "var(--cond)", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--white)", marginBottom: 6 }}>Account Information</p>
                  <p style={{ fontSize: 14, color: "#999", lineHeight: 1.65 }}>Name, phone number, email address, and profile picture when you register.</p>
                </div>
                <div className="data-card" style={{ border: "1px solid rgba(138,123,199,0.35)", background: "rgba(138,123,199,0.04)" }}>
                  <p style={{ fontFamily: "var(--cond)", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--violet)", marginBottom: 6 }}>Payment Information</p>
                  <p style={{ fontSize: 14, color: "#999", lineHeight: 1.65 }}>We do not store your card numbers, UPI IDs, or banking credentials. All payment processing is handled by Razorpay. We store only your wallet balance, transaction history, and Razorpay order/payment IDs for reconciliation.</p>
                </div>
                <div className="data-card">
                  <p style={{ fontFamily: "var(--cond)", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--white)", marginBottom: 6 }}>Usage Data</p>
                  <p style={{ fontSize: 14, color: "#999", lineHeight: 1.65 }}>Game registrations, session history, and platform interactions to improve our service.</p>
                </div>
              </Section>

              <Section id="use" num="02" title="How We Use Your Information" accent="violet">
                <Bullets accent="violet" items={[
                  "To create and manage your account.",
                  "To process wallet top-ups and game payments.",
                  "To send transactional emails (payment confirmations, game reminders, refund notifications).",
                  "To send OTP-based login verification via SMS.",
                  "To improve platform features and resolve disputes.",
                ]} />
              </Section>

              <Section id="razorpay" num="03" title="Payment Data & Razorpay" accent="violet">
                <Callout color="violet">Kasa Kai never sees your card number, UPI ID, or bank account details. All payment instrument data is handled exclusively by Razorpay.</Callout>
                <P>Your payments are processed by Razorpay Software Private Limited. Razorpay collects and processes payment instrument details per their own{" "}
                  <a href="https://razorpay.com/privacy/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--violet)", textDecoration: "none" }}>Privacy Policy ↗</a>.
                  Kasa Kai receives only a transaction confirmation and an order ID — never your card or bank details.
                </P>
              </Section>

              <Section id="sharing" num="04" title="Data Sharing" accent="violet">
                <P>We do not sell, rent, or trade your personal information to third parties. We share data only with:</P>
                <Bullets accent="violet" items={[
                  "Razorpay — for payment processing.",
                  "Fast2SMS — for OTP delivery via SMS.",
                  "Law enforcement — when required by law or to protect platform integrity.",
                ]} />
              </Section>

              <Section id="security" num="05" title="Data Security" accent="violet">
                <P>We use industry-standard security practices to protect your data:</P>
                <div className="security-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 14 }}>
                  {[
                    { label: "HTTPS", desc: "All traffic encrypted in transit" },
                    { label: "JWT Auth", desc: "Stateless, signed tokens" },
                    { label: "Bcrypt", desc: "Passwords hashed, never plain" },
                    { label: "HMAC-SHA256", desc: "All payment callbacks verified" },
                  ].map((item) => (
                    <div key={item.label} className="security-card">
                      <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--violet)", marginBottom: 4 }}>{item.label}</p>
                      <p style={{ fontSize: 13, color: "var(--muted)" }}>{item.desc}</p>
                    </div>
                  ))}
                </div>
              </Section>

              <Section id="retention" num="06" title="Data Retention" accent="violet">
                <P>We retain your account and transaction data for as long as your account is active and for up to 5 years after account closure for financial compliance purposes.</P>
              </Section>

              <Section id="rights" num="07" title="Your Rights" accent="violet">
                <P>You may request access to, correction of, or deletion of your personal data by contacting us at{" "}
                  <a href="mailto:contact@kasakai.in" style={{ color: "var(--violet)", textDecoration: "none" }}>contact@kasakai.in</a>.
                  Note that deletion of payment records may be restricted by legal or regulatory requirements.
                </P>
              </Section>

              <Section id="cookies" num="08" title="Cookies" accent="violet">
                <P>Kasa Kai uses minimal cookies for session management (JWT token storage). We do not use advertising or tracking cookies.</P>
              </Section>

              <Section id="contact" num="09" title="Contact" accent="violet">
                <P>For privacy-related queries, contact{" "}
                  <a href="mailto:contact@kasakai.in" style={{ color: "var(--violet)", textDecoration: "none" }}>contact@kasakai.in</a>.
                  We aim to respond within 2 business days.
                </P>
              </Section>

              <div style={{ marginTop: 64, paddingTop: 28, borderTop: "1px solid var(--border)", display: "flex", gap: 24, flexWrap: "wrap" }}>
                <Link href="/terms" className="legal-footer-link">→ Terms &amp; Conditions</Link>
                <Link href="/refund-policy" className="legal-footer-link">→ Refund Policy</Link>
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

function Bullets({ items, accent = "lime" }: { items: string[]; accent?: "lime" | "electric" | "violet" }) {
  const colors = { lime: "var(--lime)", electric: "var(--electric)", violet: "var(--violet)" };
  return (
    <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ width: 4, height: 4, borderRadius: "50%", background: colors[accent], flexShrink: 0, marginTop: 9 }} />
          <span style={{ fontSize: 15, lineHeight: 1.8, color: "#999" }}>{item}</span>
        </li>
      ))}
    </ul>
  );
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
