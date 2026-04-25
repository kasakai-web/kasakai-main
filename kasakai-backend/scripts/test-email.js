/**
 * Run this to test whether SMTP is working:
 *   node scripts/test-email.js your@email.com
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const nodemailer = require("nodemailer");

const isTestRun = process.argv.includes("--test") || Boolean(process.env.NODE_TEST_CONTEXT);

if (!isTestRun) {
  const to = process.argv[2];
  if (!to) {
    console.error("Usage: node scripts/test-email.js <recipient-email>");
    process.exit(1);
  }

  console.log("\n========== SMTP CONFIG ==========");
  console.log("SMTP_HOST  :", process.env.SMTP_HOST);
  console.log("SMTP_PORT  :", process.env.SMTP_PORT);
  console.log("SMTP_SECURE:", process.env.SMTP_SECURE);
  console.log("SMTP_USER  :", process.env.SMTP_USER);
  console.log("SMTP_PASS  :", process.env.SMTP_PASS ? "***set***" : "NOT SET");
  console.log("SMTP_FROM  :", process.env.SMTP_FROM);
  console.log("=================================\n");

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtpout.secureserver.net",
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || "true").toLowerCase() === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  async function main() {
    // Step 1: verify connection
    console.log("Step 1: Verifying SMTP connection...");
    try {
      await transporter.verify();
      console.log("✅ SMTP connection OK\n");
    } catch (err) {
      console.error("❌ SMTP connection FAILED:");
      console.error("   Code   :", err.code);
      console.error("   Message:", err.message);
      console.error("   Full   :", err);
      process.exit(1);
    }

    // Step 2: send test email
    console.log(`Step 2: Sending test email to ${to} ...`);
    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject: "Kasa Kai SMTP Test",
        html: "<p>If you can read this, SMTP is working correctly.</p>",
      });
      console.log("✅ Email sent!");
      console.log("   Message ID:", info.messageId);
      console.log("   Response  :", info.response);
    } catch (err) {
      console.error("❌ Send FAILED:");
      console.error("   Code   :", err.code);
      console.error("   Message:", err.message);
      console.error("   Full   :", err);
      process.exit(1);
    }
  }

  main();
}
