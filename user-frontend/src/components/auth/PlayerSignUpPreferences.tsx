"use client";

import { useState } from "react";

const POSITIONS = [
  { id: "GK", label: "Goalkeeper", short: "GK" },
  { id: "DEF", label: "Defender", short: "DEF" },
  { id: "MID", label: "Midfielder", short: "MID" },
  { id: "FWD", label: "Forward", short: "FWD" },
];

interface PlayerSignUpPreferencesProps {
  onBack: () => void;
  onContinue: (data: { positions: string[]; preferredLocations: string[] }) => void;
}

export function PlayerSignUpPreferences({ onBack, onContinue }: PlayerSignUpPreferencesProps) {
  const [positions, setPositions] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const togglePosition = (id: string) => {
    setErrors({ ...errors, positions: "" });
    if (positions.includes(id)) {
      setPositions(positions.filter((p) => p !== id));
    } else if (positions.length < 2) {
      setPositions([...positions, id]);
    }
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (positions.length === 0) newErrors.positions = "Select at least one position";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onContinue({ positions, preferredLocations: [] });
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
        <div style={{ marginBottom: "28px" }}>
          <label style={{ color: "#ccc", fontSize: "14px", display: "block", marginBottom: "6px" }}>
            Preferred Position * <span style={{ color: "#666", fontWeight: 400 }}>(pick up to 2)</span>
          </label>
          <p style={{ color: "#666", fontSize: "12px", marginBottom: "12px" }}>
            Football — where do you like to play?
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {POSITIONS.map((pos) => {
              const selected = positions.includes(pos.id);
              const disabled = !selected && positions.length >= 2;
              return (
                <button
                  key={pos.id}
                  type="button"
                  onClick={() => !disabled && togglePosition(pos.id)}
                  style={{
                    background: selected ? "var(--yellow)" : "#1a1a2e",
                    color: selected ? "black" : disabled ? "#555" : "#ccc",
                    border: selected ? "1px solid var(--yellow)" : "1px solid #444",
                    borderRadius: "8px",
                    padding: "14px 10px",
                    fontSize: "14px",
                    fontWeight: selected ? "700" : "400",
                    cursor: disabled ? "not-allowed" : "pointer",
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
          onClick={() => onContinue({ positions: [], preferredLocations: [] })}
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
