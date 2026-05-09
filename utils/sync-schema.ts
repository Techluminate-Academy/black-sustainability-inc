// utils/sync-schema.ts
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

//
// 1️⃣ Re-declare the shape of your form config
//
interface Option {
  label: string;
  value: string;
}

interface FieldConfig {
  id: string;
  name: string;
  type: 
    | "text"
    | "email"
    | "url"
    | "textarea"
    | "file"
    | "dropdown"
    | "phone"
    | "checkbox"
    | "address";
  label: string;
  required: boolean;
  options?: Option[];
}

interface FormConfig {
  version: number;
  updatedAt: string;
  status: string;
  fields: FieldConfig[];
}

//
// 2️⃣ Airtable metadata credentials
//
const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID!;
const TABLE_ID = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME!;
const META_TOKEN = process.env.AIRTABLE_METADATA_TOKEN!; // needs metadata perms

//
// 3️⃣ Diff & sync function
//
async function syncSchema(oldCfg: FormConfig, newCfg: FormConfig) {
  // fetch existing fields
  const metaRes = await fetch(
    `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables/${TABLE_ID}/fields`,
    {
      headers: {
        Authorization: `Bearer ${META_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
  if (!metaRes.ok) throw new Error(await metaRes.text());
  const { fields: existing } = (await metaRes.json()) as {
    fields: { id: string; name: string }[];
  };

  // compute differences
  const oldNames = oldCfg.fields.map((f) => f.label);
  const newNames = newCfg.fields.map((f) => f.label);

  const toAdd = newCfg.fields.filter((f) => !oldNames.includes(f.label));
  const toRemove = existing.filter((f) => !newNames.includes(f.name));

  // type map
  const typeMap: Record<string, string> = {
    text: "singleLineText",
    textarea: "longText",
    email: "email",
    url: "url",
    phone: "phoneNumber",
    checkbox: "checkbox",
    dropdown: "singleSelect",
    address: "longText",
    file: "multipleAttachment",
  };

  // add columns
  for (const f of toAdd) {
    console.log(`→ creating column "${f.label}"`);
    await fetch(
      `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables/${TABLE_ID}/fields`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${META_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: f.label,
          type: typeMap[f.type] || "singleLineText",
          options:
            f.type === "dropdown" && f.options
              ? {
                  choices: {
                    choices: f.options.map((o) => ({
                      name: o.label,
                      id: o.value,
                    })),
                  },
                }
              : undefined,
        }),
      }
    ).then((r) => {
      if (!r.ok) throw new Error(`Add failed: ${r.statusText}`);
    });
  }

  // remove columns
  for (const f of toRemove) {
    console.log(`→ deleting column "${f.name}"`);
    await fetch(
      `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables/${TABLE_ID}/fields/${f.id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${META_TOKEN}` },
      }
    ).then((r) => {
      if (!r.ok) throw new Error(`Delete failed: ${r.statusText}`);
    });
  }

  console.log("✅ schema sync complete");
}

//
// 4️⃣ Main runner
//
;(async () => {
  try {
    // fetch v1 and v2 from your Next.js API
    const [oldV, newV] = await Promise.all([
      fetch("http://localhost:3000/api/form-versions?version=1").then((r) => r.json()),
      fetch("http://localhost:3000/api/form-versions?version=2").then((r) => r.json()),
    ]) as [FormConfig, FormConfig];

    console.log(`Syncing schema from v${oldV.version} → v${newV.version}...`);
    await syncSchema(oldV, newV);
  } catch (err) {
    console.error("❌ sync-schema error:", err);
    process.exit(1);
  }
})();
