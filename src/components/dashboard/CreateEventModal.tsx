"use client";

import React, { useState, useEffect } from "react";
import "./CreateEventModal.css";
import { buildApiUrl } from "@/utils/api";

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Fetch available turfs
    fetch(buildApiUrl("/turfs"))
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
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Real-time validation
    validateField(name, value);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  const validateField = (name: string, value: string) => {
    const newErrors = { ...errors };

    switch (name) {
      case 'title':
        if (!value.trim()) {
          newErrors.title = 'Event title is required';
        } else if (value.trim().length < 3) {
          newErrors.title = 'Title must be at least 3 characters';
        } else {
          delete newErrors.title;
        }
        break;
      case 'turf':
        if (!value) {
          newErrors.turf = 'Please select a turf';
        } else {
          delete newErrors.turf;
        }
        break;
      case 'date':
        if (!value) {
          newErrors.date = 'Date is required';
        } else {
          const selectedDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (selectedDate < today) {
            newErrors.date = 'Date must be in the future';
          } else {
            delete newErrors.date;
          }
        }
        break;
      case 'time':
        if (!value) {
          newErrors.time = 'Time is required';
        } else {
          delete newErrors.time;
        }
        break;
      case 'format':
        if (!value) {
          newErrors.format = 'Format is required';
        } else {
          delete newErrors.format;
        }
        break;
      case 'feeInRs':
        if (!value) {
          newErrors.feeInRs = 'Fee is required';
        } else if (isNaN(Number(value)) || Number(value) <= 0) {
          newErrors.feeInRs = 'Fee must be a positive number';
        } else {
          delete newErrors.feeInRs;
        }
        break;
      case 'durationMins':
        if (!value) {
          newErrors.durationMins = 'Duration is required';
        } else if (isNaN(Number(value)) || Number(value) < 15) {
          newErrors.durationMins = 'Duration must be at least 15 minutes';
        } else {
          delete newErrors.durationMins;
        }
        break;
    }

    setErrors(newErrors);
  };

  const handleCreate = async () => {
    // Validate all fields
    Object.keys(formData).forEach(key => {
      if (key !== 'cutoffTime') {
        validateField(key, (formData as any)[key]);
      }
    });

    // Check for errors
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Event title is required';
    if (!formData.turf) newErrors.turf = 'Please select a turf';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.time) newErrors.time = 'Time is required';
    if (!formData.feeInRs) newErrors.feeInRs = 'Fee is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const scheduledAt = new Date(`${formData.date}T${formData.time}`);
      const cutoffDt = new Date(scheduledAt.getTime() - 2 * 60 * 60 * 1000); 

      let slots = 10;
      if (formData.format === "6v6") slots = 12;
      else if (formData.format === "7v7") slots = 14;
      else if (formData.format === "8v8") slots = 16;
      else if (formData.format === "9v9") slots = 18;
      else if (formData.format === "10v10") slots = 20;

      const payload = {
        title: formData.title,
        sport: "football",
        format: formData.format,
        turf: formData.turf,
        scheduledAt: scheduledAt.toISOString(),
        durationMins: formData.durationMins,
        cutoffAt: cutoffDt.toISOString(),
        feeInRs: Number(formData.feeInRs),
        community: null,
        totalSlots: slots,
        minPlayers: slots
      };

      const token = localStorage.getItem("authToken");

      if (!token) {
        setErrors({ submit: "Please login as organizer first" });
        return;
      }

      const res = await fetch(buildApiUrl("/games/organisers/create"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = { success: false, message: "Invalid server response" };
      }

      if (!res.ok) {
        setErrors({ submit: data?.message || `Failed to create event (HTTP ${res.status})` });
        return;
      }

      if (data.success) {
        onCreate(data.data);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrors({ submit: data.message || "Failed to create event" });
      }

    } catch (err: any) {
      setErrors({ submit: err.message || "An error occurred" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div 
        className="create-event-overlay" 
        onClick={onClose}
      ></div>

      <div className="create-event-modal">
        {/* Modal Header */}
        <div className="create-event-header">
          <div className="header-content">
            <div className="header-badge">⚽ Create Event</div>
            <h2 className="header-title">Organize a New Game</h2>
            <p className="header-subtitle">Fill in the details to create and notify players</p>
          </div>
          <button 
            className="header-close" 
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Form Content */}
        <form className="create-event-form" onSubmit={(e) => { e.preventDefault(); handleCreate(); }}>
          {/* Error Message */}
          {errors.submit && (
            <div className="form-error-banner">
              <span className="error-icon">⚠️</span>
              <span>{errors.submit}</span>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="form-section">
            <h3 className="section-title">Event Details</h3>
            
            <div className="form-group">
              <label className="form-label">
                <span className="label-text">Event Name</span>
                <span className="label-required">*</span>
              </label>
              <input
                type="text"
                name="title"
                placeholder="e.g. Friday Night Clash"
                value={formData.title}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`form-input ${touched.title && errors.title ? 'error' : ''}`}
              />
              {touched.title && errors.title && (
                <div className="field-error">{errors.title}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-text">Select Venue</span>
                <span className="label-required">*</span>
              </label>
              <select
                name="turf"
                value={formData.turf}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`form-select ${touched.turf && errors.turf ? 'error' : ''}`}
              >
                <option value="">Choose a turf...</option>
                {turfs.map(t => (
                  <option key={t._id} value={t._id}>
                    {t.name} • {t.location?.city}
                  </option>
                ))}
              </select>
              {touched.turf && errors.turf && (
                <div className="field-error">{errors.turf}</div>
              )}
            </div>
          </div>

          {/* Section 2: Date & Time */}
          <div className="form-section">
            <h3 className="section-title">Schedule</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  <span className="label-text">Date</span>
                  <span className="label-required">*</span>
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`form-input ${touched.date && errors.date ? 'error' : ''}`}
                />
                {touched.date && errors.date && (
                  <div className="field-error">{errors.date}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span className="label-text">Time</span>
                  <span className="label-required">*</span>
                </label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`form-input ${touched.time && errors.time ? 'error' : ''}`}
                />
                {touched.time && errors.time && (
                  <div className="field-error">{errors.time}</div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Game Settings */}
          <div className="form-section">
            <h3 className="section-title">Game Configuration</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  <span className="label-text">Format</span>
                  <span className="label-required">*</span>
                </label>
                <select
                  name="format"
                  value={formData.format}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`form-select ${touched.format && errors.format ? 'error' : ''}`}
                >
                  <option value="5v5">5v5 (10 Players)</option>
                  <option value="6v6">6v6 (12 Players)</option>
                  <option value="7v7">7v7 (14 Players)</option>
                  <option value="8v8">8v8 (16 Players)</option>
                  <option value="9v9">9v9 (18 Players)</option>
                  <option value="10v10">10v10 (20 Players)</option>
                </select>
                {touched.format && errors.format && (
                  <div className="field-error">{errors.format}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span className="label-text">Duration</span>
                </label>
                <div className="input-with-unit">
                  <input
                    type="number"
                    name="durationMins"
                    min="15"
                    step="15"
                    value={formData.durationMins}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`form-input ${touched.durationMins && errors.durationMins ? 'error' : ''}`}
                  />
                  <span className="input-unit">min</span>
                </div>
                {touched.durationMins && errors.durationMins && (
                  <div className="field-error">{errors.durationMins}</div>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Fee */}
          <div className="form-section">
            <h3 className="section-title">Entry Fee</h3>
            
            <div className="form-group">
              <label className="form-label">
                <span className="label-text">Fee per Player</span>
                <span className="label-required">*</span>
              </label>
              <div className="input-with-prefix">
                <span className="input-prefix">₹</span>
                <input
                  type="number"
                  name="feeInRs"
                  placeholder="350"
                  min="0"
                  step="10"
                  value={formData.feeInRs}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`form-input ${touched.feeInRs && errors.feeInRs ? 'error' : ''}`}
                />
              </div>
              {touched.feeInRs && errors.feeInRs && (
                <div className="field-error">{errors.feeInRs}</div>
              )}
              <div className="field-hint">
                Amount charged to each player who registers
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="btn-spinner">⏳</span>
                  Creating...
                </>
              ) : (
                <>
                  <span className="btn-icon">✓</span>
                  Create Event & Notify
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}