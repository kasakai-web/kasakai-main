"use client";

import Image from "next/image";
import React from "react";

/**
 * Shared "how I'd like to play" controls.
 *
 * Used by the booking modal and by the invite-link / invitation confirm modal so
 * that joining through a link is not a second-class way in — whichever door a
 * player comes through, they get the same say over position, shirt and who they
 * line up with.
 *
 * Inline styles rather than the booking modal's stylesheet classes, because the
 * invite modal is styled inline and these blocks have to look identical in both.
 */

export type RosterEntry = {
  id: string;          // player id, or `guest:<name>` for a +1
  name: string;
  isGuest?: boolean;
};

export type TeamRequest = {
  playerId?: string;
  guestName?: string;
  relation: "with" | "against";
};

export const MAX_TEAM_REQUESTS = 3;

const LIME = "#c8ff3e";

/**
 * The honest caveat.
 *
 * Everything a player picks here is a preference, not a promise — the
 * distributor weighs shirt colour last, behind keeping the sides even, and only
 * so many people can wear red. Saying so up front is the difference between
 * "the app ignored me" and "fair enough".
 */
export function PreferenceDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
        padding: compact ? "9px 11px" : "10px 12px",
        borderRadius: 9,
        background: "rgba(245,158,11,0.07)",
        border: "1px solid rgba(245,158,11,0.22)",
        marginTop: 10,
      }}
    >
    <Image src="/info.png" alt="Info Button"
              width={15}
              height={15}
              style={{ lineHeight: 1.4, objectFit: "contain", display: "block",marginBottom:"3px", transition: "opacity 0.15s ease", cursor: "pointer"}}
            />
      <div style={{ fontSize: 11.5, color: "#d6b26a", lineHeight: 1.55 }}>
        These are preferences, not guarantees. Teams are balanced on skill, position
        and goalkeeping first, so your final side and shirt colour may differ from
        what you pick here. You&apos;ll be told why when teams are published.
      </div>
    </div>
  );
}

const pillStyle = (selected: boolean, tone?: "red" | "blue"): React.CSSProperties => {
  const accent = tone === "red" ? "#ff6b6b" : tone === "blue" ? "#74b9ff" : LIME;
  return {
    padding: "6px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    border: `1px solid ${selected ? accent : "#2f2f2f"}`,
    background: selected ? `${accent}1f` : "#161616",
    color: selected ? accent : "#9a9a9a",
    transition: "all .15s ease",
  };
};

const POSITIONS: { value: string; label: string }[] = [
  { value: "Any", label: "Any" },
  { value: "GK",  label: "GK" },
  { value: "DEF", label: "DEF" },
  { value: "MID", label: "MID" },
  { value: "FWD", label: "FWD" },
];

const TEAMS: { value: string; label: string; tone?: "red" | "blue" }[] = [
  { value: "No Preference", label: "No preference" },
  { value: "Red Team",      label: "Red",  tone: "red" },
  { value: "Blue Team",     label: "Blue", tone: "blue" },
];

/**
 * Compact position + shirt picker, for surfaces that don't already have one.
 */
