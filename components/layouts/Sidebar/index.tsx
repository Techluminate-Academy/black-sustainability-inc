import React from "react";
import UserCard from "../../common/UserCard";

interface IProps {
  filteredData: any;
  isAuthenticated: boolean;
  totalNumber: any;
  loading?: boolean;
  hasSearched?: boolean;
}

const Sidebar: React.FC<IProps> = ({
  filteredData,
  isAuthenticated,
  totalNumber,
  loading,
  hasSearched,
}) => {
  // If we're still loading, don't render any search results or messages.
  if (loading) return null;

  // Only show the "No results found" message if a search has been performed and no results exist.
  if (hasSearched && filteredData?.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] bg-[#FFF8E5]">
        <div>
          <p className="text-lg font-semibold">No results found</p>
        </div>
        <div>
          <p className="text-sm">Try adjusting your search or filters.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
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
            ConnectLink={data.fields["ConnectLink"]}
          />
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
