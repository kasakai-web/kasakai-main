"use client";

import React, { useState } from "react";
import { EventStatus } from "./EventCard";
import { buildApiUrl } from "@/utils/api";

export interface OrganizerEventCardProps {
  id: number | string;
  title: string;
  venue: string;
  status: EventStatus | string;
  date: string;
  time: string;
  format: string;
  fee: number;
  spotsTotal: number;
  spotsLeft: number;
  players: { name: string; initials: string; pos: string }[];
}

export function OrganizerEventCard({
  id,
  title,
  venue,
  status,
  date,
  time,
  format,
  fee,
  spotsTotal,
  spotsLeft,
  players
}: OrganizerEventCardProps) {
  const [showPlayers, setShowPlayers] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCancelEvent = async () => {
    const confirmCancel = window.confirm(
      `Are you sure you want to cancel "${title}"?\n\nThis action cannot be undone and will permanently remove the event from the database.`
    );

    if (!confirmCancel) return;

    setIsDeleting(true);
    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch(buildApiUrl(`/api/v1/games/organisers/${id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        alert('Event cancelled and removed successfully!');
        // Refresh the page to update the games list
        window.location.reload();
      } else {
        alert(`Failed to cancel event: ${data.message}`);
      }
    } catch (error) {
      console.error('Error cancelling event:', error);
      alert('Failed to cancel event. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const currentPlayers = spotsTotal - spotsLeft;
  const fillPercentage = (currentPlayers / spotsTotal) * 100;
  const collected = currentPlayers * fee;

  return (
    <div className={`org-game-card ${status}`} style={{ marginBottom: "1px", position: "relative", border: "1px solid var(--border)", background: "var(--grey)" }}>
      {/* Accent border left based on status */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", background: status === 'confirmed' ? 'var(--lime)' : 'var(--amber)' }}></div>
      
      <div className="org-game-top" style={{ padding: "18px 20px 14px 24px", display: "flex", justifyContent: "space-between", gap: "16px" }}>
        <div className="org-game-left">
          <div style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--muted)", marginBottom: "4px", textTransform: "uppercase" }}>{title}</div>
          <div className="org-game-venue" style={{ fontFamily: "var(--cond)", fontSize: "22px", fontWeight: 800, letterSpacing: ".04em", color: "var(--white)", marginBottom: "4px" }}>
            {venue}
          </div>
          <div className="org-game-meta" style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontFamily: "var(--mono)", fontSize: "11px", color: "var(--muted)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span>📅</span>{date}</div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span>🕗</span>{time}</div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span>👥</span>{format}</div>
          </div>
        </div>
        <div className="org-game-right" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
          <span className={`org-status ${status}`} style={{ fontFamily: "var(--mono)", fontSize: "9px", letterSpacing: ".18em", textTransform: "uppercase", padding: "4px 10px", background: status === 'confirmed' ? 'var(--lime)' : 'var(--amber)', color: '#000' }}>
            {status}
          </span>
          <span className="org-price" style={{ fontFamily: "var(--cond)", fontSize: "24px", fontWeight: 900, color: "var(--white)" }}>₹{fee}</span>
        </div>
      </div>

      <div className="org-player-bar" style={{ padding: "0 24px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
        <div className="opb-track" style={{ flex: 1, height: "4px", background: "var(--border)", overflow: "hidden" }}>
          <div className="opb-fill" style={{ height: "100%", transition: "width .5s", background: status === 'confirmed' ? 'var(--lime)' : 'var(--amber)', width: `${fillPercentage}%` }}></div>
        </div>
        <span className="opb-text" style={{ fontFamily: "var(--mono)", fontSize: "10.5px", color: "var(--muted)", whiteSpace: "nowrap" }}>
          {currentPlayers} / {spotsTotal} players · ₹{collected} collected
        </span>
      </div>

      <div className="org-controls" style={{ display: "flex", gap: "0", borderTop: "1px solid var(--border)" }}>
        <button className="org-ctrl" style={{ flex: 1, padding: "12px 10px", fontFamily: "var(--body)", fontSize: "11.5px", fontWeight: 600, border: "none", borderRight: "1px solid var(--border)", cursor: "pointer", background: "none", color: "var(--muted)" }} onClick={() => setShowPlayers(!showPlayers)}>
          👥 Players ({currentPlayers})
        </button>
        <button className="org-ctrl" style={{ flex: 1, padding: "12px 10px", fontFamily: "var(--body)", fontSize: "11.5px", fontWeight: 600, border: "none", borderRight: "1px solid var(--border)", cursor: "pointer", background: "none", color: "var(--muted)" }}>
          📣 Nudge
        </button>
        <button className="org-ctrl danger" 
          onClick={handleCancelEvent}
          disabled={isDeleting}
          style={{ 
            flex: 1, 
            padding: "12px 10px", 
            fontFamily: "var(--body)", 
            fontSize: "11.5px", 
            fontWeight: 600, 
            border: "none", 
            cursor: isDeleting ? "not-allowed" : "pointer", 
            background: "none", 
            color: "var(--coral)",
            opacity: isDeleting ? 0.6 : 1
          }}>
          {isDeleting ? 'Cancelling...' : '✕ Cancel'}
        </button>
      </div>

      {showPlayers && (
        <div className="players-panel open">
          <div style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--muted)", marginBottom: "8px", textTransform: "uppercase" }}>Registered Players:</div>
          <div className="players-grid">
            {players.map((p, i) => (
              <div key={i} className="player-chip">
                <div className="pc-avatar">{p.initials}</div>
                <div>
                  <div className="pc-name">{p.name}</div>
                  <div className="pc-pos">{p.pos}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
