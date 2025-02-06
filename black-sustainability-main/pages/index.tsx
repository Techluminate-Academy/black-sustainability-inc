"use client";
import Nav from "@/components/layouts/Nav";
import Footer from "@/components/layouts/Footer";
import Sidebar from "@/components/layouts/Sidebar";
import { useEffect, useLayoutEffect, useState } from "react";
import { customStyles } from "@/components/common/CustomSelect";
import Select from "react-select";
import {Head } from "next/document";
import { IndustryHouses } from "@/utils/IndustryDetails";
import dynamic from "next/dynamic";
import icons from "@/icons";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BsiUserObjectArray } from "@/typings";
import Loader from "@/components/common/loader";

export default function Home() {
  const BsiMap = dynamic(() => import("@/components/common/LeafletMap"), {
    ssr: false,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [filteredData, setFilteredData] = useState<BsiUserObjectArray>();
  const [OriginalData, setOriginalData] = useState<BsiUserObjectArray>();
  const [authenticatedUser, setAuthenticatedUser] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPopUpActive, setIsPopUpActive] = useState(false);
  const [preloaderMap, setPreloaderMap] = useState(true);
  const [preloaderSidebar, setPreloaderSidebar] = useState(true);
  const [loadedData, setLoadedData] = useState<any>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [hideCounter, setHideCounter] = useState(false);
  // const chunkSizes = [50, 50, 200, 200, 300, 300, 500, 500, 800];
  const [chunkSizes, setChunkSizes] = useState([
    50, 50, 200, 200, 300, 300, 500, 500, 800,
  ]); // Default value

  const route = useRouter();

  useLayoutEffect(() => {
    const fetchData = async () => {
          // Mark the start of the fetch process
    performance.mark("mapFetchStart");
      setLoading(true);
      fetch("/api_data.json")
        .then((response: any) => response.json())
        .then(async (data) => {
          const filteredNullData = data.filter((data: any) => data !== null);
          // Dynamically calculate chunk sizes
       
          const totalRecords = filteredNullData.length;
          const chunkSize = Math.ceil(totalRecords / 3);
          setChunkSizes([chunkSize, chunkSize, totalRecords - 2 * chunkSize]);
          setOriginalData(filteredNullData);
          setFilteredData(filteredNullData);
        });
    };

    fetchData();
  }, []);

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
  }, [currentIndex, filteredData]);

  // INTRO POP UP
  
  useEffect(() => {
    if (isAuthenticated === false) {
      setTimeout(() => {
        if (loadedData?.length === filteredData?.length) {
          setIsPopUpActive(true);
        }
      }, 6000);
    }
  }, [loadedData]);

  useEffect(() => {
    if (loadedData.length === filteredData?.length) {
          // Mark when all chunks have loaded (and hence the map is ready)
    performance.mark("mapLoadEnd");

    // Measure the duration from the start of the fetch to the map being ready
    performance.measure("mapLoadTime", "mapFetchStart", "mapLoadEnd");
    const measures = performance.getEntriesByName("mapLoadTime");
    console.log("Map load time:", measures[0].duration, "ms");
      setPreloaderMap(false);
    }
  }, [loadedData, filteredData]);

  useEffect(() => {
    if (filteredData) {
      if (loadedData.length <= 800) {
        setPreloaderSidebar(true);
      } else {
        setPreloaderSidebar(false);
      }
    }
  }, [loadedData, filteredData]);
  // SEARCH
  useEffect(() => {
    const filtered = filteredData?.filter((profile: any) => {
      const {
        "Time zone": TimeZone,
        "State/Province": StateProvince,
        "Name (from Location)": NameFromLocation,
        State,
        "Location (Nearest City)": NearestCity,
        "FIRST NAME": Fname,
        "LAST NAME": Lname,
        "FULL NAME": Fullname,
        Country: Country,
      } = profile.fields;

      const lowerSearchTerm = searchQuery.toLowerCase();

      return (
        (TimeZone && TimeZone.toLowerCase().includes(lowerSearchTerm)) ||
        (StateProvince &&
          StateProvince.toLowerCase().includes(lowerSearchTerm)) ||
        (NameFromLocation &&
          NameFromLocation.toLowerCase().includes(lowerSearchTerm)) ||
        (State && State.toLowerCase().includes(lowerSearchTerm)) ||
        (NearestCity && NearestCity.toLowerCase().includes(lowerSearchTerm)) ||
        (Fname && Fname.toLowerCase().includes(lowerSearchTerm)) ||
        (Lname && Lname.toLowerCase().includes(lowerSearchTerm))
        // (Fullname && Fullname.toLowerCase().includes(lowerSearchTerm)) ||
        // (Country && Country.toLowerCase().includes(lowerSearchTerm))
      );
    });
    setFilteredData(filtered);
  }, [searchQuery]);

  // Dropdown filter
  const filterByIndustryHouse = (selectedOption: any) => {
    const selectedValue = selectedOption.value;

    let filtered;
    if (selectedValue === "") {
      filtered = OriginalData;
    } else {
      filtered = OriginalData?.filter(
        (item: any) => item.fields["PRIMARY INDUSTRY HOUSE"] === selectedValue
      );
    }
    setFilteredData(filtered);
  };

  useEffect(() => {
    function getCookie(cname: string) {
      let name = cname + "=";
      let decodedCookie = decodeURIComponent(document.cookie);
      let ca = decodedCookie.split(";");
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == " ") {
          c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
          return c.substring(name.length, c.length);
        }
      }
      return "";
    }

    const user = getCookie("bsn_user");
    if (user.length > 0) {
      setAuthenticatedUser(user);
      setIsAuthenticated(true);

      console.log(user, " authenticated user data");
      console.log(isAuthenticated, " is user authenticated");
    }
  }, []);

  return (
    <div className="relative h-screen w-full">
      <Nav
        isAuthenticated={isAuthenticated}
        authenticatedUser={authenticatedUser}
      />
            

      <div className="mt-[110px]">
        <div className="flex sm:flex-row flex-col bg-[#FFF8E5] ">
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
                      <p className="text-sm lg:text-sm font-medium leading-tight ">
                        Sit back while we search around the globe.
                      </p>
                      <p className="text-sm lg:text-base ">
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
          <div className="sm:w-2/5 w-full pb-4 flex flex-col justify-start items-center h-screen overflow-scroll ">
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
                  alt="loading gif"
                />
              </div>
            ) : (
              <Sidebar
                filteredData={filteredData}
                isAuthenticated={isAuthenticated}
                totalNumber={filteredData?.length}
                loading={loading}
              />
            )}
          </div>
        </div>
      </div>

      {isPopUpActive && (
        <div className="fixed w-full h-screen bg-filter left-0 -top-0 z-[9999]  ">
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
                  <p className="md:max-w-md w-full sm:text-base text-xs text-center text-black  sm:leading-[20px] leading-3">
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
