import React from "react";
import BioWithReadMore from "@/components/common/BioWithReadMore";
import icons from "@/icons";
import Image from "next/image";
import BlurImage from "../BlurImage";
import BlurText from "../BlurText";

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
    <div className="popup-info-card">
      <div className="flex gap-x-5 items-start ">
        <div className="relative w-[40%] h-[133px] rounded-md overflow-hidden">
          {isAuthenticated ? (
            <img
              src={UserProps.imgUrl}
              className={`${
                isAuthenticated ? "blur-none" : "blur-md"
              } w-full object-cover object-center h-full rounded-md`}
              alt={`${UserProps.FIRST_NAME} ${UserProps.LAST_NAME}  profile image`}
              loading="lazy"
            />
          ) : (
            <img src={UserProps.imgUrl} />
          )}
        </div>
        <div className="w-[60%] flex flex-col justify-between gap-y-0.5 h-[133px] p-1 ">
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
      <div className="mt-3.5 text-xs leading-5 flex flex-col gap-y-0.5">
        {isAuthenticated && (
          <BioWithReadMore
            isAuthenticated={isAuthenticated}
            bio={UserProps.BIO || "bio unavailable"}
          />
        )}
        <div className="h-[1px] bg-black w-full my-2.5"></div>
        <p className={`text-xs`}>
          <span className="font-bold">Member Level </span>{" "}
          {UserProps.MEMBER_LEVEL == "recgWTcJQnfOQW0Dm" &&
            "👓 Enthusiast -Excited to Learn"}
          {UserProps.MEMBER_LEVEL == "rectzSiMASJ9OcN52" &&
            "🥋 Expert - Experienced Professional"}
          {UserProps.MEMBER_LEVEL == "recGP35SbgqyZ4FQN" &&
            "🏢 Entity - Black & Green Organization"}
        </p>

        <a
          href={UserProps.WEBSITE}
          target="_blank"
          className=" mt-2.5 text-xs flex items-center space-x-1 border-none outline-none"
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
