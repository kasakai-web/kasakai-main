"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

// The card's "🐦 Early bird" tag. Press and hold it to see what the early price
// is and when it ends; let go and the details go away. The card keeps only the
// tag and the two prices — the details live here, on demand.
//
// The popover is portalled to <body> and positioned against the tag: both cards
// are `overflow: hidden` (and the feed card is transformed on hover), so a
// popover inside the card would be clipped at its edge.

const POP_WIDTH = 260;
const GUTTER = 8;

interface Props {
  className: string;
  /** "₹160" — the price the next seat sells at. */
  price: string;
  /** "₹220" — the list price it is measured against. */
  original: string;
  /** "Ends after 3 more seats or tonight 6 pm — then ₹190" (utils/earlyBird#expiryLine). */
  detail: string | null;
  children: ReactNode;
}

type Place = { left: number; width: number; top?: number; bottom?: number };

export default function EarlyBirdTag({ className, price, original, detail, children }: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const id = useId();

  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const vw = window.innerWidth;
    const width = Math.min(POP_WIDTH, vw - GUTTER * 2);
    const left = Math.min(Math.max(r.left + r.width / 2 - width / 2, GUTTER), vw - width - GUTTER);
    // Below the tag, unless that would run off the bottom of the screen.
    const below = r.bottom + 120 < window.innerHeight;
    setPlace(below
      ? { left, width, top: r.bottom + 6 }
      : { left, width, bottom: window.innerHeight - r.top + 6 });
  };
  const hide = () => setPlace(null);

  return (
    <>
      <button
        ref={ref}
        type="button"
        className={`${className} kk-early-trigger`}
        aria-describedby={place ? id : undefined}
        aria-label="Early bird price — press and hold for details"
        onPointerDown={(e) => {
          // Capture, so letting go anywhere — even off the tag — hides it.
          e.currentTarget.setPointerCapture?.(e.pointerId);
          show();
        }}
        onPointerUp={hide}
        onPointerCancel={hide}
        onLostPointerCapture={hide}
        // A long press must not open the phone's copy / context menu.
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            if (!e.repeat) show();
          }
        }}
        onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") hide(); }}
        onBlur={hide}
      >
        {children}
      </button>
      {place && typeof document !== "undefined" && createPortal(
        <div
          id={id}
          role="tooltip"
          className="kk-early-pop"
          style={{ left: place.left, width: place.width, top: place.top, bottom: place.bottom }}
        >
          <strong>🐦 Early-bird price</strong>
          <span className="kk-early-pop-prices">
            <s>{original}</s> {price}
          </span>
          {detail && <span className="kk-early-pop-detail">{detail}</span>}
        </div>,
        document.body,
      )}
    </>
  );
}
