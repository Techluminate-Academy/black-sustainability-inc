import create from "zustand";

import { devtools, persist } from "zustand/middleware";

const memberStore = (set) => ({
    members: [],
    getMembers: async () => {
      try {
        const fetchedData2 = await getAllRecordsFromAirtable();
  
        const formattedData = await Promise.all(
          fetchedData2.map(async (record) => {
            try {
              const { lat, lng } = await AddressToCoordinates(
                `${record.fields["Location (Nearest City)"] || ""}  ${
                  record.fields.State || ""
                } ${record.fields["Name (from Location)"] || ""} ${
                  record.fields["State/Province"] || ""
                }`
              );
              return {
                ...record,
                fields: {
                  ...record.fields,
                  lat,
                  lng,
                },
              };
            } catch (error) {
              console.error("Error in formatting data:", error);
              return null;
            }
          })
        );
  
        // Filter out null values if needed
        const filteredData = formattedData.filter((data) => data !== null);
        
        // Update only the members field
        set((state) => ({
          members: filteredData,
        }));
      } catch (error) {
        console.error("Error in fetching data:", error);
      }
    },
    addMembers: (member) => {
      set((state) => ({
        members: [member, ...state.members],
      }));
    },
  });
  

const useMemberStore = create(
    devtools(
        persist(
            memberStore, {
                name: "members"
            }
        )
    )
)

export default useMemberStore;