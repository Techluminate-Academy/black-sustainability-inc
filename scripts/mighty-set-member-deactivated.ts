/**
 * Mark member(s) as deactivated in MongoDB + Airtable Mighty Members table.
 *
 * Usage:
 *   npx tsx scripts/mighty-set-member-deactivated.ts --email shevon@habeshainc.org --apply
 *   npx tsx scripts/mighty-set-member-deactivated.ts --email a@x.com --email b@y.com --apply
 */
import dotenv from "dotenv";

dotenv.config();

import { ACCOUNT_STATUS_DEACTIVATED } from "../lib/domain/member/accountStatus";
import { applyMemberAccountStatus } from "../lib/mightyMemberAccountStatus";
import { findAirtableMightyMemberByEmail } from "../lib/airtableMightyMembers";

function parseArgs() {
  const argv = process.argv.slice(2);
  const emails: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--email" && argv[i + 1]?.includes("@")) {
      emails.push(argv[i + 1]!.trim().toLowerCase());
      i++;
    }
  }
  return { apply: argv.includes("--apply"), emails };
}

async function main() {
  const args = parseArgs();
  if (!args.emails.length) {
    console.error(
      "Usage: npx tsx scripts/mighty-set-member-deactivated.ts --email one@example.com [--email two@example.com] [--apply]"
    );
    process.exit(1);
  }

  for (const email of args.emails) {
    const row = await findAirtableMightyMemberByEmail(email);
    if (args.apply) {
      const result = await applyMemberAccountStatus({
        email,
        mightyId: row?.mightyId ?? undefined,
        accountStatus: ACCOUNT_STATUS_DEACTIVATED,
        reason: "manual:staff-requested",
        firstName: row?.firstName ?? undefined,
        lastName: row?.lastName ?? undefined,
        syncAirtable: true,
      });
      console.log(JSON.stringify({ action: "deactivated", email, mightyId: row?.mightyId ?? null, ...result }));
    } else {
      console.log(
        JSON.stringify({
          action: "would_deactivate",
          email,
          mightyId: row?.mightyId ?? null,
          recordId: row?.recordId ?? null,
        })
      );
    }
  }

}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
