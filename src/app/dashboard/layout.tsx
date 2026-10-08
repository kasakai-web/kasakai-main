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
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { SuccessPopup } from "@/components/ui/SuccessPopup";
import { InfoTip, InfoTipButton, InfoTipPanel } from "@/components/ui/InfoTip";
import CityPicker from "@/components/dashboard/CityPicker";
import { type BrowseContext, getStoredMetro, setStoredMetro } from "@/utils/browse";
import { fetchHosting } from "@/utils/hosting";
import {
  Bell,
  CalendarCheck,
  CalendarX,
  CircleCheckBig,
  CircleQuestionMark,
  Compass,
  LogOut,
  Medal,
  Plus,
  Star,
  Ticket,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import "./dashboard.css";
import "./sidebar.css";
import Image from "next/image";

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

type NavDestination =
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
  | "hosting";

type NavItem = {
  section: PlayerSection;
  destination: NavDestination;
  label: string;
  icon: LucideIcon;
};

// Grouped so the drawer reads as games first, then the player's own things,
// then help. Hosting is conditional and filtered out at render time.
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Games",
    items: [
      { section: "browse",    destination: "browse",    label: "Browse games",    icon: Compass },
      { section: "mygames",   destination: "my-games",  label: "My bookings",     icon: CalendarCheck },
      { section: "cancelled", destination: "cancelled", label: "Cancelled games", icon: CalendarX },
      { section: "completed", destination: "completed", label: "Completed games", icon: CircleCheckBig },
    ],
  },
  {
    label: "Your space",
    items: [
      { section: "ratings",       destination: "ratings",       label: "My feedback",   icon: Star },
      { section: "hosting",       destination: "hosting",       label: "Hosting",       icon: Medal },
      { section: "passes",        destination: "passes",        label: "My passes",     icon: Ticket },
      { section: "wallet",        destination: "wallet",        label: "Wallet",        icon: Wallet },
      { section: "notifications", destination: "notifications", label: "Notifications", icon: Bell },
      { section: "profile",       destination: "profile",       label: "Profile",       icon: User },
    ],
  },
  {
    label: "Help",
    items: [
      { section: "faq", destination: "faq", label: "FAQ", icon: CircleQuestionMark },
    ],
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [userName, setUserName] = useState<string>("User");
  const [userProfileImage, setUserProfileImage] = useState<string>("");
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
    } catch {}
  }, [authenticated]);

  // Re-fetch on auth resolve + on every navigation so the My Pass card stays current
  useEffect(() => {
    refreshProfileMeta();
  }, [refreshProfileMeta, pathname]);

  // Refresh on window focus / tab visible (e.g. an admin changed the pass in
  // another tab). No timer: this already re-runs on every navigation above, and
  // a pass does not change while someone sits on a page.
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

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showLogoutSuccess, setShowLogoutSuccess] = useState(false);

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
  // Logging out lands on the PUBLIC HOME page, not the login form — someone who
  // just chose to leave is a visitor again, not a person trying to sign in. The
  // 401/expiry paths still bounce to /login, because those users DO want back in.
  // The kk-auth-changed dispatch is what tears down the socket (SocketClient)
  // and flips the landing header back to "Login" on arrival.
  const doLogout = () => {
    clearSession();
    localStorage.removeItem("userProfileImage");
    window.dispatchEvent(new CustomEvent("kk-auth-changed"));
    router.replace("/");
  };

  const handleLogout = () => setShowLogoutConfirm(true);


  const navigateToPlayer = (destination: NavDestination) => {
    router.push(destination === "browse" ? "/dashboard" : `/dashboard/${destination}`);
  };

  const goToSection = (section: PlayerSection, destination: NavDestination) => {
    setActiveSection(section);
    setSidebarOpen(false);
    navigateToPlayer(destination);
  };

  // The mobile drawer is a modal surface: Escape closes it and the page behind
  // it must not scroll while it is open.
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [sidebarOpen]);

  const walletLabel =
    walletBalancePaise !== null
      ? `₹${(walletBalancePaise / 100).toLocaleString("en-IN")}`
      : "₹—";
 
  const firstName = userName.trim().split(/\s+/)[0] || userName;
  const metroLabel =
    headerBrowseContext?.metros.find((m) => m.slug === headerMetro)?.label || null;

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
        onConfirm={() => {
          setShowLogoutConfirm(false);
          setShowLogoutSuccess(true);
        }}
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
              <span className="mobile-wallet-icon">💰</span>
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
          aria-label={sidebarOpen ? "Close menu" : "Open menu"}
          aria-expanded={sidebarOpen}
          aria-controls="sidebar"
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
          className={`kk-side-overlay ${sidebarOpen ? "is-open" : ""}`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />

        {/* SIDEBAR */}
        <aside
          className={`kk-side ${sidebarOpen ? "is-open" : ""}`}
          id="sidebar"
          aria-label="Account navigation"
        >
          {/* Profile + wallet */}
          <div className="kk-side-panel kk-side-profile">
            <div className="kk-side-profile-top">
              <button
                type="button"
                className="kk-side-profile-link"
                onClick={() => goToSection("profile", "profile")}
              >
                <span className="kk-side-avatar">
                  {userProfileImage ? (
                    <Image
                      width={88}
                      height={88}
                      src={userProfileImage}
                      alt={userName}
                    />
                  ) : (
                    userName.substring(0, 2).toUpperCase()
                  )}
                </span>
                <span className="kk-side-profile-text">
                  <strong title={userName}>{firstName}</strong>
                  {metroLabel ? (
                    <small className="kk-side-location">
                      <span>Playing in</span> <span>{metroLabel}</span>
                    </small>
                  ) : (
                    <small>View profile</small>
                  )}
                </span>
              </button>
            </div>
            <div className="kk-side-balance">
              <span>Wallet balance</span>
              <b>{walletLabel}</b>
            </div>
            <button
              type="button"
              className="kk-side-topup"
              onClick={() => goToSection("wallet", "wallet")}
            >
              <Plus size={14} aria-hidden="true" /> Top up
            </button>
          </div>

          {/* Navigation */}
          <nav className="kk-side-panel kk-side-nav" aria-label="Main navigation">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="kk-side-group">
                <div className="kk-side-caption">{group.label}</div>
                {group.items
                  .filter((item) => item.section !== "hosting" || hostingNav.show)
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.section;
                    return (
                      <button
                        key={item.section}
                        type="button"
                        className={`kk-side-item ${isActive ? "is-on" : ""}`}
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => goToSection(item.section, item.destination)}
                      >
                        <Icon size={17} aria-hidden="true" className="kk-side-icon" />
                        <span className="kk-side-label">{item.label}</span>
                        {item.section === "hosting" && hostingNav.invites > 0 && (
                          <span className="kk-side-badge">{hostingNav.invites}</span>
                        )}
                        {item.section === "notifications" && sidebarUnread > 0 && (
                          <span className="kk-side-badge is-alert">
                            {sidebarUnread > 99 ? "99+" : sidebarUnread}
                          </span>
                        )}
                        {item.section === "wallet" && walletBalancePaise !== null && (
                          <span className="kk-side-amount">{walletLabel}</span>
                        )}
                      </button>
                    );
                  })}
              </div>
            ))}
          </nav>

          {/* Pass card */}
          {(() => {
            const hasPass = Boolean(playerPass?.type && playerPass.type !== "none");
            const isExpired =
              hasPass &&
              !!playerPass?.expiryDate &&
              isPassExpired(playerPass.expiryDate);
            const isUpcoming =
              hasPass &&
              !isExpired &&
              isPassNotYetActive(playerPass?.startDate);
            const isActive = hasPass && !isExpired && !isUpcoming;
            const passLabel = hasPass
              ? (PASS_LABELS[playerPass!.type] ?? playerPass!.type)
              : "No active pass";
            const passState = isExpired
              ? "expired"
              : isUpcoming
                ? "upcoming"
                : isActive
                  ? "active"
                  : "none";
            const badgeLabel = isExpired
              ? "Expired"
              : isUpcoming
                ? "Upcoming"
                : isActive
                  ? "Active"
                  : null;
            const fmt = (d: string) =>
              new Date(d).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              });
            return (
              <div className={`kk-side-panel kk-side-pass is-${passState}`}>
                <InfoTip text="Passes allow you to join games free of charge. Contact an organizer to know more">
                  <div className="kk-side-pass-head">
                    <span className="kk-side-caption">My pass</span>
                    <InfoTipButton label="About passes" size={16} />
                  </div>
                  <InfoTipPanel style={{ fontSize: 11 }} />
                </InfoTip>
                <div className="kk-side-pass-row">
                  <strong>{passLabel}</strong>
                  {badgeLabel && <span className="kk-side-pass-badge">{badgeLabel}</span>}
                </div>
                {hasPass && (
                  <div className="kk-side-pass-meta">
                    {playerPass?.passMonthYear && (
                      <div>Month: {playerPass.passMonthYear}</div>
                    )}
                    {playerPass?.startDate && (
                      <span>
                        {isUpcoming ? "Starts" : "From"} {fmt(playerPass.startDate)}
                        {playerPass?.expiryDate ? " · " : ""}
                      </span>
                    )}
                    {playerPass?.expiryDate ? (
                      <span>Expires {fmt(playerPass.expiryDate)}</span>
                    ) : (
                      !playerPass?.passMonthYear &&
                      !playerPass?.startDate && <span>No expiry set</span>
                    )}
                  </div>
                )}
                {!hasPass && (
                  <button
                    type="button"
                    className="kk-side-pass-link"
                    onClick={() => goToSection("passes", "passes")}
                  >
                    See passes
                  </button>
                )}
              </div>
            );
          })()}

          <button type="button" className="kk-side-logout" onClick={handleLogout}>
            <LogOut size={16} aria-hidden="true" /> Log out
          </button>
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
