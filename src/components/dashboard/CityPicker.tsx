"use client";

import React, { useMemo, useState } from "react";
import { buildApiUrl, getSession } from "@/utils/api";
import { MetroOption, setStoredMetro } from "@/utils/browse";
import BottomSheet from "./BottomSheet";
import "./browse.css";

/**
 * The city control at the top of the dashboard.
 *
 * The design goal is that a player is never *asked* where they are if the answer
 * can be worked out. The backend does the working out (GET /games/browse-context
 * infers from their saved profile, then their actual game history, then falls
 * back to the busiest city) and this component only handles the two cases left
 * over:
 *
 *   • the inference was weak or absent — show the picker once, on first run
 *   • the player wants to look somewhere else — the pill is always tappable
 *
 * "Detect my location" is offered but never triggered on its own. A geolocation
 * prompt fired at page load is the thing this design exists to avoid: it is a
 * permission dialog before the player has any reason to trust the ask. Behind the
 * button it is a deliberate act, so the prompt makes sense.
 */
export default function CityPicker({
  metros,
  value,
  onChange,
  /** True when nothing better than "busiest city" could be inferred. */
  needsChoice,
  loading,
}: {
  metros: MetroOption[];
  value: string | null;
  onChange: (slug: string) => void;
  needsChoice: boolean;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [search, setSearch] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);

  // Derived, not stored in an effect: the prompt is simply "we still need an
  // answer, the list has arrived, and they haven't waved it away". Holding it in
  // state would mean a render where the two disagree.
  const firstRun = needsChoice && metros.length > 0 && !dismissed;

  const selected = useMemo(
    () => metros.find((m) => m.slug === value) || null,
    [metros, value]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return metros;
    return metros.filter((m) => m.label.toLowerCase().includes(q) || m.slug.includes(q));
  }, [metros, search]);

  const close = () => { setOpen(false); setDismissed(true); setSearch(""); setDetectError(null); };

  const pick = (slug: string) => {
    onChange(slug);
    setStoredMetro(slug);
    close();
  };

  const detect = () => {
    if (!("geolocation" in navigator)) {
      setDetectError("This browser can't share your location. Pick a city below instead.");
      return;
    }
    setDetecting(true);
    setDetectError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { token } = getSession();
          const { latitude, longitude } = pos.coords;
          // The server owns what counts as "near" a city, so the registry stays in
          // one place rather than being duplicated into the bundle.
          const res = await fetch(
            buildApiUrl(`/games/resolve-location?lat=${latitude}&lng=${longitude}`),
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const data = await res.json();
          const slug = data?.data?.metro?.slug;

          if (!slug) {
            setDetectError("We're not in your area yet — pick a city below to look around.");
            return;
          }
          if (!metros.some((m) => m.slug === slug)) {
            setDetectError(`No games near you yet (${data.data.metro.label}). Pick another city below.`);
            return;
          }
          pick(slug);
        } catch {
          setDetectError("Couldn't work out your city. Pick one below.");
        } finally {
          setDetecting(false);
        }
      },
      () => {
        setDetecting(false);
        // A denied permission is a normal answer, not an error to apologise for.
        setDetectError("No problem — pick your city below.");
      },
      { timeout: 8000, maximumAge: 10 * 60 * 1000 }
    );
  };

  const cityList = (
    <>
      <input
        className="kk-city-search"
        type="text"
        placeholder="Search for your city…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search cities"
      />

      <button className="kk-detect" type="button" onClick={detect} disabled={detecting}>
        <span aria-hidden="true">📍</span>
        {detecting ? "Finding your city…" : "Use my current location"}
      </button>

      {detectError && <div className="kk-detect-note is-error">{detectError}</div>}

      <div className="kk-city-list">
        {filtered.map((m) => (
          <button
            key={m.slug}
            type="button"
            className={`kk-city-item ${m.slug === value ? "is-on" : ""}`}
            onClick={() => pick(m.slug)}
          >
            <span>
              <span className="kk-city-item-name">{m.label}</span>
              <span className={`kk-city-item-meta ${m.gameCount === 0 ? "is-empty" : ""}`}>
                {m.gameCount > 0
                  ? `${m.gameCount} upcoming ${m.gameCount === 1 ? "game" : "games"}`
                  : "No games yet"}
              </span>
            </span>
            {m.slug === value && <span className="kk-row-tick" aria-hidden="true">✓</span>}
          </button>
        ))}

        {filtered.length === 0 && (
          <div className="kk-empty-note">
            No city matches “{search}”. We&apos;re adding new ones all the time.
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      <div className="kk-city-bar">
        <button
          className="kk-city-pill"
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
        >
          <span className="kk-city-pin" aria-hidden="true">📍</span>
          <span className="kk-city-text">
            <span className="kk-city-eyebrow">Playing in</span>
            <span className="kk-city-name">
              {loading && !selected ? "Loading…" : selected?.label || "Choose a city"}
              <span className="kk-city-caret" aria-hidden="true">▾</span>
            </span>
          </span>
        </button>
      </div>

      <BottomSheet open={open} title="Choose your city" onClose={close}>
        {cityList}
      </BottomSheet>

      {/* First run. Deliberately dismissible: a player who would rather look
          around before committing keeps the busiest city as a default. */}
      <BottomSheet
        open={firstRun && !open}
        title="Where do you play?"
        onClose={close}
        labelledBy="kk-first-run-title"
      >
        <p className="kk-first-run-lede">
          Pick your city so we can show you games you can actually get to. You can
          change it any time from the top of the page.
        </p>
        {cityList}
      </BottomSheet>
    </>
  );
}
