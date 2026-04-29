"use client";

import React, { useState } from "react";
import { getAuthHeaders } from "@/utils/api";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000").replace(/\/api\/v1\/?$/, "");

interface PlayerData {
  _id?: string;
  name?: string;
  phone?: string;
  email?: string;
  profileImage?: string;
  rating?: number;
  totalGamesPlayed?: number;
  noShowCount?: number;
  backoutCount?: number;
  preferences?: {
    skillLevel?: string;
    preferredFormat?: string;
    positions?: string[];
  };
}

interface Registration {
  _id?: string;
  player?: PlayerData;
  plusOneName?: string | null;
  preferredPosition?: string;
  teamPreference?: string;
  signedUpAt?: string;
  paymentStatus?: string;
  amountPaidPaise?: number;
}

interface WaitlistEntry {
  _id?: string;
  player?: PlayerData;
  joinedAt?: string;
  status?: string;
  preferredPosition?: string;
  teamPreference?: string;
}

interface PlayerDetailsModalProps {
  gameId: string;
  gameName: string;
  players: Registration[];
  waitlist?: WaitlistEntry[];
  totalSlots: number;
  onClose: () => void;
  organiserIsPlaying?: boolean;
  onToggleOrganiserPlaying?: () => void;
  onRemoveRegistration?: (regId: string) => Promise<void>;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const POS_LABEL: Record<string, string> = {
  goalkeeper: "GK", defender: "DEF", midfielder: "MID", forward: "FWD", any: "ANY",
};

function posLabel(raw?: string) {
  if (!raw) return null;
  return POS_LABEL[raw.toLowerCase()] ?? raw.toUpperCase();
}

function teamInfo(raw?: string): { label: string; cls: string } | null {
  if (!raw || raw === "none") return null;
  if (raw === "red")  return { label: "Red Team",  cls: "pdm-team-red" };
  if (raw === "blue") return { label: "Blue Team", cls: "pdm-team-blue" };
  return null;
}

function fmtDate(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function initials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function avatarUrl(profileImage?: string) {
  if (!profileImage) return null;
  if (profileImage.startsWith("http")) return profileImage;
  return `${API_BASE_URL}${profileImage}`;
}

function mapPosition(pos?: string) {
  if (!pos) return "Any";
  const p = pos.toLowerCase();
  if (p.includes("goal")) return "G";
  if (p.includes("def"))  return "D";
  if (p.includes("mid"))  return "M";
  if (p.includes("for"))  return "F";
  return "Any";
}

const SKILL_CFG: Record<string, { color: string; bg: string; label: string }> = {
  beginner:     { color: "#4ade80", bg: "rgba(74,222,128,0.12)",  label: "Beginner" },
  intermediate: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  label: "Intermediate" },
  advanced:     { color: "#f87171", bg: "rgba(248,113,113,0.12)", label: "Advanced" },
};

const PAYMENT_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  paid:          { label: "Paid",     bg: "rgba(74,222,128,0.12)",  color: "#4ade80" },
  wallet_locked: { label: "Locked",   bg: "rgba(167,139,250,0.12)", color: "#a78bfa" },
  pending:       { label: "Pending",  bg: "rgba(245,158,11,0.12)",  color: "#f59e0b" },
  refunded:      { label: "Refunded", bg: "rgba(96,165,250,0.12)",  color: "#60a5fa" },
  forfeited:     { label: "Forfeited",bg: "rgba(248,113,113,0.12)", color: "#f87171" },
};

