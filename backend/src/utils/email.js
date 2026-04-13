const nodemailer = require("nodemailer");

// ─── Build a fresh transporter every call ────────────────────────────────────
// We do NOT cache at module-load time because dotenv may not have run yet when
// this file is first require()-d in some code paths (e.g. test scripts).
const getTransporter = () => {
  const host   = process.env.SMTP_HOST   || "smtpout.secureserver.net";
  const port   = Number(process.env.SMTP_PORT   || 465);
  const secure = String(process.env.SMTP_SECURE || "true").toLowerCase() === "true";
  const user   = process.env.SMTP_USER;
  const pass   = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error("[EMAIL] SMTP_USER and SMTP_PASS must be set in .env");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,           // true = SSL on port 465; false = STARTTLS on 587
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false,   // accept GoDaddy self-signed / chain certs
    },
    connectionTimeout: 10000,     // 10 s
    greetingTimeout:   10000,
    socketTimeout:     15000,
  });
};

const getSender = () =>
  process.env.SMTP_FROM
    ? process.env.SMTP_FROM.trim()
    : process.env.SMTP_USER;

// ─── Shared send helper ───────────────────────────────────────────────────────
const sendMail = async ({ to, subject, html }) => {
  const transporter = getTransporter();
  const from = getSender();

  console.log(`[EMAIL] Sending "${subject}" → ${to}`);

  const info = await transporter.sendMail({ from, to, subject, html });

  console.log(`[EMAIL] Delivered: ${info.messageId} (${info.response})`);
  return info;
};

// ─── Date / Place formatters ──────────────────────────────────────────────────
const formatGameDate = (value) => {
  if (!value) return "soon";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "soon";
  return date.toLocaleString("en-IN", {
    weekday: "short",
    day:     "2-digit",
    month:   "short",
    year:    "numeric",
    hour:    "2-digit",
    minute:  "2-digit",
  });
};

const formatGamePlace = (turf) => {
  if (!turf) return "your selected turf";
  const address = turf.address || {};
  const parts = [turf.name, address.line1, address.area, address.city, address.state]
    .filter(Boolean)
    .map((p) => String(p).trim())
    .filter(Boolean);
  return parts.length ? parts.join(", ") : "your selected turf";
};

