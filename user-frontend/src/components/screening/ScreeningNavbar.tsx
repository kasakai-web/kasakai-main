"use client";

import Link from "next/link";

interface Props {
  isLoggedIn: boolean;
}

export function ScreeningNavbar({ isLoggedIn }: Props) {
  return (
    <nav className="scr-navbar">
      {/* Logo — always goes back to main homepage */}
      <Link href="/" className="scr-nav-logo" aria-label="Back to home">
        <div className="scr-logo-mark">
          <div className="scr-logo-top"><span>KASA</span></div>
          <div className="scr-logo-bottom"><span>KAI</span></div>
        </div>
      </Link>

      {/* Center label */}
      <div className="scr-nav-center">
        <span className="scr-nav-label">SCREENING</span>
        <span className="scr-nav-beta">BETA</span>
      </div>

      {/* Right action */}
      <div className="scr-nav-right">
        {isLoggedIn ? (
          <Link href="/dashboard" className="scr-nav-btn scr-nav-btn-solid">
            Dashboard
          </Link>
        ) : (
          <Link href="/login?role=player" className="scr-nav-btn">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
