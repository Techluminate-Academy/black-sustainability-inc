"use client";

import MemberOrganizationDetails from "@/features/memberMap/MemberOrganizationDetails";

import React, { useEffect, useState } from "react";
import BioWithReadMore from "@/components/common/BioWithReadMore";
import MemberLevelVisibilityHint from "@/components/common/MemberLevelVisibilityHint";
import icons from "@/icons";
import MemberProfilePreview from "@/features/memberMap/MemberProfilePreview";
import { memberIndustryHouse } from "@/lib/memberIndustryHouse";
import BlurText from "../BlurText";
import MemberAccessInlineHint from "../MemberAccessInlineHint";
import {
  BSN_PLATFORM_ICON,
  getMemberDisplayImage,
  isPlatformIconUrl,
} from "@/lib/getMemberDisplayImage";

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
  fields?: Record<string, unknown> | null;
  PRIMARY_INDUSTRY_HOUSE?: any;
  isAuthenticated: boolean;
}

const InfoCard: React.FC<UserProps> = ({ isAuthenticated, fields, ...UserProps }) => {
  const profileFields = fields || {
    "FIRST NAME": UserProps.FIRST_NAME, "LAST NAME": UserProps.LAST_NAME,
    "ORGANIZATION NAME": UserProps.ORGANIZATION_NAME,
    BIO: UserProps.BIO, "PRIMARY INDUSTRY HOUSE": UserProps.PRIMARY_INDUSTRY_HOUSE,
    "Location (Nearest City)": UserProps.Nearest_City, PHOTO: [{ url: UserProps.imgUrl }],
  };
  const resolvedSrc = fields
    ? getMemberDisplayImage(fields)
    : typeof UserProps.imgUrl === "string" && UserProps.imgUrl.trim()
      ? UserProps.imgUrl.trim()
      : BSN_PLATFORM_ICON;
  const [photoSrc, setPhotoSrc] = useState(resolvedSrc);
  const isPlatformIcon = isPlatformIconUrl(photoSrc);

  useEffect(() => {
    setPhotoSrc(resolvedSrc);
  }, [resolvedSrc]);

  const photoContainerClass = "relative block w-[35%] h-[100px] shrink-0 rounded-md overflow-hidden bg-[#f5f5f5]";
  const photo = (
    <img
      src={photoSrc}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={`w-full h-full rounded-md ${
        isPlatformIcon ? "object-contain object-center p-2" : "object-contain object-center"
      } ${isAuthenticated ? "" : "blur-md"}`}
      onError={() => setPhotoSrc(BSN_PLATFORM_ICON)}
    />
  );

  return (
    <div className="popup-info-card" style={{ maxWidth: "280px", minWidth: "250px" }}>
      <div className="flex gap-x-3 items-start ">
        {isAuthenticated ? (
          <MemberProfilePreview fields={profileFields} className={photoContainerClass}>
            {photo}
          </MemberProfilePreview>
        ) : <div className={photoContainerClass}>{photo}</div>}
        <div className="w-[65%] flex flex-col gap-y-2 min-h-[100px] p-1 ">
          <div className="flex items-center gap-x-5">
            <icons.profile />
            {isAuthenticated ? (
              <MemberProfilePreview fields={profileFields} className="text-xs text-left underline underline-offset-2 hover:text-green-700">
                {UserProps.FIRST_NAME} {UserProps.LAST_NAME}
              </MemberProfilePreview>
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
          <div className="flex items-start gap-x-3">
            <icons.organization />
            <div className="text-xs"><p className="font-semibold">Industry house</p>
              {isAuthenticated ? <span>{memberIndustryHouse(profileFields["PRIMARY INDUSTRY HOUSE"])}</span> :
                <BlurText text={memberIndustryHouse(profileFields["PRIMARY INDUSTRY HOUSE"])} blurAmount={1} />}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-2 text-xs leading-4 flex flex-col gap-y-0.5">
        <MemberOrganizationDetails fields={profileFields} isAuthenticated={isAuthenticated} />
        {isAuthenticated && UserProps.BIO?.trim() ? (
          <BioWithReadMore isAuthenticated={isAuthenticated} bio={UserProps.BIO.trim()} />
        ) : null}
        <div className="h-[1px] bg-black w-full my-1.5"></div>
        <p className="text-xs flex flex-wrap items-center gap-x-1 gap-y-0.5">
          <span className="font-bold">Member Level</span>
          {isAuthenticated ? <MemberLevelVisibilityHint /> : null}
          <span>
            {UserProps.MEMBER_LEVEL == "recgWTcJQnfOQW0Dm" &&
              "👓 Enthusiast -Excited to Learn"}
            {UserProps.MEMBER_LEVEL == "rectzSiMASJ9OcN52" &&
              "🥋 Expert - Experienced Professional"}
            {UserProps.MEMBER_LEVEL == "recGP35SbgqyZ4FQN" &&
              "🏢 Entity - Black & Green Organization"}
          </span>
        </p>

        {isAuthenticated && UserProps.WEBSITE?.trim() ? (
          <a
            href={UserProps.WEBSITE}
            target="_blank"
            rel="noopener noreferrer"
            className=" mt-1.5 text-xs flex items-center space-x-1 border-none outline-none"
          >
            <icons.web_link />
            <span>{UserProps.WEBSITE || "not yet provided"}</span>
          </a>
        ) : !isAuthenticated ? (
          <MemberAccessInlineHint className="mt-2" />
        ) : null}
      </div>
    </div>
  );
};

export default InfoCard;
