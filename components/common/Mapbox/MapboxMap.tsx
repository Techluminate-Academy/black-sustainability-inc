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
import { toMapFeatureOrNull, buildMapFeatures } from "@/lib/mapFeatures";

interface IProps {
  isAuthenticated: boolean;
  loadedData: any;
  hideCounter: boolean;
  filteredData: any[];
  onMarkerHover: (bounds: LatLngBounds) => void;
  /** When set, map flies to this point (e.g. after search or clicking a sidebar card). ts forces re-fly when same coords. */
  flyToCoordinates?: { lng: number; lat: number; ts?: number } | null;
}

interface MarkerWithId {
  marker: mapboxgl.Marker;
  recordId: string | number;
  popupRoot: any; // Store the React root for cleanup
}

const BASE_OFFSET = 0.0002;
const CHUNK_SIZE = 50; // Process 50 items at a time

// Synchronous version for small arrays (fallback)
function offsetDuplicateCoordinatesSync(dataArray: any[]) {
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

// Async version that processes in chunks using requestIdleCallback
function offsetDuplicateCoordinates(
  dataArray: any[],
  callback?: () => void
): void {
  // For small arrays, process synchronously
  if (dataArray.length <= CHUNK_SIZE) {
    offsetDuplicateCoordinatesSync(dataArray);
    if (callback) callback();
    return;
  }

  // Build coordMap in chunks
  const coordMap: Record<string, any[]> = {};
  let index = 0;

  const processChunk = (deadline?: IdleDeadline) => {
    const hasTime = deadline ? deadline.timeRemaining() > 0 : true;
    const endIndex = Math.min(index + CHUNK_SIZE, dataArray.length);

    // Process items in current chunk
    while (index < endIndex && hasTime) {
      const item = dataArray[index];
      const lat = parseFloat(item?.location?.coordinates?.[1]);
      const lng = parseFloat(item?.location?.coordinates?.[0]);
      if (!isNaN(lat) && !isNaN(lng)) {
        const key = `${lat},${lng}`;
        if (!coordMap[key]) coordMap[key] = [];
        coordMap[key].push(item);
      }
      index++;
    }

    // If more items to process, continue in next idle period
    if (index < dataArray.length) {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        requestIdleCallback(processChunk, { timeout: 100 });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => processChunk(), 0);
      }
      return;
    }

    // All items processed, now offset duplicates in chunks
    const keys = Object.keys(coordMap);
    let keyIndex = 0;

    const processOffsetChunk = (deadline?: IdleDeadline) => {
      const hasTime = deadline ? deadline.timeRemaining() > 0 : true;
      const endKeyIndex = Math.min(keyIndex + CHUNK_SIZE, keys.length);

      while (keyIndex < endKeyIndex && hasTime) {
        const key = keys[keyIndex];
        const group = coordMap[key];
        if (group.length > 1) {
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
        keyIndex++;
      }

      // If more keys to process, continue in next idle period
      if (keyIndex < keys.length) {
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          requestIdleCallback(processOffsetChunk, { timeout: 100 });
        } else {
          setTimeout(() => processOffsetChunk(), 0);
        }
        return;
      }

      // All processing complete
      if (callback) callback();
    };

    // Start processing offsets
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      requestIdleCallback(processOffsetChunk, { timeout: 100 });
    } else {
      setTimeout(() => processOffsetChunk(), 0);
    }
  };

  // Start processing
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    requestIdleCallback(processChunk, { timeout: 100 });
  } else {
    // Fallback: process synchronously for browsers without requestIdleCallback
    offsetDuplicateCoordinatesSync(dataArray);
    if (callback) callback();
  }
}

const DEFAULT_MARKER_PHOTO = "/png/default.png";

