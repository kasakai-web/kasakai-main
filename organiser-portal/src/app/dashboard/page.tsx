"use client";

import React, { useState, useEffect } from "react";
import "../organiser-dashboard.css";

interface Player {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
}

interface Registration {
  player: Player;
  paymentStatus: string;
  signedUpAt: string;
  position?: string;
  teamPreference?: string;
}

interface Game {
  _id: string;
  title: string;
  format: string;
  turf: {
    name: string;
    location: {
      city: string;
    };
  };
  scheduledAt: string;
  status: string;
  totalSlots: number;
  feeInPaise: number;
  registrations: Registration[];
}

export default function OrganizerDashboard() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [filter, setFilter] = useState("all"); // all, open, confirmed, completed

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      if (!token) {
        console.error("No auth token found");
        alert("Please log in first");
        setLoading(false);
        return;
      }
      
      console.log("[DEBUG] Fetching organizer games with token:", token.substring(0, 20) + "...");
      
      const res = await fetch("http://localhost:5000/api/v1/games/organisers/my-games", {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      
      console.log("[DEBUG] API response status:", res.status, res.statusText);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("[ERROR] API error response:", errorText);
        alert(`API Error ${res.status}: ${errorText}`);
        setLoading(false);
        return;
      }
      
      const data = await res.json();
      console.log("[DEBUG] API response data:", data);
      
      if (data.success && Array.isArray(data.data)) {
        setGames(data.data || []);
        console.log("[DEBUG] Games loaded:", data.data.length);
      } else {
        console.error("[ERROR] Invalid API response:", data);
        alert(`Error: ${data.message || "Invalid data format"}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : undefined;

      console.error("[ERROR] Failed to fetch games:", errorMessage);
      if (errorStack) {
        console.error("[ERROR] Stack:", errorStack);
      }
      alert(`Connection error: ${errorMessage}`);
    }
    setLoading(false);
  };

  const filteredGames = games.filter(game => 
    filter === "all" ? true : game.status === filter
  );

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "open": return "badge-open";
      case "confirmed": return "badge-confirmed";
      case "completed": return "badge-completed";
      case "cancelled": return "badge-cancelled";
      default: return "badge-default";
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return "payment-pending";
      case "completed": return "payment-completed";
      case "refunded": return "payment-refunded";
      default: return "payment-pending";
    }
  };

  return (
    <div className="organiser-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1 className="page-title">Organizer Dashboard</h1>
          <p className="page-subtitle">Manage your games and track player registrations</p>
        </div>
        <button className="btn-refresh" onClick={fetchGames}>
          🔄 Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Games</div>
          <div className="stat-value">{games.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Players</div>
          <div className="stat-value">
            {games.reduce((sum, game) => sum + game.registrations.length, 0)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Open Games</div>
          <div className="stat-value">{games.filter(g => g.status === "open").length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value">
            ₹{Math.round(
              games.reduce((sum, game) => 
                sum + (game.registrations.length * game.feeInPaise / 100), 0
              )
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {["all", "open", "confirmed", "completed"].map(status => (
          <button
            key={status}
            className={`filter-btn ${filter === status ? "active" : ""}`}
            onClick={() => setFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status === "all" && ` (${games.length})`}
            {status !== "all" && ` (${games.filter(g => g.status === status).length})`}
          </button>
        ))}
      </div>

      {/* Games List */}
      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading games...</p>
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="empty-state">
          <p>No games found</p>
        </div>
      ) : (
        <div className="games-list">
          {filteredGames.map(game => (
            <div key={game._id} className="game-item">
              <div className="game-header">
                <div className="game-info">
                  <h3 className="game-title">{game.turf.name}</h3>
                  <p className="game-meta">
                    📍 {game.turf.location.city} | {game.format} | ₹{game.feeInPaise / 100}
                  </p>
                  <p className="game-time">
                    📅 {new Date(game.scheduledAt).toLocaleDateString()} | 🕗 {new Date(game.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="game-status">
                  <span className={`status-badge ${getStatusBadgeColor(game.status)}`}>
                    {game.status.toUpperCase()}
                  </span>
                  <span className="player-count">
                    {game.registrations.length}/{game.totalSlots} Players
                  </span>
                </div>
              </div>

              <button
                className="game-toggle"
                onClick={() => setSelectedGame(selectedGame?._id === game._id ? null : game)}
              >
                {selectedGame?._id === game._id ? "▼ Hide Players" : "▶ Show Players"}
              </button>

              {selectedGame?._id === game._id && (
                <div className="players-list">
                  {game.registrations.length === 0 ? (
                    <p className="no-players">No players registered yet</p>
                  ) : (
                    <div className="players-table">
                      <div className="table-header">
                        <div className="col-name">Player Name</div>
                        <div className="col-contact">Contact</div>
                        <div className="col-joined">Joined</div>
                        <div className="col-payment">Payment</div>
                      </div>
                      {game.registrations.map((reg, idx) => (
                        <div key={idx} className="table-row">
                          <div className="col-name">
                            <span className="player-badge">{reg.player.name}</span>
                          </div>
                          <div className="col-contact">
                            {reg.player.phone && <p>📞 {reg.player.phone}</p>}
                            {reg.player.email && <p>📧 {reg.player.email}</p>}
                          </div>
                          <div className="col-joined">
                            {new Date(reg.signedUpAt).toLocaleDateString()} 
                            <br />
                            {new Date(reg.signedUpAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          <div className="col-payment">
                            <span className={`payment-badge ${getPaymentStatusBadge(reg.paymentStatus)}`}>
                              {reg.paymentStatus}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
