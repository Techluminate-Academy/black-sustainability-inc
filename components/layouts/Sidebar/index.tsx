import React, { useEffect } from "react";
import UserCard from "../../common/UserCard";

interface IProps {
  filteredData: any;
  isAuthenticated: boolean;
  totalNumber: any;
  loading?: boolean;
}

const Sidebar: React.FC<IProps> = ({
  filteredData,
  isAuthenticated,
  totalNumber,
}) => {
  return (
    <>
      {filteredData?.length === 0 ? (
        <div className="flex items-center justify-center h-[80vh] bg-[#FFF8E5] ">
          <p className="text-lg font-semibold">No results found</p>
          <p className="text-sm">Try adjusting your search or filters.</p>

        </div>
      ) : (
        <div className="">
          <div className="px-5 pb-1 flex items-center justify-between">
            <span className="font-bold">{totalNumber} result(s)</span>
          </div>
          <div className="grid 2xl:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-4 px-4">
            {filteredData?.map((data: any, idx: any) => (
              <UserCard
                key={idx}
                FULL_NAME={data.fields["FULL NAME"]}
                EMAIL_ADDRESS={data.fields["EMAIL ADDRESS"]}
                ORGANIZATION_NAME={data.fields["ORGANIZATION NAME"]}
                Nearest_City={data.fields["Location (Nearest City)"]}
                // NameFromLocation={data.fields["Name (from Location)"]}
                MEMBER_LEVEL={
                  data.fields["MEMBER LEVEL"] &&
                  data.fields["MEMBER LEVEL"][0] !== undefined
                    ? data.fields["MEMBER LEVEL"][0]
                    : ""
                }
                PRIMARY_INDUSTRY_HOUSE={data.fields["PRIMARY INDUSTRY HOUSE"]}
                imgUrl={
                  data.fields?.PHOTO && data.fields.PHOTO.length > 0
                    ? data.fields.PHOTO[0].url
                    : "/png/default.png"
                }
                isAuthenticated={isAuthenticated}
                ConnectLink={data.fields["ConnectLink"]} // UPDATE WHEN AIRTABLE IS UPDATED
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
