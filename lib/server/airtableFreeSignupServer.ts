/**
 * Server-only Airtable access for free-signup / public form flows.
 * Prefer AIRTABLE_PAT (or AIRTABLE_ACCESS_TOKEN) over NEXT_PUBLIC_* on the server.
 */
import redis from "../redis";
import CACHE_EXPIRY from "../../constants/CacheExpiry";
import {
  findAirtableMightyMemberByEmail,
  getAirtableMightyIndustryHouseFieldName,
} from "../airtableMightyMembers";

// v2 reads the live Join Map destination (Mighty Members), not the legacy roster.
const FREE_SIGNUP_META_CACHE_KEY = "airtable:free-signup:metadata:v2:mighty-industry-house";

function getApiKey(): string {
  const k =
    process.env.AIRTABLE_PAT?.trim() ||
    process.env.AIRTABLE_ACCESS_TOKEN?.trim() ||
    process.env.AIRTABLE_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN?.trim();
  if (!k) {
    throw new Error(
      "Missing Airtable API token. Set AIRTABLE_PAT or AIRTABLE_ACCESS_TOKEN (server-only)."
    );
  }
  return k;
}

function getBaseId(): string {
  const v =
    process.env.AIRTABLE_FREE_SIGNUP_BASE_ID?.trim() ||
    process.env.AIRTABLE_BASE_ID?.trim() ||
    process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID?.trim();
  if (!v) throw new Error("Missing Airtable base id (AIRTABLE_BASE_ID or NEXT_PUBLIC_AIRTABLE_BASE_ID).");
  return v;
}

function getTableName(): string {
  const v =
    process.env.AIRTABLE_FREE_SIGNUP_TABLE_NAME?.trim() ||
    process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME?.trim();
  if (!v) throw new Error("Missing Airtable table name (NEXT_PUBLIC_AIRTABLE_TABLE_NAME or AIRTABLE_FREE_SIGNUP_TABLE_NAME).");
  return v;
}

function getJoinMapBaseId(): string {
  return (
    process.env.AIRTABLE_JOIN_MAP_BASE_ID?.trim() ||
    process.env.AIRTABLE_MIGHTY_SYNC_BASE_ID?.trim() ||
    getBaseId()
  );
}

function getJoinMapTableName(): string {
  return (
    process.env.AIRTABLE_JOIN_MAP_TABLE_ID?.trim() ||
    process.env.AIRTABLE_JOIN_MAP_TABLE_NAME?.trim() ||
    process.env.AIRTABLE_MIGHTY_SYNC_TABLE_ID?.trim() ||
    process.env.AIRTABLE_MIGHTY_SYNC_TABLE_NAME?.trim() ||
    getTableName()
  );
}

async function airtableFetch(url: string, init: RequestInit): Promise<Response> {
  const apiKey = getApiKey();
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });
}

/**
 * Field names the public free-signup API may write. Everything else is dropped
 * so callers cannot escalate to arbitrary Airtable columns.
 */
export const FREE_SIGNUP_PUBLIC_WRITABLE_FIELD_NAMES = new Set<string>([
  "ADDITIONAL FOCUS AREAS",
  "Address",
  "AFFILIATED ENTITY",
  "BIO",
  "EMAIL ADDRESS",
  "Featured",
  "FIRST NAME",
  "FUNDING GOAL",
  "GENDER",
  "IDENTIFICATION",
  "LAST NAME",
  "LATITUDE (NEW)",
  "Latitude",
  "Location (Nearest City)",
  "LOGO",
  "LONGITUDE (NEW)",
  "Longitude",
  "MEMBER LEVEL",
  "Membership Status Notes",
  "MembershipType",
  "Name (from Location)",
  "NAICS Code",
  "ORGANIZATION NAME",
  "PHONE NON-US/CAN",
  "PHONE US/CAN ONLY",
  "PHOTO",
  "PRIMARY INDUSTRY HOUSE",
  "Similar Categories",
  "WEBSITE",
  "YOUTUBE",
  "Zip/Postal Code",
]);

export function pickPublicWritableFreeSignupFields(
  fields: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(fields)) {
    if (FREE_SIGNUP_PUBLIC_WRITABLE_FIELD_NAMES.has(key)) {
      out[key] = fields[key];
    }
  }
  return out;
}

