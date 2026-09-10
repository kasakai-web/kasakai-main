"use client";

import { useCallback, useEffect, useState } from "react";
import {
  INSTALLED_EVENT,
  INSTALL_AVAILABLE_EVENT,
  type InstallPlatform,
  canAddToDock,
  detectPlatform,
  isInAppBrowser,
  isStandalone,
  rememberInstalled,
  wasInstalled,
} from "@/utils/pwa";

export type PromptOutcome = "accepted" | "dismissed" | "unavailable";

export interface PwaInstall {
  /**
   * The client has looked. Everything below is unknowable during the server
   * render — `installed` would come back false for someone already inside the
   * app — so callers render nothing at all until this flips, rather than
   * rendering a banner the first client paint has to take away again.
   */
  ready: boolean;
  /** Already installed: this document IS the app, or one was installed from here. */
  installed: boolean;
  /** The browser has handed us a real install prompt to fire. */
  canPrompt: boolean;
  /**
   * Safari on a Mac (Sonoma+), which installs from its File menu and never
   * fires a prompt. Deliberately separate from `canPrompt`: there is something
   * to offer, but the offer is a link to the steps, not a button.
   */
  canAddToDock: boolean;
  platform: InstallPlatform;
  /** A WhatsApp/Instagram webview, where no install of any kind is possible. */
  inAppBrowser: boolean;
  promptInstall: () => Promise<PromptOutcome>;
}

/**
 * React's view of `utils/pwa`. The banner and the /install page both run on
 * this, so the affordance one offers and the affordance the other offers are
 * the same answer, arrived at once.
 */
export function usePwaInstall(): PwaInstall {
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>("unknown");
  const [inAppBrowser, setInAppBrowser] = useState(false);
  const [dockable, setDockable] = useState(false);

  useEffect(() => {
    const sync = () => {
      setInstalled(isStandalone() || wasInstalled());
      setCanPrompt(Boolean(window.__kkInstallPrompt));
    };

    setPlatform(detectPlatform());
    setInAppBrowser(isInAppBrowser());
    setDockable(canAddToDock());
    sync();
    setReady(true);

    const onInstalled = () => {
      rememberInstalled();
      sync();
    };

    window.addEventListener(INSTALL_AVAILABLE_EVENT, sync);
    window.addEventListener(INSTALLED_EVENT, onInstalled);

    // Someone can leave the browser tab and come back inside the installed app
    // without this document ever unloading — a launch from the new home screen
    // icon in the same session. The media query is what notices.
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    standaloneQuery.addEventListener("change", sync);

    return () => {
      window.removeEventListener(INSTALL_AVAILABLE_EVENT, sync);
      window.removeEventListener(INSTALLED_EVENT, onInstalled);
      standaloneQuery.removeEventListener("change", sync);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<PromptOutcome> => {
    const deferred = window.__kkInstallPrompt;
    if (!deferred) return "unavailable";

    // A deferred prompt is single-use — calling `prompt()` on a spent one
    // throws — so it is dropped here, before it is fired, whichever way the
    // visitor answers. Chrome hands us a fresh one later if they said no.
    window.__kkInstallPrompt = null;
    setCanPrompt(false);

    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") {
        rememberInstalled();
        setInstalled(true);
      }
      return outcome;
    } catch {
      return "unavailable";
    }
  }, []);

  return {
    ready,
    installed,
    canPrompt,
    canAddToDock: dockable,
    platform,
    inAppBrowser,
    promptInstall,
  };
}
