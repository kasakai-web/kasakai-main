"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  buildApiUrl,
  clearSession,
  getSession,
  isPassExpired,
  isPassNotYetActive,
  resolveImageUrl,
} from "@/utils/api";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { InfoTip, InfoTipButton, InfoTipPanel } from "@/components/ui/InfoTip";
import CityPicker from "@/components/dashboard/CityPicker";
import { type BrowseContext, getStoredMetro, setStoredMetro } from "@/utils/browse";
import { fetchHosting } from "@/utils/hosting";
import "./dashboard.css";
import "./sidebar.css";
import Image from "next/image";
import { Plus } from "lucide-react";

// The sidebar profile card's "Member · Forward" line — the codes the profile
// page's Preferred Position chips save.
const POSITION_LABELS: Record<string, string> = {
  GK: "Goalkeeper",
  DEF: "Defender",
  MID: "Midfielder",
  FWD: "Forward",
  ANY: "Any position",
};

type PlayerSection =
  | "browse"
  | "mygames"
  | "cancelled"
  | "completed"
  | "notifications"
  | "faq"
  | "profile"
  | "wallet"
  | "passes"
  | "ratings"
  | "hosting";

// The segment after /dashboard, mapped to the sidebar section it highlights.
// The bare /dashboard — and anything unrecognised — is the browse list.
const SECTION_BY_SEGMENT: Record<string, PlayerSection> = {
  "my-games": "mygames",
  cancelled: "cancelled",
  completed: "completed",
  notifications: "notifications",
  faq: "faq",
  profile: "profile",
  wallet: "wallet",
  passes: "passes",
  ratings: "ratings",
  hosting: "hosting",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [userName, setUserName] = useState<string>("User");
  const [userProfileImage, setUserProfileImage] = useState<string>("");
  const [userPositions, setUserPositions] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState<PlayerSection>("browse");
  const [walletBalancePaise, setWalletBalancePaise] = useState<number | null>(
    null,
  );
  const [authResolved, setAuthResolved] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [headerBrowseContext, setHeaderBrowseContext] = useState<BrowseContext | null>(null);
  const [headerMetro, setHeaderMetro] = useState<string | null>(() => getStoredMetro());
  const [headerCityLoading, setHeaderCityLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarUnread, setSidebarUnread] = useState(0);
  // Hosting only earns a sidebar item once it applies: an approved host, a
  // facilitation request waiting, or a game being run. The badge counts the
  // requests, which are the only thing on that page that waits for an answer.
  const [hostingNav, setHostingNav] = useState<{ show: boolean; invites: number }>({ show: false, invites: 0 });
  const [showPhotoReminder, setShowPhotoReminder] = useState(false);
  const [playerPass, setPlayerPass] = useState<{
    type: string;
    startDate: string | null;
    expiryDate: string | null;
    passMonthYear: string | null;
  } | null>(null);
  // v2 passes (bought, granted or migrated) live in their own collection, not on
  // the Player document — so `/players/me` never mentions them. The card shows
  // the best live one and falls back to the v1 field only when there is none.
  const [livePasses, setLivePasses] = useState<{
    name: string;
    status: "active" | "pending" | "exhausted";
    activatesAt: string | null;
    expiresAt: string | null;
  }[]>([]);

  const PASS_LABELS: Record<string, string> = {
    weekday: "Weekday",
    weekend: "Weekend",
    day: "Day",
    night: "Night",
    weekday_day: "Weekday + Day",
    weekday_night: "Weekday + Night",
    weekend_day: "Weekend + Day",
    weekend_night: "Weekend + Night",
    full_month: "Full Month",
    half_month_1: "Half Month (1–15)",
    half_month_2: "Half Month (16–31)",
  };

  useEffect(() => {
    const {
      token: authToken,
      role: storedRole,
      userId: storedUserId,
    } = getSession();
    const storedUserName =
      typeof window !== "undefined" ? localStorage.getItem("userName") : null;

    if (storedUserName) {
      setUserName(storedUserName);
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
    const stored =
      typeof window !== "undefined"
        ? localStorage.getItem("profileImage")
        : null;
    // Hide reminder once user is on profile page or has uploaded a photo
    if (pathname.includes("/profile") || stored) {
      setShowPhotoReminder(false);
    }
  }, [pathname]);

  // Fetch profile image + pass info from API. Kept live so an admin-assigned
  // pass (or expiry) reflects without needing a re-login.
  const refreshProfileMeta = useCallback(async () => {
    if (!authenticated) return;
    const { token } = getSession();
    if (!token) return;
    try {
      const res = await fetch(buildApiUrl("/players/me"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const img = data?.data?.profileImage;
      if (img) {
        localStorage.setItem("profileImage", img);
        setUserProfileImage(resolveImageUrl(img));
      }
      // Always sync pass — set to its current value (incl. "none" when removed)
      setPlayerPass(data?.data?.pass ?? null);
      const positions = data?.data?.preferences?.positions;
      setUserPositions(Array.isArray(positions) ? positions : []);
    } catch {}
  }, [authenticated]);

  const refreshLivePasses = useCallback(async () => {
    if (!authenticated) return;
    const { token } = getSession();
    if (!token) return;
    try {
      const res = await fetch(buildApiUrl("/passes/mine"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data?.success) setLivePasses(data.data?.live ?? []);
    } catch {}
  }, [authenticated]);

  // Re-fetch on auth resolve + on every navigation so the My Pass card stays current
  useEffect(() => {
    refreshProfileMeta();
    refreshLivePasses();
  }, [refreshProfileMeta, refreshLivePasses, pathname]);

  // A purchase happens on /dashboard/passes without a navigation, so it announces
  // itself; a wallet movement (the purchase debit, a grant's notification) is a
  // cheap second trigger.
  useEffect(() => {
    const onChange = () => refreshLivePasses();
    window.addEventListener("kk-passes-changed", onChange);
    window.addEventListener("kk-wallet-update", onChange);
    return () => {
      window.removeEventListener("kk-passes-changed", onChange);
      window.removeEventListener("kk-wallet-update", onChange);
    };
  }, [refreshLivePasses]);

  // Refresh on window focus / tab visible (e.g. an admin changed the pass in
  // another tab). No timer: this already re-runs on every navigation above, and
  // a pass does not change while someone sits on a page.
  useAutoRefresh(authenticated ? refreshLivePasses : null, {
    interval:  0,
    onFocus:   true,
    onVisible: true,
    enabled: authenticated,
  });
  useAutoRefresh(authenticated ? refreshProfileMeta : null, {
    interval:  0,
    onFocus:   true,
    onVisible: true,
    enabled: authenticated,
  });

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

  useEffect(() => {
    refreshWalletBalance();
  }, [refreshWalletBalance, pathname]);

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

  const refreshHostingNav = useCallback(async () => {
    if (!authenticated) return;
    try {
      const h = await fetchHosting();
      setHostingNav({
        show: h.isHost || h.counts.invites > 0 || h.counts.running > 0,
        invites: h.counts.invites,
      });
    } catch {}
  }, [authenticated]);

  // Not on every navigation — it is a heavier read than a badge count. On sign-in,
  // on focus, and whenever a notification lands (an approval or a facilitation
  // request always arrives as one).
  useEffect(() => { refreshHostingNav(); }, [refreshHostingNav]);
  useAutoRefresh(authenticated ? refreshHostingNav : null, {
    interval:  0,
    onFocus:   true,
    onVisible: true,
    enabled: authenticated,
  });
  useEffect(() => {
    const onNew = () => refreshHostingNav();
    window.addEventListener("kk-new-notification", onNew);
    window.addEventListener("kk-hosting-changed", onNew);
    return () => {
      window.removeEventListener("kk-new-notification", onNew);
      window.removeEventListener("kk-hosting-changed", onNew);
    };
  }, [refreshHostingNav]);
  // The socket pushes `new-notification`, which bumps this count immediately
  // (see the listener below) — so a 15-second timer was asking every open tab to
  // re-ask the server for something it was already being told.
  useAutoRefresh(authenticated ? refreshUnreadCount : null, {
    interval:  0,
    onFocus:   true,
    onVisible: true,
    enabled: authenticated,
  });

  useEffect(() => {
    const handleReadAll = () => {
      setSidebarUnread(0);
      refreshUnreadCount();
    };

    window.addEventListener("player-notifications-read-all", handleReadAll);
    return () => {
      window.removeEventListener(
        "player-notifications-read-all",
        handleReadAll,
      );
    };
  }, [refreshUnreadCount]);

  // Same again: `wallet-update` arrives over the socket the moment the balance
  // moves, so polling only added load without adding freshness.
  useAutoRefresh(authenticated ? refreshWalletBalance : null, {
    interval:  0,
    onFocus:   true,
    onVisible: true,
    enabled: authenticated,
  });

  // Real-time updates via Socket.io events relayed as DOM events by SocketClient
  useEffect(() => {
    const onWalletUpdate = (e: Event) => {
      const { availablePaise } = (e as CustomEvent<{ availablePaise: number }>)
        .detail;
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

  // Every section is a route now and the path no longer carries a player id, so
  // the segment after /dashboard IS the section. Browse is the bare /dashboard.
  useEffect(() => {
    const segment = pathname.replace(/^\/dashboard\/?/, "").split("/")[0];
    setActiveSection(SECTION_BY_SEGMENT[segment] ?? "browse");
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

    window.addEventListener(
      "player-tab-change",
      handleTabChange as EventListener,
    );
    return () => {
      window.removeEventListener(
        "player-tab-change",
        handleTabChange as EventListener,
      );
    };
  }, []);


  useEffect(() => {
    if (!authenticated || !pathname.startsWith("/dashboard")) {
      setHeaderCityLoading(false);
      return;
    }

    let cancelled = false;
    const loadContext = () => {
      const { token } = getSession();
      if (!token) {
        setHeaderCityLoading(false);
        return;
      }

      fetch(buildApiUrl("/games/browse-context"), {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (cancelled || !data?.success) return;
          const context: BrowseContext = data.data;
          setHeaderBrowseContext(context);
          if (context.suggestedFrom === "profile") {
            setHeaderMetro(context.suggestedMetro || null);
            setStoredMetro(context.unservedCity ? null : context.suggestedMetro);
          } else {
            setHeaderMetro((current) => current || context.suggestedMetro || null);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setHeaderCityLoading(false);
        });
    };

    const handleProfileCityChange = () => {
      setHeaderMetro(null);
      setHeaderBrowseContext(null);
      setHeaderCityLoading(true);
      loadContext();
    };

    loadContext();
    window.addEventListener("kasakai:profile-city-change", handleProfileCityChange);
    return () => {
      cancelled = true;
      window.removeEventListener("kasakai:profile-city-change", handleProfileCityChange);
    };
  }, [authenticated, pathname]);

  const handleHeaderMetroChange = (slug: string) => {
    setHeaderMetro(slug);
    setStoredMetro(slug);
    window.dispatchEvent(new CustomEvent("kasakai:metro-change", { detail: { slug } }));

    const { token } = getSession();
    if (!token) return;
    fetch(buildApiUrl("/players/me"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ location: { city: slug } }),
    }).catch(() => {});
  };
function RupeeBagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18px"
      height="18px"
      aria-hidden="true"
      style={{ verticalAlign: "-0.125em" }}
    >
      <path d="M8.5 2.5h7l-2 3.5h-3z" fill="#c98a3c" />
      <path d="M9 6.2h6" stroke="#8a5a1f" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M10 6.8C5.5 9.2 3.5 13 3.5 16.5 3.5 20 6.5 22 12 22s8.5-2 8.5-5.5c0-3.5-2-7.3-6.5-9.7z"
        fill="#e0a84f"
      />
      <path
        d="M9.5 11.5h5M9.5 13.5h5M10 11.5h1a2 2 0 0 1 0 4h-1l4 4.5"
        fill="none"
        stroke="#7a4a12"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

  const navigateToPlayer = (
    destination:
      | "browse"
      | "my-games"
      | "cancelled"
      | "faq"
      | "completed"
      | "profile"
      | "notifications"
      | "wallet"
      | "passes"
      | "ratings"
      | "hosting",
  ) => {
    router.push(destination === "browse" ? "/dashboard" : `/dashboard/${destination}`);
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
            textDecoration: "none",
            flexShrink: 0,
            gap: "12px",
            transition: "background 0.18s",
          }}
        >
          <div
            className="logo-block"
            style={{
              display: "flex",
              flexDirection: "column",
              width: "36px",
              height: "36px",
              overflow: "hidden",
              border: "1.5px solid #2a2a2a",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                flex: 1,
                background: "var(--white)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--cond)",
                  fontWeight: 800,
                  fontSize: "9.5px",
                  letterSpacing: "0.1em",
                  lineHeight: 1,
                  color: "#000",
                }}
              >
                KASA
              </span>
            </div>
            <div
              style={{
                flex: 1,
                background: "#000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderTop: "1.5px solid #2a2a2a",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--cond)",
                  fontWeight: 800,
                  fontSize: "9.5px",
                  letterSpacing: "0.1em",
                  lineHeight: 1,
                  color: "var(--white)",
                }}
              >
                KAI
              </span>
            </div>
          </div>

          {/* <div
            style={{
              display: "flex",
              flexDirection: "column",
              lineHeight: 1,
              gap: 0,
            }}
          >
            <p
              className="logo-name-top"
              style={{
                fontFamily: "var(--cond)",
                fontWeight: 800,
                fontSize: "18px",
                letterSpacing: "0.14em",
                color: "var(--white)",
                lineHeight: 1,
              }}
            >
              KASA
            </p>
            <p
              className="logo-name-bot"
              style={{
                fontFamily: "var(--cond)",
                fontWeight: 800,
                fontSize: "18px",
                letterSpacing: "0.14em",
                color: "var(--muted)",
                lineHeight: 1,
              }}
            >
              KAI
            </p>
          </div> */}
        </Link>

        {pathname.startsWith("/dashboard") && (
          <div className="nav-city-picker">
            <CityPicker
              metros={headerBrowseContext?.metros || []}
              value={headerMetro}
              onChange={handleHeaderMetroChange}
              needsChoice={Boolean(
                headerBrowseContext
                && (!headerMetro || headerBrowseContext.suggestedFrom === "busiest")
              )}
              unservedCity={
                headerBrowseContext?.unservedCity && !getStoredMetro()
                  ? headerBrowseContext.unservedCity
                  : null
              }
              loading={headerCityLoading}
            />
          </div>
        )}

        <div className="nav-center"></div>

        {/* Mobile wallet display */}
        <div className="mobile-wallet-display">
          {walletBalancePaise !== null && (
            <div
              className="mobile-wallet-pill"
              onClick={() => router.push("/dashboard/wallet")}
            >
              <span className="mobile-wallet-icon"><RupeeBagIcon /></span>
              <span className="mobile-wallet-amount">
                ₹{(walletBalancePaise / 100).toLocaleString("en-IN")}
              </span>
            </div>
          )}
        </div>

        <div className="nav-right" >
          <NotificationBell
            unreadCount={sidebarUnread}
            onViewAll={() => router.push("/dashboard/notifications")}
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
              <path
                d="M6 6l12 12M6 18L18 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
              <path
                d="M3 12h18M3 6h18M3 18h18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
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
        <aside
          className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}
          id="sidebar"
        >
          <div className="sidebar-section">
            <button
              className={`sidebar-link ${activeSection === "browse" ? "active" : ""}`}
              onClick={() => {
                setActiveSection("browse");
                setSidebarOpen(false);
                navigateToPlayer("browse");
              }}
            >
              <span className="sidebar-icon">⚽</span>Browse Games
            </button>
            <button
              className={`sidebar-link ${activeSection === "mygames" ? "active" : ""}`}
              onClick={() => {
                setActiveSection("mygames");
                setSidebarOpen(false);
                navigateToPlayer("my-games");
              }}
            >
              <span className="sidebar-icon">📋</span>My Bookings
            </button>
            <button
              className={`sidebar-link ${activeSection === "cancelled" ? "active" : ""}`}
              onClick={() => {
                setActiveSection("cancelled");
                setSidebarOpen(false);
                navigateToPlayer("cancelled");
              }}
            >
              <span className="sidebar-icon">⛔</span>Cancelled Games
            </button>
            <button
              className={`sidebar-link ${activeSection === "completed" ? "active" : ""}`}
              onClick={() => {
                setActiveSection("completed");
                setSidebarOpen(false);
                navigateToPlayer("completed");
              }}
            >
              <span className="sidebar-icon">✅</span>Completed Games
            </button>
            <button
              className={`sidebar-link ${activeSection === "ratings" ? "active" : ""}`}
              onClick={() => {
                setActiveSection("ratings");
                setSidebarOpen(false);
                navigateToPlayer("ratings");
              }}
            >
              <span className="sidebar-icon">⭐</span>My Feedback
            </button>
            {hostingNav.show && (
              <button
                className={`sidebar-link ${activeSection === "hosting" ? "active" : ""}`}
                onClick={() => {
                  setActiveSection("hosting");
                  setSidebarOpen(false);
                  navigateToPlayer("hosting");
                }}
              >
                <span className="sidebar-icon">🎖</span>Hosting
                {hostingNav.invites > 0 && (
                  <span
                    style={{
                      marginLeft: "auto",
                      background: "#c8ff3e",
                      color: "#0f0f0f",
                      fontFamily: "var(--mono)",
                      fontSize: "9px",
                      padding: "2px 6px",
                      borderRadius: "10px",
                      fontWeight: 700,
                    }}
                  >
                    {hostingNav.invites}
                  </span>
                )}
              </button>
            )}
            <button
              className={`sidebar-link ${activeSection === "passes" ? "active" : ""}`}
              onClick={() => {
                setActiveSection("passes");
                setSidebarOpen(false);
                navigateToPlayer("passes");
              }}
            >
              <span className="sidebar-icon">🎟️</span>My Passes
            </button>
            <button
              className={`sidebar-link ${activeSection === "wallet" ? "active" : ""}`}
              onClick={() => {
                setActiveSection("wallet");
                setSidebarOpen(false);
                navigateToPlayer("wallet");
              }}
            >
              <span className="sidebar-icon"><RupeeBagIcon/></span>Wallet
              {walletBalancePaise !== null && (
                <span
                  style={{
                    marginLeft: "auto",
                    color: "#c8ff3e",
                    fontFamily: "var(--mono)",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  ₹{(walletBalancePaise / 100).toLocaleString("en-IN")}
                </span>
              )}
            </button>
            <button
              className={`sidebar-link ${activeSection === "faq" ? "active" : ""}`}
              onClick={() => {
                setActiveSection("faq");
                setSidebarOpen(false);
                navigateToPlayer("faq");
              }}
            >
              <span className="sidebar-icon">❓</span>FAQ
            </button>
            <button
              className={`sidebar-link ${activeSection === "notifications" ? "active" : ""}`}
              onClick={() => {
                setActiveSection("notifications");
                setSidebarOpen(false);
                navigateToPlayer("notifications");
              }}
            >
              <span className="sidebar-icon">🔔</span>Notifications
              {sidebarUnread > 0 && (
                <span
                  style={{
                    marginLeft: "auto",
                    background: "#ff4444",
                    color: "#fff",
                    fontFamily: "var(--mono)",
                    fontSize: "9px",
                    padding: "2px 6px",
                    borderRadius: "10px",
                    fontWeight: 700,
                  }}
                >
                  {sidebarUnread > 99 ? "99+" : sidebarUnread}
                </span>
              )}
            </button>
            <button
              className={`sidebar-link ${activeSection === "profile" ? "active" : ""}`}
              onClick={() => {
                setActiveSection("profile");
                setSidebarOpen(false);
                navigateToPlayer("profile");
              }}
            >
              <span className="sidebar-icon">👤</span>Profile
            </button>
          </div>

          {/* Pinned to the bottom of the sidebar (margin-top: auto): who you
              are, what you can spend, and the pass you hold. */}
          <div className="sidebar-bottom">
            <button
              type="button"
              className="sb-card sb-profile"
              onClick={() => {
                setActiveSection("profile");
                setSidebarOpen(false);
                navigateToPlayer("profile");
              }}
            >
              <span className="sb-avatar">
                {userProfileImage ? (
                  <Image width={88} height={88} src={userProfileImage} alt={userName} />
                ) : (
                  userName.substring(0, 2).toUpperCase()
                )}
              </span>
              <span className="sb-profile-text">
                <strong title={userName}>{userName}</strong>
                <small>
                  Member
                  {userPositions.length > 0 &&
                    ` · ${userPositions.map((p) => POSITION_LABELS[p] ?? p).join(" / ")}`}
                </small>
              </span>
            </button>

            <div className="sb-card sb-wallet">
              <div className="sb-wallet-head">
                <span className="sb-caption">Wallet balance</span>
                <span className="sb-dot" aria-hidden="true" />
              </div>
              <div className="sb-wallet-row">
                <span className="sb-wallet-amount">
                  {walletBalancePaise !== null
                    ? `₹${(walletBalancePaise / 100).toLocaleString("en-IN")}`
                    : "₹—"}
                </span>
                <button
                  type="button"
                  className="sb-topup"
                  onClick={() => {
                    setActiveSection("wallet");
                    setSidebarOpen(false);
                    navigateToPlayer("wallet");
                  }}
                >
                  <Plus size={14} strokeWidth={3} aria-hidden="true" /> Top up
                </button>
              </div>
            </div>

            {/* Pass card */}
            {(() => {
              // Prefer a v2 pass: active first, then upcoming, then used up.
              const rank = { active: 0, pending: 1, exhausted: 2 } as const;
              const v2 = [...livePasses].sort(
                (a, b) => rank[a.status] - rank[b.status],
              )[0];
              const v1Has = !!playerPass?.type && playerPass.type !== "none";
              const hasPass = !!v2 || v1Has;
              const isExhausted = v2?.status === "exhausted";
              const isExpired = v2
                ? isExhausted
                : v1Has &&
                  !!playerPass?.expiryDate &&
                  isPassExpired(playerPass.expiryDate);
              const isUpcoming = v2
                ? v2.status === "pending"
                : v1Has &&
                  !isExpired &&
                  isPassNotYetActive(playerPass?.startDate);
              const isActive = hasPass && !isExpired && !isUpcoming;
              const startDate = v2 ? v2.activatesAt : playerPass?.startDate;
              const expiryDate = v2 ? v2.expiresAt : playerPass?.expiryDate;
              const monthYear = v2 ? null : playerPass?.passMonthYear;
              const others = v2 ? livePasses.length - 1 : 0;
              const passLabel = v2
                ? v2.name
                : v1Has
                  ? (PASS_LABELS[playerPass!.type] ?? playerPass!.type)
                  : null;
              const passState = isExpired
                ? "expired"
                : isUpcoming
                  ? "upcoming"
                  : isActive
                    ? "active"
                    : "none";
              const badgeLabel = isExpired
                ? isExhausted
                  ? "Used up"
                  : "Expired"
                : isUpcoming
                  ? "Upcoming"
                  : isActive
                    ? "Active"
                    : "No Pass";
              const fmt = (d: string) =>
                new Date(d).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                });
              return (
                <div className={`sb-card sb-pass is-${passState}`}>
                  <InfoTip text="Passes allow you to join games free of charge. Contact an organizer to know more">
                    <div className="sb-pass-head">
                      <span className="sb-pass-title">
                        <span>My pass</span>
                        <InfoTipButton label="About passes" size={15} style={{ marginBottom: 0 }} />
                      </span>
                      <span className="sb-pass-badge">{badgeLabel}</span>
                    </div>
                    <InfoTipPanel style={{ fontSize: 11 }} />
                  </InfoTip>
                  {hasPass && (
                    <>
                      <div className="sb-pass-name">{passLabel}</div>
                      <div className="sb-pass-meta">
                        {monthYear && <div>Month: {monthYear}</div>}
                        {startDate && (
                          <span>
                            {isUpcoming ? "Starts" : "From"} {fmt(startDate)}
                            {expiryDate ? " · " : ""}
                          </span>
                        )}
                        {expiryDate ? (
                          <span>Expires {fmt(expiryDate)}</span>
                        ) : (
                          !monthYear && !startDate && <span>No expiry set</span>
                        )}
                        {others > 0 && (
                          <div>
                            +{others} more pass{others > 1 ? "es" : ""}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="dashboard-main">
          {showPhotoReminder && (
            <div
              style={{
                background: "rgba(200,255,62,0.08)",
                border: "1px solid rgba(200,255,62,0.3)",
                borderRadius: "8px",
                padding: "12px 16px",
                margin: "16px 16px 0",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: "18px" }}>📸</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    color: "#c8ff3e",
                    fontWeight: 700,
                    fontSize: "14px",
                  }}
                >
                  Profile photo required
                </p>
                <p
                  style={{
                    margin: 0,
                    color: "var(--muted)",
                    fontSize: "12px",
                    marginTop: "2px",
                  }}
                >
                  Add a profile photo so organisers and teammates can recognise
                  you.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigateToPlayer("profile")}
                style={{
                  background: "#c8ff3e",
                  color: "#000",
                  border: "none",
                  borderRadius: "6px",
                  padding: "7px 14px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                Add Photo
              </button>
              <button
                type="button"
                onClick={() => setShowPhotoReminder(false)}
                aria-label="Dismiss"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--muted)",
                  cursor: "pointer",
                  fontSize: "18px",
                  lineHeight: 1,
                  flexShrink: 0,
                  padding: "0 4px",
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
