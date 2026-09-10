"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { isSnoozed, registerServiceWorker, snoozeInstallPrompt } from "@/utils/pwa";
import "./pwa.css";

/**
 * The "add KasaKai to your home screen" offer, mounted once in the root layout.
 *
 * It also registers the service worker, because that registration and this
 * banner are the same feature: the worker exists ONLY so Chrome will hand us
 * the install prompt this banner fires (see public/sw.js). Keeping them apart
 * would leave a worker in the app with no visible reason to be there.
 *
 * Deliberately player-portal-only. Organisers and admins run KasaKai in a
 * browser with tabs open beside it; a home screen icon is a player's shape.
 */

/**
 * Pages that ask the visitor for exactly one thing. An install offer sliding up
 * over the pay/login button is the definition of the banner everyone hates, and
 * /install already IS the offer.
 */
const SUPPRESSED_PREFIXES = ["/install", "/login", "/join"];

/**
 * Long enough that the page the visitor actually came for has painted and been
 * looked at first. An install offer in the first second reads as an ad.
 *
 * It applies only where the banner appears on our own initiative — iOS, Android,
 * Mac Safari — where nothing has told us the visitor is ready. See the gate
 * below for the case that skips it.
 */
const APPEAR_AFTER_MS = 5000;

export default function InstallAppPrompt() {
  const pathname = usePathname() || "";
  const { ready, installed, canPrompt, canAddToDock, platform, inAppBrowser, promptInstall } =
    usePwaInstall();
  const [elapsed, setElapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [leaving, setLeaving] = useState(false);
  // Read once on mount rather than inline: localStorage is not readable during
  // the server render, and a banner that appears and then vanishes is worse
  // than one that never appeared.
  const [snoozed, setSnoozed] = useState(true);

  useEffect(() => {
    registerServiceWorker();
    setSnoozed(isSnoozed());
    const timer = setTimeout(() => setElapsed(true), APPEAR_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  /** Fade out first, then unmount — the CSS animation needs the node to still exist. */
  const close = useCallback((remember: boolean) => {
    if (remember) snoozeInstallPrompt();
    setLeaving(true);
    setTimeout(() => setDismissed(true), 200);
  }, []);

  const onInstall = useCallback(async () => {
    const outcome = await promptInstall();
    // "dismissed" is the visitor closing Chrome's own sheet. Treat it as a no
    // and stop asking for a while — re-offering the same prompt they just shut
    // is how a banner becomes something to be rid of rather than considered.
    close(outcome !== "accepted");
  }, [close, promptInstall]);

  // A Chromium prompt in hand is itself the signal the delay was waiting for:
  // `beforeinstallprompt` only fires once Chrome's own engagement gate has
  // passed — a click, and around thirty seconds on the page. Sitting out a
  // second wait after that just buries a one-tap install the visitor has
  // already earned. Everywhere else the banner is our idea, and still waits.
  const due = elapsed || canPrompt;
  if (!ready || installed || dismissed || snoozed || !due) return null;
  if (SUPPRESSED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

  // Offer only where there is somewhere to send them. Phones always qualify:
  // iOS never fires a prompt but the share sheet works. Mac Safari qualifies
  // for the same reason — File → Add to Dock is a real install with no prompt
  // behind it. What is left out is desktop Firefox, which cannot install a web
  // app at all and would get a banner leading to a page that tells it so.
  const usable = canPrompt || canAddToDock || platform === "ios" || platform === "android";
  if (!usable) return null;

  // A Mac has no home screen, and being told to add something to one is how a
  // visitor decides the offer was not written for them.
  const sub = inAppBrowser
    ? "Open KasaKai in Chrome to add it to your home screen."
    : canAddToDock
      ? "Keep it in your Dock — your games in their own window. No download, no store."
      : "Add it to your home screen — one tap to your games. No download, no store.";

  return (
    <div
      className={`kk-install-bar${leaving ? " kk-install-out" : ""}`}
      role="region"
      aria-label="Install the KasaKai app"
    >
      <div className="kk-install-icon">
        <Image src="/pwa/icon-192.png" alt="" width={44} height={44} unoptimized />
      </div>

      <div className="kk-install-copy">
        <p className="kk-install-title">
          Install <em>KasaKai</em>
        </p>
        <p className="kk-install-sub">{sub}</p>
      </div>

      <div className="kk-install-actions">
        {canPrompt ? (
          <button type="button" className="kk-install-cta" onClick={onInstall}>
            Install
          </button>
        ) : (
          <Link
            href="/install"
            className="kk-install-cta"
            // Following the link is itself an answer — without this the banner
            // is waiting on the /install page when they come back.
            onClick={() => close(true)}
          >
            Show me how
          </Link>
        )}
        <button type="button" className="kk-install-skip" onClick={() => close(true)}>
          Not now
        </button>
      </div>
    </div>
  );
}
