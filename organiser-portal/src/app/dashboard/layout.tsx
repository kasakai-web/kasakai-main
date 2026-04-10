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
  const [activeSection, setActiveSection] = useState("games");
  const [authResolved, setAuthResolved] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

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

    if (authToken && storedRole && storedUserId) {
      const normalizedRole = storedRole === "organizer" ? "organiser" : storedRole;

      if (normalizedRole !== "organiser") {
        clearSession();
        setAuthenticated(false);
        router.replace("/login");
        setAuthResolved(true);
        return;
      }

      setAuthenticated(true);
    } else {
      setAuthenticated(false);
      clearSession();
      router.replace("/login");
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
    fetch(buildApiUrl("/api/v1/organisers/me"), {
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
    if (pathname.includes("/dashboard/organizer/") && pathname.endsWith("/profile")) {
      setActiveSection("profile");
      return;
    }

    setActiveSection("games");
  }, [pathname]);

  const handleLogout = () => {
    clearSession();
    localStorage.removeItem("userProfileImage");
    router.replace("/login");
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

        <div className="nav-center">
          <div className="role-tab active organiser" style={{ cursor: "default" }}>Organiser Dashboard</div>
        </div>

        <div className="nav-right" style={{ borderLeft: "none" }}>
          <button className="sidebar-link" onClick={handleLogout} style={{ color: "#ff4444", opacity: 0.9 }}>
            <span className="sidebar-icon">🚪</span>Log Out
          </button>
        </div>
      </nav>

      <div className="dashboard-app">
        {/* SIDEBAR */}
        <aside className="sidebar" id="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-label">Organiser</div>
            <button
              className={`sidebar-link ${activeSection === 'games' ? 'active' : ''}`}
              onClick={() => {
                setActiveSection("games");
                if (userId) {
                  router.push(`/dashboard/organizer/${userId}`);
                }
              }}
            >
              <span className="sidebar-icon">🗂</span>My Games
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
                  Organiser
                </span>
              </div>
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
