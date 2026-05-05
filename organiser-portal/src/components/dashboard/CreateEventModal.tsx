"use client";

import React, { useState, useEffect } from "react";
import "./CreateEventModal.css";
import { buildApiUrl, getSession } from "@/utils/api";

const TIME_SLOT_OPTIONS = Array.from({ length: 96 }, (_, idx) => {
  const hours   = Math.floor(idx / 4);
  const minutes = String((idx % 4) * 15).padStart(2, "0");
  const value   = `${String(hours).padStart(2, "0")}:${minutes}`;
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  const period  = hours < 12 ? "AM" : "PM";
  return { value, label: `${displayHour}:${minutes} ${period}` };
});

const FORMATS = ["5v5","6v6","7v7","8v8","9v9","10v10"] as const;
type Format = typeof FORMATS[number];

const slotsFromFormat = (fmt: string) => {
  const parts = fmt.split("v");
  if (parts.length === 2) return parseInt(parts[0]) + parseInt(parts[1]);
  return 10;
};

const addMins = (timeStr: string, date: string, mins: number): string => {
  if (!date || !timeStr) return "";
  const dt = new Date(`${date}T${timeStr}`);
  if (isNaN(dt.getTime())) return "";
  const result = new Date(dt.getTime() + mins * 60000);
  return result.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};

const subtractMins = (timeStr: string, date: string, mins: number): string => {
  return addMins(timeStr, date, -mins);
};

interface Turf { _id: string; name: string; location?: { city?: string }; }

export interface CreateEventModalProps {
  onClose: () => void;
  onCreate: (eventData: any) => void;
  onSuccess?: () => void;
  lastEvent?: any;
}

