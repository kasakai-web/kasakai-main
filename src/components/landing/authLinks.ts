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

// Deliberately NOT exported. Every CTA has to go through a helper below, each
// of which asks whether there is a session first — an imported bare constant is
// how "Book" and "View more games" ended up marching signed-in players back to
// a sign-up form.
const SIGNUP_HREF = "/login?role=player&mode=signup";

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
export const bookHref = (gameId: string, isLoggedIn: boolean) =>
  isLoggedIn
    ? `/dashboard?openGame=${gameId}`
    : `/login?role=player&targetGame=${gameId}`;

/**
 * Any "take me into Kasa Kai" CTA — Explore, Join, View more games.
 *
 * A visitor is asked to sign up. A player is ALREADY in, so sending them to a
 * sign-up form is a dead end that asks them to become someone they are; they go
 * to the browse dashboard, which is what every one of these CTAs was promising
 * a look at in the first place.
 */
export const enterHref = (isLoggedIn: boolean) =>
  isLoggedIn ? "/dashboard" : SIGNUP_HREF;

/**
 * "Explore monthly pass". A signed-in player's pass is the "My Pass" card on
 * their profile — the only page that can tell them which one they hold and when
 * it runs out. There is no standalone pass page to send them to.
 */
export const passHref = (isLoggedIn: boolean) =>
  isLoggedIn ? "/dashboard/profile" : SIGNUP_HREF;

/** "View details" — the existing signed-out game landing page. */
export const detailsHref = (gameId: string) => `/join/${gameId}`;
