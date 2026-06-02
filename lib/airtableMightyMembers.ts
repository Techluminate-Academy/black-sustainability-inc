import { getMemberBioFromAirtableFields } from "@/lib/memberBio";

type AirtableRecord = {
  id: string;
  fields: Record<string, any>;
};

export type AirtableMightyMemberLookup = {
  recordId: string;
  mightyId: number | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  location: string | null;
  bio: string | null;
  subscriptionStatuses: string[];
};

function getAirtableApiKey(): string | null {
  return (
    process.env.AIRTABLE_PAT ||
    process.env.AIRTABLE_ACCESS_TOKEN ||
    process.env.NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN ||
    null
  );
}

function getBaseId(): string | null {
  return process.env.AIRTABLE_MIGHTY_SYNC_BASE_ID || process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || null;
}

function getTableNameOrId(): string | null {
  return (
    process.env.AIRTABLE_MIGHTY_SYNC_TABLE_ID ||
    process.env.AIRTABLE_MIGHTY_SYNC_TABLE_NAME ||
    process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME ||
    "Mighty Members"
  );
}

export function airtableEnabled(): boolean {
  // If env vars exist, we sync by default.
  // Optionally allow explicit disabling.
  if (process.env.AIRTABLE_MIGHTY_WEBHOOK_SYNC === "0") return false;
  return Boolean(getAirtableApiKey() && getBaseId() && getTableNameOrId());
}

export type MightySyncTableConfig = {
  apiKey: string;
  baseId: string;
  table: string;
};

export function getMightySyncTableConfig(): MightySyncTableConfig | null {
  const apiKey = getAirtableApiKey();
  const baseId = getBaseId();
  const table = getTableNameOrId();
  if (!apiKey || !baseId || !table) return null;
  return { apiKey, baseId, table };
}

/** Checkbox + optional metadata for client migration unsubscribe outreach. */
export function getAirtableMigrationExcludedFieldName(): string {
  return (process.env.AIRTABLE_MIGRATION_EXCLUDED_FIELD || "Migration Excluded").trim();
}

export function getAirtableMigrationExcludedAtFieldName(): string | null {
  const name = (process.env.AIRTABLE_MIGRATION_EXCLUDED_AT_FIELD || "Migration Excluded At").trim();
  return name.length ? name : null;
}

export function getAirtableMigrationExcludedReasonFieldName(): string | null {
  const name = (process.env.AIRTABLE_MIGRATION_EXCLUDED_REASON_FIELD || "Migration Excluded Reason").trim();
  return name.length ? name : null;
}

export function buildMigrationExcludedAirtableFields(params?: {
  reason?: string;
  flaggedAt?: Date;
}): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  const flagField = getAirtableMigrationExcludedFieldName();
  if (flagField) fields[flagField] = true;

  const atField = getAirtableMigrationExcludedAtFieldName();
  if (atField) fields[atField] = (params?.flaggedAt ?? new Date()).toISOString();

  const reasonField = getAirtableMigrationExcludedReasonFieldName();
  if (reasonField) {
    fields[reasonField] =
      params?.reason?.trim() || "client-excluded-email-blast-list";
  }
  return fields;
}

export async function patchAirtableMightyMemberByRecordId(
  recordId: string,
  fields: Record<string, unknown>
): Promise<void> {
  const cfg = getMightySyncTableConfig();
  if (!cfg) throw new Error("Airtable Mighty sync not configured");
  if (!recordId?.trim()) throw new Error("recordId required");
  if (!Object.keys(fields).length) throw new Error("fields required");

  const baseUrl = `https://api.airtable.com/v0/${encodeURIComponent(cfg.baseId)}/${encodeURIComponent(cfg.table)}`;
  await airtableFetchJson(baseUrl, {
    method: "PATCH",
    body: JSON.stringify({ records: [{ id: recordId, fields }] }),
  });
}

