/**
 * Wix API client for server-side admin operations.
 * Uses API key authentication for subscription/member data.
 *
 * Required env vars (from site owner's account):
 *   WIX_API_KEY
 *   WIX_SITE_ID
 *   WIX_ACCOUNT_ID
 */
import { createClient, ApiKeyStrategy } from "@wix/sdk";
import { orders } from "@wix/pricing-plans";
import { members } from "@wix/members";

export type WixClientConfig = {
  apiKey: string;
  siteId: string;
  accountId: string;
};

/**
 * Check if Wix API credentials are configured.
 */
export function hasWixApiCredentials(): boolean {
  const apiKey = process.env.WIX_API_KEY?.trim();
  const siteId = process.env.WIX_SITE_ID?.trim();
  const accountId = process.env.WIX_ACCOUNT_ID?.trim();
  return !!(apiKey && siteId && accountId);
}

/**
 * Get Wix client config from environment variables.
 * Returns null if any required variable is missing.
 */
export function getWixConfig(): WixClientConfig | null {
  const apiKey = process.env.WIX_API_KEY?.trim();
  const siteId = process.env.WIX_SITE_ID?.trim();
  const accountId = process.env.WIX_ACCOUNT_ID?.trim();

  if (!apiKey || !siteId || !accountId) {
    return null;
  }

  return { apiKey, siteId, accountId };
}

/**
 * Create a Wix SDK client for admin operations (orders, members).
 * Throws if credentials are not configured.
 */
export function createWixClient(): ReturnType<typeof createClient> {
  const config = getWixConfig();
  if (!config) {
    throw new Error(
      "Wix API credentials not configured. Set WIX_API_KEY, WIX_SITE_ID, and WIX_ACCOUNT_ID in your environment."
    );
  }

  return createClient({
    auth: ApiKeyStrategy({
      apiKey: config.apiKey,
      siteId: config.siteId,
      accountId: config.accountId,
    }),
    modules: {
      orders,
      members,
    },
  });
}
