import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/lib/mongodb';
import { getBsnSessionFromReq, createBsnSessionToken, setBsnSessionCookie } from '@/lib/bsnSession';
import { MemberPhotoUpdateError, updateMemberPhoto } from '@/lib/domain/members/memberPhotoUpdate.service';

export const config = { api: { bodyParser: { sizeLimit: '7mb' } } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const session = getBsnSessionFromReq(req);
  if (!session) return res.status(401).json({ ok: false, error: 'Not authenticated' });
  try {
    const { db } = await connectToDatabase();
    const result = await updateMemberPhoto(db, session, req.body?.photo);
    setBsnSessionCookie(res, createBsnSessionToken({ ...session, mightyId: result.mightyId }));
    return res.status(200).json({ ok: true, photoUrl: result.photoUrl });
  } catch (e) {
    if (e instanceof MemberPhotoUpdateError) return res.status(e.statusCode).json({ ok: false, error: e.message });
    console.warn('[member/photo] Photo update failed');
    return res.status(502).json({ ok: false, error: 'Could not save your photo. Please try again.' });
  }
}
