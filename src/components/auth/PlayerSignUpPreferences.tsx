"use client";

import { useState } from "react";

const POSITIONS = [
  { id: "GK",  label: "Goalkeeper",    short: "GK"  },
  { id: "DEF", label: "Defender",      short: "DEF" },
  { id: "MID", label: "Midfielder",    short: "MID" },
  { id: "FWD", label: "Forward",       short: "FWD" },
  { id: "ANY", label: "Any Position",  short: "ANY" },
];

interface PlayerSignUpPreferencesProps {
  onBack: () => void;
  onContinue: (data: { positions: string[]; preferredLocations: string[] }) => void;
}

export function PlayerSignUpPreferences({ onBack, onContinue }: PlayerSignUpPreferencesProps) {
  const [selected, setSelected] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectPosition = (id: string) => {
    setErrors({ ...errors, positions: "" });
    setSelected((prev) => (prev === id ? "" : id));
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) {
      setErrors({ positions: "Select your preferred position" });
      return;
    }
    onContinue({ positions: [selected], preferredLocations: [] });
  };

  return (
    <div className="auth-card">
      <button onClick={onBack} className="auth-linkbtn" style={{ marginBottom: "20px", display: "block" }}>
        ← Back
      </button>

      <div className="auth-head">
        <div className="auth-eyebrow">Step 2 of 3 · Your game</div>
        <h1 className="auth-title">
          Your<br />
          <span className="accent">Preferences</span>
        </h1>
        <p className="auth-lead">Football — where do you like to play?</p>
      </div>

      <form onSubmit={handleContinue} className="auth-form">
        <div className="auth-field">
          <label className="auth-label">Preferred Position * (pick one)</label>

          <div className="auth-chip-grid">
            {POSITIONS.slice(0, 4).map((pos) => (
              <button
                key={pos.id}
                type="button"
                onClick={() => selectPosition(pos.id)}
                className={`auth-chip${selected === pos.id ? " selected" : ""}`}
                aria-pressed={selected === pos.id}
              >
                <div className="auth-chip-short">{pos.short}</div>
                <div className="auth-chip-label">{pos.label}</div>
              </button>
            ))}
          </div>

          {/* ANY option — full width */}
          <button
            type="button"
            onClick={() => selectPosition("ANY")}
            className={`auth-chip${selected === "ANY" ? " selected" : ""}`}
            aria-pressed={selected === "ANY"}
            style={{ width: "100%" }}
          >
            <div className="auth-chip-short">ANY</div>
            <div className="auth-chip-label">Any Position</div>
          </button>

          {errors.positions && <span className="auth-err">{errors.positions}</span>}
        </div>

        <button type="submit" className="btn-primary btn-block">
          <span>Continue</span>
        </button>

        <button
          type="button"
          onClick={() => onContinue({ positions: [], preferredLocations: [] })}
          className="auth-linkbtn"
        >
          Skip for now
        </button>
      </form>
    </div>
  );
}
