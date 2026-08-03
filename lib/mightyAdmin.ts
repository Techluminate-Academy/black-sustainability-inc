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
  const url = `${getBaseUrl()}/admin/v1/networks/${encodeURIComponent(networkId)}/members/${encodeURIComponent(memberId)}/`;

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

/**
 * Remove a Mighty member by ID. Intended for explicitly authorized test-data
 * cleanup; callers must independently ensure the ID belongs to their test.
 */
export async function deleteMightyMember(
  mightyMemberId: string | number
): Promise<{ deleted: boolean; status: number; error?: string }> {
  const apiKey = getApiKey();
  const networkId = getNetworkId();
  const memberId = String(mightyMemberId);
  const url = `${getBaseUrl()}/admin/v1/networks/${encodeURIComponent(networkId)}/members/${encodeURIComponent(memberId)}/`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (res.ok) return { deleted: true, status: res.status };
  const text = await res.text().catch(() => "");
  return { deleted: false, status: res.status, error: text || res.statusText };
}

/** Fields allowed on PUT /members/{id}/ per Mighty Admin API (MemberUpdateRequest). */
export type MightyMemberProfilePatch = {
  first_name?: string;
  last_name?: string;
};

export async function patchMightyMemberProfile(params: {
  mightyMemberId: string | number;
  patch: MightyMemberProfilePatch;
}): Promise<
  | { ok: true; member: MightyAdminMember }
  | { ok: false; status: number; message: string }
> {
  const apiKey = getApiKey();
  const networkId = getNetworkId();
  const memberId = String(params.mightyMemberId);
  const url = `${getBaseUrl()}/admin/v1/networks/${encodeURIComponent(networkId)}/members/${encodeURIComponent(memberId)}`;

  const body: MightyMemberProfilePatch = {};
  if (typeof params.patch.first_name === "string") body.first_name = params.patch.first_name;
  if (typeof params.patch.last_name === "string") body.last_name = params.patch.last_name;

  if (!Object.keys(body).length) {
    return { ok: false, status: 400, message: "No profile fields to update" };
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  let res = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });

  // Some Mighty deployments accept PUT for partial profile updates but not PATCH.
  if (res.status === 405 || res.status === 404) {
    res = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });
  }

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    return { ok: false, status: res.status, message: text || res.statusText };
  }

  try {
    const json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    const member = (json.member ?? json) as MightyAdminMember;
    return { ok: true, member };
  } catch {
    const member = await fetchMightyMemberById(memberId);
    return { ok: true, member };
  }
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

export type MightyCustomFieldReadResult = {
  /** GET succeeded; member has at least one answer row (text may be blank). */
  loaded: boolean;
  /** Trimmed text, or null when loaded but blank. */
  text: string | null;
};

function latestCustomFieldAnswerItem(
  items: Record<string, unknown>[]
): Record<string, unknown> | null {
  if (!items.length) return null;
  if (items.length === 1) return items[0] ?? null;
  return items.reduce((latest, item) => {
    const latestAt = String(latest.updated_at ?? latest.last_edited_at ?? "");
    const itemAt = String(item.updated_at ?? item.last_edited_at ?? "");
    return itemAt >= latestAt ? item : latest;
  });
}

/** Latest text answer for a member on a network custom field (GET answers). */
export async function readMightyCustomFieldAnswer(params: {
  customFieldId: string | number;
  mightyMemberId: string | number;
}): Promise<MightyCustomFieldReadResult | null> {
  const apiKey = getApiKey();
  const networkId = getNetworkId();
  const customFieldId = String(params.customFieldId);
  const memberId = String(params.mightyMemberId);
  const url = `${getBaseUrl()}/admin/v1/networks/${encodeURIComponent(networkId)}/custom_fields/${encodeURIComponent(customFieldId)}/members/${encodeURIComponent(memberId)}/answers`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) return null;

  try {
    const json = (await res.json()) as Record<string, unknown>;
    const items = (json.items ?? json.data ?? []) as Record<string, unknown>[];
    if (!Array.isArray(items) || !items.length) {
      return { loaded: false, text: null };
    }
    const row = latestCustomFieldAnswerItem(items);
    if (!row) return { loaded: false, text: null };
    const text = row.text;
    if (typeof text !== "string") return { loaded: true, text: null };
    const t = text.trim();
    return { loaded: true, text: t.length ? t : null };
  } catch {
    return null;
  }
}

