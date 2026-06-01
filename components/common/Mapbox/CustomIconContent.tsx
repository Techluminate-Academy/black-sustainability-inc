"use client";
import React, { useEffect, useState } from "react";
import {
  BSN_PLATFORM_ICON,
  getMemberDisplayImage,
  isPlatformIconUrl,
  shouldUseContainedMarkerImage,
} from "@/lib/getMemberDisplayImage";

interface CustomIconContentProps {
  record: {
    isAuthenticated: boolean;
    fields: {
      "PRIMARY INDUSTRY HOUSE"?: string;
      PHOTO?:
        | {
            url: string;
            thumbnails?: {
              full?: { url: string };
              large?: { url: string };
              small?: { url: string };
            };
          }[]
        | string;
    };
  };
}

const industryProps = [
  { label: "💰 Alternative Economics", source: "AlternativeEp", bgColor: "#BD7B38" },
  { label: "☀️ Alternative Energy", source: "AlternativeEnP", bgColor: "#FFBF23" },
  { label: "🏘 Community Development", source: "CommDevP", bgColor: "#FBEAB4" },
  { label: "🧑🏾‍🏫 Education & Cultural Preservation", source: "EduP", bgColor: "#6D1199" },
  { label: "Environmental Justice/Advocacy", source: "AlternativeEnP", bgColor: "#00FF00" },
  { label: "🛖 Eco-friendly Building", source: "EcoP", bgColor: "#CBE170" },
  { label: "♻️ Green Lifestyle", source: "Green", bgColor: "#009845" },
  { label: "🆘 Survival/Preparedness", source: "Preparedness", bgColor: "#C4391D" },
  { label: "🌾 Agriculture/Sustainable Food Production / Land Management", source: "agric", bgColor: "#82DD3A" },
  { label: "🌾 Reparative Agriculture", source: "agric", bgColor: "#82DD3A" },
  { label: "🗑 Waste", source: "waste", bgColor: "#2C4F40" },
  { label: "💧Water", source: "water", bgColor: "#8CB1CF" },
  { label: "🧘🏿‍♀️ Wholistic Health", source: "wholistic", bgColor: "#ED751C" },
  { label: "❓ Other", source: "EcoP", bgColor: "#FF0000" },
];

const getColorByIconTag = (iconTag?: string): string => {
  const found = industryProps.find((item) => item.label === iconTag);
  return found ? found.bgColor : "#ccc";
};

/** Original teardrop headshot layout — inline so renderToStaticMarkup markers render correctly. */
const HEADSHOT_WRAP_STYLE: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "50%",
  width: "128%",
  height: "125%",
  transform: "translate(-50%, -50%) rotate(35deg)",
};

const HEADSHOT_IMG_STYLE: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  backgroundColor: "white",
};

/** Contained logo / platform icon inside the teardrop. */
const LOGO_WRAP_STYLE: React.CSSProperties = {
  position: "absolute",
  inset: "6% 6% 14% 6%",
  transform: "rotate(35deg)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#ffffff",
};

const CustomIconContent: React.FC<CustomIconContentProps> = ({ record }) => {
  const { isAuthenticated, fields } = record;
  const fieldMap = fields as Record<string, unknown>;
  const bgColor = getColorByIconTag(fields["PRIMARY INDUSTRY HOUSE"]);
  const resolvedSrc = getMemberDisplayImage(fieldMap);
  const [imageSrc, setImageSrc] = useState(resolvedSrc);
  const [failedToLoad, setFailedToLoad] = useState(false);
  const imageFilter = !isAuthenticated ? "blur(8px)" : "none";

  useEffect(() => {
    setImageSrc(resolvedSrc);
    setFailedToLoad(false);
  }, [resolvedSrc]);

  const useContainLayout =
    failedToLoad ||
    shouldUseContainedMarkerImage(fieldMap) ||
    isPlatformIconUrl(imageSrc);
  const isPlatformIcon = isPlatformIconUrl(imageSrc);

  const logoImgStyle: React.CSSProperties = {
    display: "block",
    maxWidth: isPlatformIcon ? "92%" : "88%",
    maxHeight: isPlatformIcon ? "72%" : "82%",
    width: "auto",
    height: "auto",
    objectFit: "contain",
    objectPosition: "center",
    backgroundColor: "transparent",
    filter: imageFilter,
  };

  const headshotImgStyle: React.CSSProperties = {
    ...HEADSHOT_IMG_STYLE,
    filter: imageFilter,
  };

  return (
    <div
      data-marker-root
      style={{
        width: "48px",
        height: "64px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "auto",
      }}
    >
      <div
        data-marker-shell
        data-industry-color={bgColor}
        data-layout-mode={useContainLayout ? "contain" : "cover"}
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: useContainLayout ? "#ffffff" : bgColor,
          borderColor: bgColor,
          transform: "rotate(-35deg)",
          border: "1.9px solid",
          overflow: "hidden",
          borderRadius: "52% 52% 100% 0% / 95% 38% 62% 5%",
          position: "relative",
        }}
      >
        {useContainLayout ? (
          <div data-marker-image-wrap style={LOGO_WRAP_STYLE}>
            <img
              data-marker-image
              src={imageSrc}
              alt=""
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              style={logoImgStyle}
              onError={() => {
                if (!imageSrc.endsWith(BSN_PLATFORM_ICON)) {
                  setImageSrc(BSN_PLATFORM_ICON);
                  setFailedToLoad(true);
                }
              }}
            />
          </div>
        ) : (
          <div data-marker-image-wrap style={HEADSHOT_WRAP_STYLE}>
            <img
              data-marker-image
              src={imageSrc}
              alt=""
              width={60}
              height={64}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              style={headshotImgStyle}
              onError={() => {
                setImageSrc(BSN_PLATFORM_ICON);
                setFailedToLoad(true);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomIconContent;
