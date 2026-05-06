type MightyAdminMember = Record<string, any>;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}

function getBaseUrl(): string {
  // Allow override in case Mighty changes domains/paths.
  return (process.env.MIGHTY_ADMIN_API_BASE_URL || "https://www.mightynetworks.com").replace(/\/$/, "");
}

export async function fetchMightyMemberById(mightyMemberId: string | number): Promise<MightyAdminMember> {
  const apiKey = requireEnv("MIGHTY_API_KEY");
  const networkId = requireEnv("MIGHTY_NETWORK_ID");

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

