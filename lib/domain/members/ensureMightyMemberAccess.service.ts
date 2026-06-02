import {
  createMightyMember,
  fetchMightyMemberById,
  mightyGetMemberByEmail,
} from "@/lib/mightyAdmin";

export class MightyMemberAccessError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 502
  ) {
    super(message);
    this.name = "MightyMemberAccessError";
  }
}

export type EnsureMightyMemberAccessParams = {
  email: string;
  mightyId: number;
  firstName: string;
  lastName: string;
};

export type EnsureMightyMemberAccessResult = {
  mightyId: number;
  /** True when email lookup or re-provision corrected a stale or broken session id. */
  repaired: boolean;
};

const ACCESS_ERROR_MESSAGE =
  "We couldn't connect to your Mighty Networks profile. Sign in to Mighty Networks with this email, then try again. If it still fails, use Map help.";

async function memberIdIsAccessible(mightyId: number): Promise<boolean> {
  try {
    await fetchMightyMemberById(mightyId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve a Mighty member id that Admin API can read/update.
 * Repairs bulk-migration edge cases where a member id exists in Airtable but Mighty GET/PATCH 404 until re-provisioned.
 */
export async function ensureMightyMemberAccess(
  params: EnsureMightyMemberAccessParams
): Promise<EnsureMightyMemberAccessResult> {
  const email = params.email.trim().toLowerCase();
  const firstName = params.firstName.trim() || "Member";
  const lastName = params.lastName.trim() || "User";

  const byEmail = await mightyGetMemberByEmail(email);
  if (byEmail?.id) {
    return {
      mightyId: byEmail.id,
      repaired: byEmail.id !== params.mightyId,
    };
  }

  if (await memberIdIsAccessible(params.mightyId)) {
    return { mightyId: params.mightyId, repaired: false };
  }

  console.warn("[ensureMightyMemberAccess] re-provisioning inaccessible member", {
    email,
    sessionMightyId: params.mightyId,
  });

  const created = await createMightyMember({
    email,
    first_name: firstName,
    last_name: lastName,
    send_welcome_email: false,
  });

  if (created.ok) {
    const afterEmail = await mightyGetMemberByEmail(email);
    if (afterEmail?.id) {
      return { mightyId: afterEmail.id, repaired: true };
    }
    if (await memberIdIsAccessible(created.id)) {
      return { mightyId: created.id, repaired: true };
    }
  }

  const retryEmail = await mightyGetMemberByEmail(email);
  if (retryEmail?.id) {
    return { mightyId: retryEmail.id, repaired: true };
  }

  if (await memberIdIsAccessible(params.mightyId)) {
    return { mightyId: params.mightyId, repaired: true };
  }

  throw new MightyMemberAccessError(ACCESS_ERROR_MESSAGE, 502);
}
