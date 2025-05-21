// utils/fetchDataFromAirtable.js
import axios from "axios";

// Hard-coded credentials for testing (for production, use env variables)
const AIRTABLE_API_KEY = 'pat38lz8MgA9beOdR.216dd36a6aefde7f3ac3063e11cb0ea1d645131195be277237b6e776d8f8c88f';
const BASE_ID = 'appixDz0HieCrwdUq';
const TABLE_NAME = 'tblYq1mA17iTZ5DRb';
// Make sure your view ID is correct and case-sensitive. For example:
const VIEW_ID_NOT_SORTED = 'viwYDUY0xStG108Lv'; // Adjust if needed

const fetchDataFromAirtable = async (offset = '') => {
  // Construct the URL (no need for "/listRecords")
  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`;
  const config = {
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    },
    params: {
      pageSize: 100,
      view: VIEW_ID_NOT_SORTED,
      offset, // If offset is an empty string, it won't be sent
    },
  };

  try {
    // Use GET for listing records
    const response = await axios.get(url, config);
    return response.data;
  } catch (error) {
    console.error("Error fetching data from Airtable:", error.response?.data || error.message);
    return null;
  }
};

export const getAllRecordsFromAirtable = async () => {
  let allRecords = [];
  let offset = '';

  do {
    const data = await fetchDataFromAirtable(offset);
    if (data) {
      allRecords.push(...data.records);
      offset = data.offset || '';
    } else {
      // If fetching fails, exit the loop
      break;
    }
  } while (offset);

  return allRecords;
};

export default fetchDataFromAirtable;
