"use client";
import { useState, useRef, useEffect } from "react";
import { AdvancedMarker, useMap, InfoWindow } from "@vis.gl/react-google-maps";
import InfoCard from "../InfoCard";
import type { Marker } from "@googlemaps/markerclusterer";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import Image from "next/image";
import BlurImage from "../BlurImage";

type Point = google.maps.LatLngLiteral & { key: string };
type Props = {
  points: Point[];
  isAuthenticated: boolean;
};

const Marker = ({ points, isAuthenticated }: Props) => {
  const map = useMap();
  const mapCenter = map?.getCenter();
  const [selectedMarker, setSelectedMarker] = useState<any>();

  // empty or close InfoWindow when position changes(user drags)
  useEffect(() => {
    map && setSelectedMarker(null);
  }, [map, mapCenter]);

  // CLustering
  const [markers, setMarkers] = useState<{ [key: string]: Marker }>({});
  const clusterer = useRef<MarkerClusterer | null>(null);

  // Gain access to the cluster
  useEffect(() => {
    if (!clusterer.current) {
      clusterer.current = new MarkerClusterer({ map });
    }
  }, [map]);

  useEffect(() => {
    clusterer.current?.clearMarkers();
    clusterer.current?.addMarkers(Object.values(markers));
  }, [markers]);

  const setMarkerRef = (marker: Marker | null, key: string) => {
    // update the state when necessary
    if (!marker) return;
    if (marker && markers[key]) return;
    if (!marker && !markers[key]) return;

    // where the excess rerendering is coming from

    setMarkers((prev) => {
      if (marker) {
        return { ...prev, [key]: marker };
      } else {
        const newMarkers = { ...prev };
        delete newMarkers[key];
        return newMarkers;
      }
    });
  };

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
  return (
    <>
      {points.length &&
        points?.map((record: any) => {
          // Check if record has the fields property and PHOTO exists
          const photoUrl =
            record.fields &&
            record.fields.PHOTO &&
            record.fields.PHOTO[0]?.thumbnails?.large?.url;

          return (
            <div
              onMouseOver={() => {
                setSelectedMarker(record.fields);
              }}
              key={record.id}
            >
              <AdvancedMarker
                draggable={true}
                position={{
                  lat: record.fields?.["LATITUDE (NEW)"],
                  lng: record.fields?.["LONGITUDE (NEW)"],
                }}
                key={record.id}
                onClick={() => setSelectedMarker(record.fields)}
                ref={(marker) => setMarkerRef(marker, record.id)}
              >
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
                  {isAuthenticated ? (
                    <Image
                      src={photoUrl || "/png/default.png"}
                      alt="image"
                      fill
                      loading="lazy"
                      className={`absolute -top-2 -left-2 inset-0 w-[120%] h-[120%] object-cover bg-white reverse-rotate-on-img`}
                    />
                  ) : (
                    <BlurImage imageUrl={photoUrl} blurAmount={16} />
                  )}
                </div>
              </AdvancedMarker>
            </div>
          );
        })}

      {selectedMarker && (
        <InfoWindow
          position={{
            lat: selectedMarker?.["LATITUDE (NEW)"],
            lng: selectedMarker?.["LONGITUDE (NEW)"],
          }}
          onCloseClick={() => setSelectedMarker(null)}
        >
          <InfoCard
            imgUrl={
              (selectedMarker.PHOTO &&
                selectedMarker.PHOTO[0]?.thumbnails?.large?.url) ||
              "/png/default.png"
            }
            LAST_NAME={selectedMarker["LAST NAME"]}
            FIRST_NAME={selectedMarker["FIRST NAME"]}
            BIO={selectedMarker?.BIO}
            EMAIL_ADDRESS={selectedMarker["EMAIL ADDRESS"]}
            ORGANIZATION_NAME={selectedMarker["ORGANIZATION NAME"]}
            Nearest_City={selectedMarker["Location (Nearest City)"]}
            State_Province={selectedMarker.State_Province}
            Country={selectedMarker.Country}
            WEBSITE={selectedMarker.WEBSITE}
            MEMBER_LEVEL={selectedMarker["MEMBER LEVEL"]}
            isAuthenticated={isAuthenticated}
          />
        </InfoWindow>
      )}
    </>
  );
};

export default Marker;
