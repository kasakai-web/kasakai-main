/**
 * The one answer to "can this visitor install KasaKai, and how?".
 *
 * Every install affordance — the banner, the /install page, the footer link —
 * reads from here, so the button that is offered and the thing that happens
 * when it is pressed can never disagree.
 *
 * Nothing in this file touches React and nothing runs at import time; the
 * capture of `beforeinstallprompt` happens in an inline script in the root
 * layout, long before any bundle has parsed (see INSTALL_PROMPT_SNIPPET). This
 * module only reads what that script parked on `window`.
 */

/** `beforeinstallprompt` is Chromium-only and absent from lib.dom. */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    __kkInstallPrompt?: BeforeInstallPromptEvent | null;
    __kkInstalled?: boolean;
  }
}

/** Fired by the inline snippet when the browser offers us an install prompt. */
export const INSTALL_AVAILABLE_EVENT = "kk-install-available";
/** Fired by the inline snippet once the app has actually been installed. */
export const INSTALLED_EVENT = "kk-installed";

/**
 * Runs before hydration, from the root layout.
 *
 * `beforeinstallprompt` fires once, early, and is gone if nobody calls
 * `preventDefault()` on it — often before React has mounted on a mid-range
 * phone. A component-level listener loses that race often enough to look like
 * "the install button just doesn't appear sometimes", so the event is caught
 * here and parked on `window` for whatever mounts later.
 */
export const INSTALL_PROMPT_SNIPPET = `
(function () {
  window.__kkInstallPrompt = null;
  window.__kkInstalled = false;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    window.__kkInstallPrompt = e;
    window.dispatchEvent(new Event('${INSTALL_AVAILABLE_EVENT}'));
  });
  window.addEventListener('appinstalled', function () {
    window.__kkInstallPrompt = null;
    window.__kkInstalled = true;
    window.dispatchEvent(new Event('${INSTALLED_EVENT}'));
  });
})();
`.trim();

export type InstallPlatform = "ios" | "android" | "desktop" | "unknown";

/**
 * Is this document already the installed app?
 *
 * Four tests because no single one covers the field: `display-mode` is the
 * standard (and `minimal-ui`/`fullscreen` count — an organiser-style launch is
 * still not a browser tab), `navigator.standalone` is the iOS-only predecessor
 * Safari never replaced, and an `android-app://` referrer is what a WebAPK
 * looks like on its very first navigation before display-mode settles.
 */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const matches = (query: string) => {
    try {
      return window.matchMedia(query).matches;
    } catch {
      return false;
    }
  };
  return (
    matches("(display-mode: standalone)") ||
    matches("(display-mode: minimal-ui)") ||
    matches("(display-mode: fullscreen)") ||
    matches("(display-mode: window-controls-overlay)") ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
    document.referrer.startsWith("android-app://")
  );
}

export function detectPlatform(): InstallPlatform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;

  // iPadOS 13+ reports a desktop Safari UA string. A touch-capable "Macintosh"
  // is the only tell left, and no real Mac reports more than one touch point.
  const isIpadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  if (/iPad|iPhone|iPod/.test(ua) || isIpadOS) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Windows|Macintosh|Linux|CrOS/.test(ua)) return "desktop";
  return "unknown";
}

/**
 * An in-app browser — the WhatsApp / Instagram / Facebook webview a shared game
 * link opens in. It cannot install anything, and it is where a large share of
 * KasaKai's traffic actually lands, so the guidance there has to be "open this
 * in Chrome" rather than a button that does nothing.
 */
export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Line\/|LinkedInApp|Snapchat|Pinterest|MicroMessenger|Twitter/i.test(
    navigator.userAgent,
  );
}

/**
 * iOS installs only from Safari's own share sheet. Chrome and Edge on iOS grew
 * an "Add to Home Screen" of their own (iOS 16.4+) but Firefox has not, so the
 * /install page names the browser rather than assuming Safari.
 */
export function iosBrowserName(): "safari" | "chrome" | "edge" | "firefox" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/CriOS/.test(ua)) return "chrome";
  if (/EdgiOS/.test(ua)) return "edge";
  if (/FxiOS/.test(ua)) return "firefox";
  if (/Safari/.test(ua)) return "safari";
  return "other";
}

/**
 * Safari on a Mac, from Sonoma on: **File → Add to Dock**, which produces the
 * same chrome-less window every other platform's install does.
 *
 * It is worth its own test because Safari fires no `beforeinstallprompt`, so
 * `canPrompt` is false for a visitor who can, in fact, install — the one case
 * where "no prompt" and "no install" come apart on the desktop. The version
 * gate matters: Safari 16 has no Add to Dock, and sending someone to a File
 * menu that lacks the item is worse than staying quiet.
 *
 * Chrome and Edge on macOS both carry `Safari/537.36` in their UA and are
 * excluded by name; an iPad reports `Macintosh` too and is already `ios`.
 */
export function canAddToDock(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (!/Macintosh/.test(ua) || navigator.maxTouchPoints > 1) return false;
  if (!/Safari/.test(ua) || /Chrome|Chromium|Edg|OPR|Firefox/.test(ua)) return false;
  const version = Number(/Version\/(\d+)/.exec(ua)?.[1]);
  return version >= 17;
}

/* ─────────────────────────── dismissal memory ─────────────────────────── */

const SNOOZE_KEY = "kk-install-snoozed-at";
const INSTALLED_KEY = "kk-install-done";

/**
 * How long "Not now" lasts. Long enough that the banner is not the thing a
 * player remembers about the site, short enough that someone who dismissed it
 * on their first visit still gets asked once they have a reason to say yes.
 */
export const SNOOZE_DAYS = 21;

/** localStorage throws outright in a Safari private window — never let that break a page. */
function safeRead(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* nothing to do — the banner simply asks again next visit */
  }
}

export function snoozeInstallPrompt() {
  safeWrite(SNOOZE_KEY, String(Date.now()));
}

/**
 * Remembered separately from `isStandalone()`, which only ever answers for the
 * document asking. Install from a Chrome tab and that tab stays a tab — without
 * this flag the banner would still be sitting there under an app the visitor
 * has already got.
 */
export function rememberInstalled() {
  safeWrite(INSTALLED_KEY, "1");
}

export function wasInstalled(): boolean {
  return safeRead(INSTALLED_KEY) === "1";
}

export function isSnoozed(): boolean {
  const at = Number(safeRead(SNOOZE_KEY));
  if (!at) return false;
  return Date.now() - at < SNOOZE_DAYS * 24 * 60 * 60 * 1000;
}

/* ───────────────────────────── registration ───────────────────────────── */

/**
 * Registers the installability worker. Failure is not worth reporting: the only
 * thing lost is the one-tap install button, and /install still explains the
 * manual route on every platform.
 */
export function registerServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker
    // `updateViaCache: none` so a deployed change to sw.js is picked up on the
    // next visit instead of being served from the HTTP cache for 24h.
    .register("/sw.js", { scope: "/", updateViaCache: "none" })
    .catch(() => {});
}
