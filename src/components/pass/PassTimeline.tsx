"use client";

// When a pass covers games, drawn as a line from its first day to its last.
//
// Both ends are whole IST days and inclusive — the server stores each as that
// day's IST midnight, and a pass is good through the WHOLE of its last day — so
// every count here is in IST calendar days. Reading the dates in UTC puts the
// day boundary at 05:30 and shows a pass expiring a day early.

import React, { useState } from "react";

const DAY = 24 * 3600 * 1000;
const IST_OFFSET = 5.5 * 3600 * 1000;

/** The IST calendar day an instant falls on, as a day number. */
export const istDay = (at: string | number | Date) =>
  Math.floor((new Date(at).getTime() + IST_OFFSET) / DAY);

export const passDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
      })
    : "";

/** Days of cover left INCLUDING today; 0 once the last day is over. */
export const daysLeft = (expiresAt?: string | null): number | null =>
  expiresAt ? Math.max(0, istDay(expiresAt) - istDay(Date.now()) + 1) : null;

type Props = {
  from: string | null;
  until: string | null;
  /** Draw how far through the window today is. Off for a pass not yet bought. */
  showProgress?: boolean;
  /** Under the line, right-hand side: "12 days left", "1 day", … */
  caption?: React.ReactNode;
  label?: string;
};

export function PassTimeline({ from, until, showProgress = false, caption, label = "Valid" }: Props) {
  // Read once per mount: render must be pure, and a day boundary passing while
  // the card is open is not worth a re-render.
  const [today] = useState(() => istDay(Date.now()));
  if (!from) return null;

  const start = istDay(from);
  const end = until ? istDay(until) : null;
  const total = end !== null ? end - start + 1 : null;
  const elapsed = total ? Math.min(total, Math.max(0, today - start + 1)) : 0;
  const pct = total && showProgress ? Math.round((elapsed / total) * 100) : 0;

  return (
    <div className="kp-timeline">
      <div className="kp-timeline-label">{label}</div>
      <div className="kp-timeline-ends">
        <span className="kp-timeline-date">{passDate(from)}</span>
        <span className="kp-timeline-date">{until ? passDate(until) : "No end date"}</span>
      </div>
      <div className="kp-timeline-track">
        <span className="kp-timeline-dot kp-timeline-dot-start" />
        {showProgress && pct > 0 && <span className="kp-timeline-fill" style={{ width: `${pct}%` }} />}
        <span className="kp-timeline-dot kp-timeline-dot-end" />
      </div>
      {(total || caption) && (
        <div className="kp-timeline-caption">
          <span>{total ? `${total} day${total === 1 ? "" : "s"}` : ""}</span>
          {caption && <span>{caption}</span>}
        </div>
      )}
    </div>
  );
}

export default PassTimeline;
