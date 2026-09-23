import type { NextApiRequest, NextApiResponse } from 'next';
import { isValidAirtableRecordId } from '@/lib/memberMapPhotoUrl';
import { resolveLegacyRosterAsset } from '@/lib/domain/members/legacyRosterAsset';
import redis from '@/lib/redis';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['GET', 'HEAD'].includes(req.method || '')) {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).end();
  }
  const { recordId, kind } = req.query;
  if (typeof recordId !== 'string' || !isValidAirtableRecordId(recordId) || typeof kind !== 'string' || !['photo', 'logo'].includes(kind)) {
    return res.status(400).json({ error: 'Invalid asset request' });
  }
  const key = `legacy-roster-asset:v1:${kind}:${recordId}`;
  try {
    let url: string | null = null;
    try { url = await redis.get(key); } catch { /* Airtable remains the fallback. */ }
    if (!url?.startsWith('https://')) {
      url = await resolveLegacyRosterAsset(recordId, kind);
      if (!url) return res.status(404).json({ error: 'Asset not found' });
      try { await redis.setex(key, 1800, url); } catch { /* Return the fresh asset even without cache. */ }
    }
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('Location', url);
    return res.status(302).end();
  } catch {
    return res.status(503).json({ error: 'Legacy asset temporarily unavailable' });
  }
}
