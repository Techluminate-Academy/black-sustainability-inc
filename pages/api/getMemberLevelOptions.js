const AIRTABLE_API_KEY = process.env.NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN;
const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
const TABLE_NAME = "MEMBER LEVEL";
const AIRTABLE_ENDPOINT = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}`;

export default async function handler(req, res) {
  try {
    const response = await fetch(AIRTABLE_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.statusText}`);
    }

    const json = await response.json();

    // Return just the IDs and Names (or another field you'd like)
    const options = json.records.map((record) => ({
      id: record.id,
      name: record.fields["Name"] || "Unnamed",
    }));

    res.status(200).json({ success: true, options });
  } catch (error) {
    console.error("❌ Error fetching MEMBER LEVEL options:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
