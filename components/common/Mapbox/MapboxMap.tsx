"use client";
import React, { useEffect, useRef } from "react";
import mapboxgl, { Map as MapboxMap } from "mapbox-gl";
import ReactDOMServer from "react-dom/server";
import CustomIconContent from "./CustomIconContent";
import InfoCard from "../InfoCard"; // Adjust path if needed
import "mapbox-gl/dist/mapbox-gl.css";
import { LatLngBounds } from "leaflet";
import { BsiUserObjectArray } from "@/typings";

interface IProps {
  isAuthenticated: boolean;
  filteredData: BsiUserObjectArray | undefined; // We'll pass bounding-box results in here
  loadedData: any;
  hideCounter: boolean;
  onBoundsChange: (bounds: LatLngBounds) => void; // Called on map move/zoom
}

interface MarkerWithId {
  marker: mapboxgl.Marker;
  recordId: string | number;
}

// For offsetting duplicates
const OFFSET_RADIUS = 0.0001;
function offsetDuplicateCoordinates(dataArray: any[]) {
  const coordMap: Record<string, any[]> = {};

  for (const item of dataArray) {
    const lat = item.fields?.["LATITUDE (NEW)"];
    const lng = item.fields?.["LONGITUDE (NEW)"];
    if (lat == null || lng == null) continue;

    const key = `${lat},${lng}`;
    if (!coordMap[key]) coordMap[key] = [];
    coordMap[key].push(item);
  }

  for (const key in coordMap) {
    const group = coordMap[key];
    if (group.length <= 1) continue;

    const [originalLat, originalLng] = key.split(",").map(parseFloat);
    const angleStep = (2 * Math.PI) / group.length;
    for (let i = 0; i < group.length; i++) {
      const angle = i * angleStep;
      const dLat = Math.sin(angle) * OFFSET_RADIUS;
      const dLng = Math.cos(angle) * OFFSET_RADIUS;
      group[i].fields["LATITUDE (NEW)"] = originalLat + dLat;
      group[i].fields["LONGITUDE (NEW)"] = originalLng + dLng;
    }
  }
}

// Build HTML marker element
const createMarkerElement = (record: any, isAuthenticated: boolean): HTMLElement => {
  const htmlString = ReactDOMServer.renderToStaticMarkup(
    <CustomIconContent record={{ ...record, isAuthenticated }} />
  );
  const el = document.createElement("div");
  el.innerHTML = htmlString;
  return el.firstElementChild as HTMLElement;
};

