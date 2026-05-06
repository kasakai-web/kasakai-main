"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  const confirmActionRef = useRef<null | (() => Promise<void>)>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [popupNotif, setPopupNotif] = useState<{ type: "success" | "error"; message: string } | null>(null);
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
    setDetailGame(game);
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

  const showPopupNotification = (type: "success" | "error", message: string, duration: number = 2000) => {
    setPopupNotif({ type, message });
    setTimeout(() => setPopupNotif(null), duration);
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
          // Show 2 second booking confirmation popup message
          showPopupNotification("success", "✓ Event booking confirmed!", 2000);
          setActiveTab("my-games");
          if (playerId) router.replace(`/dashboard/player/${playerId}?tab=my-games`);
          setTimeout(() => { fetchDashboardData(); }, 500);
        }
      } else {
        if (data.code === "INSUFFICIENT_BALANCE") {
          setSelectedGame(null);
          showNotification(
            "error",
            "Insufficient wallet balance. Please recharge your wallet to sign up."
          );
          // Navigate to wallet page so the player can top up immediately
          if (playerId) {
            setTimeout(() => router.push(`/dashboard/player/${playerId}/wallet`), 1000);
          }
        } else {
          showNotification("error", data.message || (isWaitlist ? "Waitlist failed." : "Registration failed."));
          setSelectedGame(null);
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
        } else {
          showNotification("error", data.message || "Failed to add guest.");
        }
        return;
      }
      setDetailGame(data.data);
      fetchWalletBalance();
      fetchMyGames();
      showNotification("success", data.message || "Guest added.");
    } catch {
      showNotification("error", "Failed to add guest. Please try again.");
    } finally {
      setAddingGuest(false);
    }
  };

  const handleRemoveGuest = async (game: any, regId: string) => {
    const { token } = getSession();
    if (!token) { clearSession(); router.replace("/login?role=player"); return; }
    setRemovingGuestId(regId);
    try {
      const res = await fetch(buildApiUrl(`/api/v1/games/${game._id}/remove-guest/${regId}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showNotification("error", data.message || "Failed to remove guest.");
        return;
      }
      setDetailGame(data.data);
      fetchWalletBalance();
      fetchMyGames();
      showNotification("success", data.message || "Guest removed.");
    } catch {
      showNotification("error", "Failed to remove guest. Please try again.");
    } finally {
      setRemovingGuestId(null);
    }
  };

  const promptRemoveGuest = (game: any, regId: string, guestName: string) => {
    setConfirmMessage(`Remove ${guestName} from this game? Their fee will be refunded to your wallet.`);
    confirmActionRef.current = async () => handleRemoveGuest(game, regId);
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
  // Compute live spots remaining for the detail game
  const detailSpotsLeft = detailGame ? Math.max(0,
    detailGame.totalSlots
    - (detailGame.registrations?.filter((r: any) => !['refunded','forfeited'].includes(r.paymentStatus)).length || 0)
    - (detailGame.organiserIsPlaying ? 1 : 0)
  ) : 0;
  const organiserEntry = detailGame?.organiserIsPlaying
    ? [{ key: "organiser", regId: null, name: detailGame.organiser?.name || "Organiser", position: "any", team: "none", isGuest: false, isOrganiser: true, canRemove: false }]
    : [];
  const detailPlayers = [
    ...organiserEntry,
    ...(detailGame?.registrations?.map((reg: any, index: number) => {
      const regPlayerId = reg.player?._id?.toString() ?? reg.player?.toString() ?? "";
      return {
        key: `${reg._id || "reg"}-${index}`,
        regId: reg._id,
        name: reg.plusOneName || reg.player?.name || "Player",
        position: reg.preferredPosition || "any",
        team: reg.teamPreference || "none",
        isGuest: Boolean(reg.plusOneName),
        canRemove: Boolean(reg.plusOneName) && Boolean(reg._isMyReg),
      };
    }) || []),
  ];

  // Current player's guest registrations — use backend-stamped _isMyReg flag
  // so we don't rely on fragile client-side ObjectId string comparison.
  const myGuests = (detailIsRegistered && detailGame)
    ? (detailGame?.registrations || []).filter((reg: any) => reg._isMyReg && reg.plusOneName)
    : [];
  const myGuestCount = myGuests.length;

  return (
    <div className="player-dashboard-container">
      {notification && (
        <div className={`pd-inline-notice ${notification.type === "success" ? "success" : "error"}`}>
          {notification.message}
        </div>
      )}

      {/* Pop-up Notification Overlay */}
      {popupNotif && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 10000,
            animation: "popupFadeIn 0.3s ease-out",
          }}
        >
          <div
            style={{
              background: popupNotif.type === "success" 
                ? "linear-gradient(135deg, rgba(74,222,128,0.95), rgba(59,200,100,0.95))"
                : "linear-gradient(135deg, rgba(248,113,113,0.95), rgba(220,38,38,0.95))",
              color: "#fff",
              padding: "24px 48px",
              borderRadius: 16,
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
              textAlign: "center",
              backdropFilter: "blur(10px)",
              border: popupNotif.type === "success"
                ? "1px solid rgba(74,222,128,0.3)"
                : "1px solid rgba(248,113,113,0.3)",
              minWidth: "300px",
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "-0.5px",
                lineHeight: 1.2,
              }}
            >
              {popupNotif.message}
            </div>
          </div>
        </div>
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
        title="Confirm cancellation"
        message={confirmMessage || "Do you want to continue?"}
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        loading={!!cancellingGameId}
        onCancel={() => {
          setConfirmVisible(false);
          confirmActionRef.current = null;
          setConfirmMessage(null);
        }}
        onConfirm={async () => {
          setConfirmVisible(false);
          const action = confirmActionRef.current;
          confirmActionRef.current = null;
          setConfirmMessage(null);
          if (action) {
            await action();
          }
        }}
      />

      {detailGame && (
        <div className="modal-overlay" onClick={() => { setDetailGame(null); setDetailGameFeedback(null); }}>
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
                <span style={{ fontSize: 22 }}>⚡</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#4ade80", marginBottom: 3 }}>
                    A spot just opened up — be first to claim it!
                  </div>
                  <div style={{ color: "#a3e6bf", fontSize: 12, lineHeight: 1.5 }}>
                    You were on the waitlist for this game. A player dropped out — click Sign Up Now before someone else does.
                  </div>
                </div>
              </div>
            )}

            {detailIsWaitlisted && detailSpotsLeft === 0 && !detailIsCancelled && (
              <div style={{
                border: "1px solid rgba(245,158,11,0.3)",
                padding: "12px 16px",
                background: "rgba(245,158,11,0.06)",
                marginBottom: 16,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}>
                <span style={{ fontSize: 18 }}>📋</span>
                <div style={{ color: "#fcd34d", fontSize: 12, lineHeight: 1.5 }}>
                  You&apos;re on the waitlist. We&apos;ll email you the moment a spot opens up — first to sign up gets it!
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
                  {detailPlayers.map((player: any) => (
                    <div key={player.key} className="pd-event-player-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div className="pd-event-player-name" style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                        {player.name}
                        {player.isOrganiser && (
                          <span style={{
                            fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                            textTransform: "uppercase", color: "#c4d56c",
                            background: "rgba(196,213,108,0.12)", border: "1px solid rgba(196,213,108,0.25)",
                            borderRadius: 4, padding: "2px 6px", fontFamily: "var(--mono, monospace)",
                          }}>Organiser</span>
                        )}
                        {player.isGuest && !player.isOrganiser && (
                          <span style={{
                            fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                            textTransform: "uppercase", color: "#94a3b8",
                            background: "rgba(148,163,184,0.10)", border: "1px solid rgba(148,163,184,0.2)",
                            borderRadius: 4, padding: "2px 6px", fontFamily: "var(--mono, monospace)",
                          }}>Guest</span>
                        )}
                      </div>
                    </div>
                  ))}
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
                  {detailSpotsLeft > 0 && (
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
                      {addingGuest ? "Adding…" : "+ Add Guest"}
                    </button>
                  )}
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
                  <div style={{ marginTop: 8, fontSize: 11, color: "#666" }}>Game is full — no open slots to add more guests.</div>
                )}
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
