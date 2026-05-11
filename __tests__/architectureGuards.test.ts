import fs from "node:fs";
import path from "node:path";

/**
 * Guardrails: billing/map modules must not depend on legacy Wix reconciliation.
 */
function walkTsFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walkTsFiles(full, out);
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".test.ts") && !name.endsWith(".test.tsx")) {
      out.push(full);
    }
  }
  return out;
}

describe("architecture guards", () => {
  const root = path.join(__dirname, "..");

  it("lib/domain/billing does not import Wix reconciliation (when present)", () => {
    const billingDir = path.join(root, "lib", "domain", "billing");
    if (!fs.existsSync(billingDir)) return;
    const files = walkTsFiles(billingDir);
    const banned = ["lib/wix", "reconciliation/wix", "aggregateWix", "wixAuthority"];
    for (const file of files) {
      const src = fs.readFileSync(file, "utf8");
      for (const b of banned) {
        expect(src).not.toContain(b);
      }
    }
  });

  it("wix-airtable-sync-apply documents ALLOW_WIX_AIRTABLE_APPLY gate", () => {
    const p = path.join(root, "scripts", "wix-airtable-sync-apply.ts");
    const src = fs.readFileSync(p, "utf8");
    expect(src).toContain("ALLOW_WIX_AIRTABLE_APPLY");
    expect(src).toContain('process.env.ALLOW_WIX_AIRTABLE_APPLY !== "1"');
  });
});
