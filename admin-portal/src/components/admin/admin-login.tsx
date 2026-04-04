"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getAdminSession, saveAdminSession } from "@/lib/admin-session";
import styles from "./admin-login.module.css";

export function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (getAdminSession()) {
      router.replace("/dashboard");
      return;
    }

    setReady(true);
  }, [router]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Enter your admin username and password.");
      return;
    }

    saveAdminSession(username);
    router.replace("/dashboard");
  };

  if (!ready) {
    return null;
  }

  return (
    <main className={styles.page}>
      <div className={styles.backdrop} />
      <div className={styles.layout}>
        <section className={styles.brand}>
          <div className={styles.loginLogo}>
            <div className={styles.logoBlock}>
              <div className={styles.logoTop}>
                <span>KASA</span>
              </div>
              <div className={styles.logoBottom}>
                <span>KAI</span>
              </div>
            </div>
            <div className={styles.logoWordmark}>
              <p className={styles.logoWordTop}>KASA</p>
              <p className={styles.logoWordBottom}>KAI</p>
            </div>
          </div>
          <p className={styles.pill}>Kasa Kai Admin</p>
          <h1>Control the platform from one command center.</h1>
          <p>
            Monitor approvals, events, payouts, and system health from a single operational dashboard designed
            for high-volume moderation.
          </p>
          <div className={styles.metrics}>
            <article>
              <strong>3.4k+</strong>
              <span>Daily active admins and moderators</span>
            </article>
            <article>
              <strong>146</strong>
              <span>Live events currently monitored</span>
            </article>
            <article>
              <strong>99.95%</strong>
              <span>Core service uptime this quarter</span>
            </article>
          </div>
        </section>

        <section className={styles.cardWrap}>
          <div className={styles.card}>
            <h2>Sign in</h2>
            <p>Use your admin credentials to open the dashboard.</p>
            <form onSubmit={handleSubmit}>
              <label htmlFor="admin-username">Admin username</label>
              <input
                id="admin-username"
                type="text"
                placeholder="admin"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />

              <label htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />

              {error ? <div className={styles.error}>{error}</div> : null}

              <button type="submit">Login to dashboard</button>
            </form>
            <small>Frontend-only auth for now. Wire to backend auth when API is available.</small>
          </div>
        </section>
      </div>
    </main>
  );
}
