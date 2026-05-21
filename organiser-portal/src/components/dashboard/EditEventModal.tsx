"use client";

import React, { useEffect, useMemo, useState } from "react";
import { buildApiUrl, getSession } from "@/utils/api";

interface Turf { _id: string; name: string; location: { city: string } }

const FORMATS = ["5v5", "6v6", "7v7", "8v8", "9v9", "10v10"] as const;
type Format = typeof FORMATS[number];

const slotsFromFormat = (fmt: string) => {
  const parts = fmt.split("v");
  if (parts.length === 2) return parseInt(parts[0]) + parseInt(parts[1]);
  return 10;
};

const TIME_SLOT_OPTIONS = Array.from({ length: 48 }, (_, idx) => {
  const hours   = Math.floor(idx / 2);
  const minutes = idx % 2 === 0 ? "00" : "30";
  const value   = `${String(hours).padStart(2, "0")}:${minutes}`;
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  const period  = hours < 12 ? "AM" : "PM";
  return { value, label: `${displayHour}:${minutes} ${period}` };
});

interface GuestReg {
  _id: string; plusOneName: string;
  preferredPosition?: string; teamPreference?: string;
}

const POSITION_LABELS: Record<string, string> = {
  goalkeeper: "GK", defender: "DEF", midfielder: "MID", forward: "FWD",
};
const TEAM_LABELS: Record<string, string> = { red: "Red Team", blue: "Blue Team" };

function extractOrgGuests(game: any): GuestReg[] {
  const orgId = String(game.organiser?._id ?? game.organiser ?? "");
  return (game.registrations || [])
    .filter((r: any) => {
      if (!r.plusOneName) return false;
      if (!r.player) return true;
      return String(r.player?._id ?? r.player ?? "") === orgId;
    })
    .map((r: any) => ({
      _id: String(r._id), plusOneName: r.plusOneName,
      preferredPosition: r.preferredPosition, teamPreference: r.teamPreference,
    }));
}

function liveActiveCount(game: any): number {
  return (game.registrations || []).filter(
    (r: any) => !["refunded", "forfeited"].includes(r.paymentStatus || "") && !r.optedOut
  ).length;
}

interface EditEventModalProps {
  gameId: string;
  initialData: any;
  onClose: () => void;
  onSuccess: () => void;
  onParticipationChange?: () => void;
}

