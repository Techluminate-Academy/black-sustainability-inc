import axios from "axios";

export async function geocodeAddress(address: string) {
  try {
    const response = await axios.get(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}`
    );
    if (response.data && response.data.features && response.data.features.length > 0) {
      const { geometry } = response.data.features[0];
      const { coordinates } = geometry;
      const [lon, lat] = coordinates;
    
      return { lat, lng: lon }; // return lat and lng keys consistently
    } else {
      throw new Error("No results found for the provided address.");
    }
  } catch (error) {
    throw new Error("Error geocoding the address.");
  }
}

