"use client";

import Image from "next/image";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { iosBrowserName } from "@/utils/pwa";
import "./pwa.css";

/**
 * The body of /install — the page the banner sends anyone it cannot install for.
 *
 * It exists because a one-tap install is a Chromium privilege. iOS installs only
 * from the share sheet, and a large share of KasaKai's traffic arrives inside a
 * WhatsApp webview that cannot install at all. Those visitors need words, and
 * words need somewhere to live that is not a banner.
 *
 * Every platform's steps are always on the page, not just the current one:
 * people read this on a laptop and install on a phone.
 */
export default function InstallGuide() {
  const { ready, installed, canPrompt, platform, inAppBrowser, promptInstall } = usePwaInstall();

  // `ready` gates only the parts that depend on the device. The prose renders
  // server-side either way so the page is never a blank frame, and is indexable.
  const iosBrowser = ready ? iosBrowserName() : "safari";

  return (
    <div className="kk-guide">
      <p className="kk-guide-eyebrow">Home screen</p>
      <h1>
        Install <em>KasaKai</em>
      </h1>
      <p className="kk-guide-lede">
        KasaKai can sit on your home screen like any other app — its own icon, its own
        window, no browser bars. There is nothing to download and no app store involved:
        the icon opens this same site, already signed in, and it updates itself every time
        we ship. It takes up practically no space on your phone.
      </p>

      {ready && installed && (
        <div className="kk-guide-note kk-guide-note-done">
          <strong>You’re all set.</strong> KasaKai is already installed on this device —
          look for the icon on your home screen. Nothing else to do here.
        </div>
      )}

      {ready && !installed && inAppBrowser && (
        <div className="kk-guide-note">
          <strong>You’re inside another app’s browser.</strong> WhatsApp, Instagram and
          Facebook open links in a stripped-down browser that can’t install anything. Tap
          the <strong>⋯</strong> or <strong>⋮</strong> menu in the corner and choose{" "}
          <strong>Open in browser</strong> (or <strong>Open in Chrome</strong>), then come
          back to this page.
        </div>
      )}

      {ready && !installed && !inAppBrowser && canPrompt && (
        <div className="kk-guide-cta">
          <div className="kk-install-icon">
            <Image src="/pwa/icon-192.png" alt="" width={56} height={56} unoptimized />
          </div>
          <div className="kk-guide-cta-copy">
            <strong>One tap and it’s done</strong>
            <span>Your browser can install it for you — no steps to follow.</span>
          </div>
          <button type="button" className="kk-install-cta" onClick={() => void promptInstall()}>
            Install KasaKai
          </button>
        </div>
      )}

      <PlatformBlock
        title="Android"
        mine={ready && platform === "android"}
        steps={[
          <>
            Open <strong>kasakai.in</strong> in <strong>Chrome</strong>.
          </>,
          <>
            Tap the <strong>⋮</strong> menu at the top right.
          </>,
          <>
            Choose <strong>Add to Home screen</strong> — or <strong>Install app</strong>,
            depending on your Chrome version.
          </>,
          <>
            Confirm the name (<strong>KasaKai</strong>) and tap <strong>Install</strong>.
          </>,
        ]}
      />

      <PlatformBlock
        title="iPhone & iPad"
        mine={ready && platform === "ios"}
        steps={[
          <>
            Open <strong>kasakai.in</strong> in{" "}
            <strong>{iosBrowser === "safari" ? "Safari" : "Safari, Chrome or Edge"}</strong>.
            Firefox on iPhone can’t do this one.
          </>,
          <>
            Tap the <strong>Share</strong> button — the square with an arrow pointing up,
            at the bottom of the screen on an iPhone, at the top on an iPad.
          </>,
          <>
            Scroll the list and tap <strong>Add to Home Screen</strong>.
          </>,
          <>
            Tap <strong>Add</strong> at the top right. The KasaKai icon appears on your
            home screen.
          </>,
        ]}
      />

      <PlatformBlock
        title="Laptop & desktop"
        mine={ready && platform === "desktop"}
        steps={[
          <>
            Open <strong>kasakai.in</strong> in <strong>Chrome</strong> or{" "}
            <strong>Edge</strong>.
          </>,
          <>
            Look for the install icon in the address bar — a small screen with a
            downward arrow, at the right-hand end.
          </>,
          <>
            Click it and choose <strong>Install</strong>. If you can’t see it, open the
            browser menu and look for <strong>Install KasaKai</strong> or{" "}
            <strong>Apps → Install this site as an app</strong>.
          </>,
          <>
            KasaKai opens in its own window and lands in your dock, taskbar or Start menu.
          </>,
        ]}
      />

      <div className="kk-guide-faq">
        <h2>Questions</h2>
        <dl>
          <dt>Is this a real app from the Play Store or App Store?</dt>
          <dd>
            No — and that’s the point. It’s the KasaKai website, saved to your home screen
            with its own icon. There’s no store listing, no download, and nothing to keep
            updated.
          </dd>

          <dt>How much space does it use?</dt>
          <dd>
            Next to none. You’re saving a shortcut and an icon, not a few hundred
            megabytes of app.
          </dd>

          <dt>Will I have to log in again?</dt>
          <dd>
            No. If you’re signed in here, you’ll be signed in when you open the icon.
          </dd>

          <dt>Does it update?</dt>
          <dd>
            Automatically. It’s the live site, so you always have the current version the
            moment we release it.
          </dd>

          <dt>How do I remove it?</dt>
          <dd>
            Exactly like any app — press and hold the icon and choose Remove or Uninstall.
            Your account and your bookings are untouched; the website carries on working
            as before.
          </dd>
        </dl>
      </div>
    </div>
  );
}

function PlatformBlock({
  title,
  mine,
  steps,
}: {
  title: string;
  mine: boolean;
  steps: React.ReactNode[];
}) {
  return (
    // `open` on the visitor's own platform so the steps that apply to them are
    // the ones already on screen; the rest collapse rather than disappear.
    <details className={`kk-guide-block${mine ? " kk-guide-mine" : ""}`} open={mine}>
      <summary>
        {title}
        {mine && <span className="kk-guide-tag">Your device</span>}
      </summary>
      <ol>
        {steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </details>
  );
}
