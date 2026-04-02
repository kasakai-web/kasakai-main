"use client";

import React, { useState, useEffect } from "react";
import { CreateEventModal } from "@/components/dashboard/CreateEventModal";
import { OrganizerEventCard } from "@/components/dashboard/OrganizerEventCard";

export default function OrganizerDashboard({ params }: { params: { id: string } }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGames = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/v1/games/organiser", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setGames(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch games", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleCreateEvent = (data: any) => {
    console.log("Event Created", data);
  };

  const upcomingGames = games.filter(g => g.status !== 'completed' && g.status !== 'cancelled');
  const pastGames = games.filter(g => g.status === 'completed');

  return (
    <div className="organiser-view show">
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-eyebrow">Mumbai Community</div>
          <div className="page-title">Organiser <span>Dashboard</span></div>
        </div>
        <div className="page-actions">
          <button className="create-game-btn" onClick={() => setShowCreateModal(true)}>
            <span>+ Create Event</span>
          </button>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Active Games</div>
          <div className="stat-value">{upcomingGames.length}</div>
          <div className="stat-sub">Manage your active games</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Completed</div>
          <div className="stat-value">{pastGames.length}</div>
          <div className="stat-sub">Games finished</div>
        </div>
      </div>

      <div className="section-tabs">
        <button className={`sec-tab ${activeTab === 'upcoming' ? 'active' : ''}`} onClick={() => setActiveTab('upcoming')}>Upcoming</button>
        <button className={`sec-tab ${activeTab === 'past' ? 'active' : ''}`} onClick={() => setActiveTab('past')}>Past Games</button>
      </div>

      {activeTab === 'upcoming' && (
        <div id="orgUpcoming">
          <div style={{ fontFamily: "var(--mono)", fontSize: "12px", textTransform: "uppercase", color: "var(--muted)", marginBottom: "16px" }}>
            My Events
          </div>
          {loading ? (
            <p>Loading games...</p>
          ) : upcomingGames.length === 0 ? (
            <p>No upcoming games found. Create one!</p>
          ) : (
            upcomingGames.map(game => {
              const mappedGame = {
                id: game._id,
                title: game.title,
                status: game.status,
                venue: game.turf ? `${game.turf.name}, ${game.turf.location?.city || ''}` : "Unknown Turf",
                date: new Date(game.scheduledAt).toISOString().split('T')[0],
                time: new Date(game.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                format: game.format,
                fee: game.feeInPaise ? game.feeInPaise / 100 : 0,
                spotsTotal: game.totalSlots,
                spotsLeft: game.spotsRemaining || (game.totalSlots - (game.registrations?.length || 0)),
                players: game.registrations?.map((r: any) => ({
                  name: r.player?.name || "Player",
                  initials: r.player?.name ? r.player.name.substring(0, 2).toUpperCase() : "P",
                  pos: r.preferredPosition === "any" ? "ANY" : (r.preferredPosition || "").substring(0, 3).toUpperCase()
                })) || []
              };
              return <OrganizerEventCard key={mappedGame.id} {...mappedGame} />;
            })
          )}
        </div>
      )}

      {activeTab === 'past' && (
        <div id="orgPast">
          {loading ? (
             <p>Loading games...</p>
          ) : pastGames.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <div className="empty-title">Past games</div>
              <div className="empty-sub">Completed games with attendance and ratings will appear here.</div>
            </div>
          ) : (
             pastGames.map(game => {
               const mappedGame = {
                 id: game._id,
                 title: game.title,
                 status: game.status,
                 venue: game.turf ? `${game.turf.name}, ${game.turf.location?.city || ''}` : "Unknown Turf",
                 date: new Date(game.scheduledAt).toISOString().split('T')[0],
                 time: new Date(game.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                 format: game.format,
                 fee: game.feeInPaise ? game.feeInPaise / 100 : 0,
                 spotsTotal: game.totalSlots,
                 spotsLeft: 0,
                 players: []
               };
               return <OrganizerEventCard key={mappedGame.id} {...mappedGame} />;
             })
          )}
        </div>
      )}

      {showCreateModal && (
        <CreateEventModal 
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateEvent}
          onSuccess={() => {
            fetchGames();
          }}
        />
      )}
    </div>
  );
}