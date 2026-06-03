"use client";

import React, { useEffect, useState, useCallback } from "react";
import { getAdminToken } from "@/lib/admin-session";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:5000/api/v1";

// ── Types ─────────────────────────────────────────────────────────────────────

type PassType =
  | "none"
  | "weekday"
  | "weekend"
  | "day"
  | "night"
  | "weekday_day"
  | "weekday_night"
  | "weekend_day"
  | "weekend_night"
  | "full_month"
  | "half_month_1"
  | "half_month_2";

const MONTH_REQUIRED: PassType[] = ["full_month", "half_month_1", "half_month_2"];

type PlayerPassRow = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  location?: string | null;
  gamesPlayed: number;
  rating: number;
  totalSpentPaise: number;
  passType: PassType;
  passExpiry: string | null;
  passMonthYear?: string | null;
};

type PendingConfirm = {
  playerId: string;
  playerName: string;
  passType: PassType;
  passExpiry: string;
  passMonthYear: string;
} | null;

type HistoryEntry = {
  type: string;
  label: string;
  expiryDate: string | null;
  passMonthYear: string | null;
  assignedBy: { name: string; email: string } | null;
  assignedAt: string | null;
  replacedAt?: string | null;
};

type HistoryModal = {
  playerId: string;
  playerName: string;
  loading: boolean;
  current: HistoryEntry | null;
  history: HistoryEntry[];
  error: string | null;
} | null;

const PASS_OPTIONS: { value: PassType; label: string }[] = [
  { value: "none",          label: "None" },
  { value: "weekday",       label: "Weekday" },
  { value: "weekend",       label: "Weekend" },
  { value: "day",           label: "Day" },
  { value: "night",         label: "Night" },
  { value: "weekday_day",   label: "Weekday + Day" },
  { value: "weekday_night", label: "Weekday + Night" },
  { value: "weekend_day",   label: "Weekend + Day" },
  { value: "weekend_night", label: "Weekend + Night" },
  { value: "full_month",    label: "Full Month" },
  { value: "half_month_1",  label: "Half Month (1–15)" },
  { value: "half_month_2",  label: "Half Month (16–31)" },
];

const PASS_COLORS: Record<PassType, string> = {
  none:          "rgba(255,255,255,0.08)",
  weekday:       "rgba(96,165,250,0.18)",
  weekend:       "rgba(251,146,60,0.18)",
  day:           "rgba(250,204,21,0.18)",
  night:         "rgba(167,139,250,0.18)",
  weekday_day:   "rgba(96,165,250,0.12)",
  weekday_night: "rgba(167,139,250,0.12)",
  weekend_day:   "rgba(250,204,21,0.12)",
  weekend_night: "rgba(251,146,60,0.12)",
  full_month:    "rgba(52,211,153,0.18)",
  half_month_1:  "rgba(52,211,153,0.12)",
  half_month_2:  "rgba(52,211,153,0.10)",
};

const PASS_TEXT: Record<PassType, string> = {
  none:          "#666",
  weekday:       "#60a5fa",
  weekend:       "#fb923c",
  day:           "#fbbf24",
  night:         "#a78bfa",
  weekday_day:   "#60a5fa",
  weekday_night: "#a78bfa",
  weekend_day:   "#fbbf24",
  weekend_night: "#fb923c",
  full_month:    "#34d399",
  half_month_1:  "#34d399",
  half_month_2:  "#34d399",
};

