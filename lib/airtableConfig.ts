// lib/airtableConfig.ts
interface AirtableConfig {
  apiKey: string;
  baseId: string;
  tableName: string;
}

export default async function getAirtableConfig(): Promise<AirtableConfig> {
  // Use environment variables for security
  const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN;
  const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
  const tableName = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME;

  if (!apiKey || !baseId || !tableName) {
    throw new Error(`Missing required Airtable configuration. Please check your environment variables:
      NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN, NEXT_PUBLIC_AIRTABLE_BASE_ID, NEXT_PUBLIC_AIRTABLE_TABLE_NAME`);
  }

  return {
    apiKey,
    baseId,
    tableName
  };
}
  