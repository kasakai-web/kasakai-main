"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LOGIN_OPTIONS } from "@/config/navigation";

type LoginMenuProps = {
  mobile?: boolean;
};

export function LoginMenu({ mobile = false }: LoginMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((state) => !state)}
        className={`rounded-full border border-black/15 bg-black px-5 py-2.5 text-sm font-semibold tracking-wide text-white transition hover:bg-black/90 ${
          mobile ? "w-full" : ""
        }`}
      >
        Login
      </button>

      {isOpen ? (
        <div
          className={`absolute z-30 mt-2 min-w-56 rounded-2xl border border-black/10 bg-white p-2 shadow-xl ${
            mobile ? "left-0 right-0" : "right-0"
          }`}
        >
          {LOGIN_OPTIONS.map((option) => (
            <Link
              key={option.href}
              href={option.href}
              className="block rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
              onClick={() => setIsOpen(false)}
            >
              {option.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
