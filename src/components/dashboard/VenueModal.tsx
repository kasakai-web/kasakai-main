"use client";

import  { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Star, MapPin, ExternalLink, Car, Lightbulb, Shirt, CupSoda,
  Calendar, Clock, ChevronRight, X,
} from "lucide-react";

import { buildApiUrl, fetchWithRetry, resolveImageUrl } from "@/utils/api";
import "@/components/dashboard/VenueModal.css";

interface VenueGame {
  _id: string;
  title?: string | null;
  scheduledAt: string;
  format?: string;
  status?: string;
  durationMins?: number;
  totalSlots?: number;
}

interface VenueTurf {
  _id: string;
  name: string;
  address?: {
    line1?: string; line2?: string; area?: string;
    city?: string; state?: string; pincode?: string;
  };
  googleMapsUrl?: string;
  photos?: string[];
  hasFloodlights?: boolean;
  hasChangingRooms?: boolean;
  hasParking?: boolean;
  hasRefreshments?: boolean;
  isVerified?: boolean;
}

interface VenueDetails {
  turf: VenueTurf;
  rating: { average: number; count: number };
  upcomingGames: VenueGame[];
  pastGames: VenueGame[];
  upcomingHasMore?: boolean;
  pastHasMore?: boolean;
}

type GamesTab = "upcoming" | "past";

/** One tab's accumulated list, plus where its paging has got to. */
type GamesPage = { items: VenueGame[]; page: number; hasMore: boolean; loading: boolean };

const EMPTY_PAGE: GamesPage = { items: [], page: 1, hasMore: false, loading: false };

// Matches VENUE_GAMES_PAGE_SIZE in the backend's turf.controller.js, so the
// first page (which arrives with /details) and every later one are the same size.
const GAMES_PAGE_SIZE = 6;

interface VenueModalProps {
  turfId: string;
  /** Shown as the heading until the fetch lands, so the sheet never opens blank. */
  fallbackName?: string;
  onClose: () => void;
  /** Opening a game from here replaces this sheet with that game's details. */
  onOpenGame?: (gameId: string) => void;
}


const AMENITIES: { key: keyof VenueTurf; label: string; Icon: typeof Car; colour: string }[] = [
  { key: "hasParking",       label: "Parking",        Icon: Car,       colour: "#9ca3af" },
  { key: "hasFloodlights",   label: "Floodlights",    Icon: Lightbulb, colour: "#facc15" },
  { key: "hasChangingRooms", label: "Changing Rooms", Icon: Shirt,     colour: "#9ca3af" },
  { key: "hasRefreshments",  label: "Refreshments",   Icon: CupSoda,   colour: "#60a5fa" },
];

function fmtGameDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata", day: "numeric", month: "short",
  });
}

function fmtGameTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit",
  });
}

function GameRow({ game, past, onOpen }: { game: VenueGame; past?: boolean; onOpen?: () => void }) {
  return (
    <button
      type="button"
      className={`vm-game-row${past ? " past" : ""}`}
      onClick={onOpen}
      disabled={!onOpen || past}
    >
      <span className="vm-game-icon">
        <Calendar size={16} strokeWidth={2} />
      </span>
      <span className="vm-game-body">
        <span className="vm-game-title">{game.title || `${game.format || "Game"} football`}</span>
        <span className="vm-game-meta">
          <span><Calendar size={12} strokeWidth={2} /> {fmtGameDate(game.scheduledAt)}</span>
          <span>•</span>
          <span><Clock size={12} strokeWidth={2} /> {fmtGameTime(game.scheduledAt)}</span>
          {game.format && <><span>•</span><span>{game.format}</span></>}
        </span>
      </span>
      {onOpen && <ChevronRight className="vm-game-chevron" size={20} strokeWidth={2} />}
    </button>
  );
}

