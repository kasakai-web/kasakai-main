"use client";

import Link from "next/link";
import { useState } from "react";
import "./home.css";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="organiser-home">
      <header className="site-header">
        <nav className="nav-bar">
          <div className="brand-wrap">
            <div className="brand-mark" aria-hidden="true">
              <span>KASA</span>
              <span>KAI</span>
            </div>
            <div className="brand-stack">
              <p className="brand-label">KASAKAI</p>
              <p className="brand-sub">Organiser Portal</p>
            </div>
          </div>

          <div className="nav-links" aria-label="Primary navigation">
            <a href="#features" onClick={closeMobileMenu}>Features</a>
            <a href="#workflow" onClick={closeMobileMenu}>Workflow</a>
            <a href="#contact" onClick={closeMobileMenu}>Contact</a>
          </div>

          <div className="nav-actions">
            <Link href="/dashboard" className="btn-login">Login</Link>
            <button
              className="mobile-menu-btn"
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </nav>

        {mobileMenuOpen && (
          <div className="mobile-menu-panel">
            <a href="#features" onClick={closeMobileMenu}>Features</a>
            <a href="#workflow" onClick={closeMobileMenu}>Workflow</a>
            <a href="#contact" onClick={closeMobileMenu}>Contact</a>
            <Link href="/dashboard" className="mobile-menu-login" onClick={closeMobileMenu}>
              Login
            </Link>
          </div>
        )}
      </header>

      <main className="home-content">
        <div className="hero-section">
          <p className="hero-kicker">Built for game organisers</p>
          <h1 className="hero-title">Welcome to KASAKAI Organiser Hub</h1>
          <p className="hero-subtitle">
            Plan fixtures, track registrations, and manage payments from one clean dashboard.
          </p>

          <div className="hero-actions">
            <Link href="/dashboard" className="btn-primary">Go to Dashboard</Link>
          </div>

          <div className="hero-stats" id="workflow">
            <article>
              <h3>Fast Setup</h3>
              <p>Create and publish matches in minutes.</p>
            </article>
            <article>
              <h3>Live Control</h3>
              <p>Handle slots and confirmations in real time.</p>
            </article>
            <article>
              <h3>Player Ready</h3>
              <p>Share clear details with every registered player.</p>
            </article>
          </div>
        </div>
      </main>

      <section className="feature-band" id="features">
        <div className="feature-card">
          <p>Match Management</p>
        </div>
        <div className="feature-card">
          <p>Registration Overview</p>
        </div>
        <div className="feature-card" id="contact">
          <p>Payment Visibility</p>
        </div>
      </section>
    </div>
  );
}

