import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import InfoCard from "../InfoCard";
import L from "leaflet";
import ReactDOMServer from "react-dom/server";
import Image from "next/image";
import MarkerClusterGroup from "react-leaflet-cluster";
import { BsiUserObjectArray } from "@/typings";
import { formattedImpactAreas } from "@/data/formattedImpactAreas";
import ImpactAreaCard from "@/components/common/ImpactAreaCard/ImpactAreaCard";

const CustomIconContent = (record: any, isAuthenticated: boolean) => {
  const iconTag = record.fields?.["PRIMARY INDUSTRY HOUSE"];
  const photoUrl = record.fields?.userphoto;

  const industryProps = [
    { label: "💰 Alternative Economics", bgColor: "#BD7B38" },
    { label: "☀️ Alternative Energy", bgColor: "#FFBF23" },
    { label: "🏘 Community Development", bgColor: "#FBEAB4" },
    { label: "🧑🏾‍🏫 Education & Cultural Preservation", bgColor: "#6D1199" },
    { label: "Environmental Justice/Advocacy", bgColor: "#00FF00" },
    { label: "🛖 Eco-friendly Building", bgColor: "#CBE170" },
    { label: "♻️ Green Lifestyle", bgColor: "#009845" },
    { label: "🆘 Survival/Preparedness", bgColor: "#C4391D" },
    { label: "🌾 Agriculture/Sustainable Food Production / Land Management", bgColor: "#82DD3A" },
    { label: "🗑 Waste", bgColor: "#2C4F40" },
    { label: "💧Water", bgColor: "#8CB1CF" },
    { label: "🧘🏿‍♀️ Wholistic Health", bgColor: "#ED751C" },
    { label: "❓ Other", bgColor: "#FF0000" },
  ];

  const getColorByIconTag = (tag: string) => {
    const match = industryProps.find((item) => item.label === tag);
    return match?.bgColor || "#D3D3D3";
  };

  const isImpactArea = record.isImpactArea;

  return isImpactArea ? (
    <div
      className="w-8 h-8 text-white text-lg font-bold flex items-center justify-center rounded-full border-2 border-white shadow-md"
      style={{ backgroundColor: getColorByIconTag(iconTag) }}
    >
      !
    </div>
  ) : (
    <div
      style={{
        backgroundColor: getColorByIconTag(iconTag),
        borderColor: getColorByIconTag(iconTag),
      }}
      className="relative w-12 h-16 pin-location overflow-hidden border-[2px]"
    >
      <Image
        src={photoUrl || "/png/default.png"}
        alt="image"
        fill
        loading="lazy"
        className="absolute -top-2 -left-2 inset-0 w-[120%] h-[120%] object-cover bg-white"
      />
    </div>
  );
};

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
  showImpactAreas: boolean;
  showMembers: boolean;

}

const LeafletMap: React.FC<IProps> = ({
  filteredData,
  isAuthenticated,
  loadedData,
  hideCounter,
  showImpactAreas,
  showMembers
}) => {
  const mapCenter: LatLngExpression = [33.7488, -84.3877];

  const customIcon = (props: any) =>
    L.divIcon({
      html: customIconHtml(props, isAuthenticated),
      className: "",
      iconSize: [30, 36],
    });

  return (
    <MapContainer
      className="relative"
      center={mapCenter}
      zoom={3}
      minZoom={2}
      maxZoom={18}
      style={{ height: "100vh", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      <MarkerClusterGroup chunkedLoading>
        {showMembers && filteredData?.map((data: any) => (
          <Marker
            key={data.id}
            position={{
              lat: data?.fields?.["LATITUDE (NEW)"] || 33.7488,
              lng: data?.fields?.["LONGITUDE (NEW)"] || -84.3877,
            }}
            icon={customIcon(data)}
          >
            <Popup>
              <InfoCard
                imgUrl={data.fields?.userphoto || "/png/default.png"}
                LAST_NAME={data.fields["LAST NAME"] || ""}
                FIRST_NAME={data.fields["FIRST NAME"] || ""}
                BIO={data.fields?.BIO || ""}
                EMAIL_ADDRESS={data.fields["EMAIL ADDRESS"] || ""}
                ORGANIZATION_NAME={data.fields["ORGANIZATION NAME"] || ""}
                Nearest_City={`${data.fields["Location (Nearest City)"] ?? ""}${
                  data.fields["Location (Nearest City)"] && data.fields["Name (from Location)"]
                    ? ", "
                    : ""
                }${data.fields["Name (from Location)"] ?? ""}`}
                WEBSITE={data.fields.WEBSITE || ""}
                MEMBER_LEVEL={data.fields["MEMBER LEVEL"] || ""}
                isAuthenticated={isAuthenticated}
              />
            </Popup>
          </Marker>
        ))}

        {  showImpactAreas && formattedImpactAreas
          .filter(
            (data) =>
              typeof data.fields?.["LATITUDE (NEW)"] === "number" &&
              typeof data.fields?.["LONGITUDE (NEW)"] === "number"
          )
          .map((data: any) => (
            <Marker
              key={data.id}
              position={{
                lat: data.fields["LATITUDE (NEW)"],
                lng: data.fields["LONGITUDE (NEW)"],
              }}
              icon={customIcon({ ...data, isImpactArea: true })}
              zIndexOffset={1000}
            >
              <Popup>
                <ImpactAreaCard
                  imgUrl={data.fields?.userphoto || "/png/default.png"}
                  ORGANIZATION_NAME={data.fields["PRIMARY INDUSTRY HOUSE"]}
                  Nearest_City={"Impact Area"}
                  BIO={data.fields?.BIO}
                  MEMBER_LEVEL={"Impact Need"}
                  isAuthenticated={isAuthenticated}
                />
              </Popup>
            </Marker>
          ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
};

export default LeafletMap;