export type MightySyncRowMissingMemberId = {
  recordId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

export async function fetchMightySyncRowsMissingMemberId(opts?: {
  includeBlankEmail?: boolean;
}): Promise<{ rows: MightySyncRowMissingMemberId[] }> {
  const cfg = getMightySyncTableConfig();
  if (!cfg) return { rows: [] };

  const formula = opts?.includeBlankEmail
    ? "{Mighty Member ID} = BLANK()"
    : 'AND({Primary Email} != "", {Mighty Member ID} = BLANK())';

  const tableEnc = encodeURIComponent(cfg.table);
  const baseUrl = `https://api.airtable.com/v0/${encodeURIComponent(cfg.baseId)}/${tableEnc}`;
  const rows: MightySyncRowMissingMemberId[] = [];
  let offset: string | undefined;

  do {
    const q = new URLSearchParams({
      pageSize: "100",
      filterByFormula: formula,
    });
    if (offset) q.set("offset", offset);
    const data = (await airtableFetchJson(`${baseUrl}?${q.toString()}`, { method: "GET" })) as {
      records?: AirtableRecord[];
      offset?: string;
    };
    for (const r of data.records ?? []) {
      const f = r.fields || {};
      rows.push({
        recordId: r.id,
        email: typeof f["Primary Email"] === "string" ? f["Primary Email"] : null,
        firstName: typeof f["First Name"] === "string" ? f["First Name"] : null,
        lastName: typeof f["Last Name"] === "string" ? f["Last Name"] : null,
      });
    }
    offset = data.offset;
  } while (offset);

  return { rows };
}

function normalizeEmail(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const e = v.trim().toLowerCase();
  return e ? e : null;
}

function buildFindFormula(params: { mightyId?: number; email?: string | null }): string | null {
  if (typeof params.mightyId === "number" && Number.isFinite(params.mightyId)) {
    // Field name must match your Airtable column.
    return `{Mighty Member ID} = ${params.mightyId}`;
  }
  const email = normalizeEmail(params.email);
  if (email) {
    // Compare case-insensitively.
    return `LOWER({Primary Email}) = "${email.replace(/"/g, '\\"')}"`;
  }
  return null;
}

async function airtableFetchJson(url: string, init: RequestInit) {
  const apiKey = getAirtableApiKey();
  if (!apiKey) throw new Error("Missing Airtable API key");

  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Airtable API error (${res.status}): ${text || res.statusText}`);
  }
  return res.json();
}

function getAirtableOrganizationFieldName(): string | null {
  const name = (process.env.AIRTABLE_MIGHTY_ORG_FIELD || "Organization").trim();
  return name.length ? name : null;
}

function pickAirtableFields(member: {
  mightyId?: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  organizationName?: string;
  accountStatus?: string;
  latitude?: number | null;
  longitude?: number | null;
  subscription?: {
    isPaidActive?: boolean;
    planNames?: string[];
    planIds?: string[];
    statuses?: string[];
    updatedAt?: string;
  };
}): Record<string, any> {
  // Keep this mapping conservative to avoid schema mismatch failures.
  const fields: Record<string, any> = {};

  if (typeof member.mightyId === "number" && Number.isFinite(member.mightyId)) {
    fields["Mighty Member ID"] = member.mightyId;
  }
  if (member.email) fields["Primary Email"] = member.email;
  if (member.firstName) fields["First Name"] = member.firstName;
  if (member.lastName) fields["Last Name"] = member.lastName;
  if (member.avatarUrl) fields["Profile Photo URL"] = member.avatarUrl;
  if (member.bio) fields["Short Bio"] = member.bio;
  if (member.location) fields["City"] = member.location;
  const orgField = getAirtableOrganizationFieldName();
  if (orgField && member.organizationName) fields[orgField] = member.organizationName;

  // Coordinates (column names can vary; allow overrides).
  const latField = process.env.AIRTABLE_COORD_LAT_FIELD || "Latitude";
  const lngField = process.env.AIRTABLE_COORD_LNG_FIELD || "Longitude";
  if (typeof member.latitude === "number" && Number.isFinite(member.latitude)) fields[latField] = member.latitude;
  if (typeof member.longitude === "number" && Number.isFinite(member.longitude)) fields[lngField] = member.longitude;

  // Optional subscription fields (only if your Airtable has these exact columns).
  if (typeof member.subscription?.isPaidActive === "boolean") fields["isPaidActive"] = member.subscription.isPaidActive;
  if (Array.isArray(member.subscription?.planNames) && member.subscription!.planNames!.length)
    fields["planNames"] = member.subscription!.planNames!;
  if (Array.isArray(member.subscription?.planIds) && member.subscription!.planIds!.length)
    fields["planIds"] = member.subscription!.planIds!;
  if (Array.isArray(member.subscription?.statuses) && member.subscription!.statuses!.length)
    fields["subscriptionStatuses"] = member.subscription!.statuses!;
  if (member.subscription?.updatedAt) fields["subscriptionUpdatedAt"] = member.subscription.updatedAt;

  return fields;
}

export async function findAirtableMightyMemberByEmail(
  email: string
): Promise<AirtableMightyMemberLookup | null> {
  if (!airtableEnabled()) return null;
  const baseId = getBaseId();
  const table = getTableNameOrId();
  if (!baseId || !table) return null;

  const formula = buildFindFormula({ email });
  if (!formula) return null;

  const tableEncoded = encodeURIComponent(table);
  const baseUrl = `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${tableEncoded}`;
  const searchUrl = `${baseUrl}?maxRecords=1&filterByFormula=${encodeURIComponent(formula)}`;
  const search = (await airtableFetchJson(searchUrl, { method: "GET" })) as { records: AirtableRecord[] };
  const r = search.records?.[0];
  if (!r?.id) return null;

  const f = r.fields || {};
  const mightyIdRaw = f["Mighty Member ID"];
  const mightyId =
    typeof mightyIdRaw === "number"
      ? mightyIdRaw
      : typeof mightyIdRaw === "string" && mightyIdRaw.trim() !== ""
        ? Number(mightyIdRaw)
        : null;

  const statusesRaw = f["subscriptionStatuses"];
  const subscriptionStatuses = Array.isArray(statusesRaw)
    ? statusesRaw.filter((s): s is string => typeof s === "string")
    : typeof statusesRaw === "string" && statusesRaw.trim()
      ? [statusesRaw]
      : [];

  return {
    recordId: r.id,
    mightyId: typeof mightyId === "number" && Number.isFinite(mightyId) ? mightyId : null,
    email: typeof f["Primary Email"] === "string" ? f["Primary Email"] : null,
    firstName: typeof f["First Name"] === "string" ? f["First Name"] : null,
    lastName: typeof f["Last Name"] === "string" ? f["Last Name"] : null,
    location: typeof f["City"] === "string" ? f["City"] : null,
    bio: getMemberBioFromAirtableFields(f),
    subscriptionStatuses,
  };
}

export async function upsertAirtableMightyMember(member: {
  mightyId?: number;
  email?: string | null;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  organizationName?: string;
  accountStatus?: string;
  latitude?: number | null;
  longitude?: number | null;
  subscription?: {
    isPaidActive?: boolean;
    planNames?: string[];
    planIds?: string[];
    statuses?: string[];
    updatedAt?: string;
  };
}): Promise<{ skipped: boolean; action?: "created" | "updated"; recordId?: string }> {
  if (!airtableEnabled()) return { skipped: true };

  const baseId = getBaseId();
  const table = getTableNameOrId();
  if (!baseId || !table) return { skipped: true };

  const formula = buildFindFormula({ mightyId: member.mightyId, email: member.email });
  if (!formula) return { skipped: true };

  const tableEncoded = encodeURIComponent(table);
  const baseUrl = `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${tableEncoded}`;

  const searchUrl = `${baseUrl}?maxRecords=1&filterByFormula=${encodeURIComponent(formula)}`;
  const search = (await airtableFetchJson(searchUrl, { method: "GET" })) as { records: AirtableRecord[] };
  const existing = search.records?.[0];

  const fields = pickAirtableFields({
    ...member,
    email: normalizeEmail(member.email) || undefined,
  });

  if (!Object.keys(fields).length) return { skipped: true };

  if (existing?.id) {
    const updateUrl = `${baseUrl}`;
    await airtableFetchJson(updateUrl, {
      method: "PATCH",
      body: JSON.stringify({ records: [{ id: existing.id, fields }] }),
    });
    return { skipped: false, action: "updated", recordId: existing.id };
  }

  const createUrl = `${baseUrl}`;
  const created = (await airtableFetchJson(createUrl, {
    method: "POST",
    body: JSON.stringify({ records: [{ fields }] }),
  })) as { records: AirtableRecord[] };

  return { skipped: false, action: "created", recordId: created.records?.[0]?.id };
}

