/**
 * Backfill the Mighty Members Airtable "Industry House" singleSelect field
 * (created by scripts/airtable-create-industry-house-field.ts).
 *
 * Two sources are tried per row, in order:
 *   1. The row's own "Industry / Sector" free-text value (already-synced data).
 *   2. The legacy Join Map Airtable base's "PRIMARY INDUSTRY HOUSE" value,
 *      matched by Primary Email — most existing members' industry choice
 *      lives only there and was never mirrored into Mighty Members.
 *
 * Both are resolved to a canonical dropdown label via the shared alias map in
 * lib/buildIndustryHouseQuery.js (the same source of truth used by the
 * map/list Industry House filter), so a legacy short string like
 * "Alternative Renewable Energy" resolves to "☀️ Alternative Energy".
 *
 * Rows already carrying a value in the target field are skipped. Rows with no
 * match from either source are reported as unmatched and left alone (use
 * --unmatched to print the full list; these likely need a manual pick from
 * staff, or never had an industry recorded anywhere).
 *
 * Usage:
 *   npx tsx scripts/backfill-mighty-members-industry-house.ts
 *   npx tsx scripts/backfill-mighty-members-industry-house.ts --unmatched
 *   npx tsx scripts/backfill-mighty-members-industry-house.ts --apply
 *   npx tsx scripts/backfill-mighty-members-industry-house.ts --apply --limit 50
 *
 * Env (target): AIRTABLE_PAT, AIRTABLE_MIGHTY_SYNC_BASE_ID, AIRTABLE_MIGHTY_SYNC_TABLE_ID/NAME
 * Env (legacy source): NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN (or AIRTABLE_PAT), NEXT_PUBLIC_AIRTABLE_BASE_ID,
 *   NEXT_PUBLIC_AIRTABLE_TABLE_NAME — pass --no-legacy to skip this source.
 * Optional: AIRTABLE_MIGHTY_INDUSTRY_HOUSE_FIELD (default: "Industry House")
 */
import "dotenv/config";

import {
  getAirtableMightyIndustryHouseFieldName,
  getMightySyncTableConfig,
  patchAirtableMightyMemberByRecordId,
} from "../lib/airtableMightyMembers";
// buildIndustryHouseQuery.js is CommonJS (shared with pages/api/*.js filters).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { resolveCanonicalIndustryHouse } = require("../lib/buildIndustryHouseQuery.js");

type AirtableRecord = { id: string; fields?: Record<string, unknown> };

function parseArgs() {
  const argv = process.argv.slice(2);
  const limitIdx = argv.indexOf("--limit");
  const sleepIdx = argv.indexOf("--sleep-ms");
  return {
    apply: argv.includes("--apply"),
    unmatched: argv.includes("--unmatched"),
    noLegacy: argv.includes("--no-legacy"),
    limit:
      limitIdx >= 0 && argv[limitIdx + 1] ? Math.max(0, parseInt(argv[limitIdx + 1]!, 10) || 0) : 0,
    sleepMs:
      sleepIdx >= 0 && argv[sleepIdx + 1] ? Math.max(0, parseInt(argv[sleepIdx + 1]!, 10) || 0) : 120,
  };
}

function getLegacySourceConfig(): { apiKey: string; baseId: string; table: string } | null {
  const apiKey =
    process.env.NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN?.trim() || process.env.AIRTABLE_PAT?.trim();
  const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID?.trim();
  const table = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME?.trim();
  if (!apiKey || !baseId || !table) return null;
  return { apiKey, baseId, table };
}

