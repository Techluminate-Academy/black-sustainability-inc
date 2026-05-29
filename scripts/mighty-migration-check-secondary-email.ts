/**
 * For the "86 failed migration" list (mighty-bulk-migration-errors.csv), check each Airtable row
 * for a secondary email (default field: "Email 2") and determine whether that email looks usable
 * to create a Mighty Networks member.
 *
 * - Reads Airtable by record id from the CSV column `airtable_record_id`
 * - Pulls Primary Email + secondary email field(s)
 * - Validates basic email format
 * - Checks Mighty for existing member by email (non-destructive)
 *
 * Optionally, with --apply, will actually create the member in Mighty using the secondary email.
 *
 * Usage:
 *   npx tsx scripts/mighty-migration-check-secondary-email.ts
 *   npx tsx scripts/mighty-migration-check-secondary-email.ts ./mighty-bulk-migration-errors.csv
 *
 *   # JSON lines (default)
 *   npx tsx scripts/mighty-migration-check-secondary-email.ts --limit 20
 *
 *   # CSV output
 *   npx tsx scripts/mighty-migration-check-secondary-email.ts --csv > mighty-secondary-email-check.csv
 *
 *   # Actually create members in Mighty (uses secondary email)
 *   npx tsx scripts/mighty-migration-check-secondary-email.ts --apply --no-welcome
 *
 * Env:
 * - Airtable: AIRTABLE_PAT (or AIRTABLE_ACCESS_TOKEN) + AIRTABLE_MIGHTY_SYNC_BASE_ID + AIRTABLE_MIGHTY_SYNC_TABLE_ID|NAME
 * - Mighty:   MIGHTY_API_KEY (or MIGHTY_NETWORK_API_KEY) + MIGHTY_NETWORK_ID (optional; default is in lib/mightyAdmin.ts)
 *
 * Secondary email fields:
 * - Default: "Email 2"
 * - Override by env: AIRTABLE_SECONDARY_EMAIL_FIELDS="Email 2,Secondary Email,Alternate Email"
 */
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { parse } from "csv-parse/sync";

dotenv.config();

import { airtableEnabled, getMightySyncTableConfig } from "../lib/airtableMightyMembers";
import { createMightyMember, mightyGetMemberByEmail } from "../lib/mightyAdmin";

type ErrorRow = {
  email: string;
  first_name: string;
  last_name: string;
  issue_category: string;
  mighty_error_summary: string;
  suggested_action: string;
  airtable_record_id: string;
  batch_offset: string;
};

function parseArgs() {
  const argv = process.argv.slice(2);
  const positional = argv.filter((a) => !a.startsWith("--"));
  const csvPath = path.resolve(positional[0] && positional[0].endsWith(".csv") ? positional[0] : "mighty-bulk-migration-errors.csv");

  const limitIdx = argv.indexOf("--limit");
  const offsetIdx = argv.indexOf("--offset");
  const sleepIdx = argv.indexOf("--sleep-ms");

  const limit =
    limitIdx >= 0 && argv[limitIdx + 1] ? Math.max(1, parseInt(argv[limitIdx + 1]!, 10) || 0) : 0;
  const offset =
    offsetIdx >= 0 && argv[offsetIdx + 1] ? Math.max(0, parseInt(argv[offsetIdx + 1]!, 10) || 0) : 0;
  const sleepMs =
    sleepIdx >= 0 && argv[sleepIdx + 1] ? Math.max(0, parseInt(argv[sleepIdx + 1]!, 10) || 0) : 200;

  return {
    csvPath,
    csv: argv.includes("--csv"),
    apply: argv.includes("--apply"),
    dryRun: !argv.includes("--apply"),
    noWelcome: argv.includes("--no-welcome"),
    limit,
    offset,
    sleepMs,
    onlyInvalidEmailCategory: argv.includes("--only-invalid-email"),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeEmail(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const e = v.trim().toLowerCase();
  return e ? e : null;
}

// Not perfect, but good enough to catch obvious failures and reduce Mighty API noise.
function isPlausibleEmail(email: string): boolean {
  // Must contain exactly one '@', no spaces, and at least one dot in domain.
  if (!email || /\s/.test(email)) return false;
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || !domain) return false;
  if (!domain.includes(".")) return false;
  if (domain.startsWith(".") || domain.endsWith(".")) return false;
  if (local.startsWith(".") || local.endsWith(".")) return false;
  return true;
}

function csvEscape(s: string): string {
  return `"${String(s ?? "").replace(/"/g, '""')}"`;
}

function secondaryEmailFieldCandidates(): string[] {
  const raw = process.env.AIRTABLE_SECONDARY_EMAIL_FIELDS?.trim();
  if (raw) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  // Common variants seen in this repo / Airtable conventions.
  return ["Email 2", "Secondary Email", "Alternate Email", "Alt Email", "Email2"];
}

async function airtableFetchRecord(params: {
  apiKey: string;
  baseId: string;
  table: string;
  recordId: string;
}): Promise<{ id: string; fields: Record<string, unknown> }> {
  const tableEnc = encodeURIComponent(params.table);
  const url = `https://api.airtable.com/v0/${encodeURIComponent(params.baseId)}/${tableEnc}/${encodeURIComponent(params.recordId)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      Accept: "application/json",
    },
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`Airtable read failed (${res.status}): ${text || res.statusText}`);
  }
  const json = JSON.parse(text) as { id: string; fields?: Record<string, unknown> };
  return { id: json.id, fields: json.fields ?? {} };
}

async function airtableListByFormula(params: {
  apiKey: string;
  baseId: string;
  table: string;
  filterByFormula: string;
  maxRecords?: number;
}): Promise<{ records: { id: string; fields: Record<string, unknown> }[] }> {
  const tableEnc = encodeURIComponent(params.table);
  const url = new URL(
    `https://api.airtable.com/v0/${encodeURIComponent(params.baseId)}/${tableEnc}`
  );
  url.searchParams.set("maxRecords", String(params.maxRecords ?? 1));
  url.searchParams.set("filterByFormula", params.filterByFormula);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      Accept: "application/json",
    },
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`Airtable list failed (${res.status}): ${text || res.statusText}`);
  const json = JSON.parse(text) as { records?: { id: string; fields?: Record<string, unknown> }[] };
  return { records: (json.records ?? []).map((r) => ({ id: r.id, fields: r.fields ?? {} })) };
}

