// features/freeSignup/airtableUtils.ts

import axios from "axios";

// ─── Dev-only Airtable configuration ────────────────────────────────────────
// Replace the strings below with your actual development Airtable values.
// These values are always used (no NODE_ENV check).

const AIRTABLE_API_KEY = process.env.NEXT_PUBLIC_DEV_AIRTABLE_ACCESS_TOKEN!;
const BASE_ID = process.env.NEXT_PUBLIC_DEV_AIRTABLE_BASE_ID!;
const TABLE_NAME = process.env.NEXT_PUBLIC_DEV_AIRTABLE_TABLE_NAME!;

console.log("⛳ [DEV] Airtable →", BASE_ID, TABLE_NAME);

/**
 * Submits a new record to your dev Airtable table.
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
    console.log("✅ [DEV] Record created successfully:", response.data);
    return response.data;
  } catch (error: any) {
    console.error(
      "❌ [DEV] Error submitting data to Airtable:",
      error.response?.data || error.message
    );
    throw new Error("Failed to submit data to Airtable (dev).");
  }
};

/**
 * Fetches field metadata (e.g. single- or multi-select choices) for the dev table.
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
      throw new Error(`Dev table '${TABLE_NAME}' not found.`);
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
    console.error("❌ [DEV] Error fetching Airtable metadata:", error.message);
    throw new Error("Failed to fetch Airtable metadata (dev).");
  }
};

/**
 * Updates an existing record in the dev Airtable table by record ID.
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
    console.log("✅ [DEV] Record updated successfully:", response.data);
    return response.data;
  } catch (error: any) {
    console.error(
      "❌ [DEV] Error updating data in Airtable:",
      error.response?.data || error.message
    );
    throw new Error("Failed to update data in Airtable (dev).");
  }
};

export default {
  fetchTableMetadata,
  submitToAirtable,
  updateRecord,
};
