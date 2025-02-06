// import axios from "axios";

// const AIRTABLE_API_KEY = process.env.NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN;
// const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
// const TABLE_NAME = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME;
// const VIEW_ID_NOT_SORTED = process.env.NEXT_PUBLIC_AIRTABLE_VIEW_ID_NOT_SORTED;
  
// const fetchDataFromAirtable = async (offset) => {
//   const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}/listRecords`;
//   const config = {
//     headers: {
//       Authorization: `Bearer ${AIRTABLE_API_KEY}`,
//     },
//   };

//   try {
//     const response = await axios.post(
//       url,
//       {
//         pageSize: 100,
//         view: VIEW_ID_NOT_SORTED,
//         offset,
//       },
//       config
//     );
//     return response.data;
//   } catch (error) {
//     console.error("Error fetching data from Airtable:", error);
//     return null;
//   }
// };

// export const getAllRecordsFromAirtable = async () => {
//   let allRecords = [];
//   let offset = '';

//   do {
//     const data = await fetchDataFromAirtable(offset);
//     if (data) {
//       allRecords.push(...data.records);
//       offset = data.offset || '';
//     } else {
//       // Handle error or exit loop if fetching fails
//       break;
//     }
//   } while (offset);

//   return allRecords;
// };


// export default fetchDataFromAirtable;
