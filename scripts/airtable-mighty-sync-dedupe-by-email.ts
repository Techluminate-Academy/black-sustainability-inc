/**
 * Mighty Members Airtable sync: one row per Primary Email.
 *
 * - Loads all records in the sync table (same env as lib/airtableMightyMembers.ts).
 * - Groups by normalized Primary Email (case-insensitive).
 * - For each group with 2+ rows: pick a single keeper, merge missing fields from duplicates, DELETE extras.
 *
 * Keeper: earliest createdTime (original roster row); missing Mighty Member ID / names filled from newer dupes.
 *
 * Default: --dry-run (print plan only). Use --apply to PATCH + DELETE.
 *
 * Usage:
 *   npx tsx scripts/airtable-mighty-sync-dedupe-by-email.ts
 *   npx tsx scripts/airtable-mighty-sync-dedupe-by-email.ts --email aoberdorf.3@outlook.com
 *   npx tsx scripts/airtable-mighty-sync-dedupe-by-email.ts --apply --sleep-ms 300
 */
import dotenv from "dotenv";

dotenv.config();

import { airtableEnabled, getMightySyncTableConfig } from "../lib/airtableMightyMembers";

type Rec = { id: string; createdTime: string; fields: Record<string, unknown> };

const MERGE_FIELD_KEYS = [
  "Mighty Member ID",
  "First Name",
  "Last Name",
  "City",
  "Profile Photo URL",
  "Short Bio",
  "Latitude",
  "Longitude",
  "isPaidActive",
  "planNames",
  "planIds",
  "subscriptionStatuses",
  "subscriptionUpdatedAt",
] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizePrimaryEmail(fields: Record<string, unknown>): string | null {
  const v = fields["Primary Email"];
  if (typeof v !== "string") return null;
  const t = v.trim().toLowerCase();
  return t || null;
}

function parseMightyId(fields: Record<string, unknown>): number | null {
  const raw = fields["Mighty Member ID"];
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function isEmptyField(v: unknown): boolean {
  return v === undefined || v === null || v === "";
}

function pickKeeper(recs: Rec[]): Rec {
  // Prefer earliest created row (stable “original” roster row); merge Mighty ID from newer dupes onto it.
  return [...recs].sort((a, b) => {
    const t = new Date(a.createdTime).getTime() - new Date(b.createdTime).getTime();
    if (t !== 0) return t;
    const as = parseMightyId(a.fields) != null ? 1 : 0;
    const bs = parseMightyId(b.fields) != null ? 1 : 0;
    return bs - as;
  })[0]!;
}

function buildMergePatch(keeper: Rec, losers: Rec[]): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const mergedView = { ...keeper.fields };

  for (const loser of losers) {
    for (const k of MERGE_FIELD_KEYS) {
      if (isEmptyField(mergedView[k]) && !isEmptyField(loser.fields[k])) {
        patch[k] = loser.fields[k];
        mergedView[k] = loser.fields[k];
      }
    }
  }

  const em = normalizePrimaryEmail(keeper.fields);
  if (em && mergedView["Primary Email"] !== em) {
    patch["Primary Email"] = em;
  }

  return patch;
}

async function listAllRecords(cfg: { apiKey: string; baseId: string; table: string }): Promise<Rec[]> {
  const { apiKey, baseId, table } = cfg;
  const tableEnc = encodeURIComponent(table);
  const out: Rec[] = [];
  let offset: string | undefined;
  do {
    const q = new URLSearchParams({ pageSize: "100" });
    if (offset) q.set("offset", offset);
    const url = `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${tableEnc}?${q.toString()}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Airtable list failed (${res.status}): ${text.slice(0, 400)}`);
    const data = JSON.parse(text) as { records?: { id: string; createdTime: string; fields: Record<string, unknown> }[]; offset?: string };
    for (const r of data.records ?? []) {
      out.push({ id: r.id, createdTime: r.createdTime, fields: r.fields || {} });
    }
    offset = data.offset;
  } while (offset);
  return out;
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const emailIdx = argv.indexOf("--email");
  const emailOnly =
    emailIdx >= 0 && argv[emailIdx + 1]?.includes("@") ? argv[emailIdx + 1]!.trim().toLowerCase() : null;
  const sleepIdx = argv.indexOf("--sleep-ms");
  const sleepMs =
    sleepIdx >= 0 && argv[sleepIdx + 1] ? Math.max(0, parseInt(argv[sleepIdx + 1]!, 10) || 0) : 250;
  return {
    dryRun: !argv.includes("--apply"),
    emailOnly,
    sleepMs,
  };
}

