import axios from "axios";

/**
 * Geocode an address from { country, city, zip } using the Google Geocoding API.
 *
 * @param {string} country
 * @param {string} city
 * @param {string|number} zip
 * @param {string} apiKey - Your Google Maps API key
 *
 * @return {Promise<{ lat: number, lng: number } | null>} lat/lng or null if not found
 */
export async function geocodeAddress(country, city, zip, apiKey) {
  try {
    // Construct address string, e.g. "Chicago, 60628, United States"
    const addressString = `${city}, ${zip}, ${country}`;
    const encoded = encodeURIComponent(addressString);

    // Geocoding endpoint with your key
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${apiKey}`;

    // Make the request
    const response = await axios.get(url);

    // Check status
    if (response.data.status === "OK" && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    } else {
      // Could be ZERO_RESULTS, OVER_DAILY_LIMIT, etc.
      console.warn("Geocoding error:", response.data.status);
      return null;
    }
  } catch (error) {
    console.error("Failed to geocode address:", error.message);
    return null;
  }
}
