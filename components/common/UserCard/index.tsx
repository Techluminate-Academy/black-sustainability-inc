import React, { useEffect } from "react";
import Image from "next/image";
import icons from "@/icons";
import IndustryHouseIcons from "../IndustryHouseIcons";
import BlurImage from "../BlurImage";
import BlurText from "../BlurText";
import Link from "next/link";
import ShowMoreText from "react-show-more-text";

interface IProps {
  FULL_NAME: string;
  EMAIL_ADDRESS?: string;
  ORGANIZATION_NAME?: string;
  Nearest_City?: string;
  State_Province?: string;
  NameFromLocation?: string;
  BIO?: string;
  WEBSITE?: string;
  MEMBER_LEVEL?: string;
  imgUrl?: any;
  PRIMARY_INDUSTRY_HOUSE?: any;
  isAuthenticated: boolean;
  ConnectLink?: string;
}

const UserCard: React.FC<IProps> = ({
  FULL_NAME,
  EMAIL_ADDRESS,
  Nearest_City,
  ORGANIZATION_NAME,
  MEMBER_LEVEL,
  PRIMARY_INDUSTRY_HOUSE,
  imgUrl,
  isAuthenticated,
  ConnectLink,
  // State_Province,
  // NameFromLocation,
}) => {
  return (
    <div className=" bg-white rounded-2xl p-[7px] overflow-hidden space-y-[10px]">
      <div className="relative">
        {isAuthenticated ? (
          <div className="relative h-[250px] w-full bg-[#FFF8E5] rounded-xl">
            <Image
              src={imgUrl}
              alt="profile image"
              fill
              className="rounded-xl object-top object-cover "
              loading="lazy"
            />
          </div>
        ) : (
          <BlurImage imageUrl={imgUrl} blurAmount={16} />
        )}
      </div>

      <div className="flex justify-between items-start  ">
        <div className="px-2 space-y-[10px] w-[70%]">
          <div className="relative flex items-center gap-2">
            <span className="w-[14px] h-[14px]">
              <icons.profile />
            </span>
            <div className="group">
              {isAuthenticated ? (
                <div>
                  <p
                    className={`text-sm whitespace-nowrap overflow-hidden truncate max-w-[130px] group-hover:invisible  w-[90%] cursor-pointer`}
                  >
                    {FULL_NAME}
                  </p>
                  <p
                    className={`text-sm absolute top-0 rounded-full bg-white p-[1px] whitespace-normal hidden group-hover:block`}
                  >
                    {FULL_NAME}
                  </p>
                </div>
              ) : (
                <BlurText text={FULL_NAME || ""} blurAmount={1} />
              )}
            </div>
          </div>

          <div className="flex relative items-center gap-2 ">
            <span className="w-[14px] h-[14px]">
              <icons.email />
            </span>

            <div className="group">
              {isAuthenticated ? (
                <div>
                  <p
                    className={`text-sm whitespace-nowrap overflow-hidden truncate max-w-[130px] w-[90%] group-hover:invisible cursor-pointer`}
                  >
                    {EMAIL_ADDRESS}
                  </p>
                  <p
                    className={`text-sm absolute -top-1 rounded-full bg-white p-[1px] whitespace-normal hidden group-hover:block`}
                  >
                    {EMAIL_ADDRESS}
                  </p>
                </div>
              ) : (
                <BlurText text={EMAIL_ADDRESS || ""} blurAmount={1} />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-[14px] h-[14px]">
              <icons.location />
            </span>
            <p className={`text-sm whitespace-nowrap`}>{Nearest_City}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-[14px] h-[14px]">
              <icons.organization />
            </span>
            {isAuthenticated ? (
              <p className={`text-sm whitespace-nowrap`}>
                {ORGANIZATION_NAME || "not yet updated"}
              </p>
            ) : (
              <BlurText
                text={ORGANIZATION_NAME || "not yet updated"}
                blurAmount={1}
              />
            )}
          </div>
        </div>

        <IndustryHouseIcons iconTag={PRIMARY_INDUSTRY_HOUSE} />
      </div>

      <div className="bg-[#242424] h-[1px] w-full" />

      <div className="px-2 space-y-[10px]">
        <div className="flex items-center flex-wrap gap-1">
          <p className="text-xs font-bold">Member Level</p>
          <span className="text-xs">&bull;</span>
          <p className={`text-xs`}>
            {MEMBER_LEVEL == "recgWTcJQnfOQW0Dm" &&
              "👓 Enthusiast - Excited to Learn"}
            {MEMBER_LEVEL == "rectzSiMASJ9OcN52" &&
              "🥋 Expert - Experienced Professional"}
            {MEMBER_LEVEL == "recGP35SbgqyZ4FQN" &&
              "🏢 Entity - Black & Green Organization"}
          </p>
        </div>

        <Link
          // href={ConnectLink} //UPDATE WHEN AIRTABLE IS UPDATED
          href="https://black-sustainability-network.mn.co/"
          target="_blank"
          rel="noreferrer"
          className="bg-[#FFBF23] border border-[#1A1A1A] flex justify-between items-center py-1 px-3 rounded-3xl"
        >
          <span className="font-bold text-sm capitalize">connect</span>
          <icons.rightArrow />
        </Link>
      </div>
    </div>
  );
};

export default UserCard;
