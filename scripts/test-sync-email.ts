/**
 * Test email sending for sync report (uses same Gmail config as sendSyncReportEmail).
 * Run: npx ts-node -r tsconfig-paths/register scripts/test-sync-email.ts
 */
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const RECIPIENTS = [
  "admin@blacksustainability.org",
  "info@blacksustainability.org",
  "jerry@techluminateacademy.com",
];

async function main() {
  const gmailUser = process.env.GMAIL_USER?.trim();
  const gmailPassword = process.env.GMAIL_APP_PASSWORD?.trim();

  if (!gmailUser || !gmailPassword) {
    console.error("Missing GMAIL_USER or GMAIL_APP_PASSWORD in .env");
    process.exit(1);
  }

  console.log("Testing email with:", gmailUser);
  console.log("Sending to:", RECIPIENTS.join(", "));

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPassword,
      },
    });

    await transporter.sendMail({
      from: `"Black Sustainability, Inc." <${gmailUser}>`,
      to: RECIPIENTS.join(", "),
      subject: "BSN Sync – Email Test",
      text: "This is a test email to verify the sync report email configuration works.",
      replyTo: "info@blacksustainability.org",
    });

    console.log("✅ Email sent successfully!");
  } catch (error) {
    console.error("❌ Email failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
