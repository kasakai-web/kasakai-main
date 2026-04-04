"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardIndex() {
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      router.replace("/login?role=player");
      return;
    }
    router.push(`/dashboard/player/${userId}`);
  }, [router]);

  return <div style={{ padding: '2rem', color: '#fff' }}>Loading Dashboard...</div>;
}
