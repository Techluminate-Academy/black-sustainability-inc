/**
 * Send a sample sync report email to jerry@techluminateacademy.com (preview).
 * Run: npx ts-node -r tsconfig-paths/register scripts/send-sample-sync-email.ts
 */
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { buildHtmlBody, buildSubject } from "../lib/notifications/sendSyncReportEmail";

dotenv.config();

const runId =
  new Date().toISOString().slice(0, 10).replace(/-/g, "") +
  "-" +
  new Date().toISOString().slice(11, 16).replace(":", "");

const sampleSummary = {
  runType: "apply" as const,
  timestamp: new Date().toISOString(),
  runId,
  wix: { subscriptions: 216, uniqueEmails: 123, authorized: 34, unauthorized: 89 },
  airtable: { matched: 94, missing: 25, duplicates: 3 },
  actions: { setTrue: 1, setFalse: 6, noop: 87, skippedEquity: 4 },
  lists: {
    setTrueEmails: ["ujima@ourspaceworld.org"],
    setFalseEmails: [
      "loveessencecompanyllc@gmail.com",
      "info@nappilynaturals.com",
      "asmamyork@gmail.com",
      "wande@handheartsoulproject.org",
      "brian@movementmatterscollective.com",
      "sharondmooremt@gmail.com",
    ],
    missingEmails: ["aoverton32@outlook.com", "hempressbeing@gmail.com"],
    duplicateEmails: ["rparker@greenpower.ventures", "jmbrad2@gmail.com"],
    skippedEquityEmails: ["uniquepassion1@gmail.com", "greenacresfarm679@gmail.com"],
  },
};

async function main() {
  const emailUser = process.env.EMAIL_USER?.trim();
  const emailPassword = process.env.EMAIL_PASSWORD?.trim();
  if (!emailUser || !emailPassword) {
    console.error("EMAIL_USER and EMAIL_PASSWORD required in .env");
    process.exit(1);
  }

  const subject = buildSubject(sampleSummary);
  const html = buildHtmlBody(sampleSummary);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: emailUser, pass: emailPassword },
  });

  await transporter.sendMail({
    from: `"Black Sustainability, Inc." <${emailUser}>`,
    to: "jerry@techluminateacademy.com",
    subject: subject.replace("Success", "Sample Preview – Success"),
    html,
  });

  console.log("✅ Sample email sent to jerry@techluminateacademy.com");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
