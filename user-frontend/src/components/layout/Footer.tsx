"use client";

import Link from "next/link";

const quickLinks = [
  { label: "Home",             href: "/" },
  { label: "About Us",         href: "/#about" },
  { label: "Football",         href: "/login?role=player" },
  { label: "Screening Events", href: "/screening" },
  { label: "Turf Events",      href: "/dashboard" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <style>{`
        .site-footer {
          background:
            radial-gradient(1400px 500px at 10% -5%, rgba(196,213,108,0.12), transparent 60%),
            linear-gradient(180deg, rgba(7,7,7,0.4) 0%, #0a0a0a 100%);
          border-top: 1px solid #1a1a1a;
          width: 100vw;
          margin-left: calc(50% - 50vw);
          padding: 52px 0 30px;
        }
        .footer-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 clamp(16px, 4vw, 48px);
        }

        /* ── Main grid ── */
        .footer-grid {
          display: grid;
          grid-template-columns: 1.8fr 1.1fr 1.1fr;
          gap: 48px;
          margin-bottom: 52px;
        }

        /* ── Brand ── */
        .footer-brand { display: flex; flex-direction: column; gap: 20px; }
        .footer-logo-row { display: flex; align-items: center; gap: 14px; }
        .footer-logo-box {
          display: flex; flex-direction: column;
          width: 44px; height: 44px;
          overflow: hidden; border: 1.5px solid #333; flex-shrink: 0;
        }
        .footer-logo-top {
          flex: 1; background: var(--white);
          display: flex; align-items: center; justify-content: center;
        }
        .footer-logo-bottom {
          flex: 1; background: #000;
          display: flex; align-items: center; justify-content: center;
          border-top: 1.5px solid #333;
        }
        .footer-logo-word {
          font-family: var(--cond); font-weight: 900;
          font-size: 9px; letter-spacing: 0.08em;
        }
        .footer-wordmark {
          font-family: var(--cond); font-weight: 900;
          font-size: 34px; letter-spacing: .08em;
          color: white; line-height: 1; margin: 0;
        }
        .footer-desc {
          color: #999; line-height: 1.72; font-size: 13.5px; margin: 0;
        }

        /* ── Nav / Contact columns ── */
        .footer-col-label {
          font-family: var(--mono); font-size: 10px;
          letter-spacing: .18em; text-transform: uppercase;
          color: var(--lime); font-weight: 600;
          margin: 0 0 16px;
        }
        .footer-links {
          display: flex; flex-direction: column; gap: 12px;
        }
        .footer-link {
          font-size: 14px; color: #ccc; text-decoration: none;
          font-weight: 500; letter-spacing: .01em;
          transition: color 0.22s;
        }
        .footer-link:hover { color: var(--lime); }
        .footer-contact-label {
          font-size: 11px; color: #555; margin-bottom: 4px; font-weight: 500;
        }
        .footer-contact-email {
          font-size: 14px; color: #f4efe8; text-decoration: none;
          font-weight: 600; transition: color 0.22s;
        }
        .footer-contact-email:hover { color: var(--lime); }

        /* ── Bottom bar ── */
        .footer-bottom {
          display: flex; justify-content: space-between; align-items: center;
          border-top: 1px solid #1a1a1a; padding-top: 18px;
          flex-wrap: wrap; gap: 10px;
        }
        .footer-copy {
          font-family: var(--mono); font-size: 11px;
          letter-spacing: .05em; color: #666; margin: 0;
        }
        .footer-legal { display: flex; gap: 20px; flex-wrap: wrap; }
        .footer-legal a {
          font-family: var(--mono); font-size: 11px;
          letter-spacing: .05em; color: #555;
          text-decoration: none; transition: color 0.22s;
        }
        .footer-legal a:hover { color: var(--lime); }

        /* ── Tablet ── */
        @media (max-width: 1024px) {
          .footer-grid { grid-template-columns: 1.4fr 1fr 1fr; gap: 36px; }
        }

        /* ── Mobile ── */
        @media (max-width: 767px) {
          .site-footer { padding: 36px 0 22px; }
          .footer-grid {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: auto auto;
            gap: 28px 24px;
            margin-bottom: 32px;
          }
          /* Brand spans full width on mobile */
          .footer-brand {
            grid-column: 1 / -1;
            flex-direction: row;
            align-items: flex-start;
            gap: 16px;
          }
          .footer-logo-box { width: 36px; height: 36px; flex-shrink: 0; }
          .footer-logo-word { font-size: 8px; }
          .footer-wordmark { font-size: 26px; }
          .footer-desc { font-size: 12.5px; line-height: 1.65; }
          /* Navigate + Contact side by side */
          .footer-nav  { grid-column: 1; }
          .footer-contact { grid-column: 2; }
          .footer-col-label { font-size: 9px; margin-bottom: 12px; }
          .footer-link { font-size: 13px; }
          .footer-links { gap: 10px; }
          .footer-contact-email { font-size: 13px; }
          /* Bottom bar */
          .footer-bottom { flex-direction: column; align-items: flex-start; gap: 8px; padding-top: 14px; }
          .footer-copy { font-size: 10px; }
          .footer-legal a { font-size: 10px; }
          .footer-legal { gap: 14px; }
        }
      `}</style>

      <div className="footer-inner">
        <div className="footer-grid">

          {/* Brand */}
          <div className="footer-brand">
            <div>
              <div className="footer-logo-row">
                <div className="footer-logo-box">
                  <div className="footer-logo-top">
                    <span className="footer-logo-word" style={{ color: "#000" }}>KASA</span>
                  </div>
                  <div className="footer-logo-bottom">
                    <span className="footer-logo-word" style={{ color: "var(--white)" }}>KAI</span>
                  </div>
                </div>
                <h2 className="footer-wordmark">
                  KASA<span style={{ color: "var(--lime)" }}>KAI</span>
                </h2>
              </div>
            </div>
            <p className="footer-desc">
              We specialise in organising simple yet fulfilling events around your hobbies — screenings, turf meets and open mics across Indian cities.
            </p>
          </div>

          {/* Navigate */}
          <div className="footer-nav">
            <p className="footer-col-label">Navigate</p>
            <div className="footer-links">
              {quickLinks.map((link) => (
                <Link key={link.href} href={link.href} className="footer-link">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="footer-contact">
            <p className="footer-col-label">Get In Touch</p>
            <div>
              <p className="footer-contact-label">Email</p>
              <a href="mailto:contact@kasakai.in" className="footer-contact-email">
                contact@kasakai.in
              </a>
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="footer-bottom">
          <p className="footer-copy">© {year} Kasa Kai. All rights reserved.</p>
          <div className="footer-legal">
            <a href="/#about">Privacy Policy</a>
            <a href="/#support">Terms &amp; Conditions</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
