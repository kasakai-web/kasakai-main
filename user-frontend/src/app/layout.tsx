import type { Metadata, Viewport } from "next";
import "./globals.css";
import SocketClient from "./SocketClient";

export const metadata: Metadata = {
  title: "Kasa Kai - Football Event Management Platform",
  description: "Join football games in your city. Browse events, manage payments, and play with organized teams.",
  keywords: ["football", "games", "events", "teams", "payments", "sports"],
  openGraph: {
    title: "Kasa Kai - Organized Football. Every Time.",
    description: "Join football games in your city. Browse events, manage payments, and play with organized teams.",
    url: "https://kasakai.in",
    images: [
      {
        url: "/kasa-kai-logo.svg",
        width: 128,
        height: 128,
        alt: "Kasa Kai Logo",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SocketClient /> {/* 👈 this handles socket */}
        {children}
      </body>
    </html>
  );
}