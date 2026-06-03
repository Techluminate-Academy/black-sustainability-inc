/**
 * Airtable Metadata API (schema read/write).
 * Requires PAT scopes: schema.bases:read, schema.bases:write (base creator role).
 */

export type AirtableMetaField = {
  id: string;
  name: string;
  type: string;
};

export type AirtableMetaTable = {
  id: string;
  name: string;
  fields: AirtableMetaField[];
};

export type CreateAirtableFieldSpec = {
  name: string;
  type: string;
  description?: string;
  options?: Record<string, unknown>;
};

function getMetaApiKey(): string | null {
  return (
    process.env.AIRTABLE_PAT ||
    process.env.AIRTABLE_ACCESS_TOKEN ||
    process.env.AIRTABLE_API_KEY ||
    process.env.NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN ||
    null
  );
}

async function metaFetchJson(url: string, init: RequestInit): Promise<unknown> {
  const apiKey = getMetaApiKey();
  if (!apiKey) throw new Error("Missing Airtable API key (AIRTABLE_PAT or AIRTABLE_ACCESS_TOKEN)");

  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const text = await res.text().catch(() => "");
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }

  if (!res.ok) {
    const err = json as { error?: { type?: string; message?: string } };
    const detail = err?.error?.message || text || res.statusText;
    throw new Error(`Airtable Meta API error (${res.status}): ${detail}`);
  }
  return json;
}

export async function fetchAirtableBaseTables(baseId: string): Promise<AirtableMetaTable[]> {
  const url = `https://api.airtable.com/v0/meta/bases/${encodeURIComponent(baseId)}/tables`;
  const data = (await metaFetchJson(url, { method: "GET" })) as { tables?: AirtableMetaTable[] };
  return data.tables ?? [];
}

export function resolveAirtableTable(
  tables: AirtableMetaTable[],
  tableIdOrName: string
): AirtableMetaTable | null {
  const key = tableIdOrName.trim();
  if (!key) return null;
  return (
    tables.find((t) => t.id === key) ??
    tables.find((t) => t.name.toLowerCase() === key.toLowerCase()) ??
    null
  );
}

export type UpdateAirtableFieldPatch = {
  name?: string;
  description?: string;
  options?: Record<string, unknown>;
};

export async function updateAirtableTableField(
  baseId: string,
  tableId: string,
  fieldId: string,
  patch: UpdateAirtableFieldPatch
): Promise<AirtableMetaField> {
  const body: Record<string, unknown> = {};
  if (patch.name?.trim()) body.name = patch.name.trim();
  if (patch.description !== undefined) body.description = patch.description;
  if (patch.options && Object.keys(patch.options).length) body.options = patch.options;

  if (!Object.keys(body).length) {
    throw new Error("updateAirtableTableField requires at least one of name, description, or options");
  }

  const url = `https://api.airtable.com/v0/meta/bases/${encodeURIComponent(baseId)}/tables/${encodeURIComponent(tableId)}/fields/${encodeURIComponent(fieldId)}`;
  const updated = (await metaFetchJson(url, {
    method: "PATCH",
    body: JSON.stringify(body),
  })) as AirtableMetaField;

  return {
    id: updated.id,
    name: updated.name,
    type: updated.type,
  };
}

export async function renameAirtableTableFieldByName(params: {
  baseId: string;
  tableIdOrName: string;
  fromName: string;
  toName: string;
  dryRun?: boolean;
}): Promise<
  | { action: "renamed"; fieldId: string; fromName: string; toName: string }
  | { action: "already_named"; fieldId: string; name: string }
  | { action: "would_rename"; fieldId: string; fromName: string; toName: string }
  | { action: "not_found"; fromName: string }
  | { action: "conflict"; toName: string; existingFieldId: string }
