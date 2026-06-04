"use client";
import Nav from "@/components/layouts/Nav";
import Footer from "@/components/layouts/Footer";
import Sidebar from "@/components/layouts/Sidebar";
import { useEffect, useState, useRef, useCallback, startTransition } from "react";
import { customStyles } from "@/components/common/CustomSelect";
import Select from "react-select";
import Head from "next/head";
import { IndustryHouses } from "@/utils/IndustryDetails";
import dynamic from "next/dynamic";
import icons from "@/icons";
import { useRouter, useSearchParams } from "next/navigation";
import {
  memberNeedsLocationPrompt,
  buildUpdateLocationUrl,
} from "@/lib/domain/location/memberLocationPrompt";
import Image from "next/image";
import { BsiUserObjectArray } from "@/typings";
import Loader from "@/components/common/loader";
import MemberAccessModal from "@/components/common/MemberAccessModal";
import { LatLngBounds } from "leaflet";
import { testPerformanceMonitoring } from "@/lib/testPerformance";
import { sortMembersPhotosFirst } from "@/lib/sortMembersPhotosFirst";

/** Stable reference — inline `() => {}` in JSX was recreating MapboxMap every render. */
const noopMarkerHover = () => {};

// Dynamic import for Joyride to prevent SSR issues
const Joyride = dynamic(() => import('react-joyride'), {
  ssr: false,
});

const BsiMap = dynamic(() => import("@/components/common/Mapbox/MapboxMap"), {
  ssr: false,
});

