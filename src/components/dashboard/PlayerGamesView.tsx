"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { EventCard, EventStatus } from "@/components/dashboard/EventCard";
import { BookingModal } from "@/components/dashboard/BookingModal";
import { TeamOutcomeBadge } from "@/components/PlayPreferences";
import { PublishedTeamsView, type PublishedTeams } from "@/components/dashboard/PublishedTeams";
import type { BookingGuest } from "@/components/dashboard/BookingModal";
import { GameFeedbackModal } from "@/components/dashboard/GameFeedbackModal";
import { InviteConfirmModal } from "@/components/InviteConfirmModal";
import { InviteFriendsModal } from "@/components/InviteFriendsModal";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { Toast, useToast } from "@/components/ui/Toast";
import { InfoTip, InfoTipButton, InfoTipPanel } from "@/components/ui/InfoTip";
import { buildApiUrl, clearSession, getSession,resolveImageUrl } from "@/utils/api";
import { avatarInitials } from "@/utils/avatar";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import CityPicker from "@/components/dashboard/CityPicker";
import GameFilters from "@/components/dashboard/GameFilters";
import {
  type BrowseContext,
  type BrowseFacets,
  type BrowseFilters,
  activeFilterCount,
  clearFilters,
  filtersFromParams,
  filtersToQuery,
  filtersToSearchParams,
  getStoredMetro,
  setStoredMetro,
} from "@/utils/browse";
import "@/app/dashboard/player-dashboard.css";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { GameRules } from "@/components/dashboard/GameRules";
import ProgressBar from "../ui/ProgressBar";
import Image from "next/image";


/**
 * Which slice of the player's games this page shows. These used to be four tabs
 * on one page, which meant every visit paid for all four: the browse list, plus
 * every game the player had ever joined, cancelled or played, all fetched up
 * front and re-fetched every 20 seconds. They are four routes now, and each one
 * asks the server only for its own slice.
 */
export type PlayerSection = "all" | "my-games" | "cancelled" | "completed";

/** What the server scopes `/games/my-games` to for each of the own-games pages. */
const SECTION_SCOPE: Record<Exclude<PlayerSection, "all">, string> = {
  "my-games": "upcoming",
  cancelled:  "cancelled",
  completed:  "completed",
};

// One screenful of browse results. The old page asked for 50 games at once and
// rendered every one — a card carries its whole roster, so that was by far the
// heaviest thing on the dashboard. The rest arrive as the player scrolls.
const BROWSE_PAGE_SIZE = 12;

// Cancelled and Completed only ever grow, so they are paged the same way — and
// at the same size, since a history card costs the same to fetch and render as
// a browse one.
const HISTORY_PAGE_SIZE = 12;

// How often the browse list re-reads itself in the background. The old page did
// this every 20 seconds for all four lists at once, which is why it was taken
// out. A minute, on browse alone, is enough to catch a game filling up or a new
// one opening without the page talking to the server all the time.
const BROWSE_REFRESH_MS = 60_000;

// Returning to the tab also re-reads the list, so a player who has been away
// does not sit in front of a stale one until the next tick. That fires on both
// window focus and tab visibility — which can arrive together, and again on
// every flick between windows — so no two refreshes run closer than this.
const BROWSE_REFRESH_MIN_GAP_MS = 20_000;

// The most a refresh can re-read in one request: the backend caps a page at 50
// (MAX_LIMIT in gameFilters.js), so this stays a whole number of pages under it.
// A player scrolled further than this keeps the rest of their list untouched —
// only the head is re-read.
const BROWSE_REFRESH_MAX = BROWSE_PAGE_SIZE * 4;

// A `game-update` says a game's numbers moved but carries no roster, so the card
// has to re-read the game to learn WHO moved. Two things keep that cheap: the
// event is a global broadcast (every client hears about every game), so only
// games actually on screen are ever re-read, and a burst — one booking with two
// guests, or several people acting on the same game at once — is collected into
// a single round of fetches rather than one request per event.
const ROSTER_REFRESH_DEBOUNCE_MS = 1_500;

// Ceiling on one round, for the pathological case where a burst touches half the
// list. Anything dropped is picked up by the minute refresh.
const ROSTER_REFRESH_MAX = 6;

// With the tab strip gone, the heading is what tells the player which of the
// four lists they are looking at.
const SECTION_META: Record<PlayerSection, {
  eyebrow: string;
  title: React.ReactNode;
  emptyTitle: string;
  emptyBody: string;
}> = {
  "all": {
    eyebrow: "Live",
    title: <>Your Football <span>World</span></>,
    emptyTitle: "No games found",
    emptyBody: "No upcoming games here yet. Check back soon, or switch to another city.",
  },
  "my-games": {
    eyebrow: "Booked",
    title: <>My <span>Games</span></>,
    emptyTitle: "No games booked",
    emptyBody: "You haven't joined a game yet. Browse what's on and grab a spot.",
  },
  "cancelled": {
    eyebrow: "History",
    title: <>Cancelled <span>Games</span></>,
    emptyTitle: "Nothing cancelled",
    emptyBody: "None of your games have been called off. Long may it last.",
  },
  "completed": {
    eyebrow: "History",
    title: <>Completed <span>Games</span></>,
    emptyTitle: "No games played yet",
    emptyBody: "Once you've played a game it'll show up here, ready to rate.",
  },
};



const POPUP_SHOWN_KEY = "kk_feedback_popup_shown";
const getShownPopupIds = (): string[] => {
  try { return JSON.parse(localStorage.getItem(POPUP_SHOWN_KEY) || "[]"); } catch { return []; }
};
const markPopupShown = (gameId: string) => {
  const shown = getShownPopupIds();
  if (!shown.includes(gameId)) {
    localStorage.setItem(POPUP_SHOWN_KEY, JSON.stringify([...shown, gameId]));
  }
};

const POS_FULL_LABEL: Record<string, string> = {
  goalkeeper: "Goalkeeper", defender: "Defender", midfielder: "Midfielder", forward: "Forward", any: "Any",
};

type RosterRowProps = {
  name: string;
  subLabel: string;
  badge?: "organiser" | "guest";
  optedOut?: boolean;
  guestRow?: boolean;
  imageUrl?: string;
  onAvatarClick: (url: string) => void;
};

const RosterRow = React.memo(function RosterRow({
  name, subLabel, badge, optedOut = false, guestRow = false, imageUrl, onAvatarClick,
}: RosterRowProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = !!imageUrl && failedUrl !== imageUrl;

  const openLightbox = useCallback(
    () => { if (imageUrl) onAvatarClick(imageUrl); },
    [imageUrl, onAvatarClick],
  );
  const onImageError = useCallback(() => setFailedUrl(imageUrl ?? null), [imageUrl]);

  return (
    <div className={`pd-roster-item${guestRow ? " pd-roster-guest-row" : ""}${optedOut ? " pd-roster-item-out" : ""}`}>
      <div className={`pd-roster-avatar${guestRow ? " pd-roster-avatar-sm" : ""}`}>
        {showImage ? (
          <Image 
          width={guestRow?30:36}
           height={guestRow?30:36}
            loading="lazy"
            src={imageUrl}
            alt={name}
            onClick={openLightbox}
            className="pd-roster-avatar-img"
            onError={onImageError}
          />
        ) : (
          <span className="pd-roster-avatar-fallback">{avatarInitials(name)}</span>
        )}
      </div>
      <div className="pd-roster-info">
        <div className="pd-roster-name">{name}</div>
        <div className="pd-roster-sub">{optedOut ? "Not attending" : subLabel}</div>
      </div>
      {badge === "organiser" && <span className="pd-roster-badge pd-roster-badge-org">Organiser</span>}
      {badge === "guest" && <span className="pd-roster-badge pd-roster-badge-guest">Guest</span>}
    </div>
  );
});

