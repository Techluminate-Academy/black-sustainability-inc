/**
 * Bulk-create Mighty network members from the CSV produced by:
 *   npx tsx scripts/airtable-mighty-members-missing-id.ts --csv 2>/dev/null > missing-mighty-id.csv
 *   (or npm run … -- --csv — only redirect stdout, not 2>&1, or npm log lines can land in the file)
 *
 * Uses Mighty Admin API POST /admin/v1/networks/{id}/members
 * @see https://docs.mightynetworks.com/api-reference/members/create-a-new-member-in-the-network
 *
 * Default is --dry-run (no API writes). Use --apply to create members.
 *
 * Usage:
 *   npx tsx scripts/mighty-bulk-create-members-from-csv.ts ./missing-mighty-id.csv
 *   npx tsx scripts/mighty-bulk-create-members-from-csv.ts ./missing-mighty-id.csv --apply --no-welcome --sleep-ms 500
 *   npx tsx scripts/mighty-bulk-create-members-from-csv.ts ./missing-mighty-id.csv --apply --sync-airtable --limit 10
 *   npx tsx scripts/mighty-bulk-create-members-from-csv.ts ./missing-mighty-id.csv --apply --offset 26 --limit 500
 *   npx tsx scripts/mighty-bulk-create-members-from-csv.ts ./missing-mighty-id.csv --email you@example.com --apply --no-welcome --sync-airtable
 *   npx tsx scripts/mighty-bulk-create-members-from-csv.ts ./missing-mighty-id.csv --apply --errors-csv ./mighty-bulk-migration-errors.csv
 */
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { parse } from "csv-parse/sync";

const ERRORS_CSV_HEADER =
  "email,first_name,last_name,issue_category,mighty_error_summary,suggested_action,airtable_record_id,batch_offset";

dotenv.config();

import { createMightyMember, mightyGetMemberByEmail } from "../lib/mightyAdmin";
import { airtableEnabled, upsertAirtableMightyMember } from "../lib/airtableMightyMembers";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Skip npm/terminal noise if someone used `2>&1` or pasted output; start at real header row. */
function csvBodyFromMaybePollutedFile(content: string): string {
  const lines = content.split(/\r?\n/);
  const headerRe = /^record_id\s*,\s*primary_email\s*,\s*first_name\s*,\s*last_name\s*$/i;
  const idx = lines.findIndex((l) => headerRe.test(l.trim().replace(/^\ufeff/, "")));
  if (idx >= 0) return lines.slice(idx).join("\n");
  return content;
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const positional = argv.filter((a) => !a.startsWith("--"));
  const csvPath = positional[0] ? path.resolve(positional[0]) : "";

  const limitIdx = argv.indexOf("--limit");
  const offsetIdx = argv.indexOf("--offset");
  const sleepIdx = argv.indexOf("--sleep-ms");
  const emailIdx = argv.indexOf("--email");
  const errorsCsvIdx = argv.indexOf("--errors-csv");
  const limit =
    limitIdx >= 0 && argv[limitIdx + 1] ? Math.max(1, parseInt(argv[limitIdx + 1]!, 10) || 0) : 0;
  const offset =
    offsetIdx >= 0 && argv[offsetIdx + 1] ? Math.max(0, parseInt(argv[offsetIdx + 1]!, 10) || 0) : 0;
  const sleepMs =
    sleepIdx >= 0 && argv[sleepIdx + 1] ? Math.max(0, parseInt(argv[sleepIdx + 1]!, 10) || 0) : 400;
  const emailFilter =
    emailIdx >= 0 && argv[emailIdx + 1]?.includes("@")
      ? argv[emailIdx + 1]!.trim().toLowerCase()
      : null;
  const errorsCsvPath =
    errorsCsvIdx >= 0 && argv[errorsCsvIdx + 1]
      ? path.resolve(argv[errorsCsvIdx + 1]!)
      : path.resolve("mighty-bulk-migration-errors.csv");

  return {
    csvPath,
    emailFilter,
    dryRun: !argv.includes("--apply"),
    apply: argv.includes("--apply"),
    noWelcome: argv.includes("--no-welcome"),
    syncAirtable: argv.includes("--sync-airtable"),
    limit,
    offset,
    sleepMs,
    errorsCsvPath,
    writeErrorsCsv: !argv.includes("--no-errors-csv"),
  };
}

function csvEscape(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}

