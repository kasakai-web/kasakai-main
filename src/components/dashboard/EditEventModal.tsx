"use client";

import React, { useEffect, useMemo, useState } from "react";
import { buildApiUrl } from "@/utils/api";

interface Turf {
  _id: string;
  name: string;
  location: {
    city: string;
  };
}

interface EditEventModalProps {
  gameId: string;
  initialData: {
    title: string;
    format: string;
    totalSlots: number;
    feeInPaise: number;
    durationMins: number;
    minPlayers: number;
    turf?: Turf;
    scheduledAt?: string;
    status?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function EditEventModal({ gameId, initialData, onClose, onSuccess }: EditEventModalProps) {
  const initialDateTime = useMemo(() => {
    const scheduled = initialData.scheduledAt ? new Date(initialData.scheduledAt) : null;
    return {
      date: scheduled ? scheduled.toISOString().split("T")[0] : "",
      time: scheduled ? scheduled.toTimeString().slice(0, 5) : "18:00",
    };
  }, [initialData.scheduledAt]);

  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: initialData.title,
    turf: initialData.turf?._id || "",
    date: initialDateTime.date,
    time: initialDateTime.time,
    status: initialData.status || "open",
    format: initialData.format,
    totalSlots: initialData.totalSlots,
    feeInRs: initialData.feeInPaise / 100,
    durationMins: initialData.durationMins,
    minPlayers: initialData.minPlayers,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(buildApiUrl("/turfs"))
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTurfs(data.data || []);
        }
      })
      .catch((error) => console.error("Error fetching turfs:", error));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        alert("Please login as organizer first");
        return;
      }

      const scheduledAt = formData.date && formData.time
        ? new Date(`${formData.date}T${formData.time}`)
        : null;
      const cutoffAt = scheduledAt
        ? new Date(scheduledAt.getTime() - 2 * 60 * 60 * 1000)
        : null;

      const payload: any = {
        title: formData.title,
        turf: formData.turf,
        scheduledAt: scheduledAt ? scheduledAt.toISOString() : undefined,
        cutoffAt: cutoffAt ? cutoffAt.toISOString() : undefined,
        status: formData.status,
        format: formData.format,
        totalSlots: Number(formData.totalSlots),
        feeInRs: Number(formData.feeInRs),
        durationMins: Number(formData.durationMins),
        minPlayers: Number(formData.minPlayers),
      };

      const response = await fetch(buildApiUrl(`/api/v1/games/organisers/${gameId}`), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get("content-type") || "";
      const responseText = await response.text();
      const data = contentType.includes("application/json")
        ? JSON.parse(responseText)
        : { success: false, message: responseText || `HTTP ${response.status}` };

      if (!response.ok || !data.success) {
        setErrors({ submit: data.message || `HTTP ${response.status}` });
        return;
      }

      alert("Event updated successfully!");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error updating event:", error);
      setErrors({ submit: (error as Error).message || "Failed to update event" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content edit-event-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Event</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="edit-form">
          {errors.submit && <div className="form-error-banner">{errors.submit}</div>}

          <div className="form-group">
            <label>Event Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Venue</label>
            <select
              value={formData.turf}
              onChange={(e) => setFormData({ ...formData, turf: e.target.value })}
              required
            >
              <option value="">Select a venue</option>
              {turfs.map((turf) => (
                <option key={turf._id} value={turf._id}>
                  {turf.name} - {turf.location?.city}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Time</label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              required
            >
              <option value="draft">Draft</option>
              <option value="open">Open</option>
              <option value="tentative">Tentative</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="form-group">
            <label>Format</label>
            <input
              type="text"
              value={formData.format}
              onChange={(e) => setFormData({ ...formData, format: e.target.value })}
              placeholder="5v5"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Total Slots</label>
              <input
                type="number"
                value={formData.totalSlots}
                onChange={(e) => setFormData({ ...formData, totalSlots: parseInt(e.target.value, 10) || 0 })}
                min="1"
                required
              />
            </div>

            <div className="form-group">
              <label>Minimum Players</label>
              <input
                type="number"
                value={formData.minPlayers}
                onChange={(e) => setFormData({ ...formData, minPlayers: parseInt(e.target.value, 10) || 0 })}
                min="1"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Fee (₹)</label>
              <input
                type="number"
                value={formData.feeInRs}
                onChange={(e) => setFormData({ ...formData, feeInRs: parseFloat(e.target.value) || 0 })}
                min="0"
                step="10"
                required
              />
            </div>

            <div className="form-group">
              <label>Duration (minutes)</label>
              <input
                type="number"
                value={formData.durationMins}
                onChange={(e) => setFormData({ ...formData, durationMins: parseInt(e.target.value, 10) || 0 })}
                min="15"
                step="15"
                required
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? "Updating..." : "Update Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}