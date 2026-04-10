"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { buildApiUrl, clearSession, getSession } from "@/utils/api";

const SERVER_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000").replace(/\/api\/v1\/?$/, "");
import "./dashboard.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("User");
  const [userProfileImage, setUserProfileImage] = useState<string>("");
  const [activeSection, setActiveSection] = useState<"browse" | "mygames" | "cancelled" | "notifications" | "profile">("browse");
  const [authResolved, setAuthResolved] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const { token: authToken, role: storedRole, userId: storedUserId } = getSession();
    const storedUserName = typeof window !== "undefined" ? localStorage.getItem("userName") : null;
    const storedProfileImage = typeof window !== "undefined" ? localStorage.getItem("userProfileImage") : null;

    if (storedUserName) {
      setUserName(storedUserName);
    }
    if (storedProfileImage) {
      setUserProfileImage(storedProfileImage);
    }

    if (storedUserId) {
      setUserId(storedUserId);
    }

    if (authToken && storedRole === "player" && storedUserId) {
      setAuthenticated(true);
    } else {
      setAuthenticated(false);
      clearSession();
      router.replace("/login?role=player");
    }

    setAuthResolved(true);
  }, [pathname, router]);

  // Re-read profile image from localStorage whenever path changes (e.g. after profile page update)
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("userProfileImage") : null;
    if (stored) setUserProfileImage(stored);
  }, [pathname]);

  // Fetch profile image from API if not in localStorage
  useEffect(() => {
    if (!authenticated) return;
    if (localStorage.getItem("userProfileImage")) return;
    const { token } = getSession();
    if (!token) return;
    fetch(buildApiUrl("/api/v1/players/me"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const img = data?.data?.profileImage;
        if (img) {
          const url = `${SERVER_BASE}${img}`;
          localStorage.setItem("userProfileImage", url);
          setUserProfileImage(url);
        }
      })
      .catch(() => {});
  }, [authenticated]);

  useEffect(() => {
    const tab = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null;

    if (pathname.includes("/dashboard/player/") && pathname.endsWith("/notifications")) {
      setActiveSection("notifications");
      return;
    }

    if (pathname.includes("/dashboard/player/") && pathname.endsWith("/profile")) {
      setActiveSection("profile");
      return;
    }

    if (pathname.includes("/dashboard/player/")) {
      if (tab === "cancelled" || tab === "canceled") {
        setActiveSection("cancelled");
        return;
      }
      if (tab === "my-games") {
        setActiveSection("mygames");
        return;
      }
      setActiveSection("browse");
      return;
    }

    setActiveSection("browse");
  }, [pathname]);

  useEffect(() => {
    const handleTabChange = (event: Event) => {
      const customEvent = event as CustomEvent<"browse" | "mygames" | "cancelled">;
      if (customEvent.detail === "browse" || customEvent.detail === "mygames" || customEvent.detail === "cancelled") {
        setActiveSection(customEvent.detail);
      }
    };

    window.addEventListener("player-tab-change", handleTabChange as EventListener);
    return () => {
      window.removeEventListener("player-tab-change", handleTabChange as EventListener);
    };
  }, []);

  const handleLogout = () => {
    clearSession();
    localStorage.removeItem("userProfileImage");
    router.replace("/login?role=player");
  };

  const resolvePlayerId = () => {
    if (userId) return userId;

    const pathMatch = pathname.match(/\/dashboard\/player\/([^/?#]+)/);
    if (pathMatch?.[1]) return pathMatch[1];

    const { userId: sessionUserId } = getSession();
    return sessionUserId || "";
  };

  const navigateToPlayer = (destination: "browse" | "my-games" | "cancelled" | "profile" | "notifications") => {
    const resolvedUserId = resolvePlayerId();
    if (!resolvedUserId) return;

    if (destination === "browse") {
      router.push(`/dashboard/player/${resolvedUserId}?tab=all`);
      return;
    }

    if (destination === "my-games") {
      router.push(`/dashboard/player/${resolvedUserId}?tab=my-games`);
      return;
    }

    if (destination === "cancelled") {
      router.push(`/dashboard/player/${resolvedUserId}?tab=cancelled`);
      return;
    }

    if (destination === "notifications") {
      router.push(`/dashboard/player/${resolvedUserId}/notifications`);
      return;
    }

    router.push(`/dashboard/player/${resolvedUserId}/profile`);
  };

  if (!authResolved || !authenticated) {
    return null;
  }

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
            padding: "0 28px",
            borderRight: "1px solid var(--border)",
            textDecoration: "none",
            flexShrink: 0,
            gap: "12px",
            transition: "background 0.18s",
          }}
        >
          <div className="logo-block" style={{ display: "flex", flexDirection: "column", width: "36px", height: "36px", overflow: "hidden", border: "1.5px solid #2a2a2a", flexShrink: 0 }}>
            <div style={{ flex: 1, background: "var(--white)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "var(--cond)", fontWeight: 800, fontSize: "9.5px", letterSpacing: "0.1em", lineHeight: 1, color: "#000" }}>KASA</span>
            </div>
            <div style={{ flex: 1, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", borderTop: "1.5px solid #2a2a2a" }}>
              <span style={{ fontFamily: "var(--cond)", fontWeight: 800, fontSize: "9.5px", letterSpacing: "0.1em", lineHeight: 1, color: "var(--white)" }}>KAI</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1, gap: 0 }}>
            <p className="logo-name-top" style={{ fontFamily: "var(--cond)", fontWeight: 800, fontSize: "18px", letterSpacing: "0.14em", color: "var(--white)", lineHeight: 1 }}>KASA</p>
            <p className="logo-name-bot" style={{ fontFamily: "var(--cond)", fontWeight: 800, fontSize: "18px", letterSpacing: "0.14em", color: "var(--muted)", lineHeight: 1 }}>KAI</p>
          </div>
        </Link>

        <div className="nav-center">
          <div className="role-tab active player" style={{ cursor: "default" }}>Player Dashboard</div>
        </div>

        <div className="nav-right" style={{ borderLeft: "none" }}>
          {/* Removed wallet and user-pill from here as per request to match homepage clean look */}
        </div>

        {/* Mobile sidebar toggle */}
        <button
          className="mobile-sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {sidebarOpen ? (
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
              <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
              <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </nav>

      <div className="dashboard-app">
        {/* Sidebar overlay (mobile) */}
        <div
          className={`sidebar-overlay ${sidebarOpen ? "sidebar-open" : ""}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* SIDEBAR */}
        <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`} id="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-label">Player</div>
            <button
              className={`sidebar-link ${activeSection === 'browse' ? 'active' : ''}`}
              onClick={() => {
                setActiveSection("browse");
                setSidebarOpen(false);
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("player-tab-change", { detail: "all" }));
                }
                navigateToPlayer("browse");
              }}
            >
              <span className="sidebar-icon">⚽</span>Browse Games
            </button>
            <button
              className={`sidebar-link ${activeSection === 'mygames' ? 'active' : ''}`}
              onClick={() => {
                setActiveSection("mygames");
                setSidebarOpen(false);
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("player-tab-change", { detail: "my-games" }));
                }
                navigateToPlayer("my-games");
              }}
            >
              <span className="sidebar-icon">📋</span>My Bookings
            </button>
            <button
              className={`sidebar-link ${activeSection === 'cancelled' ? 'active' : ''}`}
              onClick={() => {
                setActiveSection("cancelled");
                setSidebarOpen(false);
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("player-tab-change", { detail: "cancelled" }));
                }
                navigateToPlayer("cancelled");
              }}
            >
              <span className="sidebar-icon">⛔</span>Cancelled Events
            </button>
            <button
              className={`sidebar-link ${activeSection === 'notifications' ? 'active' : ''}`}
              onClick={() => {
                setActiveSection("notifications");
                setSidebarOpen(false);
                navigateToPlayer("notifications");
              }}
            >
              <span className="sidebar-icon">🔔</span>Notifications
              <span style={{ marginLeft: "auto", background: "var(--coral)", color: "#fff", fontFamily: "var(--mono)", fontSize: "9px", padding: "2px 6px", borderRadius: "10px" }}>3</span>
            </button>
            <button
              className={`sidebar-link ${activeSection === 'profile' ? 'active' : ''}`}
              onClick={() => {
                setActiveSection("profile");
                setSidebarOpen(false);
                navigateToPlayer("profile");
              }}
            >
              <span className="sidebar-icon">👤</span>Profile
            </button>
          </div>

          <div className="sidebar-bottom">
            <div className="sidebar-user-block" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", marginBottom: "8px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
              <div className="user-avatar" style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--lime)", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "12px", overflow: "hidden", flexShrink: 0 }}>
                {userProfileImage ? (
                  <img src={userProfileImage} alt={userName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  userName.substring(0, 2).toUpperCase()
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span className="user-name" style={{ color: "var(--white)", fontWeight: 600, fontSize: "14px" }}>{userName}</span>
                <span style={{ color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Player
                </span>
              </div>
            </div>

            <div className="sidebar-wallet-card" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid var(--border)", borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
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
