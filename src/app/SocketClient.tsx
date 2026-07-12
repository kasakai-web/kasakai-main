"use client";

import { useEffect, useRef } from "react";
import io, { Socket } from "socket.io-client";

const SERVER_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1"
).replace(/\/api\/v1\/?$/, "");

export default function SocketClient() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const teardown = () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };

    const setup = () => {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      // Already have a live authenticated socket — nothing to do
      if (socketRef.current?.connected) return;

      // Close any stale / unauthenticated socket first
      teardown();

      const socket = io(SERVER_BASE, {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnectionAttempts: 15,
        reconnectionDelay: 1000,
      });

      // Wallet balance changed → broadcast as DOM event so any page can react
      socket.on(
        "wallet-update",
        (data: { balancePaise: number; lockedPaise: number; availablePaise: number }) => {
          window.dispatchEvent(new CustomEvent("kk-wallet-update", { detail: data }));
        },
      );

      // New notification → broadcast as DOM event so layouts can bump the badge
      socket.on("new-notification", (data: unknown) => {
        window.dispatchEvent(new CustomEvent("kk-new-notification", { detail: data }));
      });

      // Game count changed (register/opt-out/guest add/remove/organiser toggle) →
      // broadcast so any open dashboard can patch its state immediately.
      socket.on(
        "game-update",
        (data: { gameId: string; spotsRemaining: number; totalSlots: number }) => {
          window.dispatchEvent(new CustomEvent("kk-game-update", { detail: data }));
        },
      );

      socketRef.current = socket;
    };

    // Connect immediately if the user is already logged in
    setup();

    // Cross-tab: `storage` fires when another tab writes to localStorage
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "authToken") return;
      if (e.newValue) setup();
      else teardown();
    };

    // Same-tab: login / logout flows dispatch this event after updating localStorage
    const onAuthChanged = () => {
      const token = localStorage.getItem("authToken");
      if (token) setup();
      else teardown();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("kk-auth-changed", onAuthChanged);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("kk-auth-changed", onAuthChanged);
      teardown();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
