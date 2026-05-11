/**
 * Client-safe Airtable access for free signup: calls server-only API routes
 * so tokens are not required in the browser bundle.
 */

function apiBase(): string {
  if (typeof window !== "undefined") return "";
  const site = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL;
  if (site) {
    const u = site.startsWith("http") ? site : `https://${site}`;
    return u.replace(/\/$/, "");
  }
  return "";
}

async function parseJsonResponse(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

const submitToAirtable = async (dataToSubmit: Record<string, unknown>) => {
  const res = await fetch(`${apiBase()}/api/airtable/free-signup-record`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: dataToSubmit }),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(data?.error || "Failed to submit data to Airtable.");
  }
  return data;
};

export const fetchTableMetadata = async () => {
  const res = await fetch(`${apiBase()}/api/airtable/free-signup-metadata`);
  const data = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(data?.error || "Failed to fetch Airtable metadata.");
  }
  return data as Array<{
    fieldName: string;
    fieldType: string;
    options: Array<{ id: string; name: string; icon: unknown }>;
  }>;
};

const updateRecord = async (
  recordId: string,
  dataToUpdate: Record<string, unknown>,
  ownerEmail: string
) => {
  const res = await fetch(`${apiBase()}/api/airtable/free-signup-record`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recordId, ownerEmail, fields: dataToUpdate }),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(data?.error || "Failed to update data in Airtable.");
  }
  return data;
};

export default {
  fetchTableMetadata,
  submitToAirtable,
  updateRecord,
};
