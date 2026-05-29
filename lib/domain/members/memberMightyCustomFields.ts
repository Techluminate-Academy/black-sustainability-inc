import { getMightyCustomFieldAnswerText } from "@/lib/mightyAdmin";

function customFieldIdFromEnv(envKey: string): number | null {
  const raw = process.env[envKey];
  const id = raw ? Number(raw) : NaN;
  return Number.isFinite(id) ? id : null;
}

/** Bio/organization live on Mighty custom fields; member PUT does not accept bio. */
export async function fetchMightyProfileCustomFields(mightyId: number): Promise<{
  bio: string | null;
  organizationName: string | null;
}> {
  const bioFieldId = customFieldIdFromEnv("MIGHTY_BIO_CUSTOM_FIELD_ID");
  const orgFieldId = customFieldIdFromEnv("MIGHTY_ORGANIZATION_CUSTOM_FIELD_ID");

  const [bio, organizationName] = await Promise.all([
    bioFieldId
      ? getMightyCustomFieldAnswerText({ customFieldId: bioFieldId, mightyMemberId: mightyId })
      : Promise.resolve(null),
    orgFieldId
      ? getMightyCustomFieldAnswerText({ customFieldId: orgFieldId, mightyMemberId: mightyId })
      : Promise.resolve(null),
  ]);

  return { bio, organizationName };
}
