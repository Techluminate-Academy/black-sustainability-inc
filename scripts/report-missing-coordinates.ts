import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { connectToDatabase } from "../lib/mongodb.js";

type MightyMemberMissingCoords = {
  source: "mongo:mightyMembers";
  _id: string;
  mightyId?: number | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  location?: string | null;
  latitude?: unknown;
  longitude?: unknown;
  updatedAt?: string | null;
};

type AirtableMissingCoords = {
  source: "airtable:mightyMembers";
  recordId: string;
  email?: string | null;
  mightyId?: number | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  lat?: unknown;
  lng?: unknown;
};

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && String(v).trim() ? String(v).trim() : undefined;
}

function getAirtableApiKey(): string | undefined {
  return env("AIRTABLE_PAT") || env("AIRTABLE_ACCESS_TOKEN") || env("NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN");
}

function getAirtableBaseId(): string | undefined {
  return env("AIRTABLE_MIGHTY_SYNC_BASE_ID") || env("NEXT_PUBLIC_AIRTABLE_BASE_ID");
}

function getAirtableTable(): string {
  return (
    env("AIRTABLE_MIGHTY_SYNC_TABLE_ID") ||
    env("AIRTABLE_MIGHTY_SYNC_TABLE_NAME") ||
    env("NEXT_PUBLIC_AIRTABLE_TABLE_NAME") ||
    "Mighty Members"
  );
}

function getLatField(): string {
  return env("AIRTABLE_COORD_LAT_FIELD") || "Latitude";
}

function getLngField(): string {
  return env("AIRTABLE_COORD_LNG_FIELD") || "Longitude";
}

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function airtableFetchAllMissingCoords(): Promise<AirtableMissingCoords[]> {
  const apiKey = getAirtableApiKey();
  const baseId = getAirtableBaseId();
  if (!apiKey || !baseId) return [];

  const table = getAirtableTable();
  const tableEncoded = encodeURIComponent(table);
  const baseUrl = `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${tableEncoded}`;

  const latField = getLatField();
  const lngField = getLngField();

  // Matches blank or missing for either field.
  const formula = `OR({${latField}}="", {${lngField}}="", {${latField}}=BLANK(), {${lngField}}=BLANK())`;

  const out: AirtableMissingCoords[] = [];
  let offset: string | undefined;
  for (;;) {
    const url =
      `${baseUrl}?pageSize=100` +
      `&filterByFormula=${encodeURIComponent(formula)}` +
      (offset ? `&offset=${encodeURIComponent(offset)}` : "");
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Airtable API error (${res.status}): ${text || res.statusText}`);
    }
    const json = (await res.json()) as { records?: Array<{ id: string; fields: Record<string, any> }>; offset?: string };
    const records = json.records || [];
    for (const r of records) {
      const f = r.fields || {};
      out.push({
        source: "airtable:mightyMembers",
        recordId: r.id,
        email: f["Primary Email"] ?? f["EMAIL ADDRESS"] ?? f["Email"] ?? null,
        mightyId: typeof f["Mighty Member ID"] === "number" ? f["Mighty Member ID"] : null,
        firstName: f["First Name"] ?? f["FIRST NAME"] ?? null,
        lastName: f["Last Name"] ?? f["LAST NAME"] ?? null,
        city: f["City"] ?? f["Location (Nearest City)"] ?? null,
        lat: f[latField],
        lng: f[lngField],
      });
    }
    if (!json.offset) break;
    offset = json.offset;
  }
  return out;
}

async function mongoFetchMissingCoords(): Promise<MightyMemberMissingCoords[]> {
  const { db } = await connectToDatabase();
  const collection = db.collection("mightyMembers");

  const cursor = collection
    .find(
      {
        $or: [
          { latitude: { $exists: false } },
          { latitude: null },
          { longitude: { $exists: false } },
          { longitude: null },
        ],
      },
      {
        projection: {
          _id: 1,
          mightyId: 1,
          email: 1,
          firstName: 1,
          lastName: 1,
          location: 1,
          latitude: 1,
          longitude: 1,
          updatedAt: 1,
        },
      }
    )
    .sort({ _id: 1 });

  const docs = await cursor.toArray();
  return docs.map((d: any) => ({
    source: "mongo:mightyMembers",
    _id: String(d._id),
    mightyId: typeof d.mightyId === "number" ? d.mightyId : null,
    email: d.email ?? null,
    firstName: d.firstName ?? null,
    lastName: d.lastName ?? null,
    location: d.location ?? null,
    latitude: d.latitude,
    longitude: d.longitude,
    updatedAt: d.updatedAt ? String(d.updatedAt) : null,
  }));
}

async function main() {
  const startedAt = new Date();
  const reportSlug = startedAt.toISOString().replace(/[:.]/g, "-");

  const reportDir = path.join(process.cwd(), "reports");
  fs.mkdirSync(reportDir, { recursive: true });

  const [mongoMissing, airtableMissing] = await Promise.all([
    mongoFetchMissingCoords(),
    airtableFetchAllMissingCoords(),
  ]);

  const report = {
    generatedAt: startedAt.toISOString(),
    mongo: { collection: "mightyMembers", missingCoordsCount: mongoMissing.length, rows: mongoMissing },
    airtable: {
      baseId: getAirtableBaseId() || null,
      table: getAirtableTable(),
      latField: getLatField(),
      lngField: getLngField(),
      missingCoordsCount: airtableMissing.length,
      rows: airtableMissing,
      skipped: !(getAirtableApiKey() && getAirtableBaseId()),
    },
  };

  const jsonPath = path.join(reportDir, `missing-coordinates-${reportSlug}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");

  const csvPath = path.join(reportDir, `missing-coordinates-${reportSlug}.csv`);
  const csvLines: string[] = [];
  csvLines.push(
    [
      "source",
      "id",
      "mightyId",
      "email",
      "firstName",
      "lastName",
      "locationOrCity",
      "lat",
      "lng",
      "updatedAt",
    ].join(",")
  );
  for (const r of mongoMissing) {
    csvLines.push(
      [
        r.source,
        r._id,
        r.mightyId ?? "",
        r.email ?? "",
        r.firstName ?? "",
        r.lastName ?? "",
        r.location ?? "",
        r.latitude ?? "",
        r.longitude ?? "",
        r.updatedAt ?? "",
      ].map(csvEscape).join(",")
    );
  }
  for (const r of airtableMissing) {
    csvLines.push(
      [
        r.source,
        r.recordId,
        r.mightyId ?? "",
        r.email ?? "",
        r.firstName ?? "",
        r.lastName ?? "",
        r.city ?? "",
        r.lat ?? "",
        r.lng ?? "",
        "",
      ].map(csvEscape).join(",")
    );
  }
  fs.writeFileSync(csvPath, csvLines.join("\n"), "utf8");

  console.log(`✅ Missing-coordinates report generated`);
  console.log(`- Mongo missing coords: ${mongoMissing.length}`);
  console.log(`- Airtable missing coords: ${airtableMissing.length}${report.airtable.skipped ? " (skipped: missing AIRTABLE_* env)" : ""}`);
  console.log(`- JSON: ${path.relative(process.cwd(), jsonPath)}`);
  console.log(`- CSV:  ${path.relative(process.cwd(), csvPath)}`);
}

main().catch((err) => {
  console.error("❌ Report failed:", err?.message || err);
  process.exitCode = 1;
});

