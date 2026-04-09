"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { CreateEventModal } from "@/components/dashboard/CreateEventModal";
import { EditEventModal } from "@/components/dashboard/EditEventModal";
import { PlayerDetailsModal } from "@/components/dashboard/PlayerDetailsModal";
import { buildApiUrl, clearSession, getSession } from "@/utils/api";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import "../../organizer-dashboard.css";

export default function OrganizerDashboard() {
  const router = useRouter();
  const routeParams = useParams<{ id?: string | string[] }>();
  const organiserId = Array.isArray(routeParams?.id) ? routeParams.id[0] : routeParams?.id;
  const { isAuthorized } = useAuthGuard({
    requiredRole: "organiser",
    routeUserId: organiserId,
    redirectTo: "/login?role=organiser",
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPlayersModal, setShowPlayersModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGames = async () => {
    try {
      setLoading(true);
      const { token } = getSession();
      if (!token) {
        setLoading(false);
        clearSession();
        router.replace("/login?role=organiser");
        return;
      }
      
      const res = await fetch(buildApiUrl("/api/v1/games/organisers/my-games"), {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          clearSession();
          router.replace("/login?role=organiser");
          return;
        }
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      
      if (data.success) {
        setGames(data.data);
      } else {
        console.error("API Error:", data.message);
      }
    } catch (error) {
      console.error("Failed to fetch games", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }

    fetchGames();
  }, [isAuthorized]);

  const handleCreateEvent = (data: any) => {
    console.log("Event Created", data);
  };

  const handleCancelGame = async (gameId: string) => {
    try {
      const { token } = getSession();

      if (!token) {
        clearSession();
        router.replace("/login?role=organiser");
        return;
      }

      const response = await fetch(buildApiUrl(`/api/v1/games/organisers/${gameId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const contentType = response.headers.get("content-type") || "";
      const responseText = await response.text();
      const data = contentType.includes("application/json")
        ? JSON.parse(responseText)
        : { success: false, message: responseText || `HTTP ${response.status}` };

      if (response.status === 401 || response.status === 403) {
        clearSession();
        router.replace("/login?role=organiser");
        return;
      }

      if (!response.ok || !data.success) {
        alert(`Failed to cancel event: ${data.message || `HTTP ${response.status}`}`);
        return;
      }

      alert('Event cancelled successfully!');
      // Refresh the games list
      fetchGames();
    } catch (error) {
      console.error('Error cancelling event:', error);
      alert(`Failed to cancel event. Please try again. ${(error as Error).message || ''}`);
    }
  };

  // Separate games into upcoming and past based on both status and scheduled date
  const now = new Date();
  const upcomingGames = games.filter(g => {
    const isNotCancelled = g.status !== 'cancelled' && g.status !== 'completed';
    const scheduledDate = new Date(g.scheduledAt);
    const isInFuture = scheduledDate > now;
    return isNotCancelled && isInFuture;
  });

  const pastGames = games.filter(g => {
    const scheduledDate = new Date(g.scheduledAt);
    const isInPast = scheduledDate <= now;
    const isCompleted = g.status === 'completed';
    const isCancelled = g.status === 'cancelled';
    return isInPast || isCompleted || isCancelled;
  });

  return (
    <div className="organizer-dashboard-container">
      {/* Header */}
      <div className="dashboard-header-section">
        <div className="header-left">
          <h1 className="dashboard-title">Organizer Dashboard</h1>
          <p className="dashboard-subtitle">Manage your events, track players, and monitor revenue</p>
        </div>
        <button className="btn-primary btn-lg" onClick={() => setShowCreateModal(true)}>
          <span className="btn-icon">+ </span>Create New Event
        </button>
      </div>

      {/* Stats Overview */}
      <div className="stats-overview">
        <div className="stat-card stat-active">
          <div className="stat-icon">⚽</div>
          <div className="stat-details">
            <div className="stat-value">{upcomingGames.length}</div>
            <div className="stat-title">Active Games</div>
            <div className="stat-desc">Currently scheduled</div>
          </div>
        </div>

        <div className="stat-card stat-completed">
          <div className="stat-icon">🏆</div>
          <div className="stat-details">
            <div className="stat-value">{pastGames.length}</div>
            <div className="stat-title">Completed</div>
            <div className="stat-desc">Finished games</div>
          </div>
        </div>

        <div className="stat-card stat-revenue">
          <div className="stat-icon">💰</div>
          <div className="stat-details">
            <div className="stat-value">₹{games.reduce((total, game) => {
              const collected = (game.totalSlots - (game.spotsRemaining || (game.totalSlots - (game.registrations?.length || 0)))) * (game.feeInPaise ? game.feeInPaise / 100 : 0);
              return total + collected;
            }, 0)}</div>
            <div className="stat-title">Total Revenue</div>
            <div className="stat-desc">From all events</div>
          </div>
        </div>

        <div className="stat-card stat-players">
          <div className="stat-icon">👥</div>
          <div className="stat-details">
            <div className="stat-value">{games.reduce((total, game) => total + (game.registrations?.length || 0), 0)}</div>
            <div className="stat-title">Total Players</div>
            <div className="stat-desc">Registered across all games</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tabs-section">
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            <span className="tab-icon">📅</span>
            <span className="tab-text">Upcoming Events</span>
            <span className="tab-badge">{upcomingGames.length}</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`}
            onClick={() => setActiveTab('past')}
          >
            <span className="tab-icon">📊</span>
            <span className="tab-text">Past Events</span>
            <span className="tab-badge">{pastGames.length}</span>
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="table-section">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading events...</p>
          </div>
        ) : activeTab === 'upcoming' ? (
          upcomingGames.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <h3>No upcoming events</h3>
              <p>Create your first event to get started</p>
              <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                <span>+ </span>Create Event
              </button>
            </div>
          ) : (
            <div className="games-table">
              <div className="table-header">
                <div className="col col-title">Event</div>
                <div className="col col-details">Venue & Date</div>
                <div className="col col-format">Format</div>
                <div className="col col-fee">Fee</div>
                <div className="col col-players">Players</div>
                <div className="col col-revenue">Collected</div>
                <div className="col col-actions">Actions</div>
              </div>
              <div className="table-body">
                {upcomingGames.map(game => (
                  <div key={game._id} className="table-row">
                    <div className="col col-title">
                      <div className="game-title-col">
                        <div className="title-main">{game.title}</div>
                        <div className="status-inline">
                          <span className={`status-label ${game.status}`}>{game.status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="col col-details">
                      <div className="venue-info">
                        <div className="venue-name">{game.turf?.name || 'Unknown'}</div>
                        <div className="venue-location">{game.turf?.location?.city || ''}</div>
                        <div className="date-time">
                          {new Date(game.scheduledAt).toLocaleDateString()} · {new Date(game.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <div className="col col-format">
                      <span className="format-badge">{game.format}</span>
                    </div>
                    <div className="col col-fee">
                      <div className="fee-value">₹{game.feeInPaise ? game.feeInPaise / 100 : 0}</div>
                    </div>
                    <div className="col col-players">
                      {(() => {
                        const regs = game.registrations || [];
                        const total = regs.length;
                        const guests = regs.filter((r: any) => r.plusOneName).length;
                        const realPlayers = total - guests;
                        return (
                          <div className="players-info">
                            <div className="players-count">{total}/{game.totalSlots}</div>
                            {guests > 0 && (
                              <div className="players-breakdown">
                                {realPlayers}P + {guests}G
                              </div>
                            )}
                            {total > 0 && (
                              <div className="players-bar">
                                <div className="players-bar-fill" style={{ width: `${(total / game.totalSlots) * 100}%` }} />
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="col col-revenue">
                      <div className="revenue-value">₹{(game.registrations?.length || 0) * (game.feeInPaise ? game.feeInPaise / 100 : 0)}</div>
                    </div>
                    <div className="col col-actions">
                      <div className="action-buttons">
                        <button 
                          className="btn-action btn-players"
                          onClick={() => {
                            setSelectedGame(game);
                            setShowPlayersModal(true);
                          }}
                          title="View Players"
                        >
                          👥
                        </button>
                        <button 
                          className="btn-action btn-edit"
                          onClick={() => {
                            setSelectedGame(game);
                            setShowEditModal(true);
                          }}
                          title="Edit Event"
                        >
                          ✏️
                        </button>
                        <button 
                          className="btn-action btn-cancel"
                          onClick={() => {
                            const confirmCancel = window.confirm(
                              `Are you sure you want to cancel "${game.title}"?\n\nThis action cannot be undone.`
                            );
                            if (confirmCancel) {
                              handleCancelGame(game._id);
                            }
                          }}
                          title="Cancel Event"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          pastGames.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <h3>No past events yet</h3>
              <p>Completed events will appear here</p>
            </div>
          ) : (
            <div className="games-table">
              <div className="table-header">
                <div className="col col-title">Event</div>
                <div className="col col-details">Venue & Date</div>
                <div className="col col-format">Format</div>
                <div className="col col-fee">Fee</div>
                <div className="col col-players">Attended</div>
                <div className="col col-revenue">Revenue</div>
                <div className="col col-actions">Actions</div>
              </div>
              <div className="table-body">
                {pastGames.map(game => (
                  <div key={game._id} className="table-row">
                    <div className="col col-title">
                      <div className="game-title-col">
                        <div className="title-main">{game.title}</div>
                        <div className="status-inline">
                          <span className={`status-label ${game.status}`}>{game.status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="col col-details">
                      <div className="venue-info">
                        <div className="venue-name">{game.turf?.name || 'Unknown'}</div>
                        <div className="venue-location">{game.turf?.location?.city || ''}</div>
                        <div className="date-time">
                          {new Date(game.scheduledAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="col col-format">
                      <span className="format-badge">{game.format}</span>
                    </div>
                    <div className="col col-fee">
                      <div className="fee-value">₹{game.feeInPaise ? game.feeInPaise / 100 : 0}</div>
                    </div>
                    <div className="col col-players">
                      <div className="players-count">{game.registrations?.length || 0}</div>
                    </div>
                    <div className="col col-revenue">
                      <div className="revenue-value">₹{(game.registrations?.length || 0) * (game.feeInPaise ? game.feeInPaise / 100 : 0)}</div>
                    </div>
                    <div className="col col-actions">
                      <button 
                        className="btn-action btn-players"
                        onClick={() => {
                          setSelectedGame(game);
                          setShowPlayersModal(true);
                        }}
                        title="View Players"
                      >
                        👥
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateEventModal
          lastEvent={
            games.length > 0
              ? [...games].sort(
                  (a, b) =>
                    new Date(b.createdAt || b.scheduledAt).getTime() -
                    new Date(a.createdAt || a.scheduledAt).getTime()
                )[0]
              : undefined
          }
          onClose={() => setShowCreateModal(false)}
          onCreate={() => {
            fetchGames();
          }}
          onSuccess={() => {
            fetchGames();
          }}
        />
      )}

      {showEditModal && selectedGame && (
        <EditEventModal
          gameId={selectedGame._id}
          initialData={selectedGame}
          onClose={() => {
            setShowEditModal(false);
            setSelectedGame(null);
          }}
          onSuccess={() => {
            fetchGames();
          }}
        />
      )}

      {showPlayersModal && selectedGame && (
        <PlayerDetailsModal
          gameName={selectedGame.title}
          players={selectedGame.registrations || []}
          totalSlots={selectedGame.totalSlots}
          onClose={() => {
            setShowPlayersModal(false);
            setSelectedGame(null);
          }}
        />
      )}
    </div>
  );
}