> {
  const from = params.fromName.trim();
  const to = params.toName.trim();
  if (!from || !to) throw new Error("fromName and toName are required");
  if (from.toLowerCase() === to.toLowerCase()) {
    const tables = await fetchAirtableBaseTables(params.baseId);
    const table = resolveAirtableTable(tables, params.tableIdOrName);
    if (!table) {
      throw new Error(`Table not found: ${params.tableIdOrName}`);
    }
    const hit = table.fields.find((f) => f.name.toLowerCase() === from.toLowerCase());
    if (!hit) return { action: "not_found", fromName: from };
    return { action: "already_named", fieldId: hit.id, name: hit.name };
  }

  const tables = await fetchAirtableBaseTables(params.baseId);
  const table = resolveAirtableTable(tables, params.tableIdOrName);
  if (!table) {
    throw new Error(
      `Table not found in base ${params.baseId}: ${params.tableIdOrName}. Tables: ${tables.map((t) => t.name).join(", ")}`
    );
  }

  const source = table.fields.find((f) => f.name.toLowerCase() === from.toLowerCase());
  if (!source) return { action: "not_found", fromName: from };

  const targetHit = table.fields.find((f) => f.name.toLowerCase() === to.toLowerCase());
  if (targetHit && targetHit.id !== source.id) {
    return { action: "conflict", toName: to, existingFieldId: targetHit.id };
  }

  if (source.name === to) {
    return { action: "already_named", fieldId: source.id, name: source.name };
  }

  if (params.dryRun) {
    return { action: "would_rename", fieldId: source.id, fromName: source.name, toName: to };
  }

  const updated = await updateAirtableTableField(params.baseId, table.id, source.id, { name: to });
  return {
    action: "renamed",
    fieldId: updated.id,
    fromName: source.name,
    toName: updated.name,
  };
}

export async function createAirtableTableField(
  baseId: string,
  tableId: string,
  spec: CreateAirtableFieldSpec
): Promise<AirtableMetaField> {
  const url = `https://api.airtable.com/v0/meta/bases/${encodeURIComponent(baseId)}/tables/${encodeURIComponent(tableId)}/fields`;
  const body: Record<string, unknown> = {
    name: spec.name,
    type: spec.type,
  };
  if (spec.description?.trim()) body.description = spec.description.trim();
  if (spec.options && Object.keys(spec.options).length) body.options = spec.options;

  const created = (await metaFetchJson(url, {
    method: "POST",
    body: JSON.stringify(body),
  })) as AirtableMetaField;

  return {
    id: created.id,
    name: created.name,
    type: created.type,
  };
}

export async function ensureAirtableTableFields(params: {
  baseId: string;
  tableIdOrName: string;
  specs: CreateAirtableFieldSpec[];
  dryRun?: boolean;
  sleepMs?: number;
}): Promise<
  Array<{
    name: string;
    action: "exists" | "created" | "would_create" | "error";
    fieldId?: string;
    error?: string;
  }>
> {
  const tables = await fetchAirtableBaseTables(params.baseId);
  const table = resolveAirtableTable(tables, params.tableIdOrName);
  if (!table) {
    throw new Error(
      `Table not found in base ${params.baseId}: ${params.tableIdOrName}. Tables: ${tables.map((t) => t.name).join(", ")}`
    );
  }

  const existingByName = new Map(table.fields.map((f) => [f.name.toLowerCase(), f]));
  const results: Array<{
    name: string;
    action: "exists" | "created" | "would_create" | "error";
    fieldId?: string;
    error?: string;
  }> = [];

  for (const spec of params.specs) {
    const hit = existingByName.get(spec.name.toLowerCase());
    if (hit) {
      results.push({ name: spec.name, action: "exists", fieldId: hit.id });
      continue;
    }

    if (params.dryRun) {
      results.push({ name: spec.name, action: "would_create" });
      continue;
    }

    try {
      const created = await createAirtableTableField(params.baseId, table.id, spec);
      existingByName.set(spec.name.toLowerCase(), created);
      results.push({ name: spec.name, action: "created", fieldId: created.id });
      if (params.sleepMs && params.sleepMs > 0) {
        await new Promise((r) => setTimeout(r, params.sleepMs));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ name: spec.name, action: "error", error: msg });
    }
  }

  return results;
}
