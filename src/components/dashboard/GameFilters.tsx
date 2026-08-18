"use client";

import React, { useMemo, useState } from "react";
import {
  AVAILABILITY_OPTIONS,
  BrowseFacets,
  BrowseFilters,
  DATE_OPTIONS,
  DAYPART_FALLBACK,
  FORMAT_OPTIONS,
  SORT_OPTIONS,
  activeFilterCount,
  clearFilters,
  toggleInList,
} from "@/utils/browse";
import BottomSheet from "./BottomSheet";
import "./browse.css";

type SheetKey = "date" | "time" | "format" | "price" | "availability" | "sort" | "all" | null;

/**
 * The P0 filter row: date, time of day, format, price, availability, sort — plus
 * an "All filters" sheet holding the same controls in one scroll.
 *
 * Two rules shape it:
 *
 *   1. A chip shows its VALUE when set, not its name. "This weekend" tells you
 *      what is applied; "Date ▾" makes you open the sheet to find out.
 *   2. Counts come from the server's facets and are scoped to the city and date
 *      only — never to your other selections. A count that collapses to zero as
 *      you pick things is how faceted filters turn into dead ends.
 *
 * Selections apply immediately on tap. There is no Apply button on the single
 * sheets, because on a list this size the result is the feedback — the combined
 * sheet does get one, since changing six things and watching the list flicker six
 * times is worse.
 */
