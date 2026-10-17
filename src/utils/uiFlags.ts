/**
 * Build-time UI switches.
 *
 * NEW_DASHBOARD_UI picks the player dashboard redesign (the `kk-side` sidebar,
 * the browse feed header and the `kk-game-card` cards) over the dashboard that
 * shipped before it. The redesign is awaiting sign-off, but everything else on
 * the branch has to reach main, so both live side by side and this decides which
 * one a deployment serves:
 *
 *   NEXT_PUBLIC_NEW_DASHBOARD_UI=true   → redesign
 *   unset / anything else               → the old dashboard (the safe default)
 *
 * It is a NEXT_PUBLIC_ variable, so Next inlines it at BUILD time: changing it
 * means rebuilding, not restarting. That is deliberate — a runtime fetch would
 * render one dashboard and then swap to the other on every page load.
 *
 * The old dashboard lives in components/dashboard/legacy/. Once the redesign is
 * approved, delete that folder, this flag and every branch on it together.
 */
export const NEW_DASHBOARD_UI = process.env.NEXT_PUBLIC_NEW_DASHBOARD_UI === "true";
