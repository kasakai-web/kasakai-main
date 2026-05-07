"use client";

import React, { useRef, useState } from "react";

import { buildApiUrl, getAuthHeaders } from "@/utils/api";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

const IMG_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1").replace(/\/api\/v1\/?$/, "");

interface Registration {
  _id?: string;
  player?: { _id?: string; name?: string; phone?: string; email?: string; profileImage?: string };
  plusOneName?: string | null;
  preferredPosition?: string;
  teamPreference?: string;
  signedUpAt?: string;
  paymentStatus?: string;
  amountPaidPaise?: number;
}

interface WaitlistEntry {
  _id?: string;
  player?: { _id?: string; name?: string; phone?: string; email?: string };
  joinedAt?: string;
  notifiedAt?: string;
  status?: string;
  preferredPosition?: string;
  teamPreference?: string;
}

interface GuestWaitlistEntry {
  _id?: string;
  player?: { _id?: string; name?: string };
  plusOneName?: string;
  requestedAt?: string;
  notifiedAt?: string;
  status?: string;
}

interface PlayerDetailsModalProps {
  gameId: string;
  gameName: string;
  players: Registration[];
  waitlist?: WaitlistEntry[];
  guestWaitlist?: GuestWaitlistEntry[];
  totalSlots: number;
  onClose: () => void;
  organiserIsPlaying?: boolean;
  onToggleOrganiserPlaying?: () => void;
  onRemoveRegistration?: (regId: string) => Promise<void>;
  onRefresh?: () => void;
  isRefreshing?: boolean;
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

function mapPosition(pos?: string) {
  if (!pos) return "Any";

  const p = pos.toLowerCase();

  if (p.includes("goal")) return "G";
  if (p.includes("def")) return "D";
  if (p.includes("mid")) return "M";
  if (p.includes("for")) return "F";

  return "Any";
}

export function PlayerDetailsModal({
  gameId,
  gameName,
  players,
  waitlist = [],
  guestWaitlist = [],
  totalSlots,
  onClose,
  organiserIsPlaying = false,
  onToggleOrganiserPlaying,
  onRemoveRegistration,
  onRefresh,
  isRefreshing = false,
}: PlayerDetailsModalProps) {

  const [teams, setTeams] = useState<any>(null);
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingPlayerId, setAddingPlayerId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const showStatus = (type: "success" | "error", text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 3500);
  };

