import React, { useEffect, useState } from "react";
import icons from "@/icons";
import IndustryHouseIcons from "../IndustryHouseIcons";
import BlurText from "../BlurText";
import Link from "next/link";
import MemberAccessModal from "../MemberAccessModal";
import {
  BSN_PLATFORM_ICON,
  isPlatformIconUrl,
} from "@/lib/getMemberDisplayImage";

function pickPhotoUrl(imgUrl: unknown): string {
  if (typeof imgUrl === "string" && imgUrl.trim()) return imgUrl.trim();
  return BSN_PLATFORM_ICON;
}

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
  AFFILIATION?: string;
  /** When set, clicking the card flies the map to this member's marker. */
  onClick?: () => void;
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
  AFFILIATION,
  onClick,
}) => {
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const resolvedSrc = pickPhotoUrl(imgUrl);
  const [photoSrc, setPhotoSrc] = useState(resolvedSrc);
  const isPlatformIcon = isPlatformIconUrl(photoSrc);

  useEffect(() => {
    setPhotoSrc(resolvedSrc);
  }, [resolvedSrc]);

  return (
    <div
      className="bg-white rounded-2xl p-2 sm:p-3 overflow-hidden space-y-3 min-w-0 w-full shadow-sm border border-gray-100/80"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      style={onClick ? { cursor: "pointer" } : undefined}
      data-testid="member-card"
    >
      <div className="relative w-full aspect-[4/3] max-h-[280px] sm:max-h-[260px] min-h-[160px] rounded-xl overflow-hidden bg-[#FFF8E5]">
        <img
          src={photoSrc}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className={`absolute inset-0 h-full w-full rounded-xl ${
            isPlatformIcon
              ? "object-contain object-center p-6 sm:p-10"
              : "object-cover object-top"
          } ${isAuthenticated ? "" : "blur-md"}`}
          onError={() => setPhotoSrc(BSN_PLATFORM_ICON)}
        />
      </div>

      <div className="flex justify-between items-start gap-3 min-w-0">
        <div className="px-1 sm:px-2 space-y-2.5 min-w-0 flex-1">
          <div className="relative flex items-center gap-2">
            <span className="w-4 h-4 shrink-0">
              <icons.profile />
            </span>
            <div className="group min-w-0 flex-1">
              {isAuthenticated ? (
                <div>
                  <p
                    className={`text-sm sm:text-base font-medium truncate group-hover:invisible cursor-pointer`}
                  >
                    {FULL_NAME}
                  </p>
                  <p
                    className={`text-sm sm:text-base absolute top-0 left-0 right-0 rounded-md bg-white p-1 shadow border border-gray-100 whitespace-normal hidden group-hover:block z-10`}
                  >
                    {FULL_NAME}
                  </p>
                </div>
              ) : (
                <BlurText text={FULL_NAME || ""} blurAmount={1} />
              )}
            </div>
          </div>

          <div className="flex relative items-center gap-2">
            <span className="w-4 h-4 shrink-0">
              <icons.email />
            </span>

            <div className="group min-w-0 flex-1">
              {isAuthenticated ? (
                <div>
                  <p
                    className={`text-sm sm:text-base truncate group-hover:invisible cursor-pointer`}
                  >
                    {EMAIL_ADDRESS}
                  </p>
                  <p
                    className={`text-sm sm:text-base absolute top-0 left-0 right-0 rounded-md bg-white p-1 shadow border border-gray-100 break-all hidden group-hover:block z-10`}
                  >
                    {EMAIL_ADDRESS}
                  </p>
                </div>
              ) : (
                <BlurText text={EMAIL_ADDRESS || ""} blurAmount={1} />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-4 h-4 shrink-0">
              <icons.location />
            </span>
            <p className={`text-sm sm:text-base truncate`}>{Nearest_City}</p>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-4 h-4 shrink-0">
              <icons.organization />
            </span>
            {isAuthenticated ? (
              <p className={`text-sm sm:text-base truncate`}>
                {ORGANIZATION_NAME || "not yet updated"}
              </p>
            ) : (
              <BlurText
                text={ORGANIZATION_NAME || "not yet updated"}
                blurAmount={1}
              />
            )}
          </div>

          {AFFILIATION && AFFILIATION.trim() !== "" && (
            <div className="flex items-center gap-1 mt-2 min-w-0">
              <span className="text-yellow-500 text-xl shrink-0">⭐</span>
              {isAuthenticated ? (
                <span className="text-sm break-words">
                  Affiliation - {AFFILIATION}
                </span>
              ) : (
                <BlurText text={`Affiliation - ${AFFILIATION}`} blurAmount={1} />
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 pt-0.5">
          <IndustryHouseIcons iconTag={PRIMARY_INDUSTRY_HOUSE} />
        </div>
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

        {isAuthenticated ? (
          <Link
            href="https://black-sustainability-network.mn.co/"
            target="_blank"
            rel="noreferrer"
            className="bg-[#FFBF23] border border-[#1A1A1A] flex justify-between items-center py-1 px-3 rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="font-bold text-sm capitalize">connect</span>
            <icons.rightArrow />
          </Link>
        ) : (
          <button
            type="button"
            className="bg-[#FFBF23] border border-[#1A1A1A] flex w-full justify-between items-center py-1 px-3 rounded-3xl min-h-[36px]"
            onClick={(e) => {
              e.stopPropagation();
              setAccessModalOpen(true);
            }}
          >
            <span className="font-bold text-sm capitalize">connect</span>
            <icons.rightArrow />
          </button>
        )}
      </div>

      <MemberAccessModal
        isOpen={accessModalOpen}
        onClose={() => setAccessModalOpen(false)}
        showLogo={false}
      />
    </div>
  );
};

export default UserCard;
