"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_LINKS } from "@/config/navigation";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";

/**
 * Site navbar.
 *
 * Laid out the way the design reference does it: three groups spread across the
 * full width (mark · links · action) rather than a bordered logo cell with the
 * links tucked beside it. Height lives in `--nav-h` (globals.css) because the
 * bar is fixed, so the landing hero and /login offset themselves by that token
 * instead of each hardcoding a number that drifts.
 *
 * One deliberate departure from the reference: it drops the nav links entirely
 * on small screens. We keep them behind a hamburger, and keep the action button
 * visible at every width.
 */

/** Stacked KASA / KAI mark. */
function Logo() {
  const row: React.CSSProperties = {
    padding: "4px 0",
    fontFamily: "var(--body)",
    fontWeight: 800,
    fontSize: "10px",
    lineHeight: 1,
    letterSpacing: "0.1em",
    textAlign: "center",
    textTransform: "uppercase",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "48px",
        border: "1px solid var(--white)",
        flexShrink: 0,
      }}
    >
      <div style={{ ...row, background: "var(--white)", color: "#000" }}>Kasa</div>
      <div style={{ ...row, background: "#000", color: "var(--white)" }}>Kai</div>
    </div>
  );
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  // Same source of truth the landing page's Book links read, so the bar and the
  // cards can never disagree about whether there is a session.
  const isLoggedIn = useIsLoggedIn();

  const closeMobile = () => setMobileOpen(false);
  const toggleMobile = () => setMobileOpen((v) => !v);

  const dashboardHref = "/dashboard";

  // The bar button says "Login", so it opens the LOGIN step of the auth flow
  // (src/app/login/page.tsx) — a button must land where its label promises.
  // The landing-page CTAs ("Book", "Get Started", …) are the ones that open
  // sign-up first, via SIGNUP_HREF in components/landing/authLinks.ts; both
  // screens carry a link to the other, so either entry point is one tap from
  // the one the visitor actually wanted.
  const authHref = "/login?role=player";

  const actionLabel = isLoggedIn ? "Dashboard" : "Login";
  const actionHref = isLoggedIn ? dashboardHref : authHref;

  // A "Login" button pointing at the page you are already reading is noise —
  // and on /login it competes with the actual sign-in form below it. Hide it
  // there. A signed-in visitor keeps their "Dashboard" button, which still
  // goes somewhere: /login redirects them out, but the button is correct for
  // the moment before that happens.
  const pathname = usePathname();
  const showAction = isLoggedIn || pathname !== "/login";

  // "You are here". Only a link with a real path can be the current page — the
  // hash links are shortcuts into the landing page, and marking one current
  // while the visitor is halfway down some other section would be a lie.
  const isCurrent = (href: string) => !href.includes("#") && href === pathname;

  return (
    <>
      {/* ── NAVBAR ── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 500,
          height: "var(--nav-h)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          padding: "0 clamp(24px, 4vw, 48px)",
          background: "rgba(10,10,10,0.9)",
          borderBottom: "1px solid #171717",
          backdropFilter: "blur(12px)",
          animation: "navIn 0.6s cubic-bezier(0.22,1,0.36,1) both",
        }}
      >
        <Link href="/" onClick={closeMobile} style={{ textDecoration: "none", display: "flex" }}>
          <Logo />
        </Link>

        {/* Desktop nav links */}
        <div
          className="site-desktop-links"
          style={{ alignItems: "center", gap: "32px" }}
        >
          {NAV_LINKS.map((link) => {
            const current = isCurrent(link.href);
            const idle = current ? "var(--white)" : "#a3a3a3";
            return (
              <a
                key={link.href}
                href={link.href}
                aria-current={current ? "page" : undefined}
                style={{
                  fontFamily: "var(--body)",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: idle,
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--white)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = idle)}
              >
                {link.label}
              </a>
            );
          })}
        </div>

        {/* Action button + hamburger */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          {showAction && (
          <a
            href={actionHref}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 24px",
              background: "var(--white)",
              color: "#000",
              fontFamily: "var(--body)",
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "0.025em",
              textTransform: "uppercase",
              textDecoration: "none",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#e5e5e5")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--white)")}
          >
            {actionLabel}
          </a>
          )}

          <button
            onClick={toggleMobile}
            className="site-mobile-toggle"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            style={{
              height: "38px",
              width: "38px",
              border: "1px solid #262626",
              borderRadius: "4px",
              background: "transparent",
              color: "var(--white)",
              cursor: "pointer",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {mobileOpen ? (
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                <path d="M3 7h18M3 12h18M3 17h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* ── MOBILE DROPDOWN MENU ── */}
      {/* Only the nav links live here; the action button stays in the bar. */}
      {mobileOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 490,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
          }}
          onClick={closeMobile}
        >
          <div
            style={{
              position: "absolute",
              top: "var(--nav-h)",
              left: 0,
              right: 0,
              background: "#0e0e0e",
              borderBottom: "1px solid #171717",
              animation: "modalIn .22s cubic-bezier(.4,0,.2,1) both",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {NAV_LINKS.map((link, i) => {
              const current = isCurrent(link.href);
              const idle = current ? "var(--white)" : "#a3a3a3";
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={closeMobile}
                  aria-current={current ? "page" : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    fontFamily: "var(--body)",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: idle,
                    textDecoration: "none",
                    padding: "13px clamp(24px, 4vw, 48px)",
                    borderBottom: i < NAV_LINKS.length - 1 ? "1px solid #171717" : "none",
                    transition: "color 0.15s, background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--white)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = idle;
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {link.label}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
