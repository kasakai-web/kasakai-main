"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { EventCard, EventStatus } from "@/components/dashboard/EventCard";
import { BookingModal } from "@/components/dashboard/BookingModal";
import { buildApiUrl, clearSession, getSession } from "@/utils/api";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import "../../player-dashboard.css";

export default function PlayerDashboard() {
  const router = useRouter();
  const routeParams = useParams<{ id?: string | string[] }>();
  const [activeTab, setActiveTab] = useState("all"); // 'all' or 'my-games'
  const [games, setGames] = useState<any[]>([]);
  const [myGames, setMyGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState(1250);
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

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchAllGames(), fetchMyGames()]);
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
    const tab = new URLSearchParams(window.location.search).get("tab");
    setActiveTab(tab === "my-games" ? "my-games" : "all");
  }, []);

  const changeTab = (tab: "all" | "my-games") => {
    setActiveTab(tab);
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

  const handleConfirmBooking = async (game: any, plusOne: boolean) => {
    try {
      const { token } = getSession();
      if (!token) {
        clearSession();
        router.replace("/login?role=player");
        return;
      }

      const res = await fetch(buildApiUrl(`/api/v1/games/${game._id}/register`), {
        method: 'POST',
        headers: { "Authorization": `Bearer ${token}` }
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

  const gamesToDisplay = activeTab === 'all' ? games : myGames;
  const filteredGames = gamesToDisplay.filter(g => 
    g.turf?.name?.toLowerCase().includes(search.toLowerCase()) ||
    g.turf?.location?.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="player-dashboard-container">
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
        </div>
      </div>
      
      {loading ? (
        <div className="loading-container"><div className="spinner"></div><p>Loading games...</p></div>
      ) : (
        <div className="events-grid">
          {filteredGames.length > 0 ? filteredGames.map(game => {
            const spotsLeft = game.totalSlots - (game.registrations?.length || 0);
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
                spotsLeft={spotsLeft}
                isRegistered={myGames.some(myGame => myGame._id === game._id)}
                players={game.registrations?.map((reg: any) => ({
                  name: reg.player?.name || 'Player',
                  initials: (reg.player?.name || 'P').substring(0, 2).toUpperCase(),
                  pos: 'ANY' // Placeholder
                })) || []}
                onBook={() => handleBook(game)}
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
        />
      )}
    </div>
  );
}