// ─── Templates ────────────────────────────────────────────────────────────────
const buildOtpTemplate = ({ otp, role, purpose }) => {
  const title =
    purpose === "forgot-password"
      ? "Password reset OTP"
      : "Verify your Kasa Kai account";
  const roleLabel = role === "organiser" ? "Organiser" : "Player";

  return {
    subject:
      purpose === "forgot-password"
        ? "Kasa Kai Password Reset OTP"
        : "Kasa Kai Account Verification OTP",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
        <h2 style="margin-bottom:12px;">${title}</h2>
        <p style="margin:0 0 12px 0;">Hi ${roleLabel},</p>
        <p style="margin:0 0 16px 0;">Use the OTP below to continue:</p>
        <div style="font-size:32px;letter-spacing:6px;font-weight:700;background:#f5f7fb;border:1px solid #e0e5ef;padding:16px 20px;border-radius:10px;width:fit-content;">
          ${otp}
        </div>
        <p style="margin:16px 0 0 0;">This OTP is valid for 10 minutes.</p>
        <p style="margin:12px 0 0 0;color:#616161;font-size:13px;">If you did not request this, please ignore this email.</p>
      </div>`,
  };
};

const buildGameCreatedTemplate = ({ organiserName, gameTitle, scheduledAt, format, place }) => ({
  subject: "Kasa Kai event created successfully",
  html: `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
      <h2 style="margin-bottom:12px;">Event created successfully</h2>
      <p style="margin:0 0 12px 0;">Hi ${organiserName || "Organiser"},</p>
      <p style="margin:0 0 16px 0;">Your event <strong>${gameTitle || "your event"}</strong> has been created successfully.</p>
      <div style="background:#f5f7fb;border:1px solid #e0e5ef;padding:16px 20px;border-radius:10px;">
        <p style="margin:0 0 8px 0;"><strong>Event name:</strong> ${gameTitle || "—"}</p>
        <p style="margin:0 0 8px 0;"><strong>Place:</strong> ${place || "—"}</p>
        <p style="margin:0 0 8px 0;"><strong>Format:</strong> ${format || "—"}</p>
        <p style="margin:0;"><strong>Date &amp; time:</strong> ${formatGameDate(scheduledAt)}</p>
      </div>
      <p style="margin:16px 0 0 0;color:#616161;font-size:13px;">You can now manage this event from your organiser dashboard.</p>
    </div>`,
});

const buildGameRegistrationTemplate = ({ playerName, gameTitle, scheduledAt, format, place }) => ({
  subject: "You registered successfully for a Kasa Kai game",
  html: `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
      <h2 style="margin-bottom:12px;">Registration successful</h2>
      <p style="margin:0 0 12px 0;">Hi ${playerName || "Player"},</p>
      <p style="margin:0 0 16px 0;">You have successfully registered for <strong>${gameTitle || "the game"}</strong>.</p>
      <div style="background:#f5f7fb;border:1px solid #e0e5ef;padding:16px 20px;border-radius:10px;">
        <p style="margin:0 0 8px 0;"><strong>Event name:</strong> ${gameTitle || "—"}</p>
        <p style="margin:0 0 8px 0;"><strong>Place:</strong> ${place || "—"}</p>
        <p style="margin:0 0 8px 0;"><strong>Format:</strong> ${format || "—"}</p>
        <p style="margin:0;"><strong>Date &amp; time:</strong> ${formatGameDate(scheduledAt)}</p>
      </div>
      <p style="margin:16px 0 0 0;color:#616161;font-size:13px;">Check your dashboard for more game details and updates.</p>
    </div>`,
});

const buildGameBackoutPlayerTemplate = ({ playerName, gameTitle, scheduledAt, format, place, guestCount }) => ({
  subject: "Kasa Kai registration cancelled",
  html: `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
      <h2 style="margin-bottom:12px;color:#c0392b;">Registration cancelled</h2>
      <p style="margin:0 0 12px 0;">Hi ${playerName || "Player"},</p>
      <p style="margin:0 0 16px 0;">Your registration for <strong>${gameTitle || "the game"}</strong> has been cancelled successfully.${guestCount > 0 ? ` Your ${guestCount} guest${guestCount > 1 ? "s were" : " was"} removed too.` : ""}</p>
      <div style="background:#f5f7fb;border:1px solid #e0e5ef;padding:16px 20px;border-radius:10px;">
        <p style="margin:0 0 8px 0;"><strong>Event name:</strong> ${gameTitle || "—"}</p>
        <p style="margin:0 0 8px 0;"><strong>Place:</strong> ${place || "—"}</p>
        <p style="margin:0 0 8px 0;"><strong>Format:</strong> ${format || "—"}</p>
        <p style="margin:0;"><strong>Date &amp; time:</strong> ${formatGameDate(scheduledAt)}</p>
      </div>
      <p style="margin:16px 0 0 0;color:#616161;font-size:13px;">You can register again anytime if spots are available.</p>
    </div>`,
});

const buildGameBackoutOrganizerTemplate = ({ organiserName, playerName, gameTitle, scheduledAt, format, place, guestCount }) => ({
  subject: "A player cancelled registration",
  html: `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
      <h2 style="margin-bottom:12px;">Player cancelled registration</h2>
      <p style="margin:0 0 12px 0;">Hi ${organiserName || "Organiser"},</p>
      <p style="margin:0 0 16px 0;"><strong>${playerName || "A player"}</strong> has cancelled their registration for <strong>${gameTitle || "your game"}</strong>.${guestCount > 0 ? ` ${guestCount} guest${guestCount > 1 ? "s were" : " was"} removed as well.` : ""}</p>
      <div style="background:#f5f7fb;border:1px solid #e0e5ef;padding:16px 20px;border-radius:10px;">
        <p style="margin:0 0 8px 0;"><strong>Event name:</strong> ${gameTitle || "—"}</p>
        <p style="margin:0 0 8px 0;"><strong>Place:</strong> ${place || "—"}</p>
        <p style="margin:0 0 8px 0;"><strong>Format:</strong> ${format || "—"}</p>
        <p style="margin:0;"><strong>Date &amp; time:</strong> ${formatGameDate(scheduledAt)}</p>
      </div>
      <p style="margin:16px 0 0 0;color:#616161;font-size:13px;">Your dashboard and player counts have been updated.</p>
    </div>`,
});

const buildGameActionOtpTemplate = ({ name, role, action, otp, gameTitle, scheduledAt, format, place }) => {
  const roleLabel   = role   === "organiser" ? "Organiser" : "Player";
  const actionLabel = action === "create"    ? "event creation" : "event registration";
  return {
    subject: `Kasa Kai ${actionLabel} OTP`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
        <h2 style="margin-bottom:12px;text-transform:capitalize;">${actionLabel} confirmation OTP</h2>
        <p style="margin:0 0 12px 0;">Hi ${name || roleLabel},</p>
        <p style="margin:0 0 16px 0;">Use this OTP as confirmation for your ${actionLabel}.</p>
        <div style="font-size:32px;letter-spacing:6px;font-weight:700;background:#f5f7fb;border:1px solid #e0e5ef;padding:16px 20px;border-radius:10px;width:fit-content;">
          ${otp}
        </div>
        <div style="background:#f5f7fb;border:1px solid #e0e5ef;padding:16px 20px;border-radius:10px;margin-top:16px;">
          <p style="margin:0 0 8px 0;"><strong>Event name:</strong> ${gameTitle || "—"}</p>
          <p style="margin:0 0 8px 0;"><strong>Place:</strong> ${place || "—"}</p>
          <p style="margin:0 0 8px 0;"><strong>Format:</strong> ${format || "—"}</p>
          <p style="margin:0;"><strong>Date &amp; time:</strong> ${formatGameDate(scheduledAt)}</p>
        </div>
        <p style="margin:16px 0 0 0;color:#616161;font-size:13px;">This OTP is valid for 10 minutes.</p>
      </div>`,
  };
};

