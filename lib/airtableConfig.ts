// lib/airtableConfig.ts
interface AirtableConfig {
  apiKey: string;
  baseId: string;
  tableName: string;
}

export default async function getAirtableConfig(): Promise<AirtableConfig> {
  const apiKey = process.env.NEXT_PUBLIC_DEV_AIRTABLE_ACCESS_TOKEN;
  const baseId = process.env.NEXT_PUBLIC_DEV_AIRTABLE_BASE_ID;
  const tableName = process.env.NEXT_PUBLIC_DEV_AIRTABLE_TABLE_NAME;

  if (!apiKey || !baseId || !tableName) {
    throw new Error('Missing required Airtable configuration');
  }

  return {
    apiKey,
    baseId,
    tableName
  };
}
  