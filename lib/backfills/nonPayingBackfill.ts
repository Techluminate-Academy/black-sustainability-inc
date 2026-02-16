const EMAILS = [
  "dwight23@eclipsestash.com",
  "bgeknoxhub@gmail.com",
  "ronaldpullin@gmail.com",
  "mezu@infinityvillagelab.org",
  "njones@aaacdfi.org",
  "david@highlevelr.com",
  "kenley1.herbert@famu.edu",
  "kelyceb123@gmail.com",
  "music@boundlessgratitude.com",
  "libertyroadcdc@gmail.com",
] as const;

const EMAIL_FIELD = "EMAIL ADDRESS";
const PAYING_FIELD = "Paying Member (keep current)";
const NEED_PAYMENT_FIELD = "Send Need Payment Email";
const MAX_RETRIES_429 = 2;

type AirtableRecord = { id: string; fields: Record<string, unknown> };
type AirtableListResponse = { records: AirtableRecord[]; offset?: string };

export type BackfillUpdated = {
  email: string;
  recordId: string;
  before: { paying: boolean; needPaymentEmail: boolean };
  after: { paying: boolean; needPaymentEmail: boolean };
};

export type BackfillCreated = {
  email: string;
  recordId: string;
};

export type BackfillReport = {
  timestamp: string;
  dryRun: boolean;
  createIfMissing: boolean;
  totalEmails: number;
  updatedCount: number;
  createdCount: number;
  missingCount: number;
  duplicateCount: number;
  errorsCount: number;
  updated: BackfillUpdated[];
  created: BackfillCreated[];
  missing: string[];
  duplicates: Array<{ email: string; recordIds: string[] }>;
  errors: Array<{ email: string; message: string }>;
};

const ENV_FALLBACKS: Record<string, string[]> = {
  AIRTABLE_API_KEY: ["NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN"],
  AIRTABLE_BASE_ID: ["NEXT_PUBLIC_AIRTABLE_BASE_ID"],
  AIRTABLE_TABLE_ID: ["NEXT_PUBLIC_AIRTABLE_TABLE_NAME", "AIRTABLE_TABLE_NAME"],
};

function getEnv(name: string): string {
  let val = process.env[name]?.trim();
  if (!val && ENV_FALLBACKS[name]) {
    for (const fallback of ENV_FALLBACKS[name]) {
      val = process.env[fallback]?.trim();
      if (val) break;
    }
  }
  if (!val) throw new Error(`Missing env: ${name} (or ${ENV_FALLBACKS[name]?.join(", ") ?? "none"})`);
  return val;
}

function formulaForEmail(email: string): string {
  const escaped = email.replace(/'/g, "''");
  return `LOWER({${EMAIL_FIELD}}) = '${escaped.toLowerCase()}'`;
}

async function fetchWithRetry(
  url: string,
  apiKey: string,
  retriesLeft = MAX_RETRIES_429
): Promise<Response> {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });
  if (res.status === 429 && retriesLeft > 0) {
    const retryAfter = res.headers.get("Retry-After");
    const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : 2000;
    await new Promise((r) => setTimeout(r, delay));
    return fetchWithRetry(url, apiKey, retriesLeft - 1);
  }
  return res;
}

async function findRecordsByEmail(
  apiKey: string,
  baseId: string,
  tableId: string,
  email: string
): Promise<AirtableRecord[]> {
  const formula = encodeURIComponent(formulaForEmail(email));
  const url = `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(tableId)}?filterByFormula=${formula}&pageSize=10`;
  const res = await fetchWithRetry(url, apiKey);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable ${res.status}: ${text}`);
  }
  const data = (await res.json()) as AirtableListResponse;
  return data.records ?? [];
}

async function patchRecord(
  apiKey: string,
  baseId: string,
  tableId: string,
  recordId: string,
  fields: Record<string, unknown>,
  retriesLeft = MAX_RETRIES_429
): Promise<void> {
  const url = `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(tableId)}/${encodeURIComponent(recordId)}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
  if (res.status === 429 && retriesLeft > 0) {
    const retryAfter = res.headers.get("Retry-After");
    const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : 2000;
    await new Promise((r) => setTimeout(r, delay));
    return patchRecord(apiKey, baseId, tableId, recordId, fields, retriesLeft - 1);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable PATCH ${res.status}: ${text}`);
  }
}

async function createRecord(
  apiKey: string,
  baseId: string,
  tableId: string,
  email: string,
  retriesLeft = MAX_RETRIES_429
): Promise<string> {
  const url = `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(tableId)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        [EMAIL_FIELD]: email,
        [PAYING_FIELD]: false,
        [NEED_PAYMENT_FIELD]: true,
      },
    }),
  });
  if (res.status === 429 && retriesLeft > 0) {
    const retryAfter = res.headers.get("Retry-After");
    const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : 2000;
    await new Promise((r) => setTimeout(r, delay));
    return createRecord(apiKey, baseId, tableId, email, retriesLeft - 1);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable POST ${res.status}: ${text}`);
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

function getPaying(fields: Record<string, unknown>): boolean {
  return Boolean(fields[PAYING_FIELD]);
}

function getNeedPaymentEmail(fields: Record<string, unknown>): boolean {
  return Boolean(fields[NEED_PAYMENT_FIELD]);
}

export async function runNonPayingBackfill(options: {
  dryRun: boolean;
  createIfMissing?: boolean;
}): Promise<BackfillReport> {
  const dryRun = options.dryRun ?? true;
  const createIfMissing = options.createIfMissing ?? false;
  const apiKey = getEnv("AIRTABLE_API_KEY");
  const baseId = getEnv("AIRTABLE_BASE_ID");
  const tableId = getEnv("AIRTABLE_TABLE_ID");

  const report: BackfillReport = {
    timestamp: new Date().toISOString(),
    dryRun,
    createIfMissing,
    totalEmails: EMAILS.length,
    updatedCount: 0,
    createdCount: 0,
    missingCount: 0,
    duplicateCount: 0,
    errorsCount: 0,
    updated: [],
    created: [],
    missing: [],
    duplicates: [],
    errors: [],
  };

  for (const email of EMAILS) {
    try {
      const records = await findRecordsByEmail(apiKey, baseId, tableId, email);

      if (records.length === 0) {
        if (createIfMissing && !dryRun) {
          const recordId = await createRecord(apiKey, baseId, tableId, email);
          report.created.push({ email, recordId });
          report.createdCount++;
        } else {
          report.missing.push(email);
          report.missingCount++;
        }
        continue;
      }

      if (records.length > 1) {
        report.duplicates.push({
          email,
          recordIds: records.map((r) => r.id),
        });
        report.duplicateCount++;
        continue;
      }

      const rec = records[0];
      const before = {
        paying: getPaying(rec.fields),
        needPaymentEmail: getNeedPaymentEmail(rec.fields),
      };
      const after = { paying: false, needPaymentEmail: true };

      if (!dryRun) {
        await patchRecord(apiKey, baseId, tableId, rec.id, {
          [PAYING_FIELD]: false,
          [NEED_PAYMENT_FIELD]: true,
        });
      }

      report.updated.push({
        email,
        recordId: rec.id,
        before,
        after,
      });
      report.updatedCount++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      report.errors.push({ email, message });
      report.errorsCount++;
    }
  }

  console.log(
    `[nonPayingBackfill] dryRun=${dryRun} createIfMissing=${createIfMissing} updated=${report.updatedCount} created=${report.createdCount} missing=${report.missingCount} duplicates=${report.duplicateCount} errors=${report.errorsCount}`
  );
  return report;
}
