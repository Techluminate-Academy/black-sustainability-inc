
import axios from "axios";
const AIRTABLE_API_KEY = process.env.NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN;
const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
const TABLE_NAME = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME;
const VIEW_ID_NOT_SORTED = process.env.NEXT_PUBLIC__DEV_AIRTABLE_VIEW_ID_NOT_SORTED;
/**
 * Submits data to Airtable
 * @param fields - Object containing the fields to be submitted
 * @returns {Promise<any>} - Response from Airtable API
 */
/**
 * Submits data to Airtable
 * @param {Object} dataToSubmit - The data to be submitted
 * @returns {Promise<any>} - Response from Airtable API
 */
const submitToAirtable = async (dataToSubmit) => {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`;
    const config = {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
    };
  
    try {
      const response = await axios.post(
        url,
        { fields: dataToSubmit },
        config
      );
      console.log("Record created successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error submitting data to Airtable:", error.response?.data || error.message);
      throw new Error("Failed to submit data to Airtable.");
    }
  };

  // Fetch Airtable Metadata
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
      const targetTable = tables.find((table) => table.id === TABLE_NAME);
  
      if (!targetTable) {
        throw new Error(`Table '${TABLE_NAME}' not found.`);
      }
  
      // Return ALL fields, including those that are not single/multiple select.
      return targetTable.fields.map((field) => {
        let options = [];
  
        // If it's single/multi-select, extract choices
        if (
          field.type === "singleSelect" ||
          field.type === "multipleSelects"
        ) {
          options = field.options.choices
            .filter((choice) => choice.name && choice.name.trim() !== "")
            .map((choice) => ({
              id: choice.id,
              name: choice.name,
              icon: choice.icon || null,
            }));
                // For the gender field, exclude options "Uganda" and "GENDER"
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
    } catch (error) {
      console.error("Error fetching Airtable metadata:", error.message);
      throw new Error("Failed to fetch Airtable metadata.");
    }
  };
  

  /**
 * Updates an existing record in Airtable
 * @param {String} recordId - The Airtable record ID to update
 * @param {Object} dataToUpdate - The fields to update
 * @returns {Promise<any>} - Response from Airtable API
 */
  const updateRecord = async (recordId, dataToUpdate) => {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}/${recordId}`;
    const config = {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
    };
  
    try {
      const response = await axios.patch(
        url,
        { fields: dataToUpdate },
        config
      );
      console.log("Record updated successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "Error updating data in Airtable:",
        error.response?.data || error.message
      );
      throw new Error("Failed to update data in Airtable.");
    }
  };

  export default {
    fetchTableMetadata,
    submitToAirtable,
    updateRecord
  } 

