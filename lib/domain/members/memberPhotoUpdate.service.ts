import sharp from 'sharp';
import type { Db } from 'mongodb';
import type { BsnSessionPayload } from '@/lib/bsnSession';
import { fetchMightyMemberById, uploadMightyAvatarAsset, updateMightyMemberAvatar } from '@/lib/mightyAdmin';
import { extractMightyAvatarUrl } from './mightyAvatar';
import { ensureMightyMemberAccess } from './ensureMightyMemberAccess.service';
import { upsertAirtableMightyMember } from '@/lib/airtableMightyMembers';
import { invalidateMightyMemberCaches } from '@/lib/mightyCacheInvalidate';

export class MemberPhotoUpdateError extends Error {
  constructor(message: string, public statusCode = 400) { super(message); }
}

export async function updateMemberPhoto(db: Db, session: BsnSessionPayload, dataUrl: unknown) {
  if (typeof dataUrl !== 'string' || dataUrl.length > 7_000_000) {
    throw new MemberPhotoUpdateError('Choose a JPG, PNG, or WebP image under 5 MB.');
  }
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw new MemberPhotoUpdateError('Choose a JPG, PNG, or WebP image.');
  const input = Buffer.from(match[2], 'base64');
  if (!input.length || input.length > 5 * 1024 * 1024) {
    throw new MemberPhotoUpdateError('Choose an image under 5 MB.');
  }
  let image: Buffer;
  try {
    const source = sharp(input, { limitInputPixels: 40_000_000 });
    const metadata = await source.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format || '') || (metadata.pages || 1) > 1) throw new Error();
    // Fit the whole portrait into a square; do not crop the member's face.
    image = await source.rotate().resize(1000, 1000, {
      fit: 'contain', background: '#ffffff',
    }).jpeg({ quality: 85 }).toBuffer();
  } catch {
    throw new MemberPhotoUpdateError('This image could not be read. Choose a smaller JPG, PNG, or WebP image.');
  }
  const { mightyId } = await ensureMightyMemberAccess({
    email: session.email, mightyId: session.mightyId,
    firstName: session.firstName || '', lastName: session.lastName || '',
  });
  const uploaded = await uploadMightyAvatarAsset({ imageBytes: image, filename: 'profile.jpg', contentType: 'image/jpeg' });
  if (!uploaded.ok) throw new MemberPhotoUpdateError('Mighty Networks could not upload your photo. Please try again.', 502);
  const updated = await updateMightyMemberAvatar({ mightyMemberId: mightyId, avatarUrl: uploaded.url });
  if (!updated.ok) throw new MemberPhotoUpdateError('Mighty Networks could not save your photo. Please try again or update it in Mighty Networks.', 502);
  const member = await fetchMightyMemberById(mightyId);
  const photoUrl = extractMightyAvatarUrl(member);
  let confirmed = false;
  try {
    confirmed = !!photoUrl && new URL(photoUrl).pathname === new URL(uploaded.url).pathname;
  } catch { /* An invalid URL cannot confirm a successful save. */ }
  if (!confirmed) throw new MemberPhotoUpdateError('Mighty Networks did not confirm the new photo. Please update your photo in Mighty Networks for now.', 502);
  const now = new Date();
  await db.collection('mightyMembers').updateOne({ $or: [{ mightyId }, { email: session.email }] }, {
    $set: { mightyId, email: session.email, avatarUrl: photoUrl, memberProfileUpdatedAt: now, updatedAt: now },
    $setOnInsert: { createdAt: now },
  }, { upsert: true });
  try { await upsertAirtableMightyMember({ mightyId, email: session.email, avatarUrl: photoUrl! }); }
  catch { console.warn('[member/photo] Airtable photo sync failed'); }
  await invalidateMightyMemberCaches();
  return { photoUrl, mightyId };
}
