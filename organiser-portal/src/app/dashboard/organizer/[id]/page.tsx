"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { CreateEventModal } from "@/components/dashboard/CreateEventModal";
import { EditEventModal } from "@/components/dashboard/EditEventModal";
import { PlayerDetailsModal } from "@/components/dashboard/PlayerDetailsModal";
import { PostGameModal } from "@/components/dashboard/PostGameModal";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { Toast, useToast } from "@/components/ui/Toast";
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
  const [showPostGameModal, setShowPostGameModal] = useState(false);
  const [postGameTarget, setPostGameTarget] = useState<any>(null);
  const [cancelTargetGame, setCancelTargetGame] = useState<any>(null);
  const [cancelMessage, setCancelMessage] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const confirmActionRef = useRef<null | (() => Promise<void>)>(null);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [modalRefreshing, setModalRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [relativeTime, setRelativeTime] = useState("");
  const isFetchingGamesRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFormat, setFilterFormat] = useState('all');
  const [sortBy, setSortBy] = useState('date-asc');
  const { toast, showToast, hideToast } = useToast();

  const fetchWithLocalFallback = useCallback(
    async (url: string, init?: RequestInit): Promise<Response> => {
      try {
        return await fetch(url, init);
      } catch (err) {
        // On some local setups, localhost can fail while 127.0.0.1 works.
        if (
          err instanceof TypeError &&
          url.includes("localhost")
        ) {
          const fallbackUrl = url.replace("localhost", "127.0.0.1");
          return fetch(fallbackUrl, init);
        }
        throw err;
      }
    },
    []
  );

  const fetchGames = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (isFetchingGamesRef.current) return;
    isFetchingGamesRef.current = true;
    try {
      if (!silent) setLoading(true);
      if (!silent) setFetchError(null);
      const { token } = getSession();
      if (!token) {
        if (!silent) setLoading(false);
        clearSession();
        router.replace("/login?role=organiser");
        return;
      }
      
      const res = await fetchWithLocalFallback(buildApiUrl("/api/v1/games/organisers/my-games"), {
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
        setFetchError(null);
        setSelectedGame((prev: any) =>
          prev ? nextGames.find((g) => g._id === prev._id) ?? prev : prev
        );
        setLastUpdated(new Date());
      } else {
        if (!silent) setFetchError(data.message || "Could not load games right now.");
      }
    } catch (error) {
      const msg =
        error instanceof TypeError
          ? "Unable to reach backend. Ensure backend is running on port 5000 and check NEXT_PUBLIC_API_BASE_URL."
          : "Failed to load games. Please try again.";
      if (!silent) setFetchError(msg);
      console.warn("[ORG_DASHBOARD] fetchGames failed:", error);
    } finally {
      if (!silent) setLoading(false);
      isFetchingGamesRef.current = false;
    }
  }, [fetchWithLocalFallback, router]);

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

  // Real-time: re-fetch whenever a socket notification arrives (e.g. guest waitlist changes)
  useEffect(() => {
    const onSocketNotif = () => { silentFetch(); };
    window.addEventListener('kk-new-notification', onSocketNotif);
    return () => window.removeEventListener('kk-new-notification', onSocketNotif);
  }, [silentFetch]);

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

  const handleCreateEvent = (_data: any) => {
    fetchGames();
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
      if (!res.ok || !data.success) { showToast("error", data.message || "Failed to confirm game"); return; }
      showToast("success", "Game Confirmed!", "Players have been notified.");
      fetchGames({ silent: true });
    } catch (err) {
      showToast("error", "Failed to confirm game. Please try again.");
    }
  };

  const handleOrganiserWithdraw = async (gameId: string) => {
    const doWithdraw = async () => {
      const { token } = getSession();
      if (!token) { clearSession(); router.replace("/login?role=organiser"); return; }
      try {
        const res  = await fetch(buildApiUrl(`/api/v1/games/organisers/${gameId}/withdraw`), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (!res.ok || !data.success) { showToast("error", data.message || "Failed to withdraw"); return; }
        showToast("success", "Withdrawn", "You've been removed from this game.");
        fetchGames({ silent: true });
      } catch (err) {
        showToast("error", "Failed to withdraw. Please try again.");
      }
    };

    setConfirmMessage('Are you sure you want to withdraw yourself from this game?');
    confirmActionRef.current = doWithdraw;
    setConfirmVisible(true);
  };

  const handleRemoveRegistration = async (gameId: string, regId: string) => {
    const { token } = getSession();
    if (!token) { clearSession(); router.replace("/login?role=organiser"); return; }
    try {
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
    } catch (err: any) {
      throw err;
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
        showToast("error", data.message || `Failed to cancel event`);
        return;
      }

      setShowCancelModal(false);
      setCancelTargetGame(null);
      setCancelMessage("");
      showToast("success", "Event Cancelled", "All players have been notified.");
      fetchGames({ silent: true });
    } catch (error) {
      console.error('Error cancelling event:', error);
      showToast("error", "Failed to cancel event. Please try again.");
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
  const getActiveRegs = (game: any) => (game.registrations || []).filter(
    (r: any) => !['refunded', 'forfeited'].includes(r.paymentStatus) && !r.optedOut
  ).length;
  const getTotalPlayers = (game: any) => getActiveRegs(game) + getOrganiserCount(game);

  const allFormats = [...new Set(games.map((g: any) => g.format).filter(Boolean))] as string[];

  const applyFilters = (list: any[]) => {
    let result = [...list];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(g =>
        g.title?.toLowerCase().includes(q) ||
        g.turf?.name?.toLowerCase().includes(q) ||
        g.turf?.address?.city?.toLowerCase().includes(q) ||
        g.format?.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== 'all') result = result.filter(g => g.status === filterStatus);
    if (filterFormat !== 'all') result = result.filter(g => g.format === filterFormat);
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':   return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
        case 'date-desc':  return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime();
        case 'players-desc': return getTotalPlayers(b) - getTotalPlayers(a);
        case 'fee-asc':    return (a.feeInPaise || 0) - (b.feeInPaise || 0);
        case 'fee-desc':   return (b.feeInPaise || 0) - (a.feeInPaise || 0);
        default: return 0;
      }
    });
    return result;
  };

  const filteredUpcoming = applyFilters(upcomingGames);
  const filteredPast     = applyFilters(pastGames);
  const hasActiveFilters = !!(searchQuery || filterStatus !== 'all' || filterFormat !== 'all' || sortBy !== 'date-asc');
  const clearFilters = () => { setSearchQuery(''); setFilterStatus('all'); setFilterFormat('all'); setSortBy('date-asc'); };

  const handleLogout = () => {
  clearSession(); // ✅ better than localStorage.clear()
  router.replace("/login?role=organiser");
};

  return (
    <div className="organizer-dashboard-container">
      {toast && <Toast type={toast.type} title={toast.title} subtitle={toast.subtitle} onClose={hideToast} />}

      {/* Header */}
      <div className="dashboard-header-section">
        <div className="header-left">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 className="dashboard-title">Organizer Dashboard</h1>
            <span className="live-badge"><span className="live-dot" />Live</span>
          </div>
          <p className="dashboard-subtitle">
            Manage your events, track players, and monitor revenue
          </p>
        </div>
        <button className="btn-primary btn-lg" onClick={() => setShowCreateModal(true)}>
          <span className="btn-icon">+ </span>Create New Event
        </button>
      </div>

      <ConfirmationModal
        open={confirmVisible}
        title="Withdraw from game"
        message={confirmMessage || "Are you sure you want to continue?"}
        confirmLabel="Withdraw"
        cancelLabel="Keep me in"
        onCancel={() => {
          setConfirmVisible(false);
          confirmActionRef.current = null;
          setConfirmMessage(null);
        }}
        onConfirm={async () => {
          setConfirmVisible(false);
          const act = confirmActionRef.current;
          confirmActionRef.current = null;
          setConfirmMessage(null);
          if (act) {
            await act();
          }
        }}
      />

      {fetchError && (
        <div style={{
          marginBottom: 14,
          background: "rgba(248,113,113,0.08)",
          border: "1px solid rgba(248,113,113,0.28)",
          color: "#fda4af",
          borderRadius: 10,
          padding: "10px 12px",
          fontSize: 13,
          fontWeight: 600,
        }}>
          {fetchError}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tabs-section">
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            <span className="tab-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </span>
            <span className="tab-text">Upcoming Events</span>
            <span className="tab-badge">{upcomingGames.length}</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`}
            onClick={() => setActiveTab('past')}
          >
            <span className="tab-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </span>
            <span className="tab-text">Past Events</span>
            <span className="tab-badge">{pastGames.length}</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      {!loading && games.length > 0 && (
        <div className="filter-bar">
          <div className="filter-search-wrap">
            <svg className="filter-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="filter-search-input"
              type="text"
              placeholder="Search by title, venue, city, format…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="filter-search-clear" onClick={() => setSearchQuery('')} title="Clear search">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>

          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="tentative">Tentative</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select className="filter-select" value={filterFormat} onChange={e => setFilterFormat(e.target.value)}>
            <option value="all">All Formats</option>
            {allFormats.map(f => <option key={f} value={f}>{f}</option>)}
          </select>

          <select className="filter-select filter-sort" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="date-asc">Date ↑</option>
            <option value="date-desc">Date ↓</option>
            <option value="players-desc">Most Players</option>
            <option value="fee-asc">Fee ↑</option>
            <option value="fee-desc">Fee ↓</option>
          </select>

          {hasActiveFilters && (
            <button className="filter-clear-btn" onClick={clearFilters} title="Clear all filters">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Clear
            </button>
          )}

          <span className="filter-result-count">
            {activeTab === 'upcoming' ? filteredUpcoming.length : filteredPast.length}
            {' '}/{' '}
            {activeTab === 'upcoming' ? upcomingGames.length : pastGames.length} events
          </span>
        </div>
      )}

      {/* Table Section */}
      <div className="table-section">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading events...</p>
          </div>
        ) : activeTab === 'upcoming' ? (
          filteredUpcoming.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              {hasActiveFilters ? (
                <>
                  <h3>No events match your filters</h3>
                  <p>Try adjusting your search or filters</p>
                  <button className="btn-primary" onClick={clearFilters}>Clear Filters</button>
                </>
              ) : (
                <>
                  <h3>No upcoming events</h3>
                  <p>Create your first event to get started</p>
                  <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                    <span>+ </span>Create Event
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="games-table">
              <div className="table-header">
                <div className="col col-title">Event</div>
                <div className="col col-details">Venue & Date</div>
                <div className="col col-format">Format</div>
                <div className="col col-fee">Fee</div>
                <div className="col col-players">Players</div>
                <div className="col col-actions">Actions</div>
              </div>
              <div className="table-body">
                {filteredUpcoming.map(game => (
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
                        <div className="venue-location">{(game.turf as any)?.address?.city || ''}</div>
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
                        const total = typeof game.spotsRemaining === 'number'
                          ? game.totalSlots - game.spotsRemaining
                          : getActiveRegs(game) + getOrganiserCount(game);
                        return (
                          <div className="players-info">
                            <div className="players-count">{total}/{game.totalSlots}</div>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="col col-actions">
                      <div className="action-buttons">
                        <button
                          className="btn-action btn-players"
                          onClick={() => { setSelectedGame(game); setShowPlayersModal(true); }}
                          title="View Players"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                          </svg>
                          <span className="btn-label">Players</span>
                        </button>
                        <button
                          className="btn-action btn-edit"
                          onClick={() => { setSelectedGame(game); setShowEditModal(true); }}
                          title="Edit Event"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                          <span className="btn-label">Edit</span>
                        </button>
                        {['open','tentative'].includes(game.status) && getTotalPlayers(game) >= game.minPlayers && (
                          <button
                            className="btn-action btn-confirm"
                            onClick={() => handleConfirmGame(game._id)}
                            title="Confirm Game"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            <span className="btn-label">Confirm</span>
                          </button>
                        )}
                        {game.organiserIsPlaying && (
                          <button
                            className="btn-action btn-withdraw"
                            onClick={() => handleOrganiserWithdraw(game._id)}
                            title="Withdraw from game"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
                            </svg>
                            <span className="btn-label">Withdraw</span>
                          </button>
                        )}
                        {!['cancelled', 'completed'].includes(game.status) && (
                          <button
                            className="btn-action btn-complete"
                            onClick={() => { setPostGameTarget(game); setShowPostGameModal(true); }}
                            title="Complete Game & Rate Players"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                              <line x1="4" y1="22" x2="4" y2="15"/>
                            </svg>
                            <span className="btn-label">Complete</span>
                          </button>
                        )}
                        <button
                          className="btn-action btn-cancel"
                          onClick={() => openCancelModal(game)}
                          title="Cancel Event"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                          <span className="btn-label">Cancel</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          filteredPast.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              {hasActiveFilters ? (
                <>
                  <h3>No events match your filters</h3>
                  <p>Try adjusting your search or filters</p>
                  <button className="btn-primary" onClick={clearFilters}>Clear Filters</button>
                </>
              ) : (
                <>
                  <h3>No past events yet</h3>
                  <p>Completed events will appear here</p>
                </>
              )}
            </div>
          ) : (
            <div className="games-table">
              <div className="table-header">
                <div className="col col-title">Event</div>
                <div className="col col-details">Venue & Date</div>
                <div className="col col-format">Format</div>
                <div className="col col-fee">Fee</div>
                <div className="col col-players">Attended</div>
                <div className="col col-postgame">Post-Game</div>
                <div className="col col-actions">Actions</div>
              </div>
              <div className="table-body">
                {filteredPast.map(game => (
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
                        <div className="venue-location">{(game.turf as any)?.address?.city || ''}</div>
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
                      <div className="players-count">
                        {typeof game.spotsRemaining === 'number'
                          ? game.totalSlots - game.spotsRemaining
                          : getTotalPlayers(game)}
                      </div>
                    </div>
                    <div className="col col-postgame">
                      {game.status === 'completed' ? (
                        <div className="postgame-stats">
                          <div className="postgame-stat">
                            <span className="postgame-label">Present:</span>
                            <span className="postgame-value">
                              {game.registrations?.filter((r: any) => r.attended === 'present').length || 0}
                            </span>
                          </div>
                          <div className="postgame-stat">
                            <span className="postgame-label">Ratings:</span>
                            <span className="postgame-value">
                              {game.playerRatingsCount || 0}
                            </span>
                          </div>
                          <div className="postgame-stat">
                            <span className="postgame-label">Feedback:</span>
                            <span className="postgame-value">
                              {game.feedbackCount || 0}
                            </span>
                          </div>
                        </div>
                      ) : game.status === 'cancelled' ? (
                        <div className="postgame-cancelled">
                          <span>Cancelled</span>
                        </div>
                      ) : (
                        <div className="postgame-pending">
                          <span>Pending</span>
                        </div>
                      )}
                    </div>
                    <div className="col col-actions">
                      <div className="action-buttons">
                        <button
                          className="btn-action btn-players"
                          onClick={() => { setSelectedGame(game); setShowPlayersModal(true); }}
                          title="View Players"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                          </svg>
                          <span className="btn-label">Players</span>
                        </button>
                        {game.status !== 'completed' && game.status !== 'cancelled' && (
                          <button
                            className="btn-action btn-complete"
                            onClick={() => { setPostGameTarget(game); setShowPostGameModal(true); }}
                            title="Complete Game & Rate Players"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                              <line x1="4" y1="22" x2="4" y2="15"/>
                            </svg>
                            <span className="btn-label">Complete</span>
                          </button>
                        )}
                        {game.status === 'completed' && !game.attendanceMarked && (
                          <button
                            className="btn-action btn-attendance"
                            onClick={() => { setPostGameTarget(game); setShowPostGameModal(true); }}
                            title="Mark Attendance & Rate Players"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                            </svg>
                            <span className="btn-label">Attendance</span>
                          </button>
                        )}
                        {game.status === 'completed' && game.attendanceMarked && (
                          <button
                            className="btn-action btn-ratings"
                            onClick={() => { setPostGameTarget(game); setShowPostGameModal(true); }}
                            title="View / Edit Ratings"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                            <span className="btn-label">Ratings</span>
                          </button>
                        )}
                      </div>
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
            showToast("success", "Game Created!", "Your event is now live.");
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
          gameId={selectedGame._id}
          gameName={selectedGame.title}
          players={selectedGame.registrations || []}
          waitlist={selectedGame.waitlist || []}
          guestWaitlist={selectedGame.guestWaitlist || []}
          totalSlots={selectedGame.totalSlots}
          spotsRemaining={typeof selectedGame.spotsRemaining === 'number' ? selectedGame.spotsRemaining : undefined}
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

      {showPostGameModal && postGameTarget && (
        <PostGameModal
          game={postGameTarget}
          onClose={() => { setShowPostGameModal(false); setPostGameTarget(null); }}
          onDone={() => {
            setShowPostGameModal(false);
            setPostGameTarget(null);
            showToast("success", "Ratings Saved!", "Post-game report complete.");
            fetchGames({ silent: true });
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