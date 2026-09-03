// The one place the landing page turns a call-to-action into a URL.
//
// Every CTA lands in the SAME auth flow the rest of the site already uses
// (src/app/login/page.tsx) — never a second sign-up screen of its own:
//
//   ?mode=signup      opens the sign-up form first; the sign-up card's "Sign In"
//                     button drops the visitor onto the login form, so signing
//                     IN stays one tap away for people who already have an
//                     account.
//   ?targetGame=<id>  is remembered through login AND OTP verification, and
//                     reopens that game's booking modal on the dashboard the
//                     moment there is a session — the same handoff
//                     /join/[gameId] uses.
//   ?redirect=<path>  where to land when there is no game to reopen.
//   ?metro=<slug>     the city tab the visitor was looking at when they pressed
//                     the button. The dashboard's browse filters read it out of
//                     the address bar and it outranks the city on their profile,
//                     which is the whole point: someone reading the Mumbai tab
//                     is asking for Mumbai, whatever they told us months ago.
//                     Only added for a signed-in player, because only they go
//                     straight to /dashboard — a visitor's choice travels
//                     through the auth flow in localStorage instead (see
//                     rememberMetro in utils/browse.ts).

// Deliberately NOT exported. Every CTA has to go through a helper below, each
// of which asks whether there is a session first — an imported bare constant is
// how "Book" and "View more games" ended up marching signed-in players back to
// a sign-up form.
const SIGNUP_HREF = "/login?role=player&mode=signup";

/** `/dashboard`, scoped to a city and/or a game when the caller knows one. */
const dashboardHref = (metro?: string | null, openGame?: string) => {
  const params = new URLSearchParams();
  if (openGame) params.set("openGame", openGame);
  if (metro) params.set("metro", metro);
  const qs = params.toString();
  return qs ? `/dashboard?${qs}` : "/dashboard";
};

/**
 * "Book" on a game card — always ends at that game's booking modal.
 *
 * A signed-in player goes straight there; there is nothing to ask them. A
 * visitor goes to the LOGIN form (not sign-up: "Book" is a booking intent, not
 * an account-creation one, and returning players are the ones most likely to
 * press it) carrying ?targetGame, which PlayerLoginForm spends on
 * /dashboard?openGame=<id> — and the sign-up card is one tap below if they turn
 * out to be new. No ?redirect: targetGame already decides the destination in
 * both PlayerLoginForm and the sign-up OTP step, so a second answer could only
 * disagree with the first.
 */
export const bookHref = (gameId: string, isLoggedIn: boolean, metro?: string | null) =>
  isLoggedIn
    ? dashboardHref(metro, gameId)
    : `/login?role=player&targetGame=${gameId}`;

/**
 * Any "take me into Kasa Kai" CTA — Explore, Join, View more games.
 *
 * A visitor is asked to sign up. A player is ALREADY in, so sending them to a
 * sign-up form is a dead end that asks them to become someone they are; they go
 * to the browse dashboard, which is what every one of these CTAs was promising
 * a look at in the first place.
 */
export const enterHref = (isLoggedIn: boolean, metro?: string | null) =>
  isLoggedIn ? dashboardHref(metro) : SIGNUP_HREF;

/**
 * "Find a game" on /about — browse intent, so it ends at the games, never at a
 * form for its own sake.
 *
 * A player goes straight to the browse dashboard. A visitor goes to the LOGIN
 * form (not sign-up, for the same reason bookHref does not: someone hunting for
 * a game to play is more likely to already have an account than to be creating
 * one), and PlayerLoginForm's own fallback lands them on that same dashboard.
 *
 * No ?redirect: it would not change the answer. The form checks for a missing
 * profile photo BEFORE it reads redirectAfterLogin, so the one-time photo step
 * wins either way — that gate is site-wide and this CTA has no business
 * carving itself an exemption from it. Everyone else ends at /dashboard.
 */
export const findGameHref = (isLoggedIn: boolean) =>
  isLoggedIn ? "/dashboard" : "/login?role=player";

/**
 * "Explore monthly pass". A signed-in player's pass is the "My Pass" card on
 * their profile — the only page that can tell them which one they hold and when
 * it runs out. There is no standalone pass page to send them to.
 */
export const passHref = (isLoggedIn: boolean) =>
  isLoggedIn ? "/dashboard/profile" : SIGNUP_HREF;

/** "View details" — the existing signed-out game landing page. */
export const detailsHref = (gameId: string) => `/join/${gameId}`;
