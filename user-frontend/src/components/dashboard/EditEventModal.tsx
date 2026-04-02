"use client";

import React, { useState } from "react";

interface EditEventModalProps {
  gameId: string;
  initialData: {
    title: string;
    format: string;
    totalSlots: number;
    feeInPaise: number;
    durationMins: number;
    minPlayers: number;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function EditEventModal({ gameId, initialData, onClose, onSuccess }: EditEventModalProps) {
  const [formData, setFormData] = useState({
    title: initialData.title,
    format: initialData.format,
    totalSlots: initialData.totalSlots,
    feeInRs: initialData.feeInPaise / 100,
    durationMins: initialData.durationMins,
    minPlayers: initialData.minPlayers,
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");

      const response = await fetch(`http://localhost:5000/api/v1/games/${gameId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        alert('Event updated successfully!');
        onSuccess();
        onClose();
      } else {
        alert(`Failed to update event: ${data.message}`);
      }
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to update event. Please try again.');
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
            <label>Format (e.g., 5v5)</label>
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
                onChange={(e) => setFormData({ ...formData, totalSlots: parseInt(e.target.value) })}
                min="1"
                required
              />
            </div>

            <div className="form-group">
              <label>Minimum Players</label>
              <input
                type="number"
                value={formData.minPlayers}
                onChange={(e) => setFormData({ ...formData, minPlayers: parseInt(e.target.value) })}
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
                onChange={(e) => setFormData({ ...formData, feeInRs: parseFloat(e.target.value) })}
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
                onChange={(e) => setFormData({ ...formData, durationMins: parseInt(e.target.value) })}
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
              {loading ? 'Updating...' : 'Update Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