export function QuickPositionTeam({
  position,
  onPosition,
  teamPreference,
  onTeamPreference,
}: {
  position: string;
  onPosition: (v: string) => void;
  teamPreference: string;
  onTeamPreference: (v: string) => void;
}) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div>
        <div style={{ fontSize: 11, color: "#7d7d7d", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 7 }}>
          Preferred position
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {POSITIONS.map((p) => (
            <button key={p.value} type="button" onClick={() => onPosition(p.value)} style={pillStyle(position === p.value)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, color: "#7d7d7d", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 7 }}>
          Shirt colour
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {TEAMS.map((t) => (
            <button key={t.value} type="button" onClick={() => onTeamPreference(t.value)} style={pillStyle(teamPreference === t.value, t.tone)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * "Put me with / against these people."
 *
 * Only rendered when a roster is available — there is no point offering the
 * choice on a game whose squad the player cannot see yet.
 */
export function TeamRequestPicker({
  roster,
  value,
  onChange,
  max = MAX_TEAM_REQUESTS,
}: {
  roster: RosterEntry[];
  value: TeamRequest[];
  onChange: (next: TeamRequest[]) => void;
  max?: number;
}) {
  const [pending, setPending] = React.useState<string>("");
  const [relation, setRelation] = React.useState<"with" | "against">("with");

  const keyOf = (r: TeamRequest) => `${r.playerId || `guest:${r.guestName}`}`;
  const chosen = new Set(value.map(keyOf));
  const available = roster.filter((r) => !chosen.has(r.id));
  const atMax = value.length >= max;

  const nameFor = (r: TeamRequest) =>
    roster.find((x) => x.id === keyOf(r))?.name || r.guestName || "Someone";

  const add = () => {
    if (!pending || atMax) return;
    const entry = roster.find((r) => r.id === pending);
    if (!entry) return;
    const next: TeamRequest = entry.id.startsWith("guest:")
      ? { guestName: entry.name, relation }
      : { playerId: entry.id, relation };
    onChange([...value, next]);
    setPending("");
  };

  if (roster.length === 0) return null;

  return (
    <div>
      <div style={{ fontSize: 11, color: "#7d7d7d", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 7 }}>
        Play with or against
      </div>

      {value.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 9 }}>
          {value.map((r, i) => (
            <span
              key={`${keyOf(r)}-${i}`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                fontSize: 11.5, fontWeight: 600,
                color: r.relation === "with" ? LIME : "#ff9f7f",
                background: r.relation === "with" ? "rgba(200,255,62,0.08)" : "rgba(255,159,127,0.08)",
                border: `1px solid ${r.relation === "with" ? "rgba(200,255,62,0.25)" : "rgba(255,159,127,0.25)"}`,
                borderRadius: 20, padding: "4px 6px 4px 11px",
              }}
            >
              {r.relation === "with" ? "With" : "Against"} {nameFor(r)}
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                style={{ background: "none", border: "none", color: "inherit", opacity: 0.65, cursor: "pointer", fontSize: 13, lineHeight: 1 }}
                aria-label={`Remove ${nameFor(r)}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {!atMax && available.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {(["with", "against"] as const).map((rel) => (
              <button key={rel} type="button" onClick={() => setRelation(rel)} style={pillStyle(relation === rel)}>
                {rel === "with" ? "With" : "Against"}
              </button>
            ))}
          </div>
          <select
            value={pending}
            onChange={(e) => setPending(e.target.value)}
            style={{
              flex: 1, minWidth: 130, padding: "7px 10px", borderRadius: 9,
              border: "1px solid #2f2f2f", background: "#141414", color: "#e8e8e8", fontSize: 12.5,
            }}
          >
            <option value="">Choose a player…</option>
            {available.map((r) => (
              <option key={r.id} value={r.id}>{r.name}{r.isGuest ? " (guest)" : ""}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={add}
            disabled={!pending}
            style={{
              padding: "7px 14px", borderRadius: 9, fontSize: 12.5, fontWeight: 700,
              border: `1px solid ${pending ? "rgba(200,255,62,0.3)" : "#2a2a2a"}`,
              background: pending ? "rgba(200,255,62,0.1)" : "#1a1a1a",
              color: pending ? LIME : "#666",
              cursor: pending ? "pointer" : "not-allowed",
            }}
          >
            Add
          </button>
        </div>
      )}

      <div style={{ fontSize: 10.5, color: "#666", marginTop: 7 }}>
        {atMax
          ? `That's the maximum of ${max}. Remove one to pick someone else.`
          : `Up to ${max} people. Your +1s always play on your side unless you say otherwise.`}
      </div>
    </div>
  );
}

/**
 * How the assigned side came out, once the organiser has published teams.
 * The reason string comes straight from the distributor.
 */
export function TeamOutcomeBadge({
  colour,
  outcome,
  reason,
}: {
  colour?: string | null;
  outcome?: string | null;
  reason?: string | null;
}) {
  if (!colour) return null;
  const isRed = colour === "red";
  const accent = isRed ? "#ff6b6b" : "#74b9ff";
  const granted = outcome === "granted";

  return (
    <div
      style={{
        padding: "10px 12px", borderRadius: 10,
        background: isRed ? "rgba(255,107,107,0.08)" : "rgba(116,185,255,0.08)",
        border: `1px solid ${accent}44`, marginTop: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: reason ? 5 : 0 }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: accent, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 800, color: accent }}>
          You&apos;re on {isRed ? "Red" : "Blue"}
        </span>
        {granted && <span style={{ fontSize: 10.5, color: LIME, fontWeight: 700 }}>· as requested</span>}
      </div>
      {reason && <div style={{ fontSize: 11.5, color: "#9d9d9d", lineHeight: 1.55 }}>{reason}</div>}
    </div>
  );
}
