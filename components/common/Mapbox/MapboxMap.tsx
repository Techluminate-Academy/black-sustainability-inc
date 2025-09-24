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

// Climate layer management functions
const addClimateHeatmapLayer = async (
  map: mapboxgl.Map, 
  layerId: string,
  loadingClimateLayers: Set<string>,
  setLoadingClimateLayers: React.Dispatch<React.SetStateAction<Set<string>>>,
  setActiveClimateLayers: React.Dispatch<React.SetStateAction<Set<string>>>
) => {
  if (!map || loadingClimateLayers.has(layerId)) return;
  
  setLoadingClimateLayers(prev => new Set(prev).add(layerId));
  
  try {
    const bounds = map.getBounds();
    if (!bounds) return;
    
    const boundsStr = JSON.stringify({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest()
    });
    
    console.log(`🌍 Fetching climate data for bounds:`, JSON.parse(boundsStr));
    const response = await fetch(`/api/climate-data?layerType=${layerId}&bounds=${encodeURIComponent(boundsStr)}&zoom=${Math.floor(map.getZoom())}`);
    const data = await response.json();
    console.log(`📊 Received ${data.features.length} climate data points for ${layerId} layer`);

    // Remove existing layer if it exists
    if (map.getLayer(`climate-heatmap-${layerId}`)) {
      map.removeLayer(`climate-heatmap-${layerId}`);
    }
    if (map.getSource(`climate-heatmap-${layerId}`)) {
      map.removeSource(`climate-heatmap-${layerId}`);
    }

    // Add source
    map.addSource(`climate-heatmap-${layerId}`, {
      type: 'geojson',
      data: data
    });

    // Add heatmap layer - positioned UNDER existing markers
    const layerConfig = getClimateLayerConfig(layerId);
    
    try {
      map.addLayer({
        id: `climate-heatmap-${layerId}`,
        type: 'heatmap',
        source: `climate-heatmap-${layerId}`,
        maxzoom: 22, // Allow at all zoom levels
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'intensity'], 0, 0, 1, 1] as any,
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 2, 15, 8] as any, // Higher intensity
          'heatmap-color': layerConfig.color as any,
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 5, 15, 50] as any, // Larger radius
          'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 0.8] as any // Higher opacity
        }
      });

      // Ensure heatmap layers are below marker layers
      if (map.getLayer('clusters')) {
        map.moveLayer(`climate-heatmap-${layerId}`, 'clusters');
      }
      
      // Also add a simple circle layer as backup visualization
      map.addLayer({
        id: `climate-circles-${layerId}`,
        type: 'circle',
        source: `climate-heatmap-${layerId}`,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'intensity'], 0, 2, 1, 10] as any,
          'circle-color': getCircleColor(layerId),
          'circle-opacity': 0.3 as any
        }
      });
      
      // Move circle layer below markers too
      if (map.getLayer('clusters')) {
        map.moveLayer(`climate-circles-${layerId}`, 'clusters');
      }
      
      // Add click handler for climate data
      map.on('click', `climate-circles-${layerId}`, (e) => {
        const features = e.features;
        if (features && features.length > 0) {
          const feature = features[0];
          const properties = feature.properties;
          
          // Create popup content
          const popupContent = createClimatePopupContent(layerId, properties);
          
          new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(popupContent)
            .addTo(map);
        }
      });
      
      // Change cursor on hover
      map.on('mouseenter', `climate-circles-${layerId}`, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      
      map.on('mouseleave', `climate-circles-${layerId}`, () => {
        map.getCanvas().style.cursor = '';
      });
      
      console.log(`✅ Successfully added ${layerId} heatmap and circle layers to map with click interaction`);
    } catch (layerError) {
      console.error(`❌ Error adding heatmap layer:`, layerError);
      throw layerError;
    }

    setActiveClimateLayers(prev => new Set(prev).add(layerId));
  } catch (error) {
    console.error(`Error loading climate layer ${layerId}:`, error);
  } finally {
    setLoadingClimateLayers(prev => {
      const newSet = new Set(prev);
      newSet.delete(layerId);
      return newSet;
    });
  }
};

const removeClimateHeatmapLayer = (
  map: mapboxgl.Map, 
  layerId: string,
  setActiveClimateLayers: React.Dispatch<React.SetStateAction<Set<string>>>
) => {
  if (!map) return;
  
  const heatmapLayerName = `climate-heatmap-${layerId}`;
  const circleLayerName = `climate-circles-${layerId}`;
  const sourceName = `climate-heatmap-${layerId}`;
  
  // Remove event listeners first (Mapbox will clean up automatically when layer is removed)
  
  // Remove both heatmap and circle layers
  if (map.getLayer(heatmapLayerName)) {
    map.removeLayer(heatmapLayerName);
  }
  if (map.getLayer(circleLayerName)) {
    map.removeLayer(circleLayerName);
  }
  if (map.getSource(sourceName)) {
    map.removeSource(sourceName);
  }
  
  setActiveClimateLayers(prev => {
    const newSet = new Set(prev);
    newSet.delete(layerId);
    return newSet;
  });
};