function PaymentBadge({ status, amountPaise }: { status?: string; amountPaise?: number }) {
  if (!status) return null;
  const cfg = PAYMENT_BADGE[status];
  if (!cfg) return null;
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}44`,
      borderRadius: 4, padding: "2px 7px",
      fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      {cfg.label}
      {amountPaise != null && amountPaise > 0 && <span style={{ opacity: 0.8 }}>₹{amountPaise / 100}</span>}
    </span>
  );
}

// ── Player Profile Side Panel ─────────────────────────────────────────────────
function PlayerProfilePanel({ reg, onClose }: { reg: Registration; onClose: () => void }) {
  const p = reg.player;
  const isGuest = !!reg.plusOneName;
  const name = reg.plusOneName ?? p?.name ?? "Unknown";
  const imgUrl = !isGuest ? avatarUrl(p?.profileImage) : null;
  const skill = p?.preferences?.skillLevel;
  const skillCfg = skill ? (SKILL_CFG[skill] ?? null) : null;
  const positions = p?.preferences?.positions ?? [];
  const team = teamInfo(reg.teamPreference);

  return (
    <div className="pdm-profile-panel">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#555" }}>
          Player Profile
        </span>
        <button
          onClick={onClose}
          style={{
            width: 28, height: 28, borderRadius: 6,
            background: "rgba(255,255,255,0.05)", border: "1px solid #2a2a2a",
            color: "#888", fontSize: 14, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >✕</button>
      </div>

      {/* Hero */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 0", borderBottom: "1px solid #1e1e1e" }}>
        <div style={{
          width: 80, height: 80, borderRadius: "50%", overflow: "hidden",
          flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: isGuest ? "#1a1a1a" : "linear-gradient(135deg, #ff5c3e, #ff8b5c)",
          color: "#000", fontSize: 26, fontWeight: 800,
          border: "2px solid #2a2a2a",
        }}>
          {imgUrl
            ? <img src={imgUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ color: isGuest ? "#555" : "#000" }}>{initials(name)}</span>
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 6, lineHeight: 1.2 }}>{name}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {isGuest ? (
              <span style={{ fontSize: 11, background: "#222", color: "#777", border: "1px solid #333", borderRadius: 4, padding: "2px 8px", fontWeight: 600 }}>Guest</span>
            ) : (
              <span style={{ fontSize: 11, background: "rgba(255,92,62,0.12)", color: "#ff7a5c", border: "1px solid rgba(255,92,62,0.3)", borderRadius: 4, padding: "2px 8px", fontWeight: 600 }}>Player</span>
            )}
            {skillCfg && (
              <span style={{ fontSize: 11, background: skillCfg.bg, color: skillCfg.color, border: `1px solid ${skillCfg.color}44`, borderRadius: 4, padding: "2px 8px", fontWeight: 700 }}>
                {skillCfg.label}
              </span>
            )}
            {team && (
              <span className={`pdm-team-tag ${team.cls}`}>{team.label}</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      {!isGuest && (p?.totalGamesPlayed != null || p?.rating != null || p?.noShowCount != null || p?.backoutCount != null) && (
        <div style={{ borderBottom: "1px solid #1e1e1e", paddingBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#555", marginBottom: 10 }}>Stats</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {([
              { val: p?.totalGamesPlayed, label: "Games",    color: "#fff" },
              { val: p?.rating != null ? p.rating.toFixed(1) : null, label: "Rating", color: "#fbbf24" },
              { val: p?.noShowCount,  label: "No-shows", color: (p?.noShowCount ?? 0) > 0 ? "#f87171" : "#4ade80" },
              { val: p?.backoutCount, label: "Backouts",  color: (p?.backoutCount ?? 0) > 0 ? "#f87171" : "#4ade80" },
            ] as { val: any; label: string; color: string }[]).map(({ val, label, color }) =>
              val != null ? (
                <div key={label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1e1e1e", borderRadius: 8, padding: "10px 6px", textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>{val}</div>
                  <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Contact */}
      {!isGuest && (p?.phone || p?.email) && (
        <div style={{ borderBottom: "1px solid #1e1e1e", paddingBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#555", marginBottom: 10 }}>Contact</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {p?.phone && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#ccc" }}>
                <span style={{ fontSize: 14 }}>📞</span>
                <span>{p.phone}</span>
              </div>
            )}
            {p?.email && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#ccc" }}>
                <span style={{ fontSize: 14 }}>✉</span>
                <span style={{ wordBreak: "break-all" }}>{p.email}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Positions */}
      {(positions.length > 0 || reg.preferredPosition) && (
        <div style={{ borderBottom: "1px solid #1e1e1e", paddingBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#555", marginBottom: 10 }}>Positions</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {positions.length > 0
              ? positions.map((pos) => <span key={pos} className="pdm-pos-tag">{posLabel(pos) ?? pos}</span>)
              : reg.preferredPosition
              ? <span className="pdm-pos-tag">{posLabel(reg.preferredPosition) ?? reg.preferredPosition}</span>
              : null
            }
          </div>
        </div>
      )}

      {/* Registration info */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#555", marginBottom: 10 }}>Registration</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {reg.signedUpAt && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#888" }}>
              <span>📅</span><span>Joined {fmtDate(reg.signedUpAt)}</span>
            </div>
          )}
          {reg.paymentStatus && (
            <div>
              <PaymentBadge status={reg.paymentStatus} amountPaise={reg.amountPaidPaise} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Player Card ───────────────────────────────────────────────────────────────
function PlayerCard({
  reg, slotNum, type, isProcessing, onRemove, onView,
}: {
  reg: Registration;
  slotNum?: number;
  type: "player" | "guest";
  isProcessing?: boolean;
  onRemove?: () => void;
  onView?: () => void;
}) {
  const isGuest = type === "guest";
  const name    = isGuest ? (reg.plusOneName ?? "Guest") : (reg.player?.name ?? "Unknown");
  const imgUrl  = !isGuest ? avatarUrl(reg.player?.profileImage) : null;
  const pos     = posLabel(reg.preferredPosition);
  const team    = teamInfo(reg.teamPreference);
  const date    = fmtDate(reg.signedUpAt);

  return (
    <div
      className={`pdm-card ${isGuest ? "pdm-card-guest" : "pdm-card-player"}`}
      style={{ cursor: !isGuest ? "pointer" : "default" }}
      onClick={!isGuest ? onView : undefined}
      title={!isGuest ? "Click to view player profile" : undefined}
    >
      {slotNum !== undefined && <div className="pdm-slot-num">#{slotNum}</div>}

      {/* Avatar — shows real photo or initials */}
      <div className={`pdm-avatar ${isGuest ? "pdm-avatar-g" : "pdm-avatar-p"}`}>
        {imgUrl
          ? <img src={imgUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
          : initials(name)
        }
      </div>

      <div className="pdm-card-body">
        <div className="pdm-card-top">
          <div className="pdm-card-name">{name}</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <PaymentBadge status={reg.paymentStatus} amountPaise={reg.amountPaidPaise} />
            <span className={`pdm-type-chip ${isGuest ? "pdm-chip-guest" : "pdm-chip-player"}`}>
              {isGuest ? "Guest" : "Player"}
            </span>
          </div>
        </div>

        {!isGuest && (reg.player?.phone || reg.player?.email) && (
          <div className="pdm-card-contact">
            {reg.player?.phone && (
              <span className="pdm-contact-item"><span className="pdm-contact-icon">📞</span>{reg.player.phone}</span>
            )}
            {reg.player?.email && (
              <span className="pdm-contact-item pdm-email-item"><span className="pdm-contact-icon">✉</span>{reg.player.email}</span>
            )}
          </div>
        )}

        <div className="pdm-card-tags">
          {pos  && <span className="pdm-pos-tag">{pos}</span>}
          {team && <span className={`pdm-team-tag ${team.cls}`}>{team.label}</span>}
          {date && <span className="pdm-date-tag">{date}</span>}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {!isGuest && <span style={{ fontSize: 10, color: "#444" }}>›</span>}
        {onRemove && (
          <button
            disabled={isProcessing}
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            title={`Remove ${name}`}
            style={{
              width: 28, height: 28, borderRadius: 6,
              background: isProcessing ? "rgba(220,38,38,0.05)" : "rgba(220,38,38,0.1)",
              border: "1px solid rgba(220,38,38,0.3)",
              color: "#f87171", fontSize: 14, lineHeight: 1,
              cursor: isProcessing ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {isProcessing ? "…" : "✕"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export function PlayerDetailsModal({
  gameId,
  gameName,
  players,
  waitlist = [],
  totalSlots,
  onClose,
  organiserIsPlaying = false,
  onToggleOrganiserPlaying,
  onRemoveRegistration,
  onRefresh,
  isRefreshing = false,
}: PlayerDetailsModalProps) {
  const [teams, setTeams] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewingReg, setViewingReg] = useState<Registration | null>(null);

  const handleDistribute = async () => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/v1/games/organisers/${gameId}/distribute`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            players: players.map((p: any) => ({
              name: p.plusOneName || p.player?.name,
              rating: p.player?.rating ?? 5,
              gkQuotient: p.player?.gkQuotient ?? 0,
              position: mapPosition(p.preferredPosition),
              playWith: p.player?.playWith || [],
              playAgainst: p.player?.playAgainst || [],
            })),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) { alert(data.message || "Team generation failed"); return; }
      setTeams(data.data);
      alert("Teams created! ✅");
      onRefresh?.();
    } catch (err) {
      console.error("Error distributing teams:", err);
      alert("Something went wrong");
    }
  };

  const organiserCount = organiserIsPlaying ? 1 : 0;

  const handleCopyList = () => {
    const lines: string[] = [`${gameName} — Player List`, `${"─".repeat(40)}`];
    let num = 1;
    players.forEach((r) => {
      const name = r.plusOneName ? `${r.plusOneName} (Guest)` : (r.player?.name || "Unknown");
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
  const totalCollectedPaise = players.reduce(
    (sum, r) => sum + (["paid", "wallet_locked"].includes(r.paymentStatus ?? "") ? (r.amountPaidPaise || 0) : 0),
    0
  );

  return (
    <>
      {/* ── Main modal ── */}
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content pdm-modal" onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div className="modal-header">
            <div className="modal-title-section">
              <h2>Registered Players</h2>
              <p className="modal-subtitle">{gameName}</p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {onRefresh && (
                <button onClick={onRefresh} disabled={isRefreshing} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid #333", color: isRefreshing ? "#555" : "#ccc", padding: "6px 12px", borderRadius: 6, fontSize: 12, cursor: isRefreshing ? "not-allowed" : "pointer", fontWeight: 600 }}>
                  {isRefreshing ? "↻ Refreshing…" : "↻ Refresh"}
                </button>
              )}
              <button onClick={handleCopyList} style={{ background: copied ? "rgba(200,255,62,0.15)" : "rgba(255,255,255,0.06)", border: `1px solid ${copied ? "rgba(200,255,62,0.4)" : "#333"}`, color: copied ? "#c8ff3e" : "#ccc", padding: "6px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                {copied ? "✓ Copied!" : "📋 Copy"}
              </button>
              <button onClick={handleDistribute} style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", color: "#3b82f6", padding: "6px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                ⚽ Distribute
              </button>
              <button className="close-btn" onClick={onClose}>✕</button>
            </div>
          </div>

          {/* Stats Strip */}
          <div className="pdm-stats-strip">
            <div className="pdm-stat"><span className="pdm-stat-val">{players.length}</span><span className="pdm-stat-lbl">Registered</span></div>
            <div className="pdm-stat-div" />
            <div className="pdm-stat"><span className="pdm-stat-val">{mainRegs.length}</span><span className="pdm-stat-lbl">Players</span></div>
            <div className="pdm-stat-div" />
            <div className="pdm-stat"><span className="pdm-stat-val">{guestRegs.length}</span><span className="pdm-stat-lbl">Guests</span></div>
            <div className="pdm-stat-div" />
            <div className="pdm-stat"><span className="pdm-stat-val">{totalSlots}</span><span className="pdm-stat-lbl">Slots</span></div>
            <div className="pdm-stat-div" />
            <div className="pdm-stat">
              <span className="pdm-stat-val" style={{ color: spotsLeft === 0 ? "var(--coral)" : "#4ade80" }}>{spotsLeft}</span>
              <span className="pdm-stat-lbl">Available</span>
            </div>
            {waitlist.length > 0 && (
              <><div className="pdm-stat-div" />
              <div className="pdm-stat"><span className="pdm-stat-val" style={{ color: "#f59e0b" }}>{waitlist.length}</span><span className="pdm-stat-lbl">Waitlist</span></div></>
            )}
            {totalCollectedPaise > 0 && (
              <><div className="pdm-stat-div" />
              <div className="pdm-stat"><span className="pdm-stat-val" style={{ color: "#4ade80", fontSize: 13 }}>₹{totalCollectedPaise / 100}</span><span className="pdm-stat-lbl">Collected</span></div></>
            )}
          </div>

          {/* Player cards */}
          <div className="pdm-cards-scroll">
            {players.length === 0 && !organiserIsPlaying ? (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <p>No players registered yet</p>
              </div>
            ) : (
              <div className="pdm-cards-list">
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
                        <span className="pdm-pos-tag" style={{ background: "rgba(200,255,62,0.12)", color: "#c8ff3e", border: "1px solid rgba(200,255,62,0.3)" }}>⚽ Playing</span>
                      </div>
                    </div>
                    {onToggleOrganiserPlaying && (
                      <button className="pdm-organiser-edit-btn" onClick={onToggleOrganiserPlaying} title="Withdraw from game">✎ Edit</button>
                    )}
                  </div>
                )}

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
                      onView={!reg.plusOneName ? () => setViewingReg(reg) : undefined}
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

          {/* Waitlist */}
          {waitlist.length > 0 && (
            <div style={{ padding: "0 20px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0 8px 0", borderTop: "1px solid #222" }}>
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#f59e0b" }}>
                  📋 Waitlist ({waitlist.length})
                </span>
                <span style={{ fontSize: 11, color: "#888", fontStyle: "italic" }}>— auto-notified when a slot opens</span>
              </div>
              <div className="pdm-cards-list">
                {waitlist.map((entry, idx) => {
                  const wId   = entry._id || "";
                  const imgUrl = avatarUrl(entry.player?.profileImage);
                  return (
                    <div
                      key={wId || idx}
                      className="pdm-card pdm-card-player"
                      style={{ borderLeft: "3px solid #f59e0b", opacity: 0.9, cursor: "pointer" }}
                      onClick={() => {
                        if (entry.player) {
                          setViewingReg({ _id: wId, player: entry.player, preferredPosition: entry.preferredPosition, signedUpAt: entry.joinedAt });
                        }
                      }}
                    >
                      <div className="pdm-slot-num" style={{ color: "#f59e0b" }}>#{idx + 1}</div>
                      <div className="pdm-avatar" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)", overflow: "hidden" }}>
                        {imgUrl
                          ? <img src={imgUrl} alt={entry.player?.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                          : initials(entry.player?.name)
                        }
                      </div>
                      <div className="pdm-card-body">
                        <div className="pdm-card-top">
                          <div className="pdm-card-name">{entry.player?.name || "Unknown"}</div>
                          <span className="pdm-type-chip" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}>Waiting</span>
                        </div>
                        {(entry.player?.phone || entry.player?.email) && (
                          <div className="pdm-card-contact">
                            {entry.player?.phone && <span className="pdm-contact-item"><span className="pdm-contact-icon">📞</span>{entry.player.phone}</span>}
                            {entry.player?.email && <span className="pdm-contact-item pdm-email-item"><span className="pdm-contact-icon">✉</span>{entry.player.email}</span>}
                          </div>
                        )}
                        <div className="pdm-card-tags">
                          {entry.preferredPosition && entry.preferredPosition !== "any" && <span className="pdm-pos-tag">{posLabel(entry.preferredPosition)}</span>}
                          {entry.joinedAt && <span className="pdm-date-tag">Joined {fmtDate(entry.joinedAt)}</span>}
                        </div>
                      </div>
                      <span style={{ fontSize: 14, color: "#555", alignSelf: "center" }}>›</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Teams result */}
          {teams && (
            <div style={{ padding: "16px 20px", borderTop: "1px solid #222" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#ccc", marginBottom: 12 }}>⚽ Generated Teams</div>
              <div style={{ display: "flex", gap: 24 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Red Team</div>
                  {teams?.teamA?.map((p: any, i: number) => <div key={i} style={{ fontSize: 13, color: "#ccc", padding: "3px 0" }}>{p.name || p}</div>)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#3b82f6", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Blue Team</div>
                  {teams?.teamB?.map((p: any, i: number) => <div key={i} style={{ fontSize: 13, color: "#ccc", padding: "3px 0" }}>{p.name || p}</div>)}
                </div>
              </div>
            </div>
          )}

          <div className="modal-footer">
            <button className="btn-close" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>

      {/* ── Player profile side panel — rendered OUTSIDE modal, position:fixed ── */}
      {viewingReg && (
        <div className="pdm-profile-screen-overlay" onClick={() => setViewingReg(null)}>
          <div className="pdm-profile-side-panel" onClick={(e) => e.stopPropagation()}>
            <PlayerProfilePanel reg={viewingReg} onClose={() => setViewingReg(null)} />
          </div>
        </div>
      )}
    </>
  );
}
