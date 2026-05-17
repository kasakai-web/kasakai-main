import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SocketClient from "./SocketClient";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kasa Kai Organiser Portal - Manage Football Events",
  description: "Powerful tools for organizers to create, manage, and monitor football events. Track signups, manage payments, and distribute teams automatically.",
  keywords: ["football", "organizer", "events", "management", "tournament"],
  openGraph: {
    title: "Kasa Kai Organiser Portal - Run Your Football Community",
    description: "Publish games, track signups, manage payments, and keep every player updated from one clean workspace.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SocketClient />
        {children}
      </body>
    </html>
  );
}
