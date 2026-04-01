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
    router.push("/login");
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

        <div className="nav-right">
          <div className="wallet-pill">
            <span className="wallet-dot"></span>
            <span className="wallet-amount">₹1,250</span>
          </div>
          <div className="user-pill">
            <div className="user-avatar">AK</div>
            <span className="user-name">Arjun K.</span>
          </div>
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
            <button 
              className="sidebar-link" 
              onClick={handleLogout}
              style={{ color: "#ff4444", marginBottom: "16px" }}
            >
              <span className="sidebar-icon">🚪</span>Log Out
            </button>
            <div className="sidebar-wallet-card">
              <div className="swc-label">Wallet Balance</div>
              <div className="swc-amount">₹1,250</div>
              <button className="swc-topup">+ Top Up</button>
            </div>
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
