"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import "./dashboard.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("User");
  const [activeSection, setActiveSection] = useState("browse");

  useEffect(() => {
    // Read auth/session from localStorage (set during login)
    const authToken = localStorage.getItem("authToken");
    const storedRole = localStorage.getItem("userRole");
    const storedUserId = localStorage.getItem("userId") || "default_id";
    const storedUserName = localStorage.getItem("userName");

    if (storedUserName) {
      setUserName(storedUserName);
    }
    setUserId(storedUserId);

    if (authToken && storedRole && storedUserId) {
      setRole(storedRole);

      // Enforce dashboard isolation
      if (storedRole === "player" && pathname.includes("organizer")) {
        router.replace(`/dashboard/player/${storedUserId}`);
      } else if (storedRole === "organizer" && pathname.includes("player")) {   
        router.replace(`/dashboard/organizer/${storedUserId}`);
      }
    } else {
      // If auth/session is missing, redirect to login
      router.replace("/login?role=organiser");
    }
  }, [pathname, router]);

  useEffect(() => {
    if (pathname.includes("/dashboard/player/") && pathname.endsWith("/profile")) {
      setActiveSection("profile");
      return;
    }

    if (pathname.includes("/dashboard/organizer/") && pathname.endsWith("/profile")) {
      setActiveSection("profile");
      return;
    }

    if (pathname.includes("/dashboard/player/")) {
      const tab = searchParams.get("tab");
      if (tab === "my-games") {
        setActiveSection("mygames");
        return;
      }
      setActiveSection("browse");
      return;
    }

    setActiveSection("browse");
  }, [pathname, searchParams]);

  // Fallback for visual rendering until state hydrates
  const displayRole = role || (pathname.includes("organizer") ? "organizer" : "player");

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    router.replace("/login");
  };

  return (
    <div className="dashboard-app-wrapper">
      {/* NAVBAR */}
      <nav className="dashboard-nav">
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            height: "66px",
            padding: "0 26px",
            borderRight: "1px solid var(--border)",
            textDecoration: "none",
            flexShrink: 0,
            gap: "12px",
            transition: "background 0.18s",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", width: "32px", height: "32px", overflow: "hidden", border: "1.5px solid #2a2a2a", flexShrink: 0 }}>
            <div style={{ flex: 1, background: "var(--white)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "var(--cond)", fontWeight: 800, fontSize: "8.5px", letterSpacing: "0.1em", lineHeight: 1, color: "#000" }}>KASA</span>
            </div>
            <div style={{ flex: 1, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", borderTop: "1.5px solid #2a2a2a" }}>
              <span style={{ fontFamily: "var(--cond)", fontWeight: 800, fontSize: "8.5px", letterSpacing: "0.1em", lineHeight: 1, color: "var(--white)" }}>KAI</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1, gap: 0 }}>
            <p style={{ fontFamily: "var(--cond)", fontWeight: 800, fontSize: "16px", letterSpacing: "0.14em", color: "var(--white)", lineHeight: 1 }}>KASA</p>
            <p style={{ fontFamily: "var(--cond)", fontWeight: 800, fontSize: "16px", letterSpacing: "0.14em", color: "var(--muted)", lineHeight: 1 }}>KAI</p>
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
                onClick={() => {
                  setActiveSection("browse");
                  if (userId) {
                    router.push(`/dashboard/player/${userId}?tab=all`);
                  }
                }}
              >
                <span className="sidebar-icon">⚽</span>Browse Games
              </button>
              <button 
                className={`sidebar-link ${activeSection === 'mygames' ? 'active' : ''}`}
                onClick={() => {
                  setActiveSection("mygames");
                  if (userId) {
                    router.push(`/dashboard/player/${userId}?tab=my-games`);
                  }
                }}
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
                onClick={() => {
                  setActiveSection("profile");
                  if (userId) {
                    router.push(`/dashboard/player/${userId}/profile`);
                  }
                }}
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
              <button
                className={`sidebar-link ${activeSection === 'profile' ? 'active' : ''}`}
                onClick={() => {
                  setActiveSection("profile");
                  if (userId) {
                    router.push(`/dashboard/organizer/${userId}/profile`);
                  }
                }}
              >
                <span className="sidebar-icon">👤</span>Profile
              </button>
            </div>
          )}

          <div className="sidebar-bottom">
            <div className="sidebar-user-block" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", marginBottom: "8px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
              <div className="user-avatar" style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--lime)", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "12px" }}>
                {userName.substring(0, 2).toUpperCase()}
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span className="user-name" style={{ color: "var(--white)", fontWeight: 600, fontSize: "14px" }}>{userName}</span>
                <span style={{ color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {displayRole === "organizer" ? "Organiser" : "Player"}
                </span>
              </div>
            </div>

            <div className="sidebar-wallet-card" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid var(--border)", borderRadius: "8px", padding: "16px", marginBottom: "16px", display: displayRole === "organizer" ? "none" : "block" }}>
              <div className="swc-label" style={{ color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Wallet Balance</div>
              <div className="swc-amount" style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--white)", fontSize: "20px", fontWeight: 600, marginBottom: "12px" }}>
                <span className="wallet-dot" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--lime)", display: "inline-block" }}></span>
                ₹0
              </div>
              <button className="swc-topup" style={{ width: "100%", padding: "8px", background: "var(--white)", color: "var(--black)", border: "none", borderRadius: "4px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>+ Top Up</button>
            </div>

            <button 
              className="sidebar-link" 
              onClick={handleLogout}
              style={{ color: "#ff4444", marginTop: "auto", borderTop: "1px solid var(--border)", paddingTop: "16px", width: "100%", justifyContent: "flex-start", opacity: 0.8 }}
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
