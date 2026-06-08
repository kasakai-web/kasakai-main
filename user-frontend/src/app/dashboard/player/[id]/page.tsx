"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { EventCard, EventStatus } from "@/components/dashboard/EventCard";
import { BookingModal } from "@/components/dashboard/BookingModal";
import type { BookingGuest } from "@/components/dashboard/BookingModal";
import { GameFeedbackModal } from "@/components/dashboard/GameFeedbackModal";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { Toast, useToast } from "@/components/ui/Toast";
import { buildApiUrl, clearSession, getSession } from "@/utils/api";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import "../../player-dashboard.css";

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5)  return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const mins = Math.floor(seconds / 60);
  return `${mins}m ago`;
}

const POPUP_SHOWN_KEY = "kk_feedback_popup_shown";
const getShownPopupIds = (): string[] => {
  try { return JSON.parse(localStorage.getItem(POPUP_SHOWN_KEY) || "[]"); } catch { return []; }
};
const markPopupShown = (gameId: string) => {
  const shown = getShownPopupIds();
  if (!shown.includes(gameId)) {
    localStorage.setItem(POPUP_SHOWN_KEY, JSON.stringify([...shown, gameId]));
  }
};

export default function PlayerDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeParams = useParams<{ id?: string | string[] }>();
  const [activeTab, setActiveTab] = useState<"all" | "my-games" | "cancelled" | "completed">("all");
  const [games, setGames] = useState<any[]>([]);
  const [myGames, setMyGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const openGameId = searchParams.get("openGame");
  const [search, setSearch] = useState("");
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [detailGame, setDetailGame] = useState<any>(null);
  const [cancellingGameId, setCancellingGameId] = useState<string | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const [confirmTitle, setConfirmTitle] = useState<string>("Are you sure?");
  const confirmActionRef = useRef<null | (() => Promise<void>)>(null);
  const { toast, showToast } = useToast();
  const [optingOut, setOptingOut] = useState(false);
  const removingGuestIds = useRef<Set<string>>(new Set());
  const detailGameIdRef = useRef<string | null>(null);
  // Local set of reg IDs removed this session — prevents any background refresh re-showing a removed guest
  const [removedGuestIds, setRemovedGuestIds] = useState<Set<string>>(new Set());
  const tabsRef = useRef<HTMLDivElement>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [playerPositions, setPlayerPositions] = useState<string[]>([]);
  const [myWaitlist, setMyWaitlist] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [pendingFeedback, setPendingFeedback] = useState<any[]>([]);
  const [feedbackTargetGame, setFeedbackTargetGame] = useState<any>(null);
  const [popupFeedbackGame, setPopupFeedbackGame] = useState<any>(null);
  // Per-game feedback I already submitted — loaded when opening a completed game detail
  const [detailGameFeedback, setDetailGameFeedback] = useState<any>(null);
  const [addingGuest, setAddingGuest] = useState(false);
  const [removingGuestId, setRemovingGuestId] = useState<string | null>(null);
  const [showFormatTip, setShowFormatTip] = useState(false);
  const [confirmingGwId, setConfirmingGwId] = useState<string | null>(null);
  const [cancellingGwId, setCancellingGwId] = useState<string | null>(null);
  const [guestPrefOpen, setGuestPrefOpen] = useState(false);
  const [guestPrefGame, setGuestPrefGame] = useState<any>(null);
  const [guestPrefPosition, setGuestPrefPosition] = useState("Any");
  const [guestPrefTeam, setGuestPrefTeam] = useState("No Preference");
  const [guestPrefName, setGuestPrefName] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const playerId = Array.isArray(routeParams?.id) ? routeParams.id[0] : routeParams?.id;
  const { isAuthorized } = useAuthGuard({
    requiredRole: "player",
    routeUserId: playerId,
    redirectTo: "/login?role=player",
  });

  const fetchAllGames = async () => {
    try {
      const { token } = getSession();
      if (!token) {
        setGames([]);
        return;
      }

      const res = await fetch(buildApiUrl("/games"), {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          clearSession();
          router.replace("/login?role=player");
          return;
        }
        setGames([]);
        return;
      }

      const data = await res.json();
      if (data.success) {
        setGames(data.data || []);
      }
    } catch {
      // non-critical — games will stay as-is on network error
    }
  };

  const fetchMyGames = async () => {
    try {
      const { token } = getSession();
      if (!token) {
        setMyGames([]);
        return;
      }

      const res = await fetch(buildApiUrl("/games/my-games"), {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          clearSession();
          router.replace("/login?role=player");
          return;
        }
        setMyGames([]);
        return;
      }

      const data = await res.json();
      if (data.success) {
        setMyGames(data.data || []);
      }
    } catch {
      // non-critical — transient network blip during a background refresh.
      // Keep existing games in place rather than logging a scary error or blanking the list.
    }
  };

  const fetchMyWaitlist = async () => {
    try {
      const { token } = getSession();
      if (!token) { setMyWaitlist([]); return; }
      const res = await fetch(buildApiUrl("/games/my-waitlist"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setMyWaitlist([]); return; }
      const data = await res.json();
      if (data.success) setMyWaitlist(data.data || []);
    } catch {
      setMyWaitlist([]);
    }
  };

  const fetchPlayerProfile = async () => {
    try {
      const { token } = getSession();
      if (!token) return;
      const res = await fetch(buildApiUrl("/players/me"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.data?.preferences?.positions) {
        setPlayerPositions(data.data.preferences.positions);
      }
    } catch {
      // non-critical — positions just won't be pre-filled
    }
  };

  const fetchWalletBalance = async () => {
    try {
      const { token } = getSession();
      if (!token) return;
      const res = await fetch(buildApiUrl("/players/me/wallet"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        const w = data.data?.wallet;
        setWalletBalance((w?.availablePaise ?? w?.balancePaise ?? 0) / 100);
      }
    } catch {
      // non-critical
    }
  };

  const fetchPendingFeedback = async () => {
    try {
      const { token } = getSession();
      if (!token) return;
      const res = await fetch(buildApiUrl("/games/pending-feedback"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        const pending: any[] = data.data || [];
        setPendingFeedback(pending);
        // Show one-time popup for the first game the player hasn't been prompted for yet
        const shown = getShownPopupIds();
        const unseen = pending.find((g: any) => !shown.includes(g._id));
        if (unseen) setPopupFeedbackGame(unseen);
      }
    } catch {
      // non-critical
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchAllGames(), fetchMyGames(), fetchMyWaitlist(), fetchPlayerProfile(), fetchWalletBalance()]);
      setLastUpdated(new Date());
      fetchPendingFeedback();
    } finally {
      setLoading(false);
    }
  };

  // Silent background refresh — no loading spinner, just updates data in-place
  const silentRefresh = useCallback(async () => {
    try {
      await Promise.all([fetchAllGames(), fetchMyGames(), fetchMyWaitlist(), fetchWalletBalance()]);
      setLastUpdated(new Date());
    } catch {
      // non-critical background refresh
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized]);

  // Auto-refresh: every 20 s + on window focus + on tab visible
  useAutoRefresh(isAuthorized ? silentRefresh : null, {
    interval:  20_000,
    onFocus:   true,
    onVisible: true,
    enabled:   isAuthorized,
  });

  useEffect(() => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }

    fetchDashboardData();
  }, [isAuthorized]);

  // Tick the "Updated Xs ago" label every 5 s
  useEffect(() => {
    if (!lastUpdated) return;
    const id = setInterval(() => setLastUpdated((d) => d ? new Date(d) : d), 5_000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  // Real-time wallet: update balance immediately when backend emits wallet-update
  useEffect(() => {
    const handler = (e: Event) => {
      const { availablePaise } = (e as CustomEvent<{ availablePaise: number }>).detail;
      setWalletBalance(availablePaise / 100);
    };
    window.addEventListener("kk-wallet-update", handler);
    return () => window.removeEventListener("kk-wallet-update", handler);
  }, []);

  useEffect(() => { detailGameIdRef.current = detailGame?._id ?? null; }, [detailGame]);

  // Real-time game count: patch spotsRemaining + totalSlots in state immediately
  // when any player joins/leaves/adds or removes a guest on any game.
  // If the modal is open for this game, also trigger a full refresh so waitlist statuses stay current.
  useEffect(() => {
    const handler = (e: Event) => {
      const { gameId, spotsRemaining, totalSlots } = (e as CustomEvent<{ gameId: string; spotsRemaining: number; totalSlots: number }>).detail;
      const patch = (g: any) => g._id === gameId ? { ...g, spotsRemaining, totalSlots } : g;
      setGames((prev) => prev.map(patch));
      setMyGames((prev) => prev.map(patch));
      setMyWaitlist((prev) => prev.map(patch));
      setDetailGame((prev: any) => prev?._id === gameId ? { ...prev, spotsRemaining, totalSlots } : prev);

      if (detailGameIdRef.current === gameId) {
        const { token } = getSession();
        if (!token) return;
        fetch(buildApiUrl(`/api/v1/games/${gameId}`), {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(async (res) => {
            if (!res.ok) return;
            const d = await res.json();
            if (!d.success || !d.data) return;
            const fresh = d.data;
            setDetailGame((prev: any) => {
              if (!prev || prev._id !== fresh._id) return prev;
              return { ...fresh, _isWaitlisted: prev._isWaitlisted, _waitlistStatus: prev._waitlistStatus, _myWaitlistStatus: prev._myWaitlistStatus };
            });
          })
          .catch(() => {});
      }
    };
    window.addEventListener("kk-game-update", handler);
    return () => window.removeEventListener("kk-game-update", handler);
  }, []);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "my-games") {
      setActiveTab("my-games");
      return;
    }
    if (tab === "cancelled" || tab === "canceled") {
      setActiveTab("cancelled");
      return;
    }
    if (tab === "completed") {
      setActiveTab("completed");
      return;
    }
    setActiveTab("all");
  }, [searchParams]);

  // Auto-open game detail when arriving from a waitlist email link (/join/[gameId])
  useEffect(() => {
    if (loading || !openGameId) return;
    const target = [...games, ...myWaitlist, ...myGames].find((g) => g._id === openGameId);
    if (target) {
      setDetailGame(target);
      setActiveTab("my-games");
    }
    // Clear the openGame param from URL so refresh doesn't re-open
    if (playerId) {
      router.replace(`/dashboard/player/${playerId}?tab=my-games`);
    }
  }, [loading, openGameId]); // eslint-disable-line react-hooks/exhaustive-deps



  const openGameDetail = async (game: any) => {
    // Prefer the annotated version from myGames/myWaitlist (has _isMyReg flags) when available
    const annotated =
      myGames.find((g: any) => g._id === game._id) ||
      myWaitlist.find((g: any) => g._id === game._id);
    setDetailGame(annotated || game);
    setDetailGameFeedback(null);

    const { token } = getSession();
    if (!token) return;

    // Silent background refresh — show cached data instantly, update arrays from fresh response
    fetch(buildApiUrl(`/api/v1/games/${game._id}`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) return;
        const d = await res.json();
        if (!d.success || !d.data) return;
        const fresh = d.data;
        setDetailGame((prev: any) => {
          if (!prev || prev._id !== fresh._id) return prev;
          return {
            ...fresh,
            // fresh.passEligible comes from backend if present; fall back to prev to avoid losing it
            passEligible: fresh.passEligible ?? prev.passEligible ?? false,
            _isWaitlisted: prev._isWaitlisted,
            _waitlistStatus: prev._waitlistStatus,
            _myWaitlistStatus: prev._myWaitlistStatus,
          };
        });
        setGames((prev: any[]) =>
          prev.map((g) =>
            g._id === fresh._id
              ? { ...g, spotsRemaining: fresh.spotsRemaining, totalSlots: fresh.totalSlots }
              : g
          )
        );
        setMyGames((prev: any[]) =>
          prev.map((g) => (g._id === fresh._id ? { ...g, ...fresh } : g))
        );
        setMyWaitlist((prev: any[]) =>
          prev.map((g) => (g._id === fresh._id ? { ...g, ...fresh } : g))
        );
      })
      .catch(() => {});

    if (game.status !== "completed") return;
    try {
      const res = await fetch(buildApiUrl(`/api/v1/games/${game._id}/feedback`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success) setDetailGameFeedback(d.data);
      }
    } catch {
      // non-critical
    }
  };

  const changeTab = (tab: "all" | "my-games" | "cancelled" | "completed") => {
    setActiveTab(tab);

    if (typeof window !== "undefined") {
      const sidebarSection = tab === "my-games" ? "mygames" : tab === "cancelled" ? "cancelled" : tab === "completed" ? "completed" : "browse";
      window.dispatchEvent(new CustomEvent("player-tab-change", { detail: sidebarSection }));
    }

    // Auto-scroll to center the active tab
    setTimeout(() => {
      if (tabsRef.current) {
        const activeTabElement = tabsRef.current.querySelector(`[data-tab="${tab}"]`) as HTMLElement;
        if (activeTabElement) {
          const container = tabsRef.current;
          const containerWidth = container.offsetWidth;
          const tabWidth = activeTabElement.offsetWidth;
          const tabLeft = activeTabElement.offsetLeft;
          const tabCenter = tabLeft + tabWidth / 2;
          const containerCenter = containerWidth / 2;
          const scrollLeft = tabCenter - containerCenter;

          container.scrollTo({
            left: Math.max(0, scrollLeft),
            behavior: 'smooth'
          });
        }
      }
    }, 50);

    if (playerId) {
      router.replace(`/dashboard/player/${playerId}?tab=${tab}`);
    }
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsRef.current) {
      const scrollAmount = 200;
      const currentScroll = tabsRef.current.scrollLeft;
      const newScroll = direction === 'left' 
        ? currentScroll - scrollAmount 
        : currentScroll + scrollAmount;
      
      tabsRef.current.scrollTo({
        left: newScroll,
        behavior: 'smooth'
      });
    }
  };

  const handleBook = (game: any) => {
    const organiserCount = getOrganiserCount(game);
    const spotsLeft = typeof game.spotsRemaining === 'number'
      ? game.spotsRemaining
      : game.totalSlots - getActiveRegs(game) - organiserCount;
    const isFull = spotsLeft <= 0;
    const formattedGame = {
      id: game._id,
      _id: game._id,
      venue: `${game.turf?.name || 'TBC'},${game.turf?.address?.city || 'TBC'}`,
      date: new Date(game.scheduledAt).toISOString().split('T')[0],
      time: new Date(game.scheduledAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }),
      format: game.format,
      fee: game.feeInPaise / 100,
      spots: Math.max(0, spotsLeft),
      waitlist: isFull,
      passEligible: Boolean(game.passEligible),
    };
    setSelectedGame(formattedGame);
  };


  const handleCancelRegistration = async (game: any) => {
    const doCancel = async () => {
      const { token } = getSession();
      if (!token) {
        clearSession();
        router.replace("/login?role=player");
        return;
      }

      setCancellingGameId(game._id);
      try {
        const res = await fetch(buildApiUrl(`/api/v1/games/${game._id}/backout`), {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          showToast("error", data.message || "Unable to cancel registration right now.");
          return;
        }

        showToast("success", "Registration cancelled", data.message || "You've been removed from this game.");
        setDetailGame(null);
        setActiveTab("my-games");
        if (playerId) {
          router.replace(`/dashboard/player/${playerId}?tab=my-games`);
        }
        // Strip player's waitlist + guest-waitlist from games state immediately
        // so the 📋 Waitlist panel doesn't show stale names if the game is reopened
        const pid = playerId;
        setGames((prev) => prev.map((g) => {
          if (g._id !== game._id) return g;
          return {
            ...g,
            spotsRemaining: data.data?.spotsRemaining ?? g.spotsRemaining,
            totalSlots: data.data?.totalSlots ?? g.totalSlots,
            waitlist: (g.waitlist || []).filter((w: any) => {
              const wPid = w.player?._id?.toString() ?? w.player?.toString() ?? '';
              return wPid !== pid;
            }),
            guestWaitlist: (g.guestWaitlist || []).filter((gw: any) => {
              const gwPid = gw.player?._id?.toString() ?? gw.player?.toString() ?? '';
              return gwPid !== pid;
            }),
          };
        }));
        setMyGames((prev) => prev.filter((x) => x._id !== game._id));
        fetchWalletBalance();
      } catch (error) {
        console.error("Failed to cancel registration", error);
        showToast("error", "Cancellation failed. Please try again.");
      } finally {
        setCancellingGameId(null);
      }
    };

    const guestCount = (game.registrations || []).filter((r: any) => {
      if (!r.plusOneName) return false;
      return r._isMyReg || r.player?._id?.toString() === playerId || r.player?.toString() === playerId;
    }).length;
    const guestWarning = guestCount > 0
      ? ` Your ${guestCount} guest${guestCount > 1 ? "s" : ""} will also be removed.`
      : "";
    setConfirmMessage(`Do you want to cancel your registration for this event?${guestWarning}`);
    confirmActionRef.current = doCancel;
    setConfirmVisible(true);
  };

  const handleOptOut = (wantToPlay: boolean) => {
    if (!detailGame) return;

    const fee = detailGame.feeInPaise || 0;
    const passCovered = Boolean(detailGame.passEligible);

    // What the player actually paid for their own (non-guest) slot.
    // Pass-covered registrations store amountPaidPaise = 0, so there is nothing to refund.
    const ownReg = (detailGame.registrations || []).find((r: any) =>
      !r.plusOneName && (r._isMyReg || r.player?._id?.toString() === playerId || r.player?.toString() === playerId)
    );
    const ownPaidPaise = ownReg?.amountPaidPaise ?? 0;

    // Build confirmation copy
    if (wantToPlay) {
      const gameFull = detailSpotsLeft === 0;
      if (gameFull) {
        setConfirmTitle("Join waitlist to rejoin?");
        setConfirmMessage(
          myGuestCount > 0
            ? "The game is full. We'll add you to the waitlist and notify you when a slot opens. Your guest is still registered — no charge now."
            : "The game is full. We'll add you to the waitlist and notify you when a slot opens."
        );
      } else {
        setConfirmTitle("Rejoin this game?");
        // Rejoin charge depends on CURRENT pass eligibility — backend re-checks the live pass.
        const feeMsg = passCovered
          ? " Your pass covers this game, so you won't be charged."
          : fee > 0
            ? ` ₹${fee / 100} will be debited from your wallet.`
            : "";
        setConfirmMessage(`You'll be marked as attending again.${feeMsg}`);
      }
    } else {
      setConfirmTitle("Skip this game?");
      const guestCount = (detailGame.registrations || []).filter((r: any) =>
        r.plusOneName && (r._isMyReg || r.player?._id?.toString() === playerId || r.player?.toString() === playerId)
      ).length;
      const guestMsg = guestCount > 0
        ? ` Your ${guestCount} guest${guestCount > 1 ? "s" : ""} will remain registered.`
        : "";
      // Refund reflects what was actually paid for the player's own slot, not the game fee.
      // Pass-covered players paid ₹0 → no refund.
      const feeMsg = ownPaidPaise > 0
        ? ` ₹${ownPaidPaise / 100} will be refunded to your wallet.`
        : passCovered
          ? " Your slot was covered by your pass, so there's nothing to refund."
          : "";
      setConfirmMessage(`You'll be marked as not attending.${guestMsg}${feeMsg}`);
    }

    confirmActionRef.current = async () => {
      const endpoint = wantToPlay ? "opt-back-in" : "opt-out";
      setOptingOut(true);
      try {
        const { token } = getSession();
        if (!token) { clearSession(); router.replace("/login?role=player"); return; }
        const res = await fetch(buildApiUrl(`/api/v1/games/${detailGame._id}/${endpoint}`), {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          showToast("error", data.message || "Unable to update attendance.");
          return;
        }
        if (data.data) {
          // Merge fresh data onto existing detailGame so populated fields (organiser, player names)
          // are never replaced by raw IDs from the response. Only spots/registration flags change.
          setDetailGame((prev: any) => {
            if (!prev || prev._id !== data.data._id) return data.data;
            const mergedRegs = (data.data.registrations || []).map((nr: any) => {
              const existing = (prev.registrations || []).find((r: any) => String(r._id) === String(nr._id));
              if (!existing) return nr;
              return {
                ...nr,
                player: (nr.player && typeof nr.player === 'object' && nr.player.name) ? nr.player : (existing.player ?? nr.player),
              };
            });
            return {
              ...prev,
              ...data.data,
              organiser: (data.data.organiser && typeof data.data.organiser === 'object' && data.data.organiser.name)
                ? data.data.organiser
                : (prev.organiser ?? data.data.organiser),
              registrations: mergedRegs,
            };
          });
          setMyGames((prev: any[]) => prev.map((g: any) => g._id === data.data._id ? { ...g, ...data.data } : g));
        }
        if (data.code === "JOINED_WAITLIST") {
          showToast("success", "Added to waitlist", "We'll notify you when a spot opens. Your guests are still registered.");
        } else {
          showToast("success", wantToPlay ? "You're back in!" : "Opted out — your guests remain registered.", data.message);
        }
      } catch {
        showToast("error", "Something went wrong. Please try again.");
      } finally {
        setOptingOut(false);
      }
    };

    setConfirmVisible(true);
  };

  const handleConfirmBooking = async (
    game: any,
    guests: BookingGuest[],
    teamPreference: string,
    willingIfFormatChange: boolean,
    waitlistGuests?: BookingGuest[],
  ) => {
    try {
      const { token } = getSession();
      if (!token) {
        clearSession();
        router.replace("/login?role=player");
        return;
      }

      const isWaitlist = Boolean(game.waitlist);
      const endpoint = isWaitlist
        ? `/api/v1/games/${game._id}/waitlist`
        : `/api/v1/games/${game._id}/register`;

      const body: any = {
        teamPreference,
        positions: playerPositions,
        guests: guests.map((g, index) => {
          const fallbackName = `Guest ${index + 1}`;
          return {
            name: (g.name || fallbackName).trim() || fallbackName,
            position: g.position || "Any",
            teamPreference: g.teamPreference || "No Preference",
          };
        }),
      };
      if (!isWaitlist) body.willingIfFormatChange = willingIfFormatChange;
      if (!isWaitlist && waitlistGuests && waitlistGuests.length > 0) {
        body.waitlistGuests = waitlistGuests.map((g, index) => {
          const fallbackName = `Guest ${index + 1}`;
          return {
            name: (g.name || fallbackName).trim() || fallbackName,
            position: g.position || "Any",
            teamPreference: g.teamPreference || "No Preference",
          };
        });
      }

      const res = await fetch(buildApiUrl(endpoint), {
        method: 'POST',
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        setSelectedGame(null);
        fetchWalletBalance();
        // Patch state immediately from the response — no setTimeout, no full re-fetch
        if (data.data) {
          const g = data.data;
          const countPatch = { spotsRemaining: g.spotsRemaining, totalSlots: g.totalSlots };
          setGames((prev) => prev.map((x) => x._id === g._id ? { ...x, ...countPatch } : x));
          setMyGames((prev) => {
            const has = prev.some((x) => x._id === g._id);
            return has ? prev.map((x) => x._id === g._id ? g : x) : [...prev, g];
          });
        }
        if (isWaitlist) {
          showToast("success", "Joined Waitlist!", "We'll notify you when a spot opens.");
          // Patch myWaitlist immediately from response — no re-fetch needed
          if (data.data) {
            const wg = { ...data.data, _isWaitlisted: true, _waitlistStatus: 'waiting', _myWaitlistStatus: data.data._myWaitlistStatus || 'waiting' };
            setMyWaitlist((prev) => [...prev.filter((x) => x._id !== wg._id), wg]);
          }
          // Confirm with fresh server data so My Games tab updates even if the
          // optimistic patch above is lost during a concurrent React render.
          fetchMyWaitlist();
          fetchMyGames();
        } else {
          const autoGuests: string[] = data.autoConfirmedGuests || [];
          const waitlistAdded: number = data.waitlistGuestsAdded || 0;
          let msg = "✓ Event booking confirmed!";
          let subtitle: string | undefined;
          if (autoGuests.length === 1) {
            subtitle = `${autoGuests[0]} also confirmed from waitlist`;
          } else if (autoGuests.length > 1) {
            subtitle = `${autoGuests.length} guests also confirmed from waitlist`;
          }
          if (waitlistAdded > 0) {
            const wlLine = `${waitlistAdded} guest${waitlistAdded > 1 ? 's' : ''} added to waitlist`;
            subtitle = subtitle ? `${subtitle} · ${wlLine}` : wlLine;
            // Guest waitlist entries — patch myWaitlist immediately
            if (data.data) {
              setMyWaitlist((prev) => prev.map((x) => x._id === data.data._id ? { ...x, guestWaitlist: data.data.guestWaitlist } : x));
            }
          }
          showToast("success", msg, subtitle);
          setActiveTab("my-games");
          if (playerId) router.replace(`/dashboard/player/${playerId}?tab=my-games`);
          // Confirm with fresh server data so My Games tab updates even if the
          // optimistic setMyGames patch above is lost during the router.replace render.
          fetchMyGames();
        }
      } else {
        if (data.code === "INSUFFICIENT_BALANCE") {
          setSelectedGame(null);
          showToast("error", "Insufficient balance", "Please recharge your wallet to sign up.");
          if (playerId) {
            setTimeout(() => router.push(`/dashboard/player/${playerId}/wallet`), 1000);
          }
        } else if (data.code === "RACE_REFUND_FAILED") {
          setSelectedGame(null);
          showToast("error", "Spot taken", "We couldn't auto-refund. Please contact support.");
        } else {
          showToast("error", data.message || (isWaitlist ? "Waitlist failed." : "Registration failed."));
          setSelectedGame(null);
          // Backend debited then refunded on a race loss — re-sync wallet balance
          if (res.status === 409) fetchWalletBalance();
        }
      }
    } catch {
      showToast("error", "An error occurred. Please try again.");
      setSelectedGame(null);
    }
  };

  const handleLeaveWaitlist = async (game: any) => {
    const { token } = getSession();
    if (!token) { clearSession(); router.replace("/login?role=player"); return; }
    const doLeave = async () => {
      try {
        const res = await fetch(buildApiUrl(`/api/v1/games/${game._id}/leave-waitlist`), {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          showToast("error", data.message || "Failed to leave waitlist.");
          return;
        }
        showToast("success", "Removed from waitlist");
        setDetailGame(null);
        setMyWaitlist((prev) => prev.filter((x) => x._id !== game._id));
        // Strip player's waitlist + guest-waitlist entries from games state immediately
        // so the panel doesn't show stale names if the same game is opened again
        const pid = playerId;
        setGames((prev) => prev.map((g) => {
          if (g._id !== game._id) return g;
          return {
            ...g,
            waitlist: (g.waitlist || []).filter((w: any) => {
              const wPid = w.player?._id?.toString() ?? w.player?.toString() ?? '';
              return wPid !== pid;
            }),
            guestWaitlist: (g.guestWaitlist || []).filter((gw: any) => {
              const gwPid = gw.player?._id?.toString() ?? gw.player?.toString() ?? '';
              return gwPid !== pid;
            }),
          };
        }));
      } catch {
        showToast("error", "Failed to leave waitlist. Please try again.");
      }
    };

    setConfirmMessage("Remove yourself from the waitlist for this event?");
    confirmActionRef.current = doLeave;
    setConfirmVisible(true);
  };

  const promptAddGuest = (game: any) => {
    setGuestPrefGame(game);
    setGuestPrefPosition("Any");
    setGuestPrefTeam("No Preference");
    setGuestPrefName("");
    setGuestPrefOpen(true);
  };

  const handleAddGuest = async (game: any, position = "Any", teamPreference = "No Preference", guestName = "") => {
    const { token } = getSession();
    if (!token) { clearSession(); router.replace("/login?role=player"); return; }
    setAddingGuest(true);
    setGuestPrefOpen(false);
    try {
      const body: Record<string, string> = { position, teamPreference };
      if (guestName.trim()) body.guestName = guestName.trim();
      const res = await fetch(buildApiUrl(`/api/v1/games/${game._id}/add-guest`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.code === "INSUFFICIENT_BALANCE") {
          showToast("error", "Insufficient wallet balance");
          if (playerId) setTimeout(() => router.push(`/dashboard/player/${playerId}/wallet`), 1000);
        } else if (data.code === "RACE_REFUND_FAILED") {
          showToast("error", "Spot taken", "We couldn't auto-refund. Please contact support.");
        } else {
          showToast("error", data.message || "Failed to add guest.");
        }
        return;
      }
      const g = data.data;
      setDetailGame(g);
      setMyGames((prev) => prev.map((x) => x._id === g._id ? g : x));
      setGames((prev) => prev.map((x) => x._id === g._id ? { ...x, spotsRemaining: g.spotsRemaining, totalSlots: g.totalSlots } : x));
      fetchWalletBalance();
      if (data.waitlisted) {
        showToast("success", "Added to Waitlist", "You'll be notified when a spot opens.");
      } else {
        showToast("success", "Guest Added!", data.message || undefined);
      }
    } catch {
      showToast("error", "Failed to add guest. Please try again.");
    } finally {
      setAddingGuest(false);
    }
  };

  const handleConfirmGuestWaitlist = async (game: any, gwId: string) => {
    const { token } = getSession();
    if (!token) { clearSession(); router.replace("/login?role=player"); return; }
    setConfirmingGwId(gwId);
    try {
      const res = await fetch(buildApiUrl(`/api/v1/games/${game._id}/confirm-guest-waitlist/${gwId}`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.code === "INSUFFICIENT_BALANCE") {
          showToast("error", "Insufficient wallet balance");
          if (playerId) setTimeout(() => router.push(`/dashboard/player/${playerId}/wallet`), 1000);
        } else if (data.code === "RACE_REFUND_FAILED") {
          showToast("error", "Slot taken", "We couldn't auto-refund your payment. Please contact support.");
        } else {
          showToast("error", data.message || "Could not confirm guest.");
          if (res.status === 409) {
            // Slot was taken — backend reset status to 'waiting' and refunded; re-sync both
            fetchWalletBalance();
            // Refresh game data so the stale "Confirm" button disappears
            setDetailGame((prev: any) => {
              if (!prev) return prev;
              return {
                ...prev,
                guestWaitlist: (prev.guestWaitlist || []).map((g: any) =>
                  g._id === gwId ? { ...g, status: "waiting" } : g
                ),
              };
            });
          }
        }
        return;
      }
      const cg = data.data;
      setDetailGame(cg);
      setMyGames((prev) => prev.map((x) => x._id === cg._id ? cg : x));
      setGames((prev) => prev.map((x) => x._id === cg._id ? { ...x, spotsRemaining: cg.spotsRemaining, totalSlots: cg.totalSlots } : x));
      fetchWalletBalance();
      const feeAmt = detailGame?.feeInPaise || 0;
      showToast("success", "Guest Confirmed!", feeAmt > 0 ? `₹${Math.round(feeAmt / 100)} debited from your wallet.` : undefined);
    } catch {
      showToast("error", "Failed to confirm guest. Please try again.");
    } finally {
      setConfirmingGwId(null);
    }
  };

  const handleCancelGuestWaitlist = async (game: any, gwId: string, guestName: string) => {
    const doCancel = async () => {
      const { token } = getSession();
      if (!token) { clearSession(); router.replace("/login?role=player"); return; }
      setCancellingGwId(gwId);
      try {
        const res = await fetch(buildApiUrl(`/api/v1/games/${game._id}/cancel-guest-waitlist/${gwId}`), {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok || !data.success) { showToast("error", data.message || "Failed to remove from waitlist."); return; }
        const wg = data.data;
        setDetailGame(wg);
        setMyGames((prev) => prev.map((x) => x._id === wg._id ? wg : x));
        // Patch myWaitlist in-place — no re-fetch needed
        setMyWaitlist((prev) => prev.map((x) => x._id === wg._id ? wg : x));
        showToast("success", `${guestName} removed from waitlist`);
      } catch {
        showToast("error", "Failed to remove from waitlist.");
      } finally {
        setCancellingGwId(null);
      }
    };
    setConfirmMessage(`Remove ${guestName} from the waitlist?`);
    confirmActionRef.current = doCancel;
    setConfirmVisible(true);
  };

  const handleRemoveGuest = async (game: any, regId: string) => {
    if (removingGuestIds.current.has(regId)) return;
    removingGuestIds.current.add(regId);
    const { token } = getSession();
    if (!token) {
      removingGuestIds.current.delete(regId);
      // Rollback local removal
      setRemovedGuestIds((prev) => { const s = new Set(prev); s.delete(regId); return s; });
      clearSession(); router.replace("/login?role=player"); return;
    }
    setRemovingGuestId(regId);
    try {
      const res = await fetch(buildApiUrl(`/api/v1/games/${game._id}/remove-guest/${regId}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        // Rollback: make the guest reappear
        setRemovedGuestIds((prev) => { const s = new Set(prev); s.delete(regId); return s; });
        showToast("error", data.message || "Failed to remove guest.");
        return;
      }
      // Confirm server state with immediate patch — no re-fetch needed
      const rg = data.data;
      setDetailGame(rg);
      setMyGames((prev) => prev.map((x) => x._id === rg._id ? rg : x));
      setGames((prev) => prev.map((x) => x._id === rg._id ? { ...x, spotsRemaining: rg.spotsRemaining, totalSlots: rg.totalSlots } : x));
      fetchWalletBalance();
      const refundAmt = data.refundAmountPaise || 0;
      showToast("success", "Guest Removed", refundAmt > 0 ? `₹${Math.round(refundAmt / 100)} will be refunded shortly.` : undefined);
    } catch {
      setRemovedGuestIds((prev) => { const s = new Set(prev); s.delete(regId); return s; });
      showToast("error", "Failed to remove guest. Please try again.");
    } finally {
      setRemovingGuestId(null);
      removingGuestIds.current.delete(regId);
    }
  };

  const promptRemoveGuest = (game: any, regId: string, guestName: string) => {
    const fee = game?.feeInPaise || 0;
    const refundMsg = fee > 0 ? ` ₹${Math.round(fee / 100)} will be refunded to your wallet.` : "";
    setConfirmTitle("Remove Guest");
    setConfirmMessage(`Remove ${guestName} from this game?${refundMsg}`);
    confirmActionRef.current = async () => {
      setRemovedGuestIds((prev) => new Set(prev).add(regId));
      await handleRemoveGuest(game, regId);
    };
    setConfirmVisible(true);
  };

  const cancelledGames = myGames.filter((game) => {
    const normalizedStatus = String(game.status || "").trim().toLowerCase();
    return normalizedStatus.startsWith("cancel");
  });
  const completedGames = myGames.filter((game) => {
    const normalizedStatus = String(game.status || "").trim().toLowerCase();
    if (normalizedStatus.startsWith("cancel")) return false;
    if (normalizedStatus.startsWith("complete")) return true;

    const scheduledAt = new Date(game.scheduledAt).getTime();
    return Number.isFinite(scheduledAt) && scheduledAt < Date.now();
  });
  const getOrganiserCount = (game: any) => (game.organiserIsPlaying ? 1 : 0);
  const getActiveRegs = (game: any) => (game.registrations || []).filter(
    (r: any) => !['refunded', 'forfeited'].includes(r.paymentStatus) && !r.optedOut
  ).length;
  const getTotalPlayers = (game: any) => getActiveRegs(game) + getOrganiserCount(game);
  // In "My Games" tab, merge registered + waitlisted games; exclude cancelled and completed games
  const myGamesWithWaitlist = [
    ...myGames.filter((g) => {
      const status = String(g.status || "").trim().toLowerCase();
      const isCancelled = status.startsWith("cancel");
      const isCompleted = status.startsWith("complete") || new Date(g.scheduledAt).getTime() < Date.now();
      return !isCancelled && !isCompleted;
    }),
    ...myWaitlist
      .filter((wg) => {
        const status = String(wg.status || "").trim().toLowerCase();
        const isCancelled = status.startsWith("cancel");
        const isCompleted = new Date(wg.scheduledAt).getTime() < Date.now();
        return !isCancelled && !isCompleted && !myGames.some((mg) => mg._id === wg._id);
      })
      .map((wg) => ({ ...wg, _isWaitlisted: true, _waitlistStatus: wg._myWaitlistStatus || 'waiting' })),
  ];

  const gamesToDisplay = activeTab === 'all'
    ? games
    : activeTab === 'my-games'
      ? myGamesWithWaitlist
      : activeTab === 'cancelled'
        ? cancelledGames
        : completedGames;
  const isCancelledGame = (game: any) => String(game.status || "").trim().toLowerCase().startsWith("cancel");
  const filteredGames = gamesToDisplay.filter(g => 
    g.turf?.name?.toLowerCase().includes(search.toLowerCase()) ||
    g.turf?.location?.city?.toLowerCase().includes(search.toLowerCase())
  );
  const orderedGames = [...filteredGames].sort((a, b) => {
    const aCancelled = isCancelledGame(a);
    const bCancelled = isCancelledGame(b);

    if (aCancelled !== bCancelled) {
      return aCancelled ? 1 : -1;
    }

    const aTime = new Date(a.scheduledAt).getTime();
    const bTime = new Date(b.scheduledAt).getTime();
    return aTime - bTime;
  });

  const detailRows = detailGame ? [
    { label: "Venue", value: detailGame.turf?.name || "TBC" },
    { label: "City", value: detailGame.turf?.address?.city || "TBC" },
    { label: "Date", value: new Date(detailGame.scheduledAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" }) },
    { label: "Start Time", value: new Date(detailGame.scheduledAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" }) },
    {
      label: "Report By",
      value: (() => {
        const scheduled = new Date(detailGame.scheduledAt);
        const reportMins = Number(detailGame.reportingMinsBeforeGame ?? 30);
        if (Number.isNaN(scheduled.getTime())) return "TBC";
        return new Date(scheduled.getTime() - reportMins * 60000).toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
        });
      })(),
    },
    { label: "Duration", value: detailGame.durationMins ? `${detailGame.durationMins} mins` : "60 mins" },
    { label: "Format", value: detailGame.format || "TBC", info: "Turf and team size may change based on player turnout" },
    { label: "Fee", value: detailGame.passEligible && (detailGame.feeInPaise || 0) > 0 ? `₹0 (Pass Covered — was ₹${(detailGame.feeInPaise || 0) / 100})` : `₹${(detailGame.feeInPaise || 0) / 100}` },
    { label: "Total Slots", value: String(detailGame.totalSlots || 0) },
    { label: "Players", value: String(
      typeof detailGame.spotsRemaining === 'number'
        ? detailGame.totalSlots - detailGame.spotsRemaining
        : getTotalPlayers(detailGame)
    ) },
    { label: "Status", value: String(detailGame.status || "open") },
  ] : [];
  const detailIsRegistered = !!detailGame && myGames.some((myGame) => myGame._id === detailGame._id);
  const detailIsWaitlisted = !!detailGame && myWaitlist.some((wg) => wg._id === detailGame._id);
  const detailIsCancelled = !!detailGame && String(detailGame.status || "").toLowerCase().startsWith("cancel");
  // Once reporting time (start − reportingMinsBeforeGame) has passed, players can no
  // longer change participation. Mirrors the backend isPastReportingTime guard.
  const detailPastReporting = !!detailGame && (() => {
    const reportMins = Number(detailGame.reportingMinsBeforeGame ?? 30);
    return Date.now() >= new Date(detailGame.scheduledAt).getTime() - reportMins * 60000;
  })();
  const myWaitlistStatus: string = (detailIsWaitlisted && detailGame)
    ? (myWaitlist.find((wg: any) => wg._id === detailGame._id)?._myWaitlistStatus || "waiting")
    : "waiting";
  // Live registrations excluding locally-removed guests (so UI is instant, no re-flash on any refresh)
  const liveRegistrations = (detailGame?.registrations || []).filter(
    (r: any) => !removedGuestIds.has(String(r._id))
  );

  // Player's own (non-guest) registration in the detail game
  const myOwnReg = (detailIsRegistered && detailGame)
    ? (detailGame.registrations || []).find((r: any) => {
        if (r.plusOneName) return false;
        return r._isMyReg || r.player?._id?.toString() === playerId || r.player?.toString() === playerId;
      })
    : null;
  const isOptedOut = myOwnReg?.optedOut === true;
  // Player opted out AND is now on the waitlist to rejoin (game was full when they tried).
  // Use _isMine when present (set by getMyGames); fall back to direct ID compare for data
  // from getGameById (lean, no annotation) so the state survives the background refresh.
  const isOnRejoinWaitlist = isOptedOut && !!(detailGame?.waitlist || []).find((w: any) => {
    const wPid = w.player?._id?.toString() ?? w.player?.toString() ?? '';
    return (w._isMine || wPid === playerId) && w.source === 'opted_out_rejoin' && ['waiting', 'notified'].includes(w.status);
  });

  // Prefer backend spotsRemaining (always present after the fix); local filter as fallback
  const detailSpotsLeft = detailGame
    ? typeof detailGame.spotsRemaining === 'number'
      ? detailGame.spotsRemaining
      : Math.max(0,
          detailGame.totalSlots
          - (liveRegistrations.filter((r: any) => !['refunded','forfeited'].includes(r.paymentStatus) && !r.optedOut).length)
          - (detailGame.organiserIsPlaying ? 1 : 0)
        )
    : 0;
  const detailFilledSlots = detailGame ? detailGame.totalSlots - detailSpotsLeft : 0;
  const organiserEntry = detailGame?.organiserIsPlaying
    ? [{ key: "organiser", regId: null, name: detailGame.organiser?.name || "Organiser", position: "any", team: "none", isGuest: false, isOrganiser: true, canRemove: false }]
    : [];
  const detailPlayers = [
    ...organiserEntry,
    ...liveRegistrations.map((reg: any, index: number) => ({
      key: `${reg._id || "reg"}-${index}`,
      regId: reg._id,
      name: reg.plusOneName || reg.player?.name || "Player",
      position: reg.preferredPosition || "any",
      team: reg.teamPreference || "none",
      isGuest: Boolean(reg.plusOneName),
      canRemove: Boolean(reg.plusOneName) && Boolean(reg._isMyReg),
    })),
  ];

  // Current player's guest registrations.
  // _isMyReg is set by backend when game comes from myGames/add/remove responses.
  // Fall back to playerId comparison for games opened from the browse tab.
  const myGuests = (detailIsRegistered && detailGame)
    ? (detailGame?.registrations || []).filter((reg: any) => {
        if (removedGuestIds.has(String(reg._id))) return false;
        const isMine = reg._isMyReg
          || reg.player?._id?.toString() === playerId
          || reg.player?.toString() === playerId;
        return isMine && reg.plusOneName;
      })
    : [];
  const myGuestCount = myGuests.length;

  // Guest waitlist entries belonging to current player.
  // Visible both when registered (guest confirmed a slot separately) and when
  // waitlisted (guests waitlisted alongside the player, auto-confirmed on registration).
  const myGuestWaitlist = ((detailIsRegistered || detailIsWaitlisted) && detailGame)
    ? (detailGame?.guestWaitlist || []).filter((g: any) => {
        const isMine = g._isMine || g.player?.toString() === playerId || g.player?._id?.toString() === playerId;
        return isMine && ['waiting', 'notified'].includes(g.status);
      })
    : [];

  return (
    <div className="player-dashboard-container">
      {toast && <Toast type={toast.type} title={toast.title} subtitle={toast.subtitle} onClose={() => {}} />}


      <div className="page-header">
        <div className="page-title-group">
          <div className="page-eyebrow">
            <span className="live-badge">
              <span className="live-dot" />
              Live
            </span>
          </div>
          <div className="page-title">Your Football <span>World</span></div>
        </div>
        <div className="page-actions">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by venue or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="tabs-section">
        <div className="tab-navigation-container">
          <button className="tab-scroll-btn left" onClick={() => scrollTabs('left')}>
            ‹
          </button>
          <div className="tab-navigation player-tab-navigation" ref={tabsRef}>
            <button
              className={`tab-btn player-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => changeTab('all')}
              data-tab="all"
            >
              <span className="tab-icon">⚽</span>
              <span className="tab-text">All Games</span>
              <span className="tab-badge">{games.length}</span>
            </button>
            <button
              className={`tab-btn player-tab-btn ${activeTab === 'my-games' ? 'active' : ''}`}
              onClick={() => changeTab('my-games')}
              data-tab="my-games"
            >
              <span className="tab-icon">🎫</span>
              <span className="tab-text">My Games</span>
              <span className="tab-badge">{myGamesWithWaitlist.length}</span>
            </button>
            <button
              className={`tab-btn player-tab-btn ${activeTab === 'cancelled' ? 'active' : ''}`}
              onClick={() => changeTab('cancelled')}
              data-tab="cancelled"
            >
              <span className="tab-icon">🚫</span>
              <span className="tab-text">Cancelled</span>
              <span className="tab-badge">{cancelledGames.length}</span>
            </button>
            <button
              className={`tab-btn player-tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
              onClick={() => changeTab('completed')}
              data-tab="completed"
            >
              <span className="tab-icon">🏆</span>
              <span className="tab-text">Completed</span>
              <span className="tab-badge">{completedGames.length}</span>
            </button>
          </div>
          <button className="tab-scroll-btn right" onClick={() => scrollTabs('right')}>
            ›
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="loading-container"><div className="spinner"></div><p>Loading games...</p></div>
      ) : (
        <div className="events-grid">
          {orderedGames.length > 0 ? orderedGames.map(game => {
            const organiserCount = getOrganiserCount(game);
            const spotsLeft = typeof game.spotsRemaining === 'number'
              ? game.spotsRemaining
              : game.totalSlots - getActiveRegs(game) - organiserCount;
            return (
              <EventCard
                key={game._id}
                  id={game._id}
                  title={game.title}
                  status={game.status as EventStatus}
                  venue={game.turf?.name || 'TBC'}
                  city={game.turf?.address?.city || 'TBC'}
                  date={new Date(game.scheduledAt).toISOString().split('T')[0]}
                  time={new Date(game.scheduledAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
                  format={game.format}
                  fee={game.feeInPaise / 100}
                  passEligible={Boolean(game.passEligible)}
                  spotsTotal={game.totalSlots}
                  spotsLeft={Math.max(0, spotsLeft)}
                  isRegistered={myGames.some(myGame => myGame._id === game._id)}
                  isWaitlisted={Boolean(game._isWaitlisted) || myWaitlist.some(wg => wg._id === game._id)}
                  isWaitlistApproved={game._waitlistStatus === 'approved' || myWaitlist.some(wg => wg._id === game._id && wg._myWaitlistStatus === 'approved')}
                  cancelReason={game.cancelReason}
                  players={game.registrations?.map((reg: any) => ({
                    name: reg.plusOneName || reg.player?.name || 'Player',
                    initials: (reg.plusOneName || reg.player?.name || 'P').substring(0, 2).toUpperCase(),
                    pos: reg.preferredPosition || 'any',
                  })) || []}
                  onBook={() => handleBook(game)}
                  onViewDetails={() => openGameDetail(game)}
                  onRateGame={
                    activeTab === "completed" &&
                    game.status === "completed" &&
                    pendingFeedback.some((pf) => pf._id === game._id)
                      ? () => setFeedbackTargetGame(game)
                      : undefined
                  }
                />
            )
          }) : (
            <div className="empty-state">
              <h3>No games found</h3>
              <p>There are no games matching your criteria.</p>
            </div>
          )}
        </div>
      )}

      {/* One-time popup: shown once per game after organiser marks it complete */}
      {popupFeedbackGame && (
        <GameFeedbackModal
          game={popupFeedbackGame}
          isPopup
          onSkip={() => {
            markPopupShown(popupFeedbackGame._id);
            setPopupFeedbackGame(null);
          }}
          onSubmit={() => {
            markPopupShown(popupFeedbackGame._id);
            setPopupFeedbackGame(null);
            showToast("success", "Feedback submitted!", "Thank you for your response.");
            fetchPendingFeedback();
          }}
        />
      )}

      {/* Feedback modal triggered from completed tab "Rate Game" button */}
      {!popupFeedbackGame && feedbackTargetGame && (
        <GameFeedbackModal
          game={feedbackTargetGame}
          onSkip={() => setFeedbackTargetGame(null)}
          onSubmit={() => {
            setFeedbackTargetGame(null);
            showToast("success", "Feedback submitted!", "Thank you for your response.");
            fetchPendingFeedback();
          }}
        />
      )}

      {selectedGame && (
        <BookingModal
          game={selectedGame}
          walletBalance={walletBalance}
          onClose={() => setSelectedGame(null)}
          onConfirm={handleConfirmBooking}
          playerPositions={playerPositions}
          playerId={playerId}
        />
      )}

      <ConfirmationModal
        open={confirmVisible}
        title={confirmTitle}
        message={confirmMessage || "Do you want to continue?"}
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        loading={!!cancellingGameId}
        onCancel={() => {
          setConfirmVisible(false);
          confirmActionRef.current = null;
          setConfirmMessage(null);
          setConfirmTitle("Are you sure?");
        }}
        onConfirm={async () => {
          setConfirmVisible(false);
          const action = confirmActionRef.current;
          confirmActionRef.current = null;
          setConfirmMessage(null);
          setConfirmTitle("Are you sure?");
          if (action) {
            await action();
          }
        }}
      />

      {/* ── Add Guest Preferences Mini-Modal ── */}
      {guestPrefOpen && guestPrefGame && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setGuestPrefOpen(false)}
        >
          <div
            style={{ background: "#0f0f1e", border: "1px solid #333", borderRadius: 12, padding: "24px 20px", width: "100%", maxWidth: 360 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: "#c8ff3e", margin: "0 0 4px", fontSize: 17 }}>Add Guest</h3>
            <p style={{ color: "#666", fontSize: 12, margin: "0 0 20px" }}>Set your guest's name, position and team.</p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ color: "#aaa", fontSize: 12, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Guest Name <span style={{ color: "#555", textTransform: "none" }}>(optional)</span></label>
              <input
                type="text"
                value={guestPrefName}
                onChange={(e) => setGuestPrefName(e.target.value)}
                placeholder="e.g. Rahul"
                maxLength={40}
                style={{
                  width: "100%", background: "#1a1a2e", border: "1px solid #444", borderRadius: 7,
                  padding: "10px 12px", color: "white", fontSize: 14, outline: "none", boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#c8ff3e")}
                onBlur={(e) => (e.target.style.borderColor = "#444")}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ color: "#aaa", fontSize: 12, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Position</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(["Any", "GK", "DEF", "MID", "FWD"] as const).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setGuestPrefPosition(pos)}
                    style={{
                      padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      background: guestPrefPosition === pos ? "rgba(200,255,62,0.18)" : "rgba(255,255,255,0.04)",
                      color: guestPrefPosition === pos ? "#c8ff3e" : "#888",
                      border: `1px solid ${guestPrefPosition === pos ? "rgba(200,255,62,0.5)" : "rgba(255,255,255,0.08)"}`,
                    }}
                  >{pos}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ color: "#aaa", fontSize: 12, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Team</label>
              <div style={{ display: "flex", gap: 6 }}>
                {(["No Preference", "Red Team", "Blue Team"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setGuestPrefTeam(t)}
                    style={{
                      padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      background: guestPrefTeam === t ? (t === "Red Team" ? "rgba(220,38,38,0.18)" : t === "Blue Team" ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.08)") : "rgba(255,255,255,0.04)",
                      color: guestPrefTeam === t ? (t === "Red Team" ? "#f87171" : t === "Blue Team" ? "#60a5fa" : "#c8ff3e") : "#888",
                      border: `1px solid ${guestPrefTeam === t ? (t === "Red Team" ? "rgba(220,38,38,0.4)" : t === "Blue Team" ? "rgba(59,130,246,0.4)" : "rgba(200,255,62,0.4)") : "rgba(255,255,255,0.08)"}`,
                    }}
                  >{t === "No Preference" ? "No Pref" : t}</button>
                ))}
              </div>
            </div>

            {/* Fee warning */}
            {guestPrefGame?.spotsRemaining === 0 ? (
              <div style={{
                background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)",
                borderRadius: 8, padding: "10px 14px", marginBottom: 16,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>Game is full — joining waitlist</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                  {(guestPrefGame?.feeInPaise || 0) > 0
                    ? `₹${Math.round(guestPrefGame.feeInPaise / 100)} will only be charged if a spot opens and you confirm.`
                    : "You'll be notified when a slot opens."}
                </div>
              </div>
            ) : (guestPrefGame?.feeInPaise || 0) > 0 ? (
              <div style={{
                background: "rgba(200,255,62,0.05)", border: "1px solid rgba(200,255,62,0.2)",
                borderRadius: 8, padding: "10px 14px", marginBottom: 16,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{ fontSize: 22, lineHeight: 1 }}>₹</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#c8ff3e" }}>
                    ₹{Math.round(guestPrefGame.feeInPaise / 100)} will be deducted from your wallet
                  </div>
                  <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                    Charged immediately when you add the guest.
                  </div>
                </div>
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setGuestPrefOpen(false)}
                style={{ flex: 1, padding: "10px", borderRadius: 7, background: "transparent", border: "1px solid #444", color: "#888", fontSize: 14, cursor: "pointer" }}
              >Cancel</button>
              <button
                type="button"
                onClick={() => handleAddGuest(guestPrefGame, guestPrefPosition, guestPrefTeam, guestPrefName)}
                style={{ flex: 2, padding: "10px", borderRadius: 7, background: "#c8ff3e", color: "#000", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer" }}
              >
                {guestPrefGame?.spotsRemaining === 0
                  ? "Join Waitlist"
                  : (guestPrefGame?.feeInPaise || 0) > 0
                    ? `Add Guest (₹${Math.round(guestPrefGame.feeInPaise / 100)})`
                    : "Add Guest"}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailGame && (
        <div className="modal-overlay pd-event-modal-overlay" onClick={() => { setDetailGame(null); setDetailGameFeedback(null); setRemovedGuestIds(new Set()); setShowFormatTip(false); }}>
          <div
            className="modal-content pd-event-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle — visible on mobile only */}
            <div className="pd-modal-handle" />

            {/* ── Sticky Header ── */}
            <div className="pd-event-modal-header">
              <div className="pd-event-modal-header-accent" />
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div className="pd-event-modal-eyebrow">Event Details</div>
                  <h2 className="pd-event-modal-title">
                    {detailGame.title || detailGame.turf?.name || "Game"}
                  </h2>
                </div>
                <span style={{
                  flexShrink: 0, marginTop: 2,
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase",
                  padding: "3px 10px", borderRadius: 99,
                  background: detailIsCancelled ? "rgba(220,38,68,0.15)" : "rgba(74,222,128,0.12)",
                  color: detailIsCancelled ? "#f87171" : "#4ade80",
                  border: `1px solid ${detailIsCancelled ? "rgba(220,38,68,0.3)" : "rgba(74,222,128,0.3)"}`,
                }}>
                  {detailGame.status || "open"}
                </span>
              </div>

              {/* Copy Link button */}
              <button
                type="button"
                onClick={() => {
                  const link = `${window.location.origin}/join/${detailGame._id}`;
                  navigator.clipboard.writeText(link).then(() => {
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2000);
                  });
                }}
                style={{
                  marginTop: 12,
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "7px 14px", borderRadius: 99,
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  transition: "background 0.2s, color 0.2s, border-color 0.2s",
                  background: linkCopied ? "rgba(200,255,62,0.12)" : "rgba(255,255,255,0.05)",
                  color: linkCopied ? "#c8ff3e" : "#aaa",
                  border: `1px solid ${linkCopied ? "rgba(200,255,62,0.35)" : "rgba(255,255,255,0.1)"}`,
                }}
              >
                {linkCopied ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Link Copied!
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    Copy Link
                  </>
                )}
              </button>
            </div>

            {/* ── Scrollable Body ── */}
            <div className="pd-event-modal-body">

            {/* Pass banner in detail view */}
            {detailGame.passEligible && (detailGame.feeInPaise || 0) > 0 && (
              <div style={{
                background: "rgba(200,255,62,0.07)",
                border: "1px solid rgba(200,255,62,0.25)",
                borderRadius: 10,
                padding: "10px 14px",
                marginBottom: 16,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#c8ff3e" }}>
                  🎟️ Your Pass covers this game — entry is <span style={{ textDecoration: "line-through", opacity: 0.6 }}>₹{(detailGame.feeInPaise || 0) / 100}</span> <strong>₹0</strong> for you
                </div>
                <div style={{ fontSize: 11, color: "#888", lineHeight: 1.5 }}>
                  Pass applies to <strong style={{ color: "#ccc" }}>your slot only</strong>. Any guests you bring pay the full ₹{(detailGame.feeInPaise || 0) / 100} entry fee each.
                </div>
              </div>
            )}

            <div className="pd-event-detail-grid">
              {(detailRows as Array<{ label: string; value: string; info?: string }>).map((row) => (
                <div
                  key={row.label}
                  className="pd-event-detail-card"
                  style={row.label === "Status" ? { gridColumn: "1 / -1" } : undefined}
                >
                  <div className="pd-event-detail-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {row.label}
                    {row.info && (
                      <button
                        type="button"
                        onClick={() => setShowFormatTip((v) => !v)}
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", lineHeight: 1, fontSize: 13, opacity: 0.75 }}
                        title={row.info}
                      >ℹ️</button>
                    )}
                  </div>
                  <div className={`pd-event-detail-value${row.label === "Status" ? " pd-event-detail-status" : ""}`}>
                    {row.value}
                  </div>
                  {row.info && showFormatTip && (
                    <div style={{
                      marginTop: 8,
                      padding: "8px 10px",
                      background: "rgba(91,230,178,0.08)",
                      border: "1px solid rgba(91,230,178,0.2)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "#a7f3d0",
                      lineHeight: 1.5,
                    }}>
                      {row.info}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {detailIsWaitlisted && !isOnRejoinWaitlist && detailSpotsLeft > 0 && !detailIsCancelled && (
              <div style={{
                border: "1px solid rgba(74,222,128,0.4)",
                padding: "14px 16px",
                background: "rgba(74,222,128,0.07)",
                marginBottom: 16,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>⚡</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#4ade80", marginBottom: 3 }}>
                    A spot just opened up — be first to claim it!
                  </div>
                  <div style={{ color: "#a3e6bf", fontSize: 12, lineHeight: 1.5 }}>
                    First to register gets the slot. No payment charged until you confirm.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setDetailGame(null); handleBook(detailGame); }}
                  style={{
                    flexShrink: 0,
                    background: "#4ade80",
                    color: "#000",
                    border: "none",
                    borderRadius: 7,
                    padding: "8px 14px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Sign Up Now
                </button>
              </div>
            )}

            {detailIsWaitlisted && !isOnRejoinWaitlist && detailSpotsLeft === 0 && !detailIsCancelled && (
              <div style={{
                border: myWaitlistStatus === "approved" ? "1px solid rgba(74,222,128,0.35)" : "1px solid rgba(245,158,11,0.3)",
                padding: "12px 16px",
                background: myWaitlistStatus === "approved" ? "rgba(74,222,128,0.06)" : "rgba(245,158,11,0.06)",
                marginBottom: 16,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}>
                <span style={{ fontSize: 18 }}>{myWaitlistStatus === "approved" ? "✅" : "📋"}</span>
                <div style={{ fontSize: 12, lineHeight: 1.5, color: myWaitlistStatus === "approved" ? "#4ade80" : "#fcd34d" }}>
                  {myWaitlistStatus === "approved"
                    ? "The organiser approved you! You'll get an email the moment a slot opens — be ready to register quickly."
                    : "You're on the waitlist. We'll email you the moment a spot opens up — first to sign up gets it!"}
                </div>
              </div>
            )}

            {detailIsCancelled && (
              <div style={{ border: "1px solid #5c1b1b", padding: "12px", background: "#1a0808", marginBottom: 16, borderRadius: 4 }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#e05050", marginBottom: 6, fontWeight: 700 }}>
                  Event Cancelled
                </div>
                <div style={{ color: "#ffaaaa", fontSize: 13, lineHeight: 1.5 }}>
                  {detailGame.cancelReason
                    ? detailGame.cancelReason
                    : "This event has been cancelled by the organiser."}
                </div>
              </div>
            )}

            {detailGame.notes && (
              <div style={{ border: "1px solid #1f1f1f", padding: "12px", background: "#111", marginBottom: 16 }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#777", marginBottom: 6 }}>
                  Notes
                </div>
                <div style={{ color: "#ddd", fontSize: 13, lineHeight: 1.5 }}>{detailGame.notes}</div>
              </div>
            )}

            <div className="pd-event-player-section">
              <div className="pd-event-player-section-head">
                <span className="pd-event-player-title">Player Details</span>
                <span className="pd-event-player-total">Total: {detailFilledSlots}</span>
              </div>
              {detailPlayers.length === 0 ? (
                <div style={{ color: "#888", fontSize: 13 }}>No players registered yet.</div>
              ) : (
                <div className="pd-event-player-list">
                  {(() => {
                    const regs = liveRegistrations;
                    const orgGuests = regs.filter((r: any) => r.plusOneName && !r.player);
                    const guestsByPlayerId = new Map<string, any[]>();
                    regs.filter((r: any) => r.plusOneName && r.player).forEach((r: any) => {
                      const k = r.player?._id?.toString() ?? r.player?.toString() ?? "";
                      if (k) {
                        if (!guestsByPlayerId.has(k)) guestsByPlayerId.set(k, []);
                        guestsByPlayerId.get(k)!.push(r);
                      }
                    });
                    const mainRegs = regs.filter((r: any) => !r.plusOneName);

                    const orgChip = (
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                        textTransform: "uppercase" as const, color: "#c4d56c",
                        background: "rgba(196,213,108,0.12)", border: "1px solid rgba(196,213,108,0.25)",
                        borderRadius: 4, padding: "2px 6px", fontFamily: "var(--mono, monospace)",
                      }}>Organiser</span>
                    );

                    const notAttendingChip = (
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
                        textTransform: "uppercase" as const, color: "#f59e0b",
                        background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)",
                        borderRadius: 4, padding: "2px 6px",
                      }}>Not Attending</span>
                    );

                    const renderRow = (name: string, chip: React.ReactNode, key: string, optedOutRow = false) => (
                      <div key={key} className="pd-event-player-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", opacity: optedOutRow ? 0.55 : 1 }}>
                        <div className="pd-event-player-name" style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                          {name}{chip}{optedOutRow && notAttendingChip}
                        </div>
                      </div>
                    );

                    return (
                      <>
                        {detailGame.organiserIsPlaying && (
                          <div className="pd-player-group">
                            {renderRow(detailGame.organiser?.name || "Organiser", orgChip, "organiser")}
                            {orgGuests.length > 0 && (
                              <div className="pd-player-guest-group">
                                {orgGuests.map((r: any, i: number) =>
                                  renderRow(r.plusOneName, null, `og-${r._id || i}`)
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        {!detailGame.organiserIsPlaying && orgGuests.map((r: any, i: number) =>
                          renderRow(r.plusOneName, null, `og-${r._id || i}`)
                        )}
                        {mainRegs.map((reg: any, idx: number) => {
                          const pId = reg.player?._id?.toString() ?? reg.player?.toString() ?? "";
                          const myGsts = guestsByPlayerId.get(pId) ?? [];
                          return (
                            <div className="pd-player-group" key={reg._id || idx}>
                              {renderRow(reg.player?.name || "Player", null, `p-${reg._id || idx}`, !!reg.optedOut)}
                              {myGsts.length > 0 && (
                                <div className="pd-player-guest-group">
                                  {myGsts.map((gr: any, gi: number) =>
                                    renderRow(gr.plusOneName, null, `pg-${gr._id || gi}`)
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* ── My Guests (CRUD section — only when registered and game active) ── */}
            {detailIsRegistered && !detailIsCancelled && detailGame.status !== "completed" && !detailPastReporting && (
              <div style={{
                margin: "0 0 16px",
                padding: "14px 16px",
                background: "rgba(200,255,62,0.04)",
                border: "1px solid rgba(200,255,62,0.15)",
                borderRadius: 10,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#c8ff3e" }}>
                    My Guests ({myGuestCount})
                  </span>
                  <button
                    type="button"
                    onClick={() => promptAddGuest(detailGame)}
                    disabled={addingGuest}
                    style={{
                      background: addingGuest ? "rgba(200,255,62,0.05)" : "rgba(200,255,62,0.12)",
                      color: addingGuest ? "rgba(200,255,62,0.5)" : "#c8ff3e",
                      border: "1px solid rgba(200,255,62,0.3)",
                      borderRadius: 6, padding: "4px 12px", fontSize: 12,
                      fontWeight: 600, cursor: addingGuest ? "not-allowed" : "pointer",
                    }}
                  >
                    {addingGuest ? "Adding…" : detailSpotsLeft === 0 ? "+ Join Waitlist" : "+ Add Guest"}
                  </button>
                </div>

                {myGuestCount === 0 ? (
                  <div style={{ color: "#555", fontSize: 13 }}>
                    No guests added yet.{detailSpotsLeft === 0 ? " (Game is full)" : " Tap the + Add Guest button to bring a friend."}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {myGuests.map((reg: any) => {
                      const posLabel: Record<string, string> = { goalkeeper: "GK", defender: "DEF", midfielder: "MID", forward: "FWD", any: "Any" };
                      const teamLabel: Record<string, string> = { red: "Red Team", blue: "Blue Team", none: "No Pref", same: "Same", opposite: "Opp." };
                      const pos = posLabel[reg.preferredPosition] || "Any";
                      const team = teamLabel[reg.teamPreference] || "No Pref";
                      return (
                        <div key={reg._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 7, border: "1px solid rgba(255,255,255,0.07)" }}>
                          <div>
                            <span style={{ fontSize: 13, color: "#e5e7eb" }}>{reg.plusOneName}</span>
                            <div style={{ display: "flex", gap: 4, marginTop: 3 }}>
                              {pos !== "Any" && (
                                <span style={{ fontSize: 10, background: "rgba(200,255,62,0.12)", color: "#c8ff3e", borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>{pos}</span>
                              )}
                              {reg.teamPreference && reg.teamPreference !== "none" && (
                                <span style={{ fontSize: 10, background: reg.teamPreference === "red" ? "rgba(220,38,38,0.15)" : "rgba(59,130,246,0.15)", color: reg.teamPreference === "red" ? "#f87171" : "#60a5fa", borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>{team}</span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => promptRemoveGuest(detailGame, reg._id, reg.plusOneName)}
                            disabled={removingGuestId === reg._id}
                            style={{
                              background: "rgba(220,38,38,0.10)",
                              border: "1px solid rgba(220,38,38,0.25)",
                              color: removingGuestId === reg._id ? "rgba(248,113,113,0.4)" : "#f87171",
                              borderRadius: 6, padding: "3px 10px", fontSize: 11,
                              fontWeight: 600, cursor: removingGuestId === reg._id ? "not-allowed" : "pointer",
                            }}
                          >
                            {removingGuestId === reg._id ? "…" : "Remove"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {detailSpotsLeft === 0 && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#888" }}>
                    Game is full — tap + Add Guest to join the waitlist. You pay only when a slot opens and you confirm.
                  </div>
                )}
              </div>
            )}

            {/* ── Reporting-time lock notice ── */}
            {detailIsRegistered && !detailIsCancelled && detailGame.status !== "completed" && detailPastReporting && (
              <div style={{
                margin: "0 0 12px",
                padding: "12px 16px",
                background: "rgba(245,158,11,0.06)",
                border: "1px solid rgba(245,158,11,0.25)",
                borderRadius: 10,
                fontSize: 13,
                color: "#f59e0b",
                lineHeight: 1.5,
              }}>
                ⏰ Reporting time has passed — registration and guests can no longer be changed for this game.
              </div>
            )}

            {/* ── Attending toggle — after My Guests, only for registered active games ── */}
            {detailIsRegistered && !detailIsCancelled && detailGame.status !== "completed" && !detailPastReporting && (
              <div style={{
                margin: "0 0 12px",
                padding: "12px 16px",
                background: isOnRejoinWaitlist
                  ? "rgba(167,139,250,0.06)"
                  : isOptedOut
                    ? "rgba(245,158,11,0.06)"
                    : "rgba(74,222,128,0.05)",
                border: `1px solid ${isOnRejoinWaitlist ? (detailSpotsLeft > 0 ? "rgba(200,255,62,0.3)" : "rgba(167,139,250,0.3)") : isOptedOut ? "rgba(245,158,11,0.25)" : "rgba(74,222,128,0.15)"}`,
                borderRadius: 10,
              }}>
                {isOnRejoinWaitlist ? (
                  /* ── Waitlist-to-rejoin state ── */
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: detailSpotsLeft > 0 ? "#c8ff3e" : "#a78bfa" }}>
                        {detailSpotsLeft > 0 ? "🟢 A slot just opened!" : "📋 On waitlist to rejoin"}
                      </span>
                      {detailSpotsLeft > 0 && (
                        <button
                          onClick={() => handleOptOut(true)}
                          disabled={optingOut}
                          style={{
                            padding: "5px 14px",
                            background: "#c8ff3e",
                            color: "#000",
                            border: "none",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: optingOut ? "not-allowed" : "pointer",
                            opacity: optingOut ? 0.6 : 1,
                            flexShrink: 0,
                          }}
                        >
                          {optingOut ? "Rejoining…" : "Rejoin Now"}
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "#888", lineHeight: 1.5 }}>
                      {detailSpotsLeft > 0
                        ? `Tap "Rejoin Now" to take the open slot${detailGame.feeInPaise > 0 ? ` (₹${detailGame.feeInPaise / 100} will be charged)` : ""}.`
                        : "Game was full when you tried to rejoin. We'll notify you when a slot opens."}
                      {myGuestCount > 0 && (
                        <span style={{ color: "#c8ff3e", fontWeight: 600 }}>
                          {" "}Your {myGuestCount} guest{myGuestCount > 1 ? "s are" : " is"} still registered.
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ── Normal attend / opted-out toggle ── */
                  <label style={{
                    display: "flex", alignItems: "center", gap: 10,
                    cursor: optingOut ? "not-allowed" : "pointer",
                    opacity: optingOut ? 0.6 : 1,
                  }}>
                    <input
                      type="checkbox"
                      checked={!isOptedOut}
                      onChange={(e) => handleOptOut(e.target.checked)}
                      disabled={optingOut}
                      style={{ width: 16, height: 16, accentColor: "#c8ff3e", flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isOptedOut ? "#f59e0b" : "#e5e7eb" }}>
                        {optingOut ? "Updating…" : isOptedOut ? "You're not attending" : "I'm attending this game"}
                      </div>
                      {isOptedOut && detailSpotsLeft === 0 && (
                        <div style={{ fontSize: 11, color: "#888", marginTop: 2, lineHeight: 1.4 }}>
                          Game is full — tick to join the waitlist and rejoin when a slot opens.
                          {myGuestCount > 0 && <span style={{ color: "#c8ff3e" }}> Your guest is still registered.</span>}
                        </div>
                      )}
                      {isOptedOut && detailSpotsLeft > 0 && (
                        <div style={{ fontSize: 11, color: "#888", marginTop: 2, lineHeight: 1.4 }}>
                          Your guests' registrations remain active. Tick to rejoin{detailGame.feeInPaise > 0 ? ` (₹${detailGame.feeInPaise / 100} will be charged)` : ""}.
                        </div>
                      )}
                    </div>
                  </label>
                )}
              </div>
            )}

            {/* ── Guest Waitlist ── */}
            {(detailIsRegistered || detailIsWaitlisted) && myGuestWaitlist.length > 0 && !detailIsCancelled && detailGame.status !== "completed" && !detailPastReporting && (
              <div style={{
                margin: "0 0 16px",
                padding: "14px 16px",
                background: "rgba(245,158,11,0.05)",
                border: "1px solid rgba(245,158,11,0.2)",
                borderRadius: 10,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#f59e0b" }}>
                    Guests on Waitlist ({myGuestWaitlist.length})
                  </span>
                  <span style={{ fontSize: 11, color: "#888" }}>
                    {detailIsWaitlisted
                      ? "Will auto-confirm when you register"
                      : "First to confirm gets the slot"}
                  </span>
                </div>
                {detailIsWaitlisted && (
                  <div style={{ fontSize: 11, color: "#a78bfa", marginBottom: 10, lineHeight: 1.5 }}>
                    These guests are waitlisted with you. When a slot opens and you register, your guests will be auto-confirmed in order — up to available slots.
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {myGuestWaitlist.map((gw: any) => {
                    const isNotified = gw.status === "notified";
                    const isConfirming = confirmingGwId === gw._id;
                    const isCancelling = cancellingGwId === gw._id;
                    return (
                      <div key={gw._id} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 12px",
                        background: detailSpotsLeft > 0 ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.02)",
                        borderRadius: 7,
                        border: `1px solid ${detailSpotsLeft > 0 ? "rgba(245,158,11,0.35)" : "rgba(255,255,255,0.07)"}`,
                      }}>
                        <div>
                          <div style={{ fontSize: 13, color: "#e5e7eb", fontWeight: 600 }}>{gw.plusOneName}</div>
                          <div style={{ fontSize: 11, marginTop: 2, color: detailSpotsLeft > 0 ? "#f59e0b" : "#666" }}>
                            {detailIsWaitlisted
                              ? "Waitlisted with you — auto-confirmed when you register"
                              : detailSpotsLeft > 0
                                ? "Slot available — confirm now!"
                                : "Waiting for a slot to open"}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          {detailIsRegistered && detailSpotsLeft > 0 && (
                            <button
                              type="button"
                              onClick={() => handleConfirmGuestWaitlist(detailGame, gw._id)}
                              disabled={isConfirming}
                              style={{
                                background: isConfirming ? "rgba(74,222,128,0.05)" : "rgba(74,222,128,0.15)",
                                border: "1px solid rgba(74,222,128,0.4)",
                                color: isConfirming ? "rgba(74,222,128,0.4)" : "#4ade80",
                                borderRadius: 6, padding: "4px 10px", fontSize: 11,
                                fontWeight: 700, cursor: isConfirming ? "not-allowed" : "pointer",
                              }}
                            >
                              {isConfirming ? "Confirming…" : `Confirm${detailGame?.feeInPaise > 0 ? ` (${String.fromCharCode(8377)}${detailGame.feeInPaise / 100})` : ""}`}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCancelGuestWaitlist(detailGame, gw._id, gw.plusOneName)}
                            disabled={isCancelling}
                            style={{
                              background: "rgba(220,38,38,0.08)",
                              border: "1px solid rgba(220,38,38,0.2)",
                              color: isCancelling ? "rgba(248,113,113,0.4)" : "#f87171",
                              borderRadius: 6, padding: "4px 10px", fontSize: 11,
                              fontWeight: 600, cursor: isCancelling ? "not-allowed" : "pointer",
                            }}
                          >
                            {isCancelling ? "…" : "Remove"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── My Submitted Feedback ── */}
            {detailGame.status === "completed" && detailGameFeedback && (
              <div style={{ margin: "0 0 16px", padding: "14px 16px", background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 10 }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#4ade80", marginBottom: 10, fontWeight: 700 }}>
                  ✓ Your Feedback Submitted
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" }}>Game</span>
                    <div style={{ display: "flex", gap: 2 }}>
                      {[1,2,3,4,5].map(n => <span key={n} style={{ fontSize: 15, color: n <= detailGameFeedback.gameRating ? "#fbbf24" : "#333" }}>★</span>)}
                    </div>
                  </div>
                  {detailGameFeedback.organiserRating && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" }}>Organiser</span>
                      <div style={{ display: "flex", gap: 2 }}>
                        {[1,2,3,4,5].map(n => <span key={n} style={{ fontSize: 15, color: n <= detailGameFeedback.organiserRating ? "#fbbf24" : "#333" }}>★</span>)}
                      </div>
                    </div>
                  )}
                  {detailGameFeedback.venueRating && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" }}>Venue</span>
                      <div style={{ display: "flex", gap: 2 }}>
                        {[1,2,3,4,5].map(n => <span key={n} style={{ fontSize: 15, color: n <= detailGameFeedback.venueRating ? "#fbbf24" : "#333" }}>★</span>)}
                      </div>
                    </div>
                  )}
                </div>
                {detailGameFeedback.tags?.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {detailGameFeedback.tags.map((tag: string) => (
                      <span key={tag} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 20, background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}>{tag}</span>
                    ))}
                  </div>
                )}
                {detailGameFeedback.comment && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#888", fontStyle: "italic", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}>
                    "{detailGameFeedback.comment}"
                  </div>
                )}
              </div>
            )}

            {/* ── Full Waitlist ── */}
            {(() => {
              const waitlistPlayers = (detailGame.waitlist || [])
                .filter((w: any) => {
                  if (['declined', 'expired'].includes(w.status) || !w.player?.name) return false;
                  // hide own entry when no longer on the waitlist (stale DB data after cancellation)
                  if (!detailIsWaitlisted) {
                    const wPid = w.player?._id?.toString() ?? w.player?.toString() ?? '';
                    if (wPid === playerId) return false;
                  }
                  return true;
                })
                .map((w: any) => ({ name: w.player.name, isGuest: false }));
              const waitlistGuests = (detailGame.guestWaitlist || [])
                .filter((gw: any) => {
                  if (['expired'].includes(gw.status) || !gw.plusOneName) return false;
                  // hide own guest entries when no longer on the waitlist
                  if (!detailIsWaitlisted) {
                    const gwPid = gw.player?._id?.toString() ?? gw.player?.toString() ?? '';
                    if (gwPid === playerId) return false;
                  }
                  return true;
                })
                .map((gw: any) => ({ name: gw.plusOneName, isGuest: true }));
              const allWaiting = [...waitlistPlayers, ...waitlistGuests];
              if (allWaiting.length === 0) return null;
              return (
                <div style={{
                  margin: "0 0 16px",
                  padding: "14px 16px",
                  background: "rgba(167,139,250,0.04)",
                  border: "1px solid rgba(167,139,250,0.18)",
                  borderRadius: 10,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "#a78bfa" }}>
                      📋 Waitlist
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 10,
                      background: "rgba(167,139,250,0.14)", color: "#c4b5fd",
                      border: "1px solid rgba(167,139,250,0.25)",
                    }}>{allWaiting.length}</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "6px 8px" }}>
                    {allWaiting.map((entry, i) => (
                      <span key={i} style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        fontSize: 12, fontWeight: 600,
                        padding: "5px 11px", borderRadius: 20,
                        background: entry.isGuest ? "rgba(167,139,250,0.06)" : "rgba(167,139,250,0.10)",
                        color: entry.isGuest ? "#a78bfa" : "#c4b5fd",
                        border: `1px solid ${entry.isGuest ? "rgba(167,139,250,0.15)" : "rgba(167,139,250,0.25)"}`,
                        whiteSpace: "nowrap" as const,
                        maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {entry.isGuest && (
                          <span style={{ fontSize: 9, opacity: 0.7, fontWeight: 700, letterSpacing: "0.04em" }}>+1</span>
                        )}
                        {entry.name}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            </div>{/* end pd-event-modal-body */}

            {/* ── Sticky Footer ── */}
            <div className="pd-event-modal-footer">
              {/* Close — always left */}
              <button
                type="button"
                onClick={() => { setDetailGame(null); setDetailGameFeedback(null); }}
                style={{
                  padding: "10px 22px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", background: "rgba(255,255,255,0.06)",
                  color: "#e5e7eb", border: "1px solid rgba(255,255,255,0.12)",
                  transition: "background 0.18s, border-color 0.18s", flexShrink: 0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
              >
                Close
              </button>

              {/* Action buttons — always right */}
              <div className="pd-footer-actions">
                {/* Rate Game Button - Only show if game is completed */}
                {detailGame.status === "completed" &&
                  detailIsRegistered &&
                  !detailGameFeedback &&
                  pendingFeedback.some((g) => g._id === detailGame._id) && (
                    <button
                      className="pd-modal-btn"
                      type="button"
                      onClick={() => { setDetailGame(null); setDetailGameFeedback(null); setFeedbackTargetGame(detailGame); }}
                      style={{ 
                        background: "rgba(196,213,108,0.12)", 
                        color: "#c4d56c", 
                        border: "1px solid rgba(196,213,108,0.3)",
                        padding: "11px 18px", 
                        borderRadius: 8, 
                        fontSize: 13, 
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        whiteSpace: "nowrap"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(196,213,108,0.18)";
                        e.currentTarget.style.borderColor = "rgba(196,213,108,0.4)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(196,213,108,0.12)";
                        e.currentTarget.style.borderColor = "rgba(196,213,108,0.3)";
                      }}
                    >
                      ⭐ Rate Game
                    </button>
                  )}

                {/* Registered User Actions — guest CRUD moved to My Guests section above */}
                {detailIsRegistered && !detailIsCancelled && detailGame.status !== "completed" && !detailPastReporting ? (
                  <button
                    className="pd-modal-btn secondary"
                    type="button"
                    onClick={() => handleCancelRegistration(detailGame)}
                    disabled={!!cancellingGameId}
                    style={{
                      background: cancellingGameId ? "rgba(220,38,38,0.05)" : "rgba(220,38,38,0.12)",
                      color: cancellingGameId ? "rgba(248,113,113,0.6)" : "#f87171",
                      border: "1px solid rgba(220,38,38,0.3)",
                      padding: "11px 18px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: cancellingGameId ? "not-allowed" : "pointer",
                      transition: "all 0.2s ease",
                      whiteSpace: "nowrap"
                    }}
                    onMouseEnter={(e) => {
                      if (!cancellingGameId) {
                        e.currentTarget.style.background = "rgba(220,38,38,0.18)";
                        e.currentTarget.style.borderColor = "rgba(220,38,38,0.4)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!cancellingGameId) {
                        e.currentTarget.style.background = "rgba(220,38,38,0.12)";
                        e.currentTarget.style.borderColor = "rgba(220,38,38,0.3)";
                      }
                    }}
                  >
                    {cancellingGameId === detailGame._id ? "Cancelling..." : "Cancel Registration"}
                  </button>
                ) : null}

                {/* Waitlisted User Actions */}
                {detailIsWaitlisted && !isOnRejoinWaitlist && !detailIsCancelled && detailGame.status !== "completed" && !detailPastReporting ? (
                  <>
                    {detailSpotsLeft > 0 && (
                      <button
                        className="pd-modal-btn"
                        type="button"
                        onClick={() => { setDetailGame(null); handleBook(detailGame); }}
                        style={{ 
                          background: "#c8ff3e", 
                          color: "#000", 
                          border: "none",
                          padding: "11px 24px", 
                          borderRadius: 8, 
                          fontSize: 13, 
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          whiteSpace: "nowrap"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#d4ff6d";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#c8ff3e";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        ⚽ Book
                      </button>
                    )}
                    <button
                      className="pd-modal-btn secondary"
                      type="button"
                      onClick={() => handleLeaveWaitlist(detailGame)}
                      style={{ 
                        background: "rgba(220,38,38,0.12)", 
                        color: "#f87171", 
                        border: "1px solid rgba(220,38,38,0.3)",
                        padding: "11px 18px", 
                        borderRadius: 8, 
                        fontSize: 13, 
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        whiteSpace: "nowrap"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(220,38,38,0.18)";
                        e.currentTarget.style.borderColor = "rgba(220,38,38,0.4)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(220,38,38,0.12)";
                        e.currentTarget.style.borderColor = "rgba(220,38,38,0.3)";
                      }}
                    >
                      Leave Waitlist
                    </button>
                  </>
                ) : null}

                {/* Not Registered - Book Now Button */}
                {!detailIsRegistered && !detailIsWaitlisted && !detailIsCancelled && (
                  <button
                    className="pd-modal-btn"
                    type="button"
                    onClick={() => {
                      setDetailGame(null);
                      handleBook(detailGame);
                    }}
                    style={{ 
                      background: "#c8ff3e", 
                      color: "#000", 
                      border: "none",
                      padding: "11px 24px", 
                      borderRadius: 8, 
                      fontSize: 13, 
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      whiteSpace: "nowrap"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#d4ff6d";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#c8ff3e";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    ⚽ Book Now
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
