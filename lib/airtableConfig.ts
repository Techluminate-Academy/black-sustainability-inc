// lib/airtableConfig.ts
type AirtableConfig = {
    apiKey: string
    baseId: string
    tableName: string
  }
  
  function getAirtableConfig(): AirtableConfig {
    const isDev = process.env.NODE_ENV === 'development'
  
    const prefix = isDev ? 'NEXT_PUBLIC_DEV' : 'NEXT_PUBLIC'
    const apiKey    = process.env[`${prefix}_AIRTABLE_ACCESS_TOKEN`]
    const baseId    = process.env[`${prefix}_AIRTABLE_BASE_ID`]
    const tableName = process.env[`${prefix}_AIRTABLE_TABLE_NAME`]
  
    if (!apiKey || !baseId || !tableName) {
      throw new Error(
        `Missing Airtable env vars for ${
          isDev ? 'development' : 'production'
        }!`
      )
    }
  
    return { apiKey, baseId, tableName }
  }
  
  export default getAirtableConfig
  