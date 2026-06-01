/**
 * Server-only Airtable access for the main member roster table (BSN registration, metadata, verification fallback).
 */
import redis from "../redis";
import CACHE_EXPIRY from "../../constants/CacheExpiry";

const META_CACHE_KEY = "airtable:main-roster:metadata:v1";

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
  const isDev = process.env.NODE_ENV === "development";
  const v = isDev
    ? process.env.NEXT_PUBLIC_DEV_AIRTABLE_BASE_ID?.trim() ||
      process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID?.trim()
    : process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID?.trim() ||
      process.env.AIRTABLE_BASE_ID?.trim();
  if (!v) throw new Error("Missing Airtable base id.");
  return v;
}

function getTableName(): string {
  const isDev = process.env.NODE_ENV === "development";
  const v = isDev
    ? process.env.NEXT_PUBLIC_DEV_AIRTABLE_TABLE_NAME?.trim() ||
      process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME?.trim()
    : process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME?.trim() ||
      process.env.AIRTABLE_TABLE_NAME?.trim();
  if (!v) throw new Error("Missing Airtable table name.");
  return v;
}

function rosterRecordsUrl(): string {
  const baseId = getBaseId();
  const table = encodeURIComponent(getTableName());
  return `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${table}`;
}

async function airtableFetch(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });
}

function escapeFormulaString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export type MainRosterFieldMeta = {
  fieldName: string;
  fieldType: string;
  options: Array<{ id: string; name: string; icon: unknown }>;
};

export async function fetchMainRosterTableMetadata(): Promise<MainRosterFieldMeta[]> {
  try {
    const cached = await redis.get(META_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as MainRosterFieldMeta[];
    }
  } catch (e) {
    console.warn("[airtableMainRoster] metadata cache read failed:", (e as Error)?.message);
  }

  const baseId = getBaseId();
  const tableName = getTableName();
  const url = `https://api.airtable.com/v0/meta/bases/${encodeURIComponent(baseId)}/tables`;
  const res = await airtableFetch(url, { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Airtable meta error (${res.status}): ${text || res.statusText}`);
  }

  const data = (await res.json()) as {
    tables?: Array<{ id: string; name: string; fields: Array<Record<string, unknown>> }>;
  };
  const targetTable = (data.tables || []).find((t) => t.id === tableName || t.name === tableName);
  if (!targetTable) {
    throw new Error(`Table '${tableName}' not found in base metadata.`);
  }

  const metadata: MainRosterFieldMeta[] = (targetTable.fields || []).map((field: Record<string, unknown>) => {
    let options: MainRosterFieldMeta["options"] = [];
    const type = String(field.type || "");
    if (type === "singleSelect" || type === "multipleSelects") {
      const choices = (field.options as { choices?: Array<{ id: string; name: string; icon?: unknown }> })
        ?.choices;
      options = (choices || [])
        .filter((c) => c.name && String(c.name).trim() !== "")
        .map((c) => ({ id: c.id, name: c.name, icon: c.icon ?? null }));

      if (field.name === "GENDER") {
        options = options.filter((c) => c.name !== "Uganda" && c.name !== "GENDER");
      }
      if (field.name === "Name (from Location)") {
        options = options.filter((c) => c.name !== "Name (from Location)");
      }
    }
    return {
      fieldName: String(field.name),
      fieldType: type,
      options,
    };
  });

  try {
    await redis.setex(META_CACHE_KEY, CACHE_EXPIRY, JSON.stringify(metadata));
  } catch (e) {
    console.warn("[airtableMainRoster] metadata cache write failed:", (e as Error)?.message);
  }

  return metadata;
}

export async function fetchMainRosterRecordWithFieldsByEmail(
  email: string
): Promise<{ id: string; fields: Record<string, unknown> } | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return null;

  const formula = `{EMAIL ADDRESS} = '${escapeFormulaString(normalized)}'`;
  const url = `${rosterRecordsUrl()}?maxRecords=1&filterByFormula=${encodeURIComponent(formula)}`;
  const res = await airtableFetch(url, { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Airtable list error (${res.status}): ${text || res.statusText}`);
  }

  const data = (await res.json()) as {
    records?: Array<{ id: string; fields: Record<string, unknown> }>;
  };
  const record = data.records?.[0];
  if (!record?.id) return null;
  return { id: record.id, fields: record.fields || {} };
}

export async function findMainRosterRecordByEmail(
  email: string
): Promise<{ id: string; firstName?: string; lastName?: string; email: string } | null> {
  const record = await fetchMainRosterRecordWithFieldsByEmail(email);
  if (!record) return null;

  const f = record.fields;
  const normalized = email.trim().toLowerCase();
  return {
    id: record.id,
    firstName: typeof f["FIRST NAME"] === "string" ? f["FIRST NAME"] : undefined,
    lastName: typeof f["LAST NAME"] === "string" ? f["LAST NAME"] : undefined,
    email:
      typeof f["EMAIL ADDRESS"] === "string"
        ? String(f["EMAIL ADDRESS"]).trim().toLowerCase()
        : normalized,
  };
}

export async function createMainRosterRecord(
  fields: Record<string, unknown>
): Promise<unknown> {
  const res = await airtableFetch(rosterRecordsUrl(), {
    method: "POST",
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Airtable create error (${res.status}): ${text || res.statusText}`);
  }
  return res.json();
}

export async function updateMainRosterRecord(
  recordId: string,
  fields: Record<string, unknown>
): Promise<unknown> {
  const url = `${rosterRecordsUrl()}/${encodeURIComponent(recordId)}`;
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

export async function upsertMainRosterByEmail(
  email: string,
  fields: Record<string, unknown>
): Promise<{ action: "created" | "updated"; record: unknown }> {
  const existing = await findMainRosterRecordByEmail(email);
  if (existing?.id) {
    const record = await updateMainRosterRecord(existing.id, fields);
    return { action: "updated", record };
  }
  const record = await createMainRosterRecord(fields);
  return { action: "created", record };
}
