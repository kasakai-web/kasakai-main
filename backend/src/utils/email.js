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

module.exports = {
  sendOtpEmail,
};
