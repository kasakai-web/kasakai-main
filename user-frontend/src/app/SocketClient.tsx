"use client";

import { useEffect } from "react";
import io from "socket.io-client";

export default function SocketClient() {
  useEffect(() => {
    const serverBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1").replace(/\/api\/v1\/?$/, "");
    const socket = io(serverBase, {
      auth: {
        token: localStorage.getItem("token"),
      },
    });

    socket.on("connect", () => {
      console.log("✅ Connected:", socket.id);
    });

    socket.on("new-notification", (data: any) => {
      console.log("[SOCKET] new-notification:", data);
    });

    return () => { socket.disconnect(); };
  }, []);

  return null;
}