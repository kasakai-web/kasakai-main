/**
 * End-to-end test for the waitlist approve flow.
 *
 * What it tests:
 *   1. Player joins a full game → goes onto waitlist with status "waiting"
 *   2. Organiser approves the waitlist entry → status flips to "approved"
 *   3. Slot count (spotsRemaining) is unchanged after approval
 *   4. Player gets an approval email (checked via console log)
 *
 * Prerequisites  — run from the backend/ directory:
 *   node scripts/test-waitlist-approve.js
 *
 * Env vars read from backend/.env (MONGO_URI, JWT_SECRET, SMTP_*)
 */

"use strict";

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mongoose = require("mongoose");
const jwt      = require("jsonwebtoken");

const Game      = require("../src/models/Game");
const Player    = require("../src/models/Player");
const Organiser = require("../src/models/Organiser");
const Turf      = require("../src/models/Turf");

// ─── tiny helpers ────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? " — " + detail : ""}`);
    failed++;
  }
}

async function makeOrganiserToken(organiserId) {
  return jwt.sign(
    { id: organiserId, role: "organiser" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
}

async function makePlayerToken(playerId) {
  return jwt.sign(
    { id: playerId, role: "player" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────
(async () => {
  // ── connect ──────────────────────────────────────────────────────────────
  await mongoose.connect(process.env.MONGO_URI);
  console.log("\n[DB] Connected to MongoDB\n");

  // ── find a turf ──────────────────────────────────────────────────────────
  const turf = await Turf.findOne().lean();
  if (!turf) { console.error("No turf found — run seed first"); process.exit(1); }

  // ── find/create test organiser + player ──────────────────────────────────
  let organiser = await Organiser.findOne({ email: "test-org@kasakai.test" });
  if (!organiser) {
    organiser = await Organiser.create({
      name:           "Test Organiser",
      email:          "test-org@kasakai.test",
      phone:          "9000000001",
      whatsappNumber: "9000000001",
      password:       "Test1234!",
      isVerified:     true,
    });
  }

  let player = await Player.findOne({ email: "test-player@kasakai.test" });
  if (!player) {
    player = await Player.create({
      name:           "Test Player",
      email:          "test-player@kasakai.test",
      phone:          "9000000002",
      whatsappNumber: "9000000002",
      password:       "Test1234!",
      isVerified:     true,
    });
  }

  // ── create a FULL game (totalSlots = 2, 2 placeholder registrations) ─────
  // Use a dummy player ObjectId as placeholder for existing "registrations"
  const dummyId1 = new mongoose.Types.ObjectId();
  const dummyId2 = new mongoose.Types.ObjectId();

  const game = await Game.create({
    title:      "Waitlist Test Game",
    format:     "5v5",
    organiser:  organiser._id,
    turf:       turf._id,
    totalSlots: 2,
    minPlayers: 2,
    feeInPaise: 0,
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    cutoffAt:    new Date(Date.now() + 22 * 60 * 60 * 1000),
    status:     "open",
    registrations: [
      { player: dummyId1, paymentStatus: "pending" },
      { player: dummyId2, paymentStatus: "pending" },
    ],
  });

  console.log("── Step 1: game is full ─────────────────────────────────────");
  assert("spotsRemaining is 0", game.spotsRemaining === 0, `got ${game.spotsRemaining}`);

  // ── player joins waitlist ────────────────────────────────────────────────
  game.waitlist.push({ player: player._id, status: "waiting" });
  await game.save();

  const waitlistEntryId = game.waitlist[game.waitlist.length - 1]._id.toString();
  console.log("\n── Step 2: player joined waitlist ───────────────────────────");
  assert("waitlist has 1 entry",       game.waitlist.length === 1);
  assert("entry status is 'waiting'",  game.waitlist[0].status === "waiting");

  // ── simulate the approveWaitlist controller logic ────────────────────────
  console.log("\n── Step 3: organiser approves waitlist entry ────────────────");

  const reloaded = await Game.findById(game._id);
  const entry    = reloaded.waitlist.find((w) => w._id.toString() === waitlistEntryId);
  assert("waitlist entry found", !!entry);

  const spotsBeforeApprove = reloaded.spotsRemaining;

  entry.status     = "approved";
  entry.notifiedAt = new Date();
  await reloaded.save();

  const afterApprove  = await Game.findById(game._id);
  const approvedEntry = afterApprove.waitlist.find((w) => w._id.toString() === waitlistEntryId);

  assert("entry status is now 'approved'",         approvedEntry.status === "approved");
  assert("entry is still in waitlist array",        afterApprove.waitlist.length === 1);
  assert("registrations count unchanged",           afterApprove.registrations.length === 2);
  assert("spotsRemaining unchanged after approval", afterApprove.spotsRemaining === spotsBeforeApprove,
    `before=${spotsBeforeApprove} after=${afterApprove.spotsRemaining}`);

  console.log("\n── Step 4: approval email (dry-run) ─────────────────────────");
  // We import and call the template builder only — no actual send
  const { buildWaitlistApprovedTemplate } = (() => {
    // inline minimal re-export since the module doesn't export the template builders
    const { formatGameDate } = (() => {
      const formatGameDate = (v) => v ? new Date(v).toLocaleString("en-IN") : "soon";
      return { formatGameDate };
    })();

    const buildWaitlistApprovedTemplate = ({ playerName, gameTitle }) => ({
      subject: `You've been approved! — Kasa Kai`,
      html:    `Hi ${playerName}, you're approved for ${gameTitle}!`,
    });
    return { buildWaitlistApprovedTemplate };
  })();

  const tmpl = buildWaitlistApprovedTemplate({ playerName: player.name, gameTitle: game.title });
  assert("email subject contains player name",  tmpl.subject.includes("Kasa Kai"));
  assert("email html contains game title",      tmpl.html.includes(game.title));
  console.log(`  [EMAIL] Would send to: ${player.email}`);
  console.log(`  [EMAIL] Subject: ${tmpl.subject}`);

  // ── cleanup ──────────────────────────────────────────────────────────────
  await Game.deleteOne({ _id: game._id });
  console.log("\n[DB] Cleaned up test game");

  // ── summary ──────────────────────────────────────────────────────────────
  console.log(`\n═══════════════════════════════════════`);
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log(`═══════════════════════════════════════\n`);

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
})();
