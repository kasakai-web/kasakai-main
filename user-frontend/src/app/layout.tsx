import type { Metadata, Viewport } from "next";
import "./globals.css";
import SocketClient from "./SocketClient";

export const metadata: Metadata = {
  title: "Kasakai",
  description: "List games · manage payments · auto-distribute teams · show up",
  keywords: ["football", "games", "teams", "payments"],
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