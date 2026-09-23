import { isValidAirtableRecordId } from '@/lib/memberMapPhotoUrl';

/** Resolve legacy attachments on demand instead of storing expiring CDN URLs. */
export async function resolveLegacyRosterAsset(recordId: string, kind: string): Promise<string | null> {
  if (!isValidAirtableRecordId(recordId) || !['photo', 'logo'].includes(kind)) return null;
  const token = process.env.LEGACY_AIRTABLE_ACCESS_TOKEN || process.env.NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN;
  const base = process.env.LEGACY_AIRTABLE_BASE_ID || process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
  const table = process.env.LEGACY_AIRTABLE_TABLE_ID || process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME;
  if (!token || !base || !table) throw new Error('Legacy asset source unavailable');
  const res = await fetch(`https://api.airtable.com/v0/${encodeURIComponent(base)}/${encodeURIComponent(table)}/${encodeURIComponent(recordId)}`, {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Legacy asset source unavailable');
  const data = await res.json();
  const attachments = data.fields?.[kind === 'photo' ? 'PHOTO' : 'LOGO'];
  if (!Array.isArray(attachments)) return null;
  const asset = attachments.find((item: { url?: unknown }) => typeof item?.url === 'string' && item.url.startsWith('https://'));
  return asset?.url || null;
}