const PASS_LABEL: Record<PassType, string> = {
  none:          "None",
  weekday:       "Weekday",
  weekend:       "Weekend",
  day:           "Day",
  night:         "Night",
  weekday_day:   "Weekday + Day",
  weekday_night: "Weekday + Night",
  weekend_day:   "Weekend + Day",
  weekend_night: "Weekend + Night",
  full_month:    "Full Month",
  half_month_1:  "Half Month (1–15)",
  half_month_2:  "Half Month (16–31)",
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PassPage() {
  const [players, setPlayers]   = useState<PlayerPassRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState("");
  const [filterPass, setFilterPass] = useState<PassType | "all">("all");

  // saving state per player
  const [savingMap, setSavingMap] = useState<Record<string, string | null>>({});

  // Local draft state (fields being edited, not yet confirmed)
  const [localPass, setLocalPass] = useState<Record<string, { passType: PassType; passExpiry: string; passMonthYear: string }>>({});

  // Confirmation popup
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm>(null);

  // History modal
  const [historyModal, setHistoryModal] = useState<HistoryModal>(null);

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAdminToken();
      const res = await fetch(`${API_BASE}/admin/players`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to load players");
      setPlayers(data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load players");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlayers(); }, [fetchPlayers]);

  // ── API calls ──────────────────────────────────────────────────────────────

  const savePass = async (playerId: string, passType: PassType, passExpiry: string, passMonthYear: string) => {
    setSavingMap((prev) => ({ ...prev, [playerId]: "saving" }));
    try {
      const token = getAdminToken();
      const body: Record<string, string | null> = { passType, expiryDate: passExpiry || null };
      if (MONTH_REQUIRED.includes(passType)) body.passMonthYear = passMonthYear || null;
      const res = await fetch(`${API_BASE}/admin/players/${playerId}/pass`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to save");
      setSavingMap((prev) => ({ ...prev, [playerId]: null }));
      // Commit local draft into canonical player list
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === playerId
            ? { ...p, passType, passExpiry: passExpiry || null, passMonthYear: passMonthYear || null }
            : p
        )
      );
      // Clear draft so UI reflects saved state
      setLocalPass((prev) => { const next = { ...prev }; delete next[playerId]; return next; });
    } catch {
      setSavingMap((prev) => ({ ...prev, [playerId]: "error" }));
      setTimeout(() => setSavingMap((prev) => ({ ...prev, [playerId]: null })), 3000);
    }
  };

  const openHistory = async (playerId: string, playerName: string) => {
    setHistoryModal({ playerId, playerName, loading: true, current: null, history: [], error: null });
    try {
      const token = getAdminToken();
      const res = await fetch(`${API_BASE}/admin/players/${playerId}/pass-history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to load history");
      setHistoryModal({ playerId, playerName, loading: false, current: data.data.current, history: data.data.history, error: null });
    } catch (err: unknown) {
      setHistoryModal((prev) => prev ? { ...prev, loading: false, error: err instanceof Error ? err.message : "Failed" } : null);
    }
  };

  // ── Local state helpers ────────────────────────────────────────────────────

  const getLocal = (p: PlayerPassRow) => ({
    passType:      (localPass[p.id]?.passType      ?? p.passType)      as PassType,
    passExpiry:     localPass[p.id]?.passExpiry    ?? (p.passExpiry    ? p.passExpiry.split("T")[0]  : ""),
    passMonthYear:  localPass[p.id]?.passMonthYear ?? (p.passMonthYear || ""),
  });

  const setLocal = (playerId: string, patch: Partial<{ passType: PassType; passExpiry: string; passMonthYear: string }>, current: ReturnType<typeof getLocal>) => {
    setLocalPass((prev) => ({ ...prev, [playerId]: { ...current, ...patch } }));
  };

  // Confirm button is enabled when Pass Type is set + expiry is set + (if month-required, month is set)
  const canConfirm = (passType: PassType, passExpiry: string, passMonthYear: string) =>
    passType !== "none" &&
    passExpiry !== "" &&
    (!MONTH_REQUIRED.includes(passType) || passMonthYear !== "");

  // True only when local draft differs from what's saved on the server
  const hasUnsavedChanges = (p: PlayerPassRow, passType: PassType, passExpiry: string, passMonthYear: string) =>
    passType     !== p.passType ||
    passExpiry   !== (p.passExpiry    ? p.passExpiry.split("T")[0] : "") ||
    passMonthYear !== (p.passMonthYear ?? "");

  const filtered = players.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      (p.email || "").toLowerCase().includes(q);
    const matchPass = filterPass === "all" || getLocal(p).passType === filterPass;
    return matchSearch && matchPass;
  });

  const activePasses = players.filter((p) => getLocal(p).passType !== "none").length;

  // ── Render ─────────────────────────────────────────────────────────────────

  const GRID = "2fr 1fr 1fr 1fr 1fr 1fr 180px 160px 160px 80px 110px 38px";

  return (
    <div style={{ padding: "0 0 40px" }}>

      {/* ── Confirmation Modal ──────────────────────────────────────────── */}
      {pendingConfirm && (
        <div
          onClick={() => setPendingConfirm(null)}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#111", border: "1px solid #222", borderRadius: 14, padding: "28px 32px", width: "min(420px, 92vw)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
              Confirm Pass Assignment
            </div>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 22 }}>
              Review the details below and confirm to save.
            </div>

            {/* Player */}
            <div style={{ marginBottom: 12, padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid #1a1a1a" }}>
              <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Player</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#e0e0e0" }}>{pendingConfirm.playerName}</div>
            </div>

            {/* Pass */}
            <div style={{ marginBottom: 12, padding: "12px 16px", background: PASS_COLORS[pendingConfirm.passType], borderRadius: 8, border: `1px solid ${PASS_TEXT[pendingConfirm.passType]}33` }}>
              <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Pass Type</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: PASS_TEXT[pendingConfirm.passType] }}>
                {PASS_LABEL[pendingConfirm.passType]}
              </div>
            </div>

            {/* Details row */}
            <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
              {pendingConfirm.passMonthYear && (
                <div style={{ flex: 1, padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid #1a1a1a" }}>
                  <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Month</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#ccc" }}>{pendingConfirm.passMonthYear}</div>
                </div>
              )}
              <div style={{ flex: 1, padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid #1a1a1a" }}>
                <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Expires</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#ccc" }}>{fmtDate(pendingConfirm.passExpiry)}</div>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setPendingConfirm(null)}
                style={{ flex: 1, padding: "10px 0", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid #222", color: "#888", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const { playerId, passType, passExpiry, passMonthYear } = pendingConfirm;
                  setPendingConfirm(null);
                  savePass(playerId, passType, passExpiry, passMonthYear);
                }}
                style={{ flex: 1, padding: "10px 0", borderRadius: 8, background: "rgba(200,255,62,0.12)", border: "1px solid #c8ff3e55", color: "#c8ff3e", fontSize: 13, fontWeight: 800, cursor: "pointer" }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── History Modal ───────────────────────────────────────────────── */}
      {historyModal && (
        <div
          onClick={() => setHistoryModal(null)}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#111", border: "1px solid #222", borderRadius: 14, padding: "28px 32px", width: 480, maxWidth: "92vw", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>Pass History</div>
                <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{historyModal.playerName}</div>
              </div>
              <button
                onClick={() => setHistoryModal(null)}
                style={{ background: "none", border: "none", color: "#555", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: "0 4px" }}
              >×</button>
            </div>

            {historyModal.loading ? (
              <div style={{ textAlign: "center", padding: 40, color: "#555" }}>Loading…</div>
            ) : historyModal.error ? (
              <div style={{ textAlign: "center", padding: 20, color: "#f87171" }}>{historyModal.error}</div>
            ) : (
              <div style={{ overflowY: "auto", flex: 1 }}>
                {/* Current pass */}
                <div style={{ fontSize: 10, fontWeight: 800, color: "#444", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
                  Current Pass
                </div>
                {historyModal.current ? (
                  <div style={{ padding: "12px 16px", background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 10, marginBottom: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#4ade80" }}>{historyModal.current.label}</div>
                        {historyModal.current.passMonthYear && (
                          <div style={{ fontSize: 11, color: "#555", marginTop: 3 }}>Month: {historyModal.current.passMonthYear}</div>
                        )}
                        <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
                          Expires: {fmtDate(historyModal.current.expiryDate)}
                        </div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 800, color: "#4ade80", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 20, padding: "3px 10px" }}>
                        Approved
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: "#444", marginTop: 8 }}>
                      Assigned {fmtDate(historyModal.current.assignedAt)}
                      {historyModal.current.assignedBy && ` by ${historyModal.current.assignedBy.name}`}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid #1a1a1a", borderRadius: 10, marginBottom: 24, color: "#555", fontSize: 13 }}>
                    No active pass
                  </div>
                )}

                {/* History list */}
                <div style={{ fontSize: 10, fontWeight: 800, color: "#444", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
                  Previous Passes ({historyModal.history.length})
                </div>

                {historyModal.history.length === 0 ? (
                  <div style={{ padding: "12px 16px", color: "#444", fontSize: 12, background: "rgba(255,255,255,0.02)", border: "1px solid #1a1a1a", borderRadius: 10 }}>
                    No pass history yet.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {historyModal.history.map((h, i) => (
                      <div key={i} style={{ padding: "12px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid #1a1a1a", borderRadius: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#aaa" }}>{h.label}</div>
                            {h.passMonthYear && (
                              <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>Month: {h.passMonthYear}</div>
                            )}
                            <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
                              Expired: {fmtDate(h.expiryDate)}
                            </div>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#555", background: "rgba(255,255,255,0.04)", border: "1px solid #1a1a1a", borderRadius: 20, padding: "3px 10px", whiteSpace: "nowrap" }}>
                            Expired
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: "#333", marginTop: 8, borderTop: "1px solid #1a1a1a", paddingTop: 8, display: "flex", gap: 16 }}>
                          <span>Assigned {fmtDate(h.assignedAt)}{h.assignedBy ? ` by ${h.assignedBy.name}` : ""}</span>
                          {h.replacedAt && <span>Replaced {fmtDate(h.replacedAt)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#888", marginBottom: 6 }}>
          Football / Passes
        </div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
          Pass Management
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#666" }}>
          Assign passes to players. Pass-eligible games show as free for the player.
        </p>
      </div>

      {/* Summary strip */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { label: "Total Players",  value: players.length },
          { label: "Active Passes",  value: activePasses,   accent: "#c8ff3e" },
          { label: "No Pass",        value: players.length - activePasses },
        ].map(({ label, value, accent }) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1a1a1a", borderRadius: 10, padding: "14px 20px", minWidth: 120 }}>
            <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: accent || "#e0e0e0" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search by name, phone or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, background: "#0a0a0a", border: "1px solid #222", borderRadius: 8, padding: "9px 14px", color: "#fff", fontSize: 13, outline: "none" }}
        />
        <select
          value={filterPass}
          onChange={(e) => setFilterPass(e.target.value as PassType | "all")}
          style={{ background: "#0a0a0a", border: "1px solid #222", borderRadius: 8, padding: "9px 14px", color: "#aaa", fontSize: 13, outline: "none", cursor: "pointer" }}
        >
          <option value="all">All Pass Types</option>
          {PASS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#555" }}>Loading players…</div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: 40, color: "#f87171" }}>{error}</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#555" }}>No players found.</div>
      ) : (
        <>
        <div className="pass-scroll-hint" style={{ fontSize: 11, color: "#555", marginBottom: 8, display: "none" }}>
          ← swipe horizontally to see all columns →
        </div>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 6 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 1040 }}>
          {/* Column headers */}
          <div style={{
            display: "grid", gridTemplateColumns: GRID,
            gap: 10, padding: "8px 16px",
            fontSize: 10, fontWeight: 800, color: "#444",
            textTransform: "uppercase", letterSpacing: "0.1em",
          }}>
            <span>Player</span>
            <span>Phone</span>
            <span>Location</span>
            <span>Games</span>
            <span>Rating</span>
            <span>Spent</span>
            <span>Pass Type</span>
            <span>Month</span>
            <span>Expiry Date</span>
            <span>Status</span>
            <span>Confirm</span>
            <span></span>
          </div>

          {filtered.map((p) => {
            const local = getLocal(p);
            const { passType, passExpiry, passMonthYear } = local;
            const saving = savingMap[p.id];
            const needsMonth = MONTH_REQUIRED.includes(passType);
            const hasSavedPass = p.passType !== "none";
            const isExpired = hasSavedPass && !!p.passExpiry && new Date(p.passExpiry) < new Date();
            const ready = hasUnsavedChanges(p, passType, passExpiry, passMonthYear) && canConfirm(passType, passExpiry, passMonthYear);

            return (
              <div
                key={p.id}
                style={{
                  display: "grid", gridTemplateColumns: GRID,
                  gap: 10, padding: "12px 16px",
                  background: isExpired ? "rgba(251,146,60,0.03)" : "rgba(255,255,255,0.02)",
                  border: isExpired ? "1px solid rgba(251,146,60,0.15)" : "1px solid #111",
                  borderRadius: 8, alignItems: "center",
                  borderLeft: isExpired
                    ? "3px solid #fb923c"
                    : hasSavedPass
                      ? `3px solid ${PASS_TEXT[p.passType]}`
                      : "3px solid transparent",
                }}
              >
                {/* Player */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e0e0e0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                  {p.email && <div style={{ fontSize: 11, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{p.email}</div>}
                </div>

                <div style={{ fontSize: 12, color: "#888" }}>{p.phone}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{p.location || "—"}</div>
                <div style={{ fontSize: 12, color: "#888" }}>{p.gamesPlayed}</div>
                <div style={{ fontSize: 12, color: "#888" }}>{p.rating ? p.rating.toFixed(1) : "—"}</div>
                <div style={{ fontSize: 12, color: "#888" }}>₹{Math.round((p.totalSpentPaise || 0) / 100)}</div>

                {/* Pass type dropdown */}
                <select
                  value={passType}
                  onChange={(e) => setLocal(p.id, { passType: e.target.value as PassType, passMonthYear: "" }, local)}
                  style={{
                    background: PASS_COLORS[passType],
                    border: `1px solid ${passType !== "none" ? PASS_TEXT[passType] + "55" : "#222"}`,
                    borderRadius: 6, padding: "6px 10px",
                    color: PASS_TEXT[passType], fontSize: 12, fontWeight: 600,
                    cursor: "pointer", outline: "none", width: "100%",
                  }}
                >
                  {PASS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} style={{ background: "#111", color: "#ccc" }}>{o.label}</option>
                  ))}
                </select>

                {/* Month picker */}
                <input
                  type="month"
                  value={passMonthYear}
                  disabled={!needsMonth}
                  onChange={(e) => setLocal(p.id, { passMonthYear: e.target.value }, local)}
                  style={{
                    background: "#0a0a0a",
                    border: `1px solid ${needsMonth ? PASS_TEXT[passType] + "55" : "#222"}`,
                    borderRadius: 6, padding: "6px 10px",
                    color: needsMonth ? "#ccc" : "#333",
                    fontSize: 12, outline: "none", width: "100%", boxSizing: "border-box" as const,
                    cursor: needsMonth ? "pointer" : "not-allowed",
                    colorScheme: "dark" as const,
                  }}
                  title={needsMonth ? "Select the month for this pass" : "Only needed for Full/Half month passes"}
                />

                {/* Expiry date */}
                <input
                  type="date"
                  value={passExpiry}
                  min={new Date().toISOString().split("T")[0]}
                  disabled={passType === "none"}
                  onChange={(e) => setLocal(p.id, { passExpiry: e.target.value }, local)}
                  style={{
                    background: "#0a0a0a",
                    border: "1px solid #222", borderRadius: 6,
                    padding: "6px 10px", color: passType === "none" ? "#444" : "#ccc",
                    fontSize: 12, outline: "none", width: "100%", boxSizing: "border-box" as const,
                    cursor: passType === "none" ? "not-allowed" : "pointer",
                    colorScheme: "dark" as const,
                  }}
                  placeholder="No expiry"
                  title={passType === "none" ? "Assign a pass first" : "Required to enable Confirm"}
                />

                {/* Status badge */}
                <div style={{ textAlign: "center" }}>
                  {saving === "saving" && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#888" }}>Saving…</span>
                  )}
                  {saving === "error" && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#f87171", background: "rgba(248,113,113,0.1)", borderRadius: 20, padding: "3px 8px" }}>Error</span>
                  )}
                  {!saving && isExpired && (
                    <span style={{ fontSize: 10, fontWeight: 800, color: "#fb923c", background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.25)", borderRadius: 20, padding: "3px 10px", display: "inline-block", letterSpacing: "0.04em" }}>
                      Expired
                    </span>
                  )}
                  {!saving && hasSavedPass && !isExpired && (
                    <span style={{ fontSize: 10, fontWeight: 800, color: "#4ade80", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 20, padding: "3px 10px", display: "inline-block", letterSpacing: "0.04em" }}>
                      Approved
                    </span>
                  )}
                  {!saving && !hasSavedPass && (
                    <span style={{ fontSize: 10, color: "#333", fontWeight: 600 }}>—</span>
                  )}
                </div>

                {/* Confirm button — visible only when all required fields are filled */}
                <div style={{ textAlign: "center" }}>
                  {saving === "saving" ? (
                    <span style={{ fontSize: 11, color: "#555" }}>…</span>
                  ) : ready ? (
                    <button
                      onClick={() => setPendingConfirm({ playerId: p.id, playerName: p.name, passType, passExpiry, passMonthYear })}
                      style={{
                        padding: "5px 14px", borderRadius: 6, fontSize: 11, fontWeight: 800,
                        background: "rgba(200,255,62,0.12)", border: "1px solid #c8ff3e55",
                        color: "#c8ff3e", cursor: "pointer", width: "100%",
                      }}
                    >
                      Confirm
                    </button>
                  ) : (
                    <span style={{ fontSize: 10, color: "#2a2a2a", fontWeight: 600 }}>—</span>
                  )}
                </div>

                {/* History icon button */}
                <button
                  onClick={() => openHistory(p.id, p.name)}
                  title="View pass history"
                  style={{
                    background: "rgba(255,255,255,0.04)", border: "1px solid #1a1a1a",
                    borderRadius: 6, width: 30, height: 30, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#555", fontSize: 13, fontWeight: 700,
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#aaa")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
                >
                  ≡
                </button>
              </div>
            );
          })}
        </div>
        </div>
        </>
      )}

      <style>{`
        @media (max-width: 1080px) {
          .pass-scroll-hint { display: block !important; }
        }
      `}</style>
    </div>
  );
}
