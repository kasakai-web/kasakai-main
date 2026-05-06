"use client";

import { useEffect } from "react";
import io from "socket.io-client";

export default function SocketClient() {
  useEffect(() => {
    const serverBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1").replace(/\/api\/v1\/?$/, "");
    const socket = io(serverBase, {
      auth: {
        token: localStorage.getItem("authToken"),
      },
    });

    socket.on("new-notification", (_data: any) => {
      // handled by useNotificationSocket / bell
    });

    socket.on("wallet-update", (data: { balancePaise: number; lockedPaise: number; availablePaise: number }) => {
      window.dispatchEvent(new CustomEvent("kk-wallet-update", { detail: data }));
    });

    return () => { socket.disconnect(); };
  }, []);

  return null;
}