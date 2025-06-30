// lib/airtableConfig.ts
interface AirtableConfig {
  apiKey: string;
  baseId: string;
  tableName: string;
}

export default async function getAirtableConfig(): Promise<AirtableConfig> {
  // TEMPORARY: Forcing production variables for testing
  const apiKey = "pat38lz8MgA9be0dR.216dd36a6aefde7f3ac3063e11cb0ea1d645131195be277237b6e776d8f8c88f";
  const baseId = "appixDz0HieCrwdUq";
  const tableName = "tblYq1mA17iTZ5DRb";

  if (!apiKey || !baseId || !tableName) {
    throw new Error(`Missing required Airtable configuration for production environment`);
  }

  return {
    apiKey,
    baseId,
    tableName
  };
}
  