export default function Home() {
  // const BsiMap = dynamic(() => import("@/components/common/LeafletMap"), {
  //   ssr: false,
  // });

  const [searchQuery, setSearchQuery] = useState("");
  const [filteredData, setFilteredData] = useState<BsiUserObjectArray>([]);
  const [OriginalData, setOriginalData] = useState<BsiUserObjectArray>([]);
  const [authenticatedUser, setAuthenticatedUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPopUpActive, setIsPopUpActive] = useState(false);
  const [popupDismissed, setPopupDismissed] = useState(false); // Track if popup has been dismissed
  const [preloaderMap, setPreloaderMap] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [lazyLoaded, setLazyLoaded] = useState(false);
  const [mapLocations, setMapLocations] = useState([]);

  // Guided Tour State
  const [runTour, setRunTour] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [tourKey, setTourKey] = useState(0); // Key to force remount if needed
  const [isMounted, setIsMounted] = useState(false); // Track if component is mounted

  const [preloaderSidebar, setPreloaderSidebar] = useState(true);
  const [loadedData, setLoadedData] = useState<any>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [fullTotalCount, setFullTotalCount] = useState(0);

  const [hideCounter, setHideCounter] = useState(false);
  const [chunkSizes, setChunkSizes] = useState([
    50, 50, 200, 200, 300, 300, 500, 500, 800,
  ]); // Default value

  // Fly map to a record (after search or clicking a sidebar card)
  const [flyToCoordinates, setFlyToCoordinates] = useState<{ lng: number; lat: number; ts?: number } | null>(null);

  // New state for sidebar infinite scroll
  const [sidebarPage, setSidebarPage] = useState(1);
  // Modification: totalCount now initialized as null instead of 0.
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const route = useRouter();
  const searchParams = useSearchParams();
  const locationPromptCheckedRef = useRef(false);
  const [mapSelfFocusApplied, setMapSelfFocusApplied] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const mapInitializedRef = useRef(false); // Track if map has been initialized
  /** Total count for the active industry filter (so clearing search restores the right total). */
  const industryFilteredTotalRef = useRef<number | null>(null);
  const initialDataLoadedRef = useRef(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const prevAuthenticatedRef = useRef<boolean | null>(null);
  const boundsAbortRef = useRef<AbortController | null>(null);
  const boundsRequestIdRef = useRef(0);
  const lastBoundsKeyRef = useRef<string | null>(null);
  const searchQueryRef = useRef(searchQuery);
  const selectedIndustryRef = useRef(selectedIndustry);
  searchQueryRef.current = searchQuery;
  selectedIndustryRef.current = selectedIndustry;
  const [viewportLoading, setViewportLoading] = useState(false);
  const [viewportBoundsFetched, setViewportBoundsFetched] = useState(false);

  // Scroll functions for mobile navigation
  const scrollUp = () => {
    try {
      // First try simple scrollBy
      window.scrollBy(0, -200);
      
      // Then try the more complex method
      const currentScroll = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
      const scrollAmount = 200; // Scroll amount
      const newScroll = Math.max(0, currentScroll - scrollAmount);
      
      // Try multiple scroll methods
      window.scrollTo({ top: newScroll, behavior: 'smooth' });
      document.documentElement.scrollTop = newScroll;
      document.body.scrollTop = newScroll;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Scroll up error:', error);
      }
    }
  };

  /** Get map coordinates from a list/map record (location.coordinates or fields lat/lng). */
  const getRecordCoords = useCallback((record: any): { lng: number; lat: number } | null => {
    const coords = record?.location?.coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      const lng = parseFloat(coords[0]);
      const lat = parseFloat(coords[1]);
      if (!isNaN(lng) && !isNaN(lat)) return { lng, lat };
    }
    const lat = parseFloat(record?.fields?.["LATITUDE (NEW)"]);
    const lng = parseFloat(record?.fields?.["LONGITUDE (NEW)"]);
    if (!isNaN(lat) && !isNaN(lng)) return { lng, lat };
    return null;
  }, []);

  const scrollDown = () => {
    try {
      // First try simple scrollBy
      window.scrollBy(0, 200);
      
      // Then try the more complex method
      const currentScroll = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
      const scrollAmount = 200; // Scroll amount
      const maxScroll = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      ) - window.innerHeight;
      const newScroll = Math.min(maxScroll, currentScroll + scrollAmount);
      
      // Try multiple scroll methods
      window.scrollTo({ top: newScroll, behavior: 'smooth' });
      document.documentElement.scrollTop = newScroll;
      document.body.scrollTop = newScroll;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Scroll down error:', error);
      }
    }
  };

  const scrollToMapSection = () => {
    const mapElement = document.querySelector('[data-tour="map-container"]');
    if (mapElement) {
      mapElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToSidebarSection = () => {
    const sidebarElement = document.querySelector('[data-tour="sidebar"]');
    if (sidebarElement) {
      sidebarElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Guided Tour Steps Configuration
  const tourSteps = [
    {
      target: '[data-tour="map-container"]',
      content: (
        <div>
          <h3 style={{ marginBottom: '10px', color: '#2D3748' }}>Welcome to BSN Member Map! 🗺️</h3>
          <p style={{ margin: 0, lineHeight: '1.5' }}>
            This is our interactive member map. Use it to explore organizations by location. 
            Zoom or drag to explore more members around the world.
          </p>
        </div>
      ),
      placement: 'center' as const,
      disableBeacon: true,
      showCloseButton: true,
      styles: {
        options: {
          primaryColor: '#FFBF23',
        },
        tooltip: {
          borderRadius: '12px',
          padding: '20px',
        },
        tooltipContent: {
          color: '#2D3748',
          fontSize: '16px',
        },
        buttonNext: {
          backgroundColor: '#FFBF23',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
        },
        buttonSkip: {
          color: '#718096',
          fontSize: '14px',
        },
        buttonClose: {
          color: '#718096',
          fontSize: '14px',
        },
      },
    },
    {
      target: '[data-tour="map-side-info"]',
      content: (
        <div>
          <h3 style={{ marginBottom: '10px', color: '#2D3748' }}>Member Markers & Controls 📍</h3>
          <p style={{ margin: 0, lineHeight: '1.5' }}>
            Each marker represents a BSN member. Click on any marker to view their profile details. 
            Use the zoom controls to explore different areas, and notice how markers cluster together 
            when many members are in the same region.
          </p>
        </div>
      ),
      placement: 'right' as const,
      disableBeacon: true,
      showCloseButton: true,
      styles: {
        options: {
          primaryColor: '#FFBF23',
        },
        tooltip: {
          borderRadius: '12px',
          padding: '20px',
          maxWidth: '300px',
        },
        buttonClose: {
          color: '#718096',
          fontSize: '14px',
        },
      },
    },
    {
      target: '[data-tour="search-input"]',
      content: (
        <div>
          <h3 style={{ marginBottom: '10px', color: '#2D3748' }}>Search & Filter 🔍</h3>
          <p style={{ margin: 0, lineHeight: '1.5' }}>
            Use the search bar to find members by name, location, organization, or keywords. 
            You can also filter by industry using the dropdown above.
          </p>
        </div>
      ),
      placement: 'bottom' as const,
      showCloseButton: true,
      styles: {
        options: {
          primaryColor: '#FFBF23',
        },
        tooltip: {
          borderRadius: '12px',
          padding: '20px',
        },
        buttonClose: {
          color: '#718096',
          fontSize: '14px',
        },
      },
    },
    {
      target: '[data-tour="sidebar"]',
      content: (
        <div>
          <h3 style={{ marginBottom: '10px', color: '#2D3748' }}>Member Directory 📋</h3>
          <p style={{ margin: 0, lineHeight: '1.5' }}>
            Browse through all BSN members in this sidebar. Click on any member card to view their profile 
            and learn more about their work in sustainability.
          </p>
        </div>
      ),
      placement: 'left' as const,
      showCloseButton: true,
      styles: {
        options: {
          primaryColor: '#FFBF23',
        },
        tooltip: {
          borderRadius: '12px',
          padding: '20px',
        },
        buttonClose: {
          color: '#718096',
          fontSize: '14px',
        },
      },
    },
    {
      target: '[data-tour="nav-member-engagement"]',
      content: (
        <div>
          <h3 style={{ marginBottom: '10px', color: '#2D3748' }}>Your profile &amp; map help</h3>
          <ul style={{ margin: 0, paddingLeft: '18px', lineHeight: '1.55', color: '#2D3748' }}>
            <li style={{ marginBottom: '8px' }}>
              <strong>Profile photo</strong> — opens a preview of what others see on the map
              (name, email, location, organization, bio, and member level). Sign in to use this
              when logged out.
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>ℹ Info</strong> — inside that profile popup, tap the info icon at the top
              to learn how to update your full profile in the Black Sustainability Network.
            </li>
            <li>
              <strong>Help (?)</strong> — report map issues or confusion; we create a support
              ticket and email you a ticket number.
            </li>
          </ul>
        </div>
      ),
      placement: 'bottom-end' as const,
      disableBeacon: true,
      showCloseButton: true,
      styles: {
        options: {
          primaryColor: '#FFBF23',
        },
        tooltip: {
          borderRadius: '12px',
          padding: '20px',
          maxWidth: '340px',
        },
        buttonClose: {
          color: '#718096',
          fontSize: '14px',
        },
      },
    },
  ];

  // Track component mount status to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
    
    // Test performance monitoring
    setTimeout(() => {
      testPerformanceMonitoring();
    }, 1000);
    
    // Add manual performance test button to window for debugging
    if (process.env.NODE_ENV === 'development') {
      (window as any).testPerformance = () => {
        testPerformanceMonitoring();
      };
      
      // Add manual performance metrics logging
      (window as any).logPerformanceNow = () => {
        const { getPerformanceMetrics, logPerformanceMetrics } = require('@/lib/performanceLogger');
        const metrics = getPerformanceMetrics();
        logPerformanceMetrics(metrics);
      };
    }
  }, []);

  // --- NEW: Monitor scroll position to show/hide the back-to-top button ---
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const handleScroll = () => {
      if (sidebar.scrollTop > 200) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    sidebar.addEventListener("scroll", handleScroll);
    return () => {
      sidebar.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // ─── 0. Session: httpOnly Mighty-verified cookie (server checks via /api/auth/session) ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/session", { credentials: "include" });
        const data = await res.json();
        if (cancelled) return;
        if (data.authenticated && data.user) {
          setAuthenticatedUser(data.user);
          setIsAuthenticated(true);
        } else {
          setAuthenticatedUser(null);
          setIsAuthenticated(false);
        }
      } catch {
        if (!cancelled) {
          setAuthenticatedUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (!cancelled) setSessionChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Redirect authenticated members missing location (return visits, not only sign-in).
  useEffect(() => {
    if (!isAuthenticated) {
      locationPromptCheckedRef.current = false;
      return;
    }
    if (locationPromptCheckedRef.current) return;

    let cancelled = false;
    (async () => {
      try {
        const meRes = await fetch("/api/member/me", { credentials: "include" });
        const me = await meRes.json().catch(() => null);
        if (cancelled) return;
        locationPromptCheckedRef.current = true;
        if (memberNeedsLocationPrompt(me?.mongo)) {
          route.replace(buildUpdateLocationUrl("/"));
        }
      } catch {
        if (!cancelled) locationPromptCheckedRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, route]);

  // Guided Tour Initialization - Removed automatic trigger
  // Tour will now only be triggered manually by user clicking the menu option

  // Handle tour callback events
  const handleJoyrideCallback = (data: any) => {
    const { status, type, index, action } = data;

    // Handle close actions (X button, clicking outside, etc.)
    if (status === 'finished' || status === 'skipped' || action === 'close') {
      setRunTour(false);
      setStepIndex(0);
      return;
    }

    // Handle next/back navigation
    if (type === 'step:after') {
      if (action === 'next') setStepIndex(index + 1);
      if (action === 'prev') setStepIndex(index - 1);
    }

    // Track when tour starts - removed map hiding logic
    if (type === 'step:before' && index === 0) {
      // Tour started - no need to hide map anymore
    }
  };

  // Function to close tour manually
  const closeTour = () => {
    setRunTour(false);
    setStepIndex(0);
  };

  // Manual tour trigger - now the only way to start the tour
  const startTour = () => {
    if (!isMounted) return;
    setStepIndex(0);
    setRunTour(true);
  };

  // Memoized popup close handler to prevent unnecessary re-renders
  const handlePopupClose = useCallback(() => {
    setIsPopUpActive(false);
    setPopupDismissed(true);
  }, []);

  const scrollToTop = () => {
    if (sidebarRef.current) {
      sidebarRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  // useEffect(() => {
  //   // ... user cookie code (omitted)
  // }, []);


  const fetchMapLocations = useCallback(async () => {
    const response = await fetch("/api/getMarkers", { credentials: "include" });
    if (!response.ok) throw new Error("Failed to fetch locations data.");
    const json = await response.json();
    setMapLocations(json.data ?? []);
  }, []);

  // Fetch markers once after session is known; refetch only when user signs in during the visit (gating changes).
  useEffect(() => {
    if (!sessionChecked) return;

    const prev = prevAuthenticatedRef.current;
    prevAuthenticatedRef.current = isAuthenticated;

    if (prev === null) {
      void fetchMapLocations();
      return;
    }
    if (prev === false && isAuthenticated) {
      void fetchMapLocations();
    }
  }, [sessionChecked, isAuthenticated, fetchMapLocations]);

  // After saving location, fly map to the member's new pin (?focus=self&lat=&lng=).
  useEffect(() => {
    const focus = searchParams?.get("focus");
    if (focus !== "self") return;

    const lat = Number(searchParams?.get("lat"));
    const lng = Number(searchParams?.get("lng"));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    setFlyToCoordinates({ lat, lng, ts: Date.now() });
    setMapSelfFocusApplied(true);
    void fetchMapLocations();
    route.replace("/", { scroll: false });
  }, [searchParams, route, fetchMapLocations]);

  // --------------------------------------------------------------------
  // 1. Initial Data Fetch for Map & Sidebar
  // --------------------------------------------------------------------
  useEffect(() => {
    const fetchData = async () => {
      performance.mark("mapFetchStart");
      setLoading(true);
      
      // Detect mobile and reduce initial load
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const initialLimit = isMobile ? 50 : 100;
      
      fetch(`/api/getData?page=1&limit=${initialLimit}`, { credentials: "include" })
        .then((response) => {
          return response.json();
        })
        .then(async (result) => {
          if (result.success && Array.isArray(result.data)) {
            // Filter data in chunks to avoid blocking
            // In dev mode, use larger threshold to reduce async overhead
            const isDev = process.env.NODE_ENV === 'development';
            const syncThreshold = isDev ? 500 : 100;
            
            const filterDataInChunks = (dataArray: any[], chunkSize = 100): Promise<any[]> => {
              // For small arrays or dev mode with small arrays, process synchronously
              if (dataArray.length <= syncThreshold) {
                return Promise.resolve(dataArray.filter((item: any) => item !== null));
              }
              
              return new Promise((resolve) => {
                const filtered: any[] = [];
                let index = 0;

                const processChunk = (deadline?: IdleDeadline) => {
                  const hasTime = deadline ? deadline.timeRemaining() > 0 : true;
                  const endIndex = Math.min(index + chunkSize, dataArray.length);

                  while (index < endIndex && hasTime) {
                    if (dataArray[index] !== null) {
                      filtered.push(dataArray[index]);
                    }
                    index++;
                  }

                  if (index < dataArray.length) {
                    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
                      requestIdleCallback(processChunk, { timeout: 50 });
                    } else {
                      setTimeout(() => processChunk(), 0);
                    }
                  } else {
                    resolve(filtered);
                  }
                };

                if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
                  requestIdleCallback(processChunk, { timeout: 50 });
                } else {
                  setTimeout(() => processChunk(), 0);
                }
              });
            };

            // Use startTransition for non-critical state updates
            filterDataInChunks(result.data).then((filteredNullData) => {
              const sortedData = sortMembersPhotosFirst(filteredNullData);
              initialDataLoadedRef.current = true;
              startTransition(() => {
                // Save the full total count
                setFullTotalCount(result.totalCount);
                setTotalCount(result.totalCount);
                // Set data for sidebar and for map progressive loading
                setOriginalData(sortedData);
                setFilteredData(sortedData);
                const totalRecords = sortedData.length;
                const chunkSize = Math.ceil(totalRecords / 3);
                setChunkSizes([chunkSize, chunkSize, totalRecords - 2 * chunkSize]);
                setLoadedData(sortedData.slice(0, chunkSize));
                setCurrentIndex(chunkSize);
                setChunkIndex(1);
                setSidebarPage(1);
              });
            });
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.error("API did not return a valid data array", result);
            }
          }
        })
        .catch((error) => {
          if (process.env.NODE_ENV === 'development') {
            console.error("Error fetching data:", error);
          }
        })
        .finally(() => {
          setLoading(false);
          setPreloaderSidebar(false);
        });
    };

    fetchData();
  }, []);

  // --------------------------------------------------------------------
  // 2. Progressive Chunk Loading for Map
  // --------------------------------------------------------------------
  useEffect(() => {
    if (lazyLoaded) return;
    const loadNextChunk = () => {
      if (filteredData) {
        if (
          currentIndex < filteredData.length &&
          chunkIndex < chunkSizes.length
        ) {
          const nextChunkSize = chunkSizes[chunkIndex];
          const nextChunk = filteredData.slice(
            currentIndex,
            currentIndex + nextChunkSize
          );
          // Batch non-critical state updates to avoid blocking UI
          startTransition(() => {
            setLoadedData((prevData: any) => [...prevData, ...nextChunk]);
            setCurrentIndex(currentIndex + nextChunkSize);
            setChunkIndex(chunkIndex + 1);
          });
        }
      }
    };

    if (currentIndex === 0) {
      loadNextChunk();
    } else {
      const timer = setTimeout(loadNextChunk, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, filteredData, chunkIndex, chunkSizes]);

  // --------------------------------------------------------------------
  // 3. Map Loader: Hide when all chunks loaded
  // --------------------------------------------------------------------
  useEffect(() => {
    if (loadedData.length === filteredData.length && filteredData.length > 0) {
      performance.mark("mapLoadEnd");
      performance.measure("mapLoadTime", "mapFetchStart", "mapLoadEnd");
      if (process.env.NODE_ENV === 'development') {
        const measures = performance.getEntriesByName("mapLoadTime");
        if (measures[0]) {
          console.log("Map load time:", measures[0].duration, "ms");
        }
      }
      setPreloaderMap(false);
    }
  }, [loadedData, filteredData]);

  // --------------------------------------------------------------------
  // 5. Infinite Scrolling for Sidebar via "Load More" Button
  // --------------------------------------------------------------------
  const handleLoadMore = async () => {
    const nextPage = sidebarPage + 1;
    const industryQs =
      selectedIndustry && selectedIndustry !== ""
        ? `&industryHouse=${encodeURIComponent(selectedIndustry)}`
        : "";
    try {
      const res = await fetch(
        `/api/getData?page=${nextPage}&limit=100${industryQs}`,
        { credentials: "include" }
      );
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        const newRecords = result.data.filter((item: any) => item !== null);
        // Batch non-critical state updates to avoid blocking UI
        startTransition(() => {
          setFilteredData((prev: any) => sortMembersPhotosFirst([...prev, ...newRecords]));
          setOriginalData((prev: any) => sortMembersPhotosFirst([...prev, ...newRecords]));
          setSidebarPage(nextPage);
        });
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.error("Infinite scroll: API did not return valid data", result);
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error fetching more sidebar data:", error);
      }
    }
  };

  // useEffect(() => {
  //   if (isAuthenticated === false) {
  //     setTimeout(() => {
  //       if (loadedData?.length === filteredData?.length) {
  //         setIsPopUpActive(true);
  //       }
  //     }, 6000);
  //   }
  // }, []);
  // --------------------------------------------------------------------
  // 6. Search Filtering: Call the search API when searchQuery changes
  // --------------------------------------------------------------------

  const DEBOUNCE_DELAY = 500; // Adjust debounce delay as needed

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery.trim() !== "") {
        // Keep loading states urgent (user needs immediate feedback)
        setLoading(true);
        setPreloaderSidebar(true);
        setHasSearched(true);

        fetch(`/api/searchData?page=1&limit=100&q=${encodeURIComponent(searchQuery)}`, { credentials: "include" })
          .then((response) => response.json())
          .then((result) => {
            if (result.success && Array.isArray(result.data)) {
              const data = result.data;
              const searchTotal =
                typeof result.totalCount === "number" ? result.totalCount : data.length;
              startTransition(() => {
                setFilteredData(sortMembersPhotosFirst(data));
                setTotalCount(searchTotal);
                setSidebarPage(1);
              });
              // Fly map to first search result
              if (data.length > 0) {
                const coords = getRecordCoords(data[0]);
                if (coords) setFlyToCoordinates({ ...coords, ts: Date.now() });
              }
            } else {
              if (process.env.NODE_ENV === 'development') {
                console.error("🔍 Frontend: Search API did not return valid data", result);
              }
              // Batch error state update
              startTransition(() => {
                setFilteredData([]); // Ensure we clear data on error
                setTotalCount(0);
              });
            }
          })
          .catch((error) => {
            if (process.env.NODE_ENV === 'development') {
              console.error("Error fetching search data:", error);
            }
            // Batch error state update
            startTransition(() => {
              setFilteredData([]);
              setTotalCount(0);
            });
          })
          .finally(() => {
            // Keep loading states urgent (user needs immediate feedback)
            setLoading(false);
            setPreloaderSidebar(false);
          });
      } else {
        // If search query is empty, reset to original data and restore list total for filters
        if (!initialDataLoadedRef.current) return;
        setHasSearched(false);
        startTransition(() => {
          setFilteredData(OriginalData);
          setViewportBoundsFetched(false);
          lastBoundsKeyRef.current = null;
          if (selectedIndustry && industryFilteredTotalRef.current != null) {
            setTotalCount(industryFilteredTotalRef.current);
          } else {
            setTotalCount(fullTotalCount);
          }
        });
      }
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(handler); // Cleanup previous timeout
  }, [searchQuery, OriginalData, getRecordCoords, selectedIndustry, fullTotalCount]);


  // --------------------------------------------------------------------
  // 7. Dropdown Filter (unchanged)
  // --------------------------------------------------------------------
  const filterByIndustryHouse = async (selectedOption: any) => {
    const selectedValue = selectedOption.value;
    // Keep selected industry update urgent (immediate UI feedback)
    setSelectedIndustry(selectedValue);
    if (selectedValue === "") {
      industryFilteredTotalRef.current = null;
      // Batch data reset updates (non-urgent)
      startTransition(() => {
        setFilteredData(OriginalData);
        setViewportBoundsFetched(false);
        lastBoundsKeyRef.current = null;
        setTotalCount(fullTotalCount); // Reset total count to full count
      });
      return;
    }
    try {
      // Keep loading state urgent (user needs immediate feedback)
      setPreloaderSidebar(true);
      const res = await fetch(
        `/api/filterData?page=1&limit=500&industryHouse=${encodeURIComponent(selectedValue)}`,
        { credentials: "include" }
      );
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        const tc =
          typeof result.totalCount === "number" ? result.totalCount : result.data.length;
        industryFilteredTotalRef.current = tc;
        // Batch data updates to avoid blocking UI
        startTransition(() => {
          setFilteredData(sortMembersPhotosFirst(result.data));
          setTotalCount(tc);
          setSidebarPage(1);
        });
        // Keep loading state urgent
        setPreloaderSidebar(false);
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.error("Filter API did not return valid data", result);
        }
        setPreloaderSidebar(false);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error fetching filtered data:", error);
      }
      setPreloaderSidebar(false);
    }
  };

  // useEffect(() => {
  //   // helper to read a cookie by name
  //   function getCookie(name: string): string {
  //     const match = document.cookie.match(
  //       new RegExp("(^| )" + name + "=([^;]+)")
  //     );
  //     return match ? decodeURIComponent(match[2]) : "";
  //   }

  //   const raw = getCookie("bsn_user_data");
  //   if (!raw) {
  //     return; // no cookie → stay unauthenticated
  //   }

  //   try {
  //     const userObj = JSON.parse(raw);
  //     setAuthenticatedUser(userObj);
  //     setIsAuthenticated(true);
  //     console.log(userObj, "authenticated user data");
  //   } catch (err) {
  //     console.error("Failed to parse bsn_user_data cookie:", err);
  //   }
  // }, []);




  // --------------------------------------------------------------------
  // 8. Viewport-based sidebar sync (default browsing mode only)
  // --------------------------------------------------------------------
  const handleBoundsChange = useCallback(async (bounds: LatLngBounds) => {
    if (searchQueryRef.current.trim() !== "" || selectedIndustryRef.current !== "") {
      return;
    }

    const northEast = bounds.getNorthEast();
    const southWest = bounds.getSouthWest();
    const round = (n: number) => Math.round(n * 10000) / 10000;
    const boundsKey = `${round(northEast.lat)},${round(northEast.lng)},${round(southWest.lat)},${round(southWest.lng)}`;
    if (lastBoundsKeyRef.current === boundsKey) {
      return;
    }
    lastBoundsKeyRef.current = boundsKey;

    boundsAbortRef.current?.abort();
    const controller = new AbortController();
    boundsAbortRef.current = controller;
    const requestId = ++boundsRequestIdRef.current;

    setViewportLoading(true);
    try {
      const res = await fetch(
        `/api/getMarkers?northEastLat=${northEast.lat}&northEastLng=${northEast.lng}&southWestLat=${southWest.lat}&southWestLng=${southWest.lng}`,
        { credentials: "include", signal: controller.signal }
      );
      const result = await res.json();
      if (requestId !== boundsRequestIdRef.current) return;
      if (searchQueryRef.current.trim() !== "" || selectedIndustryRef.current !== "") return;

      if (result.success && Array.isArray(result.data)) {
        const data = sortMembersPhotosFirst(
          result.data.filter((item: any) => item !== null)
        );
        startTransition(() => {
          setLazyLoaded(true);
          setFilteredData(data);
          setLoadedData(data);
          setSidebarPage(1);
          setCurrentIndex(data.length);
          setChunkIndex(1);
          setChunkSizes([Math.max(data.length, 1)]);
          setViewportBoundsFetched(true);
        });
      } else if (process.env.NODE_ENV === "development") {
        console.error("Failed to fetch markers based on bounds", result);
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      if (process.env.NODE_ENV === "development") {
        console.error("Error fetching markers by bounds:", error);
      }
    } finally {
      if (requestId === boundsRequestIdRef.current) {
        setViewportLoading(false);
      }
    }
  }, []);

  const isDefaultBrowsingMode =
    searchQuery.trim() === "" && selectedIndustry === "";
  const viewportEmpty =
    isDefaultBrowsingMode &&
    viewportBoundsFetched &&
    !viewportLoading &&
    filteredData.length === 0;

  const sidebarDisplayTotal =
    searchQuery.trim() !== "" || selectedIndustry !== ""
      ? totalCount!
      : fullTotalCount;

  // --------------------------------------------------------------------
  // 9. Render Component
  // --------------------------------------------------------------------

  useEffect(() => {
    // only non-logged-in users should ever see it
    if (!isAuthenticated && !popupDismissed) {
      // once all chunks are loaded...
      if (
        loadedData.length > 0 &&
        loadedData.length === filteredData.length
      ) {
        const timer = setTimeout(() => {
          setIsPopUpActive(true);
        }, 6000);

        // cleanup if auth or data changes before 6s
        return () => clearTimeout(timer);
      }
    }
  }, [isAuthenticated, loadedData.length, filteredData.length, popupDismissed]);

  // mapLocations powers the initial global marker load before any pan/zoom.
  // After viewportBoundsFetched, filteredData (bbox from /api/getMarkers) keeps markers and sidebar aligned.
  // Search/filter modes also use filteredData because results are already mode-specific.
  const isSearchOrFilterMode =
    searchQuery.trim() !== "" || selectedIndustry !== "";

  const mapMarkerData =
    isSearchOrFilterMode || viewportBoundsFetched
      ? filteredData
      : mapLocations;

  // --------------------------------------------------------------------
  // 9. Render Component
  // --------------------------------------------------------------------

  const handleRecordClickForMap = useCallback((record: any) => {
    const coords = getRecordCoords(record);
    if (coords) setFlyToCoordinates({ ...coords, ts: Date.now() });
  }, [getRecordCoords]);

  return (
    <>
      <Head>
        <title>Black Sustainability Network</title>
        <meta name="description" content="Explore and connect with Black sustainability leaders across the globe." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://maps.blacksustainability.org/" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Black Sustainability Network" />
        <meta property="og:description" content="Explore and connect with Black sustainability leaders across the globe." />
        <meta property="og:image" content="https://maps.blacksustainability.org/default-logo.png" />
        <meta property="og:url" content="https://maps.blacksustainability.org/" />
        <meta property="og:type" content="website" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Black Sustainability Network" />
        <meta name="twitter:description" content="Explore and connect with Black sustainability leaders across the globe." />
        <meta name="twitter:image" content="https://maps.blacksustainability.org/default-logo.png" />
      </Head>
      <div className="relative min-h-screen w-full overflow-y-auto touch-pan-y overscroll-contain mobile-scroll">
      {/* Guided Tour Component - Only render on client side */}
      {isMounted && runTour && (
        <Joyride
          steps={tourSteps}
          run={runTour}
          stepIndex={stepIndex}
          continuous
          showProgress
          showSkipButton
          scrollToFirstStep
          disableOverlayClose={false}
          disableCloseOnEsc={false}
          callback={handleJoyrideCallback}
          styles={{
            options: {
              arrowColor: '#fff',
              backgroundColor: '#fff',
              overlayColor: 'rgba(0, 0, 0, 0.4)',
              primaryColor: '#FFBF23',
              textColor: '#2D3748',
              width: 320,
              zIndex: 10000,
            }
          }}
          locale={{
            back: 'Back',
            close: 'Close',
            last: 'Finish Tour',
            next: 'Next',
            open: 'Open the dialog',
            skip: 'Skip Tour',
          }}
        />
      )}

      <Nav
        isAuthenticated={isAuthenticated}
        authenticatedUser={authenticatedUser}
        startTour={startTour}
        runTour={runTour}
        tourStepIndex={stepIndex}
      />

      <div className="mt-[110px]">
        <div className="flex sm:flex-row flex-col bg-[#FFF8E5]">
          <div
            className="sm:w-[52%] w-full sm:p-0 p-3 h-screen"
            data-tour="map-container"
            data-testid={mapSelfFocusApplied ? "map-self-focus-active" : "map-container"}
          >
            {preloaderMap ? (
              <div className="relative w-full h-screen">
                <Image
                  src="/png/mapbg2.1920.png"
                  width={1920}
                  height={Math.round((3451 / 6134) * 1920)} // ≈ 1080
                  priority
                  unoptimized
                  alt="map one"
                  className="w-full h-auto"
                />

                <div className="absolute top-[45%] left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="font-lexend flex flex-col gap-y-2 justify-center items-center glass rounded-[30px] text-center px-10 py-5">
                    <Image
                      src="/png/LOGO.png"
                      alt="company logo"
                      width={266}
                      height={82}
                      priority
                    />
                    <div className="flex flex-col items-center">
                      <Loader />
                      <p className="text-sm lg:text-xl font-semibold mt-3">
                        Looking for other members...
                      </p>
                      <p className="text-sm lg:text-sm font-medium leading-tight">
                        Sit back while we search around the globe.
                      </p>
                      <p className="text-sm lg:text-base">
                        We've loaded all {totalCount} records!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative w-full h-screen">
                {/* Always render the map */}
                <div data-tour="map-markers">
                  <BsiMap
                    key="bsn-member-map"
                    isAuthenticated={isAuthenticated}
                    loadedData={loadedData}
                    hideCounter={hideCounter}
                    onMarkerHover={noopMarkerHover}
                    filteredData={mapMarkerData}
                    flyToCoordinates={flyToCoordinates}
                    onBoundsChange={handleBoundsChange}
                  />
                </div>
                {/* Side target for tour */}
                <div 
                  data-tour="map-side-info"
                  style={{
                    position: 'absolute',
                    left: '48%',
                    top: '35%',
                    width: '10px',
                    height: '10px',
                    pointerEvents: 'none',
                    zIndex: 1000,
                  }}
                />
              </div>
            )}
          </div>
          <div
            ref={sidebarRef}
            className="sm:w-[48%] w-full pb-4 flex flex-col justify-start items-stretch h-screen overflow-scroll"
            data-tour="sidebar"
            data-testid="sidebar-container"
          >
            <div className="bg-[#FFF8E5] py-2 sticky left-0 top-0 w-full flex flex-col items-center justify-center z-10">
              <div className="w-[95%]" data-testid="industry-filter">
                <Select
                  placeholder="Select Industry House"
                  isSearchable
                  noOptionsMessage={() => "No Industry Found"}
                  options={IndustryHouses}
                  onChange={filterByIndustryHouse}
                  styles={customStyles}
                />
              </div>
              <div className="w-[95%] relative">
                <input
                  data-tour="search-input"
                  data-testid="map-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white border outline-none w-full px-5 py-2 rounded-full text-sm placeholder:capitalize placeholder:text-xs"
                  placeholder="Search by Name, Country, City, State, Zip Code, Organization, Bio Keywords, Industry, House, Affiliated"
                />

                <span className="absolute right-4 top-3">
                  <icons.search />
                </span>
              </div>
            </div>

            {preloaderSidebar || totalCount === null ? (
              <div className="flex items-center justify-center h-[80vh]">
                <img
                  src="/gif/loading.gif"
                  className="max-w-xs"
                  alt="sidebar loading"
                />
              </div>
            ) : (
              <>
                {searchQuery.trim() === "" &&
                  selectedIndustry === "" &&
                  !viewportBoundsFetched &&
                  totalCount !== null &&
                  filteredData.length > 0 &&
                  filteredData.length < totalCount && (
                    <div className="hidden sm:flex justify-center px-4 pt-2 pb-1 w-full">
                      <button
                        type="button"
                        onClick={handleLoadMore}
                        className="px-6 py-3 bg-[#FFBF23] text-black font-semibold rounded-full shadow-md hover:bg-yellow-500 transition duration-200 ease-in-out"
                      >
                        Load more ({filteredData.length} of {totalCount})
                      </button>
                    </div>
                  )}
                <Sidebar
                  filteredData={filteredData}
                  isAuthenticated={isAuthenticated}
                  totalNumber={sidebarDisplayTotal}
                  visibleInViewport={
                    isDefaultBrowsingMode && viewportBoundsFetched
                      ? filteredData.length
                      : undefined
                  }
                  loading={loading}
                  hasSearched={hasSearched}
                  viewportEmpty={viewportEmpty}
                  viewportLoading={viewportLoading && isDefaultBrowsingMode}
                  onRecordClick={handleRecordClickForMap}
                />
                {searchQuery.trim() === "" &&
                  selectedIndustry === "" &&
                  !viewportBoundsFetched &&
                  totalCount !== null &&
                  filteredData.length > 0 &&
                  filteredData.length < totalCount && (
                    <div className="flex sm:hidden justify-center py-4 w-full">
                      <button
                        type="button"
                        onClick={handleLoadMore}
                        className="px-6 py-3 bg-[#FFBF23] text-black font-semibold rounded-full shadow-md hover:bg-yellow-500 transition duration-200 ease-in-out"
                      >
                        Load more ({filteredData.length} of {totalCount})
                      </button>
                    </div>
                  )}
              </>
            )}
          </div>
        </div>
      </div>

      <MemberAccessModal isOpen={isPopUpActive} onClose={handlePopupClose} />
      <Footer />
      
      {/* Scroll Navigation Buttons - Mobile Only */}
      <div className="fixed right-4 bottom-20 z-50 flex flex-col gap-2 md:hidden">
          <button
            onClick={(e) => {
              // Add visual feedback
              const button = e.currentTarget as HTMLElement;
            button.style.transform = 'scale(0.95)';
            setTimeout(() => {
              button.style.transform = 'scale(1)';
            }, 150);
            
            scrollUp();
          }}
          className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-full shadow-xl transition-all duration-200 active:scale-95 border-2 border-white"
          title="Scroll Up"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
        
        <button
          onClick={scrollToMapSection}
          className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-xl transition-all duration-200 active:scale-95 border-2 border-white"
          title="Go to Map"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        
        <button
          onClick={scrollToSidebarSection}
          className="bg-purple-500 hover:bg-purple-600 text-white p-4 rounded-full shadow-xl transition-all duration-200 active:scale-95 border-2 border-white"
          title="Go to Results"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </button>
        
          <button
            onClick={(e) => {
              // Add visual feedback
              const button = e.currentTarget as HTMLElement;
            button.style.transform = 'scale(0.95)';
            setTimeout(() => {
              button.style.transform = 'scale(1)';
            }, 150);
            
            scrollDown();
          }}
          className="bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-full shadow-xl transition-all duration-200 active:scale-95 border-2 border-white"
          title="Scroll Down"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      </div>
      </div>
    </>
  );
}
