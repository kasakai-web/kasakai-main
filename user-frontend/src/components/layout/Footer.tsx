import Link from "next/link";
import Image from "next/image";

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
        padding: "80px 24px 50px",
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto", width: "100%", padding: "0 clamp(16px, 4vw, 40px)" }}>
        {/* Main Footer Content */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.8fr 1.2fr 1.2fr 1.2fr",
            gap: "48px",
            marginBottom: "60px",
          }}
        >
          {/* Brand Section */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Image
                src="/kasa-kai-logo.svg"
                alt="Kasa Kai"
                width={40}
                height={40}
                style={{ width: "40px", height: "40px" }}
              />
              <h2
                style={{
                  fontFamily: "var(--cond)",
                  fontSize: "32px",
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

          {/* Support Section */}
          <div>
            <p style={{ fontFamily: "var(--mono)", fontSize: "11px", letterSpacing: ".15em", textTransform: "uppercase", color: "var(--lime)", marginBottom: "18px", margin: "0 0 18px 0", fontWeight: 600 }}>
              Support
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <Link href="/#support" style={{ fontSize: "14px", color: "#ccc", textDecoration: "none", fontWeight: 500, transition: "color 0.3s ease" }}>
                Help & Support
              </Link>
              <Link href="/#about" style={{ fontSize: "14px", color: "#ccc", textDecoration: "none", fontWeight: 500, transition: "color 0.3s ease" }}>
                About Us
              </Link>
              <a href="mailto:contact@kasakai.in" style={{ fontSize: "14px", color: "#ccc", textDecoration: "none", fontWeight: 500, transition: "color 0.3s ease" }}>
                Contact Us
              </a>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <p style={{ fontFamily: "var(--mono)", fontSize: "11px", letterSpacing: ".15em", textTransform: "uppercase", color: "var(--lime)", marginBottom: "18px", margin: "0 0 18px 0", fontWeight: 600 }}>
              Get In Touch
            </p>
            <div style={{ display: "grid", gap: "16px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px", fontWeight: 500 }}>Contact</div>
                <a href="tel:9930931616" style={{ fontSize: "14px", color: "#f4efe8", textDecoration: "none", fontWeight: 600, transition: "color 0.3s ease" }}>
                  +91 9930931616
                </a>
              </div>
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
            paddingTop: "30px",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <p style={{ fontFamily: "var(--mono)", fontSize: "12px", letterSpacing: ".05em", color: "#555", fontWeight: 500, margin: "0" }}>
            © {year} Kasa Kai. All rights reserved.
          </p>
          <div style={{ display: "flex", gap: "30px", flexWrap: "wrap" }}>
            <a href="/#about" style={{ fontFamily: "var(--mono)", fontSize: "12px", letterSpacing: ".05em", color: "#888", textDecoration: "none", fontWeight: 500, transition: "color 0.3s ease" }}>
              Privacy Policy
            </a>
            <a href="/#support" style={{ fontFamily: "var(--mono)", fontSize: "12px", letterSpacing: ".05em", color: "#888", textDecoration: "none", fontWeight: 500, transition: "color 0.3s ease" }}>
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
            padding: 70px 24px 40px !important;
          }
          footer > div > div:first-of-type {
            grid-template-columns: 1.5fr 1fr 1fr 1fr !important;
            gap: 40px !important;
            margin-bottom: 50px !important;
          }
        }

        @media (max-width: 1024px) {
          footer {
            padding: 60px 20px 36px !important;
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
            padding: 50px 16px 32px !important;
          }
          footer > div > div:first-of-type {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
            margin-bottom: 36px !important;
          }
          footer > div > div:first-of-type > div:first-child h2 {
            font-size: 24px !important;
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
            padding: 40px 12px 28px !important;
          }
          footer > div > div:first-of-type {
            gap: 28px !important;
            margin-bottom: 32px !important;
          }
          footer > div > div:first-of-type > div:first-child {
            gap: 12px !important;
          }
          footer > div > div:first-of-type > div:first-child h2 {
            font-size: 20px !important;
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
