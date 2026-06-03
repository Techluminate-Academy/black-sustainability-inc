/**
 * Find or create the Mighty "Extended Bio" custom field for map profile sync.
 *
 * Run: npx tsx scripts/mighty-create-bio-field.ts
 * Then set MIGHTY_BIO_CUSTOM_FIELD_ID in .env from the printed id.
 */
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
    const json: Record<string, unknown> = await fetchJson(url, { method: "GET" });
    const items = (json?.custom_fields || json?.items || json?.data || []) as Record<string, unknown>[];
    out.push(
      ...items
        .map((x) => ({
          id: Number(x.id),
          title: String(x.title || ""),
          response_type: x.response_type as string | undefined,
        }))
        .filter((x) => Number.isFinite(x.id) && x.title)
    );
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
    description: "Extended bio shown on the BSN member map and directory.",
    placeholder: "Tell members about yourself…",
    response_type: "text_long",
    privacy: "public",
    response_by: "individual_member",
  };
  const json: Record<string, unknown> = await fetchJson(url, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const field = (json?.custom_field || json) as Record<string, unknown>;
  return {
    id: Number(field?.id),
    title: String(field?.title || title),
    response_type: field?.response_type as string | undefined,
  };
}

async function main() {
  const networkId = requireEnv("MIGHTY_NETWORK_ID");
  const preferredTitle = process.env.MIGHTY_BIO_FIELD_TITLE || "Extended Bio";
  const aliasTitles = [
    preferredTitle,
    "Extended Bio",
    "Short Bio",
    "Bio",
    "BSN Bio",
    "Member Bio",
  ].map((t) => t.trim().toLowerCase());
  const uniqueAliases = [...new Set(aliasTitles)];

  const all = await listAllCustomFields(networkId);
  console.log(`Network ${networkId} — ${all.length} custom field(s) on file:\n`);
  for (const f of all) {
    console.log(`  ${f.id}\t${f.title}\t${f.response_type ?? ""}`);
  }

  const existing =
    all.find((f) => uniqueAliases.includes(f.title.trim().toLowerCase())) ||
    all.find((f) => /bio/i.test(f.title) && f.response_type !== "dropdown_single_select");

  if (existing) {
    console.log(`\n✅ Use existing bio field: "${existing.title}" (id=${existing.id})`);
    console.log(`MIGHTY_BIO_CUSTOM_FIELD_ID=${existing.id}`);
    return;
  }

  const created = await createCustomField(networkId, preferredTitle);
  console.log(`\n✅ Created custom field: "${created.title}" (id=${created.id})`);
  console.log(`MIGHTY_BIO_CUSTOM_FIELD_ID=${created.id}`);
}

main().catch((e) => {
  console.error("❌ Failed:", (e as Error).message);
  process.exitCode = 1;
});