const getClimateLayerConfig = (layerId: string) => {
  const configs = {
    temperature: {
      color: [
        'interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(0,0,255,0)',     // Cold (blue)
        0.2, 'rgb(0,255,255)',    // Cool (cyan)
        0.4, 'rgb(0,255,0)',      // Mild (green)
        0.6, 'rgb(255,255,0)',    // Warm (yellow)
        0.8, 'rgb(255,165,0)',    // Hot (orange)
        1, 'rgb(255,0,0)'         // Extreme (red)
      ],
      radius: ['interpolate', ['linear'], ['zoom'], 0, 3, 15, 25],
      intensity: ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3]
    },
    precipitation: {
      color: [
        'interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(255,255,255,0)', // Dry (transparent)
        0.2, 'rgb(173,216,230)',  // Light (light blue)
        0.4, 'rgb(135,206,235)',  // Moderate (sky blue)
        0.6, 'rgb(70,130,180)',   // Heavy (steel blue)
        0.8, 'rgb(25,25,112)',    // Very heavy (midnight blue)
        1, 'rgb(0,0,139)'         // Extreme (dark blue)
      ],
      radius: ['interpolate', ['linear'], ['zoom'], 0, 2, 15, 30],
      intensity: ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 4]
    },
    wind: {
      color: [
        'interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(255,255,255,0)', // Calm (transparent)
        0.3, 'rgb(144,238,144)',  // Light (light green)
        0.5, 'rgb(255,255,0)',    // Moderate (yellow)
        0.7, 'rgb(255,165,0)',    // Strong (orange)
        0.9, 'rgb(255,69,0)',     // Very strong (red-orange)
        1, 'rgb(255,0,0)'         // Extreme (red)
      ],
      radius: ['interpolate', ['linear'], ['zoom'], 0, 4, 15, 35],
      intensity: ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3]
    }
  };
  
  return configs[layerId as keyof typeof configs] || configs.temperature;
};

const getCircleColor = (layerId: string): string => {
  switch (layerId) {
    case 'temperature':
      return '#ff6b6b'; // Red for temperature
    case 'precipitation':
      return '#4ecdc4'; // Teal for precipitation  
    case 'wind':
      return '#ff9f43'; // Orange for wind
    default:
      return '#666666'; // Gray default
  }
};

const createClimatePopupContent = (layerId: string, properties: any): string => {
  const { temperature, precipitation, wind_speed, intensity, station_id, date } = properties;
  
  let content = `
    <div style="padding: 12px; min-width: 200px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <h3 style="margin: 0 0 8px 0; color: #333; font-size: 16px; font-weight: 600;">
        ${getLayerTitle(layerId)} Data
      </h3>
      <div style="margin-bottom: 8px;">
        <strong>Station ID:</strong> ${station_id}
      </div>
      <div style="margin-bottom: 8px;">
        <strong>Date:</strong> ${new Date(date).toLocaleDateString()}
      </div>
  `;
  
  // Add specific data based on layer type
  if (layerId === 'temperature') {
    content += `
      <div style="margin-bottom: 8px;">
        <strong>Temperature:</strong> ${temperature.toFixed(1)}°C (${(temperature * 9/5 + 32).toFixed(1)}°F)
      </div>
      <div style="margin-bottom: 8px;">
        <strong>Intensity:</strong> ${(intensity * 100).toFixed(1)}%
      </div>
    `;
  } else if (layerId === 'precipitation') {
    content += `
      <div style="margin-bottom: 8px;">
        <strong>Precipitation:</strong> ${precipitation.toFixed(2)} inches
      </div>
      <div style="margin-bottom: 8px;">
        <strong>Intensity:</strong> ${(intensity * 100).toFixed(1)}%
      </div>
    `;
  } else if (layerId === 'wind') {
    content += `
      <div style="margin-bottom: 8px;">
        <strong>Wind Speed:</strong> ${wind_speed.toFixed(1)} mph
      </div>
      <div style="margin-bottom: 8px;">
        <strong>Intensity:</strong> ${(intensity * 100).toFixed(1)}%
      </div>
    `;
  }
  
  // Add all available data
  content += `
      <div style="border-top: 1px solid #eee; margin-top: 12px; padding-top: 8px; font-size: 12px; color: #666;">
        <div><strong>All Data:</strong></div>
        <div>Temperature: ${temperature.toFixed(1)}°C</div>
        <div>Precipitation: ${precipitation.toFixed(2)} inches</div>
        <div>Wind Speed: ${wind_speed.toFixed(1)} mph</div>
      </div>
    </div>
  `;
  
  return content;
};

