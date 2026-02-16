import { readFile } from "fs/promises";
import { parse } from "csv-parse/sync";

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