const MapboxMapComponent: React.FC<IProps> = ({
  filteredData,
  isAuthenticated,
  loadedData,
  hideCounter,
  onBoundsChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef<MarkerWithId[]>([]);

  const mapCenter: [number, number] = [-84.3877, 33.7488];

  useEffect(() => {
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_API_TOKEN || "";

    // If we have filteredData, offset duplicates (if not done earlier)
    // Then build or update the map
    if (mapContainerRef.current && !mapRef.current && filteredData) {
      offsetDuplicateCoordinates(filteredData);

      // Create the Map
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: mapCenter,
        zoom: 5,
      });

      mapRef.current.on("load", () => {
        if (!mapRef.current) return;

        // Build cluster source
        const geoJsonData = {
          type: "FeatureCollection",
          features: filteredData.map((item: any) => ({
            type: "Feature",
            properties: { id: item.id },
            geometry: {
              type: "Point",
              coordinates: [
                parseFloat(item.fields?.["LONGITUDE (NEW)"]) || mapCenter[0],
                parseFloat(item.fields?.["LATITUDE (NEW)"]) || mapCenter[1],
              ],
            },
          })),
        };

        mapRef.current.addSource("users-cluster", {
          type: "geojson",
          data: geoJsonData,
          cluster: true,
          clusterMaxZoom: 20,
          clusterRadius: 30,
        });

        // Add cluster layers
        mapRef.current.addLayer({
          id: "clusters",
          type: "circle",
          source: "users-cluster",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": [
              "step",
              ["get", "point_count"],
              "#82DD3A",
              10,
              "#FFBF23",
              25,
              "#BD7B38",
              50,
              "#C4391D",
            ],
            "circle-radius": [
              "step",
              ["get", "point_count"],
              15,
              10,
              20,
              25,
              25,
              50,
              30,
            ],
            "circle-opacity": 0.85,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#fff",
          },
        });

        mapRef.current.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: "users-cluster",
          filter: ["has", "point_count"],
          layout: {
            "text-field": "{point_count_abbreviated}",
            "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
            "text-size": 14,
          },
          paint: {
            "text-color": "#000",
          },
        });

        // Expand cluster on click
        mapRef.current.on("click", "clusters", (e) => {
          const features = mapRef.current?.queryRenderedFeatures(e.point, { layers: ["clusters"] });
          if (!features || !features[0]) return;

          const clusterId = features[0].properties?.cluster_id;
          const source = mapRef.current?.getSource("users-cluster") as mapboxgl.GeoJSONSource;
          source.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;
            mapRef.current?.easeTo({
              center: (features[0].geometry as any).coordinates,
              zoom,
              duration: 1000,
            });
          });
        });

        // Create individual markers + popups
        filteredData.forEach((data: any) => {
          const markerEl = createMarkerElement(data, isAuthenticated);
          const popupHtml = ReactDOMServer.renderToStaticMarkup(
            <div className="popup-wrapper">
              <InfoCard
                imgUrl={data.fields?.userphoto || "/png/default.png"}
                LAST_NAME={data.fields["LAST NAME"]}
                FIRST_NAME={data.fields["FIRST NAME"]}
                BIO={data.fields?.BIO}
                EMAIL_ADDRESS={data.fields["EMAIL ADDRESS"]}
                ORGANIZATION_NAME={data.fields["ORGANIZATION NAME"]}
                Nearest_City={`${data.fields["Location (Nearest City)"] ?? ""}`}
                WEBSITE={data.fields.WEBSITE}
                MEMBER_LEVEL={data.fields["MEMBER LEVEL"]}
                isAuthenticated={isAuthenticated}
              />
            </div>
          );

          const popup = new mapboxgl.Popup({
            offset: 25,
            closeButton: false,
            className: "custom-popup",
          }).setHTML(popupHtml);

          const marker = new mapboxgl.Marker({ element: markerEl })
            .setLngLat({
              lng: parseFloat(data.fields?.["LONGITUDE (NEW)"]) || mapCenter[0],
              lat: parseFloat(data.fields?.["LATITUDE (NEW)"]) || mapCenter[1],
            })
            .setPopup(popup)
            .addTo(mapRef.current!);

          markersRef.current.push({ marker, recordId: data.id });
        });

        // Hide markers if they're in a cluster
        const hideClusteredMarkers = () => {
          if (!mapRef.current) return;
          const unclusteredFeatures = mapRef.current.querySourceFeatures("users-cluster", {
            filter: ["!", ["has", "point_count"]]
          });
          const unclusteredIds = new Set(unclusteredFeatures.map((f) => f.properties?.id));
          markersRef.current.forEach(({ marker, recordId }) => {
            const el = marker.getElement();
            if (unclusteredIds.has(recordId)) {
              el.style.display = "block";
            } else {
              el.style.display = "none";
            }
          });
        };
        mapRef.current.on("render", hideClusteredMarkers);
      });

      // On map moveend => call onBoundsChange
      mapRef.current.on("moveend", () => {
        const bounds = mapRef.current!.getBounds();
        // Convert mapboxgl bounds to Leaflet-ish LatLngBounds if needed
        // Or just pass the data:
        if (onBoundsChange) {
          const fakeLeafletBounds = {
            getNorthEast: () => ({ lat: bounds.getNorthEast().lat, lng: bounds.getNorthEast().lng }),
            getSouthWest: () => ({ lat: bounds.getSouthWest().lat, lng: bounds.getSouthWest().lng }),
          } as unknown as LatLngBounds;
          onBoundsChange(fakeLeafletBounds);
        }
      });
    }

    // Cleanup
    return () => {
      markersRef.current.forEach(({ marker }) => marker.remove());
      mapRef.current?.remove();
    };
  }, [filteredData, isAuthenticated, onBoundsChange]);

  return <div ref={mapContainerRef} style={{ height: "100vh", width: "100%" }} />;
};

export default React.memo(MapboxMapComponent);