const createMarkerElement = (record: any, isAuthenticated: boolean): HTMLElement => {
  // Use the original CustomIconContent for markers
  const htmlString = ReactDOMServer.renderToStaticMarkup(
    <CustomIconContent record={{ ...record, isAuthenticated }} />
  );
  const el = document.createElement("div");
  el.innerHTML = htmlString;
  const root = el.firstElementChild as HTMLElement;
  // renderToStaticMarkup strips event handlers — attach fallback for Mighty/external CDNs
  const img = root?.querySelector("img");
  if (img) {
    img.addEventListener("error", () => {
      if (!img.src.endsWith(DEFAULT_MARKER_PHOTO)) {
        img.src = DEFAULT_MARKER_PHOTO;
      }
    });
  }
  return root;
};

const MapboxMapComponent: React.FC<IProps> = ({ isAuthenticated, onMarkerHover, filteredData, flyToCoordinates }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<MarkerWithId[]>([]);
  const mapCenter: [number, number] = [-84.3877, 33.7488];
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Fly to a point when requested (e.g. after search or clicking a sidebar card)
  useEffect(() => {
    if (!flyToCoordinates || !mapRef.current) return;
    const { lng, lat } = flyToCoordinates;
    if (typeof lng !== "number" || typeof lat !== "number" || isNaN(lng) || isNaN(lat)) return;
    mapRef.current.flyTo({
      center: [lng, lat],
      zoom: 14,
      duration: 1000,
    });
  }, [flyToCoordinates?.lng, flyToCoordinates?.lat, flyToCoordinates?.ts]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileWidth = window.innerWidth < 768;
      const isMobileUserAgent = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isMobile = isMobileWidth || isMobileUserAgent;
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
      if (!mapRef.current) return;

      // Clean up existing markers in chunks to avoid blocking
      const cleanupMarkers = () => {
        if (markersRef.current.length === 0) return;
        
        const markersToClean = [...markersRef.current];
        markersRef.current = [];
        
        const processCleanup = (deadline?: IdleDeadline) => {
          const hasTime = deadline ? deadline.timeRemaining() > 0 : true;
          const chunkSize = 10;
          let processed = 0;
          
          while (processed < markersToClean.length && hasTime && processed < chunkSize) {
            const { marker, popupRoot } = markersToClean[processed];
            const popup = marker.getPopup();
            if (popup && popup.isOpen()) popup.remove();
            marker.remove();
            if (popupRoot) popupRoot.unmount();
            processed++;
          }
          
          if (processed < markersToClean.length) {
            if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
              requestIdleCallback(processCleanup, { timeout: 50 });
            } else {
              setTimeout(() => processCleanup(), 0);
            }
          }
        };
        
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          requestIdleCallback(processCleanup, { timeout: 50 });
        } else {
          // Fallback: process synchronously for small arrays
          markersToClean.forEach(({ marker, popupRoot }) => {
            const popup = marker.getPopup();
            if (popup && popup.isOpen()) popup.remove();
            marker.remove();
            if (popupRoot) popupRoot.unmount();
          });
        }
      };
      
      cleanupMarkers();

      // Update GeoJSON source - create data in chunks
      const source = mapRef.current.getSource("users-cluster") as mapboxgl.GeoJSONSource;
      if (source) {
        const createGeoJsonFeatures = (dataArray: any[]): Promise<any[]> => {
          return new Promise((resolve) => {
            const features: any[] = [];
            let index = 0;
            const chunkSize = 50;

            const processChunk = (deadline?: IdleDeadline) => {
              const hasTime = deadline ? deadline.timeRemaining() > 0 : true;
              const endIndex = Math.min(index + chunkSize, dataArray.length);

              while (index < endIndex && hasTime) {
                const feature = toMapFeatureOrNull(dataArray[index]);
                if (feature) features.push(feature);
                index++;
              }

              if (index < dataArray.length) {
                if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
                  requestIdleCallback(processChunk, { timeout: 50 });
                } else {
                  setTimeout(() => processChunk(), 0);
                }
              } else {
                resolve(features);
              }
            };

            if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
              requestIdleCallback(processChunk, { timeout: 50 });
            } else {
              if (dataArray.length <= chunkSize) {
                resolve(buildMapFeatures(dataArray));
              } else {
                setTimeout(() => processChunk(), 0);
              }
            }
          });
        };

        createGeoJsonFeatures(data).then((features) => {
          requestAnimationFrame(() => {
            if (mapRef.current && source) {
              const geoJsonData: FeatureCollection<Point> = {
                type: "FeatureCollection",
                features,
              };
              source.setData(geoJsonData);
            }
          });
        });
      }

      // Don't create individual markers - clustering handles visualization
      // The source is already updated above, so clustering will show automatically
      setLoading(false);
    };

    const initMap = async () => {
      try {
        setLoading(true);

        fetchedLocations = filteredData;
        
        // Process coordinates in background (non-blocking)
        // For small datasets, process immediately; for large ones, process in chunks
        if (fetchedLocations.length <= CHUNK_SIZE) {
          // Small dataset - process synchronously
          offsetDuplicateCoordinates(fetchedLocations);
        } else {
          // Large dataset - start async processing, but don't block map initialization
          offsetDuplicateCoordinates(fetchedLocations);
        }

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
            
            // Create GeoJSON data - process in chunks to avoid blocking
            const createGeoJsonData = () => {
              const createGeoJsonFeatures = (dataArray: any[]): Promise<any[]> => {
                return new Promise((resolve) => {
                  const features: any[] = [];
                  let index = 0;
                  const chunkSize = 50;

                  const processChunk = (deadline?: IdleDeadline) => {
                    const hasTime = deadline ? deadline.timeRemaining() > 0 : true;
                    const endIndex = Math.min(index + chunkSize, dataArray.length);

                    while (index < endIndex && hasTime) {
                      // Skip records without valid coords; never plot them at mapCenter,
                      // which would silently pile records onto Atlanta.
                      const feature = toMapFeatureOrNull(dataArray[index]);
                      if (feature) features.push(feature);
                      index++;
                    }

                    if (index < dataArray.length) {
                      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
                        requestIdleCallback(processChunk, { timeout: 50 });
                      } else {
                        setTimeout(() => processChunk(), 0);
                      }
                    } else {
                      resolve(features);
                    }
                  };

                  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
                    requestIdleCallback(processChunk, { timeout: 50 });
                  } else {
                    if (dataArray.length <= chunkSize) {
                      resolve(buildMapFeatures(dataArray));
                    } else {
                      setTimeout(() => processChunk(), 0);
                    }
                  }
                });
              };

              createGeoJsonFeatures(dataForClustering).then((features) => {
                requestAnimationFrame(() => {
                  if (mapRef.current) {
                    const geoJsonData: FeatureCollection<Point> = {
                      type: "FeatureCollection",
                      features,
                    };
                    
                    mapRef.current.addSource("users-cluster", {
                      type: "geojson",
                      // @ts-ignore: using plain object for geojson source
                      data: geoJsonData,
                      cluster: true,
                      clusterMaxZoom: effectiveIsMobile ? 15 : 20, // Lower zoom for mobile
                      clusterRadius: effectiveIsMobile ? 50 : 30, // Larger radius for mobile
                    });
                    
                    // Continue with layer setup
                    setupMapLayers();
                  }
                });
              });
            };
            
            // Defer GeoJSON creation to avoid blocking
            if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
              requestAnimationFrame(createGeoJsonData);
            } else {
              createGeoJsonData();
            }
            
            function setupMapLayers() {
              if (!mapRef.current) return;

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

              /**
               * Invisible layer: only *rendered* unclustered points (same filter as Mapbox cluster examples).
               * querySourceFeatures + !point_count wrongly matched ALL source leaves — teardrops stacked on
               * cluster circles and opened InfoCard when the cluster was clicked.
               */
              mapRef.current.addLayer({
                id: "unclustered-points-hit",
                type: "circle",
                source: "users-cluster",
                filter: ["!", ["has", "point_count"]],
                paint: {
                  "circle-radius": 4,
                  /** > 0 so GL still draws hit-testing quads (opacity 0 can skip pick). */
                  "circle-opacity": 0.001,
                  "circle-color": "#000000",
                },
              });

              mapRef.current.on("click", "clusters", (e) => {
                e.preventDefault();
                e.originalEvent?.stopPropagation?.();
                const features = mapRef.current?.queryRenderedFeatures(e.point, { layers: ["clusters"] });
                if (!features?.length) return;
                
                const clusterId = features[0].properties?.cluster_id;
                const pointCount = features[0].properties?.point_count;
                const coordinates = (features[0].geometry as any)?.coordinates;
                
                // Get all members in the cluster
                const source = mapRef.current?.getSource("users-cluster") as mapboxgl.GeoJSONSource;
                source.getClusterLeaves(clusterId, pointCount, 0, (err, leaves: any) => {
                  if (err) return;
                  
                  // Create lookup map to avoid O(n²) complexity from .find() in .map()
                  const recordMap = new Map<string | number, any>();
                  dataForClustering.forEach((record: any) => {
                    if (record?.id) {
                      recordMap.set(record.id, record);
                    }
                  });
                  
                  // Create a popup showing all members in the cluster
                  const popup = new mapboxgl.Popup({
                    closeButton: true,
                    className: "custom-popup",
                    anchor: 'left',
                    maxWidth: '500px'
                  });
                  
                  const popupContainer = document.createElement("div");
                  const authStatus = isAuthenticated;
                  popupContainer.innerHTML = `
                    <div style="background-color: white; padding: 16px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); max-width: 500px;">
                      <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; color: #000;">${pointCount} Members at this location</h3>
                      <div style="max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px;">
                        ${leaves.map((leaf: any) => {
                          const record = recordMap.get(leaf.properties.id);
                          if (!record) return '';
                          
                          // Blur names for unauthenticated users
                          const fullName = record.fields["FIRST NAME"] && record.fields["LAST NAME"] 
                            ? record.fields["FIRST NAME"] + ' ' + record.fields["LAST NAME"] 
                            : 'Member';
                          const displayName = authStatus ? fullName : 'Member';
                          const nameStyle = !authStatus ? 'filter: blur(4px); user-select: none;' : '';
                          
                          return `
                            <div style="background-color: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px;">
                              <div style="font-weight: bold; margin-bottom: 4px; color: #000; font-size: 16px; ${nameStyle}">
                                ${displayName}
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
              const getRenderedUnclusteredFeatures = () => {
                if (!mapRef.current) return [];
                if (!mapRef.current.getLayer("unclustered-points-hit")) return [];
                const b = mapRef.current.getBounds();
                if (!b) return [];
                const sw = b.getSouthWest();
                const ne = b.getNorthEast();
                // queryRenderedFeatures expects screen pixel bbox, not lng/lat.
                const swPx = mapRef.current.project([sw.lng, sw.lat]);
                const nePx = mapRef.current.project([ne.lng, ne.lat]);
                const rendered = mapRef.current.queryRenderedFeatures(
                  [
                    // top-left, bottom-right
                    [swPx.x, nePx.y],
                    [nePx.x, swPx.y],
                  ],
                  { layers: ["unclustered-points-hit"] }
                );
                const out: any[] = [];
                const seen = new Set<string | number>();
                for (const f of rendered) {
                  const id = f.properties?.id;
                  if (id == null || seen.has(id)) continue;
                  seen.add(id);
                  if (f.geometry?.type === "Point") {
                    out.push(f);
                  }
                }
                return out;
              };

              const addTeardropMarkers = () => {
                if (!mapRef.current) return;
                
                const unclusteredFeatures = getRenderedUnclusteredFeatures();
                
                // Clear existing individual markers in chunks
                const markersToClean = [...markersRef.current];
                markersRef.current = [];
                
                const cleanupChunk = (deadline?: IdleDeadline) => {
                  const hasTime = deadline ? deadline.timeRemaining() > 0 : true;
                  const chunkSize = 10;
                  let processed = 0;
                  
                  while (processed < markersToClean.length && hasTime && processed < chunkSize) {
                    const { marker, popupRoot } = markersToClean[processed];
                    marker.remove();
                    if (popupRoot) popupRoot.unmount();
                    processed++;
                  }
                  
                  if (processed < markersToClean.length) {
                    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
                      requestIdleCallback(cleanupChunk, { timeout: 50 });
                    } else {
                      setTimeout(() => cleanupChunk(), 0);
                    }
                  } else {
                    // After cleanup, add new markers
                    addNewMarkers();
                  }
                };
                
                const addNewMarkers = () => {
                  if (!mapRef.current || unclusteredFeatures.length === 0) return;
                  
                  // Create lookup map to avoid O(n²) complexity from .find() in loop
                  const recordMap = new Map<string | number, any>();
                  dataForClustering.forEach((record: any) => {
                    if (record?.id) {
                      recordMap.set(record.id, record);
                    }
                  });
                  
                  // Process markers in chunks
                  let index = 0;
                  const chunkSize = 10;
                  
                  const processMarkerChunk = (deadline?: IdleDeadline) => {
                    const hasTime = deadline ? deadline.timeRemaining() > 0 : true;
                    const endIndex = Math.min(index + chunkSize, unclusteredFeatures.length);
                    
                    while (index < endIndex && hasTime) {
                      const feature = unclusteredFeatures[index];
                      if (feature.properties?.id) {
                        const record = recordMap.get(feature.properties.id);
                        if (record) {
                          // Create teardrop marker element
                          const markerEl = createMarkerElement(record, isAuthenticated);
                          
                          // Create marker
                          const marker = new mapboxgl.Marker({ element: markerEl })
                            .setLngLat((feature.geometry as Point).coordinates as [number, number])
                            .addTo(mapRef.current!);
                          
                          // Add click handler
                          markerEl.addEventListener('click', (ev) => {
                            ev.stopPropagation();
                            ev.preventDefault();
                            document.querySelectorAll('.mapboxgl-popup').forEach(popup => popup.remove());
                            
                            const popup = new mapboxgl.Popup({
                              closeButton: true,
                              className: "custom-popup",
                              anchor: 'right',
                            });
                            
                            // Customize close button after popup opens
                            setTimeout(() => {
                              const closeBtn = document.querySelector('.mapboxgl-popup-close-button') as HTMLElement;
                              const popupWrapper = document.querySelector('.popup-wrapper') as HTMLElement;
                              if (closeBtn && popupWrapper) {
                                closeBtn.style.position = 'absolute';
                                closeBtn.style.right = '-125px';
                                closeBtn.style.top = '0px';
                                closeBtn.style.padding = '8px';
                                closeBtn.style.margin = '0';
                                closeBtn.style.width = '32px';
                                closeBtn.style.height = '32px';
                                closeBtn.style.fontSize = '24px';
                                closeBtn.style.lineHeight = '1';
                                closeBtn.style.fontWeight = 'bold';
                                closeBtn.style.zIndex = '1000';
                                closeBtn.style.backgroundColor = 'white';
                                closeBtn.style.borderRadius = '4px';
                                closeBtn.style.outline = 'none';
                                closeBtn.style.border = 'none';
                              }
                            }, 100);
                            
                            const popupContainer = document.createElement("div");
                            const popupRoot = createRoot(popupContainer);
                            popupRoot.render(
                              <div 
                                className="popup-wrapper" 
                                data-record-id={String(record.id)}
                                style={{ maxWidth: "280px", minWidth: "250px" }}
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
                      }
                      index++;
                    }
                    
                    if (index < unclusteredFeatures.length) {
                      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
                        requestIdleCallback(processMarkerChunk, { timeout: 50 });
                      } else {
                        setTimeout(() => processMarkerChunk(), 0);
                      }
                    }
                  };
                  
                  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
                    requestIdleCallback(processMarkerChunk, { timeout: 50 });
                  } else {
                    // Fallback for small arrays
                    if (unclusteredFeatures.length <= chunkSize) {
                      // Create lookup map for fallback too
                      const recordMap = new Map<string | number, any>();
                      dataForClustering.forEach((record: any) => {
                        if (record?.id) {
                          recordMap.set(record.id, record);
                        }
                      });
                      
                      unclusteredFeatures.forEach((feature: any) => {
                        if (feature.properties?.id) {
                          const record = recordMap.get(feature.properties.id);
                          if (record) {
                            const markerEl = createMarkerElement(record, isAuthenticated);
                            const marker = new mapboxgl.Marker({ element: markerEl })
                              .setLngLat((feature.geometry as Point).coordinates as [number, number])
                              .addTo(mapRef.current!);
                            markersRef.current.push({ marker, recordId: record.id, popupRoot: null });
                          }
                        }
                      });
                    } else {
                      setTimeout(() => processMarkerChunk(), 0);
                    }
                  }
                };
                
                // Start cleanup, which will trigger marker addition when done
                if (markersToClean.length > 0) {
                  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
                    requestIdleCallback(cleanupChunk, { timeout: 50 });
                  } else {
                    // Fallback: process synchronously for small arrays
                    if (markersToClean.length <= 10) {
                      markersToClean.forEach(({ marker, popupRoot }) => {
                        marker.remove();
                        if (popupRoot) popupRoot.unmount();
                      });
                      addNewMarkers();
                    } else {
                      setTimeout(() => cleanupChunk(), 0);
                    }
                  }
                } else {
                  addNewMarkers();
                }
              };

              // Call updateMarkers to set up source data
              updateMarkers(fetchedLocations);
              
              // Add teardrop markers on initial load
              setTimeout(addTeardropMarkers, 500); // Small delay to ensure map is fully rendered
              
              // Add teardrop markers when user zooms or moves
              mapRef.current.on('zoomend', addTeardropMarkers);
              mapRef.current.on('moveend', addTeardropMarkers);
            }
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
        if (process.env.NODE_ENV === 'development') {
          console.error("Error loading locations:", error);
        }
        setLoading(false);
      }
    };

    initMap();

    return () => {
      // Clean up markers - process in chunks to avoid blocking
      const markersToClean = [...markersRef.current];
      markersRef.current = [];
      
      if (markersToClean.length > 0) {
        const cleanupChunk = (deadline?: IdleDeadline) => {
          const hasTime = deadline ? deadline.timeRemaining() > 0 : true;
          const chunkSize = 10;
          let processed = 0;
          
          while (processed < markersToClean.length && hasTime && processed < chunkSize) {
            const { marker, popupRoot } = markersToClean[processed];
            const popup = marker.getPopup();
            if (popup && popup.isOpen()) {
              popup.remove();
            }
            marker.remove();
            if (popupRoot) {
              popupRoot.unmount();
            }
            processed++;
          }
          
          if (processed < markersToClean.length) {
            if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
              requestIdleCallback(cleanupChunk, { timeout: 50 });
            } else {
              setTimeout(() => cleanupChunk(), 0);
            }
          } else {
            // All markers cleaned up, now remove map
            mapRef.current?.remove();
            mapRef.current = null;
          }
        };
        
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          requestIdleCallback(cleanupChunk, { timeout: 50 });
        } else {
          // Fallback: process synchronously for small arrays
          if (markersToClean.length <= 10) {
            markersToClean.forEach(({ marker, popupRoot }) => {
              const popup = marker.getPopup();
              if (popup && popup.isOpen()) {
                popup.remove();
              }
              marker.remove();
              if (popupRoot) {
                popupRoot.unmount();
              }
            });
            mapRef.current?.remove();
            mapRef.current = null;
          } else {
            setTimeout(() => cleanupChunk(), 0);
          }
        }
      } else {
        // No markers to clean, just remove map
        mapRef.current?.remove();
        mapRef.current = null;
      }
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
