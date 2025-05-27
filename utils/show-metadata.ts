// utils/show-metadata.ts
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const isDev = process.env.NODE_ENV !== "production";

// pick the right base & table
const BASE_ID = isDev
  ? process.env.NEXT_PUBLIC_DEV_AIRTABLE_BASE_ID!
  : process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID!;
const TABLE_ID = isDev
  ? process.env.NEXT_PUBLIC_DEV_AIRTABLE_TABLE_NAME!
  : process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME!;

// use your Airtable API key (here re-using your public PATs)
const META_TOKEN = isDev
  ? process.env.NEXT_PUBLIC_DEV_AIRTABLE_ACCESS_TOKEN!
  : process.env.NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN!;

async function showMetadata() {
  console.log({ isDev, BASE_ID, TABLE_ID, META_TOKEN });
  const url = `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables/${TABLE_ID}/fields`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${META_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    console.error(`Error fetching metadata: ${res.status} ${res.statusText}`);
    console.error(await res.text());
    process.exit(1);
  }

  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
}

showMetadata().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
