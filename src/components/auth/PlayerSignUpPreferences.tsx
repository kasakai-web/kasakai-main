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
    <div style={{ background: "var(--dark-navy)", padding: "40px 30px", borderRadius: "12px", border: "1px solid #333" }}>
      <button
        onClick={onBack}
        style={{
          background: "transparent",
          color: "var(--yellow)",
          border: "none",
          fontSize: "14px",
          cursor: "pointer",
          marginBottom: "20px",
          padding: 0,
        }}
      >
        ← Back
      </button>

      <h1 style={{ color: "var(--yellow)", fontSize: "28px", marginBottom: "10px" }}>Your Preferences</h1>
      <p style={{ color: "#999", marginBottom: "30px", fontSize: "14px" }}>Step 2 of 3: Tell us about your game</p>

      <form onSubmit={handleContinue}>
        {/* City */}
        <div style={{ marginBottom: "28px" }}>
          <label htmlFor="signup-city" style={{ color: "#ccc", fontSize: "14px", display: "block", marginBottom: "6px" }}>
            City *
          </label>
          <p style={{ color: "#666", fontSize: "12px", marginBottom: "12px" }}>Where do you usually play?</p>
          <select
            id="signup-city"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setErrors({ ...errors, city: "" });
            }}
            required
            style={{
              width: "100%",
              background: "#1a1a2e",
              border: `1px solid ${errors.city ? "#ff6b6b" : "#444"}`,
              borderRadius: "6px",
              padding: "12px",
              color: city ? "white" : "#666",
              fontSize: "16px",
              outline: "none",
              cursor: "pointer",
              boxSizing: "border-box",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--yellow)")}
            onBlur={(e) => (e.target.style.borderColor = errors.city ? "#ff6b6b" : "#444")}
          >
            <option value="" disabled>
              Select your city
            </option>
            {CITIES.map((c) => (
              <option key={c.slug} value={c.slug} style={{ color: "white" }}>
                {c.label}
              </option>
            ))}
          </select>
          {errors.city && (
            <small style={{ color: "#ff6b6b", fontSize: "12px", display: "block", marginTop: "8px" }}>{errors.city}</small>
          )}
        </div>

        <div style={{ marginBottom: "28px" }}>
          <label style={{ color: "#ccc", fontSize: "14px", display: "block", marginBottom: "6px" }}>
            Preferred Position * <span style={{ color: "#666", fontWeight: 400 }}>(pick one)</span>
          </label>
          <p style={{ color: "#666", fontSize: "12px", marginBottom: "12px" }}>
            Football — where do you like to play?
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {POSITIONS.slice(0, 4).map((pos) => {
              const isSelected = selected === pos.id;
              return (
                <button
                  key={pos.id}
                  type="button"
                  onClick={() => selectPosition(pos.id)}
                  style={{
                    background: isSelected ? "var(--yellow)" : "#1a1a2e",
                    color: isSelected ? "black" : "#ccc",
                    border: isSelected ? "1px solid var(--yellow)" : "1px solid #444",
                    borderRadius: "8px",
                    padding: "14px 10px",
                    fontSize: "14px",
                    fontWeight: isSelected ? "700" : "400",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "18px", fontWeight: "700", marginBottom: "2px" }}>{pos.short}</div>
                  <div style={{ fontSize: "11px", opacity: 0.8 }}>{pos.label}</div>
                </button>
              );
            })}
          </div>
          {/* ANY option — full width */}
          <button
            type="button"
            onClick={() => selectPosition("ANY")}
            style={{
              width: "100%",
              marginTop: "10px",
              background: selected === "ANY" ? "var(--yellow)" : "#1a1a2e",
              color: selected === "ANY" ? "black" : "#ccc",
              border: selected === "ANY" ? "1px solid var(--yellow)" : "1px solid #444",
              borderRadius: "8px",
              padding: "14px 10px",
              fontSize: "14px",
              fontWeight: selected === "ANY" ? "700" : "400",
              cursor: "pointer",
              transition: "all 0.2s ease",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "18px", fontWeight: "700" }}>ANY</div>
          </button>
          {errors.positions && (
            <small style={{ color: "#ff6b6b", fontSize: "12px", display: "block", marginTop: "8px" }}>{errors.positions}</small>
          )}
        </div>

        <button
          type="submit"
          style={{
            width: "100%",
            background: "var(--yellow)",
            color: "black",
            border: "none",
            padding: "12px",
            borderRadius: "6px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "background 0.3s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#ffd700")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--yellow)")}
        >
          Continue
        </button>

        <button
          type="button"
          onClick={handleSkip}
          style={{
            width: "100%",
            background: "transparent",
            color: "#666",
            border: "none",
            padding: "12px",
            fontSize: "13px",
            cursor: "pointer",
            marginTop: "8px",
          }}
        >
          Skip for now
        </button>
      </form>
    </div>
  );
}
