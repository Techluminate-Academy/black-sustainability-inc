// utils/fetchDataFromAirtable.js



import axios from "axios";

// Use environment variables for security
const AIRTABLE_API_KEY = process.env.NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN;
const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
const TABLE_NAME = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME;
const VIEW_ID_NOT_SORTED = process.env.NEXT_PUBLIC_AIRTABLE_VIEW_ID || 'viwYDUY0xStG108Lv';

// Validate required environment variables
if (!AIRTABLE_API_KEY || !BASE_ID || !TABLE_NAME) {
  throw new Error('Missing required Airtable environment variables: NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN, NEXT_PUBLIC_AIRTABLE_BASE_ID, NEXT_PUBLIC_AIRTABLE_TABLE_NAME');
}

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