export function VenueModal({ turfId, fallbackName, onClose, onOpenGame }: VenueModalProps) {
  const [details, setDetails] = useState<VenueDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gamesTab, setGamesTab] = useState<GamesTab>("upcoming");
  // Keyed by URL, not index: the rendered list is already filtered, so an index
  // from it would point at the wrong entry in the original array.
  const [brokenPhotos, setBrokenPhotos] = useState<Set<string>>(new Set());
  // Each tab pages independently and keeps what it has already loaded, so
  // switching back does not re-fetch or lose the reader's place.
  const [pages, setPages] = useState<Record<GamesTab, GamesPage>>({
    upcoming: EMPTY_PAGE,
    past: EMPTY_PAGE,
  });
  // A callback ref rather than useRef: it re-runs the observer effect when the
  // sentinel node actually mounts, which a ref object's silent mutation cannot.
  const [sentinel, setSentinel] = useState<HTMLElement | null>(null);
  // Read inside loadMore so it sees the live page state without being rebuilt
  // on every append — a new identity each time would tear down and re-arm the
  // observer mid-scroll.
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  // No synchronous reset at the top: the sheet is mounted fresh per venue (the
  // caller keys it on the turf id), so `loading` starts true and only the
  // fetch's own callbacks move it.
  useEffect(() => {
    let cancelled = false;

    fetchWithRetry(buildApiUrl(`/turfs/${turfId}/details`))
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data?.success || !data.data) {
          setError(data?.message || "Could not load this venue.");
          return;
        }
        const payload = data.data as VenueDetails;
        setDetails(payload);
        // /details already carries page 1 of both lists, so scrolling only ever
        // asks for page 2 onward.
        setPages({
          upcoming: { items: payload.upcomingGames || [], page: 1, hasMore: Boolean(payload.upcomingHasMore), loading: false },
          past:     { items: payload.pastGames     || [], page: 1, hasMore: Boolean(payload.pastHasMore),     loading: false },
        });
      })
      .catch(() => {
        if (!cancelled) setError("Could not load this venue. Check your connection and try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [turfId]);

  
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const turf = details?.turf;
  const name = turf?.name || fallbackName || "Venue";
  const cityLine = [turf?.address?.area, turf?.address?.city].filter(Boolean).join(", ");

  // A bare "maps.google.com/..." typed by an admin is not a usable href — the
  // browser would resolve it against the dashboard's own origin.
  const mapsUrl = turf?.googleMapsUrl
    ? (/^https?:\/\//i.test(turf.googleMapsUrl) ? turf.googleMapsUrl : `https://${turf.googleMapsUrl}`)
    : null;

  // A photo that fails to load drops out. Venues added since photos became
  // mandatory always have at least one; the older ones have none, and the strip
  // is skipped entirely rather than standing in for them.
  const photos = (turf?.photos || []).filter((p) => !brokenPhotos.has(p));

  const amenities = turf ? AMENITIES.filter((a) => Boolean(turf[a.key])) : [];
  const current = pages[gamesTab];

  // Reveal the next page — from the sentinel scrolling into view. Guarded
  // against firing twice while one request is already in flight.
  const loadMore = useCallback(async () => {
    const tab = gamesTab;
    const state = pagesRef.current[tab];
    if (state.loading || !state.hasMore) return;

    setPages((prev) => ({ ...prev, [tab]: { ...prev[tab], loading: true } }));
    const next = state.page + 1;
    try {
      const res = await fetchWithRetry(
        buildApiUrl(`/turfs/${turfId}/games?type=${tab}&page=${next}&limit=${GAMES_PAGE_SIZE}`),
      );
      const data = await res.json();
      if (!data?.success || !data.data) throw new Error("bad response");

      setPages((prev) => {
        const seen = new Set(prev[tab].items.map((g) => g._id));
        // A game that crossed from upcoming to past between pages would
        // otherwise arrive twice and collide on its React key.
        const fresh = (data.data.games as VenueGame[]).filter((g) => !seen.has(g._id));
        return {
          ...prev,
          [tab]: { items: [...prev[tab].items, ...fresh], page: next, hasMore: Boolean(data.data.hasMore), loading: false },
        };
      });
    } catch {
      // Stop paging rather than retry-looping the sentinel into a hot spin;
      // what has already loaded stays on screen.
      setPages((prev) => ({ ...prev, [tab]: { ...prev[tab], hasMore: false, loading: false } }));
    }
  }, [gamesTab, turfId]);

  useEffect(() => {
    if (!sentinel || !current.hasMore) return;
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) loadMore(); },
      // Smaller than the dashboard's 400px: this list scrolls inside a modal
      // only a few hundred pixels tall, and a margin that big would fire on
      // open, before the reader has scrolled at all.
      { rootMargin: "120px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinel, current.hasMore, loadMore]);


  return (
    <div className="vm-overlay" onClick={onClose}>
      <div className="vm-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="vm-close" onClick={onClose} aria-label="Close venue details">
          <X size={20} strokeWidth={2} />
        </button>

        <div className="vm-body">
          {loading && (
            <div className="vm-state">
              <div className="vm-spinner" />
              <p>Loading venue…</p>
            </div>
          )}

          {!loading && error && (
            <div className="vm-state">
              <MapPin size={26} strokeWidth={1.6} />
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && turf && (
            <>
              {photos.length > 0 && (
                <div className="vm-photos">
                  {photos.map((photo, index) => (
                    <div className="vm-photo-wrap" key={`${photo}-${index}`}>
                      <Image
                        src={resolveImageUrl(photo)}
                        alt={`${name} — photo ${index + 1}`}
                        className="vm-photo"
                        width={320}
                        height={224}
                        loading="lazy"
                        onError={() => setBrokenPhotos((prev) => new Set(prev).add(photo))}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="vm-content">
              <div className="vm-head">
                <div className="vm-head-main">
                  <h2 className="vm-name">{name}</h2>
                  {cityLine && <p className="vm-city">{cityLine}</p>}
                  {details.rating.count > 0 ? (
                    <div className="vm-rating">
                      <Star size={16} strokeWidth={2} className="vm-star" />
                      {details.rating.average}
                      <span>({details.rating.count} {details.rating.count === 1 ? "Review" : "Reviews"})</span>
                    </div>
                  ) : (
                    <div className="vm-rating vm-rating-empty">Not rated yet</div>
                  )}
                </div>

                {mapsUrl && (
                  <a
                    className="vm-map-btn"
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MapPin className="vm-map-pin" size={16} strokeWidth={2} />
                    View Map
                    <ExternalLink className="vm-map-ext" size={12} strokeWidth={2} />
                  </a>
                )}
              </div>

              {amenities.length > 0 && (
                <section className="vm-section">
                  <h3 className="vm-section-title">Amenities</h3>
                  <div className="vm-chips">
                    {amenities.map(({ key, label, Icon, colour }) => (
                      <span className="vm-chip" key={String(key)}>
                        <Icon size={16} strokeWidth={2} style={{ color: colour }} />
                        {label}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              <section className="vm-section">
                <div className="vm-tabs">
                  <button
                    type="button"
                    className={`vm-tab${gamesTab === "upcoming" ? " active" : ""}`}
                    onClick={() => setGamesTab("upcoming")}
                  >
                    Upcoming Games
                  </button>
                  <button
                    type="button"
                    className={`vm-tab${gamesTab === "past" ? " active" : ""}`}
                    onClick={() => setGamesTab("past")}
                  >
                    Past Games
                  </button>
                </div>

                <div className="vm-games">
                  {current.items.length > 0 ? (
                    <>
                      {current.items.map((game) => (
                        <GameRow
                          key={game._id}
                          game={game}
                          past={gamesTab === "past"}
                          onOpen={onOpenGame ? () => onOpenGame(game._id) : undefined}
                        />
                      ))}

                      {current.hasMore && (
                        <div key={gamesTab} ref={setSentinel} className="vm-games-more">
                          {current.loading ? "Loading more…" : ""}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="vm-empty">
                      {gamesTab === "upcoming"
                        ? "No games scheduled here yet."
                        : "No games have been played here yet."}
                    </p>
                  )}
                </div>
              </section>
              </div>{/* end vm-content */}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default VenueModal;
