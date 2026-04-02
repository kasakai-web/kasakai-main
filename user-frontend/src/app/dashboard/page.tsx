"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardIndex() {
  const router = useRouter();

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    const userId = localStorage.getItem("userId") || "default_id";
    if (role === "organizer" || role === "organiser") {
      router.push(`/dashboard/organizer/${userId}`);
    } else {
      router.push(`/dashboard/player/${userId}`);
    }
  }, [router]);

  return <div style={{ padding: '2rem', color: '#fff' }}>Loading Dashboard...</div>;
}
