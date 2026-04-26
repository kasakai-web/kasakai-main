"use client";

import { useEffect } from "react";
import io from "socket.io-client";

export default function SocketClient() {
  useEffect(() => {
    const socket = io("http://localhost:5000", {
      auth: {
        token: localStorage.getItem("token"),
      },
    });

    socket.on("connect", () => {
      console.log("✅ Connected:", socket.id);
    });

    socket.on("new-notification", (data: any) => {
      console.log("🔔 Notification:", data);
      alert(`${data.title}\n${data.body}`);
    });

    return () => { socket.disconnect(); };
  }, []);

  return null;
}