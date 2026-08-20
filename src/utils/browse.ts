// Browse-filter state: the one definition of what a player can narrow the game
// list by, and how that selection travels.
//
// The same object goes three places, which is why it lives here rather than in
// the dashboard component:
//   • into the URL   — so a filtered view is shareable, survives a refresh, and
//                      the back button undoes a filter instead of leaving the page
//   • into the API   — filtering is server-side (see backend gameFilters.js); the
//                      client draws controls, it does not sift results
//   • into a chip row— the labels a player reads back to check what is applied
//
// Defaults are omitted from both the URL and the API query, so an untouched
// dashboard has a clean address bar and sends a bare request.

export type DatePreset = "all" | "today" | "tomorrow" | "weekend" | "week";
export type Availability = "any" | "available" | "almost_full";
export type SortKey = "soonest" | "cheapest" | "price_desc" | "spots";

export type BrowseFilters = {
  /** Travel region — the primary scope. Set from the city picker, never blank in practice. */
  metro: string | null;
  /** Municipal city inside the metro (e.g. only Gurugram within Delhi NCR). */
  city: string | null;
  /** Neighbourhood inside the city. */
  area: string | null;
  date: DatePreset;
  dayparts: string[];
  formats: string[];
  /** Rupees, not paise — this is what the player sees on the slider. */
  minFee: number | null;
  maxFee: number | null;
  availability: Availability;
  sort: SortKey;
};

export const EMPTY_FILTERS: BrowseFilters = {
  metro: null,
  city: null,
  area: null,
  date: "all",
  dayparts: [],
  formats: [],
  minFee: null,
  maxFee: null,
  availability: "any",
  sort: "soonest",
};

export const DATE_OPTIONS: { key: DatePreset; label: string }[] = [
  { key: "all",      label: "Any date" },
  { key: "today",    label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "weekend",  label: "This weekend" },
  { key: "week",     label: "Next 7 days" },
];

export const AVAILABILITY_OPTIONS: { key: Availability; label: string; hint: string }[] = [
  { key: "any",         label: "Show all",     hint: "Including full games you can waitlist for" },
  { key: "available",   label: "Has spots",    hint: "Only games you can join right now" },
  { key: "almost_full", label: "Almost full",  hint: "3 spots or fewer — going fast" },
];

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "soonest",    label: "Starting soonest" },
  { key: "cheapest",   label: "Price: low to high" },
  { key: "price_desc", label: "Price: high to low" },
  { key: "spots",      label: "Most spots left" },
];

// Mirrors the backend format enum. 'Screening' is deliberately absent — it is not
// a football format a player browses for.
export const FORMAT_OPTIONS = ["5v5", "6v6", "7v7", "8v8", "9v9", "10v10", "11v11"];

// Labels only; the hour ranges that back them live server-side in istDate.js and
// arrive with the browse context, so the two can never disagree.
export const DAYPART_FALLBACK = [
  { key: "morning",   label: "Morning",   hint: "Before 12 PM" },
  { key: "afternoon", label: "Afternoon", hint: "12 – 4 PM" },
  { key: "evening",   label: "Evening",   hint: "4 – 8 PM" },
  { key: "night",     label: "Night",     hint: "After 8 PM" },
];

// ── URL ⇄ state ──────────────────────────────────────────────────────────────

const asList = (raw: string | null): string[] =>
  raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [];

