"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import "./FilterDropdown.css";

export type FilterDropdownOption = {
  value: string;
  label: string;
  /** Facet count shown beside the label; omitted when unknown. */
  count?: number;
  disabled?: boolean;
};

type Props = {
  /** Accessible name, e.g. "Game format". */
  label: string;
  /** Trigger text when nothing is selected, e.g. "Any format". */
  placeholder: string;
  options: FilterDropdownOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  /** Checkboxes, stays open while ticking. Otherwise picks one and closes. */
  multiple?: boolean;
  /** Single-select only: the value that means "no filter" (shown first). */
  clearable?: boolean;
};

const POPOVER_GAP = 6;
const VIEWPORT_PAD = 8;

/**
 * A filter dropdown that can hold several values at once — what a native
 * <select> cannot do without turning into a scroll box. The popover is portalled
 * and fixed-positioned so the horizontally scrolling filter row on mobile cannot
 * clip it.
 */
export default function FilterDropdown({
  label,
  placeholder,
  options,
  selected,
  onChange,
  multiple = false,
  clearable = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selectedOptions = options.filter((o) => selected.includes(o.value));
  const triggerText =
    selectedOptions.length === 0
      ? placeholder
      : selectedOptions.length <= 2
        ? selectedOptions.map((o) => o.label).join(", ")
        : `${selectedOptions[0].label} +${selectedOptions.length - 1}`;

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.min(Math.max(r.width, 210), window.innerWidth - VIEWPORT_PAD * 2);
    const left = Math.min(Math.max(r.left, VIEWPORT_PAD), window.innerWidth - width - VIEWPORT_PAD);
    setPos({ top: r.bottom + POPOVER_GAP, left, width });
  }, []);

  const close = useCallback((refocus = false) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !popoverRef.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    // Follow the trigger when the page or the filter row scrolls.
    const onMove = () => place();
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    // Move focus into the list so keyboard users land on the options.
    popoverRef.current?.querySelector<HTMLButtonElement>("[role=option]:not(:disabled)")?.focus();
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, close, place]);

  const pick = (value: string) => {
    if (multiple) {
      onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
    } else {
      onChange([value]);
      close(true);
    }
  };

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(
      popoverRef.current?.querySelectorAll<HTMLButtonElement>("[role=option]:not(:disabled)") ?? [],
    );
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === "ArrowDown" ? Math.min(i + 1, items.length - 1) : Math.max(i - 1, 0);
    items[next]?.focus();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`kk-dd-trigger${selectedOptions.length > 0 && (multiple || clearable) ? " is-active" : ""}`}
        aria-label={`${label}: ${triggerText}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <span className="kk-dd-trigger-text">{triggerText}</span>
        <ChevronDown size={14} aria-hidden="true" className="kk-dd-caret" />
      </button>

      {open && pos && createPortal(
        <div
          ref={popoverRef}
          className="kk-dd-popover"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
          onKeyDown={onListKey}
        >
          <div
            id={listId}
            role="listbox"
            aria-label={label}
            aria-multiselectable={multiple || undefined}
            className="kk-dd-list"
          >
            {(multiple || clearable) && (
              <button
                type="button"
                role="option"
                aria-selected={selected.length === 0}
                className={`kk-dd-option${selected.length === 0 ? " is-on" : ""}`}
                onClick={() => {
                  onChange([]);
                  if (!multiple) close(true);
                }}
              >
                <span className={multiple ? "kk-dd-box" : "kk-dd-tick"} aria-hidden="true">
                  {selected.length === 0 && <Check size={12} strokeWidth={3} />}
                </span>
                <span className="kk-dd-label">{placeholder}</span>
              </button>
            )}
            {options.map((o) => {
              const on = selected.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={on}
                  disabled={o.disabled}
                  className={`kk-dd-option${on ? " is-on" : ""}`}
                  onClick={() => pick(o.value)}
                >
                  <span className={multiple ? "kk-dd-box" : "kk-dd-tick"} aria-hidden="true">
                    {on && <Check size={12} strokeWidth={3} />}
                  </span>
                  <span className="kk-dd-label">{o.label}</span>
                  {typeof o.count === "number" && <span className="kk-dd-count">{o.count}</span>}
                </button>
              );
            })}
          </div>
          {multiple && (
            <div className="kk-dd-footer">
              <button
                type="button"
                className="kk-dd-clear"
                onClick={() => onChange([])}
                disabled={selected.length === 0}
              >
                Clear
              </button>
              <button type="button" className="kk-dd-done" onClick={() => close(true)}>
                Done
              </button>
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