function pickSecondaryEmail(fields: Record<string, unknown>): { field: string | null; email: string | null } {
  for (const f of secondaryEmailFieldCandidates()) {
    const v = normalizeEmail(fields[f]);
    if (v) return { field: f, email: v };
  }
  return { field: null, email: null };
}

function pickPrimaryEmail(fields: Record<string, unknown>): string | null {
  // Mighty sync table uses "Primary Email" per lib/airtableMightyMembers.ts
  return normalizeEmail(fields["Primary Email"] ?? fields["EMAIL ADDRESS"] ?? fields["Email"] ?? fields["email"]);
}

function pickNames(fields: Record<string, unknown>, row: ErrorRow): { first: string; last: string } {
  const first =
    (typeof fields["First Name"] === "string" ? fields["First Name"] : null) ??
    (row.first_name ? row.first_name : null);
  const last =
    (typeof fields["Last Name"] === "string" ? fields["Last Name"] : null) ??
    (row.last_name ? row.last_name : null);
  return {
    first: String(first ?? "").trim() || "Member",
    last: String(last ?? "").trim() || "-",
  };
}

function getMapAirtableTarget():
  | { apiKey: string; baseId: string; table: string }
  | null {
  const apiKey =
    process.env.NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN ||
    process.env.AIRTABLE_ACCESS_TOKEN ||
    process.env.AIRTABLE_PAT ||
    "";
  const baseId =
    process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID ||
    process.env.AIRTABLE_BASE_ID ||
    "";
  const table =
    process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME ||
    process.env.AIRTABLE_TABLE_NAME ||
    "";
  if (!apiKey || !baseId || !table) return null;
  return { apiKey, baseId, table };
}

