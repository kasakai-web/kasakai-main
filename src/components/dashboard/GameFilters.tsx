"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  AVAILABILITY_OPTIONS,
  BrowseFacets,
  BrowseFilters,
  DATE_OPTIONS,
  DAYPART_FALLBACK,
  DatePreset,
  FORMAT_OPTIONS,
  SORT_OPTIONS,
  activeFilterCount,
  clearFilters,
  toggleInList,
} from "@/utils/browse";
import BottomSheet from "./BottomSheet";
import FilterDropdown from "./FilterDropdown";
import "./browse.css";

const IST = "Asia/Kolkata";
const DAY_MS = 86_400_000;

const DATE_TITLES: Record<DatePreset, string> = {
  all: "All dates",
  today: "Today",
  tomorrow: "Tomorrow",
  weekend: "Weekend",
  week: "Next 7 days",
};

// The calendar days each preset covers, so the strip reads like real dates even
// though the filter itself is a server-side preset.
function dateSubLabels(now: number): Record<DatePreset, string> {
  const part = (t: number, o: Intl.DateTimeFormatOptions) =>
    new Date(t).toLocaleDateString("en-GB", { timeZone: IST, ...o });
  const day = (t: number) => `${part(t, { weekday: "short" })} ${part(t, { day: "numeric" })} ${part(t, { month: "short" })}`;
  const range = (a: number, b: number) => {
    const [da, ma] = [part(a, { day: "numeric" }), part(a, { month: "short" })];
    const [db, mb] = [part(b, { day: "numeric" }), part(b, { month: "short" })];
    if (da === db && ma === mb) return `${da} ${ma}`;
    return ma === mb ? `${da}–${db} ${mb}` : `${da} ${ma} – ${db} ${mb}`;
  };
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(part(now, { weekday: "short" }));
  // On a Sunday the weekend is today alone; otherwise the coming Sat–Sun.
  const weekendStart = weekday === 0 ? now : now + (6 - weekday) * DAY_MS;
  const weekendEnd = weekday === 0 ? now : weekendStart + DAY_MS;
  return {
    all: "Upcoming",
    today: day(now),
    tomorrow: day(now + DAY_MS),
    weekend: range(weekendStart, weekendEnd),
    week: range(now, now + 6 * DAY_MS),
  };
}