export function EditEventModal({
  gameId, initialData, onClose, onSuccess, onParticipationChange,
}: EditEventModalProps) {

  /* ── Live participation state (real-time, not batched) ── */
  const [organiserPlaying, setOrganiserPlaying] = useState(Boolean(initialData.organiserIsPlaying));
  const [regsCount, setRegsCount]               = useState(() => liveActiveCount(initialData));
  const [guests, setGuests]                     = useState<GuestReg[]>(() => extractOrgGuests(initialData));

  /* ── Action feedback ── */
  const [actionLoading, setActionLoading]   = useState(false);
  const [removingId, setRemovingId]         = useState<string | null>(null);
  const [guestLoading, setGuestLoading]     = useState(false);
  const [actionMsg, setActionMsg]           = useState<{ type: "success" | "error"; text: string } | null>(null);

  /* ── Inline confirmation ── */
  type PendingAction =
    | { type: "join" | "leave" }
    | { type: "remove-guest"; guest: GuestReg };
  const [pending, setPending] = useState<PendingAction | null>(null);

  /* ── Guest pref mini-modal ── */
  const [prefOpen, setPrefOpen]     = useState(false);
  const [prefName, setPrefName]     = useState("");
  const [prefPosition, setPrefPosition] = useState("Any");
  const [prefTeam, setPrefTeam]     = useState("No Preference");

  /* ── Form settings state (batched, saved via Save button) ── */
  const [turfs, setTurfs]           = useState<Turf[]>([]);
  const [loading, setLoading]       = useState(false);
  const [errors, setErrors]         = useState<Record<string, string>>({});
  const [title, setTitle]           = useState(initialData.title ?? "");
  const [turf, setTurf]             = useState(initialData.turf?._id || "");
  const [status, setStatus]         = useState(initialData.status ?? "open");
  const [format, setFormat]         = useState<Format>((initialData.format as Format) ?? "5v5");
  const [totalSlots, setTotalSlots] = useState(initialData.totalSlots ?? slotsFromFormat(initialData.format ?? "5v5"));
  const [feeInRs, setFeeInRs]       = useState(initialData.feeInPaise ? initialData.feeInPaise / 100 : 0);
  const [durationMins, setDurationMins] = useState(initialData.durationMins ?? 60);
  const [minPlayers, setMinPlayers] = useState(initialData.minPlayers ?? 7);
  const [reportingMins, setReportingMins] = useState(initialData.reportingMinsBeforeGame ?? 30);

  const initialDateTime = useMemo(() => {
    const scheduled = initialData.scheduledAt ? new Date(initialData.scheduledAt) : null;
    if (!scheduled) return { date: "", time: "18:00" };
    const hh = String(scheduled.getHours()).padStart(2, "0");
    const mm  = scheduled.getMinutes() >= 30 ? "30" : "00";
    return { date: scheduled.toISOString().split("T")[0], time: `${hh}:${mm}` };
  }, [initialData.scheduledAt]);

  const [date, setDate] = useState(initialDateTime.date);
  const [time, setTime] = useState(initialDateTime.time);

  useEffect(() => {
    const { token } = getSession();
    fetch(buildApiUrl("/api/v1/turfs"), token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
      .then((r) => r.json())
      .then((d) => { if (d.success) setTurfs(d.data || []); })
      .catch(console.error);
  }, []);

  /* ── Helpers ── */
  const showMsg = (type: "success" | "error", text: string) => {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 2500);
  };

  const syncFromGame = (game: any) => {
    if (!game) return;
    setGuests(extractOrgGuests(game));
    setRegsCount(liveActiveCount(game));
  };

  /* ── Capacity (live) ── */
  const hardCap    = Number(totalSlots);
  const filled     = regsCount + (organiserPlaying ? 1 : 0);
  const openSlots  = Math.max(0, hardCap - filled);

  /* ── Execute confirmed action ── */
  const executeAction = async () => {
    if (!pending) return;
    const action = pending;
    setPending(null);
    setActionLoading(true);
    try {
      const { token } = getSession();
      if (!token) return;

      if (action.type === "join" || action.type === "leave") {
        const newVal = action.type === "join";
        const res = await fetch(buildApiUrl(`/api/v1/games/organisers/${gameId}`), {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ organiserIsPlaying: newVal }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Failed to update");
        setOrganiserPlaying(newVal);
        syncFromGame(data.data);
        showMsg("success", newVal ? "You're in! Slot reserved." : "Withdrawn from game.");
        onParticipationChange?.();
      } else if (action.type === "remove-guest") {
        setRemovingId(action.guest._id);
        const res = await fetch(
          buildApiUrl(`/api/v1/games/organisers/${gameId}/registrations/${action.guest._id}`),
          { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Failed to remove guest");
        syncFromGame(data.data);
        showMsg("success", `${action.guest.plusOneName} removed.`);
        onParticipationChange?.();
      }
    } catch (err: any) {
      showMsg("error", err.message || "Action failed. Please try again.");
    } finally {
      setActionLoading(false);
      setRemovingId(null);
    }
  };

  /* ── Add guest (real-time, pref modal IS the confirmation) ── */
  const addGuest = async (name: string, position: string, teamPreference: string) => {
    const { token } = getSession();
    if (!token) return;
    setGuestLoading(true);
    setPrefOpen(false);
    try {
      const body: Record<string, string> = { position, teamPreference };
      if (name.trim()) body.guestName = name.trim();
      const res = await fetch(buildApiUrl(`/api/v1/games/organisers/${gameId}/add-guest`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { showMsg("error", data.message || "Failed to add guest"); return; }
      syncFromGame(data.data);
      showMsg("success", "Guest added.");
      onParticipationChange?.();
    } catch (err: any) {
      showMsg("error", err.message || "Failed to add guest");
    } finally {
      setGuestLoading(false);
    }
  };

  /* ── Form save — only game settings, participation is handled separately ── */
  const handleFormatChange = (f: Format) => {
    setFormat(f);
    const slots = slotsFromFormat(f);
    setTotalSlots(slots);
    setMinPlayers(Math.floor(slots * 0.7));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required";
    if (!turf)         newErrors.turf  = "Venue is required";
    if (!date)         newErrors.date  = "Date is required";
    if (Number(minPlayers) > Number(totalSlots))
      newErrors.minMax = "Min players cannot exceed total slots";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setLoading(true);
    try {
      const { token } = getSession();
      if (!token) { setErrors({ submit: "Please login as organiser first" }); return; }

      const scheduledAt = new Date(`${date}T${time}`);
      const cutoffAt    = new Date(scheduledAt.getTime() - 2 * 60 * 60 * 1000);

      // organiserIsPlaying is NOT included — it's managed in real-time above
      const payload = {
        title:                   title.trim(),
        turf,
        scheduledAt:             scheduledAt.toISOString(),
        cutoffAt:                cutoffAt.toISOString(),
        status,
        format,
        totalSlots:              Number(totalSlots),
        feeInRs:                 Number(feeInRs),
        durationMins:            Number(durationMins),
        minPlayers:              Number(minPlayers),
        reportingMinsBeforeGame: Number(reportingMins),
      };

      const res  = await fetch(buildApiUrl(`/api/v1/games/organisers/${gameId}`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body:   JSON.stringify(payload),
      });
      const text = await res.text();
      const data = res.headers.get("content-type")?.includes("application/json")
        ? JSON.parse(text)
        : { success: false, message: text || `HTTP ${res.status}` };

      if (!res.ok || !data.success) { setErrors({ submit: data.message || `HTTP ${res.status}` }); return; }
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrors({ submit: err.message || "Failed to update event" });
    } finally {
      setLoading(false);
    }
  };

  /* ── Inline confirmation UI ── */
  const ConfirmBar = ({ action }: { action: PendingAction }) => {
    const isJoin   = action.type === "join";
    const isLeave  = action.type === "leave";
    const isRemove = action.type === "remove-guest";
    const msg = isJoin
      ? "Reserve 1 slot and join this game?"
      : isLeave
        ? "Withdraw your slot from this game?"
        : `Remove ${(action as any).guest?.plusOneName} from your guest list?`;
    const accent = isRemove || isLeave ? "#f87171" : "#c8ff3e";
    return (
      <div style={{
        marginBottom: 10, padding: "10px 12px",
        background: isRemove || isLeave ? "rgba(220,38,38,0.07)" : "rgba(200,255,62,0.07)",
        border: `1px solid ${isRemove || isLeave ? "rgba(220,38,38,0.3)" : "rgba(200,255,62,0.25)"}`,
        borderRadius: 8, display: "flex", alignItems: "center",
        gap: 10, flexWrap: "wrap" as const,
      }}>
        <span style={{ flex: 1, fontSize: 12, color: "#ddd", minWidth: 140 }}>{msg}</span>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button type="button" onClick={() => setPending(null)}
            style={{ padding: "5px 12px", borderRadius: 6, background: "transparent", border: "1px solid #444", color: "#888", fontSize: 12, cursor: "pointer" }}>
            Cancel
          </button>
          <button type="button" onClick={executeAction} disabled={actionLoading}
            style={{ padding: "5px 14px", borderRadius: 6, background: accent, color: "#000", fontWeight: 700, fontSize: 12, border: "none", cursor: "pointer" }}>
            {actionLoading ? "…" : "Confirm"}
          </button>
        </div>
      </div>
    );
  };

  /* ── Render ── */
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content edit-event-modal"
        style={{ maxWidth: 560, width: "100%", maxHeight: "92vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-section">
            <h2 style={{ margin: 0 }}>Edit Event</h2>
            <p className="modal-subtitle" style={{ marginTop: 4 }}>{initialData.title}</p>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "0 4px" }}>
          {errors.submit && (
            <div className="form-error-banner" style={{ marginBottom: 16 }}>⚠️ {errors.submit}</div>
          )}

          {/* ── Event Details ── */}
          <Section title="Event Details">
            <Field label="Event Title" error={errors.title}>
              <input className={`form-input ${errors.title ? "error" : ""}`} value={title}
                onChange={(e) => setTitle(e.target.value)} required />
            </Field>
            <Field label="Venue / Turf" error={errors.turf}>
              <select className={`form-select ${errors.turf ? "error" : ""}`} value={turf}
                onChange={(e) => setTurf(e.target.value)} required>
                <option value="">Choose a turf…</option>
                {turfs.map((t) => (
                  <option key={t._id} value={t._id}>{t.name} · {t.location?.city}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="draft">Draft</option>
                <option value="open">Open</option>
                <option value="tentative">Tentative</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
              </select>
            </Field>
          </Section>

          {/* ── Schedule ── */}
          <Section title="Schedule">
            <div className="form-row">
              <Field label="Date" error={errors.date}>
                <input type="date" className={`form-input ${errors.date ? "error" : ""}`} value={date}
                  onChange={(e) => setDate(e.target.value)} required />
              </Field>
              <Field label="Game Start Time">
                <select className="form-select" value={time} onChange={(e) => setTime(e.target.value)}>
                  {TIME_SLOT_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="form-row">
              <Field label="Duration (mins)">
                <input type="number" className="form-input" min="15" step="15" value={durationMins}
                  onChange={(e) => setDurationMins(Number(e.target.value))} />
              </Field>
              <Field label="Players Report (mins before)">
                <select className="form-select" value={String(reportingMins)}
                  onChange={(e) => setReportingMins(Number(e.target.value))}>
                  {[15, 30, 45, 60].map((m) => (
                    <option key={m} value={m}>{m} mins before kickoff</option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          {/* ── Game Configuration ── */}
          <Section title="Game Configuration">
            <div className="form-row">
              <Field label="Format">
                <select className="form-select" value={format}
                  onChange={(e) => handleFormatChange(e.target.value as Format)}>
                  {FORMATS.map((f) => (
                    <option key={f} value={f}>{f} ({slotsFromFormat(f)} players)</option>
                  ))}
                </select>
              </Field>
              <Field label="Fee per Player (₹)">
                <input type="number" className="form-input" min="0" step="1" value={feeInRs}
                  onChange={(e) => setFeeInRs(Number(e.target.value))} required />
              </Field>
            </div>
            <div className="form-row">
              <Field label="Total Slots (cap)">
                <input type="number" className="form-input" min={minPlayers || 2} value={totalSlots}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val < minPlayers) setMinPlayers(val);
                    setTotalSlots(val);
                  }} />
              </Field>
              <Field label="Min Players to Confirm" error={errors.minMax}>
                <input type="number" className="form-input" min="2" max={totalSlots} value={minPlayers}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setMinPlayers(val > totalSlots ? totalSlots : val);
                  }} />
              </Field>
            </div>
          </Section>

          {/* ── Your Participation (real-time) ── */}
          <Section title="Your Participation">

            {/* Inline action feedback */}
            {actionMsg && (
              <div style={{
                padding: "8px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                background: actionMsg.type === "success" ? "rgba(74,222,128,0.1)" : "rgba(220,38,38,0.1)",
                border: `1px solid ${actionMsg.type === "success" ? "rgba(74,222,128,0.3)" : "rgba(220,38,38,0.3)"}`,
                color: actionMsg.type === "success" ? "#4ade80" : "#f87171",
              }}>
                {actionMsg.type === "success" ? "✓" : "⚠️"} {actionMsg.text}
              </div>
            )}

            {/* Confirmation bar for join/leave */}
            {pending && (pending.type === "join" || pending.type === "leave") && (
              <ConfirmBar action={pending} />
            )}

            {/* Toggle */}
            {!(pending?.type === "join" || pending?.type === "leave") && (
              <label style={{
                display: "flex", alignItems: "center", gap: 10,
                cursor: (actionLoading || (!organiserPlaying && openSlots === 0)) ? "not-allowed" : "pointer",
                opacity: (actionLoading || (!organiserPlaying && openSlots === 0)) ? 0.55 : 1,
              }}>
                <input
                  type="checkbox"
                  checked={organiserPlaying}
                  disabled={actionLoading || (!organiserPlaying && openSlots === 0)}
                  onChange={(e) => setPending({ type: e.target.checked ? "join" : "leave" })}
                  style={{ width: 17, height: 17, accentColor: "#c8ff3e", flexShrink: 0 }}
                />
                <span style={{ fontSize: 14, color: "#ddd" }}>
                  I want to play in this game{organiserPlaying ? " ✓" : " (uses 1 slot)"}
                </span>
              </label>
            )}

            {!organiserPlaying && openSlots === 0 && !(pending?.type === "join") && (
              <p style={{ margin: "4px 0 0 27px", fontSize: 11, color: "#f87171" }}>
                Game is full — no slot available.
              </p>
            )}

            {/* Capacity bar */}
            <div style={{
              marginTop: 10,
              background: filled > hardCap ? "rgba(251,146,60,0.08)" : openSlots === 0 ? "rgba(220,38,38,0.08)" : "rgba(200,255,62,0.06)",
              border: `1px solid ${filled > hardCap ? "rgba(251,146,60,0.4)" : openSlots === 0 ? "rgba(220,38,38,0.3)" : "rgba(200,255,62,0.2)"}`,
              borderRadius: 8, padding: "9px 13px", fontSize: 12,
              color: filled > hardCap ? "#fb923c" : openSlots === 0 ? "#f87171" : "#c8ff3e",
              fontWeight: 600,
            }}>
              {filled > hardCap
                ? `⚠️ Over capacity — ${filled} of ${hardCap} filled`
                : openSlots === 0
                  ? "⚠️ All slots filled"
                  : `✓ ${openSlots} open slot${openSlots !== 1 ? "s" : ""} remaining`}
              <span style={{ color: "#555", fontWeight: 400, marginLeft: 8 }}>
                cap {hardCap} · filled {Math.min(filled, hardCap)}
              </span>
            </div>
          </Section>

          {/* ── Your Guests (real-time) ── */}
          <Section title="Your Guests">

            {/* Confirmation bar for remove */}
            {pending?.type === "remove-guest" && (
              <ConfirmBar action={pending} />
            )}

            {guests.length === 0 && (
              <p style={{ fontSize: 12, color: "#666", margin: 0 }}>No guests added yet.</p>
            )}

            {guests.map((g, idx) => {
              const isRemoving = removingId === g._id;
              const posLabel = g.preferredPosition && g.preferredPosition !== "any"
                ? POSITION_LABELS[g.preferredPosition] ?? g.preferredPosition.toUpperCase() : null;
              const teamLabel = g.teamPreference ? TEAM_LABELS[g.teamPreference] : null;
              return (
                <div key={g._id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "rgba(200,255,62,0.04)", border: "1px solid #2a2a2a",
                  borderRadius: 8, padding: "10px 12px",
                  opacity: isRemoving ? 0.45 : 1, transition: "opacity 0.15s",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "#ddd", fontWeight: 500 }}>
                      <span style={{ color: "#c8ff3e", fontWeight: 700, marginRight: 8 }}>#{idx + 1}</span>
                      {g.plusOneName}
                    </div>
                    {(posLabel || teamLabel) ? (
                      <div style={{ display: "flex", gap: 5, marginTop: 5, flexWrap: "wrap" as const }}>
                        {posLabel && (
                          <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, fontWeight: 700,
                            background: "rgba(147,197,253,0.12)", color: "#93c5fd", border: "1px solid rgba(147,197,253,0.25)" }}>
                            {posLabel}
                          </span>
                        )}
                        {teamLabel && (
                          <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, fontWeight: 700,
                            background: g.teamPreference === "red" ? "rgba(231,76,60,0.12)" : "rgba(52,152,219,0.12)",
                            color: g.teamPreference === "red" ? "#ff6b6b" : "#74b9ff",
                            border: `1px solid ${g.teamPreference === "red" ? "rgba(231,76,60,0.3)" : "rgba(52,152,219,0.3)"}` }}>
                            {teamLabel}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: 10, color: "#444", marginTop: 4 }}>No preferences set</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPending({ type: "remove-guest", guest: g })}
                    disabled={isRemoving || !!removingId || guestLoading || actionLoading || pending?.type === "remove-guest"}
                    style={{
                      background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.3)",
                      color: "#f87171", borderRadius: 6, padding: "5px 12px", fontSize: 12,
                      cursor: (isRemoving || !!removingId || guestLoading || actionLoading || pending?.type === "remove-guest")
                        ? "not-allowed" : "pointer",
                      minWidth: 68, flexShrink: 0,
                    }}
                  >
                    {isRemoving ? "…" : "Remove"}
                  </button>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => { setPrefName(""); setPrefPosition("Any"); setPrefTeam("No Preference"); setPrefOpen(true); }}
              disabled={guestLoading || !!removingId || actionLoading || openSlots === 0}
              title={openSlots === 0 ? "No open slots remaining" : "Add a guest"}
              style={{
                marginTop: 4, width: "100%", padding: "9px 0",
                background: openSlots === 0 ? "rgba(255,255,255,0.02)" : "rgba(200,255,62,0.06)",
                border: `1px dashed ${openSlots === 0 ? "rgba(255,255,255,0.1)" : "rgba(200,255,62,0.3)"}`,
                borderRadius: 8,
                color: openSlots === 0 ? "#444" : "#c8ff3e",
                fontSize: 13, fontWeight: 600,
                cursor: (guestLoading || !!removingId || actionLoading || openSlots === 0) ? "not-allowed" : "pointer",
                opacity: (guestLoading || !!removingId || actionLoading) ? 0.5 : 1,
              }}
            >
              {guestLoading ? "Adding…" : openSlots === 0 ? "No open slots remaining" : "+ Add Guest"}
            </button>
          </Section>

          {/* ── Guest Preferences Mini-Modal ── */}
          {prefOpen && (
            <div
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9999,
                display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
              onClick={() => setPrefOpen(false)}
            >
              <div
                style={{ background: "#0f0f1e", border: "1px solid #333", borderRadius: 12,
                  padding: "24px 20px", width: "100%", maxWidth: 360 }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ color: "#c8ff3e", margin: "0 0 4px", fontSize: 17 }}>Add Guest</h3>
                <p style={{ color: "#666", fontSize: 12, margin: "0 0 20px" }}>
                  Set guest name, position and team preference.
                </p>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ color: "#aaa", fontSize: 11, display: "block", marginBottom: 6,
                    textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>
                    Guest Name <span style={{ color: "#555", textTransform: "none" as const }}>(optional)</span>
                  </label>
                  <input type="text" value={prefName} onChange={(e) => setPrefName(e.target.value)}
                    placeholder="e.g. Rahul" maxLength={40}
                    style={{ width: "100%", background: "#1a1a2e", border: "1px solid #444", borderRadius: 7,
                      padding: "9px 12px", color: "white", fontSize: 14, outline: "none", boxSizing: "border-box" as const }}
                    onFocus={(e) => (e.target.style.borderColor = "#c8ff3e")}
                    onBlur={(e) =>  (e.target.style.borderColor = "#444")}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ color: "#aaa", fontSize: 11, display: "block", marginBottom: 8,
                    textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Position</label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                    {["Any","GK","DEF","MID","FWD"].map((pos) => (
                      <button key={pos} type="button" onClick={() => setPrefPosition(pos)} style={{
                        padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                        background: prefPosition === pos ? "rgba(200,255,62,0.18)" : "rgba(255,255,255,0.04)",
                        color: prefPosition === pos ? "#c8ff3e" : "#888",
                        border: `1px solid ${prefPosition === pos ? "rgba(200,255,62,0.5)" : "rgba(255,255,255,0.08)"}`,
                      }}>{pos}</button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ color: "#aaa", fontSize: 11, display: "block", marginBottom: 8,
                    textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Team</label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                    {["No Preference","Red Team","Blue Team"].map((t) => (
                      <button key={t} type="button" onClick={() => setPrefTeam(t)} style={{
                        padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                        background: prefTeam === t
                          ? t === "Red Team" ? "rgba(220,38,38,0.18)" : t === "Blue Team" ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.08)"
                          : "rgba(255,255,255,0.04)",
                        color: prefTeam === t
                          ? t === "Red Team" ? "#f87171" : t === "Blue Team" ? "#60a5fa" : "#c8ff3e"
                          : "#888",
                        border: `1px solid ${prefTeam === t
                          ? t === "Red Team" ? "rgba(220,38,38,0.4)" : t === "Blue Team" ? "rgba(59,130,246,0.4)" : "rgba(200,255,62,0.4)"
                          : "rgba(255,255,255,0.08)"}`,
                      }}>{t === "No Preference" ? "No Pref" : t}</button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => setPrefOpen(false)}
                    style={{ flex: 1, padding: "10px", borderRadius: 7, background: "transparent",
                      border: "1px solid #444", color: "#888", fontSize: 14, cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button type="button" onClick={() => addGuest(prefName, prefPosition, prefTeam)}
                    style={{ flex: 2, padding: "10px", borderRadius: 7, background: "#c8ff3e",
                      color: "#000", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer" }}>
                    Add Guest
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="form-actions" style={{ marginTop: 24 }}>
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── tiny layout helpers ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em",
        color: "#666", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid #222" }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="form-group" style={{ flex: 1 }}>
      <label className="form-label" style={{ marginBottom: 6, display: "block", fontSize: 12, color: "#aaa", fontWeight: 600 }}>{label}</label>
      {children}
      {error && <div className="field-error" style={{ marginTop: 4, fontSize: 11, color: "#f87171" }}>{error}</div>}
    </div>
  );
}
