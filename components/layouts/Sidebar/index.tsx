import React, { useMemo } from "react";
import UserCard from "../../common/UserCard";
import { getMemberDisplayImage } from "@/lib/getMemberDisplayImage";
import { sortMembersPhotosFirst } from "@/lib/sortMembersPhotosFirst";

interface IProps {
  filteredData: any;
  isAuthenticated: boolean;
  totalNumber: any;
  /** When set, sidebar cards are viewport-filtered; show this as a secondary hint. */
  visibleInViewport?: number;
  loading?: boolean;
  hasSearched?: boolean;
  viewportEmpty?: boolean;
  viewportLoading?: boolean;
  /** When user clicks a result card, fly map to that marker. */
  onRecordClick?: (record: any) => void;
}

const Sidebar: React.FC<IProps> = ({
  filteredData,
  isAuthenticated,
  totalNumber,
  visibleInViewport,
  loading,
  hasSearched,
  viewportEmpty,
  viewportLoading,
  onRecordClick,
}) => {
  const displayData = useMemo(
    () => (Array.isArray(filteredData) ? sortMembersPhotosFirst(filteredData) : []),
    [filteredData]
  );

  // If we're still loading, don't render any search results or messages.
  if (loading) return null;

  if (viewportEmpty && filteredData?.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center h-[80vh] bg-[#FFF8E5] px-6 text-center"
        data-testid="sidebar-viewport-empty"
      >
        <p className="text-lg font-semibold">No members visible in this area.</p>
        <p className="text-sm mt-2">
          Try zooming out or searching by city, state, country, organization, or industry.
        </p>
      </div>
    );
  }

  // Only show the "No results found" message if a search has been performed and no results exist.
  if (hasSearched && filteredData?.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center h-[80vh] bg-[#FFF8E5]"
        data-testid="sidebar-search-empty"
      >
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
    <div className="w-full min-w-0 px-2 sm:px-3">
      <div className="px-3 sm:px-4 pb-2 flex items-center justify-between gap-2 flex-wrap">
        <span className="font-bold">{totalNumber} result(s)</span>
        {typeof visibleInViewport === "number" ? (
          <span className="text-xs text-gray-600">
            {visibleInViewport} visible in map view
          </span>
        ) : null}
        {viewportLoading ? (
          <span className="text-xs text-gray-600">Updating for map view…</span>
        ) : null}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 w-full min-w-0">
        {displayData.map((data: any, idx: any) => (
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
            imgUrl={getMemberDisplayImage(data.fields)}
            isAuthenticated={isAuthenticated}
            ConnectLink={data.fields["ConnectLink"]}
          />
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