function escapeAirtableString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function normalizePhone(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

function pickPhones(fields: Record<string, unknown>): {
  phoneUsCan: string | null;
  phoneNonUsCan: string | null;
  phoneCountryCode: string | null;
  bestPhone: string | null;
} {
  const phoneUsCan = normalizePhone(fields["PHONE US/CAN ONLY"] ?? fields["Phone"] ?? fields["PHONE"] ?? null);
  const phoneNonUsCan = normalizePhone(fields["PHONE NON-US/CAN"] ?? null);
  const phoneCountryCode = normalizePhone(fields["PHONE COUNTRY CODE"] ?? null);

  const bestPhone = phoneUsCan || phoneNonUsCan || null;
  return { phoneUsCan, phoneNonUsCan, phoneCountryCode, bestPhone };
}

async function findSecondaryEmailViaMapTable(email: string): Promise<{
  found: boolean;
  recordId?: string;
  secondary: { field: string | null; email: string | null };
  phones?: ReturnType<typeof pickPhones>;
}> {
  const target = getMapAirtableTarget();
  if (!target) return { found: false, secondary: { field: null, email: null } };
  const esc = escapeAirtableString(email);
  const formulas = [
    `LOWER({EMAIL ADDRESS}) = "${esc}"`,
    `LOWER({Primary Email}) = "${esc}"`,
    `LOWER({Email}) = "${esc}"`,
  ];
  for (const f of formulas) {
    try {
      const { records } = await airtableListByFormula({
        ...target,
        filterByFormula: f,
        maxRecords: 1,
      });
      const rec = records[0];
      if (!rec) continue;
      const secondary = pickSecondaryEmail(rec.fields);
      const phones = pickPhones(rec.fields);
      return { found: true, recordId: rec.id, secondary, phones };
    } catch (e) {
      // Ignore formula/field errors and keep trying.
      const msg = e instanceof Error ? e.message : String(e);
      if (/UNKNOWN_FIELD_NAME|Unknown field|Formula/i.test(msg)) continue;
      // For auth/base errors, stop trying further formulas.
      break;
    }
  }
  return { found: false, secondary: { field: null, email: null } };
}

async function main() {
  const args = parseArgs();
  if (!fs.existsSync(args.csvPath)) {
    console.error(
      `File not found: ${args.csvPath}\n\nUsage: npx tsx scripts/mighty-migration-check-secondary-email.ts [./mighty-bulk-migration-errors.csv] [--csv] [--apply] [--no-welcome] [--offset N] [--limit N] [--sleep-ms 200] [--only-invalid-email]`
    );
    process.exit(1);
  }

  if (!airtableEnabled()) {
    console.error(
      JSON.stringify({
        error: "airtable_not_configured",
        hint: "Set AIRTABLE_PAT (or AIRTABLE_ACCESS_TOKEN) and AIRTABLE_MIGHTY_SYNC_BASE_ID + AIRTABLE_MIGHTY_SYNC_TABLE_ID|NAME.",
      })
    );
    process.exit(1);
  }

  const cfg = getMightySyncTableConfig();
  if (!cfg) {
    console.error(JSON.stringify({ error: "airtable_config_missing", hint: "Check AIRTABLE_* env vars." }));
    process.exit(1);
  }

  const rowsAll = parse(fs.readFileSync(args.csvPath, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as ErrorRow[];

  let rows = rowsAll;
  if (args.onlyInvalidEmailCategory) {
    rows = rows.filter((r) => (r.issue_category || "").trim() === "invalid_email");
  }
  if (args.offset > 0) rows = rows.slice(args.offset);
  if (args.limit > 0) rows = rows.slice(0, args.limit);

  if (args.csv) {
    console.log(
      [
        "airtable_record_id",
        "primary_email_airtable",
        "primary_email_errors_csv",
        "secondary_email_field",
        "secondary_email",
        "phone_us_can",
        "phone_non_us_can",
        "phone_country_code",
        "phone_best",
        "secondary_plausible_format",
        "secondary_already_in_mighty",
        "would_be_creatable",
        "action",
        "mighty_id",
        "note",
      ].join(",")
    );
  } else {
    console.error(
      JSON.stringify({
        msg: "secondary_email_check_start",
        csv: args.csvPath,
        mode: args.dryRun ? "check-only" : "apply",
        rowCount: rows.length,
        airtable: { baseId: cfg.baseId, table: cfg.table, secondaryFields: secondaryEmailFieldCandidates() },
      })
    );
  }

  for (const r of rows) {
    const recordId = (r.airtable_record_id ?? "").trim();
    const csvPrimary = normalizeEmail(r.email);
    if (!recordId) {
      const out = {
        airtable_record_id: "",
        primary_email_airtable: "",
        primary_email_errors_csv: csvPrimary ?? "",
        secondary_email_field: "",
        secondary_email: "",
        secondary_plausible_format: "false",
        secondary_already_in_mighty: "",
        would_be_creatable: "false",
        action: "skipped_no_record_id",
        mighty_id: "",
        note: "CSV row missing airtable_record_id",
      };
      if (args.csv) {
        console.log(Object.values(out).map(csvEscape).join(","));
      } else {
        console.log(JSON.stringify(out));
      }
      continue;
    }

    try {
      const rec = await airtableFetchRecord({ ...cfg, recordId });
      const fields = rec.fields || {};
      const primaryAirtable = pickPrimaryEmail(fields);
      let { field: secondaryField, email: secondaryEmail } = pickSecondaryEmail(fields);
      let phoneUsCan: string | null = null;
      let phoneNonUsCan: string | null = null;
      let phoneCountryCode: string | null = null;
      let phoneBest: string | null = null;
      // The Mighty sync table may not include Email 2; fall back to the primary map Airtable table by email.
      if (!secondaryEmail) {
        const lookupEmail = primaryAirtable || csvPrimary;
        if (lookupEmail) {
          const viaMap = await findSecondaryEmailViaMapTable(lookupEmail);
          if (viaMap.secondary.email) {
            secondaryEmail = viaMap.secondary.email;
            secondaryField = viaMap.secondary.field;
          }
          if (viaMap.phones) {
            phoneUsCan = viaMap.phones.phoneUsCan;
            phoneNonUsCan = viaMap.phones.phoneNonUsCan;
            phoneCountryCode = viaMap.phones.phoneCountryCode;
            phoneBest = viaMap.phones.bestPhone;
          }
        }
      }
      const { first, last } = pickNames(fields, r);

      const secondaryPlausible = secondaryEmail ? isPlausibleEmail(secondaryEmail) : false;
      const secondaryDistinct =
        secondaryEmail && primaryAirtable ? secondaryEmail !== primaryAirtable : Boolean(secondaryEmail);

      let secondaryAlreadyInMighty: boolean | null = null;
      let existingMightyId: number | null = null;
      if (secondaryEmail && secondaryPlausible) {
        const existing = await mightyGetMemberByEmail(secondaryEmail);
        secondaryAlreadyInMighty = Boolean(existing);
        existingMightyId = existing ? existing.id : null;
      }

      const wouldBeCreatable = Boolean(secondaryEmail && secondaryPlausible && secondaryDistinct && secondaryAlreadyInMighty === false);

      let action: string = "checked";
      let mightyId: number | null = existingMightyId;
      let note = "";

      if (!secondaryEmail) {
        action = "no_secondary_email";
        note = "No secondary email found in Airtable";
      } else if (!secondaryPlausible) {
        action = "secondary_invalid_format";
        note = "Secondary email fails basic format checks";
      } else if (!secondaryDistinct) {
        action = "secondary_same_as_primary";
        note = "Secondary email equals primary email";
      } else if (secondaryAlreadyInMighty) {
        action = "secondary_already_in_mighty";
        note = "Secondary email already exists in Mighty";
      } else if (args.apply && wouldBeCreatable) {
        const created = await createMightyMember({
          email: secondaryEmail,
          first_name: first,
          last_name: last,
          send_welcome_email: args.noWelcome ? false : undefined,
        });
        if (created.ok) {
          action = created.alreadyExisted ? "already_in_mighty" : "created_in_mighty";
          mightyId = created.id;
          note = created.alreadyExisted ? "Member existed by secondary email" : "Created member using secondary email";
        } else {
          action = "create_failed";
          note = `Mighty create failed (${created.status}): ${created.error.slice(0, 180)}`;
        }
      }

      const out = {
        airtable_record_id: recordId,
        primary_email_airtable: primaryAirtable ?? "",
        primary_email_errors_csv: csvPrimary ?? "",
        secondary_email_field: secondaryField ?? "",
        secondary_email: secondaryEmail ?? "",
        phone_us_can: phoneUsCan ?? "",
        phone_non_us_can: phoneNonUsCan ?? "",
        phone_country_code: phoneCountryCode ?? "",
        phone_best: phoneBest ?? "",
        secondary_plausible_format: String(secondaryPlausible),
        secondary_already_in_mighty: secondaryAlreadyInMighty === null ? "" : String(secondaryAlreadyInMighty),
        would_be_creatable: String(wouldBeCreatable),
        action,
        mighty_id: mightyId == null ? "" : String(mightyId),
        note,
      };

      if (args.csv) {
        console.log(Object.values(out).map(csvEscape).join(","));
      } else {
        console.log(JSON.stringify(out));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const out = {
        airtable_record_id: recordId,
        primary_email_airtable: "",
        primary_email_errors_csv: csvPrimary ?? "",
        secondary_email_field: "",
        secondary_email: "",
        secondary_plausible_format: "false",
        secondary_already_in_mighty: "",
        would_be_creatable: "false",
        action: "error",
        mighty_id: "",
        note: msg.slice(0, 240),
      };
      if (args.csv) {
        console.log(Object.values(out).map(csvEscape).join(","));
      } else {
        console.log(JSON.stringify(out));
      }
    }

    await sleep(args.sleepMs);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});

