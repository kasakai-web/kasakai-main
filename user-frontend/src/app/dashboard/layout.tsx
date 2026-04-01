"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import "./dashboard.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("browse");

  useEffect(() => {
    // Read the user role & id from localStorage (set during login)
    const storedRole = localStorage.getItem("userRole");
    const storedUserId = localStorage.getItem("userId") || "default_id";
    
    if (storedRole) {
      setRole(storedRole);
      
      // Enforce dashboard isolation
      if (storedRole === "player" && pathname.includes("organizer")) {
        router.push(`/dashboard/player/${storedUserId}`);
      } else if (storedRole === "organizer" && pathname.includes("player")) {
        router.push(`/dashboard/organizer/${storedUserId}`);
      }
    } else {
      // If no role is stored, maybe they aren't logged in
      // router.push("/login"); // Uncomment when auth is fully wired
    }
  }, [pathname, router]);

  // Fallback for visual rendering until state hydrates
  const displayRole = role || (pathname.includes("organizer") ? "organizer" : "player");

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    router.push("/"); // Redirect to Home Page instead of login
  };

  return (
    <div className="dashboard-app-wrapper">
      {/* NAVBAR */}
      <nav className="dashboard-nav">
        <Link className="logo-wrap" href="/">
          <div className="logo-block">
            <div className="logo-block-top"><span>KA</span></div>
            <div className="logo-block-bot"><span>KAI</span></div>
          </div>
          <div className="logo-name">
            <span className="logo-name-top">KASA</span>
            <span className="logo-name-bot">KAI</span>
          </div>
        </Link>

        {/* Roles are now strictly isolated. No toggle buttons, just shows the current view title if needed */}
        <div className="nav-center">
          {displayRole === "player" ? (
            <div className="role-tab active player" style={{ cursor: "default" }}>Player Dashboard</div>
          ) : (
            <div className="role-tab active organiser" style={{ cursor: "default" }}>Organiser Dashboard</div>
          )}
        </div>

        <div className="nav-right" style={{ borderLeft: "none" }}>
          {/* Removed wallet and user-pill from here as per request to match homepage clean look */}
        </div>
      </nav>

      <div className="dashboard-app">
        {/* SIDEBAR */}
        <aside className="sidebar" id="sidebar">
          {displayRole === "player" ? (
            <div className="sidebar-section">
              <div className="sidebar-label">Player</div>
              <button 
                className={`sidebar-link ${activeSection === 'browse' ? 'active' : ''}`}
                onClick={() => setActiveSection("browse")}
              >
                <span className="sidebar-icon">⚽</span>Browse Games
              </button>
              <button 
                className={`sidebar-link ${activeSection === 'mygames' ? 'active' : ''}`}
                onClick={() => setActiveSection("mygames")}
              >
                <span className="sidebar-icon">📋</span>My Bookings
              </button>
              <button 
                className={`sidebar-link ${activeSection === 'notifications' ? 'active' : ''}`}
                onClick={() => setActiveSection("notifications")}
              >
                <span className="sidebar-icon">🔔</span>Notifications
                <span style={{ marginLeft: "auto", background: "var(--coral)", color: "#fff", fontFamily: "var(--mono)", fontSize: "9px", padding: "2px 6px", borderRadius: "10px" }}>3</span>
              </button>
              <button 
                className={`sidebar-link ${activeSection === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveSection("profile")}
              >
                <span className="sidebar-icon">👤</span>Profile
              </button>
            </div>
          ) : (
            <div className="sidebar-section">
              <div className="sidebar-label">Organiser</div>
              <button className="sidebar-link active">
                <span className="sidebar-icon">🗂</span>My Games
              </button>
              <button className="sidebar-link">
                <span className="sidebar-icon">📊</span>Dashboard
              </button>
            </div>
          )}

          <div className="sidebar-bottom">
            <div className="sidebar-user-block" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", marginBottom: "8px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
              <div className="user-avatar" style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--lime)", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "12px" }}>
                AK
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span className="user-name" style={{ color: "var(--white)", fontWeight: 600, fontSize: "14px" }}>Arjun K.</span>
                <span style={{ color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {displayRole}
                </span>
              </div>
            </div>

            <div className="sidebar-wallet-card" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid var(--border)", borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
              <div className="swc-label" style={{ color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Wallet Balance</div>
              <div className="swc-amount" style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--white)", fontSize: "20px", fontWeight: 600, marginBottom: "12px" }}>
                <span className="wallet-dot" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--lime)", display: "inline-block" }}></span>
                ₹1,250
              </div>
              <button className="swc-topup" style={{ width: "100%", padding: "8px", background: "var(--white)", color: "var(--black)", border: "none", borderRadius: "4px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>+ Top Up</button>
            </div>

            <button 
              className="sidebar-link" 
              onClick={handleLogout}
              style={{ color: "#ff4444", marginTop: "auto", borderTop: "1px solid var(--border)", paddingTop: "16px", width: "100%", justifyContent: "flex-start" }}
            >
              <span className="sidebar-icon">🚪</span>Log Out
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="dashboard-main">
          {children}
        </main>
      </div>
    </div>
  );
}