/**
 * The browse filter controls: a date strip, a row of dropdowns for the common
 * filters (time, format, price, sort), and a "More filters" sheet holding every
 * control — including area and availability, which have no dropdown.
 *
 * Counts come from the server's facets and are scoped to the city and date
 * only — never to your other selections. A count that collapses to zero as you
 * pick things is how faceted filters turn into dead ends.
 *
 * Dropdowns apply immediately; the sheet edits a draft and commits on Apply,
 * since changing six things and watching the list flicker six times is worse.
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
  const [sheetOpen, setSheetOpen] = useState(false);
  // The combined sheet edits a draft so the list does not thrash under the
  // player while they work through six groups.
  const [draft, setDraft] = useState<BrowseFilters>(filters);
  // Read the clock once per mount so render stays pure.
  const [now] = useState(() => Date.now());

  const close = () => setSheetOpen(false);
  const set = (patch: Partial<BrowseFilters>) => onChange({ ...filters, ...patch });
  const openAll = () => { setDraft(filters); setSheetOpen(true); };

  const activeCount = activeFilterCount(filters);
  // Filters only reachable from the sheet, so its button can say they are set.
  const sheetOnlyCount =
    (filters.city ? 1 : 0) + (filters.area ? 1 : 0) + (filters.availability !== "any" ? 1 : 0);

  const dayparts = DAYPART_FALLBACK;
  const subLabels = useMemo(() => dateSubLabels(now), [now]);

  const priceCeiling = useMemo(() => {
    const max = facets?.feeRange?.max;
    // Round up to a clean step so the slider's end is a number a person would say.
    if (!max || max <= 0) return 1000;
    return Math.max(100, Math.ceil(max / 50) * 50);
  }, [facets]);

  // ── Dropdown values and options ────────────────────────────────────────────

  // Formats with games in them, plus any already selected so a selection never
  // vanishes from its own control. Before facets load, offer all of them.
  const formatChoices = facets
    ? FORMAT_OPTIONS.filter((f) => (facets.format?.[f] ?? 0) > 0 || filters.formats.includes(f))
    : FORMAT_OPTIONS;

  const priceSteps = useMemo(() => {
    const steps = [100, 150, 200, 250, 300, 400, 500, 750].filter((v) => v < priceCeiling);
    if (filters.maxFee !== null && filters.maxFee > 0 && !steps.includes(filters.maxFee)) {
      steps.push(filters.maxFee);
      steps.sort((a, b) => a - b);
    }
    return steps;
  }, [priceCeiling, filters.maxFee]);
  const priceValue =
    filters.maxFee !== null ? String(filters.maxFee) : filters.minFee !== null ? "min" : "all";

  // ── Sheet groups ───────────────────────────────────────────────────────────

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

  const applyToDraft = (p: Partial<BrowseFilters>) => setDraft((d) => ({ ...d, ...p }));

  return (
    <>
      <div className="kk-feed-dates" role="group" aria-label="Filter by date">
        {DATE_OPTIONS.map((d) => {
          const on = filters.date === d.key;
          return (
            <button
              key={d.key}
              type="button"
              className={`kk-feed-date${on ? " is-active" : ""}`}
              aria-pressed={on}
              onClick={() => set({ date: d.key })}
            >
              <strong>{DATE_TITLES[d.key]}</strong>
              <small>{subLabels[d.key]}</small>
            </button>
          );
        })}
      </div>

      <div className="kk-feed-filters" role="group" aria-label="Filter games">
        <span className="kk-feed-filters-label">Filter games</span>

        {/* Time and format hold several values at once, like the sheet;
            price and sort are a single choice by nature. */}
        <FilterDropdown
          label="Time of day"
          placeholder="Any time"
          multiple
          options={dayparts.map((d) => ({ value: d.key, label: d.label, count: facets?.daypart?.[d.key] ?? (facets ? 0 : undefined) }))}
          selected={filters.dayparts}
          onChange={(values) => set({ dayparts: values })}
        />

        <FilterDropdown
          label="Game format"
          placeholder="Any format"
          multiple
          options={formatChoices.map((fmt) => ({ value: fmt, label: fmt, count: facets?.format?.[fmt] ?? (facets ? 0 : undefined) }))}
          selected={filters.formats}
          onChange={(values) => set({ formats: values })}
        />

        <FilterDropdown
          label="Maximum price"
          placeholder="Any price"
          clearable
          options={[
            // A minimum set from elsewhere (e.g. a shared link) is shown, not offered.
            ...(priceValue === "min" ? [{ value: "min", label: `₹${filters.minFee}+`, disabled: true }] : []),
            { value: "0", label: "Free only" },
            ...priceSteps.map((v) => ({ value: String(v), label: `Up to ₹${v}` })),
          ]}
          selected={priceValue === "all" ? [] : [priceValue]}
          onChange={([v]) => set({ minFee: null, maxFee: v === undefined ? null : Number(v) })}
        />

        <FilterDropdown
          label="Sort games"
          placeholder="Starting soonest"
          options={SORT_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
          selected={[filters.sort]}
          onChange={([v]) => set({ sort: (v ?? "soonest") as BrowseFilters["sort"] })}
        />

        <button
          type="button"
          className={`kk-feed-more${sheetOnlyCount > 0 ? " is-active" : ""}`}
          onClick={openAll}
          aria-haspopup="dialog"
        >
          <SlidersHorizontal size={14} aria-hidden="true" />
          More filters
          {sheetOnlyCount > 0 && <span className="kk-chip-count">{sheetOnlyCount}</span>}
        </button>

        {activeCount > 0 && (
          <button type="button" className="kk-feed-reset kk-feed-reset-row" onClick={() => onChange(clearFilters(filters))}>
            Clear filters
          </button>
        )}
      </div>

      <div className={`kk-feed-results${activeCount > 0 ? " has-filters" : ""}`}>
        <strong role="status">
          {loading
            ? "Finding games…"
            : `${resultCount} ${resultCount === 1 ? "game" : "games"} available`}
        </strong>
        <small className="kk-feed-price-note">Prices shown per player</small>
        {activeCount > 0 && (
          <button
            type="button"
            className="kk-feed-reset kk-feed-reset-inline"
            onClick={() => onChange(clearFilters(filters))}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Everything at once: edits a draft, commits on Apply ── */}
      <BottomSheet
        open={sheetOpen}
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
