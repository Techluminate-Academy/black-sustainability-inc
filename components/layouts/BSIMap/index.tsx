import { APIProvider, Map } from "@vis.gl/react-google-maps";

import Marker from "../../common/BSIMarker";

interface IProps {
  filteredData: any;
  searchLocation?: google.maps.LatLngLiteral;
  isAuthenticated: boolean;
}

const BMap: React.FC<IProps> = ({ filteredData, isAuthenticated }) => {
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error("Google Maps API key is not provided");
  }

  return (
    <div className="">
      {/* MAP  */}
      <div
        style={{
          position: "relative",
          height: "100vh",
          width: "100%",
          marginTop: "10px",
        }}
      >
        <APIProvider
          apiKey={GOOGLE_MAPS_API_KEY}
          libraries={["places"]}
        >
          <Map
            clickableIcons={true}
            defaultZoom={7}
            mapId={process.env.NEXT_PUBLIC_MAP1D}
            minZoom={2}
            defaultCenter={{ lat: 33.5186, lng: -86.8104 }}
          >
            <Marker
              points={filteredData}
              isAuthenticated={isAuthenticated}
            />
          </Map>
        </APIProvider>
      </div>
    </div>
  );
};

export default BMap;
