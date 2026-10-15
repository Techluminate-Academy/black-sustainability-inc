import type { NextApiRequest, NextApiResponse } from 'next';
import { getBsnSessionFromReq } from '@/lib/bsnSession';

// Keep a clear response for stale clients without parsing or uploading image data.
export const config = { api: { bodyParser: false } };
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!getBsnSessionFromReq(req)) return res.status(401).json({ ok: false, error: 'Not authenticated' });
  return res.status(409).json({ ok: false, error: 'Photo uploads from this map are unavailable. Open Mighty Networks, then Personal Settings → Edit Profile to change your photo.' });
}