/** Non-empty Extended Bio / custom-field text only (null when unset or API error). */
export async function getMightyCustomFieldAnswerText(params: {
  customFieldId: string | number;
  mightyMemberId: string | number;
}): Promise<string | null> {
  const read = await readMightyCustomFieldAnswer(params);
  if (!read?.loaded) return null;
  return read.text;
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

/** Lightweight member row from the paginated Admin list endpoint (discovery only). */
export type MightyMemberListMetadata = {
  mightyId: number;
  email: string | null;
  updatedAt: string | null;
};

/**
 * Page through GET /members and keep only id / email / updated_at for delta sync.
 * Stops when a page returns zero items (Mighty may still advertise a next link).
 */
export async function listMightyMemberMetadata(opts?: {
  perPage?: number;
  maxPages?: number;
  onPage?: (info: { page: number; count: number; totalSoFar: number }) => void;
}): Promise<MightyMemberListMetadata[]> {
  const apiKey = getApiKey();
  const networkId = getNetworkId();
  const perPage = Math.min(100, Math.max(1, opts?.perPage ?? 100));
  const maxPages = Math.max(1, opts?.maxPages ?? 200);
  const out: MightyMemberListMetadata[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const url = `${getBaseUrl()}/admin/v1/networks/${encodeURIComponent(
      networkId
    )}/members?per_page=${perPage}&page=${page}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Mighty Admin API members list failed (${res.status}): ${text || res.statusText}`
      );
    }

    const data = (await res.json()) as { items?: Record<string, unknown>[] };
    const items = Array.isArray(data.items) ? data.items : [];
    opts?.onPage?.({ page, count: items.length, totalSoFar: out.length + items.length });
    if (!items.length) break;

    for (const item of items) {
      const idRaw = item.id;
      const mightyId =
        typeof idRaw === "number"
          ? idRaw
          : typeof idRaw === "string" && idRaw.trim()
            ? Number(idRaw)
            : NaN;
      if (!Number.isFinite(mightyId)) continue;
      const email =
        typeof item.email === "string" && item.email.trim()
          ? item.email.trim().toLowerCase()
          : null;
      const updatedAt =
        typeof item.updated_at === "string" && item.updated_at.trim()
          ? item.updated_at.trim()
          : null;
      out.push({ mightyId, email, updatedAt });
    }
  }

  return out;
}

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

export type MightyAvatarUploadResult =
  | { ok: true; url: string }
  | { ok: false; status: number; error: string };

/**
 * Upload image bytes as a Mighty member avatar asset.
 * @see https://docs.mightynetworks.com/api-reference/assets/upload-a-new-asset-image-or-file
 */
export async function uploadMightyAvatarAsset(params: {
  imageBytes: Buffer | Uint8Array;
  filename: string;
  contentType?: string;
}): Promise<MightyAvatarUploadResult> {
  const apiKey = getApiKey();
  const networkId = getNetworkId();
  const url = `${getBaseUrl()}/admin/v1/networks/${encodeURIComponent(networkId)}/assets`;

  const contentType = params.contentType || "image/jpeg";
  const blob = new Blob([params.imageBytes], { type: contentType });
  const form = new FormData();
  form.append("asset_style", "avatar");
  form.append("asset_file", blob, params.filename);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    body: form,
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    return { ok: false, status: res.status, error: text.slice(0, 800) || res.statusText };
  }

  try {
    const json = JSON.parse(text) as Record<string, unknown>;
    const asset = (json.asset ?? json) as Record<string, unknown>;
    const candidates = [
      asset.url,
      asset.asset_url,
      asset.public_url,
      (asset.file as Record<string, unknown> | undefined)?.url,
    ];
    for (const c of candidates) {
      if (typeof c === "string" && c.trim().length > 0) {
        return { ok: true, url: c.trim() };
      }
    }
    return { ok: false, status: res.status, error: "Asset upload succeeded but no URL in response" };
  } catch {
    return { ok: false, status: res.status, error: text.slice(0, 800) || "Invalid JSON from asset upload" };
  }
}

export type MightyMemberAvatarUpdateResult =
  | { ok: true; member: MightyAdminMember }
  | { ok: false; status: number; message: string };

