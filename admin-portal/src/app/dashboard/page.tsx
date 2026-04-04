import type { Metadata } from "next";
import { DashboardShell } from "@/components/admin/dashboard-shell";

export const metadata: Metadata = {
  title: "Admin Dashboard | Kasa Kai",
  description: "Kasa Kai admin analytics and operations console",
};

export default function DashboardPage() {
  return <DashboardShell />;
}