export default function GameFilters({
  filters,
  facets,
  onChange,
  resultCount,
  loading,
}: {
  filters: BrowseFilters;
  facets: BrowseFacets | null;
  onChange: (next: BrowseFilters) => void;
  resultCount: number;
  loading?: boolean;
}) {
  const [sheet, setSheet] = useState<SheetKey>(null);
  // The combined sheet edits a draft so the list does not thrash under the
  // player while they work through six groups.
  const [draft, setDraft] = useState<BrowseFilters>(filters);

  const close = () => setSheet(null);
  const set = (patch: Partial<BrowseFilters>) => onChange({ ...filters, ...patch });

  const openAll = () => { setDraft(filters); setSheet("all"); };

  const activeCount = activeFilterCount(filters);

  const dayparts = useMemo(() => DAYPART_FALLBACK, []);

  const priceCeiling = useMemo(() => {
    const max = facets?.feeRange?.max;
    // Round up to a clean step so the slider's end is a number a person would say.
    if (!max || max <= 0) return 1000;
    return Math.max(100, Math.ceil(max / 50) * 50);
  }, [facets]);

  // ── Chip labels: the applied value, or the group name when nothing is set ──

  const dateLabel = DATE_OPTIONS.find((d) => d.key === filters.date)?.label;
  const timeLabel =
    filters.dayparts.length === 1
      ? dayparts.find((d) => d.key === filters.dayparts[0])?.label
      : filters.dayparts.length > 1
        ? `${filters.dayparts.length} times`
        : null;
  const formatLabel =
    filters.formats.length === 1
      ? filters.formats[0]
      : filters.formats.length > 1
        ? `${filters.formats.length} formats`
        : null;
  const priceLabel =
    filters.maxFee !== null
      ? `Under ₹${filters.maxFee}`
      : filters.minFee !== null
        ? `₹${filters.minFee}+`
        : null;
  const availabilityLabel =
    filters.availability !== "any"
      ? AVAILABILITY_OPTIONS.find((a) => a.key === filters.availability)?.label
      : null;
  const sortLabel = SORT_OPTIONS.find((s) => s.key === filters.sort)?.label;

  const chip = (
    key: Exclude<SheetKey, null>,
    label: string,
    isActive: boolean,
    onOpen: () => void
  ) => (
    <button
      key={key}
      type="button"
      className={`kk-chip ${isActive ? "is-active" : ""}`}
      onClick={onOpen}
      aria-haspopup="dialog"
    >
      {label}
      <span className="kk-chip-caret" aria-hidden="true">▾</span>
    </button>
  );

  // ── Reusable groups, shared by the single sheets and the combined one ──────

  const dateGroup = (f: BrowseFilters, apply: (p: Partial<BrowseFilters>) => void) => (
    <div className="kk-group">
      <div className="kk-group-title">Date</div>
      <div className="kk-options">
        {DATE_OPTIONS.map((d) => (
          <button
            key={d.key}
            type="button"
            className={`kk-option ${f.date === d.key ? "is-on" : ""}`}
            onClick={() => apply({ date: d.key })}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );

  const timeGroup = (f: BrowseFilters, apply: (p: Partial<BrowseFilters>) => void) => (
    <div className="kk-group">
      <div className="kk-group-title">Time of day</div>
      <div className="kk-rows">
        {dayparts.map((d) => {
          const on = f.dayparts.includes(d.key);
          const count = facets?.daypart?.[d.key] ?? 0;
          return (
            <button
              key={d.key}
              type="button"
              className={`kk-row ${on ? "is-on" : ""}`}
              onClick={() => apply({ dayparts: toggleInList(f.dayparts, d.key) })}
            >
              <span>
                <span className="kk-row-label">{d.label}</span>
                <span className="kk-row-hint">
                  {d.hint} · {count} {count === 1 ? "game" : "games"}
                </span>
              </span>
              {on && <span className="kk-row-tick" aria-hidden="true">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );

  const formatGroup = (f: BrowseFilters, apply: (p: Partial<BrowseFilters>) => void) => (
    <div className="kk-group">
      <div className="kk-group-title">Format</div>
      <div className="kk-options">
        {FORMAT_OPTIONS.map((fmt) => {
          const on = f.formats.includes(fmt);
          const count = facets?.format?.[fmt] ?? 0;
          return (
            <button
              key={fmt}
              type="button"
              className={`kk-option ${on ? "is-on" : ""} ${count === 0 ? "is-empty" : ""}`}
              onClick={() => apply({ formats: toggleInList(f.formats, fmt) })}
            >
              {fmt}
              <span className="kk-option-count">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const priceGroup = (f: BrowseFilters, apply: (p: Partial<BrowseFilters>) => void) => (
    <div className="kk-group">
      <div className="kk-group-title">Price per player</div>
      <div className="kk-price-value">
        {f.maxFee === null ? "Any price" : f.maxFee === 0 ? "Free only" : `Up to ₹${f.maxFee}`}
      </div>
      <input
        className="kk-range"
        type="range"
        min={0}
        max={priceCeiling}
        step={50}
        value={f.maxFee ?? priceCeiling}
        onChange={(e) => {
          const v = Number(e.target.value);
          // Sliding to the far end means "no ceiling", not "exactly the highest
          // fee we happen to have" — otherwise the filter can never be released.
          apply({ maxFee: v >= priceCeiling ? null : v });
        }}
        aria-label="Maximum price per player"
      />
      <div className="kk-price-ends">
        <span>Free</span>
        <span>₹{priceCeiling}+</span>
      </div>
    </div>
  );

  const availabilityGroup = (f: BrowseFilters, apply: (p: Partial<BrowseFilters>) => void) => (
    <div className="kk-group">
      <div className="kk-group-title">Availability</div>
      <div className="kk-rows">
        {AVAILABILITY_OPTIONS.map((a) => {
          const on = f.availability === a.key;
          const count = facets?.availability?.[a.key] ?? 0;
          return (
            <button
              key={a.key}
              type="button"
              className={`kk-row ${on ? "is-on" : ""}`}
              onClick={() => apply({ availability: a.key })}
            >
              <span>
                <span className="kk-row-label">{a.label}</span>
                <span className="kk-row-hint">
                  {a.hint} · {count} {count === 1 ? "game" : "games"}
                </span>
              </span>
              {on && <span className="kk-row-tick" aria-hidden="true">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );

  const sortGroup = (f: BrowseFilters, apply: (p: Partial<BrowseFilters>) => void) => (
    <div className="kk-group">
      <div className="kk-group-title">Sort by</div>
      <div className="kk-rows">
        {SORT_OPTIONS.map((s) => {
          const on = f.sort === s.key;
          return (
            <button
              key={s.key}
              type="button"
              className={`kk-row ${on ? "is-on" : ""}`}
              onClick={() => apply({ sort: s.key })}
            >
              <span className="kk-row-label">{s.label}</span>
              {on && <span className="kk-row-tick" aria-hidden="true">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );

  const areaGroup = (f: BrowseFilters, apply: (p: Partial<BrowseFilters>) => void) => {
    const areas = facets?.areas || [];
    if (areas.length < 2) return null; // One area is not a choice.
    return (
      <div className="kk-group">
        <div className="kk-group-title">Area</div>
        <div className="kk-options">
          <button
            type="button"
            className={`kk-option ${!f.area ? "is-on" : ""}`}
            onClick={() => apply({ area: null })}
          >
            All areas
          </button>
          {areas.map((a) => (
            <button
              key={a.label}
              type="button"
              className={`kk-option ${f.area === a.label ? "is-on" : ""}`}
              onClick={() => apply({ area: f.area === a.label ? null : a.label })}
            >
              {a.label}
              <span className="kk-option-count">{a.count}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const applyToLive = (p: Partial<BrowseFilters>) => set(p);
  const applyToDraft = (p: Partial<BrowseFilters>) => setDraft((d) => ({ ...d, ...p }));

  return (
    <>
      <div className="kk-filter-bar" role="group" aria-label="Filter games">
        <button
          type="button"
          className="kk-chip kk-chip-filters"
          onClick={openAll}
          aria-haspopup="dialog"
        >
          <span aria-hidden="true">⚙</span>
          Filters
          {activeCount > 0 && <span className="kk-chip-count">{activeCount}</span>}
        </button>

        {chip("date",   dateLabel && filters.date !== "all" ? dateLabel : "Date", filters.date !== "all", () => setSheet("date"))}
        {chip("time",   timeLabel || "Time", filters.dayparts.length > 0, () => setSheet("time"))}
        {chip("format", formatLabel || "Format", filters.formats.length > 0, () => setSheet("format"))}
        {chip("price",  priceLabel || "Price", filters.minFee !== null || filters.maxFee !== null, () => setSheet("price"))}
        {chip("availability", availabilityLabel || "Spots", filters.availability !== "any", () => setSheet("availability"))}
        {chip("sort",   sortLabel || "Sort", filters.sort !== "soonest", () => setSheet("sort"))}

        {activeCount > 0 && (
          <button
            type="button"
            className="kk-chip kk-chip-clear"
            onClick={() => onChange(clearFilters(filters))}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Result summary — tells the player their filters did something, and gives
          them the exit when the answer is "nothing". */}
      {activeCount > 0 && (
        <div className="kk-result-line">
          <span>
            {loading ? "Finding games…" : (
              <>
                <strong>{resultCount}</strong> {resultCount === 1 ? "game" : "games"} match
              </>
            )}
          </span>
          <button type="button" className="kk-link-btn" onClick={() => onChange(clearFilters(filters))}>
            Clear filters
          </button>
        </div>
      )}

      {/* ── Single-purpose sheets: tap applies straight away ── */}

      <BottomSheet open={sheet === "date"} title="When do you want to play?" onClose={close}>
        {dateGroup(filters, applyToLive)}
      </BottomSheet>

      <BottomSheet open={sheet === "time"} title="Time of day" onClose={close}>
        {timeGroup(filters, applyToLive)}
      </BottomSheet>

      <BottomSheet open={sheet === "format"} title="Format" onClose={close}>
        {formatGroup(filters, applyToLive)}
      </BottomSheet>

      <BottomSheet open={sheet === "price"} title="Price" onClose={close}>
        {priceGroup(filters, applyToLive)}
      </BottomSheet>

      <BottomSheet open={sheet === "availability"} title="Availability" onClose={close}>
        {availabilityGroup(filters, applyToLive)}
      </BottomSheet>

      <BottomSheet open={sheet === "sort"} title="Sort games by" onClose={close}>
        {sortGroup(filters, applyToLive)}
      </BottomSheet>

      {/* ── Everything at once: edits a draft, commits on Apply ── */}

      <BottomSheet
        open={sheet === "all"}
        title="Filters"
        onClose={close}
        footer={
          <>
            <button
              type="button"
              className="kk-btn kk-btn-ghost"
              onClick={() => setDraft(clearFilters(draft))}
            >
              Reset
            </button>
            <button
              type="button"
              className="kk-btn kk-btn-primary"
              onClick={() => { onChange(draft); close(); }}
            >
              Show games
            </button>
          </>
        }
      >
        {dateGroup(draft, applyToDraft)}
        {timeGroup(draft, applyToDraft)}
        {formatGroup(draft, applyToDraft)}
        {areaGroup(draft, applyToDraft)}
        {priceGroup(draft, applyToDraft)}
        {availabilityGroup(draft, applyToDraft)}
        {sortGroup(draft, applyToDraft)}
      </BottomSheet>
    </>
  );
}
