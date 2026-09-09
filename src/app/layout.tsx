import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import SocketClient from "./SocketClient";
import InstallAppPrompt from "@/components/pwa/InstallAppPrompt";
import { INSTALL_PROMPT_SNIPPET } from "@/utils/pwa";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";

export const metadata: Metadata = {
  metadataBase: new URL("https://kasakai.in"),
  applicationName: "KasaKai",
  // What an installed icon is called and how iOS launches it. `capable` is the
  // legacy apple-mobile-web-app-capable tag, and it is still the only thing
  // that makes "Add to Home Screen" on iPhone open chrome-less rather than
  // dropping the visitor back into a Safari tab — the manifest is ignored there.
  appleWebApp: {
    capable: true,
    title: "KasaKai",
    statusBarStyle: "black",
  },
  other: {
    // `appleWebApp.capable` above emits the standardised
    // `mobile-web-app-capable`. iPhones that cannot go past iOS 15 — a 6s or a
    // 7, still in plenty of hands here — only ever learned the apple-prefixed
    // spelling, and without it their home screen icon opens a Safari tab with
    // the address bar still on it, which is the one thing installing was meant
    // to remove. Deprecated, and deliberately kept. Newer iOS reads the
    // manifest's `display` instead and ignores both.
    "apple-mobile-web-app-capable": "yes",
  },
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
  // Paints the Android status bar and the desktop title bar to match the app's
  // own background, so an installed KasaKai has no seam at the top.
  themeColor: "#090909",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body  cz-shortcut-listen="false">
        {/*
          Must run before hydration: `beforeinstallprompt` fires once, early,
          and is lost unless something calls preventDefault() on it. A listener
          added by a React effect loses that race on a slow phone, which looks
          exactly like "the install button sometimes doesn't appear". See
          utils/pwa.ts.
        */}
        <Script id="kk-install-prompt" strategy="beforeInteractive">
          {INSTALL_PROMPT_SNIPPET}
        </Script>
        <SocketClient /> {/* 👈 this handles socket */}
        <InstallAppPrompt />
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `}
            </Script>
          </>
        )}
        {children}
      </body>
    </html>
  );
}