/** Translate the public Join Map payload into the current Mighty Members table. */
export function mapJoinMapFieldsToMightyMembers(
  fields: Record<string, unknown>,
  mightyId?: number
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {
    "First Name": fields["FIRST NAME"],
    "Last Name": fields["LAST NAME"],
    "Primary Email": fields["EMAIL ADDRESS"],
    City: fields.Address,
    Latitude: fields.Latitude,
    Longitude: fields.Longitude,
    "Industry / Sector": fields["PRIMARY INDUSTRY HOUSE"],
    // Mirrors the Join Map dropdown selection into the singleSelect column
    // created by scripts/airtable-create-industry-house-field.ts, so new
    // signups don't need the backfill script to get a real Airtable choice.
    [getAirtableMightyIndustryHouseFieldName()]: fields["PRIMARY INDUSTRY HOUSE"],
    "Extended Bio": fields.BIO,
    "Present in Mighty Networks": mightyId !== undefined,
    "Needs Review": mightyId === undefined,
  };
  if (mightyId !== undefined) {
    mapped["Mighty Member ID"] = mightyId;
  }

  const photo = fields.PHOTO;
  if (Array.isArray(photo) && typeof photo[0]?.url === "string") {
    mapped["Profile Photo URL"] = photo[0].url;
  }

  const notes = [
    "Source: Join Map form",
    fields["ORGANIZATION NAME"]
      ? `Organization: ${String(fields["ORGANIZATION NAME"])}`
      : null,
    fields["AFFILIATED ENTITY"]
      ? `Affiliated Entity: ${String(fields["AFFILIATED ENTITY"])}`
      : null,
    Array.isArray(fields.LOGO) && typeof fields.LOGO[0]?.url === "string"
      ? `Logo URL: ${fields.LOGO[0].url}`
      : null,
  ].filter((line): line is string => Boolean(line));
  mapped["Internal Notes"] = notes.join("\n");

  return Object.fromEntries(
    Object.entries(mapped).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export type FreeSignupFieldMeta = {
  fieldName: string;
  fieldType: string;
  options: Array<{ id: string; name: string; icon: unknown }>;
};

export async function fetchFreeSignupTableFieldMetadata(): Promise<FreeSignupFieldMeta[]> {
  try {
    const cached = await redis.get(FREE_SIGNUP_META_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as FreeSignupFieldMeta[];
    }
  } catch (e) {
    console.warn("[airtableFreeSignup] metadata cache read failed:", (e as Error)?.message);
  }

  const baseId = getJoinMapBaseId();
  const tableName = getJoinMapTableName();
  const industryHouseFieldName = getAirtableMightyIndustryHouseFieldName();
  const url = `https://api.airtable.com/v0/meta/bases/${encodeURIComponent(baseId)}/tables`;
  const res = await airtableFetch(url, { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Airtable meta error (${res.status}): ${text || res.statusText}`);
  }
  const data = (await res.json()) as { tables?: Array<{ id: string; name: string; fields: unknown[] }> };
  const tables = data.tables || [];
  const targetTable = tables.find((t) => t.id === tableName || t.name === tableName);
  if (!targetTable) {
    throw new Error(`Airtable table '${tableName}' not found in base metadata.`);
  }

  const industryHouseField = (targetTable.fields as any[]).find(
    (field: any) => field.name === industryHouseFieldName
  );
  if (!industryHouseField) {
    throw new Error(
      `Airtable field '${industryHouseFieldName}' not found in Join Map table '${tableName}'.`
    );
  }
  if (industryHouseField.type !== "singleSelect") {
    throw new Error(
      `Airtable field '${industryHouseFieldName}' must be a singleSelect; received '${industryHouseField.type}'.`
    );
  }

  // The client form continues to use its stable legacy field name internally,
  // while choices now come from the new Mighty Members table.
  const metadata: FreeSignupFieldMeta[] = [
    {
      fieldName: "PRIMARY INDUSTRY HOUSE",
      fieldType: industryHouseField.type,
      options: (industryHouseField.options?.choices || [])
        .filter((choice: any) => choice.name && String(choice.name).trim() !== "")
        .map((choice: any) => ({
          id: choice.id,
          name: choice.name,
          icon: choice.icon || null,
        })),
    },
  ];

  try {
    await redis.setex(FREE_SIGNUP_META_CACHE_KEY, CACHE_EXPIRY, JSON.stringify(metadata));
  } catch (e) {
    console.warn("[airtableFreeSignup] metadata cache write failed:", (e as Error)?.message);
  }

  return metadata;
}

export async function fetchFreeSignupRecordById(
  recordId: string
): Promise<{ id: string; fields: Record<string, unknown> } | null> {
  const baseId = getBaseId();
  const tableName = getTableName();
  const url = `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(tableName)}/${encodeURIComponent(recordId)}`;
  const res = await airtableFetch(url, { method: "GET" });
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Airtable read error (${res.status}): ${text || res.statusText}`);
  }
  const data = (await res.json()) as { id?: string; fields?: Record<string, unknown> };
  if (!data.id) {
    return null;
  }
  return { id: data.id, fields: data.fields || {} };
}

export async function createFreeSignupRecord(
  fields: Record<string, unknown>,
  mightyId?: number
): Promise<{ id?: string; fields?: Record<string, unknown>; [key: string]: unknown }> {
  const baseId = getJoinMapBaseId();
  const tableName = getJoinMapTableName();
  const url = `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(tableName)}`;
  const mappedFields = mapJoinMapFieldsToMightyMembers(fields, mightyId);
  const email = typeof fields["EMAIL ADDRESS"] === "string" ? fields["EMAIL ADDRESS"] : "";
  const existing = email ? await findAirtableMightyMemberByEmail(email) : null;

  const res = await airtableFetch(url, {
    method: existing ? "PATCH" : "POST",
    body: JSON.stringify(
      existing
        ? { records: [{ id: existing.recordId, fields: mappedFields }] }
        : { fields: mappedFields }
    ),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Airtable signup write error (${res.status}): ${text || res.statusText}`);
  }
  const data = await res.json();
  if (existing) {
    const updated = (data as { records?: Array<{ id?: string; fields?: Record<string, unknown> }> })
      .records?.[0];
    return updated || data;
  }
  return data;
}

export async function deleteFreeSignupRecord(recordId: string): Promise<void> {
  const baseId = getJoinMapBaseId();
  const tableName = getJoinMapTableName();
  const url = `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(tableName)}/${encodeURIComponent(recordId)}`;
  const res = await airtableFetch(url, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Airtable delete error (${res.status}): ${text || res.statusText}`);
  }
}

export async function updateFreeSignupRecord(
  recordId: string,
  fields: Record<string, unknown>
): Promise<unknown> {
  const baseId = getBaseId();
  const tableName = getTableName();
  const url = `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(tableName)}/${encodeURIComponent(recordId)}`;
  const res = await airtableFetch(url, {
    method: "PATCH",
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Airtable update error (${res.status}): ${text || res.statusText}`);
  }
  return res.json();
}
