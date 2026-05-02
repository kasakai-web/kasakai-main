import Link from "next/link";

export const metadata = {
  title: "Terms & Conditions — Kasa Kai",
  description: "Terms and conditions for using the Kasa Kai football platform.",
};

const sections = [
  { id: "acceptance",    title: "Acceptance of Terms" },
  { id: "platform",      title: "Platform Description" },
  { id: "wallet",        title: "Wallet & Payments" },
  { id: "games",         title: "Game Registrations" },
  { id: "conduct",       title: "User Conduct" },
  { id: "liability",     title: "Limitation of Liability" },
  { id: "modifications", title: "Modifications" },
  { id: "governing",     title: "Governing Law" },
  { id: "contact",       title: "Contact" },
];

export default function TermsPage() {
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
        .legal-toc-link:hover {
          color: var(--white);
          border-left-color: var(--lime);
        }
        .legal-nav-link {
          font-size: 12px;
          color: var(--muted);
          text-decoration: none;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition: color 0.15s;
        }
        .legal-nav-link:hover { color: var(--white); }
        .legal-footer-link {
          font-size: 12px;
          color: var(--muted);
          text-decoration: none;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition: color 0.15s;
        }
        .legal-footer-link:hover { color: var(--lime); }
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
          borderBottom: "1px solid var(--border)",
          padding: "0 40px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          background: "rgba(9,9,9,0.96)",
          backdropFilter: "blur(12px)",
          zIndex: 50,
        }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <span style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: 20, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--white)" }}>
              Kasa Kai
            </span>
          </Link>
          <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
            <Link href="/refund-policy" className="legal-nav-link">Refund Policy</Link>
            <Link href="/privacy" className="legal-nav-link">Privacy</Link>
          </div>
        </nav>

        {/* Hero */}
        <div className="legal-hero" style={{
          borderBottom: "1px solid var(--border)",
          padding: "72px 40px 56px",
          background: "linear-gradient(180deg, rgba(196,213,108,0.05) 0%, transparent 100%)",
        }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <p style={{ fontFamily: "var(--cond)", fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--lime)", marginBottom: 16 }}>
              Legal
            </p>
            <h1 style={{
              fontFamily: "var(--cond)",
              fontSize: "clamp(52px, 8vw, 96px)",
              fontWeight: 900,
              lineHeight: 0.92,
              textTransform: "uppercase",
              color: "var(--white)",
              marginBottom: 24,
            }}>
              Terms &amp;<br />
              <span style={{ color: "var(--lime)" }}>Conditions</span>
            </h1>
            <p style={{ fontSize: 13, color: "var(--muted)", fontFamily: "var(--mono)" }}>
              Last updated: April 2025 &nbsp;·&nbsp; Version 1.0
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="legal-body" style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 40px" }}>
          <div className="legal-layout" style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 80, alignItems: "start" }}>

            {/* Sidebar */}
            <aside className="legal-sidebar" style={{ position: "sticky", top: 72 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 16, fontFamily: "var(--cond)" }}>
                Contents
              </p>
              <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {sections.map((s, i) => (
                  <a key={s.id} href={`#${s.id}`} className="legal-toc-link">
                    <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--lime)", minWidth: 18 }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {s.title}
                  </a>
                ))}
              </nav>

              <div style={{ marginTop: 40, padding: 16, border: "1px solid var(--border)" }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10, fontFamily: "var(--cond)" }}>
                  Questions?
                </p>
                <a href="mailto:contact@kasakai.in" style={{ fontSize: 13, color: "var(--lime)", textDecoration: "none" }}>
                  contact@kasakai.in
                </a>
              </div>
            </aside>

            {/* Content */}
            <main>
              <Section id="acceptance" num="01" title="Acceptance of Terms">
                <P>By accessing or using the Kasa Kai platform — including the web application, mobile application, or any related services — you agree to be bound by these Terms &amp; Conditions. If you do not agree, please do not use our services.</P>
              </Section>

              <Section id="platform" num="02" title="Platform Description">
                <P>Kasa Kai is a football game organisation platform that allows organisers to create and manage football sessions, and players to discover, join, and pay for those sessions using their in-app wallet.</P>
              </Section>

              <Section id="wallet" num="03" title="Wallet & Payments">
                <Callout color="lime">All payments on Kasa Kai flow through your in-app wallet — not directly to or from your bank account.</Callout>
                <Bullets items={[
                  "Kasa Kai operates an in-app wallet. Funds added can only be used to pay for game slots on the platform.",
                  "All wallet top-ups are processed through Razorpay. By making a payment you also agree to Razorpay's terms of service.",
                  "Wallet balances are non-transferable and cannot be converted to cash except as described in our Refund Policy.",
                  "Kasa Kai is not a banking institution. Wallet funds do not earn interest.",
                ]} />
              </Section>

              <Section id="games" num="04" title="Game Registrations">
                <Bullets items={[
                  "When you register for a game, the applicable fee is debited from your wallet immediately.",
                  "If you cancel your registration, a refund will be credited to your wallet — not your bank account — per our Refund Policy.",
                  "If a game is cancelled by the organiser, the full registration fee will be refunded to your wallet within minutes.",
                ]} />
              </Section>

              <Section id="conduct" num="05" title="User Conduct">
                <Bullets items={[
                  "You agree not to use the platform for any unlawful purpose or in any way that could damage or impair our services.",
                  "You are responsible for maintaining the confidentiality of your account credentials.",
                  "You must not attempt to manipulate or exploit the wallet or payment systems in any way.",
                ]} />
              </Section>

              <Section id="liability" num="06" title="Limitation of Liability">
                <P>Kasa Kai shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform. Our maximum liability is limited to the amount currently held in your wallet at the time of the incident.</P>
              </Section>

              <Section id="modifications" num="07" title="Modifications">
                <P>We reserve the right to modify these Terms at any time. We will notify users of material changes via email or in-app notification. Continued use of the platform constitutes acceptance of the revised Terms.</P>
              </Section>

              <Section id="governing" num="08" title="Governing Law">
                <P>These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Bengaluru, Karnataka.</P>
              </Section>

              <Section id="contact" num="09" title="Contact">
                <P>For any questions regarding these Terms, reach us at{" "}
                  <a href="mailto:contact@kasakai.in" style={{ color: "var(--lime)", textDecoration: "none" }}>contact@kasakai.in</a>.
                  We aim to respond within 2 business days.
                </P>
              </Section>

              <div style={{ marginTop: 64, paddingTop: 28, borderTop: "1px solid var(--border)", display: "flex", gap: 24, flexWrap: "wrap" }}>
                <Link href="/refund-policy" className="legal-footer-link">→ Refund Policy</Link>
                <Link href="/privacy" className="legal-footer-link">→ Privacy Policy</Link>
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}

function Section({ id, num, title, children }: { id: string; num: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: 52, scrollMarginTop: 80 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "baseline", marginBottom: 18 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--lime)", flexShrink: 0 }}>{num}</span>
        <h2 style={{ fontFamily: "var(--cond)", fontSize: 24, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--white)", lineHeight: 1 }}>{title}</h2>
      </div>
      <div style={{ borderLeft: "1px solid var(--border)", paddingLeft: 22 }}>{children}</div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 15, lineHeight: 1.8, color: "#999", marginBottom: 14 }}>{children}</p>;
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--lime)", flexShrink: 0, marginTop: 9 }} />
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
