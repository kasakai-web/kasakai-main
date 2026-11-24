"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import "./history.css";

export type HistoryTone = "green" | "amber" | "red" | "muted";

/**
 * One game on the Completed or Cancelled page: a wide row rather than the
 * browse card, because these are a record to read down, not a shelf to pick
 * from. The page decides what goes in each slot; this only lays it out.
 *
 * The whole row opens the game, but the title is the real button — the row's
 * own click is a convenience for the mouse, and anything interactive inside
 * `aside`/`footer` must stop propagation so it does not open the game too.
 */
export function HistoryRow({
  badge,
  title,
  meta,
  detail,
  aside,
  footer,
  onOpen,
}: {
  badge: { label: string; tone: HistoryTone };
  title: string;
  meta: string;
  detail?: ReactNode;
  aside?: ReactNode;
  footer?: ReactNode;
  onOpen: () => void;
}) {
  return (
    <article className="kk-hist-row" onClick={onOpen}>
      <div className="kk-hist-main">
        <div className="kk-hist-text">
          <span className={`kk-hist-badge is-${badge.tone}`}>{badge.label}</span>
          <button
            type="button"
            className="kk-hist-title"
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
          >
            {title}
          </button>
          <div className="kk-hist-meta">{meta}</div>
          {detail && <div className="kk-hist-detail">{detail}</div>}
        </div>
        <div className="kk-hist-aside">
          {aside ?? <ChevronRight size={18} className="kk-hist-chevron" aria-hidden="true" />}
        </div>
      </div>
      {footer && <div className="kk-hist-footer">{footer}</div>}
    </article>
  );
}

/** The tiles above the Completed list. A null value renders as a dash, never 0. */
export function HistoryStats({
  items,
}: {
  items: { label: string; value: string | number | null; tone?: "lime" | "green" }[];
}) {
  return (
    <div className="kk-hist-stats">
      {items.map((it) => (
        <div key={it.label} className="kk-hist-stat">
          <span className="kk-hist-stat-label">{it.label}</span>
          <strong className={it.tone ? `is-${it.tone}` : undefined}>
            {it.value === null ? "—" : it.value}
          </strong>
        </div>
      ))}
    </div>
  );
}