/** Assign an uploaded asset URL to a member's Mighty profile avatar. */
export async function updateMightyMemberAvatar(params: {
  mightyMemberId: string | number;
  avatarUrl: string;
}): Promise<MightyMemberAvatarUpdateResult> {
  const apiKey = getApiKey();
  const networkId = getNetworkId();
  const memberId = String(params.mightyMemberId);
  const url = `${getBaseUrl()}/admin/v1/networks/${encodeURIComponent(networkId)}/members/${encodeURIComponent(memberId)}`;
  const avatar = params.avatarUrl.trim();

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const bodies: Record<string, unknown>[] = [{ avatar }, { avatar_url: avatar }];

  for (const body of bodies) {
    let res = await fetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });
    if (res.status === 405 || res.status === 404) {
      res = await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
      });
    }

    const text = await res.text().catch(() => "");
    if (res.ok) {
      try {
        const json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
        const member = (json.member ?? json) as MightyAdminMember;
        return { ok: true, member };
      } catch {
        const member = await fetchMightyMemberById(memberId);
        return { ok: true, member };
      }
    }

    if (body === bodies[bodies.length - 1]) {
      return { ok: false, status: res.status, message: text.slice(0, 800) || res.statusText };
    }
  }

  return { ok: false, status: 400, message: "No avatar field accepted" };
}

export async function downloadImageForAvatar(
  imageUrl: string,
  opts?: { airtableApiKey?: string }
): Promise<
  | { ok: true; bytes: Buffer; contentType: string; filename: string }
  | { ok: false; error: string }
> {
  try {
    const headers: Record<string, string> = {
      Accept: "image/*,*/*",
      "User-Agent": "BSN-Profile-Backfill/1.0",
    };
    if (
      opts?.airtableApiKey &&
      /airtableusercontent\.com|airtable\.com/i.test(imageUrl)
    ) {
      headers.Authorization = `Bearer ${opts.airtableApiKey}`;
    }

    const res = await fetch(imageUrl, { redirect: "follow", headers });
    if (!res.ok) {
      return { ok: false, error: `Download failed (${res.status})` };
    }
    const contentType = (res.headers.get("content-type") || "image/jpeg").split(";")[0]!.trim();
    if (!contentType.startsWith("image/")) {
      return { ok: false, error: `Not an image (${contentType})` };
    }
    const arrayBuffer = await res.arrayBuffer();
    const bytes = Buffer.from(arrayBuffer);
    if (bytes.length < 100) {
      return { ok: false, error: "Image too small" };
    }
    const prepared = await prepareAvatarImageBytes(bytes);
    return prepared;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

const AVATAR_MAX_BYTES = 1_500_000;
const AVATAR_MAX_PX = 500;

/** Resize/compress for Mighty avatar upload (500×500 min recommendation, avoid 413). */
export async function prepareAvatarImageBytes(
  input: Buffer
): Promise<
  | { ok: true; bytes: Buffer; contentType: string; filename: string }
  | { ok: false; error: string }
> {
  try {
    const sharp = (await import("sharp")).default;
    let pipeline = sharp(input).rotate().resize(AVATAR_MAX_PX, AVATAR_MAX_PX, {
      fit: "cover",
      position: "centre",
    });
    let bytes = await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
    if (bytes.length > AVATAR_MAX_BYTES) {
      bytes = await sharp(input)
        .rotate()
        .resize(AVATAR_MAX_PX, AVATAR_MAX_PX, { fit: "cover", position: "centre" })
        .jpeg({ quality: 70, mozjpeg: true })
        .toBuffer();
    }
    if (bytes.length > AVATAR_MAX_BYTES) {
      return { ok: false, error: `Image too large after compress (${bytes.length} bytes)` };
    }
    return { ok: true, bytes, contentType: "image/jpeg", filename: "legacy-avatar.jpg" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function isMightyRateLimitMessage(text: string): boolean {
  return /rate limit exceeded/i.test(text);
}

export async function withMightyRateLimitRetry<T extends { ok: boolean }>(
  fn: () => Promise<T>,
  getErrorText: (result: T) => string,
  opts?: { maxAttempts?: number; baseDelayMs?: number }
): Promise<T> {
  const maxAttempts = opts?.maxAttempts ?? 4;
  const baseDelayMs = opts?.baseDelayMs ?? 2500;
  let result = await fn();
  for (let attempt = 1; attempt < maxAttempts && !result.ok; attempt++) {
    const err = getErrorText(result);
    if (!isMightyRateLimitMessage(err)) break;
    await new Promise((r) => setTimeout(r, baseDelayMs * attempt));
    result = await fn();
  }
  return result;
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
    typeof member.avatar === "string"
      ? member.avatar
      : typeof member.avatar_url === "string"
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

