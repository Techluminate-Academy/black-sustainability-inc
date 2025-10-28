"use client";
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
// import mapboxgl, { Map as MapboxMap } from "mapbox-gl";
import ReactDOMServer from "react-dom/server";
import mapboxgl from "mapbox-gl";  
import CustomIconContent from "./CustomIconContent";
import InfoCard from "../InfoCard";
import "mapbox-gl/dist/mapbox-gl.css";
import { LatLngBounds } from "leaflet";
import { FeatureCollection, Point } from 'geojson';
import { createRoot } from "react-dom/client";

import { BsiUserObjectArray } from "@/typings";

interface IProps {
  isAuthenticated: boolean;
  loadedData: any;
  hideCounter: boolean;
  filteredData: any[];
  onMarkerHover: (bounds: LatLngBounds) => void;
}

interface MarkerWithId {
  marker: mapboxgl.Marker;
  recordId: string | number;
  popupRoot: any; // Store the React root for cleanup
}

const BASE_OFFSET = 0.0002;

function offsetDuplicateCoordinates(dataArray: any[]) {
  const coordMap: Record<string, any[]> = {};
  for (const item of dataArray) {
    const lat = parseFloat(item?.location?.coordinates[1]);
    const lng = parseFloat(item?.location?.coordinates[0]);
    if (isNaN(lat) || isNaN(lng)) continue;
    const key = `${lat},${lng}`;
    if (!coordMap[key]) coordMap[key] = [];
    coordMap[key].push(item);
  }

  for (const key in coordMap) {
    const group = coordMap[key];
    if (group.length <= 1) continue;
    const [originalLat, originalLng] = key.split(",").map(parseFloat);
    const angleStep = (2 * Math.PI) / group.length;
    const dynamicOffset = BASE_OFFSET + (group.length * 0.00001);
    for (let i = 0; i < group.length; i++) {
      const angle = i * angleStep;
      const adjustedOffset = dynamicOffset * (1 + i * 0.1);
      const dLat = Math.sin(angle) * adjustedOffset;
      const dLng = Math.cos(angle) * adjustedOffset;
      const newLat = originalLat + dLat;
      const newLng = originalLng + dLng;
      group[i].location.coordinates = [newLng, newLat];
      group[i].lat = newLat.toString();
      group[i].lng = newLng.toString();
    }
  }
}

const createMarkerElement = (record: any, isAuthenticated: boolean): HTMLElement => {
  const htmlString = ReactDOMServer.renderToStaticMarkup(
    <CustomIconContent record={{ ...record, isAuthenticated }} />
  );
  const el = document.createElement("div");
  el.innerHTML = htmlString;
  return el.firstElementChild as HTMLElement;
};