export function CreateEventModal({ onClose, onCreate, onSuccess, lastEvent }: CreateEventModalProps) {
  const [turfs, setTurfs]     = useState<Turf[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState<Record<string, string>>({});

  // Core form
  const [title, setTitle]           = useState(lastEvent?.title ?? "");
  const [turf, setTurf]             = useState(lastEvent?.turf?._id || (typeof lastEvent?.turf === "string" ? lastEvent.turf : ""));
  const [date, setDate]             = useState("");
  const [time, setTime]             = useState(lastEvent ? (() => { const d = new Date(lastEvent.scheduledAt); return `${String(d.getHours()).padStart(2,"0")}:${d.getMinutes() >= 30 ? "30" : "00"}`; })() : "18:00");
  const [format, setFormat]         = useState<Format>((lastEvent?.format as Format) ?? "5v5");
  const [durationMins, setDuration] = useState(lastEvent?.durationMins ?? 60);
  const [feeInRs, setFeeInRs]       = useState(lastEvent?.feeInPaise ? String(lastEvent.feeInPaise / 100) : "");
  const [reportingMins, setReporting] = useState(lastEvent?.reportingMinsBeforeGame ?? 30);
  const [minPlayers, setMinPlayers] = useState<string>(lastEvent?.minPlayers ? String(lastEvent.minPlayers) : "");
  const [maxPlayers, setMaxPlayers] = useState<string>(lastEvent?.totalSlots ? String(lastEvent.totalSlots) : "");

  // Format change
  const [allowSizeChange, setAllowSizeChange] = useState(lastEvent?.allowSizeChange ?? false);

  // Organiser playing + guests
  const [organiserIsPlaying, setOrganiserPlaying] = useState(lastEvent?.organiserIsPlaying ?? false);
  const [organiserGuestCount, setOrganiserGuestCount] = useState(0);

  // Derived times
  const reportingTime = subtractMins(time, date, reportingMins);
  const endTime       = addMins(time, date, Number(durationMins));

  // Capacity accounting — totalSlots is the hard cap for ALL people
  const hardCap         = Number(maxPlayers) || slotsFromFormat(format);
  const organiserSlot   = organiserIsPlaying ? 1 : 0;
  const reservedSlots   = organiserSlot + organiserGuestCount;
  const openSlots       = Math.max(0, hardCap - reservedSlots);
  const maxGuests       = Math.max(0, hardCap - organiserSlot); // can't bring more guests than remaining cap

  useEffect(() => {
    fetch(buildApiUrl("/api/v1/turfs"))
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setTurfs(d.data);
          if (!turf && d.data.length > 0) setTurf(d.data[0]._id);
        }
      })
      .catch(console.error);
  }, []);

  // Update min/max when format changes
  useEffect(() => {
    const slots = slotsFromFormat(format);
    if (!maxPlayers) setMaxPlayers(String(slots));
    if (!minPlayers) setMinPlayers(String(Math.floor(slots * 0.7)));
  }, [format]);

  const handleCreate = async () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Event title is required";
    if (!turf)         newErrors.turf  = "Please select a turf";
    if (!date)         newErrors.date  = "Date is required";
    if (date && new Date(`${date}T${time}`) <= new Date())
      newErrors.date = "Game must be scheduled in the future";
    if (!feeInRs || isNaN(Number(feeInRs)) || Number(feeInRs) < 0)
      newErrors.feeInRs = "Valid fee is required";
    if (minPlayers && maxPlayers && Number(minPlayers) > Number(maxPlayers))
      newErrors.minMax = "Min players cannot exceed max players";
    // Capacity check: organiser + guests must not exceed totalSlots
    const cap = Number(maxPlayers) || slotsFromFormat(format);
    const orgSlot = organiserIsPlaying ? 1 : 0;
    if (orgSlot + organiserGuestCount > cap) {
      newErrors.submit = `You + ${organiserGuestCount} guest${organiserGuestCount !== 1 ? "s" : ""} exceeds the max of ${cap} players. Reduce guests or increase the player limit.`;
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setLoading(true);
    try {
      const { token } = getSession();
      if (!token) { setErrors({ submit: "Please login as organiser first" }); return; }

      const scheduledAt = new Date(`${date}T${time}`);
      const cutoffAt    = new Date(scheduledAt.getTime() - 2 * 60 * 60 * 1000);
      const slots       = Number(maxPlayers) || slotsFromFormat(format);

      const payload: any = {
        title: title.trim(),
        sport: "football",
        format,
        turf,
        scheduledAt:             scheduledAt.toISOString(),
        durationMins:            Number(durationMins),
        cutoffAt:                cutoffAt.toISOString(),
        feeInRs:                 Number(feeInRs),
        totalSlots:              slots,
        minPlayers:              Number(minPlayers) || Math.floor(slots * 0.7),
        reportingMinsBeforeGame: Number(reportingMins),
        allowSizeChange,
        organiserIsPlaying,
        organiserGuestCount,
        community: null,
      };

      const res  = await fetch(buildApiUrl("/api/v1/games/organisers/create"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrors({ submit: data?.message || `HTTP ${res.status}` });
        return;
      }

      onCreate(data.data);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrors({ submit: err.message || "An error occurred" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="create-event-overlay" onClick={onClose} />
      <div className="create-event-modal">
        {/* Header */}
        <div className="create-event-header">
          <div className="header-content">
            <div className="header-badge">⚽ Create Event</div>
            <h2 className="header-title">Organise a New Game</h2>
            <p className="header-subtitle">
              {lastEvent ? "Pre-filled from your last event — update the date." : "Fill in the details to create and notify players."}
            </p>
          </div>
          <button className="header-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form className="create-event-form" onSubmit={(e) => { e.preventDefault(); handleCreate(); }}>
          {errors.submit && (
            <div className="form-error-banner">
              <span className="error-icon">⚠️</span>
              <span>{errors.submit}</span>
            </div>
          )}

          {/* ── Event Details ── */}
          <div className="form-section">
            <h3 className="section-title">Event Details</h3>
            <div className="form-group">
              <label className="form-label">
                <span className="label-text">Event Name</span>
                <span className="label-required">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Friday Night Clash"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`form-input ${errors.title ? "error" : ""}`}
              />
              {errors.title && <div className="field-error">{errors.title}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-text">Turf / Venue</span>
                <span className="label-required">*</span>
              </label>
              <select
                value={turf}
                onChange={(e) => setTurf(e.target.value)}
                className={`form-select ${errors.turf ? "error" : ""}`}
              >
                <option value="">Choose a turf…</option>
                {turfs.map((t) => (
                  <option key={t._id} value={t._id}>{t.name} • {t.location?.city}</option>
                ))}
              </select>
              {errors.turf && <div className="field-error">{errors.turf}</div>}
            </div>
          </div>

          {/* ── Schedule ── */}
          <div className="form-section">
            <h3 className="section-title">Schedule</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label"><span className="label-text">Date</span><span className="label-required">*</span></label>
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDate(e.target.value)}
                  className={`form-input ${errors.date ? "error" : ""}`}
                />
                {errors.date && <div className="field-error">{errors.date}</div>}
              </div>

              <div className="form-group">
                <label className="form-label"><span className="label-text">Game Start Time</span></label>
                <select value={time} onChange={(e) => setTime(e.target.value)} className="form-select">
                  {TIME_SLOT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label"><span className="label-text">Players Report</span></label>
                <select
                  value={String(reportingMins)}
                  onChange={(e) => setReporting(Number(e.target.value))}
                  className="form-select"
                >
                  {[15,30,45,60].map((m) => (
                    <option key={m} value={m}>{m} mins before game{reportingTime && date ? ` (${reportingTime})` : ""}</option>
                  ))}
                </select>
                <div className="field-hint">Time players should arrive at the turf</div>
              </div>

              <div className="form-group">
                <label className="form-label"><span className="label-text">Duration</span></label>
                <div className="input-with-unit">
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={durationMins}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="form-input"
                  />
                  <span className="input-unit">min</span>
                </div>
                {endTime && date && (
                  <div className="field-hint">Game ends at <strong>{endTime}</strong></div>
                )}
              </div>
            </div>
          </div>

          {/* ── Game Configuration ── */}
          <div className="form-section">
            <h3 className="section-title">Game Configuration</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label"><span className="label-text">Format</span><span className="label-required">*</span></label>
                <select
                  value={format}
                  onChange={(e) => {
                    const f = e.target.value as Format;
                    setFormat(f);
                    const s = slotsFromFormat(f);
                    setMaxPlayers(String(s));
                    setMinPlayers(String(Math.floor(s * 0.7)));
                  }}
                  className="form-select"
                >
                  {FORMATS.map((f) => (
                    <option key={f} value={f}>{f} ({slotsFromFormat(f)} Players)</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label"><span className="label-text">Fee per Player</span><span className="label-required">*</span></label>
                <div className="input-with-prefix">
                  <span className="input-prefix">₹</span>
                  <input
                    type="number"
                    placeholder="e.g. 350"
                    min="0"
                    step="1"
                    value={feeInRs}
                    onChange={(e) => setFeeInRs(e.target.value)}
                    className={`form-input ${errors.feeInRs ? "error" : ""}`}
                  />
                </div>
                {errors.feeInRs && <div className="field-error">{errors.feeInRs}</div>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label"><span className="label-text">Min Players Required</span></label>
                <input
                  type="number"
                  min="2"
                  max={maxPlayers || undefined}
                  value={minPlayers}
                  onChange={(e) => {
                    const val = e.target.value;
                    const max = Number(maxPlayers);
                    if (max && Number(val) > max) setMinPlayers(String(max));
                    else setMinPlayers(val);
                  }}
                  placeholder={String(Math.floor(slotsFromFormat(format) * 0.7))}
                  className={`form-input ${errors.minMax ? "error" : ""}`}
                />
                <div className="field-hint">Minimum to confirm the game</div>
              </div>

              <div className="form-group">
                <label className="form-label"><span className="label-text">Max Players Allowed</span></label>
                <input
                  type="number"
                  min={minPlayers || "2"}
                  value={maxPlayers}
                  onChange={(e) => {
                    const val = e.target.value;
                    const min = Number(minPlayers);
                    if (min && Number(val) < min) setMaxPlayers(String(min));
                    else setMaxPlayers(val);
                  }}
                  placeholder={String(slotsFromFormat(format))}
                  className={`form-input ${errors.minMax ? "error" : ""}`}
                />
                {errors.minMax && <div className="field-error">{errors.minMax}</div>}
                <div className="field-hint">Total slots available</div>
              </div>
            </div>
          </div>

          {/* ── Format Change Option ── */}
          <div className="form-section">
            <h3 className="section-title">Format Change</h3>
            <div className="form-group">
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={allowSizeChange}
                  onChange={(e) => setAllowSizeChange(e.target.checked)}
                  className="toggle-checkbox"
                />
                <span className="toggle-label">Allow format change if needed</span>
              </label>
              <div className="field-hint">Enable alternate formats if the primary format can't be filled</div>
            </div>
          </div>

          {/* ── Organiser Participation ── */}
          <div className="form-section">
            <h3 className="section-title">Your Participation</h3>
            <div className="form-group">
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={organiserIsPlaying}
                  onChange={(e) => {
                    setOrganiserPlaying(e.target.checked);
                    // If unchecking and guest count now exceeds cap, clamp it
                    if (!e.target.checked && organiserGuestCount > hardCap) {
                      setOrganiserGuestCount(hardCap);
                    }
                  }}
                  className="toggle-checkbox"
                />
                <span className="toggle-label">I want to play in this game</span>
              </label>
              <div className="field-hint">
                Check this if you as the organiser will also be playing — uses 1 slot from the total
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-text">Guests you&apos;re bringing</span>
              </label>
              <div className="guest-stepper">
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setOrganiserGuestCount((n) => Math.max(0, n - 1))}
                  disabled={organiserGuestCount === 0}
                >−</button>
                <span className="stepper-val">{organiserGuestCount}</span>
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setOrganiserGuestCount((n) => Math.min(maxGuests, n + 1))}
                  disabled={organiserGuestCount >= maxGuests}
                >+</button>
                {organiserGuestCount > 0 && (
                  <span className="stepper-hint">
                    {organiserGuestCount} guest slot{organiserGuestCount > 1 ? "s" : ""} reserved
                  </span>
                )}
              </div>
              <div className="field-hint">Each guest uses 1 slot from the total capacity</div>
            </div>

            {/* Live capacity summary */}
            <div style={{
              background: openSlots === 0 ? "rgba(220,38,38,0.08)" : "rgba(200,255,62,0.06)",
              border: `1px solid ${openSlots === 0 ? "rgba(220,38,38,0.3)" : "rgba(200,255,62,0.2)"}`,
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              color: "#ccc",
              display: "flex",
              flexDirection: "column" as const,
              gap: 4,
            }}>
              <div style={{ fontWeight: 600, color: openSlots === 0 ? "#f87171" : "#c8ff3e" }}>
                {openSlots === 0
                  ? "⚠️ No open slots — all capacity is reserved"
                  : `✓ ${openSlots} open slot${openSlots !== 1 ? "s" : ""} for players to book seats`}
              </div>
              <div style={{ color: "#888", fontSize: 12 }}>
                Total cap: {hardCap}
                {organiserSlot > 0 && ` · You: 1`}
                {organiserGuestCount > 0 && ` · Your guests: ${organiserGuestCount}`}
                {` · Open: ${openSlots}`}
              </div>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? <><span className="btn-spinner">⏳</span> Creating…</> : <><span className="btn-icon">✓</span> Create Event</>}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
