"use client";
import Nav from "@/components/layouts/Nav";
import Footer from "@/components/layouts/Footer";
import Sidebar from "@/components/layouts/Sidebar";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { customStyles } from "@/components/common/CustomSelect";
import Select from "react-select";
import Head from "next/head";
import { IndustryHouses } from "@/utils/IndustryDetails";
import dynamic from "next/dynamic";
import icons from "@/icons";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BsiUserObjectArray } from "@/typings";
import { getAllRecordsFromAirtable } from "@/utils/airtable";
import Loader from "@/components/common/loader";
import { LatLngBounds } from "leaflet";
import { testPerformanceMonitoring } from "@/lib/testPerformance";

// Dynamic import for Joyride to prevent SSR issues
const Joyride = dynamic(() => import('react-joyride'), {
  ssr: false,
});

export default function Home() {
  // const BsiMap = dynamic(() => import("@/components/common/LeafletMap"), {
  //   ssr: false,
  // });
  const BsiMap = dynamic(() => import("@/components/common/Mapbox/MapboxMap"), {
    ssr: false,
  })

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

  // New state for sidebar infinite scroll
  const [sidebarPage, setSidebarPage] = useState(1);
  // Modification: totalCount now initialized as null instead of 0.
  const [totalCount, setTotalCount] = useState<number | null>(null);
  console.log(filteredData, 'filtered data')
  const route = useRouter();
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const mapInitializedRef = useRef(false); // Track if map has been initialized

  // Scroll functions for mobile navigation
  const scrollUp = () => {
    console.log('Scrolling up...');
    try {
      // First try simple scrollBy
      window.scrollBy(0, -200);
      
      // Then try the more complex method
      const currentScroll = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
      const scrollAmount = 200; // Scroll amount
      const newScroll = Math.max(0, currentScroll - scrollAmount);
      
      console.log('Current scroll:', currentScroll, 'New scroll:', newScroll);
      
      // Try multiple scroll methods
      window.scrollTo({ top: newScroll, behavior: 'smooth' });
      document.documentElement.scrollTop = newScroll;
      document.body.scrollTop = newScroll;
    } catch (error) {
      console.error('Scroll up error:', error);
    }
  };

  const scrollDown = () => {
    console.log('Scrolling down...');
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
      
      console.log('Current scroll:', currentScroll, 'New scroll:', newScroll, 'Max scroll:', maxScroll);
      
      // Try multiple scroll methods
      window.scrollTo({ top: newScroll, behavior: 'smooth' });
      document.documentElement.scrollTop = newScroll;
      document.body.scrollTop = newScroll;
    } catch (error) {
      console.error('Scroll down error:', error);
    }
  };

  const scrollToMapSection = () => {
    console.log('Scrolling to map section...');
    const mapElement = document.querySelector('[data-tour="map-container"]');
    if (mapElement) {
      mapElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      console.log('Map element not found');
    }
  };

  const scrollToSidebarSection = () => {
    console.log('Scrolling to sidebar section...');
    const sidebarElement = document.querySelector('[data-tour="sidebar"]');
    if (sidebarElement) {
      sidebarElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      console.log('Sidebar element not found');
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
  ];

  // Track component mount status to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
    
    // Test performance monitoring
    setTimeout(() => {
      testPerformanceMonitoring();
    }, 1000);
    
    // Add manual performance test button to window for debugging
    (window as any).testPerformance = () => {
      testPerformanceMonitoring();
    };
    
    // Add manual performance metrics logging
    (window as any).logPerformanceNow = () => {
      const { getPerformanceMetrics, logPerformanceMetrics } = require('@/lib/performanceLogger');
      const metrics = getPerformanceMetrics();
      logPerformanceMetrics(metrics);
    };
    
    console.log('🔧 Performance test available: Run window.testPerformance() in console');
    console.log('🔧 Manual performance logging: Run window.logPerformanceNow() in console');
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

  // ─── 0. Bootstrap & re-write cross-site bsn_user_data cookie into first-party ──
  useEffect(() => {
    function getCookie(name: string): string | null {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? decodeURIComponent(match[2]) : null;
    }

    const raw = getCookie('bsn_user_data');
    if (!raw) {
      setIsAuthenticated(false);
      setAuthenticatedUser(null);
      return;
    }

    try {
      const userObj = JSON.parse(raw);
      console.log('Parsed user object:', userObj);
      setAuthenticatedUser(userObj);
      setIsAuthenticated(true);
    } catch (err) {
      console.error('Error parsing user data:', err);
      setIsAuthenticated(false);
      setAuthenticatedUser(null);
    }
  }, []);

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


  useEffect(() => {
    const getMapLocations = async () => {
      const response = await fetch("api/getMarkers");
      if (!response.ok) throw new Error("Failed to fetch locations data.");
      const json = await response.json();  // <--- this was missing
      setMapLocations(json.data)
    }
    getMapLocations()
  }, [])

  // --------------------------------------------------------------------
  // 1. Initial Data Fetch for Map & Sidebar
  // --------------------------------------------------------------------
  useEffect(() => {
    console.log("🚀 Fetch data useEffect triggered");
    const fetchData = async () => {
      console.log("🚀 fetchData function called");
      performance.mark("mapFetchStart");
      setLoading(true);
      // setPreloaderSidebar(true);
      console.log("🚀 About to fetch /api/getData?page=1&limit=100");
      const fetchStartTime = performance.now();
      console.log("⏱️ TIMING: Fetch started at", fetchStartTime);
      
      fetch("/api/getData?page=1&limit=100")
        .then((response) => {
          const responseTime = performance.now() - fetchStartTime;
          console.log("⏱️ TIMING: API response received in", responseTime, "ms");
          console.log("API Response status:", response.status, response.statusText);
          return response.json();
        })
        .then(async (result) => {
          const parseTime = performance.now() - fetchStartTime;
          console.log("⏱️ TIMING: Data parsed in", parseTime, "ms");
          
          if (result.success && Array.isArray(result.data)) {
            const filteredNullData = result.data.filter((item: any) => item !== null);
            const filterTime = performance.now() - fetchStartTime;
            console.log("⏱️ TIMING: Data filtered in", filterTime, "ms - Count:", filteredNullData.length);
            // Save the full total count
            setFullTotalCount(result.totalCount);
            setTotalCount(result.totalCount);
            // Set data for sidebar and for map progressive loading
            setOriginalData(filteredNullData);
            setFilteredData(filteredNullData);
            const totalRecords = filteredNullData.length;
            const chunkSize = Math.ceil(totalRecords / 3);
            setChunkSizes([chunkSize, chunkSize, totalRecords - 2 * chunkSize]);
            setLoadedData(filteredNullData.slice(0, chunkSize));
            setCurrentIndex(chunkSize);
            setChunkIndex(1);
            setSidebarPage(1);
            
            const setStateTime = performance.now() - fetchStartTime;
            console.log("⏱️ TIMING: State set in", setStateTime, "ms");
          } else {
            console.error("API did not return a valid data array", result);
          }
        })
        .catch((error) => {
          console.error("Error fetching data:", error);
        })
        .finally(() => {
          console.log("🚀 Finally block - setting loading to false");
          setLoading(false);
          setPreloaderSidebar(false);
        });
    };

    console.log("🚀 Calling fetchData()");
    fetchData();
    console.log("🚀 After calling fetchData()");
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
          setLoadedData((prevData: any) => [...prevData, ...nextChunk]);
          setCurrentIndex(currentIndex + nextChunkSize);
          setChunkIndex(chunkIndex + 1);
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
      const measures = performance.getEntriesByName("mapLoadTime");
      console.log("Map load time:", measures[0].duration, "ms");
      setPreloaderMap(false);
    }
  }, [loadedData, filteredData]);

  // --------------------------------------------------------------------
  // 5. Infinite Scrolling for Sidebar via "Load More" Button
  // --------------------------------------------------------------------
  const handleLoadMore = async () => {
    const nextPage = sidebarPage + 1;
    try {
      const res = await fetch(`/api/getData?page=${nextPage}&limit=100`);
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        const newRecords = result.data.filter((item: any) => item !== null);
        console.log(`Fetched page ${nextPage}: ${newRecords.length} records`);
        setFilteredData((prev: any) => [...prev, ...newRecords]);
        setOriginalData((prev: any) => [...prev, ...newRecords]);
        setSidebarPage(nextPage);
      } else {
        console.error("Infinite scroll: API did not return valid data", result);
      }
    } catch (error) {
      console.error("Error fetching more sidebar data:", error);
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
    console.log("🔍 Frontend: Search useEffect triggered, searchQuery:", searchQuery);
    const handler = setTimeout(() => {
      console.log("🔍 Frontend: Debounce timeout triggered, searchQuery:", searchQuery);
      if (searchQuery.trim() !== "") {
        console.log("🔍 Frontend: Starting search for:", searchQuery);
        setLoading(true);
        setPreloaderSidebar(true);

        console.log("🔍 Frontend: Searching for:", searchQuery);
        fetch(`/api/searchData?page=1&limit=100&q=${encodeURIComponent(searchQuery)}&_t=${Date.now()}`)
          .then((response) => response.json())
          .then((result) => {
            console.log("🔍 Frontend: Search API response:", result);
            if (result.success && Array.isArray(result.data)) {
              console.log("🔍 Frontend: Search API returned:", result.data.length, "records");
              setFilteredData(result.data);

            } else {
              console.error("🔍 Frontend: Search API did not return valid data", result);
              setFilteredData([]); // Ensure we clear data on error
            }
          })
          .catch((error) => {
            console.error("Error fetching search data:", error);
            setFilteredData([]);
          })
          .finally(() => {
            setLoading(false);
            setPreloaderSidebar(false);
          });
      } else {
        console.log("🔍 Frontend: Search query is empty, resetting to original data");
        // If search query is empty, reset to original data
        setFilteredData(OriginalData);
      }
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(handler); // Cleanup previous timeout
  }, [searchQuery, OriginalData]);


  // --------------------------------------------------------------------
  // 7. Dropdown Filter (unchanged)
  // --------------------------------------------------------------------
  const filterByIndustryHouse = async (selectedOption: any) => {
    const selectedValue = selectedOption.value;
    console.log(selectedValue);
    setSelectedIndustry(selectedValue);
    if (selectedValue === "") {
      setFilteredData(OriginalData);
      setTotalCount(fullTotalCount); // Reset total count to full count

      return;
    }
    try {
      setPreloaderSidebar(true);
      const res = await fetch(`/api/filterData?page=1&limit=100&industryHouse=${encodeURIComponent(selectedValue)}`);
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setFilteredData(result.data);
        setTotalCount(filteredData.length);
        setPreloaderSidebar(false);
      } else {
        console.error("Filter API did not return valid data", result);
      }
    } catch (error) {
      console.error("Error fetching filtered data:", error);
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
  // 8. Render Component
  // --------------------------------------------------------------------


  // 8. Viewport-Based Lazy Loading for Map Markers
  // --------------------------------------------------------------------
  // This function gets called when the map's viewport changes.
  // This function gets called when the map's viewport changes.
  // This function gets called when the map's viewport changes.
  // const handleBoundsChange = async (bounds: LatLngBounds) => {
  //   const northEast = bounds.getNorthEast();
  //   const southWest = bounds.getSouthWest();
  //   try {
  //     const res = await fetch(
  //       `/api/getMarkers?northEastLat=${northEast.lat}&northEastLng=${northEast.lng}&southWestLat=${southWest.lat}&southWestLng=${southWest.lng}`
  //     );
  //     const result = await res.json();
  //     if (result.success) {
  //       console.log("Fetched markers based on bounds:", result.data);

  //       // Mark that lazy load has occurred
  //       setLazyLoaded(true);

  //       // Update all state variables with the full dataset
  //       setFilteredData(result.data);
  //       setOriginalData(result.data);
  //       setLoadedData(result.data); // Display all markers immediately
  //       setCurrentIndex(result.data.length);
  //       setChunkIndex(1);
  //       setChunkSizes([result.data.length]); // Disable further chunking
  //       setTotalCount(result.data.length);
  //     } else {
  //       console.error("Failed to fetch markers based on bounds", result);
  //     }
  //   } catch (error) {
  //     console.error("Error fetching markers by bounds:", error);
  //   }
  // };


  // useEffect(() => {
  //   async function bootstrapAuth() {
  //     // 0. Simple Safari detection:
  //     const ua = navigator.userAgent;
  //     const isSafari = ua.includes('Safari') && !ua.includes('Chrome');

  //     // 1) Only ask for storage access in Safari:
  //     if (isSafari && document.hasStorageAccess) {
  //       try {
  //         const has = await document.hasStorageAccess();
  //         if (!has) {
  //           await document.requestStorageAccess();
  //         }
  //       } catch (e) {
  //         console.warn('Safari storage access denied; cookie stays hidden');
  //       }
  //     }

  //     // 2) Read the cookie normally in all browsers:
  //     function getCookie(name: string): string {
  //       const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  //       return match ? decodeURIComponent(match[2]) : '';
  //     }

  //     const raw = getCookie('bsn_user_data');
  //     if (!raw) return; // still no cookie

  //     try {
  //       const userObj = JSON.parse(raw);
  //       setAuthenticatedUser(userObj);
  //       setIsAuthenticated(true);
  //       console.log(userObj, 'authenticated user data');
  //     } catch (err) {
  //       console.error('Failed to parse bsn_user_data cookie:', err);
  //     }
  //   }

  //   bootstrapAuth();
  // }, []);

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

  // Memoize map data to prevent unnecessary re-renders
  const mapData = useMemo(() => ({
    isAuthenticated,
    loadedData,
    hideCounter,
    filteredData: searchQuery === "" && selectedIndustry === "" ? mapLocations : filteredData
  }), [isAuthenticated, loadedData, hideCounter, searchQuery, selectedIndustry, mapLocations, filteredData]);

  // Memoized map component to prevent re-renders from popup state changes
  const MemoizedBsiMap = useMemo(() => (
    <BsiMap
      isAuthenticated={mapData.isAuthenticated}
      loadedData={mapData.loadedData}
      hideCounter={mapData.hideCounter}
      onMarkerHover={() => { }}
      filteredData={mapData.filteredData}
    />
  ), [mapData]);

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
      />

      <div className="mt-[110px]">
        <div className="flex sm:flex-row flex-col bg-[#FFF8E5]">
          <div className="sm:w-3/5 w-full sm:p-0 p-3 h-screen" data-tour="map-container">
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
                  {MemoizedBsiMap}
                </div>
                {/* Side target for tour */}
                <div 
                  data-tour="map-side-info"
                  style={{
                    position: 'absolute',
                    left: '45%',
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
            className="sm:w-2/5 w-full pb-4 flex flex-col justify-start items-center h-screen overflow-scroll"
            data-tour="sidebar"
          >
            <div className="bg-[#FFF8E5] py-2 sticky left-0 top-0 w-full flex flex-col items-center justify-center z-10">
              <div className="w-[95%]">
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
                <Sidebar
                  filteredData={filteredData}
                  isAuthenticated={isAuthenticated}
                  totalNumber={
                    searchQuery.trim() === "" && selectedIndustry === ""
                      ? totalCount!
                      : filteredData.length
                  }
                  loading={loading}
                  hasSearched={hasSearched}
                />
                {filteredData.length > 0 &&
                  totalCount !== null &&
                  filteredData.length < totalCount && (
                    <div className="py-4">
                      <button
                        onClick={handleLoadMore}
                        className="px-6 py-3 bg-[#FFBF23] text-black font-semibold rounded-full shadow-md hover:bg-yellow-500 transition duration-200 ease-in-out"
                      >
                        Load More
                      </button>
                    </div>
                  )}
              </>
            )}
          </div>
        </div>
      </div>

      {isPopUpActive && (
        <div 
          className="fixed w-full h-screen bg-filter left-0 -top-0 z-[9999]"
          onClick={handlePopupClose}
        >
          <div 
            className="h-full flex justify-center items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-xl md:px-10 px-2 py-7 mx-4 relative">
              <div
                className="text-lg rounded-full p-2 flex h-fit items-center cursor-pointer justify-center bg-[#EB4335] font-bold absolute right-4 top-5"
                onClick={handlePopupClose}
              >
                <icons.close />
              </div>
              <div className="flex justify-between gap-x-5 items-center">
                <div className="flex flex-col gap-y-2 justify-center items-center">
                  <Image
                    src="/png/LOGO.png"
                    alt="company logo"
                    width={286}
                    height={92}
                  />
                  <p className="md:max-w-md w-full sm:text-base text-xs text-center text-black sm:leading-[20px] leading-3">
                    Are you encountering issues viewing profile pictures?
                  </p>
                  <p className="md:max-w-md w-full sm:text-base text-xs text-center text-black sm:leading-[20px] leading-3">
                    Consider becoming a member to view our members' profile pictures.
                  </p>
                  <div className="mt-2 flex gap-x-2 justify-center items-center">
                    <button
                      onClick={() =>
                        route.push("https://www.blacksustainability.org/")
                      }
                      className="flex gap-x-2 items-center w-full sm:px-5 p-2.5 bg-[#FFBF23] rounded-full"
                    >
                      <span className="sm:block hidden">
                        <icons.signup />
                      </span>
                      <span className="text-black font-semibold sm:text-base text-sm">
                        Login / Become a Member
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <Footer />
      
      {/* Scroll Navigation Buttons - Mobile Only */}
      <div className="fixed right-4 bottom-20 z-50 flex flex-col gap-2 md:hidden">
        <button
          onClick={(e) => {
            console.log('Scroll up button clicked!');
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
            console.log('Scroll down button clicked!');
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
