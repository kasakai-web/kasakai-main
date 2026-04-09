"use client";

import React from "react";

interface Registration {
  _id?: string;
  player?: { _id?: string; name?: string; phone?: string; email?: string };
  plusOneName?: string | null;
  preferredPosition?: string;
  teamPreference?: string;
  signedUpAt?: string;
  paymentStatus?: string;
}

interface PlayerDetailsModalProps {
  gameName: string;
  players: Registration[];
  totalSlots: number;
  onClose: () => void;
}

const POS_LABEL: Record<string, string> = {
  goalkeeper: "GK",
  defender: "DEF",
  midfielder: "MID",
  forward: "FWD",
  any: "ANY",
};

function posLabel(raw?: string) {
  if (!raw) return null;
  return POS_LABEL[raw.toLowerCase()] ?? raw.toUpperCase();
}

function teamInfo(raw?: string): { label: string; cls: string } | null {
  if (!raw || raw === "none") return null;
  if (raw === "red") return { label: "Red Team", cls: "pdm-team-red" };
  if (raw === "blue") return { label: "Blue Team", cls: "pdm-team-blue" };
  return null;
}

function fmtDate(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function initials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

export function PlayerDetailsModal({
  gameName,
  players,
  totalSlots,
  onClose,
}: PlayerDetailsModalProps) {
  const mainRegs = players.filter((r) => !r.plusOneName);
  const guestRegs = players.filter((r) => !!r.plusOneName);
  const spotsLeft = Math.max(0, totalSlots - players.length);

  type Group = { main: Registration; guests: Registration[] };
  const groups: Group[] = mainRegs.map((main) => ({
    main,
    guests: guestRegs.filter(
      (g) =>
        (g.player?._id || g.player) === (main.player?._id || main.player)
    ),
  }));

  const orphanGuests = guestRegs.filter(
    (g) =>
      !mainRegs.some(
        (m) => (m.player?._id || m.player) === (g.player?._id || g.player)
      )
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content pdm-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-section">
            <h2>Registered Players</h2>
            <p className="modal-subtitle">{gameName}</p>
          </div>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Stats Strip */}
        <div className="pdm-stats-strip">
          <div className="pdm-stat">
            <span className="pdm-stat-val">{players.length}</span>
            <span className="pdm-stat-lbl">Registered</span>
          </div>
          <div className="pdm-stat-div" />
          <div className="pdm-stat">
            <span className="pdm-stat-val">{mainRegs.length}</span>
            <span className="pdm-stat-lbl">Players</span>
          </div>
          <div className="pdm-stat-div" />
          <div className="pdm-stat">
            <span className="pdm-stat-val">{guestRegs.length}</span>
            <span className="pdm-stat-lbl">Guests</span>
          </div>
          <div className="pdm-stat-div" />
          <div className="pdm-stat">
            <span className="pdm-stat-val">{totalSlots}</span>
            <span className="pdm-stat-lbl">Total Slots</span>
          </div>
          <div className="pdm-stat-div" />
          <div className="pdm-stat">
            <span
              className="pdm-stat-val"
              style={{ color: spotsLeft === 0 ? "var(--coral)" : "#4ade80" }}
            >
              {spotsLeft}
            </span>
            <span className="pdm-stat-lbl">Available</span>
          </div>
        </div>

        {/* Cards */}
        <div className="pdm-cards-scroll">
          {players.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <p>No players registered yet</p>
            </div>
          ) : (
            <div className="pdm-cards-list">
              {groups.map((group, gi) => (
                <div key={gi} className="pdm-group">
                  {/* Main player card */}
                  <PlayerCard reg={group.main} type="player" />

                  {/* Guest cards */}
                  {group.guests.length > 0 && (
                    <div className="pdm-guest-group">
                      {group.guests.map((guest, gi2) => (
                        <PlayerCard key={gi2} reg={guest} type="guest" />
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {orphanGuests.map((guest, idx) => (
                <PlayerCard key={`orphan-${idx}`} reg={guest} type="guest" />
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function PlayerCard({
  reg,
  type,
}: {
  reg: Registration;
  type: "player" | "guest";
}) {
  const isGuest = type === "guest";
  const name = isGuest
    ? reg.plusOneName ?? "Guest"
    : reg.player?.name ?? "Unknown";
  const pos = posLabel(reg.preferredPosition);
  const team = teamInfo(reg.teamPreference);
  const date = fmtDate(reg.signedUpAt);

  return (
    <div className={`pdm-card ${isGuest ? "pdm-card-guest" : "pdm-card-player"}`}>
      {/* Avatar */}
      <div className={`pdm-avatar ${isGuest ? "pdm-avatar-g" : "pdm-avatar-p"}`}>
        {initials(name)}
      </div>

      {/* Main info */}
      <div className="pdm-card-body">
        <div className="pdm-card-top">
          <div className="pdm-card-name">{name}</div>
          <span className={`pdm-type-chip ${isGuest ? "pdm-chip-guest" : "pdm-chip-player"}`}>
            {isGuest ? "Guest" : "Player"}
          </span>
        </div>

        {!isGuest && (reg.player?.phone || reg.player?.email) && (
          <div className="pdm-card-contact">
            {reg.player?.phone && (
              <span className="pdm-contact-item">
                <span className="pdm-contact-icon">📞</span>
                {reg.player.phone}
              </span>
            )}
            {reg.player?.email && (
              <span className="pdm-contact-item pdm-email-item">
                <span className="pdm-contact-icon">✉</span>
                {reg.player.email}
              </span>
            )}
          </div>
        )}

        <div className="pdm-card-tags">
          {pos && <span className="pdm-pos-tag">{pos}</span>}
          {team && (
            <span className={`pdm-team-tag ${team.cls}`}>{team.label}</span>
          )}
          {date && <span className="pdm-date-tag">{date}</span>}
        </div>
      </div>
    </div>
  );
}