async function main() {
  const args = parseArgs();
  if (!airtableEnabled()) {
    console.error(JSON.stringify({ error: "Airtable Mighty sync not configured (PAT + base + table)" }));
    process.exit(1);
  }
  const cfg = getMightySyncTableConfig();
  if (!cfg) {
    console.error(JSON.stringify({ error: "getMightySyncTableConfig returned null" }));
    process.exit(1);
  }

  console.error(
    JSON.stringify({
      msg: "dedupe_start",
      baseId: cfg.baseId,
      table: cfg.table,
      dryRun: args.dryRun,
      emailOnly: args.emailOnly,
    })
  );

  const all = await listAllRecords(cfg);
  const byEmail = new Map<string, Rec[]>();
  for (const r of all) {
    const em = normalizePrimaryEmail(r.fields);
    if (!em) continue;
    if (args.emailOnly && em !== args.emailOnly) continue;
    const list = byEmail.get(em) || [];
    list.push(r);
    byEmail.set(em, list);
  }

  const dupGroups = [...byEmail.entries()].filter(([, recs]) => recs.length > 1);
  let merged = 0;
  let deleted = 0;

  for (const [email, recs] of dupGroups) {
    const keeper = pickKeeper(recs);
    const losers = recs.filter((r) => r.id !== keeper.id);
    const patch = buildMergePatch(keeper, losers);
    const deleteIds = losers.map((r) => r.id);

    const plan = {
      action: args.dryRun ? "would_dedupe" : "dedupe",
      email,
      keeper_id: keeper.id,
      delete_ids: deleteIds,
      patch_keys: Object.keys(patch),
    };
    console.log(JSON.stringify(plan));

    if (args.dryRun) continue;

    if (Object.keys(patch).length > 0) {
      const patchUrl = `https://api.airtable.com/v0/${encodeURIComponent(cfg.baseId)}/${encodeURIComponent(cfg.table)}`;
      const pr = await fetch(patchUrl, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${cfg.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ records: [{ id: keeper.id, fields: patch }] }),
      });
      const pt = await pr.text();
      if (!pr.ok) {
        console.log(JSON.stringify({ action: "patch_error", email, keeper_id: keeper.id, status: pr.status, body: pt.slice(0, 400) }));
      } else {
        merged++;
      }
      await sleep(args.sleepMs);
    }

    for (const id of deleteIds) {
      const delUrl = `https://api.airtable.com/v0/${encodeURIComponent(cfg.baseId)}/${encodeURIComponent(cfg.table)}/${encodeURIComponent(id)}`;
      const dr = await fetch(delUrl, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${cfg.apiKey}`, Accept: "application/json" },
      });
      const dt = await dr.text();
      if (!dr.ok) {
        console.log(JSON.stringify({ action: "delete_error", email, id, status: dr.status, body: dt.slice(0, 400) }));
      } else {
        deleted++;
      }
      await sleep(args.sleepMs);
    }
  }

  console.error(
    JSON.stringify({
      msg: "dedupe_done",
      total_records_scanned: all.length,
      duplicate_email_groups: dupGroups.length,
      dryRun: args.dryRun,
      ...(args.dryRun ? {} : { patch_runs: merged, deletes_ok: deleted }),
    })
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
