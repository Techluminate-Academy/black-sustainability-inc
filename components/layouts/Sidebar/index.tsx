import React from "react";
import UserCard from "../../common/UserCard";

interface IProps {
  filteredData: any;
  isAuthenticated: boolean;
  totalNumber: any;
  loading?: boolean;
  hasSearched?: boolean;
  /** When user clicks a result card, fly map to that marker. */
  onRecordClick?: (record: any) => void;
}

const Sidebar: React.FC<IProps> = ({
  filteredData,
  isAuthenticated,
  totalNumber,
  loading,
  hasSearched,
  onRecordClick,
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
    <div className="w-full px-2 sm:px-3">
      <div className="px-3 sm:px-4 pb-2 flex items-center justify-between">
        <span className="font-bold">{totalNumber} result(s)</span>
      </div>
      {/* One column = full sidebar width per card (wider than 2-up in a narrow panel) */}
      <div className="grid grid-cols-1 gap-5 sm:gap-6 w-full min-w-0">
        {filteredData?.map((data: any, idx: any) => (
          <UserCard
            key={data?.id != null ? String(data.id) : idx}
            onClick={onRecordClick ? () => onRecordClick(data) : undefined}
            AFFILIATION={data.fields["AFFILIATED ENTITY"]}
            FULL_NAME={data.fields["FULL NAME"]}
            EMAIL_ADDRESS={data.fields["EMAIL ADDRESS"]}
            ORGANIZATION_NAME={data.fields["ORGANIZATION NAME"]}
            Nearest_City={data.fields["Location (Nearest City)"]}
              //  {/* Render yellow star and affiliation if present */}

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
