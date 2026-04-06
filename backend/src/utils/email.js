const nodemailer = require("nodemailer");

const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpSecure =
  String(process.env.SMTP_SECURE || "true").toLowerCase() === "true";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtpout.secureserver.net",
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const assertEmailConfig = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP credentials are missing. Set SMTP_USER and SMTP_PASS.");
  }
};

const buildOtpTemplate = ({ otp, role, purpose }) => {
  const title =
    purpose === "forgot-password"
      ? "Password reset OTP"
      : "Verify your Kasa Kai account";

  const roleLabel = role === "organiser" ? "Organiser" : "Player";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="margin-bottom: 12px;">${title}</h2>
      <p style="margin: 0 0 12px 0;">Hi ${roleLabel},</p>
      <p style="margin: 0 0 16px 0;">Use the OTP below to continue:</p>
      <div style="font-size: 32px; letter-spacing: 6px; font-weight: 700; background: #f5f7fb; border: 1px solid #e0e5ef; padding: 16px 20px; border-radius: 10px; width: fit-content;">
        ${otp}
      </div>
      <p style="margin: 16px 0 0 0;">This OTP is valid for 10 minutes.</p>
      <p style="margin: 12px 0 0 0; color: #616161; font-size: 13px;">If you did not request this, please ignore this email.</p>
    </div>
  `;

  return {
    subject:
      purpose === "forgot-password"
        ? "Kasa Kai Password Reset OTP"
        : "Kasa Kai Account Verification OTP",
    html,
  };
};

const formatGameDate = (value) => {
  if (!value) return "soon";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "soon";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const buildGameCreatedTemplate = ({ organiserName, gameTitle, scheduledAt, format }) => {
  const safeTitle = gameTitle || "your event";
  const dateText = formatGameDate(scheduledAt);
  const gameFormat = format || "unknown format";

  return {
    subject: "Kasa Kai event created successfully",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
        <h2 style="margin-bottom: 12px;">Event created successfully</h2>
        <p style="margin: 0 0 12px 0;">Hi ${organiserName || "Organiser"},</p>
        <p style="margin: 0 0 16px 0;">Your event <strong>${safeTitle}</strong> has been created successfully.</p>
        <div style="background: #f5f7fb; border: 1px solid #e0e5ef; padding: 16px 20px; border-radius: 10px;">
          <p style="margin: 0 0 8px 0;"><strong>Format:</strong> ${gameFormat}</p>
          <p style="margin: 0 0 8px 0;"><strong>Scheduled at:</strong> ${dateText}</p>
        </div>
        <p style="margin: 16px 0 0 0; color: #616161; font-size: 13px;">You can now manage this event from your organiser dashboard.</p>
      </div>
    `,
  };
};

const buildGameRegistrationTemplate = ({ playerName, gameTitle, scheduledAt, format }) => {
  const safeTitle = gameTitle || "the game";
  const dateText = formatGameDate(scheduledAt);
  const gameFormat = format || "unknown format";

  return {
    subject: "You registered successfully for a Kasa Kai game",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
        <h2 style="margin-bottom: 12px;">Registration successful</h2>
        <p style="margin: 0 0 12px 0;">Hi ${playerName || "Player"},</p>
        <p style="margin: 0 0 16px 0;">You have successfully registered for <strong>${safeTitle}</strong>.</p>
        <div style="background: #f5f7fb; border: 1px solid #e0e5ef; padding: 16px 20px; border-radius: 10px;">
          <p style="margin: 0 0 8px 0;"><strong>Format:</strong> ${gameFormat}</p>
          <p style="margin: 0 0 8px 0;"><strong>Scheduled at:</strong> ${dateText}</p>
        </div>
        <p style="margin: 16px 0 0 0; color: #616161; font-size: 13px;">Check your dashboard for more game details and updates.</p>
      </div>
    `,
  };
};

const sendOtpEmail = async ({ to, otp, role = "player", purpose = "signup" }) => {
  assertEmailConfig();

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const template = buildOtpTemplate({ otp, role, purpose });

  await transporter.sendMail({
    from,
    to,
    subject: template.subject,
    html: template.html,
  });
};

const sendGameCreatedEmail = async ({ to, organiserName, gameTitle, scheduledAt, format }) => {
  assertEmailConfig();

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const template = buildGameCreatedTemplate({ organiserName, gameTitle, scheduledAt, format });

  await transporter.sendMail({
    from,
    to,
    subject: template.subject,
    html: template.html,
  });
};

const sendGameRegistrationEmail = async ({ to, playerName, gameTitle, scheduledAt, format }) => {
  assertEmailConfig();

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const template = buildGameRegistrationTemplate({ playerName, gameTitle, scheduledAt, format });

  await transporter.sendMail({
    from,
    to,
    subject: template.subject,
    html: template.html,
  });
};

module.exports = {
  sendOtpEmail,
  sendGameCreatedEmail,
  sendGameRegistrationEmail,
};
