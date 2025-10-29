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
  // Use the original CustomIconContent for markers
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
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileWidth = window.innerWidth < 768;
      const isMobileUserAgent = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isMobile = isMobileWidth || isMobileUserAgent;
      console.log(`📱 Mobile detection: width=${window.innerWidth}, isMobileWidth=${isMobileWidth}, isMobileUserAgent=${isMobileUserAgent}, isMobile=${isMobile}`);
      setIsMobile(isMobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_API_TOKEN || "";

    let fetchedLocations: any[] = [];

    // Function to update markers with new data
    const updateMarkers = (data: any[]) => {
      console.log(`🔄 updateMarkers called with ${data.length} records`);
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
        console.log(`📊 Updating source with ${data.length} records`);
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
        console.log(`✅ Source updated with ${geoJsonData.features.length} features`);
      } else {
        console.log(`❌ No source found to update!`);
      }

      // Track processed record IDs to prevent duplicates
      const processedIds = new Set<string | number>();
      
      // Use real-time mobile detection instead of state
      const realTimeMobile = window.innerWidth < 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const effectiveIsMobile = isMobile || realTimeMobile;
      
      console.log(`🗺️ Map optimization: ${effectiveIsMobile ? 'Mobile' : 'Desktop'} - Clustering enabled, data: ${data.length} records (isMobile: ${isMobile}, realTimeMobile: ${realTimeMobile})`);
      
      // Don't create individual markers - clustering handles visualization
      // The source is already updated above, so clustering will show automatically
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

            // Re-detect mobile for this scope
            const realTimeMobile = window.innerWidth < 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const effectiveIsMobile = isMobile || realTimeMobile;
            const maxIndividualMarkers = effectiveIsMobile ? 20 : fetchedLocations.length;
            const dataToProcess = fetchedLocations.slice(0, maxIndividualMarkers);

            // For clustering, use all data for both mobile and desktop
            const dataForClustering = fetchedLocations;
            const geoJsonData: FeatureCollection<Point> = {
              type: "FeatureCollection",
              features: dataForClustering.map((item: any) => ({
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
              clusterMaxZoom: effectiveIsMobile ? 15 : 20, // Lower zoom for mobile
              clusterRadius: effectiveIsMobile ? 50 : 30, // Larger radius for mobile
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
              e.preventDefault();
              const features = mapRef.current?.queryRenderedFeatures(e.point, { layers: ["clusters"] });
              if (!features?.length) return;
              
              const clusterId = features[0].properties?.cluster_id;
              const pointCount = features[0].properties?.point_count;
              const coordinates = (features[0].geometry as any)?.coordinates;
              
              // Get all members in the cluster
              const source = mapRef.current?.getSource("users-cluster") as mapboxgl.GeoJSONSource;
              source.getClusterLeaves(clusterId, pointCount, 0, (err, leaves: any) => {
                if (err) return;
                
                // Create a popup showing all members in the cluster
                const popup = new mapboxgl.Popup({
                  closeButton: true,
                  className: "custom-popup",
                  anchor: 'left',
                  maxWidth: '500px'
                });
                
                const popupContainer = document.createElement("div");
                popupContainer.innerHTML = `
                  <div style="background-color: white; padding: 16px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); max-width: 500px;">
                    <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; color: #000;">${pointCount} Members at this location</h3>
                    <div style="max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px;">
                      ${leaves.map((leaf: any) => {
                        const record = dataForClustering.find((d: any) => d.id === leaf.properties.id);
                        if (!record) return '';
                        return `
                          <div style="background-color: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px;">
                            <div style="font-weight: bold; margin-bottom: 4px; color: #000; font-size: 16px;">
                              ${record.fields["FIRST NAME"] || ''} ${record.fields["LAST NAME"] || ''}
                            </div>
                            <div style="color: #666; font-size: 14px;">
                              ${record.fields["ORGANIZATION NAME"] || 'No organization'}
                            </div>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>
                `;
                
                popup.setDOMContent(popupContainer);
                popup.setLngLat(coordinates).addTo(mapRef.current!);
              });
            });

            // Function to add teardrop markers for unclustered points
            const addTeardropMarkers = () => {
              if (!mapRef.current) return;
              
              // Query for unclustered points at current zoom
              const unclusteredFeatures = mapRef.current.querySourceFeatures("users-cluster", {
                filter: ['!', ['has', 'point_count']]
              });
              
              console.log(`📍 Found ${unclusteredFeatures.length} unclustered points at current zoom`);
              
              // Clear existing individual markers
              markersRef.current.forEach(({ marker, popupRoot }) => {
                marker.remove();
                if (popupRoot) popupRoot.unmount();
              });
              markersRef.current = [];
              
              // Add teardrop markers for each unclustered point
              unclusteredFeatures.forEach((feature: any) => {
                if (feature.properties?.id) {
                  const record = dataForClustering.find((d: any) => d.id === feature.properties.id);
                  if (!record) return;
                  
                  // Create teardrop marker element
                  const markerEl = createMarkerElement(record, isAuthenticated);
                  
                  // Create marker
                  const marker = new mapboxgl.Marker({ element: markerEl })
                    .setLngLat(feature.geometry.coordinates as [number, number])
                    .addTo(mapRef.current!);
                  
                  // Add click handler
                  markerEl.addEventListener('click', () => {
                    document.querySelectorAll('.mapboxgl-popup').forEach(popup => popup.remove());
                    
                    const popup = new mapboxgl.Popup({
                      closeButton: true,
                      className: "custom-popup",
                      anchor: 'left',
                    });
                    
                    const popupContainer = document.createElement("div");
                    const popupRoot = createRoot(popupContainer);
                    popupRoot.render(
                      <div 
                        className="popup-wrapper" 
                        data-record-id={String(record.id)}
                        style={{ maxWidth: "280px", minWidth: "250px", backgroundColor: "white", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", padding: "12px", position: "relative" }}
                      >
                        <InfoCard
                          imgUrl={record.fields.PHOTO?.[0]?.url || "/png/default.png"}
                          FIRST_NAME={record.fields["FIRST NAME"]}
                          LAST_NAME={record.fields["LAST NAME"]}
                          BIO={record.fields.BIO}
                          EMAIL_ADDRESS={record.fields["EMAIL ADDRESS"]}
                          ORGANIZATION_NAME={record.fields["ORGANIZATION NAME"]}
                          Nearest_City={`${record.fields["Location (Nearest City)"] ?? ""}`}
                          WEBSITE={record.fields.WEBSITE}
                          MEMBER_LEVEL={record.fields["MEMBER LEVEL"]}
                          isAuthenticated={isAuthenticated}
                        />
                      </div>
                    );
                    
                    popup.setDOMContent(popupContainer);
                    marker.setPopup(popup);
                    popup.addTo(mapRef.current!);
                  });
                  
                  markersRef.current.push({ marker, recordId: record.id, popupRoot: null });
                }
              });
            };

            // Call updateMarkers to set up source data
            updateMarkers(fetchedLocations);
            
            // Add teardrop markers on initial load
            setTimeout(addTeardropMarkers, 500); // Small delay to ensure map is fully rendered
            
            // Add teardrop markers when user zooms or moves
            mapRef.current.on('zoomend', addTeardropMarkers);
            mapRef.current.on('moveend', addTeardropMarkers);
          });

        } else if (mapRef.current && !mapRef.current.loaded()) {
          // Map exists but not loaded yet, wait for it
          mapRef.current.once("load", () => {
            // Update source for both mobile and desktop
            updateMarkers(fetchedLocations);
          });
        } else if (mapRef.current && mapRef.current.loaded()) {
          // Map exists and is loaded, update markers immediately
          // Update source for both mobile and desktop
          updateMarkers(fetchedLocations);
        }
      } catch (error) {
        console.error("Error loading locations:", error);
        setLoading(false);
      }
    };

    initMap();

    return () => {
      // Clean up markers
      markersRef.current.forEach(({ marker, popupRoot }) => {
        // Close popup if open
        const popup = marker.getPopup();
        if (popup && popup.isOpen()) {
          popup.remove();
        }
        // Remove marker from map
        marker.remove();
        // Unmount React root if it exists
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
      
      {/* Zoom Controls */}
      <div style={{ position: "absolute", top: 10, right: 10, zIndex: 1000 }}>
        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          gap: "4px",
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          overflow: "hidden"
        }}>
          <button
            onClick={() => {
              if (mapRef.current) {
                mapRef.current.zoomIn();
              }
            }}
            style={{
              width: "40px",
              height: "40px",
              border: "none",
              backgroundColor: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: "bold",
              color: "#333",
              transition: "background-color 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f5f5f5"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
            title="Zoom In"
          >
            +
          </button>
          <div style={{ 
            width: "100%", 
            height: "1px", 
            backgroundColor: "#e0e0e0" 
          }} />
          <button
            onClick={() => {
              if (mapRef.current) {
                mapRef.current.zoomOut();
              }
            }}
            style={{
              width: "40px",
              height: "40px",
              border: "none",
              backgroundColor: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: "bold",
              color: "#333",
              transition: "background-color 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f5f5f5"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
            title="Zoom Out"
          >
            −
          </button>
          <div style={{ 
            width: "100%", 
            height: "1px", 
            backgroundColor: "#e0e0e0" 
          }} />
          <button
            onClick={() => {
              if (mapRef.current) {
                mapRef.current.flyTo({
                  center: mapCenter,
                  zoom: 5,
                  duration: 1000
                });
              }
            }}
            style={{
              width: "40px",
              height: "40px",
              border: "none",
              backgroundColor: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              color: "#333",
              transition: "background-color 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f5f5f5"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
            title="Reset to Default View"
          >
            🏠
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(MapboxMapComponent);
