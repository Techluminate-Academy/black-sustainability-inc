import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import InfoCard from "../InfoCard";
import L from "leaflet";
import ReactDOMServer from "react-dom/server";
import Image from "next/image";
import MarkerClusterGroup from "react-leaflet-cluster";

// Custom Icon
const CustomIconContent: React.FC<IProps> = (
  record: any,
  isAuthenticated: boolean
) => {
  isAuthenticated = record?.isAuthenticated;

  const industryProps = [
    {
      label: "💰 Alternative Economics",
      source: "AlternativeEp",
      bgColor: "#177621",
    },
    {
      label: "☀️ Alternative Energy",
      source: "AlternativeEnP",
      bgColor: "#FFBF23",
    },
    {
      label: "🏘 Community Development",
      source: "CommDevP",
      bgColor: "#D86800",
    },
    {
      label: "🧑🏾‍🏫 Education & Cultural Preservation",
      source: "EduP",
      bgColor: "#1A1A1A",
    },
    {
      label: "Environmental Justice/Advocacy",
      source: "AlternativeEnP",
      bgColor: "#00FF00",
    },

    { label: "🛖 Eco-friendly Building", source: "EcoP", bgColor: "#D2CA00" },
    { label: "♻️ Green Lifestyle", source: "Green", bgColor: "#FF902B" },
    {
      label: "🆘 Survival/Preparedness",
      source: "Preparedness",
      bgColor: "#FF2B2B",
    },
    {
      label: "🌾 Agriculture/Sustainable Food Production / Land Management",
      source: "agric",
      bgColor: "#82DD3A",
    },
    { label: "🗑 Waste", source: "waste", bgColor: "#AC7F55" },
    { label: "💧Water", source: "water", bgColor: "#4D64FF" },
    { label: "🧘🏿‍♀️ Wholistic Health", source: "wholistic", bgColor: "#7B1EF2" },
    { label: "❓ Other", source: "EcoP", bgColor: "#7B1EF2" },
  ];

  function getColorByIconTag(iconTag: string) {
    // Find the item with the matching label
    const selectedIcon = industryProps.find((item) => item.label === iconTag);

    // If a matching item is found, return its bgColor
    return selectedIcon ? selectedIcon.bgColor : "";
  }
  const photoUrl = record.fields?.userphoto;
  return (
    <>
      {isAuthenticated ? (
        <div
          style={{
            backgroundColor: getColorByIconTag(
              record.fields["PRIMARY INDUSTRY HOUSE"]
            ),
            borderColor: getColorByIconTag(
              record.fields["PRIMARY INDUSTRY HOUSE"]
            ),
          }}
          className={`relative w-12 h-16 pin-location overflow-hidden border-[2px] `}
        >
          <Image
            src={photoUrl || "/png/default.png"}
            alt="image"
            fill
            loading="lazy"
            className={`absolute -top-2 -left-2 inset-0 w-[120%] h-[120%] object-cover bg-white reverse-rotate-on-img`}
          />
        </div>
      ) : (
        <div
          style={{
            backgroundColor: getColorByIconTag(
              record.fields["PRIMARY INDUSTRY HOUSE"]
            ),
            borderColor: getColorByIconTag(
              record.fields["PRIMARY INDUSTRY HOUSE"]
            ),
          }}
          className={`relative w-12 h-16 pin-location overflow-hidden border-[2px] `}
        >
          <Image
            src={photoUrl || "/png/default.png"}
            alt="image"
            fill
            loading="lazy"
            className={`absolute -top-2 -left-2 inset-0 w-[120%] h-[120%] object-cover blur-md bg-white reverse-rotate-on-img`}
          />
        </div>
      )}
    </>
  );
};

// Convert the JSX to a string
const customIconHtml = (props: any, isAuthenticated: boolean) => {
  return ReactDOMServer.renderToString(
    <CustomIconContent isAuthenticated={isAuthenticated} {...props} />
  );
};

// Filtered Data Type
type PhotoThumbnail = {
  url?: string;
  width?: number;
  height?: number;
};