function classifyMightyError(errorRaw: string): {
  issue_category: string;
  mighty_error_summary: string;
  suggested_action: string;
} {
  const err = errorRaw.toLowerCase();
  if (err.includes("did you mean")) {
    const m = errorRaw.match(/did you mean ([^"?]+)/i);
    return {
      issue_category: "typo_likely",
      mighty_error_summary: errorRaw.slice(0, 200),
      suggested_action: m ? `Fix email (Mighty suggests ${m[1]})` : "Fix email typo in Airtable",
    };
  }
  if (err.includes("email must be valid")) {
    return {
      issue_category: "invalid_email",
      mighty_error_summary: "Mighty: Email must be valid",
      suggested_action: "Confirm/correct email in Airtable",
    };
  }
  if (err.includes("record_invalid")) {
    return {
      issue_category: "needs_review",
      mighty_error_summary: "Mighty rejected member (record_invalid)",
      suggested_action: "Verify email/name in Airtable; try manual add in Mighty admin",
    };
  }
  return {
    issue_category: "error",
    mighty_error_summary: errorRaw.slice(0, 200),
    suggested_action: "Review and retry after fix",
  };
}

function loadErrorsCsvEmails(filePath: string): Set<string> {
  if (!fs.existsSync(filePath)) return new Set();
  const body = fs.readFileSync(filePath, "utf8");
  const lines = body.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return new Set();
  const emails = new Set<string>();
  for (const line of lines.slice(1)) {
    const email = line.split(",")[0]?.replace(/^"|"$/g, "").trim().toLowerCase();
    if (email) emails.add(email);
  }
  return emails;
}

function appendFailureToErrorsCsv(params: {
  filePath: string;
  email: string;
  firstName: string;
  lastName: string;
  issue_category: string;
  mighty_error_summary: string;
  suggested_action: string;
  recordId: string;
  batchOffset: number;
  knownEmails: Set<string>;
}): void {
  const emailKey = params.email.trim().toLowerCase();
  if (emailKey && params.knownEmails.has(emailKey)) return;
  if (emailKey) params.knownEmails.add(emailKey);

  const row = [
    csvEscape(params.email),
    csvEscape(params.firstName),
    csvEscape(params.lastName),
    csvEscape(params.issue_category),
    csvEscape(params.mighty_error_summary),
    csvEscape(params.suggested_action),
    csvEscape(params.recordId),
    String(params.batchOffset),
  ].join(",");

  if (!fs.existsSync(params.filePath)) {
    fs.writeFileSync(params.filePath, `${ERRORS_CSV_HEADER}\n${row}\n`, "utf8");
    return;
  }
  fs.appendFileSync(params.filePath, `${row}\n`, "utf8");
}

/** Placeholder rows in Airtable (e.g. test@example.com) — skip migration and error CSV. */
function isPlaceholderEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  if (!e) return false;
  if (e === "test@example.com" || e === "john.doe@example.com") return true;
  const domain = e.split("@")[1];
  return domain === "example.com" || domain === "example.org";
}

function pickNames(row: Record<string, string>): { first: string; last: string } {
  const first = (row.first_name ?? "").trim();
  const last = (row.last_name ?? "").trim();
  return {
    first: first || "Member",
    last: last || "-",
  };
}

async function main() {
  const args = parseArgs();
  if (!args.csvPath || !fs.existsSync(args.csvPath)) {
    console.error(
      "Usage: npx tsx scripts/mighty-bulk-create-members-from-csv.ts <path-to-missing-mighty-id.csv> [--apply] [--no-welcome] [--sync-airtable] [--offset N] [--limit N] [--sleep-ms 400] [--errors-csv path] [--no-errors-csv] [--email one@address.com]"
    );
    process.exit(1);
  }

  if (args.syncAirtable && !airtableEnabled()) {
    console.error("Airtable sync disabled or misconfigured; remove --sync-airtable or fix env.");
    process.exit(1);
  }

  const buf = fs.readFileSync(args.csvPath, "utf8");
  const csvOnly = csvBodyFromMaybePollutedFile(buf);
  const rows = parse(csvOnly, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  let workRows = rows;
  if (args.emailFilter) {
    workRows = rows.filter(
      (r) => ((r.primary_email ?? r.email ?? "").trim().toLowerCase() === args.emailFilter)
    );
    if (workRows.length === 0) {
      console.error(
        JSON.stringify({
          error: "no_csv_row_for_email",
          email: args.emailFilter,
          csvRows: rows.length,
        })
      );
      process.exit(1);
    }
  }

  if (args.offset > 0) {
    workRows = workRows.slice(args.offset);
  }
  if (args.limit > 0) {
    workRows = workRows.slice(0, args.limit);
  }

  const summary = {
    csv: args.csvPath,
    mode: args.dryRun ? "dry-run" : "apply",
    rowCount: workRows.length,
    csvTotalRows: rows.length,
    emailFilter: args.emailFilter,
    offset: args.offset || null,
    noWelcome: args.noWelcome,
    syncAirtable: args.syncAirtable,
    limit: args.limit || null,
    errorsCsv: args.writeErrorsCsv ? args.errorsCsvPath : null,
  };
  console.error(JSON.stringify({ msg: "mighty_bulk_create_start", ...summary }));

  const errorsCsvEmails = args.writeErrorsCsv ? loadErrorsCsvEmails(args.errorsCsvPath) : new Set<string>();

  const logFailure = (
    row: Record<string, string>,
    issue_category: string,
    mighty_error_summary: string,
    suggested_action: string,
    email = ""
  ) => {
    if (!args.writeErrorsCsv) return;
    const { first, last } = pickNames(row);
    appendFailureToErrorsCsv({
      filePath: args.errorsCsvPath,
      email: email || (row.primary_email ?? row.email ?? "").trim(),
      firstName: (row.first_name ?? "").trim() || first,
      lastName: (row.last_name ?? "").trim() || last,
      issue_category,
      mighty_error_summary,
      suggested_action,
      recordId: row.record_id ?? "",
      batchOffset: args.offset,
      knownEmails: errorsCsvEmails,
    });
  };

  let processed = 0;
  let created = 0;
  let existed = 0;
  let skipped = 0;
  let skippedPlaceholder = 0;
  let errors = 0;

  for (const row of workRows) {
    const email = (row.primary_email ?? row.email ?? "").trim().toLowerCase();
    if (email && isPlaceholderEmail(email)) {
      skippedPlaceholder++;
      console.log(
        JSON.stringify({
          action: "skipped_placeholder",
          email,
          record_id: row.record_id,
          note: "Test/placeholder email (e.g. example.com); not sent to Mighty or errors CSV",
        })
      );
      continue;
    }
    if (!email || !email.includes("@")) {
      skipped++;
      logFailure(
        row,
        "skipped_no_email",
        "Missing or invalid Primary Email in CSV",
        "Add a valid email in Airtable Mighty Members table"
      );
      continue;
    }

    const { first, last } = pickNames(row);
    processed++;

    if (args.dryRun) {
      console.log(
        JSON.stringify({ action: "would_create", email, first_name: first, last_name: last, record_id: row.record_id })
      );
      continue;
    }

    try {
      let mightyId: number | null = null;
      let already = false;

      const existing = await mightyGetMemberByEmail(email);
      if (existing) {
        mightyId = existing.id;
        already = true;
        existed++;
      } else {
        const result = await createMightyMember({
          email,
          first_name: first,
          last_name: last,
          send_welcome_email: args.noWelcome ? false : undefined,
        });

        if (!result.ok) {
          errors++;
          const classified = classifyMightyError(result.error);
          logFailure(
            row,
            classified.issue_category,
            classified.mighty_error_summary,
            classified.suggested_action,
            email
          );
          console.log(
            JSON.stringify({
              action: "error",
              email,
              status: result.status,
              error: result.error,
              record_id: row.record_id,
            })
          );
          await sleep(args.sleepMs);
          continue;
        }

        mightyId = result.id;
        if (result.alreadyExisted) existed++;
        else created++;
      }

      console.log(
        JSON.stringify({
          action: already ? "already_in_mighty" : "created",
          email,
          mightyId,
          record_id: row.record_id,
        })
      );

      if (args.syncAirtable && mightyId != null) {
        try {
          const fn = (row.first_name ?? "").trim() || first;
          const ln = (row.last_name ?? "").trim() || undefined;
          await upsertAirtableMightyMember({
            mightyId,
            email,
            firstName: fn,
            lastName: ln,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          logFailure(row, "airtable_sync_error", msg.slice(0, 200), "Fix Airtable config or row; Mighty member was created", email);
          console.log(
            JSON.stringify({
              action: "airtable_sync_error",
              email,
              mightyId,
              error: msg,
            })
          );
        }
      }
    } catch (e) {
      errors++;
      const msg = e instanceof Error ? e.message : String(e);
      logFailure(row, "error", msg.slice(0, 200), "Review and retry after fix", email);
      console.log(
        JSON.stringify({
          action: "error",
          email,
          error: msg,
          record_id: row.record_id,
        })
      );
    }

    await sleep(args.sleepMs);
  }

  console.error(
    JSON.stringify({
      msg: "mighty_bulk_create_done",
      dryRun: args.dryRun,
      processed,
      skipped,
      skippedPlaceholder,
      ...(args.dryRun
        ? {
            note: "No Mighty/Airtable calls in dry-run; created/existed/errors are only counted with --apply.",
          }
        : { created, existed, errors }),
    })
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
