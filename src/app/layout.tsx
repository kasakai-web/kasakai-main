import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import SocketClient from "./SocketClient";
import InstallAppPrompt from "@/components/pwa/InstallAppPrompt";
import PhoneVerifySheet from "@/components/auth/PhoneVerifySheet";
import { INSTALL_PROMPT_SNIPPET } from "@/utils/pwa";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";

export const metadata: Metadata = {
  // www, the same as sitemap.ts, robots.ts and Search Console; Vercel 308s the
  // bare domain there. Relative canonicals and OG URLs resolve against this.
  metadataBase: new URL("https://www.kasakai.in"),
  applicationName: "KasaKai",
  // Google Search Console ownership of https://www.kasakai.in/ — the Google
  // sign-in consent screen's branding check reads it. Removing it un-verifies.
  verification: { google: "b8jV_eyQu6ot7yHF4YwtHvQUHT0V9kGrDaNRjL0MPs0" },
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
    default: "Kasa Kai — Join Football Games Near You",
    template: "%s | Kasa Kai",
  },
  description: "No team? No problem. Pick a game, book your spot and play football at turfs across India. Your next game is one tap away — come solo, leave with a squad",
  keywords: ["football", "football games near me", "5-a-side", "turf football", "organized football", "football community", "India", "Mumbai", "Kasa Kai", "KasaKai"],
  openGraph: {
    siteName: "Kasa Kai",
    title: "Kasa Kai — Join Football Games Near You",
    description: "No team? No problem. Pick a game, book your spot and play football at turfs across India. Your next game is one tap away — come solo, leave with a squad",

    // No `url` here: every page inherits this object, so a fixed url told
    // previews that /about, /passes and the rest were all the home page.
    // The image is app/opengraph-image.tsx (an SVG here showed nothing).
    type: "website",
  },
  twitter: {
    // X falls back to og:image when twitter:image is absent.
    card: "summary_large_image",
    title: "Kasa Kai — Join Football Games Near You",
  description: "No team? No problem. Pick a game, book your spot and play football at turfs across India. Your next game is one tap away — come solo, leave with a squad",
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
        <PhoneVerifySheet />
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
