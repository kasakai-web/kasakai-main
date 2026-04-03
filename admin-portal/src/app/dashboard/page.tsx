"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const SESSION_KEY = "adminPortalSession";

type Session = {
  username: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const rawSession = window.localStorage.getItem(SESSION_KEY);
    if (!rawSession) {
      router.replace("/");
      return;
    }

    setSession(JSON.parse(rawSession) as Session);
  }, [router]);

  const handleLogout = () => {
    window.localStorage.removeItem(SESSION_KEY);
    router.replace("/");
  };

  if (!session) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(201,255,66,0.14),transparent_30%),linear-gradient(180deg,#0f0f0f_0%,#050505_100%)] px-6 py-8 text-white sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-lime-300">Admin Portal</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Dashboard</h1>
            <p className="mt-2 text-sm text-zinc-300">Signed in as {session.username}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 text-sm font-semibold text-white transition hover:border-lime-300 hover:text-lime-300"
          >
            Logout
          </button>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            ["Users", "Manage player and organiser accounts"],
            ["Approvals", "Review new registrations and access"],
            ["Reports", "Track portal activity at a glance"],
          ].map(([title, copy]) => (
            <article key={title} className="rounded-[24px] border border-white/10 bg-[#101010]/90 p-6 shadow-xl shadow-black/20">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-lime-300">{title}</div>
              <p className="mt-3 text-sm leading-7 text-zinc-300">{copy}</p>
            </article>
          ))}
        </section>

        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <h2 className="text-xl font-bold">Portal status</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-300">
            This is the dedicated admin area. You can extend it later with user management, approvals, analytics, and system settings.
          </p>
        </section>
      </div>
    </main>
  );
}