const buildGameCancelledOrganizerTemplate = ({ organiserName, gameTitle, scheduledAt, format, place, cancelMessage }) => ({
  subject: "Kasa Kai event cancelled",
  html: `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
      <h2 style="margin-bottom:12px;">Event cancelled</h2>
      <p style="margin:0 0 12px 0;">Hi ${organiserName || "Organiser"},</p>
      <p style="margin:0 0 16px 0;">You have successfully cancelled <strong>${gameTitle || "your event"}</strong>. All registered players have been notified.</p>
      <div style="background:#f5f7fb;border:1px solid #e0e5ef;padding:16px 20px;border-radius:10px;">
        <p style="margin:0 0 8px 0;"><strong>Event name:</strong> ${gameTitle || "—"}</p>
        <p style="margin:0 0 8px 0;"><strong>Place:</strong> ${place || "—"}</p>
        <p style="margin:0 0 8px 0;"><strong>Format:</strong> ${format || "—"}</p>
        <p style="margin:0 0 8px 0;"><strong>Date &amp; time:</strong> ${formatGameDate(scheduledAt)}</p>
        ${cancelMessage ? `<p style="margin:0;"><strong>Your message:</strong> ${cancelMessage}</p>` : ""}
      </div>
      <p style="margin:16px 0 0 0;color:#616161;font-size:13px;">This event is now closed.</p>
    </div>`,
});

const buildWaitlistJoinedTemplate = ({ playerName, gameTitle, scheduledAt, format, place }) => ({
  subject: "You're on the waitlist — Kasa Kai",
  html: `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
      <h2 style="margin-bottom:12px;">You're on the waitlist!</h2>
      <p style="margin:0 0 12px 0;">Hi ${playerName || "Player"},</p>
      <p style="margin:0 0 16px 0;">You've been added to the waitlist for <strong>${gameTitle || "the game"}</strong>. We'll notify you as soon as a spot opens up.</p>
      <div style="background:#f5f7fb;border:1px solid #e0e5ef;padding:16px 20px;border-radius:10px;">
        <p style="margin:0 0 8px 0;"><strong>Event name:</strong> ${gameTitle || "—"}</p>
        <p style="margin:0 0 8px 0;"><strong>Place:</strong> ${place || "—"}</p>
        <p style="margin:0 0 8px 0;"><strong>Format:</strong> ${format || "—"}</p>
        <p style="margin:0;"><strong>Date &amp; time:</strong> ${formatGameDate(scheduledAt)}</p>
      </div>
      <p style="margin:16px 0 0 0;color:#616161;font-size:13px;">No payment is required to hold your place on the waitlist. You will only be charged when a spot becomes available and you confirm it.</p>
    </div>`,
});

const buildRemovedFromGameTemplate = ({ playerName, gameTitle, scheduledAt, format, place }) => ({
  subject: "Your registration was removed — Kasa Kai",
  html: `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
      <h2 style="margin-bottom:12px;color:#c0392b;">Registration Removed</h2>
      <p style="margin:0 0 12px 0;">Hi ${playerName || "Player"},</p>
      <p style="margin:0 0 16px 0;">The organiser has removed your registration for <strong>${gameTitle || "the game"}</strong>. If you think this was a mistake, please contact the organiser directly.</p>
      <div style="background:#f5f7fb;border:1px solid #e0e5ef;padding:16px 20px;border-radius:10px;">
        <p style="margin:0 0 8px 0;"><strong>Event name:</strong> ${gameTitle || "—"}</p>
        <p style="margin:0 0 8px 0;"><strong>Place:</strong> ${place || "—"}</p>
        <p style="margin:0 0 8px 0;"><strong>Format:</strong> ${format || "—"}</p>
        <p style="margin:0;"><strong>Date &amp; time:</strong> ${formatGameDate(scheduledAt)}</p>
      </div>
      <p style="margin:16px 0 0 0;color:#616161;font-size:13px;">If a fee was charged, a refund will be processed to your wallet.</p>
    </div>`,
});

