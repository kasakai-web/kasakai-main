import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kasa Kai Admin Dashboard - Platform Management",
  description: "Admin control center for Kasa Kai platform. Monitor events, manage approvals, track payouts, and oversee system operations.",
  keywords: ["admin", "dashboard", "platform", "management", "monitoring"],
  openGraph: {
    title: "Kasa Kai Admin - Control Center",
    description: "Monitor approvals, events, payouts, and system health from one command center.",
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
      className={`${manrope.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