const MapboxMapComponent: React.FC<IProps> = ({ isAuthenticated, onMarkerHover, filteredData }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<MarkerWithId[]>([]);
  const mapCenter: [number, number] = [-84.3877, 33.7488];
  const [loading, setLoading] = useState(true); // <-- loading state

  useEffect(() => {
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_API_TOKEN || "";

    let fetchedLocations: any[] = [];

    // Function to update markers with new data
    const updateMarkers = (data: any[]) => {
      if (!mapRef.current) return;

      // Clean up existing markers
      markersRef.current.forEach(({ marker, popupRoot }) => {
        const popup = marker.getPopup();
        if (popup && popup.isOpen()) popup.remove();
        marker.remove();
        if (popupRoot) popupRoot.unmount();
      });
      markersRef.current = [];

      // Update GeoJSON source
      const source = mapRef.current.getSource("users-cluster") as mapboxgl.GeoJSONSource;
      if (source) {
        const geoJsonData: FeatureCollection<Point> = {
          type: "FeatureCollection",
          features: data.map((item: any) => ({
            type: "Feature",
            properties: { id: item.id },
            geometry: {
              type: "Point",
              coordinates: [
                parseFloat(item?.location?.coordinates[0]) || mapCenter[0],
                parseFloat(item?.location?.coordinates[1]) || mapCenter[1],
              ],
            },
          })),
        };
        source.setData(geoJsonData);
      }

      // Track processed record IDs to prevent duplicates
      const processedIds = new Set<string | number>();
      
      // Create new markers
      data.forEach((item: any) => {
        // Skip if already processed
        if (processedIds.has(item.id)) {
          return;
        }
        processedIds.add(item.id);
        
        // Defensive check for valid coordinates
        if (
          !item.location ||
          !Array.isArray(item.location.coordinates) ||
          item.location.coordinates.length < 2 ||
          isNaN(parseFloat(item.location.coordinates[0])) ||
          isNaN(parseFloat(item.location.coordinates[1]))
        ) {
          return; // Skip this record
        }

        // Create the custom marker element
        const markerEl = createMarkerElement(item, isAuthenticated);
      
        // Prepare the Mapbox popup
        const popup = new mapboxgl.Popup({
          offset: {
            'top': [0, 0],
            'top-left': [0, 0],
            'top-right': [0, 0],
            'bottom': [0, 0],
            'bottom-left': [0, 0],
            'bottom-right': [0, 0],
            'left': [0, 0],
            'right': [0, 0]
          },
          closeButton: false,
          className: "custom-popup",
          anchor: 'left',
        });
      
        // Create a real DOM container and mount InfoCard into it
        const popupContainer = document.createElement("div");
        const popupRoot = createRoot(popupContainer);
        popupRoot.render(
          <div 
            className="popup-wrapper" 
            data-record-id={String(item.id)}
            style={{ maxWidth: "280px", minWidth: "250px", backgroundColor: "white", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", padding: "12px", position: "relative" }}
          >
            <button className="close-popup-btn" style={{ position: "absolute", right: "10px", top: "10px", border: "none", fontSize: "13px", outline: "none", cursor: "pointer", backgroundColor: "rgba(0,0,0,0.1)", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => popup.remove()}>×</button>
            <InfoCard
              imgUrl={item.fields.PHOTO?.[0]?.url || "/png/default.png"}
              FIRST_NAME={item.fields["FIRST NAME"]}
              LAST_NAME={item.fields["LAST NAME"]}
              BIO={item.fields.BIO}
              EMAIL_ADDRESS={item.fields["EMAIL ADDRESS"]}
              ORGANIZATION_NAME={item.fields["ORGANIZATION NAME"]}
              Nearest_City={`${item.fields["Location (Nearest City)"] ?? ""}`}
              WEBSITE={item.fields.WEBSITE}
              MEMBER_LEVEL={item.fields["MEMBER LEVEL"]}
              isAuthenticated={isAuthenticated}
            />
          </div>
        );
      
        // Tell Mapbox to use that live React tree
        popup.setDOMContent(popupContainer);
      
        // Create the marker and attach the popup
        const marker = new mapboxgl.Marker({ element: markerEl })
          .setLngLat({
            lng: parseFloat(item.location.coordinates[0]) || mapCenter[0],
            lat: parseFloat(item.location.coordinates[1]) || mapCenter[1],
          })
          .setPopup(popup)
          .addTo(mapRef.current!);
      
        // Store marker with popup root for cleanup
        markersRef.current.push({ marker, recordId: item.id, popupRoot });
      });

      setLoading(false);
    };

    const initMap = async () => {
      try {
        setLoading(true);

        fetchedLocations = filteredData;
        offsetDuplicateCoordinates(fetchedLocations);

        if (mapContainerRef.current && !mapRef.current) {
          mapRef.current = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: "mapbox://styles/mapbox/streets-v12",
            center: mapCenter,
            zoom: 5,
          });

          mapRef.current.on("load", () => {
            if (!mapRef.current) return;

            const geoJsonData: FeatureCollection<Point> = {
              type: "FeatureCollection",
              features: fetchedLocations.map((item: any) => ({
                type: "Feature",
                properties: { id: item.id },
                geometry: {
                  type: "Point",
                  coordinates: [
                    parseFloat(item?.location?.coordinates[0]) || mapCenter[0],
                    parseFloat(item?.location?.coordinates[1]) || mapCenter[1],
                  ],
                },
              })),
            };

            mapRef.current.addSource("users-cluster", {
              type: "geojson",
              // @ts-ignore: using plain object for geojson source
              data: geoJsonData,
              cluster: true,
              clusterMaxZoom: 20,
              clusterRadius: 30,
            });

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
              paint: { "text-color": "#000" },
            });

            mapRef.current.on("click", "clusters", (e) => {
              const features = mapRef.current?.queryRenderedFeatures(e.point, { layers: ["clusters"] });
              if (!features?.length) return;
              const clusterId = features[0].properties?.cluster_id;
              const source = mapRef.current?.getSource("users-cluster") as mapboxgl.GeoJSONSource;
              source.getClusterExpansionZoom(clusterId, (err, zoom) => {
                if (err || zoom === null || zoom === undefined) return;
                if (err) return;
                mapRef.current?.easeTo({
                  center: (features[0].geometry as any)?.coordinates,
                  zoom,
                  duration: 1000,
                });
              });
            });

            // Call updateMarkers when map first loads
            updateMarkers(fetchedLocations);
          });

          mapRef.current?.on("moveend", () => {
            const bounds = mapRef.current?.getBounds();
            if (!bounds) return;  // safety check

            if (onMarkerHover) {
              const fakeLeafletBounds = {
                getNorthEast: () => ({ lat: bounds.getNorthEast().lat, lng: bounds.getNorthEast().lng }),
                getSouthWest: () => ({ lat: bounds.getSouthWest().lat, lng: bounds.getSouthWest().lng }),
              } as unknown as LatLngBounds;

              onMarkerHover(fakeLeafletBounds);
            }
          });

        } else if (mapRef.current && !mapRef.current.loaded()) {
          // Map exists but not loaded yet, wait for it
          mapRef.current.once("load", () => {
            updateMarkers(fetchedLocations);
          });
        } else if (mapRef.current && mapRef.current.loaded()) {
          // Map exists and is loaded, update markers immediately
          updateMarkers(fetchedLocations);
        }
      } catch (error) {
        console.error("Error loading locations:", error);
        setLoading(false);
      }
    };

    initMap();

    return () => {
      // Clean up markers and their React roots
      markersRef.current.forEach(({ marker, popupRoot }) => {
        // Close popup if open
        const popup = marker.getPopup();
        if (popup && popup.isOpen()) {
          popup.remove();
        }
        // Remove marker from map
        marker.remove();
        // Unmount React root to prevent memory leaks and duplicate renders
        if (popupRoot) {
          popupRoot.unmount();
        }
      });
      // Clear the markers reference
      markersRef.current = [];
      // Remove the map
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [isAuthenticated, onMarkerHover, filteredData]);

  return (
    <div style={{ position: "relative", height: "100vh", width: "100%" }}>
      {loading && (
        <div
          style={{
            position: "absolute",
            zIndex: 1000,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(255,255,255,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="loader">Loading locations...</div>
        </div>
      )}
      <div 
        ref={mapContainerRef} 
        style={{ height: "100%", width: "100%" }}
        data-tour="map-markers"
      />
    </div>
  );
};

export default React.memo(MapboxMapComponent);
