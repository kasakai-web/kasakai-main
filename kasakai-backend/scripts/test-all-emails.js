/**
 * Full email audit — verifies SMTP connection then sends one of every
 * email type used in the app.
 *
 * Usage:
 *   node scripts/test-all-emails.js your@email.com
 *
 * All emails are sent to the same address so you can check your inbox.
 * Run from the backend/ directory.
 */

"use strict";

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const to = process.argv[2];
if (!to) {
  console.log("Skipping email audit: no recipient provided.");
  process.exit(0);
}

// ── Load email utilities ──────────────────────────────────────────────────────
const {
  sendOtpEmail,
  sendGameCreatedEmail,
  sendGameRegistrationEmail,
  sendGameBackoutPlayerEmail,
  sendGameBackoutOrganizerEmail,
  sendGameCancelledOrganizerEmail,
  sendGameCancelledPlayerEmail,
  sendWaitlistJoinedEmail,
  sendWaitlistApprovedEmail,
  sendRemovedFromGameEmail,
} = require("../src/utils/email");

// ── Shared fake data ──────────────────────────────────────────────────────────
const GAME = {
  gameTitle:   "Test Match — Sunday 5v5",
  scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
  format:      "5v5",
  place:       "Green Turf, Koramangala, Bengaluru",
};

const PLAYER_NAME   = "Test Player";
const ORGANISER_NAME = "Test Organiser";

// ── Runner ────────────────────────────────────────────────────────────────────
const results = [];

async function run(label, fn) {
  process.stdout.write(`  Sending: ${label} ... `);
  try {
    await fn();
    console.log("✓ OK");
    results.push({ label, ok: true });
  } catch (err) {
    console.log(`✗ FAILED — ${err.message}`);
    results.push({ label, ok: false, error: err.message });
  }
}

(async () => {
  console.log("\n══════════════════════════════════════════════");
  console.log("  Kasa Kai — Full Email Audit");
  console.log(`  Recipient : ${to}`);
  console.log(`  SMTP Host : ${process.env.SMTP_HOST || "(not set)"}`);
  console.log(`  SMTP User : ${process.env.SMTP_USER || "(not set)"}`);
  console.log("══════════════════════════════════════════════\n");

  // ── 1. OTP emails (auth) ──────────────────────────────────────────────────
  await run("OTP — Player signup", () =>
    sendOtpEmail({ to, otp: "482916", role: "player", purpose: "signup" })
  );

  await run("OTP — Organiser signup", () =>
    sendOtpEmail({ to, otp: "371025", role: "organiser", purpose: "signup" })
  );

  await run("OTP — Forgot password", () =>
    sendOtpEmail({ to, otp: "839047", role: "player", purpose: "forgot-password" })
  );

  // ── 2. Organiser game emails ──────────────────────────────────────────────
  await run("Game created (organiser)", () =>
    sendGameCreatedEmail({
      to,
      organiserName: ORGANISER_NAME,
      ...GAME,
    })
  );

  await run("Game cancelled — organiser copy", () =>
    sendGameCancelledOrganizerEmail({
      to,
      organiserName: ORGANISER_NAME,
      cancelMessage: "Heavy rain forecast — rescheduling soon.",
      ...GAME,
    })
  );

  await run("Player backed out — organiser notification", () =>
    sendGameBackoutOrganizerEmail({
      to,
      organiserName: ORGANISER_NAME,
      playerName: PLAYER_NAME,
      guestCount: 1,
      ...GAME,
    })
  );

  // ── 3. Player game emails ─────────────────────────────────────────────────
  await run("Registration confirmed (player)", () =>
    sendGameRegistrationEmail({
      to,
      playerName: PLAYER_NAME,
      ...GAME,
    })
  );

  await run("Player backed out — player copy", () =>
    sendGameBackoutPlayerEmail({
      to,
      playerName: PLAYER_NAME,
      guestCount: 0,
      ...GAME,
    })
  );

  await run("Game cancelled — player notification", () =>
    sendGameCancelledPlayerEmail({
      to,
      playerName: PLAYER_NAME,
      cancelMessage: "Heavy rain forecast — rescheduling soon.",
      ...GAME,
    })
  );

  await run("Removed from game by organiser", () =>
    sendRemovedFromGameEmail({
      to,
      playerName: PLAYER_NAME,
      ...GAME,
    })
  );

  // ── 4. Waitlist emails ────────────────────────────────────────────────────
  await run("Joined waitlist (player)", () =>
    sendWaitlistJoinedEmail({
      to,
      playerName: PLAYER_NAME,
      ...GAME,
    })
  );

  await run("Waitlist approved (player)", () =>
    sendWaitlistApprovedEmail({
      to,
      playerName: PLAYER_NAME,
      ...GAME,
    })
  );

  // ── Summary ───────────────────────────────────────────────────────────────
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  console.log("\n══════════════════════════════════════════════");
  console.log(`  Results: ${passed}/${results.length} passed`);
  if (failed.length) {
    console.log("\n  Failed:");
    failed.forEach((r) => console.log(`    ✗ ${r.label}: ${r.error}`));
  }
  console.log("══════════════════════════════════════════════\n");

  if (failed.length) {
    console.log("SMTP config check:");
    console.log("  SMTP_HOST  :", process.env.SMTP_HOST   || "❌ not set");
    console.log("  SMTP_PORT  :", process.env.SMTP_PORT   || "❌ not set");
    console.log("  SMTP_USER  :", process.env.SMTP_USER   || "❌ not set");
    console.log("  SMTP_PASS  :", process.env.SMTP_PASS   ? "✓ set" : "❌ not set");
    console.log("  SMTP_FROM  :", process.env.SMTP_FROM   || "(defaults to SMTP_USER)");
    console.log("  SMTP_SECURE:", process.env.SMTP_SECURE || "(defaults to true / port 465)");
    console.log();
  }

  process.exit(failed.length > 0 ? 1 : 0);
})();
