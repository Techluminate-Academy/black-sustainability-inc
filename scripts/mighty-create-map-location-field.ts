import "dotenv/config";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}

function getBaseUrl(): string {
  return (process.env.MIGHTY_ADMIN_API_BASE_URL || "https://api.mn.co").replace(/\/$/, "");
}

function getApiKey(): string {
  const v = process.env.MIGHTY_API_KEY || process.env.MIGHTY_NETWORK_API_KEY;
  if (!v) throw new Error("MIGHTY_API_KEY or MIGHTY_NETWORK_API_KEY is not configured");
  return v;
}

async function fetchJson(url: string, init: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text().catch(() => "");
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`Mighty API error (${res.status}): ${text || res.statusText}`);
  }
  return json;
}

type CustomField = { id: number; title: string; response_type?: string };

async function listAllCustomFields(networkId: string): Promise<CustomField[]> {
  const out: CustomField[] = [];
  let page = 1;
  for (;;) {
    const url = `${getBaseUrl()}/admin/v1/networks/${encodeURIComponent(networkId)}/custom_fields?per_page=100&page=${page}`;
    const json: any = await fetchJson(url, { method: "GET" });
    const items: any[] = json?.custom_fields || json?.items || json?.data || [];
    out.push(
      ...items
        .map((x) => ({
          id: Number(x.id),
          title: String(x.title || ""),
          response_type: x.response_type,
        }))
        .filter((x) => Number.isFinite(x.id) && x.title)
    );
    // Heuristic: stop when fewer than requested.
    if (!Array.isArray(items) || items.length < 100) break;
    page++;
    if (page > 50) break;
  }
  return out;
}

async function createCustomField(networkId: string, title: string): Promise<CustomField> {
  const url = `${getBaseUrl()}/admin/v1/networks/${encodeURIComponent(networkId)}/custom_fields`;
  const body = {
    title,
    description: "Location used for BSN Member Map geocoding.",
    placeholder: "Start typing your city…",
    response_type: "text_short",
    // NOTE: Mighty rejects some privacy/response_by combinations.
    // "public"+"individual_member" is accepted for this network.
    privacy: "public",
    response_by: "individual_member",
  };
  const json: any = await fetchJson(url, { method: "POST", body: JSON.stringify(body) });
  const field = json?.custom_field || json;
  return { id: Number(field?.id), title: String(field?.title || title), response_type: field?.response_type };
}

async function main() {
  const networkId = requireEnv("MIGHTY_NETWORK_ID");
  const title = process.env.MIGHTY_MAP_LOCATION_FIELD_TITLE || "Map Location";

  const existing = (await listAllCustomFields(networkId)).find(
    (f) => f.title.trim().toLowerCase() === title.trim().toLowerCase()
  );
  if (existing) {
    console.log(`✅ Custom field already exists: "${existing.title}" (id=${existing.id})`);
    return;
  }

  const created = await createCustomField(networkId, title);
  console.log(`✅ Created custom field: "${created.title}" (id=${created.id})`);
  console.log(`Next: set env MIGHTY_MAP_LOCATION_CUSTOM_FIELD_ID=${created.id}`);
}

main().catch((e) => {
  console.error("❌ Failed to create custom field:", e?.message || e);
  process.exitCode = 1;
});