const buildWaitlistSpotAvailableTemplate = ({ playerName, gameTitle, scheduledAt, format, place, gameLink }) => ({
  subject: "⚽ A spot just opened up! — Kasa Kai",
  html: `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
      <h2 style="margin-bottom:12px;color:#2d7a2d;">⚽ A spot just opened up!</h2>
      <p style="margin:0 0 12px 0;">Hi ${playerName || "Player"},</p>
      <p style="margin:0 0 16px 0;">Great news — a player just dropped out of <strong>${gameTitle || "the game"}</strong> and a spot is now free. You were on the waitlist, so you get first dibs!</p>
      <p style="margin:0 0 16px 0;color:#b45309;font-weight:600;">⏱ Be quick — the first person to sign up gets the spot.</p>
      <div style="background:#f5f7fb;border:1px solid #e0e5ef;padding:16px 20px;border-radius:10px;margin-bottom:24px;">
        <p style="margin:0 0 8px 0;"><strong>Event name:</strong> ${gameTitle || "—"}</p>
        <p style="margin:0 0 8px 0;"><strong>Place:</strong> ${place || "—"}</p>
        <p style="margin:0 0 8px 0;"><strong>Format:</strong> ${format || "—"}</p>
        <p style="margin:0;"><strong>Date &amp; time:</strong> ${formatGameDate(scheduledAt)}</p>
      </div>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${gameLink}" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px;letter-spacing:0.02em;">
          ⚽ Claim My Spot
        </a>
      </div>
      <p style="margin:0;color:#616161;font-size:13px;">If the spot is taken before you click, you'll remain on the waitlist and we'll notify you again if another opens up. No payment is charged until you complete sign-up.</p>
    </div>`,
});

const buildWaitlistApprovedTemplate = ({ playerName, gameTitle, scheduledAt, format, place }) => ({
  subject: "You've been approved! — Kasa Kai",
  html: `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
      <h2 style="margin-bottom:12px;color:#16a34a;">You're in! 🎉</h2>
      <p style="margin:0 0 12px 0;">Hi ${playerName || "Player"},</p>
      <p style="margin:0 0 16px 0;">Great news — the organiser has approved your waitlist spot for <strong>${gameTitle || "the game"}</strong>. Your place is confirmed!</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:16px 20px;border-radius:10px;">
        <p style="margin:0 0 8px 0;"><strong>Event name:</strong> ${gameTitle || "—"}</p>
        <p style="margin:0 0 8px 0;"><strong>Place:</strong> ${place || "—"}</p>
        <p style="margin:0 0 8px 0;"><strong>Format:</strong> ${format || "—"}</p>
        <p style="margin:0;"><strong>Date &amp; time:</strong> ${formatGameDate(scheduledAt)}</p>
      </div>
      <p style="margin:16px 0 0 0;color:#616161;font-size:13px;">Check your dashboard for full game details. See you on the pitch!</p>
    </div>`,
});

const buildGameCancelledPlayerTemplate = ({ playerName, gameTitle, scheduledAt, format, place, cancelMessage }) => ({
  subject: "Kasa Kai event cancelled",
  html: `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
      <h2 style="margin-bottom:12px;color:#c0392b;">Event cancelled</h2>
      <p style="margin:0 0 12px 0;">Hi ${playerName || "Player"},</p>
      <p style="margin:0 0 16px 0;">Unfortunately, <strong>${gameTitle || "the event"}</strong> that you registered for has been cancelled by the organiser.</p>
      <div style="background:#f5f7fb;border:1px solid #e0e5ef;padding:16px 20px;border-radius:10px;">
        <p style="margin:0 0 8px 0;"><strong>Event name:</strong> ${gameTitle || "—"}</p>
        <p style="margin:0 0 8px 0;"><strong>Place:</strong> ${place || "—"}</p>
        <p style="margin:0 0 8px 0;"><strong>Format:</strong> ${format || "—"}</p>
        <p style="margin:0 0 8px 0;"><strong>Date &amp; time:</strong> ${formatGameDate(scheduledAt)}</p>
        ${cancelMessage ? `<p style="margin:0;"><strong>Reason:</strong> ${cancelMessage}</p>` : ""}
      </div>
      <p style="margin:16px 0 0 0;color:#616161;font-size:13px;">If you paid an entry fee, a refund will be processed to your wallet.</p>
    </div>`,
});

