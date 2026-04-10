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
  const [activeTab, setActiveTab] = useState<"all" | "my-games" | "cancelled">("all");
  const [games, setGames] = useState<any[]>([]);
  const [myGames, setMyGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [detailGame, setDetailGame] = useState<any>(null);
  const [cancellingGameId, setCancellingGameId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [walletBalance, setWalletBalance] = useState(1250);
  const [playerPositions, setPlayerPositions] = useState<string[]>([]);
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

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchAllGames(), fetchMyGames(), fetchPlayerProfile()]);
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
    setActiveTab("all");
  }, [searchParams]);

  useEffect(() => {
    const handleTabChange = (event: Event) => {
      const customEvent = event as CustomEvent<"all" | "my-games" | "cancelled">;
      if (customEvent.detail === "my-games" || customEvent.detail === "all" || customEvent.detail === "cancelled") {
        setActiveTab(customEvent.detail);
        return;
      }
      setActiveTab("all");
    };

    window.addEventListener("player-tab-change", handleTabChange as EventListener);
    return () => {
      window.removeEventListener("player-tab-change", handleTabChange as EventListener);
    };
  }, []);

  const changeTab = (tab: "all" | "my-games" | "cancelled") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const sidebarSection = tab === "my-games" ? "mygames" : tab === "cancelled" ? "cancelled" : "browse";
      window.dispatchEvent(new CustomEvent("player-tab-change", { detail: sidebarSection }));
    }
    if (playerId) {
      router.replace(`/dashboard/player/${playerId}?tab=${tab}`);
    }
  };

  const handleBook = (game: any) => {
    // Convert game object to BookingModal format
    const formattedGame = {
      id: game._id,
      venue: `${game.turf?.name || 'TBC'},${game.turf?.location?.city || 'TBC'}`,
      date: new Date(game.scheduledAt).toISOString().split('T')[0],
      time: new Date(game.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      format: game.format,
      fee: game.feeInPaise / 100,
      spots: game.totalSlots - (game.registrations?.length || 0),
      waitlist: false,
      _id: game._id // Keep original ID for API calls
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

  const handleConfirmBooking = async (game: any, guests: BookingGuest[], teamPreference: string) => {
    try {
      const { token } = getSession();
      if (!token) {
        clearSession();
        router.replace("/login?role=player");
        return;
      }

      const res = await fetch(buildApiUrl(`/api/v1/games/${game._id}/register`), {
        method: 'POST',
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Only close modal on SUCCESS - BookingModal handles the notification
        setSelectedGame(null);
        setActiveTab("my-games");
        if (playerId) {
          router.replace(`/dashboard/player/${playerId}?tab=my-games`);
        }
        // Refresh both lists after a short delay to pick up latest registration state
        setTimeout(() => {
          fetchDashboardData();
        }, 500);
      } else {
        // Show error and keep modal open
        alert(`Registration failed: ${data.message}`);
        setSelectedGame(null);
      }
    } catch (error) {
      console.error("Failed to register for game", error);
      alert("An error occurred during registration.");
      setSelectedGame(null);
    }
  };

  const cancelledGames = myGames.filter((game) => {
    const normalizedStatus = String(game.status || "").trim().toLowerCase();
    return normalizedStatus.startsWith("cancel");
  });
  const gamesToDisplay = activeTab === 'all'
    ? games
    : activeTab === 'my-games'
      ? myGames
      : cancelledGames;
  const filteredGames = gamesToDisplay.filter(g => 
    g.turf?.name?.toLowerCase().includes(search.toLowerCase()) ||
    g.turf?.location?.city?.toLowerCase().includes(search.toLowerCase())
  );

  const detailRows = detailGame ? [
    { label: "Venue", value: detailGame.turf?.name || "TBC" },
    { label: "City", value: detailGame.turf?.location?.city || "TBC" },
    { label: "Date", value: new Date(detailGame.scheduledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) },
    { label: "Time", value: new Date(detailGame.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
    { label: "Format", value: detailGame.format || "TBC" },
    { label: "Fee", value: `₹${(detailGame.feeInPaise || 0) / 100}` },
    { label: "Total Slots", value: String(detailGame.totalSlots || 0) },
    { label: "Registered", value: String(detailGame.registrations?.length || 0) },
    { label: "Status", value: String(detailGame.status || "open") },
  ] : [];
  const detailIsRegistered = !!detailGame && myGames.some((myGame) => myGame._id === detailGame._id);
  const detailIsCancelled = !!detailGame && String(detailGame.status || "").toLowerCase().startsWith("cancel");
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
            <span className="tab-badge">{myGames.length}</span>
          </button>
          <button
            className={`tab-btn player-tab-btn ${activeTab === 'cancelled' ? 'active' : ''}`}
            onClick={() => changeTab('cancelled')}
          >
            <span className="tab-icon">⛔</span>
            <span className="tab-text">Cancelled</span>
            <span className="tab-badge">{cancelledGames.length}</span>
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="loading-container"><div className="spinner"></div><p>Loading games...</p></div>
      ) : (
        <div className="events-grid">
          {filteredGames.length > 0 ? filteredGames.map(game => {
            // registrations includes guests (plusOneName entries), all occupy a slot
            const totalRegistered = game.registrations?.length || 0;
            const spotsLeft = game.totalSlots - totalRegistered;
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
                spotsTotal={game.totalSlots}
                spotsLeft={Math.max(0, spotsLeft)}
                isRegistered={myGames.some(myGame => myGame._id === game._id)}
                players={game.registrations?.map((reg: any) => ({
                  // guests show as "PlayerName_1", real players show their actual name
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
          <div className="modal-content" style={{ width: "92%", maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ marginBottom: 16 }}>
              <div className="modal-title-section">
                <h2 style={{ margin: 0 }}>Event Details</h2>
                <p className="modal-subtitle" style={{ marginTop: 8 }}>
                  {detailGame.title || detailGame.turf?.name || "Game"}
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
              {detailRows.map((row) => (
                <div key={row.label} style={{ border: "1px solid #1f1f1f", padding: "10px 12px", background: "#111" }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#777", marginBottom: 4 }}>
                    {row.label}
                  </div>
                  <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{row.value}</div>
                </div>
              ))}
            </div>

            {detailGame.notes && (
              <div style={{ border: "1px solid #1f1f1f", padding: "12px", background: "#111", marginBottom: 16 }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#777", marginBottom: 6 }}>
                  Notes
                </div>
                <div style={{ color: "#ddd", fontSize: 13, lineHeight: 1.5 }}>{detailGame.notes}</div>
              </div>
            )}

            <div style={{ border: "1px solid #1f1f1f", padding: "12px", background: "#111", marginBottom: 16 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#777", marginBottom: 8 }}>
                Player Details (Total: {detailPlayers.length})
              </div>
              {detailPlayers.length === 0 ? (
                <div style={{ color: "#888", fontSize: 13 }}>No players registered yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {detailPlayers.map((player: any) => (
                    <div key={player.key} style={{ display: "flex", justifyContent: "space-between", gap: 8, border: "1px solid #222", padding: "8px 10px", background: "#0d0d0d" }}>
                      <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>
                        {player.name} {player.isGuest ? "(Guest)" : ""}
                      </div>
                      <div style={{ color: "#a5a5a5", fontSize: 12, textTransform: "uppercase" }}>
                        {player.position} • {player.team}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
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
