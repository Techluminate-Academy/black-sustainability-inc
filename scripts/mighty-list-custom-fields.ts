/**
 * List Mighty network custom profile fields (id + title).
 * Use the id for MIGHTY_BIO_CUSTOM_FIELD_ID, MIGHTY_ORGANIZATION_CUSTOM_FIELD_ID, etc.
 *
 * Run: npx tsx scripts/mighty-list-custom-fields.ts
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

async function fetchJson(url: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${getApiKey()}`, Accept: "application/json" },
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`Mighty API error (${res.status}): ${text || res.statusText}`);
  return text ? JSON.parse(text) : {};
}

async function main() {
  const networkId = requireEnv("MIGHTY_NETWORK_ID");
  const base = getBaseUrl();
  const all: { id: number; title: string; response_type?: string }[] = [];

  for (let page = 1; page <= 20; page++) {
    const url = `${base}/admin/v1/networks/${encodeURIComponent(networkId)}/custom_fields?per_page=100&page=${page}`;
    const json = await fetchJson(url);
    const items: unknown[] = json?.custom_fields || json?.items || json?.data || [];
    if (!Array.isArray(items) || items.length === 0) break;
    for (const x of items as Record<string, unknown>[]) {
      const id = Number(x.id);
      const title = String(x.title || "").trim();
      if (Number.isFinite(id) && title) {
        all.push({ id, title, response_type: x.response_type as string | undefined });
      }
    }
    if (items.length < 100) break;
  }

  if (!all.length) {
    console.log("No custom fields returned.");
    return;
  }

  console.log(`Network ${networkId} — ${all.length} custom field(s):\n`);
  for (const f of all) {
    console.log(`  ${f.id}\t${f.title}\t${f.response_type ?? ""}`);
  }

  const bioLike = all.filter((f) => /bio|about/i.test(f.title));
  if (bioLike.length) {
    console.log("\nSuggested for MIGHTY_BIO_CUSTOM_FIELD_ID:");
    for (const f of bioLike) {
      if (f.response_type === "text_short" || f.response_type === "text_long" || !f.response_type) {
        console.log(`  MIGHTY_BIO_CUSTOM_FIELD_ID=${f.id}  # ${f.title}`);
      }
    }
  }
}

main().catch((e) => {
  console.error("❌", (e as Error).message);
  process.exitCode = 1;
});
