"use client";

import React, { useState, useEffect } from "react";

interface Turf {
  _id: string;
  name: string;
  location: {
    city: string;
  };
}

export interface CreateEventModalProps {
  onClose: () => void;
  onCreate: (eventData: any) => void;
  onSuccess?: () => void;
}

export function CreateEventModal({ onClose, onCreate, onSuccess }: CreateEventModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    turf: "",
    date: "",
    time: "18:00",
    format: "5v5",
    feeInRs: "",
    durationMins: 60,
    cutoffTime: "16:00",
  });

  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Fetch available turfs
    fetch("http://localhost:5000/api/v1/turfs")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTurfs(data.data);
          if (data.data.length > 0) {
            setFormData(prev => ({ ...prev, turf: data.data[0]._id }));
          }
        }
      })
      .catch(err => console.error("Error fetching turfs:", err));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));        
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.turf || !formData.date || !formData.time || !formData.feeInRs) {
      setError("Please fill all required fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const scheduledAt = new Date(`${formData.date}T${formData.time}`);
      const cutoffDt = new Date(scheduledAt.getTime() - 2 * 60 * 60 * 1000); 

      const payload = {
        title: formData.title,
        sport: "football",
        format: formData.format,
        turf: formData.turf,
        scheduledAt: scheduledAt.toISOString(),
        durationMins: formData.durationMins,
        cutoffAt: cutoffDt.toISOString(),
        feeInRs: Number(formData.feeInRs),
        community: null
      };

      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      
      const res = await fetch("http://localhost:5000/api/v1/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setError(data.message || "Failed to create event");
      }

    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="overlay show" onClick={onClose}></div>
      <div className="create-modal show" style={{ opacity: 1, pointerEvents: "all", transform: "translate(-50%, -50%) scale(1)", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="bm-header">
          <div className="bm-title-group">
            <div className="bm-eyebrow">Organiser</div>
            <div className="bm-title">Create New<br/>Game</div>
          </div>
          <button className="bm-close" onClick={onClose}>×</button>
        </div>
        <div className="bm-body">
          {error && <div style={{ color: "red", fontSize: "12px", marginBottom: "10px" }}>{error}</div>}
          
          <div className="form-grid">
            <div className="form-field full">
              <div className="form-label">Game Title *</div>
              <input className="form-input" type="text" name="title" placeholder="e.g. Friday Night Clash" value={formData.title} onChange={handleChange} />      
            </div>
            
            <div className="form-field full">
              <div className="form-label">Select Turf *</div>
              <select className="form-select" name="turf" value={formData.turf} onChange={handleChange}>
                {turfs.map(t => (
                  <option key={t._id} value={t._id}>{t.name} ({t.location?.city})</option>
                ))}
              </select>
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
              <div className="form-label">Duration (Mins)</div>
              <input className="form-input" type="number" name="durationMins" value={formData.durationMins} onChange={handleChange} />
            </div>
            
            <div className="form-field full">
              <div className="form-label">Fee per Player (₹) *</div>
              <div className="fee-row" style={{ display: 'flex' }}>
                <span className="fee-currency" style={{ background: "var(--mid)", border: "1px solid var(--border)", borderRight: "none", padding: "10px 12px", fontFamily: "var(--mono)", fontSize: "13px", color: "var(--muted)", flexShrink: 0 }}>₹</span>
                <input className="form-input" type="number" name="feeInRs" placeholder="350" value={formData.feeInRs} onChange={handleChange} style={{ borderLeft: "none", width: "100%" }} />
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>     
            <button className="bm-confirm-btn" style={{ flex: 1 }} onClick={handleCreate} disabled={loading}>
              <span>{loading ? "Creating..." : "Create Event & Notify"}</span>
            </button>
            <button className="bm-close" style={{ width: "auto", padding: "0 20px", flexShrink: 0 }} onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </>
  );
}