import type { Metadata } from "next";
import { Sora, Space_Grotesk } from "next/font/google";
import { Navbar } from "@/components/layout/navbar/Navbar";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kasa Kai User Portal",
  description: "Kasa Kai user-facing portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--surface)] text-[var(--ink)]">
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
