const quickLinks = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/#about" },
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/#pricing" },
];

const productLinks = [
  { label: "Player Login", href: "/login?role=player" },
  { label: "Organiser Login", href: "/login?role=organiser" },
  { label: "Support / FAQ", href: "/#support" },
  { label: "How It Works", href: "/#features2" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        background: "radial-gradient(1200px 420px at 10% 0%, rgba(196, 213, 108, 0.08), transparent 55%), #070707",
        borderTop: "1px solid #1e1e1e",
        width: "100vw",
        marginLeft: "calc(50% - 50vw)",
        padding: "56px 24px 30px",
      }}
    >
      <div style={{ maxWidth: "1160px", margin: "0 auto", width: "100%", padding: "0 clamp(16px, 4vw, 40px)" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "26px",
            marginBottom: "34px",
          }}
        >
          <div style={{ border: "1px solid #1b1b1b", background: "#0d0d0d", padding: "20px" }}>
            <h3
              style={{
                fontFamily: "var(--cond)",
                fontSize: "40px",
                fontWeight: 900,
                letterSpacing: ".1em",
                color: "white",
                lineHeight: 0.9,
                marginBottom: "8px",
              }}
            >
              KASA<span style={{ color: "var(--muted)" }}>KAI</span>
            </h3>
            <p
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10.5px",
                letterSpacing: ".14em",
                color: "var(--muted)",
                marginBottom: "14px",
                textTransform: "uppercase",
              }}
            >
              Organised football. Every time.
            </p>
            <p style={{ color: "#a3a3a3", lineHeight: 1.8, fontSize: "14px" }}>
              Kasa Kai connects players, organisers, and admins on one system built for real match-day operations.
            </p>
          </div>

          <div>
            <p style={{ fontFamily: "var(--mono)", fontSize: "11px", letterSpacing: ".2em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "14px" }}>
              Quick Links
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
              {quickLinks.map((link) => (
                <a key={link.href} href={link.href} style={{ fontSize: "14px", color: "rgba(255,255,255,.68)", textDecoration: "none" }}>
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <p style={{ fontFamily: "var(--mono)", fontSize: "11px", letterSpacing: ".2em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "14px" }}>
              Product
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
              {productLinks.map((link) => (
                <a key={link.href} href={link.href} style={{ fontSize: "14px", color: "rgba(255,255,255,.68)", textDecoration: "none" }}>
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div style={{ border: "1px solid #1f1f1f", background: "rgba(196, 213, 108, 0.05)", padding: "18px" }}>
            <p style={{ fontFamily: "var(--mono)", fontSize: "11px", letterSpacing: ".2em", textTransform: "uppercase", color: "var(--lime)", marginBottom: "14px" }}>
              Contact
            </p>
            <div style={{ display: "grid", gap: "10px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "#7f7f7f", marginBottom: "2px" }}>Name</div>
                <div style={{ fontSize: "15px", color: "#f4efe8", fontWeight: 600 }}>Suneet</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#7f7f7f", marginBottom: "2px" }}>Phone</div>
                <a href="tel:9930931616" style={{ fontSize: "15px", color: "#f4efe8", textDecoration: "none", fontWeight: 600 }}>
                  9930931616
                </a>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#7f7f7f", marginBottom: "2px" }}>Email</div>
                <a href="mailto:contact@kasakai.in" style={{ fontSize: "15px", color: "#f4efe8", textDecoration: "none", fontWeight: 600 }}>
                  contact@kasakai.in
                </a>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #1e1e1e",
            paddingTop: "18px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <p style={{ fontFamily: "var(--mono)", fontSize: "11px", letterSpacing: ".1em", color: "#5f5f5f" }}>
            © {year} Kasa Kai. All rights reserved.
          </p>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <a href="/#about" style={{ fontFamily: "var(--mono)", fontSize: "11px", letterSpacing: ".08em", color: "#6f6f6f", textDecoration: "none" }}>
              Company
            </a>
            <a href="/#support" style={{ fontFamily: "var(--mono)", fontSize: "11px", letterSpacing: ".08em", color: "#6f6f6f", textDecoration: "none" }}>
              Support
            </a>
            <a href="mailto:contact@kasakai.in" style={{ fontFamily: "var(--mono)", fontSize: "11px", letterSpacing: ".08em", color: "#6f6f6f", textDecoration: "none" }}>
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