// ─── Public send functions ────────────────────────────────────────────────────
const sendOtpEmail = ({ to, otp, role = "player", purpose = "signup" }) => {
  const t = buildOtpTemplate({ otp, role, purpose });
  return sendMail({ to, subject: t.subject, html: t.html });
};

const sendGameCreatedEmail = ({ to, organiserName, gameTitle, scheduledAt, format, place }) => {
  const t = buildGameCreatedTemplate({ organiserName, gameTitle, scheduledAt, format, place });
  return sendMail({ to, subject: t.subject, html: t.html });
};

const sendGameRegistrationEmail = ({ to, playerName, gameTitle, scheduledAt, format, place }) => {
  const t = buildGameRegistrationTemplate({ playerName, gameTitle, scheduledAt, format, place });
  return sendMail({ to, subject: t.subject, html: t.html });
};

const sendGameBackoutPlayerEmail = ({ to, playerName, gameTitle, scheduledAt, format, place, guestCount = 0 }) => {
  const t = buildGameBackoutPlayerTemplate({ playerName, gameTitle, scheduledAt, format, place, guestCount });
  return sendMail({ to, subject: t.subject, html: t.html });
};

const sendGameBackoutOrganizerEmail = ({ to, organiserName, playerName, gameTitle, scheduledAt, format, place, guestCount = 0 }) => {
  const t = buildGameBackoutOrganizerTemplate({ organiserName, playerName, gameTitle, scheduledAt, format, place, guestCount });
  return sendMail({ to, subject: t.subject, html: t.html });
};

const sendGameActionOtpEmail = ({ to, name, role = "player", action = "register", otp, gameTitle, scheduledAt, format, place }) => {
  const t = buildGameActionOtpTemplate({ name, role, action, otp, gameTitle, scheduledAt, format, place });
  return sendMail({ to, subject: t.subject, html: t.html });
};

const sendGameCancelledOrganizerEmail = ({ to, organiserName, gameTitle, scheduledAt, format, place, cancelMessage }) => {
  const t = buildGameCancelledOrganizerTemplate({ organiserName, gameTitle, scheduledAt, format, place, cancelMessage });
  return sendMail({ to, subject: t.subject, html: t.html });
};

const sendGameCancelledPlayerEmail = ({ to, playerName, gameTitle, scheduledAt, format, place, cancelMessage }) => {
  const t = buildGameCancelledPlayerTemplate({ playerName, gameTitle, scheduledAt, format, place, cancelMessage });
  return sendMail({ to, subject: t.subject, html: t.html });
};

const sendWaitlistSpotAvailableEmail = ({ to, playerName, gameTitle, scheduledAt, format, place, gameLink }) => {
  const t = buildWaitlistSpotAvailableTemplate({ playerName, gameTitle, scheduledAt, format, place, gameLink });
  return sendMail({ to, subject: t.subject, html: t.html });
};

const sendWaitlistJoinedEmail = ({ to, playerName, gameTitle, scheduledAt, format, place }) => {
  const t = buildWaitlistJoinedTemplate({ playerName, gameTitle, scheduledAt, format, place });
  return sendMail({ to, subject: t.subject, html: t.html });
};

const sendRemovedFromGameEmail = ({ to, playerName, gameTitle, scheduledAt, format, place }) => {
  const t = buildRemovedFromGameTemplate({ playerName, gameTitle, scheduledAt, format, place });
  return sendMail({ to, subject: t.subject, html: t.html });
};

const sendWaitlistApprovedEmail = ({ to, playerName, gameTitle, scheduledAt, format, place }) => {
  const t = buildWaitlistApprovedTemplate({ playerName, gameTitle, scheduledAt, format, place });
  return sendMail({ to, subject: t.subject, html: t.html });
};

module.exports = {
  sendOtpEmail,
  sendGameCreatedEmail,
  sendGameRegistrationEmail,
  sendGameBackoutPlayerEmail,
  sendGameBackoutOrganizerEmail,
  sendGameActionOtpEmail,
  sendGameCancelledOrganizerEmail,
  sendGameCancelledPlayerEmail,
  sendWaitlistJoinedEmail,
  sendWaitlistSpotAvailableEmail,
  sendWaitlistApprovedEmail,
  sendRemovedFromGameEmail,
  formatGamePlace,
};
