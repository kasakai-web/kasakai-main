import type { Metadata, Viewport } from "next";
import "./globals.css";
import SocketClient from "./SocketClient";

export const metadata: Metadata = {
  metadataBase: new URL("https://kasakai.in"),
  title: {
    default: "Kasa Kai — Live Football Screenings & Events",
    template: "%s | Kasa Kai",
  },
  description: "Book your spot at premium sports bars and venues across India. Live football screenings, organized games, and electric crowds.",
  keywords: ["football", "live screening", "sports bar", "UCL", "IPL", "events", "India", "Mumbai", "Kasa Kai"],
  openGraph: {
    siteName: "Kasa Kai",
    title: "Kasa Kai — Live Football Screenings & Events",
    description: "Book your spot at premium sports bars and venues across India. Live screens · Great food · Electric crowd.",
    url: "https://kasakai.in",
    type: "website",
    images: [
      {
        url: "/kasa-kai-logo.svg",
        width: 128,
        height: 128,
        alt: "Kasa Kai",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Kasa Kai — Live Football Screenings",
    description: "Book your spot at premium sports bars across India.",
    images: ["/kasa-kai-logo.svg"],
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