const getLayerTitle = (layerId: string): string => {
  switch (layerId) {
    case 'temperature':
      return '🌡️ Temperature';
    case 'precipitation':
      return '🌧️ Precipitation';
    case 'wind':
      return '💨 Wind Speed';
    default:
      return '📊 Climate';
  }
};

const MapboxMapComponent: React.FC<IProps> = ({ isAuthenticated, onMarkerHover, filteredData }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<MarkerWithId[]>([]);
  const mapCenter: [number, number] = [-84.3877, 33.7488];
  const [loading, setLoading] = useState(true); // <-- loading state
  
  // Climate overlay state
  const [activeClimateLayers, setActiveClimateLayers] = useState<Set<string>>(new Set());
  const [loadingClimateLayers, setLoadingClimateLayers] = useState<Set<string>>(new Set());

  // Climate layer toggle functions
  const toggleClimateLayer = async (layerId: string) => {
    if (!mapRef.current) return;
    
    console.log(`🌡️ Toggling climate layer: ${layerId}`);
    
    if (activeClimateLayers.has(layerId)) {
      console.log(`🗑️ Removing climate layer: ${layerId}`);
      removeClimateHeatmapLayer(mapRef.current, layerId, setActiveClimateLayers);
    } else {
      console.log(`➕ Adding climate layer: ${layerId}`);
      await addClimateHeatmapLayer(
        mapRef.current, 
        layerId, 
        loadingClimateLayers,
        setLoadingClimateLayers, 
        setActiveClimateLayers
      );
    }
  };

  useEffect(() => {
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_API_TOKEN || "";

    let fetchedLocations: any[] = [];

    const initMap = async () => {
      try {
        setLoading(true); // Start loading

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


            // fetchedLocations.forEach((data: any) => {
            //   const markerEl = createMarkerElement(data, isAuthenticated);
            //   const popupHtml = ReactDOMServer.renderToStaticMarkup(
            //     <div className="popup-wrapper">
            //       <button
            //         className="close-popup-btn"
            //         style={{
            //           position: 'absolute',
            //           right:'-160px',
            //           top:'10px',
            //           border: 'none',
            //           fontSize: '13px',
            //           outline: 'none',
            //           cursor: 'pointer',
            //         }}
            //       >
            //         X
            //       </button>
            //       <InfoCard
            //         imgUrl={ data?.fields?.PHOTO && data?.fields?.PHOTO.length > 0
            //           ? data?.fields?.PHOTO[0].url || data?.fields?.PHOTO
            //           : "/png/default.png"}
            //         LAST_NAME={data.fields["LAST NAME"]}
            //         FIRST_NAME={data.fields["FIRST NAME"]}
            //         BIO={data.fields?.BIO}
            //         EMAIL_ADDRESS={data.fields["EMAIL ADDRESS"]}
            //         ORGANIZATION_NAME={data.fields["ORGANIZATION NAME"]}
            //         Nearest_City={`${data.fields["Location (Nearest City)"] ?? ""}`}
            //         WEBSITE={data.fields.WEBSITE}
            //         MEMBER_LEVEL={data.fields["MEMBER LEVEL"]}
            //         isAuthenticated={isAuthenticated}
         
            //       />
            //     </div>
            //   );

            //   const popup = new mapboxgl.Popup({
            //     offset: 25,
            //     closeButton: false,
            //     className: "custom-popup",
            //   }).setHTML(popupHtml);

            //   const marker = new mapboxgl.Marker({ element: markerEl })
            //     .setLngLat({
            //       lng: parseFloat(data?.location?.coordinates[0]) || mapCenter[0],
            //       lat: parseFloat(data?.location?.coordinates[1]) || mapCenter[1],
            //     })
            //     .setPopup(popup)
            //     .addTo(mapRef.current!);

            //   markersRef.current.push({ marker, recordId: data.id });
            //   // ⬇️ Attach close button listener after popup is added
            //   popup.on('open', () => {
            //     const closeBtn = document.querySelector('.close-popup-btn');
            //     if (closeBtn) {
            //       closeBtn.addEventListener('click', () => {
            //         popup.remove();
            //       });
            //     }
            //   });
            // });


            fetchedLocations.forEach((data: any) => {
              // Defensive check for valid coordinates
              if (
                !data.location ||
                !Array.isArray(data.location.coordinates) ||
                data.location.coordinates.length < 2 ||
                isNaN(parseFloat(data.location.coordinates[0])) ||
                isNaN(parseFloat(data.location.coordinates[1]))
              ) {
                // Optionally log or handle skipped record
                return; // Skip this record
              }

              // 1️⃣ Create the custom marker element
              const markerEl = createMarkerElement(data, isAuthenticated);
            
              // 2️⃣ Prepare the Mapbox popup
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
            
              // 3️⃣ Create a real DOM container and mount InfoCard into it
              const popupContainer = document.createElement("div");
              createRoot(popupContainer).render(
                <div className="popup-wrapper" style={{
                  maxWidth: "280px",
                  minWidth: "250px",
                  backgroundColor: "white",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  padding: "12px",
                  position: "relative",
                }}>
                  <button
                    className="close-popup-btn"
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "10px",
                      border: "none",
                      fontSize: "13px",
                      outline: "none",
                      cursor: "pointer",
                      backgroundColor: "rgba(0,0,0,0.1)",
                      borderRadius: "50%",
                      width: "20px",
                      height: "20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 1000,
                    }}
                    onClick={() => popup.remove()}
                  >
                    ×
                  </button>
                  <InfoCard
                    imgUrl={
                      data.fields.PHOTO?.[0]?.url ||
                      "/png/default.png"
                    }
                    FIRST_NAME={data.fields["FIRST NAME"]}
                    LAST_NAME={data.fields["LAST NAME"]}
                    BIO={data.fields.BIO}
                    EMAIL_ADDRESS={data.fields["EMAIL ADDRESS"]}
                    ORGANIZATION_NAME={data.fields["ORGANIZATION NAME"]}
                    Nearest_City={`${data.fields["Location (Nearest City)"] ?? ""}`}
                    WEBSITE={data.fields.WEBSITE}
                    MEMBER_LEVEL={data.fields["MEMBER LEVEL"]}
                    isAuthenticated={isAuthenticated}
                  />
                </div>
              );
            
              // 4️⃣ Tell Mapbox to use that live React tree
              popup.setDOMContent(popupContainer);
            
              // 5️⃣ Create the marker and attach the popup
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
                marker.getElement().style.display = unclusteredIds.has(recordId) ? "block" : "none";
              });
            };

            mapRef.current.on("render", hideClusteredMarkers);

            setLoading(false); // Stop loading after markers are added
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

        }
      } catch (error) {
        console.error("Error loading locations:", error);
        setLoading(false);
      }
    };

    initMap();

    return () => {
      markersRef.current.forEach(({ marker }) => marker.remove());
      mapRef.current?.remove();
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
      
      {/* Climate Layer Controls Overlay */}
      <div style={{
        position: "absolute",
        top: "10px",
        right: "10px",
        zIndex: 1000,
        background: "white",
        padding: "15px",
        borderRadius: "8px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        minWidth: "200px",
        maxWidth: "250px"
      }}>
        <h3 style={{ 
          margin: "0 0 10px 0", 
          fontSize: "16px", 
          fontWeight: "bold",
          color: "#333"
        }}>
          🌡️ Climate Data Layers
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[
            { id: 'temperature', name: 'Temperature', color: '#ff6b6b', icon: '🌡️' },
            { id: 'precipitation', name: 'Precipitation', color: '#4ecdc4', icon: '🌧️' },
            { id: 'wind', name: 'Wind Speed', color: '#ff9f43', icon: '💨' }
          ].map(layer => (
            <button
              key={layer.id}
              onClick={() => toggleClimateLayer(layer.id)}
              disabled={loadingClimateLayers.has(layer.id)}
              style={{
                width: "100%",
                padding: "8px 12px",
                backgroundColor: activeClimateLayers.has(layer.id) ? layer.color : "#f8f9fa",
                color: activeClimateLayers.has(layer.id) ? "white" : "#333",
                border: "1px solid #ddd",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transition: "all 0.2s ease"
              }}
            >
              <span>{layer.icon} {layer.name}</span>
              {loadingClimateLayers.has(layer.id) && (
                <span style={{ fontSize: "12px" }}>Loading...</span>
              )}
              {activeClimateLayers.has(layer.id) && !loadingClimateLayers.has(layer.id) && (
                <span style={{ fontSize: "12px" }}>✓</span>
              )}
            </button>
          ))}
        </div>
        <div style={{ 
          fontSize: "11px", 
          color: "#666", 
          marginTop: "10px",
          lineHeight: "1.3"
        }}>
          Toggle climate data overlays underneath member markers<br/>
          <span style={{ color: "#888", fontSize: "10px" }}>💡 Click on colored areas for detailed data</span>
        </div>
      </div>

      <div 
        ref={mapContainerRef} 
        style={{ height: "100%", width: "100%" }}
        data-tour="map-markers"
      />
    </div>
  );
};

export default React.memo(MapboxMapComponent);
