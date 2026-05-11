/**
 * Server-only Airtable access for free-signup / public form flows.
 * Prefer AIRTABLE_PAT (or AIRTABLE_ACCESS_TOKEN) over NEXT_PUBLIC_* on the server.
 */

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

export type FreeSignupFieldMeta = {
  fieldName: string;
  fieldType: string;
  options: Array<{ id: string; name: string; icon: unknown }>;
};

export async function fetchFreeSignupTableFieldMetadata(): Promise<FreeSignupFieldMeta[]> {
  const baseId = getBaseId();
  const tableName = getTableName();
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

  return (targetTable.fields as any[]).map((field: any) => {
    let options: Array<{ id: string; name: string; icon: unknown }> = [];
    if (field.type === "singleSelect" || field.type === "multipleSelects") {
      options = (field.options?.choices || [])
        .filter((choice: any) => choice.name && String(choice.name).trim() !== "")
        .map((choice: any) => ({
          id: choice.id,
          name: choice.name,
          icon: choice.icon || null,
        }));
      if (field.name === "GENDER") {
        options = options.filter(
          (choice) => choice.name !== "Uganda" && choice.name !== "GENDER"
        );
      }
      if (field.name === "Name (from Location)") {
        options = options.filter((choice) => choice.name !== "Name (from Location)");
      }
    }
    return {
      fieldName: field.name,
      fieldType: field.type,
      options,
    };
  });
}

export async function createFreeSignupRecord(fields: Record<string, unknown>): Promise<unknown> {
  const baseId = getBaseId();
  const tableName = getTableName();
  const url = `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(tableName)}`;
  const res = await airtableFetch(url, {
    method: "POST",
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Airtable create error (${res.status}): ${text || res.statusText}`);
  }
  return res.json();
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
