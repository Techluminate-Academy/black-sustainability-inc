import { readFile } from "fs/promises";
import { parse } from "csv-parse/sync";
import { hasWixApiCredentials } from "../wix/client";
import { fetchWixSubscriptionsFromApi } from "../wix/fetchSubscriptions";

const REQUIRED_COLUMNS = [
  "email",
  "subscription_status",
  "last_payment_status",
] as const;

export type WixSubscription = {
  email: string;
  subscriptionStatus: string;
  lastPaymentStatus: string;
  customerName?: string;
  plan?: string;
};

function normalizeEmail(raw: unknown): string {
  if (typeof raw !== "string") {
    throw new Error(
      `Invalid email: expected string, got ${typeof raw} (value: ${JSON.stringify(raw)})`
    );
  }
  const normalized = raw.trim().toLowerCase();
  if (!normalized.includes("@")) {
    throw new Error(`Invalid email: missing "@" (value: ${JSON.stringify(raw)})`);
  }
  return normalized;
}

export async function loadWixSubscriptions(
  filePath: string
): Promise<WixSubscription[]> {
  let content: string;
  try {
    content = await readFile(filePath, "utf-8");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Cannot read Wix authority file at "${filePath}": ${msg}`);
  }

  if (!content || content.trim().length === 0) {
    throw new Error(`Wix authority file is empty: ${filePath}`);
  }

  let records: Record<string, string>[];
  try {
    records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      trim: true,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid CSV in Wix authority file: ${msg}`);
  }

  if (!Array.isArray(records) || records.length === 0) {
    throw new Error(`Wix authority file has no data rows: ${filePath}`);
  }

  const headers = Object.keys(records[0]!);
  const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
  if (missing.length > 0) {
    throw new Error(
      `Wix authority CSV missing required columns: ${missing.join(", ")}. Found: ${headers.join(", ")}`
    );
  }

  const result: WixSubscription[] = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i]!;
    const rowNum = i + 2;

    const rawEmail = row.email;
    if (rawEmail === undefined) {
      throw new Error(`Row ${rowNum}: missing "email" column value`);
    }

    let email: string;
    try {
      email = normalizeEmail(rawEmail);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Row ${rowNum}: ${msg}`);
    }

    const subscriptionStatus = row.subscription_status ?? "";
    const lastPaymentStatus = row.last_payment_status ?? "";
    const customerName = row.customer_name?.trim();
    const plan = row.plan?.trim();

    result.push({
      email,
      subscriptionStatus: subscriptionStatus.trim(),
      lastPaymentStatus: lastPaymentStatus.trim(),
      customerName: customerName || undefined,
      plan: plan || undefined,
    });
  }

  return result;
}

export type WixSubscriptionSource = "api" | "csv";

export type LoadWixSubscriptionsOptions = {
  /**
   * CSV file path. Required when using CSV source, or as fallback when API fails.
   */
  csvPath?: string;
  /**
   * If true, prefer API when credentials are set; otherwise always use CSV.
   * @default true
   */
  preferApi?: boolean;
};

/**
 * Load Wix subscriptions from API (when credentials available) or CSV.
 * Tries API first when preferApi=true and WIX_* env vars are set.
 * Falls back to CSV on API failure or when credentials are missing.
 *
 * @param options.csvPath - Path to CSV file (required for CSV fallback)
 * @param options.preferApi - Use API when credentials available (default: true)
 * @returns subscriptions and the source used ("api" | "csv")
 */
export async function loadWixSubscriptionsFromSource(
  options: LoadWixSubscriptionsOptions
): Promise<{ subscriptions: WixSubscription[]; source: WixSubscriptionSource }> {
  const { csvPath, preferApi = true } = options;

  if (preferApi && hasWixApiCredentials()) {
    try {
      const { subscriptions } = await fetchWixSubscriptionsFromApi();
      return { subscriptions, source: "api" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`Wix API fetch failed (${msg}), falling back to CSV`);
    }
  }

  if (!csvPath) {
    throw new Error(
      "No CSV path provided and Wix API unavailable. Set WIX_API_KEY, WIX_SITE_ID, WIX_ACCOUNT_ID, or pass csvPath."
    );
  }

  const subscriptions = await loadWixSubscriptions(csvPath);
  return { subscriptions, source: "csv" };
}