type Photo = {
  id?: string;
  width?: number;
  height?: number;
  url?: string;
  filename?: string;
  size?: number;
  type?: string;
  thumbnails?: {
    small?: PhotoThumbnail;
    large?: PhotoThumbnail;
    full?: PhotoThumbnail;
  };
};

type Attachment = {
  id?: string;
  width?: number;
  height?: number;
  url?: string;
  filename?: string;
  size?: number;
  type?: string;
  thumbnails?: {
    small?: PhotoThumbnail;
    large?: PhotoThumbnail;
    full?: PhotoThumbnail;
  };
};

type CreatedBy = {
  id?: string;
  email?: string;
  name?: string;
};

type Fields = {
  "EMAIL ADDRESS"?: string;
  BIO?: string;
  PHOTO?: Photo[];
  PHONE?: string;
  IDENTIFICATION?: string;
  "FIRST NAME"?: string;
  "LAST NAME"?: string;
  "PRIMARY INDUSTRY HOUSE"?: string;
  WEBSITE?: string;
  GENDER?: string;
  Country?: string[];
  "State/Province"?: string;
  "Location (Nearest City)"?: string;
  "Name (from Location)"?: string;
  "WELCOMED?"?: boolean;
  "ORGANIZATION NAME"?: string;
  "MEMBER LEVEL"?: string[];
  "Send Welcome Email"?: boolean;
  State?: string;
  "State New"?: string[];
  "SMS Status"?: string;
  "SMS Content"?: string;
  "Equity Member (keep current)"?: boolean;
  Latitude?: string;
  Longitude?: string;
  "In Mighty Network"?: boolean;
  "Attachments (from MEMBER LEVEL)"?: Attachment[];
  "Created By"?: CreatedBy;
  "FULL NAME"?: string;
  Created?: string;
  "Annual Profile Update Automation"?: string;
  userphoto?: string;
};

type FilteredDataType = {
  id?: string;
  createdTime?: string;
  fields?: Fields;
};

interface IProps {
  filteredData: FilteredDataType[];
  isAuthenticated: boolean;
}

// Map
const LeafletMap: React.FC<IProps> = ({ filteredData, isAuthenticated }) => {
  const [serverData, setServerData] = useState<any>();
  const mapCenter: LatLngExpression = [33.7488, -84.3877];

  const customIcon = (props: any) =>
    L.divIcon({
      html: customIconHtml(props, isAuthenticated),
    });

  return (
    <MapContainer
      center={mapCenter}
      zoom={5}
      style={{ height: "100vh", width: "100%", zIndex: "-1 !important" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <MarkerClusterGroup chunkedLoading>
        {filteredData?.map((data: any) => {
          return (
            <Marker
              key={data}
              position={{
                lat: data?.fields?.lat || 33.7488,
                lng: data?.fields?.lng || -84.3877,
              }}
              icon={customIcon(data)}
            >
              <Popup
                position={{
                  lat: data?.fields?.lat || 33.7488,
                  lng: data?.fields?.lng || -84.3877,
                }}
              >
                <InfoCard
                  imgUrl={data.fields?.userphoto || "/png/default.png"}
                  LAST_NAME={data.fields["LAST NAME"]}
                  FIRST_NAME={data.fields["FIRST NAME"]}
                  BIO={data.fields?.BIO}
                  EMAIL_ADDRESS={data.fields["EMAIL ADDRESS"]}
                  ORGANIZATION_NAME={data.fields["ORGANIZATION NAME"]}
                  Nearest_City={data.fields["Location (Nearest City)"]}
                  // State_Province={selectedMarker.State_Province}
                  // Country={selectedMarker.Country}
                  WEBSITE={data.fields.WEBSITE}
                  MEMBER_LEVEL={data.fields["MEMBER LEVEL"]}
                  isAuthenticated={isAuthenticated}
                />
              </Popup>
            </Marker>
          );
        })}
      </MarkerClusterGroup>
    </MapContainer>
  );
};

export default LeafletMap;
