import type { Metadata, Viewport } from "next";
import "./globals.css";
import SocketClient from "./SocketClient";

export const metadata: Metadata = {
  metadataBase: new URL("https://kasakai.in"),
  title: {
    default: "Kasa Kai — Football Screenings, Games & Community in India",
    template: "%s | Kasa Kai",
  },
  description: "India's football community platform. Watch live match screenings at top venues, join organized 5-a-side games, meet fellow fans, and book your spot — all on Kasa Kai.",
  keywords: ["football", "live screening", "sports bar", "UCL final", "Champions League", "5-a-side", "organized football", "football community", "India", "Mumbai", "Kasa Kai"],
  openGraph: {
    siteName: "Kasa Kai",
    title: "Kasa Kai — Football Screenings, Games & Community in India",
    description: "Watch live match screenings at top venues, join organized football games, and connect with players across India. All on Kasa Kai.",
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
    title: "Kasa Kai — Football Screenings, Games & Community",
    description: "Watch live screenings, join organized football games, and meet fellow fans across India.",
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