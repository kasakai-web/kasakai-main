import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import SocketClient from "./SocketClient";
import InstallAppPrompt from "@/components/pwa/InstallAppPrompt";
import PhoneVerifySheet from "@/components/auth/PhoneVerifySheet";
import TestAccountSwitcher from "@/components/test/TestAccountSwitcher";
import { INSTALL_PROMPT_SNIPPET } from "@/utils/pwa";

// Analytics only ever run from a production build. `next dev` sets NODE_ENV to
// "development" (and `next build` / `next start` to "production"), inlined at
// compile time — so a dev server never loads either script, even with the IDs
// sitting in .env. Without this, every local page view and test click landed in
// the real GA reports and Clarity recordings.
const ANALYTICS_ON = process.env.NODE_ENV === "production";

const GA_ID = ANALYTICS_ON ? process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "" : "";
// Microsoft Clarity (heatmaps + session recordings). Also off when the variable
// is unset, so any env without it stays out of the recordings.
const CLARITY_ID = ANALYTICS_ON ? process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || "" : "";

export const metadata: Metadata = {
  metadataBase: new URL("https://kasakai.in"),
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
        <PhoneVerifySheet />
        <TestAccountSwitcher />
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
        {CLARITY_ID && (
          <Script id="microsoft-clarity" strategy="afterInteractive">
            {`
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", ${JSON.stringify(CLARITY_ID)});
            `}
          </Script>
        )}
        {children}
      </body>
    </html>
  );
}
