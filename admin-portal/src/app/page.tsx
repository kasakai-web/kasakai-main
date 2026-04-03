"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const SESSION_KEY = "adminPortalSession";

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const rawSession = window.localStorage.getItem(SESSION_KEY);

    if (rawSession) {
      router.replace("/dashboard");
      return;
    }

    setReady(true);
  }, [router]);

  const storeSession = () => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ username: username.trim() }));
    router.replace("/dashboard");
  };

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (!username.trim() || !password.trim()) {
      setMessage("Enter admin username and password.");
      return;
    }

    storeSession();
  };

  if (!ready) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(201,255,66,0.16),transparent_34%),linear-gradient(180deg,#111111_0%,#090909_100%)] px-6 py-10 text-white sm:px-8 lg:px-12">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-white/10 bg-white/5 shadow-2xl shadow-black/40 backdrop-blur-xl lg:grid-cols-[1.1fr_0.9fr]">
          <section className="flex flex-col justify-between gap-8 border-b border-white/10 p-8 sm:p-10 lg:border-b-0 lg:border-r">
            <div>
              <p className="mb-4 inline-flex rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-lime-300">
                Admin Portal
              </p>
              <h1 className="max-w-lg text-4xl font-black tracking-tight text-white sm:text-5xl">
                Sign in to the admin dashboard.
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-300 sm:text-base">
                This is a frontend-only login screen for now. After submit, it routes straight to the dashboard.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Simple login", "One admin account"],
                ["Fast access", "Direct dashboard entry"],
                ["Frontend only", "Backend can come later"],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-semibold text-lime-300">{title}</div>
                  <div className="mt-1 text-sm text-zinc-300">{copy}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="p-8 sm:p-10">
            <div className="rounded-[28px] border border-white/10 bg-[#101010]/90 p-6 shadow-xl shadow-black/25">
              <form className="space-y-4" onSubmit={handleLogin}>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">Admin Username</label>
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    type="text"
                    placeholder="admin"
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none ring-0 transition placeholder:text-zinc-500 focus:border-lime-300"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">Password</label>
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    placeholder="Enter your password"
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none ring-0 transition placeholder:text-zinc-500 focus:border-lime-300"
                  />
                </div>
                {message ? (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    {message}
                  </div>
                ) : null}
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-lime-300 px-4 py-3 text-sm font-extrabold uppercase tracking-[0.2em] text-black transition hover:bg-lime-200"
                >
                  Login to Portal
                </button>
              </form>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
                This login is frontend-only for now. Once backend admin auth is ready, you can connect this form to it later.
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
