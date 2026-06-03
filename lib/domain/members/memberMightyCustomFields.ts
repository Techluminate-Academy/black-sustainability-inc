import { readMightyCustomFieldAnswer } from "@/lib/mightyAdmin";

function customFieldIdFromEnv(envKey: string): number | null {
  const raw = process.env[envKey];
  const id = raw ? Number(raw) : NaN;
  return Number.isFinite(id) ? id : null;
}

/** Bio/organization live on Mighty custom fields; member PUT does not accept bio. */
export async function fetchMightyProfileCustomFields(mightyId: number): Promise<{
  bio: string | null;
  /** True when Extended Bio custom field was read from Mighty (including cleared/blank). */
  bioLoaded: boolean;
  organizationName: string | null;
  organizationLoaded: boolean;
}> {
  const bioFieldId = customFieldIdFromEnv("MIGHTY_BIO_CUSTOM_FIELD_ID");
  const orgFieldId = customFieldIdFromEnv("MIGHTY_ORGANIZATION_CUSTOM_FIELD_ID");

  const [bioRead, orgRead] = await Promise.all([
    bioFieldId
      ? readMightyCustomFieldAnswer({ customFieldId: bioFieldId, mightyMemberId: mightyId })
      : Promise.resolve(null),
    orgFieldId
      ? readMightyCustomFieldAnswer({ customFieldId: orgFieldId, mightyMemberId: mightyId })
      : Promise.resolve(null),
  ]);

  return {
    bio: bioRead?.loaded ? bioRead.text : null,
    bioLoaded: bioRead?.loaded === true,
    organizationName: orgRead?.loaded ? orgRead.text : null,
    organizationLoaded: orgRead?.loaded === true,
  };
}
