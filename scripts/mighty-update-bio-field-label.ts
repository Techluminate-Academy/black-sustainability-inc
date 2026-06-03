/**
 * Rename the Mighty bio custom field label (default: Extended Bio).
 * Does not change MIGHTY_BIO_CUSTOM_FIELD_ID — only the title members see in Mighty.
 *
 * Usage:
 *   npx tsx scripts/mighty-update-bio-field-label.ts
 *   npx tsx scripts/mighty-update-bio-field-label.ts --apply
 *   MIGHTY_BIO_FIELD_TITLE="Extended Bio" npx tsx scripts/mighty-update-bio-field-label.ts --apply
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

async function main() {
  const apply = process.argv.includes("--apply");
  const networkId = requireEnv("MIGHTY_NETWORK_ID");
  const fieldIdRaw = process.env.MIGHTY_BIO_CUSTOM_FIELD_ID;
  if (!fieldIdRaw) {
    throw new Error("MIGHTY_BIO_CUSTOM_FIELD_ID is not configured");
  }
  const fieldId = Number(fieldIdRaw);
  if (!Number.isFinite(fieldId)) {
    throw new Error(`Invalid MIGHTY_BIO_CUSTOM_FIELD_ID: ${fieldIdRaw}`);
  }

  const title = (process.env.MIGHTY_BIO_FIELD_TITLE || "Extended Bio").trim() || "Extended Bio";
  const url = `${getBaseUrl()}/admin/v1/networks/${encodeURIComponent(networkId)}/custom_fields/${fieldId}/`;

  const getRes = await fetch(url, {
    headers: { Authorization: `Bearer ${getApiKey()}`, Accept: "application/json" },
  });
  const beforeText = await getRes.text();
  if (!getRes.ok) {
    throw new Error(`GET custom field failed (${getRes.status}): ${beforeText.slice(0, 300)}`);
  }
  const before = JSON.parse(beforeText) as { id?: number; title?: string };
  console.log(JSON.stringify({ msg: "current_field", id: before.id, title: before.title }));

  if (!apply) {
    console.log(
      JSON.stringify({
        msg: "dry_run",
        wouldSetTitle: title,
        hint: "Re-run with --apply to update the Mighty custom field label.",
      })
    );
    return;
  }

  const putRes = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ title }),
  });
  const putText = await putRes.text();
  if (!putRes.ok) {
    throw new Error(`PUT custom field failed (${putRes.status}): ${putText.slice(0, 300)}`);
  }
  const after = JSON.parse(putText) as { id?: number; title?: string };
  console.log(JSON.stringify({ msg: "updated_field", id: after.id, title: after.title }));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