const asNumber = (raw: string | null): number | null => {
  if (raw === null || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

const oneOf = <T extends string>(raw: string | null, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(raw ?? "") ? (raw as T) : fallback;

/**
 * Read filters out of the address bar. Unknown values fall back to defaults
 * rather than throwing — a hand-edited or stale link should show more games, not
 * a broken page.
 */
export function filtersFromParams(sp: URLSearchParams): BrowseFilters {
  return {
    metro: sp.get("metro") || null,
    city:  sp.get("city")  || null,
    area:  sp.get("area")  || null,
    date:  oneOf(sp.get("date"), ["all", "today", "tomorrow", "weekend", "week"] as const, "all"),
    dayparts: asList(sp.get("daypart")),
    formats:  asList(sp.get("format")),
    minFee: asNumber(sp.get("minFee")),
    maxFee: asNumber(sp.get("maxFee")),
    availability: oneOf(sp.get("availability"), ["any", "available", "almost_full"] as const, "any"),
    sort: oneOf(sp.get("sort"), ["soonest", "cheapest", "price_desc", "spots"] as const, "soonest"),
  };
}

// Every non-default field, as query pairs. Shared by the URL writer and the API
// caller so a link and the request it produces can never describe different views.
function toPairs(f: BrowseFilters): [string, string][] {
  const pairs: [string, string][] = [];
  if (f.metro) pairs.push(["metro", f.metro]);
  if (f.city)  pairs.push(["city", f.city]);
  if (f.area)  pairs.push(["area", f.area]);
  if (f.date !== "all") pairs.push(["date", f.date]);
  if (f.dayparts.length) pairs.push(["daypart", f.dayparts.join(",")]);
  if (f.formats.length)  pairs.push(["format", f.formats.join(",")]);
  if (f.minFee !== null) pairs.push(["minFee", String(f.minFee)]);
  if (f.maxFee !== null) pairs.push(["maxFee", String(f.maxFee)]);
  if (f.availability !== "any") pairs.push(["availability", f.availability]);
  if (f.sort !== "soonest") pairs.push(["sort", f.sort]);
  return pairs;
}

/** Query string for the games API. Empty when nothing is applied. */
export function filtersToQuery(f: BrowseFilters, extra?: Record<string, string | number>): string {
  const sp = new URLSearchParams(toPairs(f));
  for (const [k, v] of Object.entries(extra || {})) sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/**
 * Rewrite the address bar to match the filters, preserving the params the
 * dashboard owns for its own reasons (which game modal is up, which invite is
 * being resolved) so changing a filter never closes what the player was looking
 * at. `tab` is not among them any more — the four lists are separate routes, so
 * the path carries that, and carrying a stale `tab` would bounce the player
 * back out of the page they are on.
 */
export function filtersToSearchParams(f: BrowseFilters, preserve: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams();
  for (const key of ["openGame", "invite"]) {
    const v = preserve.get(key);
    if (v) next.set(key, v);
  }
  for (const [k, v] of toPairs(f)) next.set(k, v);
  return next;
}

// ── Summary helpers ──────────────────────────────────────────────────────────

/**
 * How many filters the player has actively applied.
 *
 * Metro and sort are excluded on purpose: a city is always set (it is the scope,
 * not a filter) and sort reorders rather than hides. Counting them would leave
 * the badge permanently showing "2" on an untouched dashboard, which trains
 * people to ignore it.
 */
export function activeFilterCount(f: BrowseFilters): number {
  let n = 0;
  if (f.city) n++;
  if (f.area) n++;
  if (f.date !== "all") n++;
  if (f.dayparts.length) n++;
  if (f.formats.length) n++;
  if (f.minFee !== null || f.maxFee !== null) n++;
  if (f.availability !== "any") n++;
  return n;
}

export function hasActiveFilters(f: BrowseFilters): boolean {
  return activeFilterCount(f) > 0;
}

/** Clear everything a player can narrow by, keeping the city they are browsing. */
export function clearFilters(f: BrowseFilters): BrowseFilters {
  return { ...EMPTY_FILTERS, metro: f.metro, sort: f.sort };
}

/** Toggle one value in a multi-select filter. */
export function toggleInList(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

// ── Remembering the city ─────────────────────────────────────────────────────
//
// Stored locally as well as on the player's profile. The profile is the durable
// record (it follows them to a new device); localStorage is what makes the choice
// survive the first paint, so a returning player never sees the picker flash
// before their city loads.

const METRO_KEY = "kk-browse-metro";

export const getStoredMetro = (): string | null => {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(METRO_KEY); } catch { return null; }
};

export const setStoredMetro = (slug: string | null) => {
  if (typeof window === "undefined") return;
  try {
    if (slug) localStorage.setItem(METRO_KEY, slug);
    else localStorage.removeItem(METRO_KEY);
  } catch {
    // Private browsing / storage disabled — the profile still holds the choice,
    // so the only cost is one extra fetch on next boot.
  }
};

export type MetroOption = {
  slug: string;
  label: string;
  gameCount: number;
  venueCount: number;
};

/** Somewhere a player is that we have no venues in. */
export type UnservedCity = {
  label: string;
  metroSlug: string;
  /** The city registry knows this place; we just have no venues in it yet. */
  known: boolean;
  /** How we learnt where they are. */
  source: "profile" | "geo";
};

export type BrowseContext = {
  metros: MetroOption[];
  suggestedMetro: string | null;
  /** 'profile' | 'history' | 'busiest' — how confident the suggestion is. */
  suggestedFrom: string | null;
  /**
   * The player's own city, when we do not run games there. Null in the normal
   * case. Present means the list they are about to see is somewhere else, and
   * they should be told so rather than left to work it out.
   */
  unservedCity: UnservedCity | null;
  formats: string[];
  dayparts: { key: string; label: string; fromHour: number; toHour: number }[];
  sorts: string[];
  almostFullThreshold: number;
};

export type BrowseFacets = {
  format: Record<string, number>;
  daypart: Record<string, number>;
  availability: { any: number; available: number; almost_full: number };
  areas: { label: string; count: number }[];
  cities: { slug: string; label: string; count: number }[];
  feeRange: { min: number | null; max: number | null };
};

/** A readable "6 – 8 PM"-style hint from the hour range the server sent. */
export function daypartHint(fromHour: number, toHour: number): string {
  const fmt = (h: number) => {
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour} ${h < 12 || h === 24 ? "AM" : "PM"}`;
  };
  if (fromHour === 0)  return `Before ${fmt(toHour)}`;
  if (toHour === 24)   return `After ${fmt(fromHour)}`;
  return `${fmt(fromHour)} – ${fmt(toHour)}`;
}
