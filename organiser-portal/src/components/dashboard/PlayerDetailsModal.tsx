"use client";

import React, { useState } from "react";

interface Registration {
  _id?: string;
  player?: { _id?: string; name?: string; phone?: string; email?: string };
  plusOneName?: string | null;
  preferredPosition?: string;
  teamPreference?: string;
  signedUpAt?: string;
  paymentStatus?: string;
}

interface WaitlistEntry {
  _id?: string;
  player?: { _id?: string; name?: string; phone?: string; email?: string };
  joinedAt?: string;
  status?: string;
  preferredPosition?: string;
  teamPreference?: string;
}

interface PlayerDetailsModalProps {
  gameName: string;
  players: Registration[];
  waitlist?: WaitlistEntry[];
  totalSlots: number;
  onClose: () => void;
  organiserIsPlaying?: boolean;
  onToggleOrganiserPlaying?: () => void;
  onRemoveRegistration?: (regId: string) => Promise<void>;
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
  waitlist = [],
  totalSlots,
  onClose,
  organiserIsPlaying = false,
  onToggleOrganiserPlaying,
  onRemoveRegistration,
}: PlayerDetailsModalProps) {
  const [copied, setCopied]           = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  // totalSlots is the hard cap (includes organiser slot when organiserIsPlaying)
  const organiserCount = organiserIsPlaying ? 1 : 0;

  const handleCopyList = () => {
    const lines: string[] = [`${gameName} — Player List`, `${"─".repeat(40)}`];
    let num = 1;
    players.forEach((r) => {
      const name = r.plusOneName
        ? `${r.plusOneName} (Guest)`
        : (r.player?.name || "Unknown");
      const pos = posLabel(r.preferredPosition);
      lines.push(`${num}. ${name}${pos ? ` [${pos}]` : ""}`);
      num++;
    });
    lines.push(`${"─".repeat(40)}`);
    lines.push(`Total: ${players.length} / ${totalSlots}`);
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const mainRegs  = players.filter((r) => !r.plusOneName);
  const guestRegs = players.filter((r) => !!r.plusOneName);
  const spotsLeft = Math.max(0, totalSlots - players.length - organiserCount);

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
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={handleCopyList}
              style={{
                background: copied ? "rgba(200,255,62,0.15)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${copied ? "rgba(200,255,62,0.4)" : "#333"}`,
                color: copied ? "#c8ff3e" : "#ccc",
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 12,
                cursor: "pointer",
                fontWeight: 600,
                transition: "all 0.2s",
              }}
              title="Copy player list to clipboard"
            >
              {copied ? "✓ Copied!" : "📋 Copy List"}
            </button>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
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
          {waitlist.length > 0 && (
            <>
              <div className="pdm-stat-div" />
              <div className="pdm-stat">
                <span className="pdm-stat-val" style={{ color: "#f59e0b" }}>{waitlist.length}</span>
                <span className="pdm-stat-lbl">Waitlist</span>
              </div>
            </>
          )}
        </div>

        {/* ── Registered Players ── */}
        <div className="pdm-cards-scroll">
          {players.length === 0 && !organiserIsPlaying ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <p>No players registered yet</p>
            </div>
          ) : (
            <div className="pdm-cards-list">

              {/* Organiser card (if playing) */}
              {organiserIsPlaying && (
                <div className="pdm-card pdm-card-organiser">
                  <div className="pdm-slot-num">#1</div>
                  <div className="pdm-avatar pdm-avatar-o">YOU</div>
                  <div className="pdm-card-body">
                    <div className="pdm-card-top">
                      <div className="pdm-card-name">You (Organiser)</div>
                      <span className="pdm-type-chip pdm-chip-organiser">Organiser</span>
                    </div>
                    <div className="pdm-card-tags">
                      <span className="pdm-pos-tag" style={{ background: "rgba(200,255,62,0.12)", color: "#c8ff3e", border: "1px solid rgba(200,255,62,0.3)" }}>
                        ⚽ Playing
                      </span>
                    </div>
                  </div>
                  {onToggleOrganiserPlaying && (
                    <button className="pdm-organiser-edit-btn" onClick={onToggleOrganiserPlaying} title="Withdraw from game">
                      ✎ Edit
                    </button>
                  )}
                </div>
              )}

              {/* All registrations — flat numbered list */}
              {players.map((reg, idx) => {
                const slotNum = organiserCount + idx + 1;
                const regId   = reg._id || "";
                return (
                  <PlayerCard
                    key={regId || idx}
                    reg={reg}
                    slotNum={slotNum}
                    type={reg.plusOneName ? "guest" : "player"}
                    isProcessing={processingId === regId}
                    onRemove={
                      onRemoveRegistration && regId
                        ? async () => {
                            if (!window.confirm(`Remove ${reg.plusOneName || reg.player?.name || "this player"} from the game?`)) return;
                            setProcessingId(regId);
                            await onRemoveRegistration(regId);
                            setProcessingId(null);
                          }
                        : undefined
                    }
                  />
                );
              })}

            </div>
          )}
        </div>

        {/* Waitlist Section — informational only, auto-notified when a slot opens */}
        {waitlist.length > 0 && (
          <div style={{ margin: "0 0 16px 0" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 0 8px 0", borderTop: "1px solid #222", marginTop: 8,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#f59e0b" }}>
                📋 Waitlist ({waitlist.length})
              </span>
              <span style={{ fontSize: 11, color: "#888", fontStyle: "italic" }}>
                — auto-notified by email when a slot opens
              </span>
            </div>
            <div className="pdm-cards-list">
              {waitlist.map((entry, idx) => {
                const wId = entry._id || "";
                return (
                  <div key={wId || idx} className="pdm-card pdm-card-player" style={{ borderLeft: "3px solid #f59e0b", opacity: 0.9 }}>
                    <div className="pdm-slot-num" style={{ color: "#f59e0b" }}>#{idx + 1}</div>
                    <div className="pdm-avatar pdm-avatar-p" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
                      {initials(entry.player?.name)}
                    </div>
                    <div className="pdm-card-body">
                      <div className="pdm-card-top">
                        <div className="pdm-card-name">{entry.player?.name || "Unknown"}</div>
                        <span className="pdm-type-chip" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}>
                          Waiting
                        </span>
                      </div>
                      {(entry.player?.phone || entry.player?.email) && (
                        <div className="pdm-card-contact">
                          {entry.player?.phone && (
                            <span className="pdm-contact-item"><span className="pdm-contact-icon">📞</span>{entry.player.phone}</span>
                          )}
                          {entry.player?.email && (
                            <span className="pdm-contact-item pdm-email-item"><span className="pdm-contact-icon">✉</span>{entry.player.email}</span>
                          )}
                        </div>
                      )}
                      <div className="pdm-card-tags">
                        {entry.preferredPosition && entry.preferredPosition !== "any" && (
                          <span className="pdm-pos-tag">{posLabel(entry.preferredPosition)}</span>
                        )}
                        {entry.joinedAt && <span className="pdm-date-tag">Joined {fmtDate(entry.joinedAt)}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
  slotNum,
  type,
  isProcessing,
  onRemove,
}: {
  reg: Registration;
  slotNum?: number;
  type: "player" | "guest";
  isProcessing?: boolean;
  onRemove?: () => void;
}) {
  const isGuest = type === "guest";
  const name    = isGuest ? (reg.plusOneName ?? "Guest") : (reg.player?.name ?? "Unknown");
  const pos     = posLabel(reg.preferredPosition);
  const team    = teamInfo(reg.teamPreference);
  const date    = fmtDate(reg.signedUpAt);

  return (
    <div className={`pdm-card ${isGuest ? "pdm-card-guest" : "pdm-card-player"}`}>
      {slotNum !== undefined && <div className="pdm-slot-num">#{slotNum}</div>}

      <div className={`pdm-avatar ${isGuest ? "pdm-avatar-g" : "pdm-avatar-p"}`}>
        {initials(name)}
      </div>

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
          {pos  && <span className="pdm-pos-tag">{pos}</span>}
          {team && <span className={`pdm-team-tag ${team.cls}`}>{team.label}</span>}
          {date && <span className="pdm-date-tag">{date}</span>}
        </div>
      </div>

      {/* Remove button — visible for every slot */}
      {onRemove && (
        <button
          disabled={isProcessing}
          onClick={onRemove}
          title={`Remove ${name}`}
          style={{
            flexShrink: 0,
            alignSelf: "center",
            width: 28,
            height: 28,
            borderRadius: 6,
            background: isProcessing ? "rgba(220,38,38,0.05)" : "rgba(220,38,38,0.1)",
            border: "1px solid rgba(220,38,38,0.3)",
            color: "#f87171",
            fontSize: 14,
            lineHeight: 1,
            cursor: isProcessing ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isProcessing ? "…" : "✕"}
        </button>
      )}
    </div>
  );
}
