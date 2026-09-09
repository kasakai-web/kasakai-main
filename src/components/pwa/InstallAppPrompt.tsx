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
 */
const APPEAR_AFTER_MS = 5000;

export default function InstallAppPrompt() {
  const pathname = usePathname() || "";
  const { ready, installed, canPrompt, platform, inAppBrowser, promptInstall } = usePwaInstall();
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

  if (!ready || installed || dismissed || snoozed || !elapsed) return null;
  if (SUPPRESSED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

  // A desktop browser with no prompt on offer is Firefox or Safari, neither of
  // which installs anything — there is no instruction to give, so say nothing.
  // Phones always get the banner: iOS never fires a prompt but the share sheet
  // works, and /install is where that is explained.
  const usable = canPrompt || platform === "ios" || platform === "android";
  if (!usable) return null;

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
        <p className="kk-install-sub">
          {inAppBrowser
            ? "Open KasaKai in Chrome to add it to your home screen."
            : "Add it to your home screen — one tap to your games. No download, no store."}
        </p>
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
