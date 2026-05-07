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

function airtableEnabled(): boolean {
  // If env vars exist, we sync by default.
  // Optionally allow explicit disabling.
  if (process.env.AIRTABLE_MIGHTY_WEBHOOK_SYNC === "0") return false;
  return Boolean(getAirtableApiKey() && getBaseId() && getTableNameOrId());
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

function pickAirtableFields(member: {
  mightyId?: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
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

  return {
    recordId: r.id,
    mightyId: typeof mightyId === "number" && Number.isFinite(mightyId) ? mightyId : null,
    email: typeof f["Primary Email"] === "string" ? f["Primary Email"] : null,
    firstName: typeof f["First Name"] === "string" ? f["First Name"] : null,
    lastName: typeof f["Last Name"] === "string" ? f["Last Name"] : null,
    location: typeof f["City"] === "string" ? f["City"] : null,
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

