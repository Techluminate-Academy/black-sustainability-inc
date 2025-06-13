// features/freeSignup/airtableUtils.ts

import axios from "axios";

// ─── Production Airtable configuration ────────────────────────────────────────
// Use production Airtable environment variables
const AIRTABLE_API_KEY = process.env.NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN!;
const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID!;
const TABLE_NAME = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME!;

console.log("⛳ [PROD] Airtable →", BASE_ID, TABLE_NAME);

/**
 * Submits a new record to your prod Airtable table.
 * @param dataToSubmit - An object whose keys match column names in Airtable.
 * @returns {Promise<any>} - The Airtable response.
 */
const submitToAirtable = async (dataToSubmit: Record<string, any>) => {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`;
  const config = {
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
  };

  try {
    const response = await axios.post(url, { fields: dataToSubmit }, config);
    console.log("✅ [PROD] Record created successfully:", response.data);
    return response.data;
  } catch (error: any) {
    console.error(
      "❌ [PROD] Error submitting data to Airtable:",
      error.response?.data || error.message
    );
    throw new Error("Failed to submit data to Airtable (prod).");
  }
};

/**
 * Fetches field metadata (e.g. single- or multi-select choices) for the prod table.
 * @returns {Promise<Array<{ fieldName: string; fieldType: string; options: Array<{id: string; name: string; icon: any}> }>>}
 */
export const fetchTableMetadata = async () => {
  const url = `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`;
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const tables = response.data.tables || [];
    const targetTable = tables.find((table: any) => table.id === TABLE_NAME);
    if (!targetTable) {
      throw new Error(`Prod table '${TABLE_NAME}' not found.`);
    }

    return targetTable.fields.map((field: any) => {
      let options: Array<{ id: string; name: string; icon: any }> = [];
      if (field.type === "singleSelect" || field.type === "multipleSelects") {
        options = field.options.choices
          .filter((choice: any) => choice.name && choice.name.trim() !== "")
          .map((choice: any) => ({
            id: choice.id,
            name: choice.name,
            icon: choice.icon || null,
          }));
        // Example: filter out unwanted single-select choices if needed
        if (field.name === "GENDER") {
          options = options.filter(
            (choice) => choice.name !== "Uganda" && choice.name !== "GENDER"
          );
        }
        if (field.name === "Name (from Location)") {
          options = options.filter(
            (choice) => choice.name !== "Name (from Location)"
          );
        }
      }
      return {
        fieldName: field.name,
        fieldType: field.type,
        options,
      };
    });
  } catch (error: any) {
    console.error("❌ [PROD] Error fetching Airtable metadata:", error.message);
    throw new Error("Failed to fetch Airtable metadata (prod).");
  }
};

/**
 * Updates an existing record in the prod Airtable table by record ID.
 * @param recordId - The Airtable record ID to update.
 * @param dataToUpdate - An object whose keys match column names to update.
 * @returns {Promise<any>} - The Airtable response.
 */
const updateRecord = async (
  recordId: string,
  dataToUpdate: Record<string, any>
) => {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}/${recordId}`;
  const config = {
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
  };

  try {
    const response = await axios.patch(url, { fields: dataToUpdate }, config);
    console.log("✅ [PROD] Record updated successfully:", response.data);
    return response.data;
  } catch (error: any) {
    console.error(
      "❌ [PROD] Error updating data in Airtable:",
      error.response?.data || error.message
    );
    throw new Error("Failed to update data in Airtable (prod).");
  }
};

export default {
  fetchTableMetadata,
  submitToAirtable,
  updateRecord,
};
