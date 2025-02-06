import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import InfoCard from "../InfoCard";
import L from "leaflet";
import ReactDOMServer from "react-dom/server";
import Image from "next/image";
import MarkerClusterGroup from "react-leaflet-cluster";
import { BsiUserObjectArray } from "@/typings";

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
      bgColor: "#BD7B38",
    },
    {
      label: "☀️ Alternative Energy",
      source: "AlternativeEnP",
      bgColor: "#FFBF23",
    },
    {
      label: "🏘 Community Development",
      source: "CommDevP",
      bgColor: "#FBEAB4",
    },
    {
      label: "🧑🏾‍🏫 Education & Cultural Preservation",
      source: "EduP",
      bgColor: "#6D1199",
    },
    {
      label: "Environmental Justice/Advocacy",
      source: "AlternativeEnP",
      bgColor: "#00FF00",
    },

    { label: "🛖 Eco-friendly Building", source: "EcoP", bgColor: "#CBE170" },
    { label: "♻️ Green Lifestyle", source: "Green", bgColor: "#009845" },
    {
      label: "🆘 Survival/Preparedness",
      source: "Preparedness",
      bgColor: "#C4391D",
    },
    {
      label: "🌾 Agriculture/Sustainable Food Production / Land Management",
      source: "agric",
      bgColor: "#82DD3A",
    },
    { label: "🗑 Waste", source: "waste", bgColor: "#2C4F40" },
    { label: "💧Water", source: "water", bgColor: "#8CB1CF" },
    { label: "🧘🏿‍♀️ Wholistic Health", source: "wholistic", bgColor: "#ED751C" },
    { label: "❓ Other", source: "EcoP", bgColor: "#FF0000" },
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


interface IProps {
  isAuthenticated: boolean;
  filteredData: BsiUserObjectArray | undefined;
  loadedData: any;
  hideCounter: boolean;
}
// Map
const LeafletMap: React.FC<IProps> = ({
  filteredData,
  isAuthenticated,
  loadedData,
  hideCounter,
}) => {
  const mapCenter: LatLngExpression = [33.7488, -84.3877];

  const customIcon = (props: any) =>
    L.divIcon({
      html: customIconHtml(props, isAuthenticated),
    });

  return (
    <MapContainer
      className="relative"
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
              key={data.id}
              position={{
                lat: data?.fields?.["LATITUDE (NEW)"] || 33.7488,
                lng: data?.fields?.["LONGITUDE (NEW)"] || -84.3877,
              }}
              icon={customIcon(data)}
            >
              <Popup
                position={{
                  lat: data?.fields?.["LATITUDE (NEW)"] || 33.7488,
                  lng: data?.fields?.["LONGITUDE (NEW)"] || -84.3877,
                }}
              >
                <InfoCard
                  imgUrl={data.fields?.userphoto || "/png/default.png"}
                  LAST_NAME={data.fields["LAST NAME"]}
                  FIRST_NAME={data.fields["FIRST NAME"]}
                  BIO={data.fields?.BIO}
                  EMAIL_ADDRESS={data.fields["EMAIL ADDRESS"]}
                  ORGANIZATION_NAME={data.fields["ORGANIZATION NAME"]}
                  Nearest_City ={`${data.fields["Location (Nearest City)"] ?? ""}${data.fields["Location (Nearest City)"] && data.fields["Name (from Location)"] ? ", " : ""}${data.fields["Name (from Location)"] ?? ""}`}
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
