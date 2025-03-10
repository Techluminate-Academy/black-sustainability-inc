import React from "react";
import icons from "@/icons";
import Image from "next/image";

interface ImpactCardProps {
  imgUrl?: string;
  ORGANIZATION_NAME?: string;
  Nearest_City?: string;
  BIO?: string;
  MEMBER_LEVEL?: string;
  isAuthenticated: boolean;
}

const ImpactAreaCard: React.FC<ImpactCardProps> = ({
  imgUrl,
  ORGANIZATION_NAME,
  Nearest_City,
  BIO,
  MEMBER_LEVEL,
  isAuthenticated,
}) => {
  return (
    <div className="popup-impact-card">
      <div className="flex gap-x-4 items-start">
        <div className="relative w-[36%] h-[110px] rounded-md overflow-hidden">
          <Image
            src={imgUrl || "/png/default.png"}
            alt="Impact Area"
            fill
            className="object-cover object-center w-full h-full rounded-md"
          />
        </div>

        <div className="w-[64%] flex flex-col justify-between gap-y-1 h-[110px] p-1">
          <div className="flex items-center gap-x-2">
            <icons.organization />
            <span className="text-sm font-semibold">
              {ORGANIZATION_NAME || "Impact Category"}
            </span>
          </div>
          <div className="flex items-center gap-x-2">
            <icons.location />
            <span className="text-xs">
              {Nearest_City || "Impact Area Location"}
            </span>
          </div>
          <div className="flex items-center gap-x-2">
            <icons.profile />
            <span className="text-xs font-medium">
              {MEMBER_LEVEL || "Impact Need"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs leading-5">
        <p className="font-semibold mb-1">Need / Description:</p>
        <p>{BIO || "Impact area details not available."}</p>
      </div>
    </div>
  );
};

export default ImpactAreaCard;
