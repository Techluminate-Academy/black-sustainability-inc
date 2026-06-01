import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import InfoCard from "../InfoCard";
import {
  getMemberDisplayImage,
  isPlatformIconUrl,
  shouldUseContainedMarkerImage,
} from "@/lib/getMemberDisplayImage";
import L from "leaflet";
import ReactDOMServer from "react-dom/server";
import Image from "next/image";
import MarkerClusterGroup from "react-leaflet-cluster";
import { BsiUserObjectArray } from "@/typings";
import { useMapEvents } from "react-leaflet";
import { LatLngBounds } from "leaflet";


interface MapEventHandlerProps {
  onBoundsChange: (bounds: LatLngBounds) => void;
}
function MapEventHandler({ onBoundsChange }: MapEventHandlerProps) {
  const map = useMapEvents({
    moveend: () => {
      const bounds = map.getBounds();
      onBoundsChange(bounds);
    },
  });
  return null;
}



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

  const photoUrl = getMemberDisplayImage(record.fields);
  const useContainedImage = shouldUseContainedMarkerImage(record.fields);
  const isPlatformIcon = isPlatformIconUrl(photoUrl);
  const industryColor = getColorByIconTag(record.fields["PRIMARY INDUSTRY HOUSE"]);
  const shellBg = useContainedImage ? "#ffffff" : industryColor;
  const imageFitClass = useContainedImage
    ? `object-contain object-center bg-white reverse-rotate-on-img ${
        isPlatformIcon ? "p-1.5" : "p-1"
      }`
    : "object-cover bg-white reverse-rotate-on-img";
  const imageScaleClass = useContainedImage
    ? "absolute inset-[4px] w-[calc(100%-8px)] h-[calc(100%-10px)]"
    : "absolute -top-2 -left-2 inset-0 w-[120%] h-[120%]";

  return (
    <>
      {isAuthenticated ? (
        <div
          style={{
            backgroundColor: shellBg,
            borderColor: industryColor,
          }}
          className="relative w-12 h-16 pin-location overflow-hidden border-[2px]"
        >
          <Image
            src={photoUrl}
            alt="image"
            fill
            loading="lazy"
            className={`${imageScaleClass} ${imageFitClass}`}
          />
        </div>
      ) : (
        <div
          style={{
            backgroundColor: shellBg,
            borderColor: industryColor,
          }}
          className="relative w-12 h-16 pin-location overflow-hidden border-[2px]"
        >
          <Image
            src={photoUrl}
            alt="image"
            fill
            loading="lazy"
            className={`${imageScaleClass} ${imageFitClass} blur-md`}
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
  onBoundsChange: (bounds: LatLngBounds) => void;
}
// Map
const LeafletMap: React.FC<IProps> = ({
  filteredData,
  isAuthenticated,
  loadedData,
  hideCounter,
  onBoundsChange,
}) => {
  const mapCenter: LatLngExpression = [33.7488, -84.3877];

    // Function to fetch markers using the new endpoint based on the map bounds
    const fetchMarkersByBounds = async (bounds: LatLngBounds) => {
      const northEast = bounds.getNorthEast();
      const southWest = bounds.getSouthWest();
      try {
        const res = await fetch(
          `/api/getMarkers?northEastLat=${northEast.lat}&northEastLng=${northEast.lng}&southWestLat=${southWest.lat}&southWestLng=${southWest.lng}`,
          { credentials: "include" }
        );
        const result = await res.json();
        if (result.success) {
          // Update state with new markers here; for demo, we log the data.
          console.log("Fetched markers:", result.data);
          // e.g., setFilteredData(result.data);
        } else {
          console.error("Failed to fetch markers:", result);
        }
      } catch (error) {
        console.error("Error fetching markers:", error);
      }
    }

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

   {/* Use the MapEventHandler to fetch markers on viewport change */}
   <MapEventHandler onBoundsChange={fetchMarkersByBounds} />
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
                  fields={data.fields}
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

export default React.memo( LeafletMap);
