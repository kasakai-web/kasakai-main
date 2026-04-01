"use client";

import React, { useState } from "react";

interface CreateEventModalProps {
  onClose: () => void;
  onCreate: (eventData: any) => void;
}

export function CreateEventModal({ onClose, onCreate }: CreateEventModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    venue: "",
    date: "",
    time: "18:00",
    format: "5v5",
    cutoffTime: "16:00",
    fee: "",
    maxPlayers: 10,
    notes: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreate = () => {
    if (!formData.title || !formData.venue || !formData.date || !formData.time || !formData.fee) {
      alert("Please fill all required fields.");
      return;
    }
    onCreate(formData);
  };

  return (
    <>
      <div className="overlay show" onClick={onClose}></div>
      <div className="create-modal show" style={{ opacity: 1, pointerEvents: "all", transform: "translate(-50%, -50%) scale(1)" }}>
        <div className="bm-header">
          <div className="bm-title-group">
            <div className="bm-eyebrow">Organiser</div>
            <div className="bm-title">Create New<br/>Game</div>
          </div>
          <button className="bm-close" onClick={onClose}>✕</button>
        </div>
        <div className="bm-body">
          <div className="form-grid">
            <div className="form-field full">
              <div className="form-label">Game Title *</div>
              <input className="form-input" type="text" name="title" placeholder="e.g. Urban Turf Match" value={formData.title} onChange={handleChange} />
            </div>
            <div className="form-field full">
              <div className="form-label">Venue Name *</div>
              <input className="form-input" type="text" name="venue" placeholder="e.g. Urban Turf, Mumbai" value={formData.venue} onChange={handleChange} />
            </div>
            <div className="form-field">
              <div className="form-label">Date *</div>
              <input className="form-input" type="date" name="date" value={formData.date} onChange={handleChange} />
            </div>
            <div className="form-field">
              <div className="form-label">Time *</div>
              <input className="form-input" type="time" name="time" value={formData.time} onChange={handleChange} />
            </div>
            <div className="form-field">
              <div className="form-label">Format *</div>
              <select className="form-select" name="format" value={formData.format} onChange={handleChange}>
                <option value="5v5">5v5</option>
                <option value="6v6">6v6</option>
                <option value="7v7">7v7</option>
                <option value="8v8">8v8</option>
                <option value="9v9">9v9</option>
                <option value="10v10">10v10</option>
              </select>
            </div>
            <div className="form-field">
              <div className="form-label">Max Players *</div>
              <input className="form-input" type="number" name="maxPlayers" value={formData.maxPlayers} onChange={handleChange} />
            </div>
            <div className="form-field full">
              <div className="form-label">Fee per Player (₹) *</div>
              <div className="fee-row" style={{ display: 'flex' }}>
                <span className="fee-currency" style={{ background: "var(--mid)", border: "1px solid var(--border)", borderRight: "none", padding: "10px 12px", fontFamily: "var(--mono)", fontSize: "13px", color: "var(--muted)", flexShrink: 0 }}>₹</span>
                <input className="form-input" type="number" name="fee" placeholder="350" value={formData.fee} onChange={handleChange} style={{ borderLeft: "none" }} />
              </div>
            </div>
            <div className="form-field full">
              <div className="form-label">Notes for Players (optional)</div>
              <input className="form-input" type="text" name="notes" placeholder="e.g. Bring bibs, parking at Gate 2" value={formData.notes} onChange={handleChange} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            <button className="bm-confirm-btn" style={{ flex: 1 }} onClick={handleCreate}>
              <span>Create Event & Notify</span>
            </button>
            <button className="bm-close" style={{ width: "auto", padding: "0 20px", flexShrink: 0 }} onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </>
  );
}