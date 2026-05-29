"use client";

import React from "react";
import BioWithReadMore from "@/components/common/BioWithReadMore";
import MemberLevelVisibilityHint from "@/components/common/MemberLevelVisibilityHint";
import icons from "@/icons";
import BlurText from "../BlurText";

const DEFAULT_PHOTO = "/png/default.png";

interface UserProps {
  FIRST_NAME?: string;
  LAST_NAME?: string;
  EMAIL_ADDRESS?: string;
  ORGANIZATION_NAME?: string;
  Nearest_City?: string;
  State_Province?: string;
  Country?: string;
  BIO?: string;
  WEBSITE?: string;
  MEMBER_LEVEL?: string;
  imgUrl?: any;
  PRIMARY_INDUSTRY_HOUSE?: any;
  isAuthenticated: boolean;
}

const InfoCard: React.FC<UserProps> = ({ isAuthenticated, ...UserProps }) => {
  return (
    <div className="popup-info-card" style={{ maxWidth: "280px", minWidth: "250px" }}>
      <div className="flex gap-x-3 items-start ">
        <div className="relative w-[35%] h-[100px] rounded-md overflow-hidden bg-[#f5f5f5]">
          <img
            src={
              typeof UserProps.imgUrl === "string" && UserProps.imgUrl.trim()
                ? UserProps.imgUrl
                : DEFAULT_PHOTO
            }
            className={`w-full h-full object-cover object-center rounded-md ${
              isAuthenticated ? "" : "blur-md"
            }`}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const el = e.currentTarget;
              if (el.src.endsWith(DEFAULT_PHOTO)) return;
              el.src = DEFAULT_PHOTO;
            }}
          />
        </div>
        <div className="w-[65%] flex flex-col justify-between gap-y-0.5 h-[100px] p-1 ">
          <div className="flex items-center gap-x-5">
            <icons.profile />
            {isAuthenticated ? (
              <span className={`text-xs`}>
                {UserProps.FIRST_NAME} {UserProps.LAST_NAME}
              </span>
            ) : (
              <BlurText
                text={`${UserProps.FIRST_NAME} ${UserProps.LAST_NAME}`}
                blurAmount={1}
              />
            )}
          </div>
          <div
            className={`flex items-center gap-x-5 flex-wrap ${
              UserProps.EMAIL_ADDRESS?.length === 0 && "hidden"
            }`}
          >
            <icons.email />{" "}
            {isAuthenticated ? (
              <span className={`text-xs`}>{UserProps.EMAIL_ADDRESS}</span>
            ) : (
              <BlurText text={UserProps.EMAIL_ADDRESS || ""} blurAmount={1} />
            )}
          </div>
          <div className="flex items-center gap-x-5">
            <icons.location />
            <span className={`text-xs`}>
              {`${UserProps?.Nearest_City || ""} ` || "Location unavailable"}
            </span>
          </div>
          <div
            className={`flex items-center gap-x-3.5 ${
              UserProps.ORGANIZATION_NAME?.length === 0 && ""
            }`}
          >
            <icons.organization />
            {isAuthenticated ? (
              <span className={`text-xs`}>
                {UserProps.ORGANIZATION_NAME || "Organization name unavailable"}
              </span>
            ) : (
              <BlurText
                text={
                  UserProps.ORGANIZATION_NAME || "Organization name unavailable"
                }
                blurAmount={1}
              />
            )}
          </div>
        </div>
      </div>
      <div className="mt-2 text-xs leading-4 flex flex-col gap-y-0.5">
        {isAuthenticated && (
          <BioWithReadMore
            isAuthenticated={isAuthenticated}
            bio={UserProps.BIO || "bio unavailable"}
          />
        )}
        <div className="h-[1px] bg-black w-full my-1.5"></div>
        <p className="text-xs flex flex-wrap items-center gap-x-1 gap-y-0.5">
          <span className="font-bold">Member Level</span>
          <MemberLevelVisibilityHint />
          <span>
            {UserProps.MEMBER_LEVEL == "recgWTcJQnfOQW0Dm" &&
              "👓 Enthusiast -Excited to Learn"}
            {UserProps.MEMBER_LEVEL == "rectzSiMASJ9OcN52" &&
              "🥋 Expert - Experienced Professional"}
            {UserProps.MEMBER_LEVEL == "recGP35SbgqyZ4FQN" &&
              "🏢 Entity - Black & Green Organization"}
          </span>
        </p>

        <a
          href={UserProps.WEBSITE}
          target="_blank"
          className=" mt-1.5 text-xs flex items-center space-x-1 border-none outline-none"
        >
          <icons.web_link />
          {isAuthenticated ? (
            <span>{UserProps.WEBSITE || "not yet provided"}</span>
          ) : (
            <BlurText
              text={UserProps.WEBSITE || "not yet provided"}
              blurAmount={1}
            />
          )}
        </a>
      </div>
    </div>
  );
};

export default InfoCard;