  const approveWaitlistEntry = async (waitlistId: string) => {
    setApprovingId(waitlistId);
    try {
      const res = await fetch(buildApiUrl(`/api/v1/games/organisers/${gameId}/waitlist/${waitlistId}/approve`), {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showStatus("error", data.message || "Failed to approve player.");
        return;
      }
      showStatus("success", "Player approved — they'll be notified when a slot opens.");
      onRefresh?.();
    } catch {
      showStatus("error", "Failed to approve. Please try again.");
    } finally {
      setApprovingId(null);
    }
  };

  const searchPlayers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(buildApiUrl(`/api/v1/organisers/search-players?q=${encodeURIComponent(query)}`), {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const registeredPlayerIds = new Set(
          players.filter(p => p.player?._id).map(p => p.player!._id)
        );
        const filtered = (data.data || []).filter((p: any) => !registeredPlayerIds.has(p._id));
        setSearchResults(filtered);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const addPlayer = async (playerId: string, preferredPosition?: string) => {
    setAddingPlayerId(playerId);
    try {
      const res = await fetch(buildApiUrl(`/api/v1/games/organisers/${gameId}/add-player`), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ playerId, preferredPosition: preferredPosition || "any" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showStatus("error", data.message || "Failed to add player");
        return;
      }
      setShowAddPlayer(false);
      setSearchQuery("");
      setSearchResults([]);
      showStatus("success", "Player added successfully");
      onRefresh?.();
    } catch (error) {
      console.error("Add player failed:", error);
      showStatus("error", "Failed to add player");
    } finally {
      setAddingPlayerId(null);
    }
  };

  const handleUploadPlayerImage = async (playerId: string, file: File) => {
    setUploadingImageId(playerId);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
      const formData = new FormData();
      formData.append("profileImage", file);
      const res = await fetch(buildApiUrl(`/api/v1/organisers/me/players/${playerId}/profile-image`), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showStatus("error", data.message || "Image upload failed");
        return;
      }
      onRefresh?.();
    } catch {
      showStatus("error", "Image upload failed");
    } finally {
      setUploadingImageId(null);
    }
  };

  const [addingGuest, setAddingGuest] = useState(false);

  const addOrganiserGuest = async () => {
    setAddingGuest(true);
    try {
      const res = await fetch(buildApiUrl(`/api/v1/games/organisers/${gameId}/add-guest`), {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showStatus("error", data.message || "Failed to add guest");
        return;
      }
      showStatus("success", "Guest slot added");
      onRefresh?.();
    } catch {
      showStatus("error", "Failed to add guest");
    } finally {
      setAddingGuest(false);
    }
  };

  const [copied, setCopied] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const confirmActionRef = useRef<null | (() => Promise<void>)>(null);
 const handleDistribute = async () => {
  try {
    const res = await fetch(
      buildApiUrl(`/api/v1/games/organisers/${gameId}/distribute`),
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

    if (!res.ok || !data.success) {
      showStatus("error", data.message || "Team generation failed");
      return;
    }

    setTeams(data.data);
    showStatus("success", "Teams distributed successfully ⚽");
    onRefresh?.();

  } catch (err) {
    console.error("Error distributing teams:", err);
    showStatus("error", "Something went wrong");
  }
};
  const [processingId, setProcessingId] = useState<string | null>(null);
  // totalSlots is the hard cap (includes organiser slot when organiserIsPlaying)
  const organiserCount = organiserIsPlaying ? 1 : 0;

  const handleCopyList = () => {
    const organiserName = typeof window !== "undefined" ? localStorage.getItem("userName") : "N/A";

    const header = `*${gameName}*`;
    const organiserLine = `*Organiser:* ${organiserName}`;

    const playerLines = players.map((r, index) => {
      const name = r.plusOneName
        ? `${r.plusOneName} (Guest)`
        : (r.player?.name || "Unknown");
      const pos = posLabel(r.preferredPosition);
      return `${index + 1}. ${name}${pos ? ` [${pos}]` : ""}`;
    });

    const footer = `*Total:* ${players.length} / ${totalSlots}`;

    const fullMessage = [
      header,
      organiserLine,
      "─".repeat(20),
      ...playerLines,
      "─".repeat(20),
      footer,
    ].join("\n");

    navigator.clipboard.writeText(fullMessage).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const mainRegs  = players.filter((r) => !r.plusOneName);
  const guestRegs = players.filter((r) => !!r.plusOneName);

  // Organiser's own guests (plusOneName set, player null — organiser is not in Player collection)
  const organiserGuests = players.filter((r) => !!r.plusOneName && !r.player);
  // Player guests grouped by their owner's player ID
  const guestsByPlayer = new Map<string, Registration[]>();
  players.filter((r) => !!r.plusOneName && !!r.player).forEach((r) => {
    const k = (r.player as any)?._id?.toString() ?? (r.player as any)?.toString() ?? "";
    if (k) {
      if (!guestsByPlayer.has(k)) guestsByPlayer.set(k, []);
      guestsByPlayer.get(k)!.push(r);
    }
  });
  const spotsLeft = Math.max(0, totalSlots - players.length - organiserCount);
  const totalCollectedPaise = players.reduce(
    (sum, r) => sum + (r.paymentStatus === "paid" || r.paymentStatus === "wallet_locked" ? (r.amountPaidPaise || 0) : 0),
    0
  );

  return (
    <>
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
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid #333",
                  color: isRefreshing ? "#555" : "#ccc",
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: isRefreshing ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  transition: "all 0.2s",
                }}
                title="Refresh player list"
              >
                {isRefreshing ? "↻ Refreshing…" : "↻ Refresh"}
              </button>
            )}
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
            <button
            onClick={handleDistribute}
            style={{
              background: "rgba(59,130,246,0.15)",
              border: "1px solid rgba(59,130,246,0.3)",
              color: "#3b82f6",
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 12,
              cursor: "pointer",
              fontWeight: 600,
              transition: "all 0.2s",
            }}
            title="Auto distribute teams">
              ⚽ Distribute Teams
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
          {totalCollectedPaise > 0 && (
            <>
              <div className="pdm-stat-div" />
              <div className="pdm-stat">
                <span className="pdm-stat-val" style={{ color: "#4ade80", fontSize: 13 }}>
                  ₹{totalCollectedPaise / 100}
                </span>
                <span className="pdm-stat-lbl">Collected</span>
              </div>
            </>
          )}
        </div>

        {/* Inline status message — replaces alert() dialogs */}
        {statusMsg && (
          <div style={{
            margin: "0",
            padding: "10px 20px",
            background: statusMsg.type === "success" ? "rgba(74,222,128,0.12)" : "rgba(239,68,68,0.12)",
            borderBottom: `1px solid ${statusMsg.type === "success" ? "rgba(74,222,128,0.25)" : "rgba(239,68,68,0.25)"}`,
            color: statusMsg.type === "success" ? "#4ade80" : "#f87171",
            fontSize: 13,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}>
            <span>{statusMsg.type === "success" ? "✓" : "✕"}</span>
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Add Player Search */}
        {showAddPlayer && (
          <div style={{ margin: "16px 0", padding: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid #333", borderRadius: "8px" }}>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#ccc" }}>
                Search Players
              </label>
              <input
                type="text"
                placeholder="Search by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchPlayers(e.target.value);
                }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid #444",
                  borderRadius: 6,
                  color: "#fff",
                  fontSize: 14,
                }}
              />
            </div>

            {searching && (
              <div style={{ textAlign: "center", padding: "20px", color: "#888" }}>
                Searching...
              </div>
            )}

            {!searching && searchResults.length > 0 && (
              <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                {searchResults.map((player) => (
                  <div
                    key={player._id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      marginBottom: "4px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: 6,
                      border: "1px solid #333",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "rgba(200,255,62,0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#c8ff3e",
                        }}
                      >
                        {initials(player.name)}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
                          {player.name}
                        </div>
                        <div style={{ fontSize: 12, color: "#888" }}>
                          {player.phone} • Rating: {player.rating || 5}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => addPlayer(player._id)}
                      disabled={addingPlayerId === player._id}
                      style={{
                        background: addingPlayerId === player._id ? "rgba(200,255,62,0.2)" : "rgba(200,255,62,0.1)",
                        border: "1px solid rgba(200,255,62,0.3)",
                        color: "#c8ff3e",
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontSize: 12,
                        cursor: addingPlayerId === player._id ? "not-allowed" : "pointer",
                        fontWeight: 600,
                      }}
                    >
                      {addingPlayerId === player._id ? "Adding..." : "Add"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!searching && searchQuery && searchResults.length === 0 && (
              <div style={{ textAlign: "center", padding: "20px", color: "#888" }}>
                No players found
              </div>
            )}
          </div>
        )}

        {/* ── Registered Players ── */}
        <div className="pdm-cards-scroll">
          {players.length === 0 && !organiserIsPlaying ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <p>No players registered yet</p>
            </div>
          ) : (
            <div className="pdm-cards-list">

              {/* Organiser group: card (if playing) + organiser's guests */}
              {(organiserIsPlaying || organiserGuests.length > 0) && (
                <div className="pdm-group">
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
                        <button
                          onClick={onToggleOrganiserPlaying}
                          title="Withdraw from game"
                          style={{
                            flexShrink: 0,
                            alignSelf: "center",
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background: "rgba(220,38,38,0.1)",
                            border: "1px solid rgba(220,38,38,0.3)",
                            color: "#f87171",
                            fontSize: 14,
                            lineHeight: 1,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )}
                  {organiserGuests.length > 0 && (
                    <div className="pdm-guest-group">
                      {organiserGuests.map((reg, i) => {
                        const regId = reg._id || "";
                        const slotNum = organiserCount + i + 1;
                        return (
                          <PlayerCard
                            key={regId || `og-${i}`}
                            reg={reg}
                            slotNum={slotNum}
                            type="guest"
                            isProcessing={processingId === regId}
                            onRemove={
                              onRemoveRegistration && regId
                                ? async () => {
                                    const doRemove = async () => {
                                      setProcessingId(regId);
                                      await onRemoveRegistration(regId);
                                      setProcessingId(null);
                                    };
                                    setConfirmMessage(`Remove ${reg.plusOneName} from your guest list?`);
                                    confirmActionRef.current = doRemove;
                                    setConfirmVisible(true);
                                  }
                                : undefined
                            }
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Main players + their guests — grouped */}
              {(() => {
                let slot = organiserCount + organiserGuests.length;
                return mainRegs.map((reg) => {
                  slot++;
                  const regId   = reg._id || "";
                  const playerId = (reg.player as any)?._id?.toString()
                    ?? (reg.player as any)?.toString()
                    ?? "";
                  const myGuests = guestsByPlayer.get(playerId) ?? [];

                  return (
                    <div className="pdm-group" key={regId || `mp-${slot}`}>
                      <PlayerCard
                        reg={reg}
                        slotNum={slot}
                        type="player"
                        isProcessing={processingId === regId}
                        onRemove={undefined}
                      />
                      {myGuests.length > 0 && (
                        <div className="pdm-guest-group">
                          {myGuests.map((gReg) => {
                            slot++;
                            const gId = gReg._id || "";
                            return (
                              <PlayerCard
                                key={gId || `pg-${slot}`}
                                reg={gReg}
                                slotNum={slot}
                                type="guest"
                                isProcessing={processingId === gId}
                                onRemove={undefined}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}

            </div>
          )}

          {/* Waitlist Section — inside scroll area so it doesn't overflow */}
          {waitlist.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 0 10px 0", borderTop: "1px solid #222",
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#f59e0b" }}>
                  📋 Waitlist ({waitlist.length})
                </span>
                <span style={{ fontSize: 11, color: "#666", fontStyle: "italic" }}>
                  — notified by email &amp; app when a slot opens
                </span>
              </div>
              <div className="pdm-cards-list">
                {waitlist.map((entry, idx) => {
                  const playerId = entry.player?._id;
                  const gc = playerId
                    ? (guestWaitlist || []).filter(
                        (g) => g.player?._id === playerId && ["waiting", "notified"].includes(g.status || "waiting")
                      ).length
                    : 0;
                  return (
                    <WaitlistCard
                      key={entry._id || idx}
                      entry={entry}
                      position={idx + 1}
                      onApprove={entry.status === "waiting" && entry._id ? () => approveWaitlistEntry(entry._id!) : undefined}
                      isApproving={approvingId === entry._id}
                      guestCount={gc}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Guest Waitlist Section */}
          {guestWaitlist.filter(g => ["waiting", "notified"].includes(g.status || "waiting")).length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 0 10px 0", borderTop: "1px solid #222",
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#a78bfa" }}>
                  👥 Guest Waitlist ({guestWaitlist.filter(g => ["waiting", "notified"].includes(g.status || "waiting")).length})
                </span>
                <span style={{ fontSize: 11, color: "#666", fontStyle: "italic" }}>
                  — players waiting to confirm their guests
                </span>
              </div>
              <div className="pdm-cards-list">
                {guestWaitlist
                  .filter(g => ["waiting", "notified"].includes(g.status || "waiting"))
                  .map((entry, idx) => (
                    <GuestWaitlistCard key={entry._id || idx} entry={entry} position={idx + 1} />
                  ))}
              </div>
            </div>
          )}

          {/* Teams — inside scroll area */}
          {teams && (
            <div style={{ marginTop: 20, paddingBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#ccc", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                ⚽ Teams
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Red Team</div>
                  {(teams?.teamA || []).map((p: any, i: number) => (
                    <div key={i} style={{ fontSize: 13, color: "#e5e5e5", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      {p.name || p}
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Blue Team</div>
                  {(teams?.teamB || []).map((p: any, i: number) => (
                    <div key={i} style={{ fontSize: 13, color: "#e5e5e5", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      {p.name || p}
                    </div>
                  ))}
                </div>
              </div>
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
    <ConfirmationModal
      open={confirmVisible}
      title="Remove player"
      message={confirmMessage || "Are you sure you want to continue?"}
      confirmLabel="Remove"
      cancelLabel="Keep player"
      loading={processingId !== null}
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
    </>
  );
}

const WAITLIST_STATUS_CFG: Record<string, { label: string; bg: string; color: string; border: string; leftBorder: string }> = {
  waiting:  { label: "Waiting",    bg: "rgba(245,158,11,0.08)",  color: "#f59e0b", border: "rgba(245,158,11,0.18)", leftBorder: "#f59e0b" },
  notified: { label: "Slot Open",  bg: "rgba(34,197,94,0.08)",   color: "#4ade80", border: "rgba(74,222,128,0.25)", leftBorder: "#4ade80" },
  expired:  { label: "Expired",    bg: "rgba(239,68,68,0.06)",   color: "#f87171", border: "rgba(239,68,68,0.2)",  leftBorder: "#f87171" },
  registered:{ label: "Registered",bg: "rgba(96,165,250,0.08)", color: "#60a5fa", border: "rgba(96,165,250,0.2)", leftBorder: "#60a5fa" },
};

function WaitlistCard({ entry, position, onApprove, isApproving, guestCount }: {
  entry: WaitlistEntry;
  position: number;
  onApprove?: () => void;
  isApproving?: boolean;
  guestCount?: number;
}) {
  const status  = entry.status || "waiting";
  const cfg     = WAITLIST_STATUS_CFG[status] ?? WAITLIST_STATUS_CFG.waiting;
  const name    = entry.player?.name || "Unknown";
  const pos     = posLabel(entry.preferredPosition);
  const isNotified = status === "notified";
  const isApproved = status === "approved";

  return (
    <div
      className="pdm-card pdm-card-player"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderLeft: `3px solid ${cfg.leftBorder}` }}
    >
      <div className="pdm-slot-num" style={{ color: cfg.color }}>#{position}</div>
      <div
        className="pdm-avatar pdm-avatar-p"
        style={{ background: `${cfg.leftBorder}22`, color: cfg.color, border: `1px solid ${cfg.border}` }}
      >
        {initials(name)}
      </div>
      <div className="pdm-card-body">
        <div className="pdm-card-top">
          <div className="pdm-card-name">{name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              className="pdm-type-chip"
              style={{ background: `${cfg.leftBorder}22`, color: cfg.color, border: `1px solid ${cfg.border}` }}
            >
              {cfg.label}
            </span>
            {onApprove && (
              <button
                onClick={onApprove}
                disabled={isApproving}
                style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 8px",
                  borderRadius: 4, cursor: isApproving ? "not-allowed" : "pointer",
                  background: isApproving ? "rgba(74,222,128,0.05)" : "rgba(74,222,128,0.12)",
                  color: isApproving ? "rgba(74,222,128,0.4)" : "#4ade80",
                  border: "1px solid rgba(74,222,128,0.3)",
                }}
              >
                {isApproving ? "…" : "Approve"}
              </button>
            )}
          </div>
        </div>

        {isNotified && (
          <div style={{ fontSize: 11, color: "#4ade80", fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <span>🔔</span>
            <span>Slot available — awaiting player confirmation</span>
          </div>
        )}
        {isApproved && (
          <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <span>✅</span>
            <span>Approved — will be notified when a slot opens</span>
          </div>
        )}
        {guestCount != null && guestCount > 0 && (
          <div style={{ fontSize: 11, color: "#a78bfa", fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <span>👥</span>
            <span>{guestCount} guest{guestCount > 1 ? "s" : ""} also on waitlist</span>
          </div>
        )}

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
          {pos && <span className="pdm-pos-tag">{pos}</span>}
          {entry.joinedAt && <span className="pdm-date-tag">Joined {fmtDate(entry.joinedAt)}</span>}
        </div>
      </div>
    </div>
  );
}

const GUEST_WAITLIST_STATUS_CFG: Record<string, { label: string; bg: string; color: string; border: string; leftBorder: string }> = {
  waiting:   { label: "Waiting",   bg: "rgba(167,139,250,0.08)", color: "#a78bfa", border: "rgba(167,139,250,0.2)",  leftBorder: "#a78bfa" },
  notified:  { label: "Notified",  bg: "rgba(34,197,94,0.08)",   color: "#4ade80", border: "rgba(74,222,128,0.25)", leftBorder: "#4ade80" },
  confirmed: { label: "Confirmed", bg: "rgba(96,165,250,0.08)",  color: "#60a5fa", border: "rgba(96,165,250,0.2)",  leftBorder: "#60a5fa" },
  expired:   { label: "Expired",   bg: "rgba(239,68,68,0.06)",   color: "#f87171", border: "rgba(239,68,68,0.2)",   leftBorder: "#f87171" },
};

function GuestWaitlistCard({ entry, position }: { entry: GuestWaitlistEntry; position: number }) {
  const status    = entry.status || "waiting";
  const cfg       = GUEST_WAITLIST_STATUS_CFG[status] ?? GUEST_WAITLIST_STATUS_CFG.waiting;
  const guestName = entry.plusOneName || "Unknown guest";
  const ownerName = entry.player?.name || "Unknown player";

  return (
    <div
      className="pdm-card pdm-card-player"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderLeft: `3px solid ${cfg.leftBorder}` }}
    >
      <div className="pdm-slot-num" style={{ color: cfg.color }}>#{position}</div>
      <div
        className="pdm-avatar pdm-avatar-p"
        style={{ background: `${cfg.leftBorder}22`, color: cfg.color, border: `1px solid ${cfg.border}` }}
      >
        {initials(guestName)}
      </div>
      <div className="pdm-card-body">
        <div className="pdm-card-top">
          <div>
            <div className="pdm-card-name">{guestName}</div>
            <div style={{ fontSize: 11, color: "#666", marginTop: 1 }}>via {ownerName}</div>
          </div>
          <span
            className="pdm-type-chip"
            style={{ background: `${cfg.leftBorder}22`, color: cfg.color, border: `1px solid ${cfg.border}` }}
          >
            {cfg.label}
          </span>
        </div>
        {status === "notified" && (
          <div style={{ fontSize: 11, color: "#4ade80", fontWeight: 600, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <span>🔔</span>
            <span>Slot available — awaiting player confirmation</span>
          </div>
        )}
        {entry.requestedAt && (
          <div className="pdm-card-tags">
            <span className="pdm-date-tag">Requested {fmtDate(entry.requestedAt)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const PAYMENT_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  paid:          { label: "Paid",    bg: "rgba(74,222,128,0.12)",  color: "#4ade80" },
  wallet_locked: { label: "Locked",  bg: "rgba(167,139,250,0.12)", color: "#a78bfa" },
  pending:       { label: "Pending", bg: "rgba(245,158,11,0.12)",  color: "#f59e0b" },
  refunded:      { label: "Refunded",bg: "rgba(96,165,250,0.12)",  color: "#60a5fa" },
  forfeited:     { label: "Forfeited",bg:"rgba(248,113,113,0.12)", color: "#f87171" },
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
      {amountPaise != null && amountPaise > 0 && (
        <span style={{ opacity: 0.8 }}>₹{amountPaise / 100}</span>
      )}
    </span>
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
  const imgSrc  = !isGuest && reg.player?.profileImage
    ? (reg.player.profileImage.startsWith("http") ? reg.player.profileImage : `${IMG_BASE}${reg.player.profileImage}`)
    : null;
  const [imgFailed, setImgFailed] = React.useState(false);

  return (
    <div className={`pdm-card ${isGuest ? "pdm-card-guest" : "pdm-card-player"}`}>
      {slotNum !== undefined && <div className="pdm-slot-num">#{slotNum}</div>}

      <div className={`pdm-avatar ${isGuest ? "pdm-avatar-g" : "pdm-avatar-p"}`} style={{ padding: 0, overflow: "hidden" }}>
        {imgSrc && !imgFailed
          ? <img src={imgSrc} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: "50%" }} onError={() => setImgFailed(true)} />
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
