"use client";
import Nav from "@/components/layouts/Nav";
import Footer from "@/components/layouts/Footer";
import Sidebar from "@/components/layouts/Sidebar";
import { useEffect, useLayoutEffect, useState } from "react";
import { customStyles } from "@/components/common/CustomSelect";
import Select from "react-select";
import { Head } from "next/document";
import { IndustryHouses } from "@/utils/IndustryDetails";
import dynamic from "next/dynamic";
import icons from "@/icons";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BsiUserObjectArray } from "@/typings";
import { getAllRecordsFromAirtable } from "@/utils/airtable";
import Loader from "@/components/common/loader";

export default function Home() {
  const BsiMap = dynamic(() => import("@/components/common/LeafletMap"), {
    ssr: false,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [filteredData, setFilteredData] = useState<BsiUserObjectArray>([]);
  const [OriginalData, setOriginalData] = useState<BsiUserObjectArray>([]);
  const [authenticatedUser, setAuthenticatedUser] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPopUpActive, setIsPopUpActive] = useState(false);
  const [preloaderMap, setPreloaderMap] = useState(true);
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
  const [totalCount, setTotalCount] = useState(0);

  const route = useRouter();
  useEffect(() => {
    // Create mock user data and set it as a cookie
    const mockUser = {
      id: "123",
      name: "Fake User",
      email: "fakeuser@example.com",
    };
  
    const cookieValue = encodeURIComponent(JSON.stringify(mockUser));
    document.cookie = `bsn_user=${cookieValue}; path=/`;
  
    // Helper function to read a cookie by name
    const getCookie = (cname) => {
      const name = `${cname}=`;
      const decodedCookie = decodeURIComponent(document.cookie);
      const cookies = decodedCookie.split(";");
      for (let c of cookies) {
        c = c.trim();
        if (c.indexOf(name) === 0) {
          return c.substring(name.length);
        }
      }
      return "";
    };
  
    const userCookie = getCookie("bsn_user");
    if (userCookie) {
      try {
        const parsedUser = JSON.parse(userCookie);
        setAuthenticatedUser(parsedUser);
        setIsAuthenticated(true);
        console.log("Authenticated user:", parsedUser);
      } catch (error) {
        console.error("Error parsing user cookie:", error);
      }
    } else {
      console.log("No user cookie found");
    }
  }, []);
  
  // --------------------------------------------------------------------
  // 1. Initial Data Fetch for Map & Sidebar
  // --------------------------------------------------------------------
  useLayoutEffect(() => {
    const fetchData = async () => {
      performance.mark("mapFetchStart");
      setLoading(true);
      fetch("/api/getData?page=1&limit=100")
        .then((response) => response.json())
        .then(async (result) => {
          if (result.success && Array.isArray(result.data)) {
            const filteredNullData = result.data.filter((item) => item !== null);
            console.log("Filtered data count:", filteredNullData.length);
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
          } else {
            console.error("API did not return a valid data array", result);
          }
        })
        .catch((error) => {
          console.error("Error fetching data:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    };

    fetchData();
  }, []);

  // --------------------------------------------------------------------
  // 2. Progressive Chunk Loading for Map
  // --------------------------------------------------------------------
  useEffect(() => {
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
  // 4. Sidebar Loader: Hide once initial data is loaded
  // --------------------------------------------------------------------
  useEffect(() => {
    if (filteredData.length > 0) {
      setPreloaderSidebar(false);
    } else {
      setPreloaderSidebar(false); // Set to false so that Sidebar renders and shows "No results found"
    }
  }, [filteredData]);

  // --------------------------------------------------------------------
  // 5. Infinite Scrolling for Sidebar via "Load More" Button
  // --------------------------------------------------------------------
  const handleLoadMore = async () => {
    const nextPage = sidebarPage + 1;
    try {
      const res = await fetch(`/api/getData?page=${nextPage}&limit=100`);
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        const newRecords = result.data.filter((item) => item !== null);
        console.log(`Fetched page ${nextPage}: ${newRecords.length} records`);
        setFilteredData((prev) => [...prev, ...newRecords]);
        setOriginalData((prev) => [...prev, ...newRecords]);
        setSidebarPage(nextPage);
      } else {
        console.error("Infinite scroll: API did not return valid data", result);
      }
    } catch (error) {
      console.error("Error fetching more sidebar data:", error);
    }
  };

  // --------------------------------------------------------------------
  // 6. Search Filtering: Call the search API when searchQuery changes
  // --------------------------------------------------------------------
  useEffect(() => {
    if (searchQuery.trim() !== "") {
      setLoading(true);
      fetch(`/api/searchData?page=1&limit=100&q=${encodeURIComponent(searchQuery)}`)
        .then((response) => response.json())
        .then((result) => {
          if (result.success && Array.isArray(result.data)) {
            console.log("Search API returned:", result.data.length, "records");
            setFilteredData(result.data);
          } else {
            console.error("Search API did not return valid data", result);
            setFilteredData([]); // Ensure we clear data on error
          }
        })
        .catch((error) => {
          console.error("Error fetching search data:", error);
          setFilteredData([]);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // If search query is empty, reset to original data
      setFilteredData(OriginalData);
    }
  }, [searchQuery, OriginalData]);

  // --------------------------------------------------------------------
  // 7. Dropdown Filter (unchanged)
  // --------------------------------------------------------------------
  // const filterByIndustryHouse = (selectedOption: any) => {
  //   const selectedValue = selectedOption.value;
  //   let filtered;
  //   if (selectedValue === "") {
  //     filtered = OriginalData;
  //   } else {
  //     filtered = OriginalData?.filter(
  //       (item: any) => item.fields["PRIMARY INDUSTRY HOUSE"] === selectedValue
  //     );
  //   }
  //   setFilteredData(filtered);
  // };
  // const filterByIndustryHouse = async (selectedOption: any) => {
  //   const selectedValue = selectedOption.value;
  //   // When a filter is applied, fetch filtered data from the new API
  //   try {
  //     const res = await fetch(`/api/filterData?page=1&limit=100&industryHouse=${encodeURIComponent(selectedValue)}`);
  //     const result = await res.json();
  //     if (result.success && Array.isArray(result.data)) {
  //       setFilteredData(result.data);
  //     } else {
  //       console.error("Filter API did not return valid data", result);
  //     }
  //   } catch (error) {
  //     console.error("Error fetching filtered data:", error);
  //   }
  // };
  
  const filterByIndustryHouse = async (selectedOption: any) => {
    const selectedValue = selectedOption.value;
    console.log(selectedValue)
    setSelectedIndustry(selectedValue);
    if (selectedValue === "") {
      setFilteredData(OriginalData);
      setTotalCount(fullTotalCount); // Reset total count to full count

      return;
    }
    try {
      const res = await fetch(`/api/filterData?page=1&limit=100&industryHouse=${encodeURIComponent(selectedValue)}`);
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setFilteredData(result.data);
        setTotalCount(filteredData.length);
      } else {
        console.error("Filter API did not return valid data", result);
      }
    } catch (error) {
      console.error("Error fetching filtered data:", error);
    }
  };
  // --------------------------------------------------------------------
  // 8. Render Component
  // --------------------------------------------------------------------
  return (
    <div className="relative h-screen w-full">
      <Nav
        isAuthenticated={isAuthenticated}
        authenticatedUser={authenticatedUser}
      />

      <div className="mt-[110px]">
        <div className="flex sm:flex-row flex-col bg-[#FFF8E5]">
          <div className="sm:w-3/5 w-full sm:p-0 p-3 h-screen">
            {preloaderMap ? (
              <div className="relative w-full h-screen">
                <Image src="/png/mapbg2.png" fill alt="map one" />
                <div className="absolute top-[45%] left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="font-lexend flex flex-col gap-y-2 justify-center items-center glass rounded-[30px] text-center px-10 py-5">
                    <Image
                      src="/png/LOGO.png"
                      alt="company logo"
                      width={266}
                      height={82}
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
                        We've found {loadedData.length} so far!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <BsiMap
                isAuthenticated={isAuthenticated}
                filteredData={filteredData}
                loadedData={loadedData}
                hideCounter={hideCounter}
              />
            )}
          </div>
          <div className="sm:w-2/5 w-full pb-4 flex flex-col justify-start items-center h-screen overflow-scroll">
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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white border outline-none w-full px-5 py-2 rounded-full text-sm placeholder:capitalize placeholder:text-xs"
                  placeholder="Search by City, State, Country and Country Abbreviation"
                />
                <span className="absolute right-4 top-3">
                  <icons.search />
                </span>
              </div>
            </div>

            {preloaderSidebar ? (
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
                      ? totalCount
                      : filteredData.length
                  }
                  loading={loading}
                />
                {/* Load More Button */}
                {filteredData.length < totalCount && (
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
        <div className="fixed w-full h-screen bg-filter left-0 -top-0 z-[9999]">
          <div className="h-full flex justify-center items-center">
            <div className="bg-white rounded-xl md:px-10 px-2 py-7 mx-4 relative">
              <div
                className="text-lg rounded-full p-2 flex h-fit items-center cursor-pointer justify-center bg-[#EB4335] font-bold absolute right-4 top-5"
                onClick={() => setIsPopUpActive(false)}
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
                    Consider becoming a member to view our members' profile
                    pictures.
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
    </div>
  );
}
