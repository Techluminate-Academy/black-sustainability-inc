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
  avatar_url?: string | null;
};

function getNetworkId(): string {
  return (process.env.MIGHTY_NETWORK_ID || "1303008").toString();
}

function getApiKey(): string {
  const v = process.env.MIGHTY_API_KEY || process.env.MIGHTY_NETWORK_API_KEY;
  if (!v) throw new Error("MIGHTY_API_KEY or MIGHTY_NETWORK_API_KEY is not configured");
  return v;
}

export type MightyCreateMemberParams = {
  email: string;
  first_name: string;
  last_name: string;
  /** Defaults to contributor per Mighty API. */
  role?: "host" | "moderator" | "contributor";
  /** Mighty defaults to true; set false for silent bulk migration. */
  send_welcome_email?: boolean;
};

export type MightyCreateMemberResult =
  | { ok: true; id: number; email: string; alreadyExisted?: boolean }
  | { ok: false; status: number; error: string };

/**
 * Create a network member via Admin API (Business / Growth / Mighty Pro).
 * @see https://docs.mightynetworks.com/api-reference/members/create-a-new-member-in-the-network
 */
export async function createMightyMember(params: MightyCreateMemberParams): Promise<MightyCreateMemberResult> {
  const apiKey = getApiKey();
  const networkId = getNetworkId();
  const url = `${getBaseUrl()}/admin/v1/networks/${encodeURIComponent(networkId)}/members`;

  const body: Record<string, unknown> = {
    email: params.email.trim().toLowerCase(),
    first_name: params.first_name.trim(),
    last_name: params.last_name.trim(),
  };
  if (params.role) body.role = params.role;
  if (typeof params.send_welcome_email === "boolean") body.send_welcome_email = params.send_welcome_email;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text().catch(() => "");
  if (res.status === 201) {
    try {
      const json = JSON.parse(text) as Record<string, unknown>;
      const member = (json.member ?? json) as Record<string, unknown>;
      const id = Number(member.id);
      if (!Number.isFinite(id)) {
        return { ok: false, status: res.status, error: "201 response missing numeric member id" };
      }
      return { ok: true, id, email: String(member.email ?? body.email) };
    } catch {
      return { ok: false, status: res.status, error: text.slice(0, 500) };
    }
  }

  // Already a member: treat as success path for idempotent bulk jobs.
  if (res.status === 422) {
    const existing = await mightyGetMemberByEmail(params.email.trim().toLowerCase());
    if (existing) {
      return { ok: true, id: existing.id, email: existing.email, alreadyExisted: true };
    }
  }

  return { ok: false, status: res.status, error: text.slice(0, 800) || res.statusText };
}

export type MightyMemberPlan = { id: number | string; name?: string };

export async function listMemberPlans(
  mightyMemberId: string | number
): Promise<MightyMemberPlan[]> {
  const apiKey = getApiKey();
  const networkId = getNetworkId();
  const memberId = String(mightyMemberId);
  const url = `${getBaseUrl()}/admin/v1/networks/${encodeURIComponent(networkId)}/members/${encodeURIComponent(memberId)}/plans`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
  });
  if (res.status === 404) return [];
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Mighty list member plans failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as Record<string, unknown>;
  const items = (json.plans ?? json.data ?? json.items ?? []) as Record<string, unknown>[];
  if (!Array.isArray(items)) return [];
  return items
    .map((p) => ({
      id: Number(p.id),
      name: typeof p.name === "string" ? p.name : undefined,
    }))
    .filter((p) => Number.isFinite(p.id));
}

export type AddMemberToPlanResult =
  | { ok: true; alreadyHadAccess?: boolean }
  | { ok: false; status: number; error: string };

/**
 * Grant plan access (typically free/non-paid plans). Paid plans may require separate billing APIs.
 * @see https://docs.mightynetworks.com/api-reference/members/add-a-member-directly-to-a-freenonpaid-plan
 */
export async function addMemberToPlan(params: {
  planId: string | number;
  mightyMemberId: string | number;
}): Promise<AddMemberToPlanResult> {
  const apiKey = getApiKey();
  const networkId = getNetworkId();
  const planId = String(params.planId);
  const memberId = String(params.mightyMemberId);
  const url = new URL(
    `${getBaseUrl()}/admin/v1/networks/${encodeURIComponent(networkId)}/plans/${encodeURIComponent(planId)}/members`
  );
  url.searchParams.set("user_id", memberId);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
  });
  const text = await res.text().catch(() => "");
  if (res.ok) return { ok: true };
  if (res.status === 422 && /already/i.test(text)) return { ok: true, alreadyHadAccess: true };
  return { ok: false, status: res.status, error: text.slice(0, 500) || res.statusText };
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

  const avatar_url =
    typeof member.avatar_url === "string"
      ? member.avatar_url
      : typeof member.avatarUrl === "string"
        ? member.avatarUrl
        : null;

  return {
    id: Number(member.id),
    email: String(member.email),
    first_name: member.first_name ?? null,
    last_name: member.last_name ?? null,
    avatar_url,
  };
}

