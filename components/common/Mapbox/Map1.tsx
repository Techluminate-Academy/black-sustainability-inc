"use client";
import React, { useEffect, useRef } from "react";
import mapboxgl, { Map as MapboxMap } from "mapbox-gl";
import ReactDOMServer from "react-dom/server";
import CustomIconContent from "./CustomIconContent";
import InfoCard from "../InfoCard"; // Adjust path if needed
import "mapbox-gl/dist/mapbox-gl.css";
import { LatLngBounds } from "leaflet";
import { BsiUserObjectArray } from "@/typings";
import static_locations from '../../../constants/static_locations.json'
interface IProps {
  isAuthenticated: boolean;
  loadedData: any;
  hideCounter: boolean;
  onMarkerHover: (bounds: LatLngBounds) => void; // Called on map move/zoom
}

interface MarkerWithId {
  marker: mapboxgl.Marker;
  recordId: string | number;
}

const BASE_OFFSET = 0.0047; // base distance

function offsetDuplicateCoordinates(dataArray: any[]) {
  const coordMap: Record<string, any[]> = {};

  for (const item of dataArray) {
    const lat = item.location.coordinates[1];
    const lng = item.location.coordinates[0];
    if (lat == null || lng == null) continue;

    const key = `${lat},${lng}`;
    coordMap[key] = coordMap[key] || [];
    coordMap[key].push(item);
  }

  for (const key in coordMap) {
    const group = coordMap[key];
    if (group.length <= 1) continue;

    const [originalLat, originalLng] = key.split(",").map(parseFloat);
    const angleStep = (2 * Math.PI) / group.length;

    for (let i = 0; i < group.length; i++) {
      const angle = i * angleStep;
      const dynamicOffset = BASE_OFFSET + (group.length * 0.00001); // Spread out more for larger groups
      const dLat = Math.sin(angle) * dynamicOffset;
      const dLng = Math.cos(angle) * dynamicOffset;

      group[i].lat = originalLat + dLat;
      group[i].lng = originalLng + dLng;
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
  isAuthenticated,
  onMarkerHover,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef<MarkerWithId[]>([]);
  const mapCenter: [number, number] = [-84.3877, 33.7488];

  useEffect(() => {
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_API_TOKEN || "";

    let fetchedLocations: any[] = [];

    // Your static placeholders
    const staticLocations = static_locations
    const initMap = async () => {
      try {
        // Start with static locations
        fetchedLocations = staticLocations;
        offsetDuplicateCoordinates(fetchedLocations);
    
        if (mapContainerRef.current && !mapRef.current) {
    
          mapRef.current = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: "mapbox://styles/mapbox/streets-v12",
            center: mapCenter,
            zoom: 5,
          });
    
          mapRef.current.on("load", async () => {
            if (!mapRef.current) return;
    
            const geoJsonData = {
              type: "FeatureCollection",
              features: fetchedLocations.map((item: any) => ({
                type: "Feature",
                properties: { id: item.id },
                geometry: {
                  type: "Point",
                  coordinates: [
                    parseFloat(item.location.coordinates[0]) || mapCenter[0],
                    parseFloat(item.location.coordinates[1]) || mapCenter[1],
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
    
            // Your cluster layer code remains unchanged
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
    
            // Your marker & popup logic remains unchanged
            fetchedLocations.forEach((data: any) => {
              const markerEl = createMarkerElement(data, isAuthenticated);
              const popupHtml = ReactDOMServer.renderToStaticMarkup(
                <div className="popup-wrapper">
                  <InfoCard
                    imgUrl={data?.userphoto || "/png/default.png"}
                    LAST_NAME={data["firstName"]}
                    FIRST_NAME={data["lastName"]}
                    BIO={data?.bio}
                    EMAIL_ADDRESS={data["email"]}
                    ORGANIZATION_NAME={data["orgName"]}
                    Nearest_City={`${data["Location (Nearest City)"] ?? ""}`}
                    WEBSITE={data.website}
                    MEMBER_LEVEL={data["MEMBER LEVEL"]}
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
                  lng: parseFloat(data.location.coordinates[0]) || mapCenter[0],
                  lat: parseFloat(data.location.coordinates[1]) || mapCenter[1],
                })
                .setPopup(popup)
                .addTo(mapRef.current!);
    
              markersRef.current.push({ marker, recordId: data.id });
            });
    
            const hideClusteredMarkers = () => {
              if (!mapRef.current) return;
              const unclusteredFeatures = mapRef.current.querySourceFeatures("users-cluster", {
                filter: ["!", ["has", "point_count"]],
              });
              const unclusteredIds = new Set(unclusteredFeatures.map((f) => f.properties?.id));
              markersRef.current.forEach(({ marker, recordId }) => {
                const el = marker.getElement();
                el.style.display = unclusteredIds.has(recordId) ? "block" : "none";
              });
            };
            mapRef.current.on("render", hideClusteredMarkers);
    
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
    
            mapRef.current.on("moveend", () => {
              const bounds = mapRef.current!.getBounds();
              if (onMarkerHover) {
                const fakeLeafletBounds = {
                  getNorthEast: () => ({ lat: bounds.getNorthEast().lat, lng: bounds.getNorthEast().lng }),
                  getSouthWest: () => ({ lat: bounds.getSouthWest().lat, lng: bounds.getSouthWest().lng }),
                } as unknown as LatLngBounds;
                onMarkerHover(fakeLeafletBounds);
              }
            });
    
            // Once map is fully loaded — fetch real data and replace
            try {
              const response = await fetch(
                "https://firebasestorage.googleapis.com/v0/b/plumwood-law-e7dc4.appspot.com/o/uploads%2Fuser_locations.json?alt=media&token=e65029b1-729d-4d41-bf0e-425e29fc92b9"
              );
              if (!response.ok) throw new Error("Failed to fetch locations data.");
              fetchedLocations = await response.json();
              offsetDuplicateCoordinates(fetchedLocations);
    
              const updatedGeoJson = {
                type: "FeatureCollection",
                features: fetchedLocations.map((item: any) => ({
                  type: "Feature",
                  properties: { id: item.id },
                  geometry: {
                    type: "Point",
                    coordinates: [
                      parseFloat(item.location.coordinates[0]) || mapCenter[0],
                      parseFloat(item.location.coordinates[1]) || mapCenter[1],
                    ],
                  },
                })),
              };
    
              const source = mapRef.current?.getSource("users-cluster") as mapboxgl.GeoJSONSource;
              source.setData(updatedGeoJson);
            } catch (error) {
              console.error("Error loading real locations:", error);
            }
          });
        }
      } catch (error) {
        console.error("Error initializing map:", error);
      }
    };
    
    initMap();
    

    return () => {
      markersRef.current.forEach(({ marker }) => marker.remove());
      mapRef.current?.remove();
    };
  }, [isAuthenticated, onMarkerHover]);

  return <div ref={mapContainerRef} style={{ height: "100vh", width: "100%" }} />;
};


export default React.memo(MapboxMapComponent);
