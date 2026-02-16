export type AirtableRecord = {
  id: string;
  fields: Record<string, unknown>;
};

export type FetchAirtableRecordsOpts = {
  apiKey: string;
  baseId: string;
  table: string;
  view?: string;
  maxRecords?: number;
};

type AirtableApiResponse = {
  records: Array<{ id: string; fields: Record<string, unknown> }>;
  offset?: string;
};

export async function fetchAirtableRecords(
  opts: FetchAirtableRecordsOpts
): Promise<AirtableRecord[]> {
  const { apiKey, baseId, table, view, maxRecords = 10 } = opts;

  const limit = maxRecords ?? 10;
  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(
      `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(table)}`
    );
    if (view) {
      url.searchParams.set("view", view);
    }
    url.searchParams.set("maxRecords", String(limit));
    if (offset) {
      url.searchParams.set("offset", offset);
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Airtable API error ${res.status}: ${res.statusText}. ${text}`
      );
    }

    const data = (await res.json()) as AirtableApiResponse;

    for (const rec of data.records) {
      allRecords.push({ id: rec.id, fields: rec.fields });
      if (allRecords.length >= limit) break;
    }

    offset = data.offset;
  } while (offset != null && allRecords.length < limit);

  return allRecords.slice(0, limit);
}

export type AirtableMember = {
  id: string;
  email: string | null;
  paying: boolean;
  equity: boolean;
  needPaymentEmail?: boolean;
};

const EMAIL_FIELD = "EMAIL ADDRESS";
const NEED_PAYMENT_FIELD = "Send Need Payment Email";
const FULL_NAME_FIELD = "FULL NAME";
const MEMBER_LEVEL_FIELD = "MEMBER LEVEL";
const PAYING_FIELD = "Paying Member (keep current)";
const EQUITY_FIELD = "Equity Member (keep current)";

export type FetchAllFromViewOpts = {
  apiKey: string;
  baseId: string;
  tableId: string;
  viewId: string;
};

export async function fetchAllFromView(
  opts: FetchAllFromViewOpts
): Promise<AirtableMember[]> {
  const { apiKey, baseId, tableId, viewId } = opts;
  const allRecords: AirtableMember[] = [];
  let offset: string | undefined;
  const pageSize = 100;

  do {
    const url = new URL(
      `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(tableId)}`
    );
    url.searchParams.set("view", viewId);
    url.searchParams.set("pageSize", String(pageSize));
    if (offset) {
      url.searchParams.set("offset", offset);
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Airtable API error ${res.status}: ${res.statusText}. ${text}`
      );
    }

    const data = (await res.json()) as AirtableApiResponse;

    for (const rec of data.records) {
      const rawEmail = rec.fields[EMAIL_FIELD];
      const email =
        typeof rawEmail === "string" ? rawEmail.trim() || null : null;
      const rawPaying = rec.fields[PAYING_FIELD];
      const paying = Boolean(rawPaying);
      const rawEquity = rec.fields[EQUITY_FIELD];
      const equity = Boolean(rawEquity);
      const rawNeedPayment = rec.fields[NEED_PAYMENT_FIELD];
      const needPaymentEmail = Boolean(rawNeedPayment);
      allRecords.push({
        id: rec.id,
        email,
        paying,
        equity,
        needPaymentEmail,
      });
    }

    offset = data.offset;
  } while (offset != null);

  return allRecords;
}

export type PatchPayingMemberOpts = {
  apiKey: string;
  baseId: string;
  tableId: string;
  recordId: string;
  paying: boolean;
};

export async function patchPayingMember(
  opts: PatchPayingMemberOpts
): Promise<void> {
  const { apiKey, baseId, tableId, recordId, paying } = opts;
  const url = `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(tableId)}/${encodeURIComponent(recordId)}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: { [PAYING_FIELD]: paying },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Airtable PATCH error ${res.status}: ${res.statusText}. ${text}`
    );
  }
}

export type CreateAirtableMemberOpts = {
  apiKey: string;
  baseId: string;
  tableId: string;
  email: string;
  fullName?: string;
  memberLevel?: string;
  paying: boolean;
};

export async function createAirtableMember(
  opts: CreateAirtableMemberOpts
): Promise<string> {
  const { apiKey, baseId, tableId, email, paying } = opts;
  const fields: Record<string, unknown> = {
    [EMAIL_FIELD]: email,
    [PAYING_FIELD]: paying,
  };

  const url = `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(tableId)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Airtable POST error ${res.status}: ${res.statusText}. ${text}`
    );
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}
