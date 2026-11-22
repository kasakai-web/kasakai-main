// What a game card says about confirmation, for a game whose organiser turned on
// "Auto-confirm at minimum".
//
// The server computes the state (`confirmInfo` on every game read, from
// kasakai-backend/src/utils/autoConfirm.js — the same engine that confirms the
// game), so the badge and the confirmation can never disagree. Nothing is
// re-derived here; this only words it.

export interface ConfirmInfo {
  /** At or above the minimum ('min_reached'), or below it ('needs_more'). */
  state: "min_reached" | "needs_more";
  /** Players still needed; 0 once the minimum is reached. */
  needed: number;
  minPlayers: number;
  /** The 1st check-in, while it is still ahead — when the game confirms. */
  confirmsAt: string | null;
}

// "6:00 PM" today, "Wed 8:00 PM" on another day (a morning game's check-in
// is the evening before), always in IST.
function whenLabel(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true });
  const day = (x: Date) => x.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  if (day(d) === day(new Date())) return time;
  const weekday = d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short" });
  return `${weekday} ${time}`;
}

/** The badge text, or null when there is nothing to say. */
export function confirmLabel(info: ConfirmInfo | null | undefined): string | null {
  if (!info) return null;
  if (info.state === "min_reached") {
    return info.confirmsAt ? `Minimum reached · confirms ${whenLabel(info.confirmsAt)}` : "Minimum reached · confirming";
  }
  if (info.needed > 0) return `${info.needed} more needed`;
  return null;
}
