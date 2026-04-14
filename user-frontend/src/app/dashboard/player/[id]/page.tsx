"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { EventCard, EventStatus } from "@/components/dashboard/EventCard";
import { BookingModal } from "@/components/dashboard/BookingModal";
import type { BookingGuest } from "@/components/dashboard/BookingModal";
import { buildApiUrl, clearSession, getSession } from "@/utils/api";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import "../../player-dashboard.css";

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
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [playerPositions, setPlayerPositions] = useState<string[]>([]);
  const [myWaitlist, setMyWaitlist] = useState<any[]>([]);
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
        console.error("API error:", res.status, res.statusText);
        setGames([]);
        return;
      }

      const data = await res.json();
      console.log("[DEBUG] All games:", data);
      
      if (data.success) {
        setGames(data.data || []);
      } else {
        console.error("API failed:", data.message);
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error("Failed to fetch all games", error);
      const message = error instanceof Error ? error.message : "Unknown connection error";
      alert(`Connection error: ${message}`);
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
        console.error("getMyGames API error:", res.status, res.statusText);
        setMyGames([]);
        return;
      }

      const data = await res.json();
      console.log("[DEBUG] My games:", data);
      
      if (data.success) {
        setMyGames(data.data || []);
      } else {
        console.error("getMyGames API failed:", data.message);
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

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchAllGames(), fetchMyGames(), fetchMyWaitlist(), fetchPlayerProfile(), fetchWalletBalance()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }

    fetchDashboardData();
  }, [isAuthorized]);

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



  const changeTab = (tab: "all" | "my-games" | "cancelled" | "completed") => {
    setActiveTab(tab);

    if (typeof window !== "undefined") {
      const sidebarSection = tab === "my-games" ? "mygames" : tab === "cancelled" ? "cancelled" : tab === "completed" ? "completed" : "browse";
      window.dispatchEvent(new CustomEvent("player-tab-change", { detail: sidebarSection }));
    }

    if (playerId) {
      router.replace(`/dashboard/player/${playerId}?tab=${tab}`);
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
      venue: `${game.turf?.name || 'TBC'},${game.turf?.location?.city || 'TBC'}`,
      date: new Date(game.scheduledAt).toISOString().split('T')[0],
      time: new Date(game.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      format: game.format,
      fee: game.feeInPaise / 100,
      spots: Math.max(0, spotsLeft),
      waitlist: isFull,
    };
    setSelectedGame(formattedGame);
  };

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleCancelRegistration = async (game: any) => {
    const { token } = getSession();
    if (!token) {
      clearSession();
      router.replace("/login?role=player");
      return;
    }

    const confirmed = window.confirm("Do you want to cancel your registration for this event?");
    if (!confirmed) return;

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

  const handleConfirmBooking = async (
    game: any,
    guests: BookingGuest[],
    teamPreference: string,
    willingIfFormatChange: boolean,
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
          alert(isWaitlist ? `Waitlist failed: ${data.message}` : `Registration failed: ${data.message}`);
          setSelectedGame(null);
        }
      }
    } catch (error) {
      console.error("Failed to book", error);
      alert("An error occurred. Please try again.");
      setSelectedGame(null);
    }
  };

  const handleLeaveWaitlist = async (game: any) => {
    const { token } = getSession();
    if (!token) { clearSession(); router.replace("/login?role=player"); return; }

    const confirmed = window.confirm("Remove yourself from the waitlist for this event?");
    if (!confirmed) return;

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
  // In "My Games" tab, merge registered + waitlisted games; tag waitlisted with _isWaitlisted + _waitlistStatus
  const myGamesWithWaitlist = [
    ...myGames,
    ...myWaitlist
      .filter((wg) => !myGames.some((mg) => mg._id === wg._id))
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
    { label: "City", value: detailGame.turf?.location?.city || "TBC" },
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
  const detailPlayers = detailGame?.registrations?.map((reg: any, index: number) => ({
    key: `${reg._id || "reg"}-${index}`,
    name: reg.plusOneName || reg.player?.name || "Player",
    position: reg.preferredPosition || "any",
    team: reg.teamPreference || "none",
    isGuest: Boolean(reg.plusOneName),
  })) || [];

  return (
    <div className="player-dashboard-container">
      {notification && (
        <div className={`pd-inline-notice ${notification.type === "success" ? "success" : "error"}`}>
          {notification.message}
        </div>
      )}

      <div className="page-header">
        <div className="page-title-group">
          <div className="page-eyebrow">Player Dashboard</div>
          <div className="page-title">Your Football <span>World</span></div>
        </div>
        <div className="page-actions">
          <div className="search-box">
            <span className="search-icon">⌕</span>
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
        <div className="tab-navigation player-tab-navigation">
          <button
            className={`tab-btn player-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => changeTab('all')}
          >
            <span className="tab-icon">🏟️</span>
            <span className="tab-text">All Games</span>
            <span className="tab-badge">{games.length}</span>
          </button>
          <button
            className={`tab-btn player-tab-btn ${activeTab === 'my-games' ? 'active' : ''}`}
            onClick={() => changeTab('my-games')}
          >
            <span className="tab-icon">🎟️</span>
            <span className="tab-text">My Games</span>
            <span className="tab-badge">{myGames.length + myWaitlist.length}</span>
          </button>
          <button
            className={`tab-btn player-tab-btn ${activeTab === 'cancelled' ? 'active' : ''}`}
            onClick={() => changeTab('cancelled')}
          >
            <span className="tab-icon">⛔</span>
            <span className="tab-text">Cancelled</span>
            <span className="tab-badge">{cancelledGames.length}</span>
          </button>
          <button
            className={`tab-btn player-tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => changeTab('completed')}
          >
            <span className="tab-icon">✅</span>
            <span className="tab-text">Completed</span>
            <span className="tab-badge">{completedGames.length}</span>
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
                city={game.turf?.location?.city || 'TBC'}
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
                onViewDetails={() => setDetailGame(game)}
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

      {detailGame && (
        <div className="modal-overlay" onClick={() => setDetailGame(null)}>
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
                    <div key={player.key} className="pd-event-player-row">
                      <div className="pd-event-player-name">
                        {player.name} {player.isGuest ? "(Guest)" : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pd-event-modal-actions">
              {detailIsWaitlisted && detailSpotsLeft > 0 && !detailIsCancelled && (
                <button
                  className="card-btn signup-btn"
                  type="button"
                  onClick={() => { setDetailGame(null); handleBook(detailGame); }}
                  style={{ flex: "0 0 auto", minWidth: 180 }}
                >
                  <span>⚽ Sign Up Now!</span>
                </button>
              )}
              {detailIsWaitlisted && !detailIsCancelled && (
                <button
                  className="card-btn cancel-btn"
                  type="button"
                  onClick={() => handleLeaveWaitlist(detailGame)}
                  style={{ flex: "0 0 auto", minWidth: 180 }}
                >
                  <span>Leave Waitlist</span>
                </button>
              )}
              {detailIsRegistered && !detailIsCancelled && (
                <button
                  className="card-btn cancel-btn"
                  type="button"
                  onClick={() => handleCancelRegistration(detailGame)}
                  disabled={cancellingGameId === detailGame._id}
                  style={{ flex: "0 0 auto", minWidth: 180 }}
                >
                  <span>{cancellingGameId === detailGame._id ? "Cancelling..." : "Cancel Registration"}</span>
                </button>
              )}
              <button className="btn-close" type="button" onClick={() => setDetailGame(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
