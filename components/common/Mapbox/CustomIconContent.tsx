"use client";
import React from "react";

const DEFAULT_PHOTO = "/png/default.png";

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

function resolvePhotoSrc(fields: CustomIconContentProps["record"]["fields"]): string {
  const p = fields?.PHOTO;
  if (typeof p === "string" && p.trim()) return p.trim();
  if (Array.isArray(p) && p.length > 0) {
    const first = p[0];
    if (first?.thumbnails?.full?.url) return first.thumbnails.full.url;
    if (first?.thumbnails?.large?.url) return first.thumbnails.large.url;
    if (first?.thumbnails?.small?.url) return first.thumbnails.small.url;
    if (first?.url) return first.url;
  }
  return DEFAULT_PHOTO;
}

const CustomIconContent: React.FC<CustomIconContentProps> = ({ record }) => {
  const { isAuthenticated, fields } = record;
  const bgColor = getColorByIconTag(fields["PRIMARY INDUSTRY HOUSE"]);
  const src = resolvePhotoSrc(fields);

  return (
    <div
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
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: bgColor,
          borderColor: bgColor,
          transform: "rotate(-35deg)",
          border: "1.9px solid",
          overflow: "hidden",
          borderRadius: "52% 52% 100% 0% / 95% 38% 62% 5%",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "128%",
            height: "125%",
            transform: "translate(-50%, -50%) rotate(35deg)",
          }}
        >
          <img
            src={src}
            alt=""
            width={60}
            height={64}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const el = e.currentTarget;
              if (el.src.endsWith(DEFAULT_PHOTO)) return;
              el.src = DEFAULT_PHOTO;
            }}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              backgroundColor: "white",
              filter: !isAuthenticated ? "blur(8px)" : "none",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default CustomIconContent;
