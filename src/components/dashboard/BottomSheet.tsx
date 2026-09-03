"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./browse.css";

/**
 * The one sheet every browse control opens into.
 *
 * A bottom sheet rather than a dropdown because the filter row lives near the top
 * of a phone screen and the options belong under the thumb, not under the chip.
 * On desktop the same component renders as a centred dialog (see browse.css) —
 * one set of states, two placements.
 *
 * Owns the three things a sheet has to get right and every ad-hoc modal gets
 * wrong: Escape closes it, the page behind it does not scroll, and focus starts
 * inside it.
 */
export default function BottomSheet({
  open,
  title,
  onClose,
  children,
  footer,
  labelledBy = "kk-sheet-title",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  labelledBy?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // `onClose` is almost always a fresh arrow from the caller, so it changes
  // identity on every one of their renders. Held in a ref so the effect below
  // can depend on `open` ALONE — with `onClose` in its dependency array, the
  // effect tore down and re-ran on every keystroke in the city search, and its
  // `panelRef.focus()` pulled focus straight back off the input. One character
  // per click is what that looks like from the outside.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onCloseRef.current(); }
    };
    document.addEventListener("keydown", onKeyDown);

    // Freeze the list behind the sheet. Without this a scroll gesture that runs
    // past the end of the sheet's own content drags the page underneath, and the
    // player loses their place in the game list.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus the panel, not the first control: on mobile, focusing an input pops
    // the keyboard over the very options the player came to tap. This runs once
    // per opening — never again while the sheet is up, or it would fight
    // whatever the player has since focused.
    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="kk-sheet-backdrop" onClick={onClose} role="presentation">
      <div
        ref={panelRef}
        className="kk-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="kk-sheet-grip" aria-hidden="true" />
        <div className="kk-sheet-head">
          <div className="kk-sheet-title" id={labelledBy}>{title}</div>
          <button className="kk-sheet-close" onClick={onClose} type="button" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="kk-sheet-body">{children}</div>
        {footer && <div className="kk-sheet-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