export default function PlayerGamesView({ section }: { section: PlayerSection }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeParams = useParams<{ id?: string | string[] }>();
  // The section is the route now, not a tab. Every read below still asks the
  // same question it always did — there is simply nothing left to set.
  const activeTab = section;
  const isBrowse = section === "all";
  const [games, setGames] = useState<any[]>([]);
  const [myGames, setMyGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const openGameId = searchParams.get("openGame");
  const inviteToken = searchParams.get("invite");
  const [inviteFriendsGame, setInviteFriendsGame] = useState<any>(null);
  // Whether the OPEN game offers player invites at all. The platform can turn the
  // feature off, cap it, or extend it to public games, so the affordance is drawn
  // from the server's answer rather than from the game's visibility alone.
  const [inviteConfig, setInviteConfig] = useState<{ canInvite: boolean; code: string } | null>(null);
  // ── Browse filters ────────────────────────────────────────────────────────
  // The URL is the source of truth for what is applied, so a filtered view is
  // shareable and the back button undoes a filter.
  //
  // Read here, in the initial state, rather than in a mount effect. The list is
  // fetched as soon as `isAuthorized` flips, and that flip lands in the SAME
  // commit as an effect's seeding would — the fetch reads the filters first and
  // gets the pre-URL ones. A link naming a city therefore fetched whatever city
  // this browser had stored, while the picker showed the one from the link.
  // Seeding here, one render earlier, is what makes the two agree.
  //
  // Both reads are client-only (localStorage; the address bar). Safe in an
  // initialiser because the whole page renders inside a Suspense boundary — see
  // the route's page.tsx — so its first render is already a client render.
  const [filters, setFilters] = useState<BrowseFilters>(() => {
    const fromUrl = filtersFromParams(new URLSearchParams(searchParams.toString()));
    // The city is the one filter that falls back: everything else is off unless
    // the link asks for it, but a remembered city beats no list at all.
    return { ...fromUrl, metro: fromUrl.metro || getStoredMetro() };
  });
  // Whether the link the player arrived on named a city. It is the one thing
  // that outranks the city on their profile (see fetchBrowseContext): a shared
  // or bookmarked view has to open showing the city it promised, whoever opens
  // it. A ref because it describes the visit, not the current selection — the
  // player can change city afterwards without the link's claim following them.
  const urlMetro = useRef<string | null>(searchParams.get("metro"));
  const [browseContext, setBrowseContext] = useState<BrowseContext | null>(null);
  const [facets, setFacets] = useState<BrowseFacets | null>(null);
  const [totalGames, setTotalGames] = useState(0);
  const [gamesLoading, setGamesLoading] = useState(false);
  // Paging is the server's job on every section now. `listPage` is the last page
  // fetched, `listHasMore` is the server telling us there is another one.
  const [listPage, setListPage] = useState(1);
  const [listHasMore, setListHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // A callback ref rather than useRef: it re-runs the observer effect when the
  // sentinel node actually mounts, which a ref object's silent mutation cannot.
  const [loadMoreSentinel, setLoadMoreSentinel] = useState<HTMLElement | null>(null);
  // The background refresh re-reads the list without being handed a selection,
  // so it would otherwise fetch with whatever filters were set when its callback
  // was built — silently wiping the player's selection every minute. The ref is
  // what keeps it pointed at the current selection.
  const filtersRef = useRef<BrowseFilters>(filters);
  // False until the first filter selection has been fetched by the mount load,
  // so the effect that watches `filters` doesn't duplicate it.
  const filtersSettled = useRef(false);
  // When the browse list was last re-read in the background — the timer and the
  // focus/visibility triggers all check it, so together they stay one request.
  const lastBrowseRefresh = useRef(0);

  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [detailGame, setDetailGame] = useState<any>(null);
  const [cancellingGameId, setCancellingGameId] = useState<string | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const [confirmTitle, setConfirmTitle] = useState<string>("Are you sure?");
  const confirmActionRef = useRef<null | (() => Promise<void>)>(null);
  const { toast, showToast } = useToast();
  const [optingOut, setOptingOut] = useState(false);
  const removingGuestIds = useRef<Set<string>>(new Set());
  const detailGameIdRef = useRef<string | null>(null);
  // Local set of reg IDs removed this session — prevents any background refresh re-showing a removed guest
  const [removedGuestIds, setRemovedGuestIds] = useState<Set<string>>(new Set());
  const [walletBalance, setWalletBalance] = useState(0);
  const [playerPositions, setPlayerPositions] = useState<string[]>([]);
  const [myWaitlist, setMyWaitlist] = useState<any[]>([]);
  const [pendingFeedback, setPendingFeedback] = useState<any[]>([]);
  const [feedbackTargetGame, setFeedbackTargetGame] = useState<any>(null);
  const [popupFeedbackGame, setPopupFeedbackGame] = useState<any>(null);
  // One unprompted feedback popup per visit — see fetchPendingFeedback.
  const promptedThisVisit = useRef(false);
  // Per-game feedback I already submitted — loaded when opening a completed game detail
  const [detailGameFeedback, setDetailGameFeedback] = useState<any>(null);
  const [addingGuest, setAddingGuest] = useState(false);
  const [removingGuestId, setRemovingGuestId] = useState<string | null>(null);
  const [confirmingGwId, setConfirmingGwId] = useState<string | null>(null);
  const [cancellingGwId, setCancellingGwId] = useState<string | null>(null);
  const [guestPrefOpen, setGuestPrefOpen] = useState(false);
  const [guestPrefGame, setGuestPrefGame] = useState<any>(null);
  const [guestPrefPosition, setGuestPrefPosition] = useState("Any");
  const [guestPrefTeam, setGuestPrefTeam] = useState("No Preference");
  const [guestPrefName, setGuestPrefName] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

   const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"teams" | "players" | "details" | "rules">("players");
  // The published team sheet for the open game — null until it loads, and stays
  // null for a game whose organiser has not published teams.
  const [detailTeams, setDetailTeams] = useState<PublishedTeams | null>(null);
  // Which game the open modal is showing. A slow teams response for a game the
  // player has already navigated away from must not hijack the current one.
  const detailRequestRef = useRef<string | null>(null);
  const playerId = Array.isArray(routeParams?.id) ? routeParams.id[0] : routeParams?.id;
  // Where this section lives. Browse is the dashboard root; the other three are
  // their own routes under it.
  const sectionPath = `/dashboard/player/${playerId}${isBrowse ? "" : `/${section}`}`;
  const { isAuthorized } = useAuthGuard({
    requiredRole: "player",
    routeUserId: playerId,
    redirectTo: "/login?role=player",
  });

  // Filtering happens on the server (see backend gameFilters.js) — the query
  // string IS the filter. The filter-change effect passes its selection in
  // explicitly; the background refresh has no such value to hand and falls back
  // to the ref, which tracks the latest one.
  const fetchAllGames = async (
    applied?: BrowseFilters,
    page = 1,
    // Set by the minute refresh only. It re-reads the whole window the player
    // has already scrolled through in one request, so it asks for `window`
    // games rather than a page, and must leave their paging position alone.
    refresh?: { window: number; coversAll: boolean },
  ) => {
    try {
      const { token } = getSession();
      if (!token) {
        setGames([]);
        return;
      }

      const limit = refresh ? refresh.window : BROWSE_PAGE_SIZE;
      const requested = applied ?? filtersRef.current;
      const query = filtersToQuery(requested, { limit, page });
      const res = await fetch(buildApiUrl(`/games${query}`), {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          clearSession();
          router.replace("/login?role=player");
          return;
        }
        // A background refresh that fails is a non-event — the list on screen is
        // still the best answer we have, so leave it rather than blanking it.
        if (!refresh) setGames([]);
        return;
      }

      // A read takes about a second, and the selection can move inside it — a
      // player changing a filter, or the browse context arriving with the city
      // from their profile. Whatever is selected NOW is the answer that should
      // be on screen, so a response for the selection we have already left is
      // dropped rather than painted over the top of the newer one.
      if (filtersRef.current !== requested) return;

      const data = await res.json();
      if (data.success) {
        // Every successful read counts against the refresh gap, not just the
        // background ones — a list the mount load, a filter change or a "load
        // more" has just fetched does not need re-reading on the next focus.
        lastBrowseRefresh.current = Date.now();
        const batch: any[] = data.data || [];
        // Page 1 replaces (a new filter is a new list); later pages append, and
        // de-dupe because a game that filled up between two requests can shift
        // across the page boundary and arrive twice.
        setGames((prev) => {
          if (refresh) {
            // Anything past the re-read window stays exactly as it was. A game
            // that shifted up into the window is in `batch` now, so drop the
            // copy left behind in the tail.
            const tail = prev
              .slice(refresh.window)
              .filter((g) => !batch.some((b) => b._id === g._id));
            return [...batch, ...tail];
          }
          return page > 1
            ? [...prev, ...batch.filter((g) => !prev.some((p) => p._id === g._id))]
            : batch;
        });
        setFacets(data.facets || null);
        setTotalGames(typeof data.total === "number" ? data.total : batch.length);
        // `hasMore` from a refresh only describes the window it asked for, so it
        // is only the truth when that window was the player's whole list.
        if (!refresh || refresh.coversAll) setListHasMore(Boolean(data.hasMore));
        if (!refresh) setListPage(page);
      }
    } catch {
      // non-critical — games will stay as-is on network error
    }
  };

  // Remember the city on the player's profile too, not just in localStorage —
  // that is what lets the backend infer it on their next device without asking.
  // Fire-and-forget: the choice already took effect locally, so a failed write
  // costs nothing more than one inference next time.
  const persistMetro = async (slug: string) => {
    try {
      const { token } = getSession();
      if (!token) return;
      await fetch(buildApiUrl("/players/me"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ location: { city: slug } }),
      });
    } catch {
      // non-critical
    }
  };

  // Cities, filter vocabularies, and this player's inferred city. Fetched once:
  // it changes far more slowly than the game list, and re-fetching it would let
  // the inferred city fight the one the player has since chosen.
  const fetchBrowseContext = async () => {
    try {
      const { token } = getSession();
      if (!token) return;
      const res = await fetch(buildApiUrl("/games/browse-context"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) return;

      const ctx: BrowseContext = data.data;
      setBrowseContext(ctx);

      // Which city this page opens on. The order below is by how much each
      // source really knows about where the player wants to play:
      //
      //   1. the city in the link they followed — an explicit ask, and the only
      //      one that beats their profile
      //   2. the city saved on their profile ('profile'), which is the player's
      //      own answer and follows them between devices
      //   3. whatever this browser last remembered, or the server's weaker
      //      guesses from their game history / the busiest city
      //
      // (2) used to sit below (3): the stored metro seeded the first render, and
      // a city already set was left alone. So a player who changed their city in
      // settings, or who last browsed elsewhere on this browser, kept landing in
      // the old one until they picked again. Picking a city writes both places
      // (persistMetro + setStoredMetro), so the two only diverge when the profile
      // is the newer answer — which is exactly when it should win.
      setFilters((prev) => {
        if (urlMetro.current) return prev;
        if (!ctx.suggestedMetro) return prev;
        const fromProfile = ctx.suggestedFrom === "profile";
        if (prev.metro && !fromProfile) return prev;
        // Same city either way: return `prev` untouched so React bails out and
        // the filter effect below does not re-fetch a list we already have.
        if (prev.metro === ctx.suggestedMetro) return prev;
        // A 'busiest' suggestion is a fallback, not knowledge. Browse it, but do
        // not remember it as though they had picked it.
        if (ctx.suggestedFrom !== "busiest") setStoredMetro(ctx.suggestedMetro);
        // Their old city's area/city chips mean nothing in the new one — same
        // reset the picker does when they change city by hand.
        return { ...prev, metro: ctx.suggestedMetro, city: null, area: null };
      });
    } catch {
      // non-critical — the picker falls back to an empty city list
    }
  };

  // Only ever the slice this page shows. `scope` is what keeps a player with two
  // seasons behind them from being sent every game they have ever joined.
  const fetchMyGames = async (page = 1) => {
    if (isBrowse) return;
    try {
      const { token } = getSession();
      if (!token) {
        setMyGames([]);
        return;
      }

      const scope = SECTION_SCOPE[section];
      const limit = section === "my-games" ? 50 : HISTORY_PAGE_SIZE;
      const res = await fetch(
        buildApiUrl(`/games/my-games?scope=${scope}&page=${page}&limit=${limit}`),
        { headers: { "Authorization": `Bearer ${token}` } },
      );
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          clearSession();
          router.replace("/login?role=player");
          return;
        }
        setMyGames([]);
        return;
      }

      const data = await res.json();
      if (data.success) {
        const batch: any[] = data.data || [];
        setMyGames((prev) =>
          page > 1
            ? [...prev, ...batch.filter((g) => !prev.some((p) => p._id === g._id))]
            : batch,
        );
        setListHasMore(Boolean(data.hasMore));
        setListPage(page);
      }
    } catch {
      // non-critical — transient network blip.
      // Keep existing games in place rather than logging a scary error or blanking the list.
    }
  };

  // Browse gets `_isWaitlisted` / `_myWaitlistStatus` annotated onto each card by
  // the server, so only My Games — which lists waitlisted games in their own
  // right — still needs the full list.
  const fetchMyWaitlist = async () => {
    if (section !== "my-games") return;
    try {
      const { token } = getSession();
      if (!token) { setMyWaitlist([]); return; }
      const res = await fetch(buildApiUrl("/games/my-waitlist"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setMyWaitlist([]); return; }
      const data = await res.json();
      if (data.success) setMyWaitlist(data.data || []);
    } catch {
      setMyWaitlist([]);
    }
  };

  const fetchPlayerProfile = async () => {
    try {
      const { token } = getSession();
      if (!token) return;
      const res = await fetch(buildApiUrl("/players/me"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.data?.preferences?.positions) {
        setPlayerPositions(data.data.preferences.positions);
      }
    } catch {
      // non-critical — positions just won't be pre-filled
    }
  };

  const fetchWalletBalance = async () => {
    try {
      const { token } = getSession();
      if (!token) return;
      const res = await fetch(buildApiUrl("/players/me/wallet"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        const w = data.data?.wallet;
        setWalletBalance((w?.availablePaise ?? w?.balancePaise ?? 0) / 100);
      }
    } catch {
      // non-critical
    }
  };

  const fetchPendingFeedback = async () => {
    try {
      const { token } = getSession();
      if (!token) return;
      const res = await fetch(buildApiUrl("/games/pending-feedback"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        const pending: any[] = data.data || [];
        setPendingFeedback(pending);
        // Show one-time popup for the first game the player hasn't been prompted for yet
        // — and only ONE per visit. This runs again after every submission, so
        // it used to re-open on the next pending game the instant the first was
        // rated. With recurring games all carrying the same title, that second
        // prompt looked like the first one coming back, and players rated
        // "the same game" twice without realising it was a different week.
        // The rest stay one click away: the "Rate Game" button on each
        // completed card, and the Awaiting-Feedback list on My Feedback.
        if (promptedThisVisit.current) return;
        const shown = getShownPopupIds();
        const unseen = pending.find((g: any) => !shown.includes(g._id));
        if (unseen) {
          promptedThisVisit.current = true;
          setPopupFeedbackGame(unseen);
        }
      }
    } catch {
      // non-critical
    }
  };

  // What this page needs on arrival, and nothing else. The browse page never
  // loads the player's own games (the server annotates each card with whether
  // they are in it), and the own-games pages never load the browse list, its
  // filter vocabulary or its city index.
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const work: Promise<unknown>[] = isBrowse
        ? [fetchAllGames(), fetchBrowseContext()]
        : [fetchMyGames(), fetchMyWaitlist()];

      // The wallet and saved positions are only read to fill in a booking, so
      // they are only worth fetching on a page that can open one.
      if (section !== "completed") work.push(fetchPlayerProfile(), fetchWalletBalance());

      await Promise.all(work);
      // Drives the "Rate game" buttons here, and the one-time prompt on the page
      // players land on.
      if (isBrowse || section === "completed") fetchPendingFeedback();
    } finally {
      setLoading(false);
    }
  };

  // Re-read just this page's list — after a booking, a back-out, a guest change.
  // On the own-games lists this is the only thing that re-fetches them: they
  // change when the player acts, so there is no timer on them. Browse has one
  // (see `refreshBrowseList`), because it changes without the player.
  const refreshSection = useCallback(async () => {
    try {
      await (isBrowse ? fetchAllGames() : Promise.all([fetchMyGames(), fetchMyWaitlist()]));
    } catch {
      // non-critical
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized, section]);

  // Reveal the next page — from the sentinel scrolling into view, or the button
  // under it. Unlike the old client-side windowing this is a real request, so it
  // guards against firing twice while one is already in flight.
  const loadMore = useCallback(async () => {
    if (loadingMore || !listHasMore) return;
    setLoadingMore(true);
    try {
      const next = listPage + 1;
      await (isBrowse ? fetchAllGames(undefined, next) : fetchMyGames(next));
    } finally {
      setLoadingMore(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMore, listHasMore, listPage, isBrowse, section]);

  useEffect(() => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }

    fetchDashboardData();
  }, [isAuthorized]);

  // Browse goes stale on its own: games fill up, organisers open new ones or
  // call them off, and nothing the player does on this page tells us about it.
  // The socket already patches spot counts the moment they move, so this is the
  // safety net for everything else — once a minute, browse only. The own-games
  // lists change only when the player acts, and `refreshSection` covers that.
  const refreshBrowseList = async () => {
    if (!isBrowse || !isAuthorized) return;
    // Never cut across a fetch the player is waiting on — a filter change or a
    // "load more" would land after ours and fight over the same list.
    if (loading || gamesLoading || loadingMore) return;
    const now = Date.now();
    if (now - lastBrowseRefresh.current < BROWSE_REFRESH_MIN_GAP_MS) return;
    lastBrowseRefresh.current = now;
    // An empty list is the one most worth re-reading — it is what a player
    // staring at "no games found" is waiting on — so it still asks for a page.
    const loaded = games.length;
    const windowSize = Math.min(Math.max(loaded, BROWSE_PAGE_SIZE), BROWSE_REFRESH_MAX);
    await fetchAllGames(undefined, 1, { window: windowSize, coversAll: windowSize >= loaded });
  };

  useAutoRefresh(isBrowse && isAuthorized ? refreshBrowseList : null, {
    interval:  BROWSE_REFRESH_MS,
    onFocus:   true,
    onVisible: true,
    enabled:   isBrowse && isAuthorized,
  });

  // Real-time wallet: update balance immediately when backend emits wallet-update
  useEffect(() => {
    const handler = (e: Event) => {
      const { availablePaise } = (e as CustomEvent<{ availablePaise: number }>).detail;
      setWalletBalance(availablePaise / 100);
    };
    window.addEventListener("kk-wallet-update", handler);
    return () => window.removeEventListener("kk-wallet-update", handler);
  }, []);

  useEffect(() => { detailGameIdRef.current = detailGame?._id ?? null; }, [detailGame]);

  // Which games have a roster on screen. A `game-update` for anything else is a
  // count patch and nothing more — there is no card to repaint, so no re-read.
  const visibleGameIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    visibleGameIdsRef.current = new Set(
      [...games, ...myGames, ...myWaitlist].map((g: any) => g._id),
    );
  }, [games, myGames, myWaitlist]);

  // Browse and My Games tag the caller's own rows; getGameById does not, and the
  // cards read that tag to tell this player's seat — and the guests they brought,
  // which only they may remove — from everyone else's. Re-tag on the way in, or a
  // refresh silently disowns their guests.
  const annotateMyRows = (regs: any[] = []) => regs.map((r: any) => ({
    ...r,
    _isMyReg: (r.player?._id?.toString() ?? r.player?.toString() ?? "") === playerId,
  }));

  // Re-read one game and fold its roster into every list holding it, plus the
  // modal if that is the game open. The socket payload carries counts only, so
  // without this a player who joined or backed out kept their avatar and name on
  // everyone else's card until the next browse refresh a minute later — the card
  // said "7 of 10" over eight faces.
  const refreshGameRoster = async (gameId: string) => {
    const { token } = getSession();
    if (!token) return;
    try {
      const res = await fetch(buildApiUrl(`/api/v1/games/${gameId}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const d = await res.json();
      if (!d.success || !d.data) return;
      const fresh = d.data;
      const regs  = annotateMyRows(fresh.registrations);
      // Cards read a handful of fields off the game; the rest of the list entry
      // carries annotations this response has no idea about (_isWaitlisted,
      // _myWaitlistStatus), so it is patched, never replaced.
      const patch = (g: any) => g._id !== fresh._id ? g : {
        ...g,
        registrations:      regs,
        spotsRemaining:     fresh.spotsRemaining ?? g.spotsRemaining,
        totalSlots:         fresh.totalSlots ?? g.totalSlots,
        organiserIsPlaying: fresh.organiserIsPlaying ?? g.organiserIsPlaying,
      };
      setGames((prev) => prev.map(patch));
      setMyGames((prev) => prev.map(patch));
      setMyWaitlist((prev) => prev.map(patch));
      setDetailGame((prev: any) => {
        if (!prev || prev._id !== fresh._id) return prev;
        return {
          ...fresh,
          registrations: regs,
          _isWaitlisted: prev._isWaitlisted,
          _waitlistStatus: prev._waitlistStatus,
          _myWaitlistStatus: prev._myWaitlistStatus,
        };
      });
    } catch {
      // A missed re-read is not worth surfacing: the counts are already patched,
      // and the minute refresh catches the roster.
    }
  };

  const rosterQueueRef = useRef<Set<string>>(new Set());
  const rosterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRosterRefresh = (gameId: string) => {
    if (!visibleGameIdsRef.current.has(gameId)) return;
    rosterQueueRef.current.add(gameId);
    if (rosterTimerRef.current) return;
    rosterTimerRef.current = setTimeout(() => {
      rosterTimerRef.current = null;
      const ids = [...rosterQueueRef.current].slice(0, ROSTER_REFRESH_MAX);
      rosterQueueRef.current.clear();
      ids.forEach((id) => { refreshGameRoster(id); });
    }, ROSTER_REFRESH_DEBOUNCE_MS);
  };

  // Real-time game count: patch spotsRemaining + totalSlots in state immediately
  // when any player joins/leaves/adds or removes a guest on any game, then re-read
  // the roster behind it so the faces on the card agree with the number.
  // The open modal is re-read straight away — it is the surface being read most
  // closely, and its waitlist statuses move with the roster.
  useEffect(() => {
    const handler = (e: Event) => {
      const { gameId, spotsRemaining, totalSlots } = (e as CustomEvent<{ gameId: string; spotsRemaining: number; totalSlots: number }>).detail;
      const patch = (g: any) => g._id === gameId ? { ...g, spotsRemaining, totalSlots } : g;
      setGames((prev) => prev.map(patch));
      setMyGames((prev) => prev.map(patch));
      setMyWaitlist((prev) => prev.map(patch));
      setDetailGame((prev: any) => prev?._id === gameId ? { ...prev, spotsRemaining, totalSlots } : prev);

      if (detailGameIdRef.current === gameId) refreshGameRoster(gameId);
      else queueRosterRefresh(gameId);
    };
    window.addEventListener("kk-game-update", handler);
    return () => {
      window.removeEventListener("kk-game-update", handler);
      if (rosterTimerRef.current) clearTimeout(rosterTimerRef.current);
    };
    // Subscribed once, for the life of the page. Both handlers read only refs,
    // state setters and the route's playerId, so the mount-time copies stay
    // correct — re-subscribing on every render would drop the pending queue.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filters ⇄ URL ─────────────────────────────────────────────────────────

  // The filters themselves are seeded in the initial state above, not here.
  // What is left is the write that could not go there: a city that arrived in a
  // link becomes this browser's remembered city, so the next visit without one
  // opens in the same place. Mount only — after this the state drives the URL,
  // not the other way round, or the two would fight.
  useEffect(() => {
    if (!isBrowse) return;
    if (urlMetro.current) setStoredMetro(urlMetro.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch whenever the selection changes, and write it back to the URL.
  // `replace` rather than `push`: every chip tap would otherwise become a
  // history entry, and Back would walk through them one at a time instead of
  // leaving the dashboard.
  useEffect(() => {
    // Keep any later re-read pointed at the current selection. Above the guard
    // below on purpose: a selection that moves before the player is authorised
    // would otherwise leave the ref describing a selection we have left, and
    // the mount load reads the ref — it would fetch the stale one, and
    // fetchAllGames would then drop its own answer as out of date.
    filtersRef.current = filters;

    if (!isAuthorized || !isBrowse) return;

    // The mount load already asked for this exact selection. Fetching again here
    // meant the browse list was requested twice on every single page load — the
    // second request differing from the first only in being wasted. The URL is
    // still written, so a bookmarked view always describes what is on screen.
    const alreadyFetched = !filtersSettled.current;
    filtersSettled.current = true;

    let cancelled = false;
    if (!alreadyFetched) {
      setGamesLoading(true);
      fetchAllGames(filters, 1).finally(() => { if (!cancelled) setGamesLoading(false); });
    }

    const next = filtersToSearchParams(filters, new URLSearchParams(searchParams.toString()));
    const qs = next.toString();
    if (qs !== searchParams.toString()) {
      router.replace(`${sectionPath}${qs ? `?${qs}` : ""}`, { scroll: false });
    }

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, isAuthorized]);

  // Auto-open game detail when arriving via a shared /join/[gameId] link
  useEffect(() => {
    if (loading || !openGameId) return;
    const target = [...games, ...myWaitlist, ...myGames].find((g) => g._id === openGameId);
    
    if (!target) {
      // Game not found in lists — try to fetch from API for new signups
      const fetchGameDetail = async () => {
        try {
          const { token } = getSession();
          if (!token) return;
          
          const res = await fetch(buildApiUrl(`/games/${openGameId}`), {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (!res.ok) return;
          
          const data = await res.json();
          if (data.success && data.data) {
            openGameDetail(data.data);
            // Clear the openGame param from URL, keeping any filters the link
            // carried — dropping them would leave the address bar describing a
            // different view from the one on screen.
            if (playerId) {
              const kept = filtersToSearchParams(filtersRef.current, new URLSearchParams());
              const qs = kept.toString();
              router.replace(`/dashboard/player/${playerId}${qs ? `?${qs}` : ""}`);
            }
          }
        } catch {
          // non-critical — if fetch fails, the game param stays in URL for retry
        }
      };
      
      fetchGameDetail();
      return;
    }
    
    // Use the same function as the "View Details" button so the popup is identical
    // (annotated data, fresh server fetch, feedback for completed games).
    openGameDetail(target);
    // Clear the openGame param from URL only after popup is successfully opened
    if (playerId) {
      const kept = filtersToSearchParams(filtersRef.current, new URLSearchParams());
      const qs = kept.toString();
      router.replace(`${sectionPath}${qs ? `?${qs}` : ""}`, { scroll: false });
    }
  }, [loading, openGameId]); // eslint-disable-line react-hooks/exhaustive-deps



  const openGameDetail = async (game: any) => {
    // Prefer the annotated version from myGames/myWaitlist (has _isMyReg flags) when available
    const annotated =
      myGames.find((g: any) => g._id === game._id) ||
      myWaitlist.find((g: any) => g._id === game._id);
    setDetailGame(annotated || game);
    setDetailGameFeedback(null);
    setDetailTeams(null);
    setDetailTab("players");
    setInviteConfig(null);
    detailRequestRef.current = game._id;

    const { token } = getSession();
    if (!token) return;

    // Teams, if the organiser has published them. This tab then opens first —
    // knowing your side is the reason most people tap into a game they have
    // already joined.
    fetch(buildApiUrl(`/api/v1/games/${game._id}/teams`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) return;
        const d = await res.json();
        if (!d.success || !d.data) return;
        if (detailRequestRef.current !== game._id) return;
        setDetailTeams(d.data);
        setDetailTab("teams");
      })
      .catch(() => {});

    // Silent background refresh — show cached data instantly, update arrays from fresh response
    fetch(buildApiUrl(`/api/v1/games/${game._id}`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) return;
        const d = await res.json();
        if (!d.success || !d.data) return;
        const fresh = d.data;
        setDetailGame((prev: any) => {
          if (!prev || prev._id !== fresh._id) return prev;
          return {
            ...fresh,
            // fresh.passEligible comes from backend if present; fall back to prev to avoid losing it
            passEligible: fresh.passEligible ?? prev.passEligible ?? false,
            _isWaitlisted: prev._isWaitlisted,
            _waitlistStatus: prev._waitlistStatus,
            _myWaitlistStatus: prev._myWaitlistStatus,
          };
        });
        setGames((prev: any[]) =>
          prev.map((g) =>
            g._id === fresh._id
              ? { ...g, spotsRemaining: fresh.spotsRemaining, totalSlots: fresh.totalSlots }
              : g
          )
        );
        setMyGames((prev: any[]) =>
          prev.map((g) => (g._id === fresh._id ? { ...g, ...fresh } : g))
        );
        setMyWaitlist((prev: any[]) =>
          prev.map((g) => (g._id === fresh._id ? { ...g, ...fresh } : g))
        );
      })
      .catch(() => {});

    if (game.status !== "completed") return;
    try {
      const res = await fetch(buildApiUrl(`/api/v1/games/${game._id}/feedback`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success) setDetailGameFeedback(d.data);
      }
    } catch {
      // non-critical
    }
  };

  // Tell the sidebar which entry to light up. The page is the route now, so this
  // is the only thing the old tab bar still needed to do.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sidebarSection =
      section === "my-games" ? "mygames" : section === "all" ? "browse" : section;
    window.dispatchEvent(new CustomEvent("player-tab-change", { detail: sidebarSection }));
  }, [section]);

  const handleBook = (game: any) => {
    const organiserCount = getOrganiserCount(game);
    const spotsLeft = typeof game.spotsRemaining === 'number'
      ? game.spotsRemaining
      : game.totalSlots - getActiveRegs(game) - organiserCount;
    const isFull = spotsLeft <= 0;
    const formattedGame = {
      id: game._id,
      _id: game._id,
      venue: `${game.turf?.name || 'TBC'},${game.turf?.address?.city || 'TBC'}`,
      date: new Date(game.scheduledAt).toISOString().split('T')[0],
      time: new Date(game.scheduledAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }),
      format: game.format,
      fee: game.feeInPaise / 100,
      spots: Math.max(0, spotsLeft),
      waitlist: isFull,
      passEligible: Boolean(game.passEligible),
      requiresApproval: Boolean(game.requiresApproval),
      // Who is already in, so the player can ask to line up with or against them.
      // Guests are keyed by name because a +1 has no player account.
      roster: (game.registrations || [])
        .filter((r: any) =>
          !["refunded", "forfeited"].includes(r.paymentStatus) && !r.optedOut)
        .map((r: any) => (
          r.plusOneName
            ? { id: `guest:${r.plusOneName}`, name: r.plusOneName, isGuest: true }
            : { id: String(r.player?._id || r.player || ""), name: r.player?.name || "Player" }
        ))
        .filter((r: any, i: number, all: any[]) =>
          r.id && r.id !== `guest:` && all.findIndex((x) => x.id === r.id) === i),
    };
    setSelectedGame(formattedGame);
  };

  // Withdraw a pending join request (approval-gated games).
  const handleCancelRequest = async (game: any) => {
    const { token } = getSession();
    if (!token) { clearSession(); router.replace("/login?role=player"); return; }
    try {
      const res = await fetch(buildApiUrl(`/api/v1/games/${game._id}/join-request`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) { showToast("error", data.message || "Couldn't cancel request"); return; }
      showToast("success", "Request cancelled");
      setGames((prev) => prev.map((x) => x._id === game._id ? { ...x, _myRequestStatus: null } : x));
      setDetailGame((prev: any) => prev && prev._id === game._id ? { ...prev, _myRequestStatus: null } : prev);
    } catch {
      showToast("error", "Couldn't cancel request. Please try again.");
    }
  };


  const handleCancelRegistration = async (game: any) => {
    const doCancel = async () => {
      const { token } = getSession();
      if (!token) {
        clearSession();
        router.replace("/login?role=player");
        return;
      }

      setCancellingGameId(game._id);
      try {
        const res = await fetch(buildApiUrl(`/api/v1/games/${game._id}/backout`), {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          showToast("error", data.message || "Unable to cancel registration right now.");
          return;
        }

        showToast("success", "Registration cancelled", data.message || "You've been removed from this game.");
        setDetailGame(null);
        // Strip player's waitlist + guest-waitlist from games state immediately
        // so the 📋 Waitlist panel doesn't show stale names if the game is reopened
        const pid = playerId;
        // Retire this player's rows (and the guests they brought) locally, exactly as
        // the backend just did. Patching only the count left every roster reading off
        // registrations that still held them: the card kept their avatar and name in
        // the signed-up stack and still badged the game "✓ Registered".
        //
        // Taking the response's registrations wholesale is not the fix — backout
        // populates `registrations.player` with name/email only, so every OTHER player
        // on the card would lose their photo.
        const backedOutAt = new Date().toISOString();
        const retireMyRows = (regs: any[] = []) => regs.map((r: any) => {
          const rPid = r.player?._id?.toString() ?? r.player?.toString() ?? '';
          if (r.backedOutAt || !(r._isMyReg || rPid === pid)) return r;
          // 'forfeited' money was never coming back; same carve-out the server makes.
          return {
            ...r,
            backedOutAt,
            paymentStatus: r.paymentStatus === 'forfeited' ? r.paymentStatus : 'refunded',
          };
        });
        setGames((prev) => prev.map((g) => {
          if (g._id !== game._id) return g;
          return {
            ...g,
            spotsRemaining: data.data?.spotsRemaining ?? g.spotsRemaining,
            totalSlots: data.data?.totalSlots ?? g.totalSlots,
            registrations: retireMyRows(g.registrations),
            waitlist: (g.waitlist || []).filter((w: any) => {
              const wPid = w.player?._id?.toString() ?? w.player?.toString() ?? '';
              return wPid !== pid;
            }),
            guestWaitlist: (g.guestWaitlist || []).filter((gw: any) => {
              const gwPid = gw.player?._id?.toString() ?? gw.player?.toString() ?? '';
              return gwPid !== pid;
            }),
          };
        }));
        setMyGames((prev) => prev.filter((x) => x._id !== game._id));
        fetchWalletBalance();
      } catch (error) {
        console.error("Failed to cancel registration", error);
        showToast("error", "Cancellation failed. Please try again.");
      } finally {
        setCancellingGameId(null);
      }
    };

    // Only guests still holding a seat — a guest already retired by an earlier
      // cancellation or removed by the organiser is not losing anything now, and
      // counting it warned about guests that were long gone.
    const guestCount = (game.registrations || []).filter((r: any) => {
      if (!r.plusOneName) return false;
      if (r.backedOutAt || r.removedAt || ["refunded", "forfeited"].includes(r.paymentStatus)) return false;
      return r._isMyReg || r.player?._id?.toString() === playerId || r.player?.toString() === playerId;
    }).length;
    const guestWarning = guestCount > 0
      ? ` Your ${guestCount} guest${guestCount > 1 ? "s" : ""} will also be removed.`
      : "";
    setConfirmMessage(`Do you want to cancel your registration for this event?${guestWarning}`);
    confirmActionRef.current = doCancel;
    setConfirmVisible(true);
  };

  // Rejoin a game the player was removed from by a format change. Confirms, then
  // opts them back in (re-charges the new/alternate fee), and refreshes the lists.
  const handleRejoinFormatChange = (game: any) => {
    const fee = game.feeInPaise || 0;
    const passCovered = Boolean(game.passEligible);
    const feeMsg = passCovered
      ? " Your pass covers this game, so you won't be charged."
      : fee > 0 ? ` ₹${fee / 100} will be debited from your wallet.` : "";
    setConfirmTitle("Rejoin the new format?");
    setConfirmMessage(`The format is now ${game.format}. You'll be added back to the game.${feeMsg}`);
    confirmActionRef.current = async () => {
      const { token } = getSession();
      if (!token) { clearSession(); router.replace("/login?role=player"); return; }
      try {
        const res = await fetch(buildApiUrl(`/api/v1/games/${game._id}/opt-back-in`), {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok || !data.success) { showToast("error", data.message || "Unable to rejoin."); return; }
        showToast("success", "You're back in!", `Rejoined "${game.title}" (${game.format}).`);
        refreshSection(); fetchWalletBalance();
      } catch {
        showToast("error", "Unable to rejoin. Please try again.");
      }
    };
    setConfirmVisible(true);
  };

  const handleOptOut = (wantToPlay: boolean) => {
    if (!detailGame) return;

    const fee = detailGame.feeInPaise || 0;
    const passCovered = Boolean(detailGame.passEligible);

    // What the player actually paid for their own (non-guest) slot.
    // Pass-covered registrations store amountPaidPaise = 0, so there is nothing to refund.
    // Skip tombstones for the same reason myOwnReg does: someone who left and signed
    // up again has both rows, and the stale one quotes the wrong refund.
    const ownReg = (detailGame.registrations || []).find((r: any) =>
      !r.plusOneName && !r.backedOutAt && !r.removedAt
        && (r._isMyReg || r.player?._id?.toString() === playerId || r.player?.toString() === playerId)
    );
    const ownPaidPaise = ownReg?.amountPaidPaise ?? 0;

    // Build confirmation copy
    if (wantToPlay) {
      const gameFull = detailSpotsLeft === 0;
      if (gameFull) {
        setConfirmTitle("Join waitlist to rejoin?");
        setConfirmMessage(
          myGuestCount > 0
            ? "The game is full. We'll add you to the waitlist and notify you when a slot opens. Your guest is still registered — no charge now."
            : "The game is full. We'll add you to the waitlist and notify you when a slot opens."
        );
      } else {
        setConfirmTitle("Rejoin this game?");
        // Rejoin charge depends on CURRENT pass eligibility — backend re-checks the live pass.
        const feeMsg = passCovered
          ? " Your pass covers this game, so you won't be charged."
          : fee > 0
            ? ` ₹${fee / 100} will be debited from your wallet.`
            : "";
        setConfirmMessage(`You'll be marked as attending again.${feeMsg}`);
      }
    } else {
      setConfirmTitle("Skip this game?");
      const guestCount = (detailGame.registrations || []).filter((r: any) =>
        r.plusOneName && (r._isMyReg || r.player?._id?.toString() === playerId || r.player?.toString() === playerId)
      ).length;
      const guestMsg = guestCount > 0
        ? ` Your ${guestCount} guest${guestCount > 1 ? "s" : ""} will remain registered.`
        : "";
      // Refund reflects what was actually paid for the player's own slot, not the game fee.
      // Pass-covered players paid ₹0 → no refund.
      const feeMsg = ownPaidPaise > 0
        ? ` ₹${ownPaidPaise / 100} will be refunded to your wallet.`
        : passCovered
          ? " Your slot was covered by your pass, so there's nothing to refund."
          : "";
      setConfirmMessage(`You'll be marked as not attending.${guestMsg}${feeMsg}`);
    }

    confirmActionRef.current = async () => {
      const endpoint = wantToPlay ? "opt-back-in" : "opt-out";
      setOptingOut(true);
      try {
        const { token } = getSession();
        if (!token) { clearSession(); router.replace("/login?role=player"); return; }
        const res = await fetch(buildApiUrl(`/api/v1/games/${detailGame._id}/${endpoint}`), {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          showToast("error", data.message || "Unable to update attendance.");
          return;
        }
        if (data.data) {
          // Merge fresh data onto existing detailGame so populated fields (organiser, player names)
          // are never replaced by raw IDs from the response. Only spots/registration flags change.
          setDetailGame((prev: any) => {
            if (!prev || prev._id !== data.data._id) return data.data;
            const mergedRegs = (data.data.registrations || []).map((nr: any) => {
              const existing = (prev.registrations || []).find((r: any) => String(r._id) === String(nr._id));
              if (!existing) return nr;
              return {
                ...nr,
                player: (nr.player && typeof nr.player === 'object' && nr.player.name) ? nr.player : (existing.player ?? nr.player),
              };
            });
            return {
              ...prev,
              ...data.data,
              organiser: (data.data.organiser && typeof data.data.organiser === 'object' && data.data.organiser.name)
                ? data.data.organiser
                : (prev.organiser ?? data.data.organiser),
              registrations: mergedRegs,
            };
          });
          setMyGames((prev: any[]) => prev.map((g: any) => g._id === data.data._id ? { ...g, ...data.data } : g));
        }
        if (data.code === "JOINED_WAITLIST") {
          showToast("success", "Added to waitlist", "We'll notify you when a spot opens. Your guests are still registered.");
        } else {
          showToast("success", wantToPlay ? "You're back in!" : "Opted out — your guests remain registered.", data.message);
        }
      } catch {
        showToast("error", "Something went wrong. Please try again.");
      } finally {
        setOptingOut(false);
      }
    };

    setConfirmVisible(true);
  };

  const handleConfirmBooking = async (
    game: any,
    guests: BookingGuest[],
    teamPreference: string,
    willingIfFormatChange: boolean,
    waitlistGuests?: BookingGuest[],
    teamRequests?: { playerId?: string; guestName?: string; relation: "with" | "against" }[],
  ) => {
    try {
      const { token } = getSession();
      if (!token) {
        clearSession();
        router.replace("/login?role=player");
        return;
      }

      const isWaitlist = Boolean(game.waitlist);
      const endpoint = isWaitlist
        ? `/api/v1/games/${game._id}/waitlist`
        : `/api/v1/games/${game._id}/register`;

      const body: any = {
        teamPreference,
        positions: playerPositions,
        teamRequests: teamRequests || [],
        guests: guests.map((g, index) => {
          const fallbackName = `Guest ${index + 1}`;
          return {
            name: (g.name || fallbackName).trim() || fallbackName,
            position: g.position || "Any",
            teamPreference: g.teamPreference || "No Preference",
          };
        }),
      };
      if (!isWaitlist) body.willingIfFormatChange = willingIfFormatChange;
      if (!isWaitlist && waitlistGuests && waitlistGuests.length > 0) {
        body.waitlistGuests = waitlistGuests.map((g, index) => {
          const fallbackName = `Guest ${index + 1}`;
          return {
            name: (g.name || fallbackName).trim() || fallbackName,
            position: g.position || "Any",
            teamPreference: g.teamPreference || "No Preference",
          };
        });
      }

      const res = await fetch(buildApiUrl(endpoint), {
        method: 'POST',
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        // Approval-gated game → a join request was filed, nothing charged yet.
        if (!isWaitlist && data.data?.status === "pending") {
          setSelectedGame(null);
          const fee = typeof data.data.payableFee === "number" ? data.data.payableFee : (game.feeInPaise || 0) / 100;
          showToast("success", "Request sent", `Awaiting organiser approval.${fee > 0 ? ` You'll be charged ₹${fee} once approved.` : ""}`);
          setGames((prev) => prev.map((x) => x._id === game._id ? { ...x, _myRequestStatus: "pending" } : x));
          return;
        }
        setSelectedGame(null);
        fetchWalletBalance();
        // Patch state immediately from the response — no setTimeout, no full re-fetch
        if (data.data) {
          const g = data.data;
          const countPatch = { spotsRemaining: g.spotsRemaining, totalSlots: g.totalSlots };
          setGames((prev) => prev.map((x) => x._id === g._id ? { ...x, ...countPatch } : x));
          setMyGames((prev) => {
            const has = prev.some((x) => x._id === g._id);
            return has ? prev.map((x) => x._id === g._id ? g : x) : [...prev, g];
          });
        }
        if (isWaitlist) {
          showToast("success", "Joined Waitlist!", "We'll notify you when a spot opens.");
          // Patch immediately from the response — no re-fetch needed. The browse
          // card reads `_isWaitlisted` off the game itself (the server annotates
          // it), so patch that too or the badge waits for a reload.
          if (data.data) {
            const wg = { ...data.data, _isWaitlisted: true, _waitlistStatus: 'waiting', _myWaitlistStatus: data.data._myWaitlistStatus || 'waiting' };
            setMyWaitlist((prev) => [...prev.filter((x) => x._id !== wg._id), wg]);
            setGames((prev) => prev.map((g) => g._id === wg._id
              ? { ...g, _isWaitlisted: true, _myWaitlistStatus: wg._myWaitlistStatus }
              : g));
          }
          // Confirm with fresh server data so the list updates even if the
          // optimistic patch above is lost during a concurrent React render.
          refreshSection();
        } else {
          const autoGuests: string[] = data.autoConfirmedGuests || [];
          const waitlistAdded: number = data.waitlistGuestsAdded || 0;
          let msg = "✓ Event booking confirmed!";
          let subtitle: string | undefined;
          if (autoGuests.length === 1) {
            subtitle = `${autoGuests[0]} also confirmed from waitlist`;
          } else if (autoGuests.length > 1) {
            subtitle = `${autoGuests.length} guests also confirmed from waitlist`;
          }
          if (waitlistAdded > 0) {
            const wlLine = `${waitlistAdded} guest${waitlistAdded > 1 ? 's' : ''} added to waitlist`;
            subtitle = subtitle ? `${subtitle} · ${wlLine}` : wlLine;
            // Guest waitlist entries — patch myWaitlist immediately
            if (data.data) {
              setMyWaitlist((prev) => prev.map((x) => x._id === data.data._id ? { ...x, guestWaitlist: data.data.guestWaitlist } : x));
            }
          }
          showToast("success", msg, subtitle);
          // My Games is its own page now, so confirming a booking navigates to
          // it rather than flipping a tab. It fetches its own list on arrival —
          // there is nothing to re-fetch from here.
          if (playerId && section !== "my-games") {
            router.push(`/dashboard/player/${playerId}/my-games`);
          } else {
            refreshSection();
          }
        }
      } else {
        if (data.code === "INSUFFICIENT_BALANCE") {
          setSelectedGame(null);
          showToast("error", "Insufficient balance", "Please recharge your wallet to sign up.");
          if (playerId) {
            setTimeout(() => router.push(`/dashboard/player/${playerId}/wallet`), 1000);
          }
        } else if (data.code === "RACE_REFUND_FAILED") {
          setSelectedGame(null);
          showToast("error", "Spot taken", "We couldn't auto-refund. Please contact support.");
        } else {
          showToast("error", data.message || (isWaitlist ? "Waitlist failed." : "Registration failed."));
          setSelectedGame(null);
          // Backend debited then refunded on a race loss — re-sync wallet balance
          if (res.status === 409) fetchWalletBalance();
        }
      }
    } catch {
      showToast("error", "An error occurred. Please try again.");
      setSelectedGame(null);
    }
  };

  const handleLeaveWaitlist = async (game: any) => {
    const { token } = getSession();
    if (!token) { clearSession(); router.replace("/login?role=player"); return; }
    const doLeave = async () => {
      try {
        const res = await fetch(buildApiUrl(`/api/v1/games/${game._id}/leave-waitlist`), {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          showToast("error", data.message || "Failed to leave waitlist.");
          return;
        }
        showToast("success", "Removed from waitlist");
        setDetailGame(null);
        setMyWaitlist((prev) => prev.filter((x) => x._id !== game._id));
        // Strip player's waitlist + guest-waitlist entries from games state immediately
        // so the panel doesn't show stale names if the same game is opened again
        const pid = playerId;
        setGames((prev) => prev.map((g) => {
          if (g._id !== game._id) return g;
          return {
            ...g,
            waitlist: (g.waitlist || []).filter((w: any) => {
              const wPid = w.player?._id?.toString() ?? w.player?.toString() ?? '';
              return wPid !== pid;
            }),
            guestWaitlist: (g.guestWaitlist || []).filter((gw: any) => {
              const gwPid = gw.player?._id?.toString() ?? gw.player?.toString() ?? '';
              return gwPid !== pid;
            }),
          };
        }));
      } catch {
        showToast("error", "Failed to leave waitlist. Please try again.");
      }
    };

    setConfirmMessage("Remove yourself from the waitlist for this event?");
    confirmActionRef.current = doLeave;
    setConfirmVisible(true);
  };

  const promptAddGuest = (game: any) => {
    setGuestPrefGame(game);
    setGuestPrefPosition("Any");
    setGuestPrefTeam("No Preference");
    setGuestPrefName("");
    setGuestPrefOpen(true);
  };

  const handleAddGuest = async (game: any, position = "Any", teamPreference = "No Preference", guestName = "") => {
    const { token } = getSession();
    if (!token) { clearSession(); router.replace("/login?role=player"); return; }
    setAddingGuest(true);
    setGuestPrefOpen(false);
    try {
      const body: Record<string, string> = { position, teamPreference };
      if (guestName.trim()) body.guestName = guestName.trim();
      const res = await fetch(buildApiUrl(`/api/v1/games/${game._id}/add-guest`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.code === "INSUFFICIENT_BALANCE") {
          showToast("error", "Insufficient wallet balance");
          if (playerId) setTimeout(() => router.push(`/dashboard/player/${playerId}/wallet`), 1000);
        } else if (data.code === "RACE_REFUND_FAILED") {
          showToast("error", "Spot taken", "We couldn't auto-refund. Please contact support.");
        } else {
          showToast("error", data.message || "Failed to add guest.");
        }
        return;
      }
      const g = data.data;
      setDetailGame(g);
      setMyGames((prev) => prev.map((x) => x._id === g._id ? g : x));
      setGames((prev) => prev.map((x) => x._id === g._id ? { ...x, spotsRemaining: g.spotsRemaining, totalSlots: g.totalSlots } : x));
      fetchWalletBalance();
      if (data.pending) {
        showToast("success", "Guest Requested", "Awaiting the organiser's approval. You'll be notified.");
      } else if (data.waitlisted) {
        showToast("success", "Added to Waitlist", "You'll be notified when a spot opens.");
      } else {
        showToast("success", "Guest Added!", data.message || undefined);
      }
    } catch {
      showToast("error", "Failed to add guest. Please try again.");
    } finally {
      setAddingGuest(false);
    }
  };

  const handleConfirmGuestWaitlist = async (game: any, gwId: string) => {
    const { token } = getSession();
    if (!token) { clearSession(); router.replace("/login?role=player"); return; }
    setConfirmingGwId(gwId);
    try {
      const res = await fetch(buildApiUrl(`/api/v1/games/${game._id}/confirm-guest-waitlist/${gwId}`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.code === "INSUFFICIENT_BALANCE") {
          showToast("error", "Insufficient wallet balance");
          if (playerId) setTimeout(() => router.push(`/dashboard/player/${playerId}/wallet`), 1000);
        } else if (data.code === "RACE_REFUND_FAILED") {
          showToast("error", "Slot taken", "We couldn't auto-refund your payment. Please contact support.");
        } else {
          showToast("error", data.message || "Could not confirm guest.");
          if (res.status === 409) {
            // Slot was taken — backend reset status to 'waiting' and refunded; re-sync both
            fetchWalletBalance();
            // Refresh game data so the stale "Confirm" button disappears
            setDetailGame((prev: any) => {
              if (!prev) return prev;
              return {
                ...prev,
                guestWaitlist: (prev.guestWaitlist || []).map((g: any) =>
                  g._id === gwId ? { ...g, status: "waiting" } : g
                ),
              };
            });
          }
        }
        return;
      }
      const cg = data.data;
      setDetailGame(cg);
      setMyGames((prev) => prev.map((x) => x._id === cg._id ? cg : x));
      setGames((prev) => prev.map((x) => x._id === cg._id ? { ...x, spotsRemaining: cg.spotsRemaining, totalSlots: cg.totalSlots } : x));
      fetchWalletBalance();
      const feeAmt = detailGame?.feeInPaise || 0;
      if (data.pending) {
        showToast("success", "Guest Requested", "Awaiting the organiser's approval. You'll be notified.");
      } else {
        showToast("success", "Guest Confirmed!", feeAmt > 0 ? `₹${Math.round(feeAmt / 100)} debited from your wallet.` : undefined);
      }
    } catch {
      showToast("error", "Failed to confirm guest. Please try again.");
    } finally {
      setConfirmingGwId(null);
    }
  };

  const handleCancelGuestWaitlist = async (game: any, gwId: string, guestName: string) => {
    const doCancel = async () => {
      const { token } = getSession();
      if (!token) { clearSession(); router.replace("/login?role=player"); return; }
      setCancellingGwId(gwId);
      try {
        const res = await fetch(buildApiUrl(`/api/v1/games/${game._id}/cancel-guest-waitlist/${gwId}`), {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok || !data.success) { showToast("error", data.message || "Failed to remove from waitlist."); return; }
        const wg = data.data;
        setDetailGame(wg);
        setMyGames((prev) => prev.map((x) => x._id === wg._id ? wg : x));
        // Patch myWaitlist in-place — no re-fetch needed
        setMyWaitlist((prev) => prev.map((x) => x._id === wg._id ? wg : x));
        showToast("success", `${guestName} removed from waitlist`);
      } catch {
        showToast("error", "Failed to remove from waitlist.");
      } finally {
        setCancellingGwId(null);
      }
    };
    setConfirmMessage(`Remove ${guestName} from the waitlist?`);
    confirmActionRef.current = doCancel;
    setConfirmVisible(true);
  };

  const handleRemoveGuest = async (game: any, regId: string) => {
    if (removingGuestIds.current.has(regId)) return;
    removingGuestIds.current.add(regId);
    const { token } = getSession();
    if (!token) {
      removingGuestIds.current.delete(regId);
      // Rollback local removal
      setRemovedGuestIds((prev) => { const s = new Set(prev); s.delete(regId); return s; });
      clearSession(); router.replace("/login?role=player"); return;
    }
    setRemovingGuestId(regId);
    try {
      const res = await fetch(buildApiUrl(`/api/v1/games/${game._id}/remove-guest/${regId}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        // Rollback: make the guest reappear
        setRemovedGuestIds((prev) => { const s = new Set(prev); s.delete(regId); return s; });
        showToast("error", data.message || "Failed to remove guest.");
        return;
      }
      // Confirm server state with immediate patch — no re-fetch needed
      const rg = data.data;
      setDetailGame(rg);
      setMyGames((prev) => prev.map((x) => x._id === rg._id ? rg : x));
      setGames((prev) => prev.map((x) => x._id === rg._id ? { ...x, spotsRemaining: rg.spotsRemaining, totalSlots: rg.totalSlots } : x));
      fetchWalletBalance();
      const refundAmt = data.refundAmountPaise || 0;
      showToast("success", "Guest Removed", refundAmt > 0 ? `₹${Math.round(refundAmt / 100)} will be refunded shortly.` : undefined);
    } catch {
      setRemovedGuestIds((prev) => { const s = new Set(prev); s.delete(regId); return s; });
      showToast("error", "Failed to remove guest. Please try again.");
    } finally {
      setRemovingGuestId(null);
      removingGuestIds.current.delete(regId);
    }
  };

  const promptRemoveGuest = (game: any, regId: string, guestName: string) => {
    const fee = game?.feeInPaise || 0;
    const refundMsg = fee > 0 ? ` ₹${Math.round(fee / 100)} will be refunded to your wallet.` : "";
    setConfirmTitle("Remove Guest");
    setConfirmMessage(`Remove ${guestName} from this game?${refundMsg}`);
    confirmActionRef.current = async () => {
      setRemovedGuestIds((prev) => new Set(prev).add(regId));
      await handleRemoveGuest(game, regId);
    };
    setConfirmVisible(true);
  };

  // The player's own primary (non-guest) registration in a game, if any.
  // Tombstones are skipped: someone who backed out and signed up again has several
  // rows here, and `find` would answer with the retired one — misreading their state.
  const myOwnPrimaryReg = (game: any) => (game.registrations || []).find((r: any) =>
    !r.plusOneName && !r.backedOutAt && !r.removedAt
      && (r._isMyReg || r.player?._id?.toString() === playerId || r.player?.toString() === playerId)
  );
  // Whether the player holds a seat in this game, answered from the game itself.
  // This used to be `myGames.some(...)`, which meant the browse page could not
  // draw a single card until it had also downloaded every game the player had
  // ever joined. The server tags their own rows with `_isMyReg`, so the card
  // already carries the answer.
  const amRegisteredIn = (game: any) => !!myOwnPrimaryReg(game);
  // A game whose format switched after this player said "No" to format changes:
  // they were removed + refunded. Treated like a cancellation FOR THEM — it leaves
  // "My Games" and appears under Cancelled as "Format changed — rejoin?".
  const isMyFormatChangeOptOut = (game: any) => {
    const r = myOwnPrimaryReg(game);
    return !!r && r.optedOut === true && r.optedOutReason === "format_change";
  };
  // Gave up their own seat voluntarily (guests may still be playing). The game stays in
  // My Games so they can rejoin — but the card must not claim they're playing.
  const isMyVoluntaryOptOut = (game: any) => {
    const r = myOwnPrimaryReg(game);
    return !!r && r.optedOut === true && r.optedOutReason !== "format_change";
  };
  const getOrganiserCount = (game: any) => (game.organiserIsPlaying ? 1 : 0);
  const getActiveRegs = (game: any) => (game.registrations || []).filter(
    (r: any) => !r.backedOutAt && !r.removedAt && !['refunded', 'forfeited'].includes(r.paymentStatus) && !r.optedOut
  ).length;

  // Which games this page shows. The server has already picked them — Cancelled
  // and Completed are `myGames` exactly as returned, because the scope query
  // decided what belongs there. Only My Games still composes anything: it folds
  // in the games the player is waitlisted for, which are a separate list.
  const myGamesWithWaitlist = [
    ...myGames,
    ...myWaitlist
      .filter((wg) => {
        const status = String(wg.status || "").trim().toLowerCase();
        return !status.startsWith("cancel") && !myGames.some((mg) => mg._id === wg._id);
      })
      .map((wg) => ({ ...wg, _isWaitlisted: true, _waitlistStatus: wg._myWaitlistStatus || 'waiting' })),
  ];

  const gamesToDisplay = activeTab === 'all'
    ? games
    : activeTab === 'my-games'
      ? myGamesWithWaitlist
      : myGames;
  const isCancelledGame = (game: any) => String(game.status || "").trim().toLowerCase().startsWith("cancel");
  const isAwaitingResult = (game: any) => {
    const s = String(game.status || "").trim().toLowerCase();
    if (s.startsWith("cancel") || s.startsWith("complete")) return false;
    const t = new Date(game.scheduledAt).getTime();
    return Number.isFinite(t) && t < Date.now();
  };
  // Narrowing, ordering and paging are all the server's job now (city, area,
  // date, format, price, availability — see backend gameFilters.js; scope and
  // sort — see getMyGames). What arrives is already the answer, in the right
  // order. Re-sorting here would only scramble one page against the next.
  //
  // My Games is the one list still assembled on the client, because it merges
  // two responses, so it is also the only one that still needs sorting.
  const orderedGames = activeTab === "my-games"
    ? [...gamesToDisplay].sort(
        (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      )
    : gamesToDisplay;

  // Every list arrives a page at a time, and the server is the one that says
  // whether another page exists. Scrolling to the sentinel asks for it; the
  // button below is the fallback for keyboard users and anything without
  // IntersectionObserver.
  //
  // My Games asks for a big first page (50) because nobody has that many
  // fixtures ahead of them — but it is paged all the same, so the one person who
  // does is not quietly shown a truncated list. Appending pages is safe despite
  // the client-side sort above: that sorts the whole accumulated list, not a
  // page of it.
  const hasMoreGames = listHasMore;

  useEffect(() => {
    if (!loadMoreSentinel || !hasMoreGames) return;
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) loadMore(); },
      // Start the next page slightly before the sentinel is on screen, so the
      // cards are already there by the time the reader reaches them.
      { rootMargin: "400px 0px" },
    );
    observer.observe(loadMoreSentinel);
    return () => observer.disconnect();
  }, [loadMoreSentinel, hasMoreGames, loadMore]);

  const detailVenueName = detailGame ? (detailGame.turf?.name || "TBC") : "";
  const detailCityName = detailGame ? (detailGame.turf?.address?.city || "TBC") : "";
  const detailDateLabel = detailGame
    ? new Date(detailGame.scheduledAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" })
    : "";
  const detailKickoffLabel = detailGame
    ? new Date(detailGame.scheduledAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })
    : "";
  const detailReportByLabel = detailGame
    ? (() => {
        const scheduled = new Date(detailGame.scheduledAt);
        const reportMins = Number(detailGame.reportingMinsBeforeGame ?? 30);
        if (Number.isNaN(scheduled.getTime())) return "TBC";
        return new Date(scheduled.getTime() - reportMins * 60000).toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
        });
      })()
    : "";
  const detailEndsLabel = detailGame
    ? (() => {
        const scheduled = new Date(detailGame.scheduledAt);
        const durationMins = Number(detailGame.durationMins ?? 60);
        if (Number.isNaN(scheduled.getTime())) return "TBC";
        return new Date(scheduled.getTime() + durationMins * 60000).toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
        });
      })()
    : "";
  const detailFeeInRupees = detailGame ? (detailGame.feeInPaise || 0) / 100 : 0;
  const detailFeeIsPassCovered = !!detailGame?.passEligible && detailFeeInRupees > 0;
  // Read from the open game's own registrations rather than from a "my games"
  // list, so the modal answers the same on the browse page — which no longer
  // loads one — as it does on My Games.
  const detailIsRegistered = !!detailGame && amRegisteredIn(detailGame);
  // Whether *I* am seated (own non-guest, active slot) in this game — read straight
  // from the game's registrations so it doesn't depend on the My Games list being fresh.
  const detailAmSeated = !!detailGame && (detailGame.registrations || []).some((r: any) => {
    if (r.plusOneName) return false;
    const rid = r.player?._id?.toString?.() ?? r.player?.toString?.() ?? "";
    return (r._isMyReg || rid === playerId) && !r.backedOutAt && !r.removedAt && !["refunded", "forfeited"].includes(r.paymentStatus) && !r.optedOut;
  });
  const detailIsWaitlisted = !!detailGame
    && (Boolean(detailGame._isWaitlisted) || myWaitlist.some((wg) => wg._id === detailGame._id));

  // Can I invite anyone to the open game? The answer depends on platform settings
  // and on how many invites I have already spent on THIS game — neither of which
  // is on the game object, so it has to be asked for.
  //
  // Keyed on seating as well as the game, because joining from inside this modal
  // is exactly what earns the right to invite: without that the button would stay
  // hidden until the player closed and reopened the game. A failed request leaves
  // it null, which hides the button rather than offering one that can only fail.
  const detailGameId = detailGame?._id;
  const detailCanInviteFrom = detailAmSeated || detailIsRegistered;
  // Optimistic, then corrected by the server. The button is drawn from the local
  // rule until the config lands, and defers to the config once it does.
  //
  // Gating it on the round-trip ALONE was wrong: a request that never lands —
  // backend mid-restart, expired token, a blip — took the button away with no
  // explanation, which is a worse failure than the stale answer it was avoiding.
  // Nothing is lost by being optimistic, because the same gate is re-evaluated on
  // the POST and the modal renders whatever reason comes back.
  const inviteAllowedByServer = inviteConfig
    ? inviteConfig.canInvite || inviteConfig.code === "limit_reached"
    : null;
  const showInviteButton = detailCanInviteFrom
    && (inviteAllowedByServer ?? detailGame?.visibility === "private");
  useEffect(() => {
    if (!detailGameId || !detailCanInviteFrom) return;
    const { token } = getSession();
    if (!token) return;
    let cancelled = false;
    fetch(buildApiUrl(`/api/v1/games/${detailGameId}/invite/config`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d?.success) setInviteConfig(d.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [detailGameId, detailCanInviteFrom]);
  const detailIsCancelled = !!detailGame && String(detailGame.status || "").toLowerCase().startsWith("cancel");
  // Once reporting time (start − reportingMinsBeforeGame) has passed, players can no
  // longer change participation. Mirrors the backend isPastReportingTime guard.
  const detailPastReporting = !!detailGame && (() => {
    const reportMins = Number(detailGame.reportingMinsBeforeGame ?? 30);
    return Date.now() >= new Date(detailGame.scheduledAt).getTime() - reportMins * 60000;
  })();
  const myWaitlistStatus: string = (detailIsWaitlisted && detailGame)
    ? (myWaitlist.find((wg: any) => wg._id === detailGame._id)?._myWaitlistStatus
        || detailGame._myWaitlistStatus
        || "waiting")
    : "waiting";
  // Live registrations excluding locally-removed guests (so UI is instant, no re-flash on any refresh),
  // players/guests removed by a format change (they said "No"), and anyone who backed
  // out — the backend keeps backed-out rows in the payload as history, so without this
  // they would render in the roster as players who are no longer coming.
  //
  // Same definition of "live" the backend counts seats by (utils/registration.js):
  // organiser-removed rows and settled (refunded/forfeited) rows hold no seat either,
  // and leaving them in listed more names in the roster than the "X of Y" header.
  // A voluntary opt-out is deliberately KEPT — the roster greys it as "Not attending".
  const liveRegistrations = (detailGame?.registrations || []).filter(
    (r: any) => !removedGuestIds.has(String(r._id))
      && !r.backedOutAt
      && !r.removedAt
      && !["refunded", "forfeited"].includes(r.paymentStatus)
      && !(r.optedOut && r.optedOutReason === "format_change")
  );

  // Player's own (non-guest) registration in the detail game
  // Skip tombstones: someone who backed out and signed up again has both rows here,
  // and the stale one would drive the opt-out UI off a seat they no longer hold.
  const myOwnReg = (detailIsRegistered && detailGame)
    ? (detailGame.registrations || []).find((r: any) => {
        if (r.plusOneName || r.backedOutAt || r.removedAt) return false;
        return r._isMyReg || r.player?._id?.toString() === playerId || r.player?.toString() === playerId;
      })
    : null;
  const isOptedOut = myOwnReg?.optedOut === true;
  // Removed by a format change (said "No") — NOT a voluntary opt-out. The player +
  // their guests are gone from the game; we don't show the self-opt-out UI (which
  // wrongly says "guests remain active"), only a clean Rejoin.
  const detailIsFormatChangeOptOut = myOwnReg?.optedOut === true && myOwnReg?.optedOutReason === "format_change";
  // Player opted out AND is now on the waitlist to rejoin (game was full when they tried).
  // Use _isMine when present (set by getMyGames); fall back to direct ID compare for data
  // from getGameById (lean, no annotation) so the state survives the background refresh.
  const isOnRejoinWaitlist = isOptedOut && !!(detailGame?.waitlist || []).find((w: any) => {
    const wPid = w.player?._id?.toString() ?? w.player?.toString() ?? '';
    return (w._isMine || wPid === playerId) && w.source === 'opted_out_rejoin' && ['waiting', 'notified'].includes(w.status);
  });

  // Prefer backend spotsRemaining (always present after the fix); local filter as fallback
  const detailSpotsLeft = detailGame
    ? typeof detailGame.spotsRemaining === 'number'
      ? detailGame.spotsRemaining
      : Math.max(0,
          detailGame.totalSlots
          - (liveRegistrations.filter((r: any) => !r.backedOutAt && !r.removedAt && !['refunded','forfeited'].includes(r.paymentStatus) && !r.optedOut).length)
          - (detailGame.organiserIsPlaying ? 1 : 0)
        )
    : 0;
  const detailFilledSlots = detailGame ? detailGame.totalSlots - detailSpotsLeft : 0;
  // Cells for the redesigned "Details" tab grid.
  const pdDetailCells: Array<{ label: string; value: string; sub?: string; accent?: boolean; full?: boolean; info?: string }> = detailGame ? [
    { label: "Format", value: detailGame.format || "TBC", info: "Turf and team size may change based on player turnout" },
    { label: "Duration", value: detailGame.durationMins ? `${detailGame.durationMins} mins` : "60 mins" },
    {
      label: "Fee",
      value: detailFeeIsPassCovered ? "₹0" : `₹${detailFeeInRupees}`,
      sub: detailFeeIsPassCovered ? `Pass covered — was ₹${detailFeeInRupees}` : "per player",
    },
    {
      label: "Total slots",
      value: `${detailFilledSlots} / ${detailGame.totalSlots || 0}`,
      sub: detailSpotsLeft > 0 ? `${detailSpotsLeft} spot${detailSpotsLeft === 1 ? "" : "s"} left` : "Full",
      accent: true,
    },
    { label: "Report by", value: detailReportByLabel },
    { label: "Kick-off", value: detailKickoffLabel },
    { label: "Ends", value: detailEndsLabel },
    { label: "Venue", value: `${detailVenueName}, ${detailCityName}`, full: true },
  ] : [];
  const organiserEntry = detailGame?.organiserIsPlaying
    ? [{ key: "organiser", regId: null, name: detailGame.organiser?.name || "Organiser", position: "any", team: "none", isGuest: false, isOrganiser: true, canRemove: false }]
    : [];
  const detailPlayers = [
    ...organiserEntry,
    ...liveRegistrations.map((reg: any, index: number) => ({
      key: `${reg._id || "reg"}-${index}`,
      regId: reg._id,
      name: reg.plusOneName || reg.player?.name || "Player",
      position: reg.preferredPosition || "any",
      team: reg.teamPreference || "none",
      isGuest: Boolean(reg.plusOneName),
      canRemove: Boolean(reg.plusOneName) && Boolean(reg._isMyReg),
    })),
  ];

  // Current player's guest registrations.
  // _isMyReg is set by backend when game comes from myGames/add/remove responses.
  // Fall back to playerId comparison for games opened from the browse tab.
  const myGuests = (detailIsRegistered && detailGame)
    ? (detailGame?.registrations || []).filter((reg: any) => {
        if (removedGuestIds.has(String(reg._id))) return false;
        // A guest removed by a format change (host said "No"), or cancelled when the
        // host backed out, is gone — don't list it.
        if (reg.backedOutAt || reg.removedAt) return false;
        if (reg.optedOut && reg.optedOutReason === "format_change") return false;
        const isMine = reg._isMyReg
          || reg.player?._id?.toString() === playerId
          || reg.player?.toString() === playerId;
        return isMine && reg.plusOneName;
      })
    : [];
  const myGuestCount = myGuests.length;

  // Guest waitlist entries belonging to current player.
  // Visible both when registered (guest confirmed a slot separately) and when
  // waitlisted (guests waitlisted alongside the player, auto-confirmed on registration).
  const myGuestWaitlist = ((detailIsRegistered || detailIsWaitlisted) && detailGame)
    ? (detailGame?.guestWaitlist || []).filter((g: any) => {
        const isMine = g._isMine || g.player?.toString() === playerId || g.player?._id?.toString() === playerId;
        return isMine && ['waiting', 'notified'].includes(g.status);
      })
    : [];
  // Guests this player added to an approval-gated game that are awaiting the
  // organiser's decision (charged up front; refunded if rejected). Surfaced from the
  // backend's _myPendingGuests summary (raw invitations are never sent to players).
  const myPendingGuests: any[] = (detailIsRegistered && detailGame?._myPendingGuests) || [];

  return (
  <>
    <div className="player-dashboard-container">
      {toast && <Toast type={toast.type} title={toast.title} subtitle={toast.subtitle} onClose={() => {}} />}

      {inviteToken && (
        <InviteConfirmModal
          token={inviteToken}
          showToast={showToast}
          onConfirmed={() => { refreshSection(); }}
          onRecharge={() => { if (playerId) router.push(`/dashboard/player/${playerId}/wallet`); }}
          onClose={() => { if (playerId) router.replace(`/dashboard/player/${playerId}`); }}
        />
      )}

      {inviteFriendsGame && (
        <InviteFriendsModal
          gameId={inviteFriendsGame._id}
          gameTitle={inviteFriendsGame.title || inviteFriendsGame.turf?.name}
          showToast={showToast}
          onClose={() => setInviteFriendsGame(null)}
        />
      )}


      <div className="page-header">
        <div className="page-title-group">
          <div className="page-eyebrow">
            <span className="live-badge">
              <span className="live-dot" />
              {SECTION_META[section].eyebrow}
            </span>
          </div>
          <div className="page-title">{SECTION_META[section].title}</div>
        </div>
        {/* The city sits where the venue search used to. Searching by venue or
            area was the old way to narrow the list; the city picker plus the
            filter row below do that properly now, so a free-text box beside them
            is a second, weaker answer to a question already answered. */}
        {isBrowse && (
        <div className="page-actions">
          <CityPicker
            metros={browseContext?.metros || []}
            value={filters.metro}
            onChange={(slug) => {
              // Changing city clears the narrower place filters — a Gurugram
              // area chip means nothing once you are browsing Bengaluru.
              setFilters((f) => ({ ...f, metro: slug, city: null, area: null }));
              persistMetro(slug);
            }}
            // Ask only when we genuinely could not work it out. A 'busiest'
            // suggestion is a guess, so that is the one case worth confirming.
            needsChoice={!!browseContext && (!filters.metro || browseContext.suggestedFrom === "busiest")}
            // Only while they are still on the fallback city. Once they have
            // chosen somewhere themselves, "you are not in your city" stops
            // being news and becomes nagging.
            unservedCity={
              browseContext?.unservedCity && !getStoredMetro()
                ? browseContext.unservedCity
                : null
            }
            loading={loading}
          />
        </div>
        )}
      </div>

      {/* Filters belong to browsing, not to the player's own fixtures — showing
          a price slider over "My Games" would be offering to hide games they
          have already paid for. */}
      {activeTab === 'all' && (
        <GameFilters
          filters={filters}
          facets={facets}
          onChange={setFilters}
          resultCount={totalGames}
          loading={gamesLoading}
        />
      )}

      {loading ? (
        <div className="loading-container"><div className="spinner"></div><p>Loading games...</p></div>
      ) : (
        <>
        <div className="events-grid">
          {orderedGames.length > 0 ? orderedGames.map(game => {
            const organiserCount = getOrganiserCount(game);
            const spotsLeft = typeof game.spotsRemaining === 'number'
              ? game.spotsRemaining
              : game.totalSlots - getActiveRegs(game) - organiserCount;
            return (
              <EventCard
                  key={game._id}
                  id={game._id}
                  title={game.title}
                  status={game.status as EventStatus}
                  awaitingResult={isAwaitingResult(game)}
                  formatChangedOptOut={isMyFormatChangeOptOut(game)}
                  onRejoin={isMyFormatChangeOptOut(game) ? () => handleRejoinFormatChange(game) : undefined}
                  venue={game.turf?.name || 'TBC'}
                  city={game.turf?.address?.city || 'TBC'}
                  date={new Date(game.scheduledAt).toISOString().split('T')[0]}
                  time={new Date(game.scheduledAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
                  format={game.format}
                  fee={game.feeInPaise / 100}
                  passEligible={Boolean(game.passEligible)}
                  spotsTotal={game.totalSlots}
                  spotsLeft={Math.max(0, spotsLeft)}
                  isRegistered={amRegisteredIn(game) && !isMyFormatChangeOptOut(game)}
                  optedOut={isMyVoluntaryOptOut(game)}
                  isWaitlisted={Boolean(game._isWaitlisted) || myWaitlist.some(wg => wg._id === game._id)}
                  isWaitlistApproved={
                    game._waitlistStatus === 'approved'
                    || game._myWaitlistStatus === 'approved'
                    || myWaitlist.some(wg => wg._id === game._id && wg._myWaitlistStatus === 'approved')
                  }
                  requiresApproval={Boolean(game.requiresApproval)}
                  requestStatus={game._myRequestStatus || null}
                  onCancelRequest={() => handleCancelRequest(game)}
                  cancelReason={game.cancelReason}
                  players={[
                    ...(game.organiserIsPlaying
                      ? [{
                          name: game.organiser?.name || 'Organiser',
                          initials: (game.organiser?.name || 'O').substring(0, 2).toUpperCase(),
                          pos: 'any',
                          profileImage: game.organiser?.profileImage,
                        }]
                      : []),
                    ...(game.registrations || [])
                      .filter((reg: any) => !reg.backedOutAt && !reg.removedAt && !['refunded', 'forfeited'].includes(reg.paymentStatus) && !reg.optedOut)
                      .map((reg: any) => ({
                        name: reg.plusOneName || reg.player?.name || 'Player',
                        initials: (reg.plusOneName || reg.player?.name || 'P').substring(0, 2).toUpperCase(),
                        pos: reg.preferredPosition || 'any',
                        profileImage: reg.plusOneName ? undefined : reg.player?.profileImage,
                      })),
                  ]}
                  onBook={() => handleBook(game)}
                  onViewDetails={() => openGameDetail(game)}
                  onRateGame={
                    activeTab === "completed" &&
                    game.status === "completed" &&
                    pendingFeedback.some((pf) => pf._id === game._id)
                      ? () => setFeedbackTargetGame(game)
                      : undefined
                  }
                />
            )
          }) : activeTab === 'all' && activeFilterCount(filters) > 0 ? (
            // A filtered dead end always offers the way out. Without this the
            // player is left staring at an empty grid with no clue which of six
            // chips is responsible.
            <div className="kk-no-results">
              <div className="kk-no-results-icon" aria-hidden="true">🔍</div>
              <div className="kk-no-results-title">No games match these filters</div>
              <div className="kk-no-results-body">
                {browseContext?.metros.find((m) => m.slug === filters.metro)?.label
                  ? <>There are other games in {browseContext.metros.find((m) => m.slug === filters.metro)!.label} — try removing a filter.</>
                  : <>Try removing a filter, or look in another city.</>}
              </div>
              <div className="kk-no-results-actions">
                <button
                  type="button"
                  className="kk-btn kk-btn-primary"
                  onClick={() => setFilters(clearFilters(filters))}
                >
                  Clear filters
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <h3>{SECTION_META[section].emptyTitle}</h3>
              <p>{SECTION_META[section].emptyBody}</p>
              {!isBrowse && playerId && (
                <button
                  type="button"
                  className="kk-btn kk-btn-primary"
                  onClick={() => router.push(`/dashboard/player/${playerId}`)}
                >
                  Browse games
                </button>
              )}
            </div>
          )}
        </div>
        {/* Scrolling to here reveals the next page. The button is the fallback
            for keyboard users and for anything without IntersectionObserver. */}
        {hasMoreGames && (
          <div className="kk-load-more" ref={setLoadMoreSentinel}>
            <button
              type="button"
              className="kk-load-more-btn"
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading…" : "Show more games"}
            </button>
            {isBrowse && totalGames > 0 && (
              <span className="kk-load-more-count" aria-live="polite">
                {orderedGames.length} of {totalGames}
              </span>
            )}
          </div>
        )}
        </>
      )}

      {/* One-time popup: shown once per game after organiser marks it complete */}
      {popupFeedbackGame && (
        <GameFeedbackModal
          game={popupFeedbackGame}
          isPopup
          onSkip={() => {
            markPopupShown(popupFeedbackGame._id);
            setPopupFeedbackGame(null);
          }}
          onSubmit={() => {
            markPopupShown(popupFeedbackGame._id);
            setPopupFeedbackGame(null);
            showToast("success", "Feedback submitted!", "Thank you for your response.");
            fetchPendingFeedback();
          }}
        />
      )}

      {/* Feedback modal triggered from completed tab "Rate Game" button */}
      {!popupFeedbackGame && feedbackTargetGame && (
        <GameFeedbackModal
          game={feedbackTargetGame}
          onSkip={() => setFeedbackTargetGame(null)}
          onSubmit={() => {
            setFeedbackTargetGame(null);
            showToast("success", "Feedback submitted!", "Thank you for your response.");
            fetchPendingFeedback();
          }}
        />
      )}

      {selectedGame && (
        <BookingModal
          game={selectedGame}
          walletBalance={walletBalance}
          onClose={() => setSelectedGame(null)}
          onConfirm={handleConfirmBooking}
          playerPositions={playerPositions}
          playerId={playerId}
          roster={selectedGame.roster || []}
        />
      )}

      <ConfirmationModal
        open={confirmVisible}
        title={confirmTitle}
        message={confirmMessage || "Do you want to continue?"}
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        loading={!!cancellingGameId}
        onCancel={() => {
          setConfirmVisible(false);
          confirmActionRef.current = null;
          setConfirmMessage(null);
          setConfirmTitle("Are you sure?");
        }}
        onConfirm={async () => {
          setConfirmVisible(false);
          const action = confirmActionRef.current;
          confirmActionRef.current = null;
          setConfirmMessage(null);
          setConfirmTitle("Are you sure?");
          if (action) {
            await action();
          }
        }}
      />

      {/* ── Add Guest Preferences Mini-Modal ── */}
      {guestPrefOpen && guestPrefGame && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setGuestPrefOpen(false)}
        >
          <div
            style={{ background: "#0f0f1e", border: "1px solid #333", borderRadius: 12, padding: "24px 20px", width: "100%", maxWidth: 360 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: "#c8ff3e", margin: "0 0 4px", fontSize: 17 }}>Add Guest</h3>
            <p style={{ color: "#666", fontSize: 12, margin: "0 0 20px" }}>Set your guest's name, position and team.</p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ color: "#aaa", fontSize: 12, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Guest Name <span style={{ color: "#555", textTransform: "none" }}>(optional)</span></label>
              <input
                type="text"
                value={guestPrefName}
                onChange={(e) => setGuestPrefName(e.target.value)}
                placeholder="e.g. Rahul"
                maxLength={40}
                style={{
                  width: "100%", background: "#1a1a2e", border: "1px solid #444", borderRadius: 7,
                  padding: "10px 12px", color: "white", fontSize: 14, outline: "none", boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#c8ff3e")}
                onBlur={(e) => (e.target.style.borderColor = "#444")}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ color: "#aaa", fontSize: 12, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Position</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(["Any", "GK", "DEF", "MID", "FWD"] as const).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setGuestPrefPosition(pos)}
                    style={{
                      padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      background: guestPrefPosition === pos ? "rgba(200,255,62,0.18)" : "rgba(255,255,255,0.04)",
                      color: guestPrefPosition === pos ? "#c8ff3e" : "#888",
                      border: `1px solid ${guestPrefPosition === pos ? "rgba(200,255,62,0.5)" : "rgba(255,255,255,0.08)"}`,
                    }}
                  >{pos}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ color: "#aaa", fontSize: 12, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Team</label>
              <div style={{ display: "flex", gap: 6 }}>
                {(["No Preference", "Red Team", "Blue Team"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setGuestPrefTeam(t)}
                    style={{
                      padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      background: guestPrefTeam === t ? (t === "Red Team" ? "rgba(220,38,38,0.18)" : t === "Blue Team" ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.08)") : "rgba(255,255,255,0.04)",
                      color: guestPrefTeam === t ? (t === "Red Team" ? "#f87171" : t === "Blue Team" ? "#60a5fa" : "#c8ff3e") : "#888",
                      border: `1px solid ${guestPrefTeam === t ? (t === "Red Team" ? "rgba(220,38,38,0.4)" : t === "Blue Team" ? "rgba(59,130,246,0.4)" : "rgba(200,255,62,0.4)") : "rgba(255,255,255,0.08)"}`,
                    }}
                  >{t === "No Preference" ? "No Pref" : t}</button>
                ))}
              </div>
            </div>

            {/* Fee warning */}
            {guestPrefGame?.spotsRemaining === 0 ? (
              <div style={{
                background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)",
                borderRadius: 8, padding: "10px 14px", marginBottom: 16,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>Game is full — joining waitlist</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                  {(guestPrefGame?.feeInPaise || 0) > 0
                    ? `₹${Math.round(guestPrefGame.feeInPaise / 100)} will only be charged if a spot opens and you confirm.`
                    : "You'll be notified when a slot opens."}
                </div>
              </div>
            ) : (guestPrefGame?.feeInPaise || 0) > 0 ? (
              <div style={{
                background: "rgba(200,255,62,0.05)", border: "1px solid rgba(200,255,62,0.2)",
                borderRadius: 8, padding: "10px 14px", marginBottom: 16,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{ fontSize: 22, lineHeight: 1 }}>₹</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#c8ff3e" }}>
                    ₹{Math.round(guestPrefGame.feeInPaise / 100)} will be deducted from your wallet
                  </div>
                  <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                    Charged immediately when you add the guest.
                  </div>
                </div>
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setGuestPrefOpen(false)}
                style={{ flex: 1, padding: "10px", borderRadius: 7, background: "transparent", border: "1px solid #444", color: "#888", fontSize: 14, cursor: "pointer" }}
              >Cancel</button>
              <button
                type="button"
                onClick={() => handleAddGuest(guestPrefGame, guestPrefPosition, guestPrefTeam, guestPrefName)}
                style={{ flex: 2, padding: "10px", borderRadius: 7, background: "#c8ff3e", color: "#000", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer" }}
              >
                {guestPrefGame?.spotsRemaining === 0
                  ? "Join Waitlist"
                  : (guestPrefGame?.feeInPaise || 0) > 0
                    ? `Add Guest (₹${Math.round(guestPrefGame.feeInPaise / 100)})`
                    : "Add Guest"}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailGame && (
        <div className="modal-overlay pd-event-modal-overlay" onClick={() => { setDetailGame(null); setDetailGameFeedback(null); setRemovedGuestIds(new Set()); setLightboxImage(null);}}>
          <div
            className="modal-content pd-event-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle — visible on mobile only */}
            <div className="pd-modal-handle" />

            {/* ── Sticky Header ── */}
            <div className="pd-event-modal-header">
              <div className="pd-event-modal-header-accent" />
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div className="pd-event-modal-eyebrow">Event Details</div>
                  <h2 className="pd-event-modal-title">
                    {detailGame.title || detailGame.turf?.name || "Game"}
                  </h2>
                  <div className="pd-event-modal-meta">
                    <span>{detailVenueName}</span> · {detailCityName} · {detailDateLabel}
                  </div>
                </div>
                <span style={{
                  flexShrink: 0, marginTop: 2,
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase",
                  padding: "3px 10px", borderRadius: 99,
                  background: detailIsCancelled ? "rgba(220,38,68,0.15)" : "rgba(74,222,128,0.12)",
                  color: detailIsCancelled ? "#f87171" : "#4ade80",
                  border: `1px solid ${detailIsCancelled ? "rgba(220,38,68,0.3)" : "rgba(74,222,128,0.3)"}`,
                }}>
                  {detailGame.status || "open"}
                </span>
              </div>

              {/* Copy Link button */}
              <button
                type="button"
                onClick={() => {
                  const link = `${window.location.origin}/join/${detailGame._id}`;
                  navigator.clipboard.writeText(link).then(() => {
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2000);
                  });
                }}
                style={{
                  marginTop: 12,
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "7px 14px", borderRadius: 99,
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  transition: "background 0.2s, color 0.2s, border-color 0.2s",
                  background: linkCopied ? "rgba(200,255,62,0.12)" : "rgba(255,255,255,0.05)",
                  color: linkCopied ? "#c8ff3e" : "#aaa",
                  border: `1px solid ${linkCopied ? "rgba(200,255,62,0.35)" : "rgba(255,255,255,0.1)"}`,
                }}
              >
                {linkCopied ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Link Copied!
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    Copy Link
                  </>
                )}
              </button>

              {/* Invite friends — the server decides whether this game offers it.
                  A spent cap still shows the button: the modal is where the
                  "you've used all N" explanation lives. */}
              {showInviteButton && (
                <button
                  type="button"
                  onClick={() => setInviteFriendsGame(detailGame)}
                  style={{
                    marginTop: 12, marginLeft: 8,
                    display: "inline-flex", alignItems: "center", gap: 7,
                    padding: "7px 14px", borderRadius: 99,
                    fontSize: 12, fontWeight: 700, cursor: "pointer",
                    background: "rgba(200,255,62,0.12)", color: "#c8ff3e",
                    border: "1px solid rgba(200,255,62,0.35)",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                  Invite friends
                </button>
              )}
            </div>

            {/* ── Teams / Players / Details tabs ── */}
            <div className="pd-event-tabs">
              {/* No tab at all until the organiser publishes — an empty Teams
                  tab would read as "no teams", which is a different thing from
                  "not announced yet". */}
              {detailTeams && (
                <button
                  type="button"
                  className={`pd-event-tab${detailTab === "teams" ? " active" : ""}`}
                  onClick={() => setDetailTab("teams")}
                >
                  Teams
                  {detailTeams.yourColour && (
                    <span
                      className="pd-event-tab-dot"
                      style={{ background: detailTeams.yourColour === "red" ? "#ff6b6b" : "#74b9ff" }}
                    />
                  )}
                </button>
              )}
              <button
                type="button"
                className={`pd-event-tab${detailTab === "players" ? " active" : ""}`}
                onClick={() => setDetailTab("players")}
              >
                Players <span className="pd-event-tab-badge">{detailFilledSlots}</span>
              </button>
              <button
                type="button"
                className={`pd-event-tab${detailTab === "details" ? " active" : ""}`}
                onClick={() => setDetailTab("details")}
              >
                Details
              </button>
              <button
                type="button"
                className={`pd-event-tab${detailTab === "rules" ? " active" : ""}`}
                onClick={() => setDetailTab("rules")}
              >
                Game Rules
              </button>
            </div>

            {/* ── Scrollable Body ── */}
            <div className="pd-event-modal-body">

            {detailTab === "teams" && detailTeams && (
              <PublishedTeamsView data={detailTeams} />
            )}

            {/* Pass banner in detail view */}
            {detailTab === "details" && detailGame.passEligible && (detailGame.feeInPaise || 0) > 0 && (
              <div style={{
                background: "rgba(200,255,62,0.07)",
                border: "1px solid rgba(200,255,62,0.25)",
                borderRadius: 10,
                padding: "10px 14px",
                marginBottom: 16,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#c8ff3e" }}>
                  🎟️ Your Pass covers this game — entry is <span style={{ textDecoration: "line-through", opacity: 0.6 }}>₹{(detailGame.feeInPaise || 0) / 100}</span> <strong>₹0</strong> for you
                </div>
                <div style={{ fontSize: 11, color: "#888", lineHeight: 1.5 }}>
                  Pass applies to <strong style={{ color: "#ccc" }}>your slot only</strong>. Any guests you bring pay the full ₹{(detailGame.feeInPaise || 0) / 100} entry fee each.
                </div>
              </div>
            )}

            {detailTab === "details" && (
              <div className="dt-grid">
                {pdDetailCells.map((cell) => (
                  <InfoTip key={cell.label} text={cell.info ?? ""}>
                    <div className={`dt-cell${cell.full ? " full" : ""}`}>
                      <div className="dt-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        {cell.label}
                        {cell.info && <InfoTipButton label={`About ${cell.label}`} />}
                      </div>
                      <div className={`dt-val${cell.accent ? " accent" : ""}`}>
                        {cell.value}
                      </div>
                      {cell.sub && <div className="dt-sub">{cell.sub}</div>}
                      {cell.info && <InfoTipPanel />}
                    </div>
                  </InfoTip>
                ))}
              </div>
            )}

            {detailTab === "rules" && <GameRules/>}

            {detailTab === "players" && detailIsWaitlisted && !isOnRejoinWaitlist && detailSpotsLeft > 0 && !detailIsCancelled && (
              <div style={{
                border: "1px solid rgba(74,222,128,0.4)",
                padding: "14px 16px",
                background: "rgba(74,222,128,0.07)",
                marginBottom: 16,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>⚡</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#4ade80", marginBottom: 3 }}>
                    A spot just opened up — be first to claim it!
                  </div>
                  <div style={{ color: "#a3e6bf", fontSize: 12, lineHeight: 1.5 }}>
                    First to register gets the slot. No payment charged until you confirm.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setDetailGame(null); handleBook(detailGame); }}
                  style={{
                    flexShrink: 0,
                    background: "#4ade80",
                    color: "#000",
                    border: "none",
                    borderRadius: 7,
                    padding: "8px 14px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Sign Up Now
                </button>
              </div>
            )}

            {detailTab === "players" && detailIsWaitlisted && !isOnRejoinWaitlist && detailSpotsLeft === 0 && !detailIsCancelled && (
              <div style={{
                border: myWaitlistStatus === "approved" ? "1px solid rgba(74,222,128,0.35)" : "1px solid rgba(245,158,11,0.3)",
                padding: "12px 16px",
                background: myWaitlistStatus === "approved" ? "rgba(74,222,128,0.06)" : "rgba(245,158,11,0.06)",
                marginBottom: 16,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}>
                <span style={{ fontSize: 18 }}>{myWaitlistStatus === "approved" ? "✅" : "📋"}</span>
                <div style={{ fontSize: 12, lineHeight: 1.5, color: myWaitlistStatus === "approved" ? "#4ade80" : "#fcd34d" }}>
                  {myWaitlistStatus === "approved"
                    ? "The organiser approved you! You'll get an email the moment a slot opens — be ready to register quickly."
                    : "You're on the waitlist. We'll email you the moment a spot opens up — first to sign up gets it!"}
                </div>
              </div>
            )}

            {detailTab === "details" && detailIsCancelled && (
              <div style={{ border: "1px solid #5c1b1b", padding: "12px", background: "#1a0808", marginBottom: 16, borderRadius: 4 }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#e05050", marginBottom: 6, fontWeight: 700 }}>
                  Event Cancelled
                </div>
                <div style={{ color: "#ffaaaa", fontSize: 13, lineHeight: 1.5 }}>
                  {detailGame.cancelReason
                    ? detailGame.cancelReason
                    : "This event has been cancelled by the organiser."}
                </div>
              </div>
            )}

            {detailTab === "details" && detailGame.notes && (
              <div style={{ border: "1px solid #1f1f1f", padding: "12px", background: "#111", marginBottom: 16 }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#777", marginBottom: 6 }}>
                  Notes
                </div>
                <div style={{ color: "#ddd", fontSize: 13, lineHeight: 1.5 }}>{detailGame.notes}</div>
              </div>
            )}

            {detailTab === "players" && (
              <>
                <div className="pd-roster-section-head">
                  <span className="pd-roster-section-title">Players</span>
                </div>
                <ProgressBar spotsTotal={detailGame.totalSlots } spotsLeft={detailGame.spotsRemaining} />

                {detailPlayers.length === 0 ? (
                  <div style={{ color: "#888", fontSize: 13, marginBottom: 16,marginTop:"4px" }}>No players registered yet.</div>
                ) : (
                  <div className="pd-roster-list  ">
                    {(() => {
                      const regs = liveRegistrations;
                      const mainRegs = regs.filter((r: any) => !r.plusOneName);
                      const hostIdOf = (r: any) => r.player?._id?.toString() ?? r.player?.toString() ?? "";
                      // Who actually holds a seat here, so a guest can be nested under them.
                      const seatedHostIds = new Set(mainRegs.map(hostIdOf).filter(Boolean));
                      // An organiser-added guest has no host player — `addedByOrganiser`
                      // says so. Rows written before that carry the ORGANISER's id in
                      // `player`, a Player ref that never resolves, so they arrive as a bare
                      // id with no name. Keying only off `!r.player` missed both shapes: they
                      // were grouped under a host who isn't in the roster and so never
                      // rendered, leaving the list short of the "X of Y" header. Anything
                      // whose host holds no seat here is one of them.
                      const orgGuests = regs.filter((r: any) =>
                        r.plusOneName && (r.addedByOrganiser || !seatedHostIds.has(hostIdOf(r)))
                      );
                      const guestsByPlayerId = new Map<string, any[]>();
                      regs.filter((r: any) =>
                        r.plusOneName && !r.addedByOrganiser && seatedHostIds.has(hostIdOf(r))
                      ).forEach((r: any) => {
                        const k = hostIdOf(r);
                        if (k) {
                          if (!guestsByPlayerId.has(k)) guestsByPlayerId.set(k, []);
                          guestsByPlayerId.get(k)!.push(r);
                        }
                      });
                      return (
                        <>
                          {detailGame.organiserIsPlaying && (
                            <RosterRow
                              name={detailGame.organiser?.name || "Organiser"}
                              subLabel="Organiser"
                              badge="organiser"
                              imageUrl={resolveImageUrl(detailGame.organiser?.profileImage)}
                              onAvatarClick={setLightboxImage}
                            />
                          )}
                          {orgGuests.map((r: any, i: number) => (
                            <RosterRow
                              key={`og-${r._id || i}`}
                              name={r.plusOneName}
                              subLabel={POS_FULL_LABEL[r.preferredPosition] || "Any"}
                              badge="guest"
                              guestRow
                              onAvatarClick={setLightboxImage}
                            />
                          ))}
                          {mainRegs.map((reg: any, idx: number) => {
                            const pId = reg.player?._id?.toString() ?? reg.player?.toString() ?? "";
                            const myGsts = guestsByPlayerId.get(pId) ?? [];
                            return (
                              <React.Fragment key={reg._id || idx}>
                                <RosterRow
                                  name={reg.player?.name || "Player"}
                                  subLabel={POS_FULL_LABEL[reg.preferredPosition] || "Any"}
                                  optedOut={!!reg.optedOut}
                                  imageUrl={resolveImageUrl(reg.player?.profileImage)}
                                  onAvatarClick={setLightboxImage}
                                />
                                {myGsts.map((gr: any, gi: number) => (
                                  <RosterRow
                                    key={`pg-${gr._id || gi}`}
                                    name={gr.plusOneName}
                                    subLabel={POS_FULL_LABEL[gr.preferredPosition] || "Any"}
                                    badge="guest"
                                    guestRow
                                    onAvatarClick={setLightboxImage}
                                  />
                                ))}
                              </React.Fragment>
                            );
                          })}
                        </>
                      );
                    })()}
                    <div className="pd-roster-slots-row">
                      <span className="pd-roster-slots-text">
                        {detailSpotsLeft > 0 ? `${detailSpotsLeft} spot${detailSpotsLeft === 1 ? "" : "s"} remaining` : "Game full"}
                      </span>
                      <span className="pd-roster-slots-count">{detailGame.totalSlots || 0} total slots</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── My Guests (CRUD section — only when registered and game active) ── */}
            {detailTab === "players" && detailIsRegistered && !detailIsFormatChangeOptOut && !detailIsCancelled && detailGame.status !== "completed" && !detailPastReporting && (
              <div style={{
                margin: "0 0 16px",
                padding: "14px 16px",
                background: "rgba(200,255,62,0.04)",
                border: "1px solid rgba(200,255,62,0.15)",
                borderRadius: 10,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#c8ff3e" }}>
                    My Guests ({myGuestCount})
                  </span>
                  <button
                    type="button"
                    onClick={() => promptAddGuest(detailGame)}
                    disabled={addingGuest}
                    style={{
                      background: addingGuest ? "rgba(200,255,62,0.05)" : "rgba(200,255,62,0.12)",
                      color: addingGuest ? "rgba(200,255,62,0.5)" : "#c8ff3e",
                      border: "1px solid rgba(200,255,62,0.3)",
                      borderRadius: 6, padding: "4px 12px", fontSize: 12,
                      fontWeight: 600, cursor: addingGuest ? "not-allowed" : "pointer",
                    }}
                  >
                    {addingGuest ? "Adding…" : detailSpotsLeft === 0 ? "+ Join Waitlist" : "+ Add Guest"}
                  </button>
                </div>

                {myGuestCount === 0 ? (
                  <div style={{ color: "#555", fontSize: 13 }}>
                    No guests added yet.{detailSpotsLeft === 0 ? " (Game is full)" : " Tap the + Add Guest button to bring a friend."}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {myGuests.map((reg: any) => {
                      const posLabel: Record<string, string> = { goalkeeper: "GK", defender: "DEF", midfielder: "MID", forward: "FWD", any: "Any" };
                      const teamLabel: Record<string, string> = { red: "Red Team", blue: "Blue Team", none: "No Pref", same: "Same", opposite: "Opp." };
                      const pos = posLabel[reg.preferredPosition] || "Any";
                      const team = teamLabel[reg.teamPreference] || "No Pref";
                      return (
                        <div key={reg._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 7, border: "1px solid rgba(255,255,255,0.07)" }}>
                          <div>
                            <span style={{ fontSize: 13, color: "#e5e7eb" }}>{reg.plusOneName}</span>
                            <div style={{ display: "flex", gap: 4, marginTop: 3 }}>
                              {pos !== "Any" && (
                                <span style={{ fontSize: 10, background: "rgba(200,255,62,0.12)", color: "#c8ff3e", borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>{pos}</span>
                              )}
                              {reg.teamPreference && reg.teamPreference !== "none" && (
                                <span style={{ fontSize: 10, background: reg.teamPreference === "red" ? "rgba(220,38,38,0.15)" : "rgba(59,130,246,0.15)", color: reg.teamPreference === "red" ? "#f87171" : "#60a5fa", borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>{team}</span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => promptRemoveGuest(detailGame, reg._id, reg.plusOneName)}
                            disabled={removingGuestId === reg._id}
                            style={{
                              background: "rgba(220,38,38,0.10)",
                              border: "1px solid rgba(220,38,38,0.25)",
                              color: removingGuestId === reg._id ? "rgba(248,113,113,0.4)" : "#f87171",
                              borderRadius: 6, padding: "3px 10px", fontSize: 11,
                              fontWeight: 600, cursor: removingGuestId === reg._id ? "not-allowed" : "pointer",
                            }}
                          >
                            {removingGuestId === reg._id ? "…" : "Remove"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {detailSpotsLeft === 0 && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#888" }}>
                    Game is full — tap + Add Guest to join the waitlist. You pay only when a slot opens and you confirm.
                  </div>
                )}
              </div>
            )}

            {/* ── Reporting-time lock notice ── */}
            {detailTab === "players" && detailIsRegistered && !detailIsCancelled && detailGame.status !== "completed" && detailPastReporting && (
              <div style={{
                margin: "0 0 12px",
                padding: "12px 16px",
                background: "rgba(245,158,11,0.06)",
                border: "1px solid rgba(245,158,11,0.25)",
                borderRadius: 10,
                fontSize: 13,
                color: "#f59e0b",
                lineHeight: 1.5,
              }}>
                ⏰ Reporting time has passed — registration and guests can no longer be changed for this game.
              </div>
            )}

            {/* ── Attending toggle — after My Guests, only for registered active games.
                  Hidden for a format-change removal (no "guests remain active" toggle) —
                  that case gets a clean Rejoin action instead. ── */}
            {detailTab === "players" && detailIsRegistered && !detailIsFormatChangeOptOut && !detailIsCancelled && detailGame.status !== "completed" && !detailPastReporting && (
              <div style={{
                margin: "0 0 12px",
                padding: "12px 16px",
                background: isOnRejoinWaitlist
                  ? "rgba(167,139,250,0.06)"
                  : isOptedOut
                    ? "rgba(245,158,11,0.06)"
                    : "rgba(74,222,128,0.05)",
                border: `1px solid ${isOnRejoinWaitlist ? (detailSpotsLeft > 0 ? "rgba(200,255,62,0.3)" : "rgba(167,139,250,0.3)") : isOptedOut ? "rgba(245,158,11,0.25)" : "rgba(74,222,128,0.15)"}`,
                borderRadius: 10,
              }}>
                {isOnRejoinWaitlist ? (
                  /* ── Waitlist-to-rejoin state ── */
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: detailSpotsLeft > 0 ? "#c8ff3e" : "#a78bfa" }}>
                        {detailSpotsLeft > 0 ? "🟢 A slot just opened!" : "📋 On waitlist to rejoin"}
                      </span>
                      {detailSpotsLeft > 0 && (
                        <button
                          onClick={() => handleOptOut(true)}
                          disabled={optingOut}
                          style={{
                            padding: "5px 14px",
                            background: "#c8ff3e",
                            color: "#000",
                            border: "none",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: optingOut ? "not-allowed" : "pointer",
                            opacity: optingOut ? 0.6 : 1,
                            flexShrink: 0,
                          }}
                        >
                          {optingOut ? "Rejoining…" : "Rejoin Now"}
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "#888", lineHeight: 1.5 }}>
                      {detailSpotsLeft > 0
                        ? `Tap "Rejoin Now" to take the open slot${detailGame.feeInPaise > 0 ? ` (₹${detailGame.feeInPaise / 100} will be charged)` : ""}.`
                        : "Game was full when you tried to rejoin. We'll notify you when a slot opens."}
                      {myGuestCount > 0 && (
                        <span style={{ color: "#c8ff3e", fontWeight: 600 }}>
                          {" "}Your {myGuestCount} guest{myGuestCount > 1 ? "s are" : " is"} still registered.
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ── Normal attend / opted-out toggle ── */
                  <InfoTip
                    text={
                      <>
                        <div style={{ marginBottom: 6 }}>
                          1) If you want to remove <strong>only yourself </strong> from the game,
                          untick the &quot;I&apos;m attending this game&quot; box.
                        </div>
                        <div style={{ marginBottom: 6 }}>
                          2) To remove a guest, click <strong>Remove </strong> beside their name.
                        </div>
                        <div>
                          3) Click <strong>Cancel Registration </strong> to cancel the registration
                          for yourself and your guest(s).
                        </div>
                      </>
                    }
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <label style={{
                        display: "flex", alignItems: "center", gap: 10,
                        flex: 1, minWidth: 0,
                        cursor: optingOut ? "not-allowed" : "pointer",
                        opacity: optingOut ? 0.6 : 1,
                      }}>
                        <input
                          type="checkbox"
                          checked={!isOptedOut}
                          onChange={(e) => handleOptOut(e.target.checked)}
                          disabled={optingOut}
                          style={{ width: 16, height: 16, accentColor: "#c8ff3e", flexShrink: 0 }}
                        />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: isOptedOut ? "#f59e0b" : "#e5e7eb" }}>
                            {optingOut ? "Updating…" : isOptedOut ? "You're not attending" : "I'm attending this game"}
                          </div>
                          {isOptedOut && detailSpotsLeft === 0 && (
                            <div style={{ fontSize: 11, color: "#888", marginTop: 2, lineHeight: 1.4 }}>
                              Game is full — tick to join the waitlist and rejoin when a slot opens.
                              {myGuestCount > 0 && <span style={{ color: "#c8ff3e" }}> Your guest is still registered.</span>}
                            </div>
                          )}
                          {isOptedOut && detailSpotsLeft > 0 && (
                            <div style={{ fontSize: 11, color: "#888", marginTop: 2, lineHeight: 1.4 }}>
                              Your guests' registrations remain active. Tick to rejoin{detailGame.feeInPaise > 0 ? ` (₹${detailGame.feeInPaise / 100} will be charged)` : ""}.
                            </div>
                          )}
                        </div>
                      </label>
                      {/* Explains unticking vs removing a guest vs cancelling outright */}
                      <InfoTipButton
                        label="How removing yourself or your guests works"
                        size={16}
                        style={{ flexShrink: 0 }}
                      />
                    </div>
                    <InfoTipPanel style={{ fontSize: 11, marginTop: 10 }} />
                  </InfoTip>
                )}
              </div>
            )}

            {/* ── Your side, once the organiser has published teams ── */}
            {/* The Teams tab says this too, in more detail; this is the reminder
                for someone reading the roster. */}
            {detailTab === "players" && detailIsRegistered && detailGame.teamsPublished && myOwnReg?.assignedColour && (
              <div style={{ margin: "0 0 16px" }}>
                <TeamOutcomeBadge
                  colour={myOwnReg.assignedColour}
                  outcome={myOwnReg.colourOutcome}
                  reason={myOwnReg.colourReason}
                />
              </div>
            )}

            {/* ── Guests awaiting organiser approval ── */}
            {detailTab === "players" && detailIsRegistered && myPendingGuests.length > 0 && !detailIsCancelled && detailGame.status !== "completed" && (
              <div style={{
                margin: "0 0 16px",
                padding: "14px 16px",
                background: "rgba(245,158,11,0.05)",
                border: "1px solid rgba(245,158,11,0.2)",
                borderRadius: 10,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#f59e0b" }}>
                    Guests Awaiting Approval ({myPendingGuests.length})
                  </span>
                  <span style={{ fontSize: 11, color: "#888" }}>Organiser will approve or reject</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {myPendingGuests.map((pg: any) => (
                    <div key={pg._id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 12px",
                      background: "rgba(245,158,11,0.08)",
                      borderRadius: 7,
                      border: "1px solid rgba(245,158,11,0.35)",
                    }}>
                      <div style={{ fontSize: 13, color: "#e5e7eb", fontWeight: 600 }}>{pg.plusOneName}</div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b" }}>⏳ Awaiting approval</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 10, lineHeight: 1.5 }}>
                  You've been charged for {myPendingGuests.length > 1 ? "these guests" : "this guest"}. If the organiser rejects the request, the fee is refunded to your wallet.
                </div>
              </div>
            )}

            {/* ── Guest Waitlist ── */}
            {detailTab === "players" && (detailIsRegistered || detailIsWaitlisted) && myGuestWaitlist.length > 0 && !detailIsCancelled && detailGame.status !== "completed" && !detailPastReporting && (
              <div style={{
                margin: "0 0 16px",
                padding: "14px 16px",
                background: "rgba(245,158,11,0.05)",
                border: "1px solid rgba(245,158,11,0.2)",
                borderRadius: 10,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#f59e0b" }}>
                    Guests on Waitlist ({myGuestWaitlist.length})
                  </span>
                  <span style={{ fontSize: 11, color: "#888" }}>
                    {detailIsWaitlisted
                      ? "Will auto-confirm when you register"
                      : "First to confirm gets the slot"}
                  </span>
                </div>
                {detailIsWaitlisted && (
                  <div style={{ fontSize: 11, color: "#a78bfa", marginBottom: 10, lineHeight: 1.5 }}>
                    These guests are waitlisted with you. When a slot opens and you register, your guests will be auto-confirmed in order — up to available slots.
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {myGuestWaitlist.map((gw: any) => {
                    const isNotified = gw.status === "notified";
                    const isConfirming = confirmingGwId === gw._id;
                    const isCancelling = cancellingGwId === gw._id;
                    return (
                      <div key={gw._id} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 12px",
                        background: detailSpotsLeft > 0 ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.02)",
                        borderRadius: 7,
                        border: `1px solid ${detailSpotsLeft > 0 ? "rgba(245,158,11,0.35)" : "rgba(255,255,255,0.07)"}`,
                      }}>
                        <div>
                          <div style={{ fontSize: 13, color: "#e5e7eb", fontWeight: 600 }}>{gw.plusOneName}</div>
                          <div style={{ fontSize: 11, marginTop: 2, color: detailSpotsLeft > 0 ? "#f59e0b" : "#666" }}>
                            {detailIsWaitlisted
                              ? "Waitlisted with you — auto-confirmed when you register"
                              : detailSpotsLeft > 0
                                ? "Slot available — confirm now!"
                                : "Waiting for a slot to open"}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          {detailIsRegistered && detailSpotsLeft > 0 && (
                            <button
                              type="button"
                              onClick={() => handleConfirmGuestWaitlist(detailGame, gw._id)}
                              disabled={isConfirming}
                              style={{
                                background: isConfirming ? "rgba(74,222,128,0.05)" : "rgba(74,222,128,0.15)",
                                border: "1px solid rgba(74,222,128,0.4)",
                                color: isConfirming ? "rgba(74,222,128,0.4)" : "#4ade80",
                                borderRadius: 6, padding: "4px 10px", fontSize: 11,
                                fontWeight: 700, cursor: isConfirming ? "not-allowed" : "pointer",
                              }}
                            >
                              {isConfirming ? "Confirming…" : `Confirm${detailGame?.feeInPaise > 0 ? ` (${String.fromCharCode(8377)}${detailGame.feeInPaise / 100})` : ""}`}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCancelGuestWaitlist(detailGame, gw._id, gw.plusOneName)}
                            disabled={isCancelling}
                            style={{
                              background: "rgba(220,38,38,0.08)",
                              border: "1px solid rgba(220,38,38,0.2)",
                              color: isCancelling ? "rgba(248,113,113,0.4)" : "#f87171",
                              borderRadius: 6, padding: "4px 10px", fontSize: 11,
                              fontWeight: 600, cursor: isCancelling ? "not-allowed" : "pointer",
                            }}
                          >
                            {isCancelling ? "…" : "Remove"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── My Submitted Feedback ── */}
            {detailTab === "details" && detailGame.status === "completed" && detailGameFeedback && (
              <div style={{ margin: "0 0 16px", padding: "14px 16px", background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 10 }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#4ade80", marginBottom: 10, fontWeight: 700 }}>
                  ✓ Your Feedback Submitted
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" }}>Game</span>
                    <div style={{ display: "flex", gap: 2 }}>
                      {[1,2,3,4,5].map(n => <span key={n} style={{ fontSize: 15, color: n <= detailGameFeedback.gameRating ? "#fbbf24" : "#333" }}>★</span>)}
                    </div>
                  </div>
                  {detailGameFeedback.organiserRating && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" }}>Organiser</span>
                      <div style={{ display: "flex", gap: 2 }}>
                        {[1,2,3,4,5].map(n => <span key={n} style={{ fontSize: 15, color: n <= detailGameFeedback.organiserRating ? "#fbbf24" : "#333" }}>★</span>)}
                      </div>
                    </div>
                  )}
                  {detailGameFeedback.venueRating && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" }}>Venue</span>
                      <div style={{ display: "flex", gap: 2 }}>
                        {[1,2,3,4,5].map(n => <span key={n} style={{ fontSize: 15, color: n <= detailGameFeedback.venueRating ? "#fbbf24" : "#333" }}>★</span>)}
                      </div>
                    </div>
                  )}
                </div>
                {detailGameFeedback.tags?.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {detailGameFeedback.tags.map((tag: string) => (
                      <span key={tag} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 20, background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}>{tag}</span>
                    ))}
                  </div>
                )}
                {detailGameFeedback.comment && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#888", fontStyle: "italic", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}>
                    "{detailGameFeedback.comment}"
                  </div>
                )}
              </div>
            )}

            {/* ── Full Waitlist ── */} 

            {
              detailTab === "players" && (() => {
              const waitlistPlayers = (detailGame.waitlist || [])
                .filter((w: any) => {
                  if (['declined', 'expired'].includes(w.status) || !w.player?.name) return false;
                  // hide own entry when no longer on the waitlist (stale DB data after cancellation)
                  if (!detailIsWaitlisted) {
                    const wPid = w.player?._id?.toString() ?? w.player?.toString() ?? '';
                    if (wPid === playerId) return false;
                  }
                  return true;
                })
                .map((w: any) => ({ name: w.player.name, isGuest: false }));
              const waitlistGuests = (detailGame.guestWaitlist || [])
                .filter((gw: any) => {
                  if (['expired'].includes(gw.status) || !gw.plusOneName) return false;
                  // hide own guest entries when no longer on the waitlist
                  if (!detailIsWaitlisted) {
                    const gwPid = gw.player?._id?.toString() ?? gw.player?.toString() ?? '';
                    if (gwPid === playerId) return false;
                  }
                  return true;
                })
                .map((gw: any) => ({ name: gw.plusOneName, isGuest: true }));
              const allWaiting = [...waitlistPlayers, ...waitlistGuests];
              if (allWaiting.length === 0) return null;
              return (
                <div style={{
                  margin: "0 0 16px",
                  padding: "14px 16px",
                  background: "rgba(167,139,250,0.04)",
                  border: "1px solid rgba(167,139,250,0.18)",
                  borderRadius: 10,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "#a78bfa" }}>
                      📋 Waitlist
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 10,
                      background: "rgba(167,139,250,0.14)", color: "#c4b5fd",
                      border: "1px solid rgba(167,139,250,0.25)",
                    }}>{allWaiting.length}</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "6px 8px" }}>
                    {allWaiting.map((entry, i) => (
                      <span key={i} style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        fontSize: 12, fontWeight: 600,
                        padding: "5px 11px", borderRadius: 20,
                        background: entry.isGuest ? "rgba(167,139,250,0.06)" : "rgba(167,139,250,0.10)",
                        color: entry.isGuest ? "#a78bfa" : "#c4b5fd",
                        border: `1px solid ${entry.isGuest ? "rgba(167,139,250,0.15)" : "rgba(167,139,250,0.25)"}`,
                        whiteSpace: "nowrap" as const,
                        maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {entry.isGuest && (
                          <span style={{ fontSize: 9, opacity: 0.7, fontWeight: 700, letterSpacing: "0.04em" }}>+1</span>
                        )}
                        {entry.name}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()
            }

            </div>{/* end pd-event-modal-body */}

            {lightboxImage && <ImageLightbox  lightboxImage={lightboxImage}  setLightboxImage={setLightboxImage}/> }

            {/* ── Sticky Footer ── */}
            <div className="pd-event-modal-footer">
              {/* Close — always left */}
              <button
                type="button"
                onClick={() => { setDetailGame(null); setDetailGameFeedback(null);setLightboxImage(null);}}
                style={{
                  padding: "10px 22px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", background: "rgba(255,255,255,0.06)",
                  color: "#e5e7eb", border: "1px solid rgba(255,255,255,0.12)",
                  transition: "background 0.18s, border-color 0.18s", flexShrink: 0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
              >
                Close
              </button>

              {/* Action buttons — always right */}
              <div className="pd-footer-actions">
                {/* Rate Game Button - Only show if game is completed */}
                {detailGame.status === "completed" &&
                  detailIsRegistered &&
                  !detailGameFeedback &&
                  pendingFeedback.some((g) => g._id === detailGame._id) && (
                    <button
                      className="pd-modal-btn"
                      type="button"
                      onClick={() => { setDetailGame(null); setDetailGameFeedback(null); setFeedbackTargetGame(detailGame); }}
                      style={{ 
                        background: "rgba(196,213,108,0.12)", 
                        color: "#c4d56c", 
                        border: "1px solid rgba(196,213,108,0.3)",
                        padding: "11px 18px", 
                        borderRadius: 8, 
                        fontSize: 13, 
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        whiteSpace: "nowrap"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(196,213,108,0.18)";
                        e.currentTarget.style.borderColor = "rgba(196,213,108,0.4)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(196,213,108,0.12)";
                        e.currentTarget.style.borderColor = "rgba(196,213,108,0.3)";
                      }}
                    >
                      ⭐ Rate Game
                    </button>
                  )}

                {/* Registered User Actions — guest CRUD moved to My Guests section above.
                    Opted out ⇒ "Rejoin" is the primary action (behaves like joining), but
                    "Leave Game" stays next to it. Opting out keeps a live row so guests can
                    play on, which means the game keeps showing as "✓ Registered" in My Games;
                    without an exit here a player who gave up their seat had no way out of the
                    game at all, only a Rejoin they didn't want. */}
                {detailIsRegistered && !detailIsCancelled && detailGame.status !== "completed" && !detailPastReporting ? (
                  isOptedOut ? (
                    <>
                    <button
                      className="pd-modal-btn"
                      type="button"
                      onClick={() => handleOptOut(true)}
                      disabled={optingOut}
                      style={{
                        background: "rgba(74,222,128,0.14)",
                        color: "#4ade80",
                        border: "1px solid rgba(74,222,128,0.35)",
                        padding: "11px 18px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: optingOut ? "not-allowed" : "pointer",
                        transition: "all 0.2s ease",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {optingOut ? "Rejoining…" : "🔄 Rejoin"}
                    </button>
                    <button
                      className="pd-modal-btn secondary"
                      type="button"
                      onClick={() => handleCancelRegistration(detailGame)}
                      disabled={!!cancellingGameId}
                      style={{
                        background: cancellingGameId ? "rgba(220,38,38,0.05)" : "rgba(220,38,38,0.12)",
                        color: cancellingGameId ? "rgba(248,113,113,0.6)" : "#f87171",
                        border: "1px solid rgba(220,38,38,0.3)",
                        padding: "11px 18px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: cancellingGameId ? "not-allowed" : "pointer",
                        transition: "all 0.2s ease",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {cancellingGameId === detailGame._id ? "Leaving..." : "Leave Game"}
                    </button>
                    </>
                  ) : (
                    <button
                      className="pd-modal-btn secondary"
                      type="button"
                      onClick={() => handleCancelRegistration(detailGame)}
                      disabled={!!cancellingGameId}
                      style={{
                        background: cancellingGameId ? "rgba(220,38,38,0.05)" : "rgba(220,38,38,0.12)",
                        color: cancellingGameId ? "rgba(248,113,113,0.6)" : "#f87171",
                        border: "1px solid rgba(220,38,38,0.3)",
                        padding: "11px 18px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: cancellingGameId ? "not-allowed" : "pointer",
                        transition: "all 0.2s ease",
                        whiteSpace: "nowrap"
                      }}
                      onMouseEnter={(e) => {
                        if (!cancellingGameId) {
                          e.currentTarget.style.background = "rgba(220,38,38,0.18)";
                          e.currentTarget.style.borderColor = "rgba(220,38,38,0.4)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!cancellingGameId) {
                          e.currentTarget.style.background = "rgba(220,38,38,0.12)";
                          e.currentTarget.style.borderColor = "rgba(220,38,38,0.3)";
                        }
                      }}
                    >
                      {cancellingGameId === detailGame._id ? "Cancelling..." : "Cancel Registration"}
                    </button>
                  )
                ) : null}

                {/* Waitlisted User Actions */}
                {detailIsWaitlisted && !isOnRejoinWaitlist && !detailIsCancelled && detailGame.status !== "completed" && !detailPastReporting ? (
                  <>
                    {detailSpotsLeft > 0 && (
                      <button
                        className="pd-modal-btn"
                        type="button"
                        onClick={() => { setDetailGame(null); handleBook(detailGame); }}
                        style={{ 
                          background: "#c8ff3e", 
                          color: "#000", 
                          border: "none",
                          padding: "11px 24px", 
                          borderRadius: 8, 
                          fontSize: 13, 
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          whiteSpace: "nowrap"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#d4ff6d";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#c8ff3e";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        ⚽ Book
                      </button>
                    )}
                    <button
                      className="pd-modal-btn secondary"
                      type="button"
                      onClick={() => handleLeaveWaitlist(detailGame)}
                      style={{ 
                        background: "rgba(220,38,38,0.12)", 
                        color: "#f87171", 
                        border: "1px solid rgba(220,38,38,0.3)",
                        padding: "11px 18px", 
                        borderRadius: 8, 
                        fontSize: 13, 
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        whiteSpace: "nowrap"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(220,38,38,0.18)";
                        e.currentTarget.style.borderColor = "rgba(220,38,38,0.4)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(220,38,38,0.12)";
                        e.currentTarget.style.borderColor = "rgba(220,38,38,0.3)";
                      }}
                    >
                      Leave Waitlist
                    </button>
                  </>
                ) : null}

                {/* Not Registered — a pending join request shows a Cancel action;
                    otherwise a Book / Request-to-Join button. */}
                {!detailIsRegistered && !detailIsWaitlisted && !detailIsCancelled && (
                  detailGame._myRequestStatus === "pending" ? (
                    <button
                      className="pd-modal-btn secondary"
                      type="button"
                      onClick={() => handleCancelRequest(detailGame)}
                      title="Cancel your join request"
                      style={{
                        background: "rgba(245,158,11,0.12)",
                        color: "#f59e0b",
                        border: "1px solid rgba(245,158,11,0.35)",
                        padding: "11px 18px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      ⏳ Requested · Cancel
                    </button>
                  ) : (
                    <button
                      className="pd-modal-btn"
                      type="button"
                      onClick={() => {
                        setDetailGame(null);
                        handleBook(detailGame);
                      }}
                      style={{
                        background: "#c8ff3e",
                        color: "#000",
                        border: "none",
                        padding: "11px 24px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        whiteSpace: "nowrap"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#d4ff6d";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#c8ff3e";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      {detailGame.requiresApproval ? "🙋 Request to Join" : "⚽ Book Now"}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
         
        </div> 
    
      )}
    </div>
    </>
  );
}
