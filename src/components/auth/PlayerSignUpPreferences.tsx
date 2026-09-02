"use client";

import { useState } from "react";

const POSITIONS = [
  { id: "GK",  label: "Goalkeeper",    short: "GK"  },
  { id: "DEF", label: "Defender",      short: "DEF" },
  { id: "MID", label: "Midfielder",    short: "MID" },
  { id: "FWD", label: "Forward",       short: "FWD" },
  { id: "ANY", label: "Any Position",  short: "ANY" },
];

// Saved to Player.location.city. These labels are resolved server-side by the
// metro registry (src/utils/metro.js), so adding a city here only needs a label
// the registry already knows — that is what drives the browse list's city.
// const CITIES = ["Delhi", "Mumbai"];
const CITIES=[{
  slug: "delhi-ncr",
  label: "Delhi",
},{
  slug: "mumbai",
  label: "Mumbai",
}]

interface PlayerSignUpPreferencesProps {
  onBack: () => void;
  onContinue: (data: { positions: string[]; preferredLocations: string[]; city: string }) => void;
}

export function PlayerSignUpPreferences({ onBack, onContinue }: PlayerSignUpPreferencesProps) {
  const [selected, setSelected] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectPosition = (id: string) => {
    setErrors({ ...errors, positions: "" });
    setSelected((prev) => (prev === id ? "" : id));
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!selected) newErrors.positions = "Select your preferred position";
    if (!city) newErrors.city = "Select your city";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onContinue({ positions: [selected], preferredLocations: [], city });
  };

  // "Skip" drops the position only — city is required either way.
  const handleSkip = () => {
    if (!city) {
      setErrors({ city: "Select your city" });
      return;
    }
    onContinue({ positions: [], preferredLocations: [], city });
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
        {/* Both Continue and Skip refuse to proceed without a city, so the
            select has to survive the restyle — dropping it strands the form. */}
        <div className="auth-field">
          <label className="auth-label" htmlFor="signup-city">City *</label>
          <div className={`auth-input-shell${errors.city ? " invalid" : ""}`}>
            <select
              id="signup-city"
              className="auth-input"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setErrors({ ...errors, city: "" });
              }}
              required
              style={{ cursor: "pointer", color: city ? "var(--white)" : "#555" }}
            >
              {/* Native option lists ignore the shell's styling, so each one
                  carries its own dark background or it renders unreadable. */}
              <option value="" disabled style={{ background: "#1a1a2e", color: "#666" }}>
                Select your city
              </option>
              {CITIES.map((c) => (
                <option key={c.slug} value={c.slug} style={{ background: "#1a1a2e", color: "white" }}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          {errors.city && <span className="auth-err">{errors.city}</span>}
        </div>

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
          onClick={handleSkip}
          className="auth-linkbtn"
        >
          Skip for now
        </button>
      </form>
    </div>
  );
}
