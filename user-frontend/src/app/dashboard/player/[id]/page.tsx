"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { EventCard, EventStatus } from "@/components/dashboard/EventCard";
import { BookingModal } from "@/components/dashboard/BookingModal";
import type { BookingGuest } from "@/components/dashboard/BookingModal";
import { GameFeedbackModal } from "@/components/dashboard/GameFeedbackModal";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
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
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [popupNotif, setPopupNotif] = useState<{ type: "success" | "error"; message: string; subtitle?: string } | null>(null);
  const removingGuestIds = useRef<Set<string>>(new Set());
  // Local set of reg IDs removed this session — prevents any background refresh re-showing a removed guest
  const [removedGuestIds, setRemovedGuestIds] = useState<Set<string>>(new Set());
  // Inline banner shown inside the Event Details modal
  const [detailNotif, setDetailNotif] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const detailNotifTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [playerPositions, setPlayerPositions] = useState<string[]>([]);
  const [myWaitlist, setMyWaitlist] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [pendingFeedback, setPendingFeedback] = useState<any[]>([]);
  const [feedbackTargetGame, setFeedbackTargetGame] = useState<any>(null);
  const [popupFeedbackGame, setPopupFeedbackGame] = useState<any>(null);
  const [selectedGamePlayers, setSelectedGamePlayers] = useState<{ name: string; id?: string }[]>([]);
  // Per-game feedback I already submitted — loaded when opening a completed game detail
  const [detailGameFeedback, setDetailGameFeedback] = useState<any>(null);
  const [addingGuest, setAddingGuest] = useState(false);
  const [removingGuestId, setRemovingGuestId] = useState<string | null>(null);
  const [confirmingGwId, setConfirmingGwId] = useState<string | null>(null);
  const [cancellingGwId, setCancellingGwId] = useState<string | null>(null);
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

      const res = await fetch(buildApiUrl("/api/v1/games"), {
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

      const res = await fetch(buildApiUrl("/api/v1/games/my-games"), {
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
    } catch (error) {
      console.error("Failed to fetch my games", error);
    }
  };

  const fetchMyWaitlist = async () => {
    try {
      const { token } = getSession();
      if (!token) { setMyWaitlist([]); return; }
      const res = await fetch(buildApiUrl("/api/v1/games/my-waitlist"), {
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
      const res = await fetch(buildApiUrl("/api/v1/players/me"), {
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
      const res = await fetch(buildApiUrl("/api/v1/players/me/wallet"), {
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
      const res = await fetch(buildApiUrl("/api/v1/games/pending-feedback"), {
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
    // Prefer the annotated version from myGames (has _isMyReg flags) when available
    const annotated = myGames.find((g: any) => g._id === game._id);
    setDetailGame(annotated || game);
    setDetailGameFeedback(null);
    if (game.status !== "completed") return;
    const { token } = getSession();
    if (!token) return;
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
    const totalRegistered = game.registrations?.length || 0;
    // organiserCount is NOT in the registrations array — subtract it separately
    const spotsLeft = game.totalSlots - totalRegistered - organiserCount;
    const isFull = spotsLeft <= 0;
    const formattedGame = {
      id: game._id,
      _id: game._id,
      venue: `${game.turf?.name || 'TBC'},${game.turf?.address?.city || 'TBC'}`,
      date: new Date(game.scheduledAt).toISOString().split('T')[0],
      time: new Date(game.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      format: game.format,
      fee: game.feeInPaise / 100,
      spots: Math.max(0, spotsLeft),
      waitlist: isFull,
    };
    const players = (game.registrations || [])
      .filter((r: any) => !['refunded', 'forfeited'].includes(r.paymentStatus))
      .map((r: any) => ({
        name: r.plusOneName || r.player?.name || 'Player',
        id:   r._id,
      }))
      .filter((p: any) => p.name && p.name !== 'Player');
    setSelectedGamePlayers(players);
    setSelectedGame(formattedGame);
  };

  const showNotification = (type: "success" | "error", message: string, duration: number = 3500) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), duration);
  };

  const showPopupNotification = (type: "success" | "error", message: string, duration: number = 2000, subtitle?: string) => {
    setPopupNotif({ type, message, subtitle });
    setTimeout(() => setPopupNotif(null), duration);
  };

  const showDetailNotif = (type: "success" | "error", message: string, duration = 2000) => {
    if (detailNotifTimer.current) clearTimeout(detailNotifTimer.current);
    setDetailNotif({ type, message });
    detailNotifTimer.current = setTimeout(() => setDetailNotif(null), duration);
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
          showNotification("error", data.message || "Unable to cancel registration right now.");
          return;
        }

        showNotification("success", data.message || "Registration cancelled successfully.");
        setDetailGame(null);
        fetchDashboardData();
        setActiveTab("my-games");
        if (playerId) {
          router.replace(`/dashboard/player/${playerId}?tab=my-games`);
        }
      } catch (error) {
        console.error("Failed to cancel registration", error);
        showNotification("error", "Cancellation failed. Please try again.");
      } finally {
        setCancellingGameId(null);
      }
    };

    setConfirmMessage("Do you want to cancel your registration for this event?");
    confirmActionRef.current = doCancel;
    setConfirmVisible(true);
  };

  const handleConfirmBooking = async (
    game: any,
    guests: BookingGuest[],
    teamPreference: string,
    willingIfFormatChange: boolean,
    playWith: string[],
    playAgainst: string[],
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
        playWith,
        playAgainst,
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
        // Refresh wallet balance after a successful registration
        fetchWalletBalance();
        if (isWaitlist) {
          showNotification("success", "You've joined the waitlist! We'll notify you when a spot opens.");
          setTimeout(() => { fetchMyWaitlist(); fetchAllGames(); }, 500);
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
          }
          showPopupNotification("success", msg, 3000, subtitle);
          setActiveTab("my-games");
          if (playerId) router.replace(`/dashboard/player/${playerId}?tab=my-games`);
          setTimeout(() => { fetchDashboardData(); if (waitlistAdded > 0) fetchMyWaitlist(); }, 500);
        }
      } else {
        if (data.code === "INSUFFICIENT_BALANCE") {
          setSelectedGame(null);
          showNotification(
            "error",
            "Insufficient wallet balance. Please recharge your wallet to sign up."
          );
          if (playerId) {
            setTimeout(() => router.push(`/dashboard/player/${playerId}/wallet`), 1000);
          }
        } else if (data.code === "RACE_REFUND_FAILED") {
          setSelectedGame(null);
          showNotification("error", "The spot was taken and we couldn't auto-refund. Please contact support.");
        } else {
          showNotification("error", data.message || (isWaitlist ? "Waitlist failed." : "Registration failed."));
          setSelectedGame(null);
          // Backend debited then refunded on a race loss — re-sync wallet balance
          if (res.status === 409) fetchWalletBalance();
        }
      }
    } catch {
      showNotification("error", "An error occurred. Please try again.");
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
          showNotification("error", data.message || "Failed to leave waitlist.");
          return;
        }
        showNotification("success", "Removed from waitlist.");
        setDetailGame(null);
        fetchMyWaitlist();
        fetchAllGames();
      } catch {
        showNotification("error", "Failed to leave waitlist. Please try again.");
      }
    };

    setConfirmMessage("Remove yourself from the waitlist for this event?");
    confirmActionRef.current = doLeave;
    setConfirmVisible(true);
  };

  const handleAddGuest = async (game: any) => {
    const { token } = getSession();
    if (!token) { clearSession(); router.replace("/login?role=player"); return; }
    setAddingGuest(true);
    try {
      const res = await fetch(buildApiUrl(`/api/v1/games/${game._id}/add-guest`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.code === "INSUFFICIENT_BALANCE") {
          showNotification("error", "Insufficient wallet balance.");
          if (playerId) setTimeout(() => router.push(`/dashboard/player/${playerId}/wallet`), 1000);
        } else if (data.code === "RACE_REFUND_FAILED") {
          showNotification("error", "The spot was taken and we couldn't auto-refund. Please contact support.");
        } else {
          showNotification("error", data.message || "Failed to add guest.");
        }
        return;
      }
      setDetailGame(data.data);
      fetchWalletBalance();
      fetchMyGames();
      if (data.waitlisted) {
        showPopupNotification("success", "Added to Waitlist", 1000, "You'll be notified when a spot opens.");
      } else {
        showPopupNotification("success", data.message || "Guest Added!", 1000);
      }
    } catch {
      showNotification("error", "Failed to add guest. Please try again.");
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
          showNotification("error", "Insufficient wallet balance.");
          if (playerId) setTimeout(() => router.push(`/dashboard/player/${playerId}/wallet`), 1000);
        } else if (data.code === "RACE_REFUND_FAILED") {
          showNotification("error", "Slot was taken and we couldn't auto-refund your payment. Please contact support.");
        } else {
          showDetailNotif("error", data.message || "Could not confirm guest.");
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
      setDetailGame(data.data);
      fetchWalletBalance();
      fetchMyGames();
      const feeAmt = detailGame?.feeInPaise || 0;
      showDetailNotif("success", `Guest confirmed!${feeAmt > 0 ? ` ₹${Math.round(feeAmt / 100)} debited from your wallet.` : ""}`, 3000);
    } catch {
      showNotification("error", "Failed to confirm guest. Please try again.");
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
        if (!res.ok || !data.success) { showNotification("error", data.message || "Failed to remove from waitlist."); return; }
        setDetailGame(data.data);
        fetchMyGames();
        fetchMyWaitlist();
        showNotification("success", `${guestName} removed from waitlist.`);
      } catch {
        showNotification("error", "Failed to remove from waitlist.");
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
        showDetailNotif("error", data.message || "Failed to remove guest.");
        return;
      }
      // Confirm server state
      setDetailGame(data.data);
      fetchWalletBalance();
      fetchMyGames();
      const refundAmt = data.refundAmountPaise || 0;
      showPopupNotification("success", "Guest removed.", 2000, refundAmt > 0 ? `₹${Math.round(refundAmt / 100)} will be refunded shortly.` : undefined);
    } catch {
      setRemovedGuestIds((prev) => { const s = new Set(prev); s.delete(regId); return s; });
      showDetailNotif("error", "Failed to remove guest. Please try again.");
    } finally {
      setRemovingGuestId(null);
      removingGuestIds.current.delete(regId);
    }
  };

  const promptRemoveGuest = (game: any, regId: string, guestName: string) => {
    setConfirmTitle("Remove Guest");
    setConfirmMessage(`Remove ${guestName} from this game?`);
    confirmActionRef.current = async () => {
      // Immediately mark as removed — no background refresh can bring it back
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
  const getTotalPlayers = (game: any) => (game.registrations?.length || 0) + getOrganiserCount(game);
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
    { label: "Date", value: new Date(detailGame.scheduledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) },
    { label: "Game Start Time", value: new Date(detailGame.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
    {
      label: "Players Report",
      value: detailGame.reportingMinsBeforeGame
        ? `${detailGame.reportingMinsBeforeGame} mins before game`
        : "30 mins before game",
    },
    {
      label: "Report Time",
      value: (() => {
        const scheduled = new Date(detailGame.scheduledAt);
        const reportMins = Number(detailGame.reportingMinsBeforeGame ?? 30);
        if (Number.isNaN(scheduled.getTime())) return "TBC";
        return new Date(scheduled.getTime() - reportMins * 60000).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      })(),
    },
    {
      label: "Duration",
      value: detailGame.durationMins ? `${detailGame.durationMins} mins` : "60 mins",
    },
    { label: "Format", value: detailGame.format || "TBC" },
    { label: "Fee", value: `₹${(detailGame.feeInPaise || 0) / 100}` },
    { label: "Total Slots", value: String(detailGame.totalSlots || 0) },
    { label: "Players", value: String(getTotalPlayers(detailGame)) },
    { label: "Status", value: String(detailGame.status || "open") },
  ] : [];
  const detailIsRegistered = !!detailGame && myGames.some((myGame) => myGame._id === detailGame._id);
  const detailIsWaitlisted = !!detailGame && myWaitlist.some((wg) => wg._id === detailGame._id);
  const detailIsCancelled = !!detailGame && String(detailGame.status || "").toLowerCase().startsWith("cancel");
  const myWaitlistStatus: string = (detailIsWaitlisted && detailGame)
    ? (myWaitlist.find((wg: any) => wg._id === detailGame._id)?._myWaitlistStatus || "waiting")
    : "waiting";
  // Live registrations excluding locally-removed guests (so UI is instant, no re-flash on any refresh)
  const liveRegistrations = (detailGame?.registrations || []).filter(
    (r: any) => !removedGuestIds.has(String(r._id))
  );

  // Compute live spots remaining for the detail game
  const detailSpotsLeft = detailGame ? Math.max(0,
    detailGame.totalSlots
    - (liveRegistrations.filter((r: any) => !['refunded','forfeited'].includes(r.paymentStatus)).length)
    - (detailGame.organiserIsPlaying ? 1 : 0)
  ) : 0;
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
      {notification && (
        <div className={`pd-inline-notice ${notification.type === "success" ? "success" : "error"}`}>
          {notification.message}
        </div>
      )}

      {/* Pop-up Notification — rendered via portal so it always floats above every modal */}
      {popupNotif && typeof document !== "undefined" && createPortal(
        <div style={{
          position: "fixed",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 99999,
          animation: "popupFadeIn 0.25s ease-out",
          pointerEvents: "none",
        }}>
          <div style={{
            background: "#1a1a1a",
            color: "#fff",
            padding: "14px 20px",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.07)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            minWidth: 240,
            maxWidth: 340,
            border: popupNotif.type === "success"
              ? "1px solid rgba(74,222,128,0.25)"
              : "1px solid rgba(248,113,113,0.25)",
          }}>
            {/* Icon circle */}
            <div style={{
              flexShrink: 0,
              width: 32, height: 32,
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: popupNotif.type === "success" ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)",
              border: popupNotif.type === "success" ? "1px solid rgba(74,222,128,0.4)" : "1px solid rgba(248,113,113,0.4)",
              fontSize: 14, fontWeight: 700,
              color: popupNotif.type === "success" ? "#4ade80" : "#f87171",
            }}>
              {popupNotif.type === "success" ? "✓" : "✕"}
            </div>
            {/* Text */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: popupNotif.type === "success" ? "#4ade80" : "#f87171", lineHeight: 1.3 }}>
                {popupNotif.message}
              </div>
              {popupNotif.subtitle && (
                <div style={{ fontSize: 12, color: "#aaa", marginTop: 2, lineHeight: 1.4 }}>
                  {popupNotif.subtitle}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        @keyframes popupFadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        @keyframes popupFadeOut {
          from {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          to {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
        }
      `}</style>

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
            // totalSlots is the hard cap for ALL people (registrations + organiser if playing)
            const totalRegistered = game.registrations?.length || 0;
            const organiserCount = getOrganiserCount(game);
            const spotsTotal = game.totalSlots;
            const spotsLeft = spotsTotal - totalRegistered - organiserCount;
            return (
              <EventCard
                key={game._id}
                  id={game._id}
                  status={game.status as EventStatus}
                  venue={game.turf?.name || 'TBC'}
                  city={game.turf?.address?.city || 'TBC'}
                  date={new Date(game.scheduledAt).toISOString().split('T')[0]}
                  time={new Date(game.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  format={game.format}
                  fee={game.feeInPaise / 100}
                  spotsTotal={spotsTotal}
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
            showNotification("success", "Feedback submitted — thank you!");
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
            showNotification("success", "Feedback submitted — thank you!");
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
          registeredPlayers={selectedGamePlayers}
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

      {detailGame && (
        <div className="modal-overlay" onClick={() => { setDetailGame(null); setDetailGameFeedback(null); setRemovedGuestIds(new Set()); setDetailNotif(null); }}>
          <div
            className="modal-content pd-event-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header pd-event-modal-header">
              <div className="modal-title-section">
                <h2 style={{ margin: 0 }}>Event Details</h2>
                <p className="modal-subtitle" style={{ marginTop: 8 }}>
                  {detailGame.title || detailGame.turf?.name || "Game"}
                </p>
              </div>
            </div>

            {/* Inline banner — top of modal, auto-dismisses */}
            {detailNotif && (
              <div style={{
                padding: "10px 20px",
                background: detailNotif.type === "success" ? "rgba(74,222,128,0.1)" : "rgba(239,68,68,0.1)",
                borderBottom: `1px solid ${detailNotif.type === "success" ? "rgba(74,222,128,0.2)" : "rgba(239,68,68,0.2)"}`,
                color: detailNotif.type === "success" ? "#4ade80" : "#f87171",
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexShrink: 0,
              }}>
                <span style={{
                  width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: detailNotif.type === "success" ? "rgba(74,222,128,0.15)" : "rgba(239,68,68,0.15)",
                  fontSize: 11,
                }}>
                  {detailNotif.type === "success" ? "✓" : "✕"}
                </span>
                {detailNotif.message}
              </div>
            )}

            <div className="pd-event-detail-grid">
              {detailRows.map((row) => (
                <div key={row.label} className="pd-event-detail-card">
                  <div className="pd-event-detail-label">
                    {row.label}
                  </div>
                  <div className="pd-event-detail-value">{row.value}</div>
                </div>
              ))}
            </div>

            {detailIsWaitlisted && detailSpotsLeft > 0 && !detailIsCancelled && (
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
                    First to register gets the seat. No payment charged until you confirm.
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

            {detailIsWaitlisted && detailSpotsLeft === 0 && !detailIsCancelled && (
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
                <span className="pd-event-player-total">Total: {detailPlayers.length}</span>
              </div>
              {detailPlayers.length === 0 ? (
                <div style={{ color: "#888", fontSize: 13 }}>No players registered yet.</div>
              ) : (
                <div className="pd-event-player-list">
                  {(() => {
                    // Use liveRegistrations so removed guests never re-flash here either
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
                    const guestChip = (
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                        textTransform: "uppercase" as const, color: "#94a3b8",
                        background: "rgba(148,163,184,0.10)", border: "1px solid rgba(148,163,184,0.2)",
                        borderRadius: 4, padding: "2px 6px", fontFamily: "var(--mono, monospace)",
                      }}>Guest</span>
                    );

                    const renderRow = (name: string, chip: React.ReactNode, key: string) => (
                      <div key={key} className="pd-event-player-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div className="pd-event-player-name" style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                          {name}{chip}
                        </div>
                      </div>
                    );

                    return (
                      <>
                        {/* Organiser group */}
                        {detailGame.organiserIsPlaying && (
                          <div className="pd-player-group">
                            {renderRow(detailGame.organiser?.name || "Organiser", orgChip, "organiser")}
                            {orgGuests.length > 0 && (
                              <div className="pd-player-guest-group">
                                {orgGuests.map((r: any, i: number) =>
                                  renderRow(r.plusOneName, guestChip, `og-${r._id || i}`)
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        {/* Organiser guests when organiser not playing */}
                        {!detailGame.organiserIsPlaying && orgGuests.map((r: any, i: number) =>
                          renderRow(r.plusOneName, guestChip, `og-${r._id || i}`)
                        )}
                        {/* Each player + their guests */}
                        {mainRegs.map((reg: any, idx: number) => {
                          const pId = reg.player?._id?.toString() ?? reg.player?.toString() ?? "";
                          const myGsts = guestsByPlayerId.get(pId) ?? [];
                          return (
                            <div className="pd-player-group" key={reg._id || idx}>
                              {renderRow(reg.player?.name || "Player", null, `p-${reg._id || idx}`)}
                              {myGsts.length > 0 && (
                                <div className="pd-player-guest-group">
                                  {myGsts.map((gr: any, gi: number) =>
                                    renderRow(gr.plusOneName, guestChip, `pg-${gr._id || gi}`)
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
            {detailIsRegistered && !detailIsCancelled && detailGame.status !== "completed" && (
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
                    onClick={() => handleAddGuest(detailGame)}
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
                    {myGuests.map((reg: any) => (
                      <div key={reg._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 7, border: "1px solid rgba(255,255,255,0.07)" }}>
                        <span style={{ fontSize: 13, color: "#e5e7eb" }}>{reg.plusOneName}</span>
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
                    ))}
                  </div>
                )}

                {detailSpotsLeft === 0 && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#888" }}>
                    Game is full — tap + Add Guest to join the waitlist. You pay only when a slot opens and you confirm.
                  </div>
                )}
              </div>
            )}

            {/* ── Guest Waitlist ── */}
            {(detailIsRegistered || detailIsWaitlisted) && myGuestWaitlist.length > 0 && (
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
                      : "First to confirm gets the seat"}
                  </span>
                </div>
                {detailIsWaitlisted && (
                  <div style={{ fontSize: 11, color: "#a78bfa", marginBottom: 10, lineHeight: 1.5 }}>
                    These guests are waitlisted with you. When a slot opens and you register, your guests will be auto-confirmed in order — up to available seats.
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
                        background: isNotified ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.02)",
                        borderRadius: 7,
                        border: `1px solid ${isNotified ? "rgba(245,158,11,0.35)" : "rgba(255,255,255,0.07)"}`,
                      }}>
                        <div>
                          <div style={{ fontSize: 13, color: "#e5e7eb", fontWeight: 600 }}>{gw.plusOneName}</div>
                          <div style={{ fontSize: 11, marginTop: 2, color: isNotified && detailSpotsLeft > 0 ? "#f59e0b" : "#666" }}>
                            {detailIsWaitlisted
                              ? "Waitlisted with you — auto-confirmed when you register"
                              : isNotified && detailSpotsLeft > 0
                                ? "Seat available — confirm now!"
                                : "Waiting for a slot to open"}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          {detailIsRegistered && isNotified && detailSpotsLeft > 0 && (
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

            {/* ── Modal Footer: Action Buttons ── */}
            <div className="modal-footer pd-event-modal-footer" style={{ 
              display: "flex", 
              gap: "16px", 
              justifyContent: "space-between", 
              alignItems: "center", 
              paddingTop: "24px", 
              paddingBottom: "8px",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              flexWrap: "wrap-reverse"
            }}>
              {/* Close Button (Left) */}
              <button 
                className="btn-close" 
                type="button" 
                onClick={() => { setDetailGame(null); setDetailGameFeedback(null); }}
                style={{
                  padding: "11px 24px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: "rgba(255,255,255,0.06)",
                  color: "#e5e7eb",
                  border: "1px solid rgba(255,255,255,0.12)",
                  transition: "all 0.2s ease",
                  minWidth: "100px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                }}
              >
                Close
              </button>

              {/* Action Buttons Container (Right) */}
              <div style={{ display: "flex", gap: "12px", alignItems: "center", flex: "1 1 auto", justifyContent: "flex-end", minWidth: "fit-content" }}>
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
                {detailIsRegistered && !detailIsCancelled && detailGame.status !== "completed" ? (
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
                {detailIsWaitlisted && !detailIsCancelled ? (
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
