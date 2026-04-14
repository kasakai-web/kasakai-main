"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { CreateEventModal } from "@/components/dashboard/CreateEventModal";
import { EditEventModal } from "@/components/dashboard/EditEventModal";
import { PlayerDetailsModal } from "@/components/dashboard/PlayerDetailsModal";
import { buildApiUrl, clearSession, getSession } from "@/utils/api";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
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
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTargetGame, setCancelTargetGame] = useState<any>(null);
  const [cancelMessage, setCancelMessage] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalRefreshing, setModalRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [relativeTime, setRelativeTime] = useState("");
  const isFetchingGamesRef = useRef(false);

  const fetchGames = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (isFetchingGamesRef.current) return;
    isFetchingGamesRef.current = true;
    try {
      if (!silent) setLoading(true);
      const { token } = getSession();
      if (!token) {
        if (!silent) setLoading(false);
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
        const nextGames: any[] = data.data || [];
        setGames(nextGames);
        setSelectedGame((prev: any) =>
          prev ? nextGames.find((g) => g._id === prev._id) ?? prev : prev
        );
        setLastUpdated(new Date());
      } else {
        console.error("API Error:", data.message);
      }
    } catch (error) {
      console.error("Failed to fetch games", error);
    } finally {
      if (!silent) setLoading(false);
      isFetchingGamesRef.current = false;
    }
  }, [router]);

  // Silently re-fetch and update selectedGame (used by modal refresh)
  const refreshSelectedGame = useCallback(async (silent = false) => {
    if (!silent) setModalRefreshing(true);
    try {
      await fetchGames({ silent: true });
    } finally {
      if (!silent) setModalRefreshing(false);
    }
  }, [fetchGames]);

  // Auto-poll every 15 s while the players modal is open
  const modalSilentRefresh = useCallback(() => refreshSelectedGame(true), [refreshSelectedGame]);
  useAutoRefresh(showPlayersModal ? modalSilentRefresh : null, { interval: 15_000 });

  // Keep dashboard data fresh — 20 s poll + focus + visibility
  const silentFetch = useCallback(() => fetchGames({ silent: true }), [fetchGames]);
  useAutoRefresh(isAuthorized ? silentFetch : null, { interval: 20_000 });

  // Tick every 5 s to update "Updated X ago" text
  useEffect(() => {
    function formatRelativeTime(d: Date) {
      const secs = Math.floor((Date.now() - d.getTime()) / 1000);
      if (secs < 5) return "just now";
      if (secs < 60) return `${secs}s ago`;
      return `${Math.floor(secs / 60)}m ago`;
    }
    if (!lastUpdated) return;
    setRelativeTime(formatRelativeTime(lastUpdated));
    const id = setInterval(() => setRelativeTime(formatRelativeTime(lastUpdated)), 5000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  useEffect(() => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }

    fetchGames();
  }, [isAuthorized, fetchGames]);

  const handleCreateEvent = (data: any) => {
    console.log("Event Created", data);
  };

  const handleConfirmGame = async (gameId: string) => {
    const { token } = getSession();
    if (!token) { clearSession(); router.replace("/login?role=organiser"); return; }
    try {
      const res  = await fetch(buildApiUrl(`/api/v1/games/organisers/${gameId}/confirm`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || !data.success) { alert(data.message || 'Failed to confirm game'); return; }
      fetchGames({ silent: true });
    } catch (err) {
      alert('Failed to confirm game. Please try again.');
    }
  };

  const handleOrganiserWithdraw = async (gameId: string) => {
    if (!window.confirm('Are you sure you want to withdraw yourself from this game?')) return;
    const { token } = getSession();
    if (!token) { clearSession(); router.replace("/login?role=organiser"); return; }
    try {
      const res  = await fetch(buildApiUrl(`/api/v1/games/organisers/${gameId}/withdraw`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || !data.success) { alert(data.message || 'Failed to withdraw'); return; }
      fetchGames({ silent: true });
    } catch (err) {
      alert('Failed to withdraw. Please try again.');
    }
  };

  const handleRemoveRegistration = async (gameId: string, regId: string) => {
    const { token } = getSession();
    if (!token) { clearSession(); router.replace("/login?role=organiser"); return; }
    const res  = await fetch(buildApiUrl(`/api/v1/games/organisers/${gameId}/registrations/${regId}`), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || `HTTP ${res.status}`);
    // Refresh games and keep the modal open with updated data
    const { token: t2 } = getSession();
    const refreshed = await fetch(buildApiUrl("/api/v1/games/organisers/my-games"), {
      headers: { Authorization: `Bearer ${t2}` },
    });
    const refreshedData = await refreshed.json();
    if (refreshedData.success) {
      const updatedGames: any[] = refreshedData.data;
      setGames(updatedGames);
      setSelectedGame((prev: any) => updatedGames.find((g) => g._id === prev?._id) ?? prev);
    }
  };

  const handleCancelGame = async (gameId: string, message: string) => {
    setCancellingId(gameId);
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
        },
        body: JSON.stringify({ cancelMessage: message }),
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

      setShowCancelModal(false);
      setCancelTargetGame(null);
      setCancelMessage("");
      // Refresh the games list
      fetchGames({ silent: true });
    } catch (error) {
      console.error('Error cancelling event:', error);
      alert(`Failed to cancel event. Please try again. ${(error as Error).message || ''}`);
    } finally {
      setCancellingId(null);
    }
  };

  const openCancelModal = (game: any) => {
    setCancelTargetGame(game);
    setCancelMessage("");
    setShowCancelModal(true);
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

  const getOrganiserCount = (game: any) => (game.organiserIsPlaying ? 1 : 0);
  const getTotalPlayers = (game: any) => (game.registrations?.length || 0) + getOrganiserCount(game);

  return (
    <div className="organizer-dashboard-container">
      {/* Header */}
      <div className="dashboard-header-section">
        <div className="header-left">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 className="dashboard-title">Organizer Dashboard</h1>
            <span className="live-badge"><span className="live-dot" />Live</span>
          </div>
          <p className="dashboard-subtitle">
            Manage your events, track players, and monitor revenue
            {relativeTime && (
              <span className="last-updated-hint" style={{ marginLeft: 10 }}>· Updated {relativeTime}</span>
            )}
          </p>
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
            <div className="stat-value">{games.reduce((total, game) => total + getTotalPlayers(game), 0)}</div>
            <div className="stat-title">Total Players</div>
            <div className="stat-desc">Including organisers who are playing</div>
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
                        {game.reportingMinsBeforeGame > 0 && (
                          <div className="date-time" style={{ color: '#888', fontSize: 11, marginTop: 2 }}>
                            Report: {(() => {
                              const d = new Date(new Date(game.scheduledAt).getTime() - game.reportingMinsBeforeGame * 60000);
                              return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            })()}
                            {game.endsAt && ` · Ends: ${new Date(game.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                          </div>
                        )}
                        {game.organiserIsPlaying && (
                          <div style={{ fontSize: 10, color: '#c8ff3e', marginTop: 2 }}>⚽ You are playing</div>
                        )}
                      </div>
                    </div>
                    <div className="col col-format">
                      <span className="format-badge">{game.format}</span>
                      {game.allowSizeChange && (
                        <div style={{ fontSize: 10, color: '#888', marginTop: 3 }} title="Format change allowed">⇄ flexible</div>
                      )}
                    </div>
                    <div className="col col-fee">
                      <div className="fee-value">₹{game.feeInPaise ? game.feeInPaise / 100 : 0}</div>
                    </div>
                    <div className="col col-players">
                      {(() => {
                        const regs = game.registrations || [];
                        const organiserCount = getOrganiserCount(game);
                        const total = regs.length + organiserCount;
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
                                <div className="players-bar-fill" style={{ width: `${Math.min(100, (total / game.totalSlots) * 100)}%` }} />
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
                          onClick={() => { setSelectedGame(game); setShowPlayersModal(true); }}
                          title="View Players"
                        >👥</button>
                        <button
                          className="btn-action btn-edit"
                          onClick={() => { setSelectedGame(game); setShowEditModal(true); }}
                          title="Edit Event"
                        >✏️</button>
                        {['open','tentative'].includes(game.status) && game.registrations?.length >= game.minPlayers && (
                          <button
                            className="btn-action btn-confirm"
                            onClick={() => handleConfirmGame(game._id)}
                            title="Confirm Game"
                            style={{ background: 'rgba(200,255,62,0.15)', color: '#c8ff3e', border: '1px solid rgba(200,255,62,0.3)' }}
                          >✓</button>
                        )}
                        {game.organiserIsPlaying && (
                          <button
                            className="btn-action"
                            onClick={() => handleOrganiserWithdraw(game._id)}
                            title="Withdraw from game"
                            style={{ background: 'rgba(255,179,71,0.15)', color: '#ffb347', border: '1px solid rgba(255,179,71,0.3)', fontSize: 12 }}
                          >↩</button>
                        )}
                        <button
                          className="btn-action btn-cancel"
                          onClick={() => openCancelModal(game)}
                          title="Cancel Event"
                        >✕</button>
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
                      {game.allowSizeChange && (
                        <div style={{ fontSize: 10, color: '#888', marginTop: 3 }} title="Format change allowed">⇄ flexible</div>
                      )}
                    </div>
                    <div className="col col-fee">
                      <div className="fee-value">₹{game.feeInPaise ? game.feeInPaise / 100 : 0}</div>
                    </div>
                    <div className="col col-players">
                      <div className="players-count">{getTotalPlayers(game)}</div>
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
            fetchGames({ silent: true });
          }}
          onSuccess={() => {
            fetchGames({ silent: true });
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
            fetchGames({ silent: true });
          }}
        />
      )}

      {showPlayersModal && selectedGame && (
        <PlayerDetailsModal
          gameName={selectedGame.title}
          players={selectedGame.registrations || []}
          waitlist={selectedGame.waitlist || []}
          totalSlots={selectedGame.totalSlots}
          organiserIsPlaying={Boolean(selectedGame.organiserIsPlaying)}
          onToggleOrganiserPlaying={() => handleOrganiserWithdraw(selectedGame._id)}
          onRemoveRegistration={async (regId) => {
            await handleRemoveRegistration(selectedGame._id, regId);
          }}
          onRefresh={() => refreshSelectedGame(false)}
          isRefreshing={modalRefreshing}
          onClose={() => {
            setShowPlayersModal(false);
            setSelectedGame(null);
          }}
        />
      )}

      {showCancelModal && cancelTargetGame && (
        <div className="modal-overlay" onClick={() => { setShowCancelModal(false); setCancelTargetGame(null); setCancelMessage(""); }}>
          <div className="modal-content" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>Cancel Event</h2>
              <p style={{ marginTop: 8, color: "#888", fontSize: 14 }}>
                You are about to cancel <strong>{cancelTargetGame.title}</strong>. All registered players will receive an email notification.
              </p>
            </div>
            <div style={{ marginTop: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#ccc" }}>
                Message to players (optional)
              </label>
              <textarea
                rows={4}
                value={cancelMessage}
                onChange={(e) => setCancelMessage(e.target.value)}
                placeholder="e.g. Due to bad weather, we are unable to host this event. Apologies for the inconvenience."
                style={{
                  width: "100%",
                  background: "#111",
                  border: "1px solid #333",
                  color: "#fff",
                  borderRadius: 6,
                  padding: "10px 12px",
                  fontSize: 13,
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
              <button
                type="button"
                onClick={() => { setShowCancelModal(false); setCancelTargetGame(null); setCancelMessage(""); }}
                disabled={cancellingId === cancelTargetGame._id}
                style={{
                  padding: "8px 20px",
                  borderRadius: 6,
                  cursor: "pointer",
                  background: "#222",
                  border: "1px solid #444",
                  color: "#ccc",
                  fontWeight: 600,
                }}
              >
                Go Back
              </button>
              <button
                type="button"
                className="btn-cancel-confirm"
                disabled={cancellingId === cancelTargetGame._id}
                onClick={() => handleCancelGame(cancelTargetGame._id, cancelMessage)}
                style={{
                  padding: "8px 20px",
                  borderRadius: 6,
                  background: "#c0392b",
                  color: "#fff",
                  border: "none",
                  fontWeight: 600,
                  cursor: cancellingId === cancelTargetGame._id ? "not-allowed" : "pointer",
                  opacity: cancellingId === cancelTargetGame._id ? 0.7 : 1,
                }}
              >
                {cancellingId === cancelTargetGame._id ? "Cancelling..." : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}