function nonEmptyString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function fetchAllRecords(params: {
  apiKey: string;
  baseId: string;
  table: string;
}): Promise<AirtableRecord[]> {
  const out: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(
      `https://api.airtable.com/v0/${params.baseId}/${encodeURIComponent(params.table)}`
    );
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Airtable fetch failed (${res.status}): ${text.slice(0, 300)}`);
    }

    const data = (await res.json()) as { records?: AirtableRecord[]; offset?: string };
    out.push(...(data.records ?? []));
    offset = data.offset;
  } while (offset);

  return out;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = parseArgs();

  const cfg = getMightySyncTableConfig();
  if (!cfg) {
    console.error(
      JSON.stringify({
        error: "airtable_not_configured",
        hint: "Set AIRTABLE_PAT and AIRTABLE_MIGHTY_SYNC_BASE_ID + table id/name.",
      })
    );
    process.exit(1);
  }

  const targetField = getAirtableMightyIndustryHouseFieldName();
  const records = await fetchAllRecords({ apiKey: cfg.apiKey, baseId: cfg.baseId, table: cfg.table });

  const legacyCfg = args.noLegacy ? null : getLegacySourceConfig();
  const legacyByEmail = new Map<string, string>();
  if (legacyCfg) {
    const legacyRecords = await fetchAllRecords(legacyCfg);
    for (const record of legacyRecords) {
      const fields = record.fields ?? {};
      const email = nonEmptyString(fields["EMAIL ADDRESS"]).toLowerCase();
      const industry = nonEmptyString(fields["PRIMARY INDUSTRY HOUSE"]);
      if (email && industry && !legacyByEmail.has(email)) {
        legacyByEmail.set(email, industry);
      }
    }
  }

  const candidates: Array<{
    recordId: string;
    email: string;
    sourceValue: string;
    source: "industry-sector" | "legacy-join-map";
    canonical: string;
  }> = [];
  const unmatched: Array<{ recordId: string; email: string; sourceValue: string }> = [];
  let alreadySet = 0;
  let noSourceValue = 0;
  let fromIndustrySector = 0;
  let fromLegacy = 0;

  for (const record of records) {
    const fields = record.fields ?? {};
    const existing = nonEmptyString(fields[targetField]);
    if (existing) {
      alreadySet++;
      continue;
    }

    const email = nonEmptyString(fields["Primary Email"]);
    const ownValue = nonEmptyString(fields["Industry / Sector"]);
    const legacyValue = email ? legacyByEmail.get(email.toLowerCase()) : undefined;

    const sourceValue = ownValue || legacyValue || "";
    const source: "industry-sector" | "legacy-join-map" = ownValue ? "industry-sector" : "legacy-join-map";
    if (!sourceValue) {
      noSourceValue++;
      continue;
    }

    const canonical = resolveCanonicalIndustryHouse(sourceValue) as string | null;
    if (!canonical) {
      unmatched.push({ recordId: record.id, email, sourceValue });
      continue;
    }

    if (source === "industry-sector") fromIndustrySector++;
    else fromLegacy++;
    candidates.push({ recordId: record.id, email, sourceValue, source, canonical });
  }

  const work = args.limit > 0 ? candidates.slice(0, args.limit) : candidates;

  console.log(
    JSON.stringify(
      {
        mode: args.apply ? "apply" : "dry-run",
        totalRecords: records.length,
        targetField,
        legacySourceUsed: Boolean(legacyCfg),
        legacyRowsWithIndustry: legacyByEmail.size,
        alreadySet,
        noSourceValue,
        matched: candidates.length,
        matchedFromIndustrySector: fromIndustrySector,
        matchedFromLegacyJoinMap: fromLegacy,
        unmatchedCount: unmatched.length,
        applyingCount: work.length,
        sample: work.slice(0, 10),
        unmatchedSample: args.unmatched ? unmatched : unmatched.slice(0, 20),
      },
      null,
      2
    )
  );

  if (!args.apply) return;

  let updated = 0;
  for (const row of work) {
    await patchAirtableMightyMemberByRecordId(row.recordId, { [targetField]: row.canonical });
    updated++;
    console.log(
      JSON.stringify({
        action: "updated",
        recordId: row.recordId,
        email: row.email,
        sourceValue: row.sourceValue,
        canonical: row.canonical,
      })
    );
    if (args.sleepMs > 0) await sleep(args.sleepMs);
  }

  console.log(JSON.stringify({ action: "complete", updated }, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
