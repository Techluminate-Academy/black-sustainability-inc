/**
 * List Airtable Mighty Members sync rows with no Mighty Member ID (cannot use login fallback).
 * Uses the same env as lib/airtableMightyMembers.ts (AIRTABLE_PAT, AIRTABLE_MIGHTY_SYNC_BASE_ID, etc.).
 *
 * Usage:
 *   npx tsx scripts/airtable-mighty-members-missing-id.ts
 *   npx tsx scripts/airtable-mighty-members-missing-id.ts --summary
 *   npx tsx scripts/airtable-mighty-members-missing-id.ts --csv
 *   npx tsx scripts/airtable-mighty-members-missing-id.ts --include-blank-email
 *
 * CSV export: `npx tsx scripts/airtable-mighty-members-missing-id.ts --csv 2>/dev/null > missing-mighty-id.csv`
 * (Redirect stdout only — not `2>&1` — or npm lines can end up inside the file.)
 */
import dotenv from "dotenv";

dotenv.config();

import {
  airtableEnabled,
  fetchMightySyncRowsMissingMemberId,
  getMightySyncTableConfig,
} from "../lib/airtableMightyMembers";

async function main() {
  const csv = process.argv.includes("--csv");
  const summary = process.argv.includes("--summary");
  const includeBlankEmail = process.argv.includes("--include-blank-email");

  if (!airtableEnabled()) {
    console.error(
      JSON.stringify(
        {
          error:
            "Airtable Mighty sync not configured. Set AIRTABLE_PAT (or AIRTABLE_ACCESS_TOKEN) and AIRTABLE_MIGHTY_SYNC_BASE_ID + AIRTABLE_MIGHTY_SYNC_TABLE_ID (or NAME), or NEXT_PUBLIC_* equivalents.",
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  const cfg = getMightySyncTableConfig();
  const { rows } = await fetchMightySyncRowsMissingMemberId({ includeBlankEmail });

  if (summary) {
    console.log(
      JSON.stringify(
        {
          baseId: cfg?.baseId,
          table: cfg?.table,
          filter: includeBlankEmail
            ? "{Mighty Member ID} = BLANK() (any row)"
            : "Primary Email non-empty AND {Mighty Member ID} = BLANK()",
          count: rows.length,
          hint: "Re-run without --summary for full JSON, or use --csv > missing-mighty-id.csv",
        },
        null,
        2
      )
    );
    return;
  }

  if (csv) {
    const q = (s: string | null) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    console.log("record_id,primary_email,first_name,last_name");
    for (const r of rows) {
      console.log([q(r.recordId), q(r.email), q(r.firstName), q(r.lastName)].join(","));
    }
    console.error(`# count=${rows.length} base=${cfg?.baseId} table=${cfg?.table}`);
    return;
  }

  console.log(
    JSON.stringify(
      {
        baseId: cfg?.baseId,
        table: cfg?.table,
        filter: includeBlankEmail
          ? "{Mighty Member ID} = BLANK() (any row)"
          : "Primary Email non-empty AND {Mighty Member ID} = BLANK()",
        count: rows.length,
        rows,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
