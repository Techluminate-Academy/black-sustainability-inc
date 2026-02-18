/**
 * Wix API integration for subscription/member data.
 * Used for Wix → Airtable automation.
 */
export {
  createWixClient,
  getWixConfig,
  hasWixApiCredentials,
  type WixClientConfig,
} from "./client";
export { fetchWixSubscriptionsFromApi } from "./fetchSubscriptions";
