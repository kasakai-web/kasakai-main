"use client";

import { useEffect } from "react";

/**
 * Freezes the page behind a modal, sheet or drawer while `active` is true.
 *
 * `body { overflow: hidden }` alone is not enough on phones: iOS Safari keeps
 * scrolling the page under a touch drag, and once a modal's own list hits its
 * end the leftover gesture chains through to the page. On touch devices the
 * body is pinned with `position: fixed` at the current offset instead, which
 * every mobile browser honours, and the offset is restored on unlock.
 *
 * Desktop keeps the plain overflow lock: pinning the body there would hide the
 * scrollbar (layout shift) and drop the sticky sidebar out of place.
 *
 * Reference-counted, so stacked overlays (the venue sheet opened from the game
 * details modal) don't unlock the page early when the top one closes.
 */
let lockCount = 0;
let restore: (() => void) | null = null;

function lock() {
  lockCount += 1;
  if (lockCount > 1) return;

  const html = document.documentElement;
  const body = document.body;
  const prev = {
    htmlOverflow: html.style.overflow,
    bodyOverflow: body.style.overflow,
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
  };

  const touch = window.matchMedia("(pointer: coarse)").matches;
  const scrollY = window.scrollY;

  html.style.overflow = "hidden";
  body.style.overflow = "hidden";
  if (touch) {
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
  }

  restore = () => {
    html.style.overflow = prev.htmlOverflow;
    body.style.overflow = prev.bodyOverflow;
    if (touch) {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      window.scrollTo(0, scrollY);
    }
  };
}

function unlock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0) return;
  restore?.();
  restore = null;
}

export function useScrollLock(active: boolean = true) {
  useEffect(() => {
    if (!active) return;
    lock();
    return unlock;
  }, [active]);
}
