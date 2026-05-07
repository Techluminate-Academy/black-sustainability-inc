type MightyAdminMember = Record<string, any>;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}

function getBaseUrl(): string {
  // Allow override in case Mighty changes domains/paths.
  // Admin API lives under api.mn.co (www.mightynetworks.com will 404).
  return (process.env.MIGHTY_ADMIN_API_BASE_URL || "https://api.mn.co").replace(/\/$/, "");
}

export async function fetchMightyMemberById(mightyMemberId: string | number): Promise<MightyAdminMember> {
  // Allow both env var names (matches `mightyGetMemberByEmail`)
  const apiKey = getApiKey();
  const networkId = getNetworkId();

  const memberId = String(mightyMemberId);
  const url = `${getBaseUrl()}/admin/v1/networks/${encodeURIComponent(networkId)}/members/${encodeURIComponent(memberId)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Mighty Admin API member fetch failed (${res.status}): ${text || res.statusText}`);
  }

  return (await res.json()) as MightyAdminMember;
}

export async function updateMightyMemberLocation(params: {
  mightyMemberId: string | number;
  location: string;
}): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const apiKey = getApiKey();
  const networkId = getNetworkId();

  const memberId = String(params.mightyMemberId);
  const url = `${getBaseUrl()}/admin/v1/networks/${encodeURIComponent(networkId)}/members/${encodeURIComponent(memberId)}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    // Mighty Admin API expects partial fields at the top-level (not nested under `member`).
    body: JSON.stringify({ location: params.location }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return {
      ok: false,
      status: res.status,
      message: text || res.statusText,
    };
  }

  return { ok: true };
}

export async function upsertMightyCustomFieldAnswer(params: {
  customFieldId: string | number;
  mightyMemberId: string | number;
  text: string;
}): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const apiKey = getApiKey();
  const networkId = getNetworkId();

  const customFieldId = String(params.customFieldId);
  const memberId = String(params.mightyMemberId);

  const url = `${getBaseUrl()}/admin/v1/networks/${encodeURIComponent(networkId)}/custom_fields/${encodeURIComponent(customFieldId)}/members/${encodeURIComponent(memberId)}/answers`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ text: params.text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, status: res.status, message: body || res.statusText };
  }
  return { ok: true };
}

export type MightyMember = {
  id: number;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
};

function getNetworkId(): string {
  return (process.env.MIGHTY_NETWORK_ID || "1303008").toString();
}

function getApiKey(): string {
  const v = process.env.MIGHTY_API_KEY || process.env.MIGHTY_NETWORK_API_KEY;
  if (!v) throw new Error("MIGHTY_API_KEY or MIGHTY_NETWORK_API_KEY is not configured");
  return v;
}

export async function mightyGetMemberByEmail(
  email: string
): Promise<MightyMember | null> {
  const networkId = getNetworkId();
  const apiKey = process.env.MIGHTY_API_KEY || process.env.MIGHTY_NETWORK_API_KEY;
  if (!apiKey) throw new Error("MIGHTY_API_KEY is not configured");

  const url = new URL(
    `https://api.mn.co/admin/v1/networks/${networkId}/members/by_email`
  );
  url.searchParams.set("email", email);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Mighty API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as any;
  const member = json?.member || json?.item || json;
  if (!member?.email) return null;

  return {
    id: Number(member.id),
    email: String(member.email),
    first_name: member.first_name ?? null,
    last_name: member.last_name ?? null,
  };
}

