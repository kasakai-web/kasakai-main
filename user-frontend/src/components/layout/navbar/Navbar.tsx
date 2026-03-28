"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { NAV_ITEMS } from "@/config/navigation";
import { LoginMenu } from "./LoginMenu";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/80 backdrop-blur-lg">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 sm:px-10 lg:px-16">
        <Link href="/" className="group inline-flex items-center gap-3">
          <Image
            src="/kasa-kai-logo.svg"
            alt="Kasa Kai logo"
            width={54}
            height={54}
            className="rounded-sm border border-black/10"
            priority
          />
          <div className="hidden sm:block">
            <p className="font-[var(--font-space-grotesk)] text-lg font-semibold leading-none tracking-[0.08em]">
              Kasa Kai
            </p>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">User Frontend</p>
          </div>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-zinc-700 transition hover:text-black"
            >
              {item.label}
            </Link>
          ))}
          <LoginMenu />
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 md:hidden"
          onClick={() => setMobileOpen((state) => !state)}
          aria-label="Open mobile navigation"
        >
          <span className="text-xl leading-none">{mobileOpen ? "x" : "="}</span>
        </button>
      </nav>

      {mobileOpen ? (
        <div className="border-t border-black/5 bg-white px-6 py-4 md:hidden sm:px-10">
          <div className="flex flex-col gap-3">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-black"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-2">
              <LoginMenu mobile />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
