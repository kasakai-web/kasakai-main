"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { buildApiUrl, clearSession, getSession } from "@/utils/api";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { SuccessPopup } from "@/components/ui/SuccessPopup";

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
  const [activeSection, setActiveSection] = useState<"browse" | "mygames" | "cancelled" | "completed" | "notifications" | "profile" | "wallet" | "ratings">("browse");
  const [walletBalancePaise, setWalletBalancePaise] = useState<number | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarUnread, setSidebarUnread] = useState(0);
  const [showPhotoReminder, setShowPhotoReminder] = useState(false);
  const [playerPass, setPlayerPass] = useState<{ type: string; expiryDate: string | null; passMonthYear: string | null } | null>(null);

  const PASS_LABELS: Record<string, string> = {
    weekday: "Weekday", weekend: "Weekend", day: "Day", night: "Night",
    weekday_day: "Weekday + Day", weekday_night: "Weekday + Night",
    weekend_day: "Weekend + Day", weekend_night: "Weekend + Night",
    full_month: "Full Month", half_month_1: "Half Month (1–15)", half_month_2: "Half Month (16–31)",
  };

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
      if (localStorage.getItem("requirePhotoUpload") === "true") {
        setShowPhotoReminder(true);
      }
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
    // Hide reminder once user is on profile page or has uploaded a photo
    if (pathname.includes("/profile") || stored) {
      setShowPhotoReminder(false);
    }
  }, [pathname]);

  // Fetch profile image + pass info from API
  useEffect(() => {
    if (!authenticated) return;
    const { token } = getSession();
    if (!token) return;
    fetch(buildApiUrl("/players/me"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const img = data?.data?.profileImage;
        if (img && !localStorage.getItem("userProfileImage")) {
          const url = `${SERVER_BASE}${img}`;
          localStorage.setItem("userProfileImage", url);
          setUserProfileImage(url);
        }
        const pass = data?.data?.pass;
        if (pass) setPlayerPass(pass);
      })
      .catch(() => {});
  }, [authenticated]);

  // Fetch + auto-refresh wallet balance in sidebar
  const refreshWalletBalance = useCallback(async () => {
    if (!authenticated) return;
    const { token } = getSession();
    if (!token) return;
    try {
      const res = await fetch(buildApiUrl("/players/me/wallet"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data?.success) {
        const w = data.data?.wallet;
        setWalletBalancePaise(w?.availablePaise ?? w?.balancePaise ?? 0);
      }
    } catch {}
  }, [authenticated]);

  useEffect(() => { refreshWalletBalance(); }, [refreshWalletBalance, pathname]);

  // Fetch notification unread count for sidebar badge
  const refreshUnreadCount = useCallback(async () => {
    if (!authenticated) return;
    const { token } = getSession();
    if (!token) return;
    try {
      const res = await fetch(buildApiUrl("/notifications/unread-count"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data?.success) setSidebarUnread(data.data?.count ?? 0);
    } catch {}
  }, [authenticated]);

  useEffect(() => { refreshUnreadCount(); }, [refreshUnreadCount, pathname]);
  useAutoRefresh(authenticated ? refreshUnreadCount : null, {
    interval:  15_000,
    onFocus:   true,
    onVisible: true,
    enabled:   authenticated,
  });

  useEffect(() => {
    const handleReadAll = () => {
      setSidebarUnread(0);
      refreshUnreadCount();
    };

    window.addEventListener("player-notifications-read-all", handleReadAll);
    return () => {
      window.removeEventListener("player-notifications-read-all", handleReadAll);
    };
  }, [refreshUnreadCount]);

  useAutoRefresh(authenticated ? refreshWalletBalance : null, {
    interval:  30_000,
    onFocus:   true,
    onVisible: true,
    enabled:   authenticated,
  });

  // Real-time updates via Socket.io events relayed as DOM events by SocketClient
  useEffect(() => {
    const onWalletUpdate = (e: Event) => {
      const { availablePaise } = (e as CustomEvent<{ availablePaise: number }>).detail;
      setWalletBalancePaise(availablePaise);
    };
    const onNewNotification = () => {
      if (authenticated) refreshUnreadCount();
    };
    window.addEventListener("kk-wallet-update", onWalletUpdate);
    window.addEventListener("kk-new-notification", onNewNotification);
    return () => {
      window.removeEventListener("kk-wallet-update", onWalletUpdate);
      window.removeEventListener("kk-new-notification", onNewNotification);
    };
  }, [authenticated, refreshUnreadCount]);

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

    if (pathname.includes("/dashboard/player/") && pathname.endsWith("/wallet")) {
      setActiveSection("wallet");
      return;
    }

    if (pathname.includes("/dashboard/player/") && pathname.endsWith("/ratings")) {
      setActiveSection("ratings");
      return;
    }

    if (pathname.includes("/dashboard/player/")) {
      if (tab === "cancelled" || tab === "canceled") {
        setActiveSection("cancelled");
        return;
      }
      if (tab === "completed") {
        setActiveSection("completed");
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
      const customEvent = event as CustomEvent<string>;
      const detail = customEvent.detail;

      if (detail === "browse" || detail === "all") {
        setActiveSection("browse");
        return;
      }
      if (detail === "mygames" || detail === "my-games") {
        setActiveSection("mygames");
        return;
      }
      if (detail === "cancelled" || detail === "canceled") {
        setActiveSection("cancelled");
        return;
      }
      if (detail === "completed") {
        setActiveSection("completed");
      }
    };

    window.addEventListener("player-tab-change", handleTabChange as EventListener);
    return () => {
      window.removeEventListener("player-tab-change", handleTabChange as EventListener);
    };
  }, []);


  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showLogoutSuccess, setShowLogoutSuccess] = useState(false);

  const doLogout = () => {
    clearSession();
    localStorage.removeItem("userProfileImage");
    router.replace("/login?role=player");
  };

  const handleLogout = () => setShowLogoutConfirm(true);

  const resolvePlayerId = () => {
    if (userId) return userId;

    const pathMatch = pathname.match(/\/dashboard\/player\/([^/?#]+)/);
    if (pathMatch?.[1]) return pathMatch[1];

    const { userId: sessionUserId } = getSession();
    return sessionUserId || "";
  };

  const navigateToPlayer = (destination: "browse" | "my-games" | "cancelled" | "completed" | "profile" | "notifications" | "wallet" | "ratings") => {
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

    if (destination === "completed") {
      router.push(`/dashboard/player/${resolvedUserId}?tab=completed`);
      return;
    }

    if (destination === "notifications") {
      router.push(`/dashboard/player/${resolvedUserId}/notifications`);
      return;
    }

    if (destination === "wallet") {
      router.push(`/dashboard/player/${resolvedUserId}/wallet`);
      return;
    }

    if (destination === "ratings") {
      router.push(`/dashboard/player/${resolvedUserId}/ratings`);
      return;
    }

    router.push(`/dashboard/player/${resolvedUserId}/profile`);
  };

  if (!authResolved || !authenticated) {
    return null;
  }

  return (
    <div className="dashboard-app-wrapper">
      <ConfirmationModal
        open={showLogoutConfirm}
        title="Log Out"
        message="Are you sure you want to log out of Kasakai?"
        confirmLabel="Yes, Log Out"
        onConfirm={() => { setShowLogoutConfirm(false); setShowLogoutSuccess(true); }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
      <SuccessPopup
        show={showLogoutSuccess}
        message="Logged out. See you on the pitch! 👋"
        onClose={doLogout}
      />

      {/* NAVBAR */}
      <nav className="dashboard-nav">
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            height: "66px",
            padding: "0 28px",
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
        </div>

        {/* Mobile wallet display */}
        <div className="mobile-wallet-display">
          {walletBalancePaise !== null && (
            <div 
              className="mobile-wallet-pill"
              onClick={() => {
                const resolvedId = resolvePlayerId();
                if (resolvedId) router.push(`/dashboard/player/${resolvedId}/wallet`);
              }}
            >
              <span className="mobile-wallet-icon">💰</span>
              <span className="mobile-wallet-amount">
                ₹{(walletBalancePaise / 100).toLocaleString("en-IN")}
              </span>
            </div>
          )}
        </div>

        <div className="nav-right" style={{ paddingRight: "8px" }}>
          <NotificationBell
            unreadCount={sidebarUnread}
            onViewAll={() => {
              const resolvedId = resolvePlayerId();
              if (resolvedId) router.push(`/dashboard/player/${resolvedId}/notifications`);
            }}
          />
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
            <button
              className={`sidebar-link ${activeSection === 'browse' ? 'active' : ''}`}
              onClick={() => { setActiveSection("browse"); setSidebarOpen(false); navigateToPlayer("browse"); }}
            >
              <span className="sidebar-icon">⚽</span>Browse Games
            </button>
            <button
              className={`sidebar-link ${activeSection === 'mygames' ? 'active' : ''}`}
              onClick={() => { setActiveSection("mygames"); setSidebarOpen(false); navigateToPlayer("my-games"); }}
            >
              <span className="sidebar-icon">📋</span>My Bookings
            </button>
            <button
              className={`sidebar-link ${activeSection === 'cancelled' ? 'active' : ''}`}
              onClick={() => { setActiveSection("cancelled"); setSidebarOpen(false); navigateToPlayer("cancelled"); }}
            >
              <span className="sidebar-icon">⛔</span>Cancelled Events
            </button>
            <button
              className={`sidebar-link ${activeSection === 'completed' ? 'active' : ''}`}
              onClick={() => { setActiveSection("completed"); setSidebarOpen(false); navigateToPlayer("completed"); }}
            >
              <span className="sidebar-icon">✅</span>Completed Games
            </button>
            <button
              className={`sidebar-link ${activeSection === 'ratings' ? 'active' : ''}`}
              onClick={() => { setActiveSection("ratings"); setSidebarOpen(false); navigateToPlayer("ratings"); }}
            >
              <span className="sidebar-icon">⭐</span>My Feedback
            </button>
            <button
              className={`sidebar-link ${activeSection === 'wallet' ? 'active' : ''}`}
              onClick={() => {
                setActiveSection("wallet");
                setSidebarOpen(false);
                navigateToPlayer("wallet");
              }}
            >
              <span className="sidebar-icon">💰</span>Wallet
              {walletBalancePaise !== null && (
                <span style={{ marginLeft: "auto", color: "#c8ff3e", fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 700 }}>
                  ₹{(walletBalancePaise / 100).toLocaleString("en-IN")}
                </span>
              )}
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
              {sidebarUnread > 0 && (
                <span style={{ marginLeft: "auto", background: "#ff4444", color: "#fff", fontFamily: "var(--mono)", fontSize: "9px", padding: "2px 6px", borderRadius: "10px", fontWeight: 700 }}>
                  {sidebarUnread > 99 ? "99+" : sidebarUnread}
                </span>
              )}
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
            <button
              className="sidebar-link sidebar-profile-btn"
              onClick={() => {
                setActiveSection("profile");
                setSidebarOpen(false);
                navigateToPlayer("profile");
              }}
            >
              <div className="user-avatar" style={{ overflow: "hidden" }}>
                {userProfileImage ? (
                  <img src={userProfileImage} alt={userName} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => { setUserProfileImage(""); localStorage.removeItem("userProfileImage"); }} />
                ) : (
                  userName.substring(0, 2).toUpperCase()
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <span className="user-name" style={{ fontWeight: 600, fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</span>
              </div>
            </button>

            <div className="sidebar-wallet-card" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid var(--border)", borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
              <div className="swc-label" style={{ color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Wallet Balance</div>
              <div className="swc-amount" style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--white)", fontSize: "20px", fontWeight: 600, marginBottom: "12px" }}>
                <span className="wallet-dot" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--lime)", display: "inline-block" }}></span>
                {walletBalancePaise !== null
                  ? `₹${(walletBalancePaise / 100).toLocaleString("en-IN")}`
                  : "₹—"}
              </div>
              <button
                className="swc-topup"
                style={{ width: "100%", padding: "8px", background: "var(--white)", color: "var(--black)", border: "none", borderRadius: "4px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                onClick={() => { setActiveSection("wallet"); setSidebarOpen(false); navigateToPlayer("wallet"); }}
              >
                + Top Up
              </button>
            </div>

            {/* Pass card */}
            {(() => {
              const hasPass = playerPass?.type && playerPass.type !== "none";
              const isExpired = hasPass && !!playerPass?.expiryDate && new Date(playerPass.expiryDate) < new Date();
              const isActive = hasPass && !isExpired;
              const passLabel = hasPass ? (PASS_LABELS[playerPass!.type] ?? playerPass!.type) : "No Pass";
              const accentColor = isActive ? "#4ade80" : isExpired ? "#fb923c" : "#444";
              const badgeLabel = isActive ? "Active" : isExpired ? "Expired" : "No Pass";
              return (
                <div style={{
                  background: "rgba(0,0,0,0.4)",
                  border: `1px solid ${isActive ? "rgba(74,222,128,0.2)" : isExpired ? "rgba(251,146,60,0.2)" : "var(--border)"}`,
                  borderRadius: "8px", padding: "14px 16px", marginBottom: "16px",
                }}>
                  <div style={{ color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                    My Pass
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: hasPass ? "8px" : 0 }}>
                    <span style={{ color: isActive ? "var(--white)" : "var(--muted)", fontSize: "13px", fontWeight: 600 }}>
                      {passLabel}
                    </span>
                    <span style={{
                      fontSize: "9px", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
                      padding: "2px 8px", borderRadius: "20px",
                      color: accentColor,
                      background: isActive ? "rgba(74,222,128,0.1)" : isExpired ? "rgba(251,146,60,0.1)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${isActive ? "rgba(74,222,128,0.25)" : isExpired ? "rgba(251,146,60,0.25)" : "#222"}`,
                    }}>
                      {badgeLabel}
                    </span>
                  </div>
                  {hasPass && (
                    <div style={{ fontSize: "11px", color: "var(--muted)", lineHeight: 1.5 }}>
                      {playerPass?.passMonthYear && (
                        <span>Month: {playerPass.passMonthYear}{playerPass?.expiryDate ? " · " : ""}</span>
                      )}
                      {playerPass?.expiryDate
                        ? <span>Expires {new Date(playerPass.expiryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                        : !playerPass?.passMonthYear && <span style={{ color: "#555" }}>No expiry set</span>
                      }
                    </div>
                  )}
                </div>
              );
            })()}

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
          {showPhotoReminder && (
            <div style={{
              background: "rgba(200,255,62,0.08)",
              border: "1px solid rgba(200,255,62,0.3)",
              borderRadius: "8px",
              padding: "12px 16px",
              margin: "16px 16px 0",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}>
              <span style={{ fontSize: "18px" }}>📸</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, color: "#c8ff3e", fontWeight: 700, fontSize: "14px" }}>Profile photo required</p>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: "12px", marginTop: "2px" }}>
                  Add a profile photo so organisers and teammates can recognise you.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigateToPlayer("profile")}
                style={{
                  background: "#c8ff3e", color: "#000", border: "none",
                  borderRadius: "6px", padding: "7px 14px",
                  fontSize: "12px", fontWeight: 700, cursor: "pointer", flexShrink: 0,
                }}
              >
                Add Photo
              </button>
              <button
                type="button"
                onClick={() => setShowPhotoReminder(false)}
                aria-label="Dismiss"
                style={{
                  background: "none", border: "none", color: "var(--muted)",
                  cursor: "pointer", fontSize: "18px", lineHeight: 1, flexShrink: 0, padding: "0 4px",
                }}
              >
                ×
              </button>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
