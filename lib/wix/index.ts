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
export { aggregateWixAuthority } from "./aggregateWixAuthority";
export { writeWixAuthorityReports } from "./writeWixAuthorityReports";
export type {
  WixSubscriptionRaw,
  AggregatedAuthorityRow,
  UnresolvedAuthorityRow,
} from "./types";
