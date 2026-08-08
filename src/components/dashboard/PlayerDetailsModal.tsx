"use client";

import React from "react";

interface Player {
  _id: string;
  name: string;
  phone: string;
  email: string;
  preferredPosition?: string;
  registeredAt?: string;
}

interface PlayerDetailsModalProps {
  gameName: string;
  players: any[];
  totalSlots: number;
  spotsRemaining?: number;
  onClose: () => void;
}

export function PlayerDetailsModal({ gameName, players, totalSlots, spotsRemaining, onClose }: PlayerDetailsModalProps) {
  const activePlayers = (players || []).filter(
    (p: any) => !p.backedOutAt && !p.removedAt && !p.optedOut && !['refunded', 'forfeited'].includes(p.paymentStatus || '')
  );
  const spotsLeft = typeof spotsRemaining === 'number' ? spotsRemaining : totalSlots - activePlayers.length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content player-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-section">
            <h2>Registered Players</h2>
            <p className="modal-subtitle">{gameName}</p>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="players-stats">
          <div className="stat-box">
            <div className="stat-number">{activePlayers.length}</div>
            <div className="stat-name">Registered</div>
          </div>
          <div className="stat-box">
            <div className="stat-number">{totalSlots}</div>
            <div className="stat-name">Total Slots</div>
          </div>
          <div className="stat-box">
            <div className="stat-number">{spotsLeft}</div>
            <div className="stat-name">Available</div>
          </div>
        </div>

        <div className="players-table">
          {!players || players.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <p>No players registered yet</p>
            </div>
          ) : (
            <>
              <div className="table-header-row">
                <div className="col-name">Player Name</div>
                <div className="col-phone">Phone</div>
                <div className="col-email">Email</div>
                <div className="col-position">Position</div>
                <div className="col-status">Status</div>
              </div>

              <div className="table-body">
                {players.map((reg, idx) => (
                  <div key={idx} className="table-row">
                    <div className="col-name">
                      <div className="player-avatar">{reg.player?.name?.substring(0, 2).toUpperCase()}</div>
                      <span>{reg.player?.name || 'Unknown'}</span>
                    </div>
                    <div className="col-phone">{reg.player?.phone || '-'}</div>
                    <div className="col-email">{reg.player?.email || '-'}</div>
                    <div className="col-position">
                      <span className="position-badge">
                        {reg.preferredPosition === 'any' ? 'ANY' : (reg.preferredPosition || 'Not specified')}
                      </span>
                    </div>
                    <div className="col-status">
                      <span className="status-badge confirmed">✓ Confirmed</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-close" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
