import Link from "next/link";

const quickLinks = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/#about" },
  { label: "Football", href: "/login?role=player" },
  { label: "Screening Events", href: "/screening" },
  { label: "Turf Events", href: "/dashboard" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        background: "radial-gradient(1400px 500px at 10% -5%, rgba(196, 213, 108, 0.12), transparent 60%), linear-gradient(180deg, rgba(7, 7, 7, 0.4) 0%, #0a0a0a 100%)",
        borderTop: "1px solid #1a1a1a",
        width: "100vw",
        marginLeft: "calc(50% - 50vw)",
        padding: "50px 24px 30px",
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto", width: "100%", padding: "0 clamp(16px, 4vw, 40px)" }}>
        {/* Main Footer Content */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.8fr 1.2fr 1.2fr",
            gap: "48px",
            marginBottom: "60px",
          }}
        >
          {/* Brand Section */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: "48px",
                  height: "48px",
                  overflow: "hidden",
                  border: "1.5px solid #333",
                  flexShrink: 0,
                }}
              >
                <div style={{ flex: 1, background: "var(--white)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "9px", letterSpacing: "0.08em", color: "#000" }}>KASA</span>
                </div>
                <div style={{ flex: 1, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", borderTop: "1.5px solid #333" }}>
                  <span style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "9px", letterSpacing: "0.08em", color: "var(--white)" }}>KAI</span>
                </div>
              </div>
              <h2
                style={{
                  fontFamily: "var(--cond)",
                  fontSize: "38px",
                  fontWeight: 900,
                  letterSpacing: ".08em",
                  color: "white",
                  lineHeight: 1,
                  margin: 0,
                }}
              >
                KASA<span style={{ color: "var(--lime)" }}>KAI</span>
              </h2>
            </div>
            <p style={{ color: "#999", lineHeight: 1.7, fontSize: "14px", fontWeight: 400, margin: "0" }}>
              We specialise in organising simple yet fulfilling events around your hobbies. Top event types include screenings, turf meets and open mics across Indian cities
            </p>
          </div>

          {/* Navigation Links */}
          <div>
            <p style={{ fontFamily: "var(--mono)", fontSize: "11px", letterSpacing: ".15em", textTransform: "uppercase", color: "var(--lime)", marginBottom: "18px", margin: "0 0 18px 0", fontWeight: 600 }}>
              Navigate
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    fontSize: "14px",
                    color: "#ccc",
                    textDecoration: "none",
                    fontWeight: 500,
                    letterSpacing: ".01em",
                    transition: "color 0.3s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--lime)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#ccc")}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Support Section - REMOVED */}

          {/* Contact Info */}
          <div>
            <p style={{ fontFamily: "var(--mono)", fontSize: "11px", letterSpacing: ".15em", textTransform: "uppercase", color: "var(--lime)", marginBottom: "18px", margin: "0 0 18px 0", fontWeight: 600 }}>
              Get In Touch
            </p>
            <div style={{ display: "grid", gap: "16px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px", fontWeight: 500 }}>Email</div>
                <a href="mailto:contact@kasakai.in" style={{ fontSize: "14px", color: "#f4efe8", textDecoration: "none", fontWeight: 600, transition: "color 0.3s ease" }}>
                  contact@kasakai.in
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #1a1a1a",
            paddingTop: "16px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <p style={{ fontFamily: "var(--mono)", fontSize: "12px", letterSpacing: ".05em", color: "white", fontWeight: 500, margin: "0" }}>
            © {year} Kasa Kai. All rights reserved.
          </p>
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
            <a href="/#about" style={{ fontFamily: "var(--mono)", fontSize: "12px", letterSpacing: ".05em", color: "white", textDecoration: "none", fontWeight: 500, transition: "color 0.3s ease" }}>
              Privacy Policy
            </a>
            <a href="/#support" style={{ fontFamily: "var(--mono)", fontSize: "12px", letterSpacing: ".05em", color: "white", textDecoration: "none", fontWeight: 500, transition: "color 0.3s ease" }}>
              Terms & Conditions
            </a>
          </div>
        </div>
      </div>

      <style jsx>{`
        a:hover {
          color: var(--lime) !important;
        }

        @media (max-width: 1200px) {
          footer {
            padding: 50px 24px 30px !important;
          }
          footer > div > div:first-of-type {
            grid-template-columns: 1.5fr 1fr 1fr !important;
            gap: 40px !important;
            margin-bottom: 50px !important;
          }
        }

        @media (max-width: 1024px) {
          footer {
            padding: 45px 20px 26px !important;
          }
          footer > div > div:first-of-type {
            grid-template-columns: 1fr 1fr !important;
            gap: 36px !important;
            margin-bottom: 40px !important;
          }
          footer > div > div:first-of-type > div:first-child {
            grid-column: 1 / -1 !important;
          }
        }

        @media (max-width: 768px) {
          footer {
            padding: 40px 16px 24px !important;
          }
          footer > div > div:first-of-type {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
            margin-bottom: 36px !important;
          }
          footer > div > div:first-of-type > div:first-child h2 {
            font-size: 28px !important;
          }
          footer > div > div:first-of-type > div:first-child p {
            font-size: 13px !important;
          }
          footer > div > div:last-of-type {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 14px !important;
          }
        }

        @media (max-width: 480px) {
          footer {
            padding: 30px 12px 20px !important;
          }
          footer > div > div:first-of-type {
            gap: 28px !important;
            margin-bottom: 32px !important;
          }
          footer > div > div:first-of-type > div:first-child {
            gap: 12px !important;
          }
          footer > div > div:first-of-type > div:first-child h2 {
            font-size: 24px !important;
          }
          footer > div > div:first-of-type > div:first-child p {
            font-size: 12px !important;
            line-height: 1.6 !important;
          }
          footer > div > div:first-of-type > div {
            gap: 10px !important;
          }
          footer > div > div:first-of-type > div p {
            margin-bottom: 12px !important;
            font-size: 10px !important;
          }
          footer > div > div:first-of-type > div a {
            font-size: 13px !important;
          }
          footer > div > div:last-of-type {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
            font-size: 11px !important;
          }
          footer > div > div:last-of-type > div {
            gap: 16px !important;
          }
        }
      `}</style>
    </footer>
  );
}
