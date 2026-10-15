import sharp from 'sharp';
import { updateMemberPhoto } from '@/lib/domain/members/memberPhotoUpdate.service';
const mockUpload = jest.fn();
const mockAssign = jest.fn();
const mockRead = jest.fn();
const mockAccess = jest.fn();
const mockAirtable = jest.fn();
const mockInvalidate = jest.fn();
jest.mock('@/lib/mightyAdmin', () => ({
  uploadMightyAvatarAsset: (...a: unknown[]) => mockUpload(...a),
  updateMightyMemberAvatar: (...a: unknown[]) => mockAssign(...a),
  fetchMightyMemberById: (...a: unknown[]) => mockRead(...a),
}));
jest.mock('@/lib/domain/members/ensureMightyMemberAccess.service', () => ({ ensureMightyMemberAccess: (...a: unknown[]) => mockAccess(...a) }));
jest.mock('@/lib/airtableMightyMembers', () => ({ upsertAirtableMightyMember: (...a: unknown[]) => mockAirtable(...a) }));
jest.mock('@/lib/mightyCacheInvalidate', () => ({ invalidateMightyMemberCaches: () => mockInvalidate() }));
const session = { mightyId: 99, email: 'member@example.com' };
const updateOne = jest.fn();
const db = { collection: () => ({ updateOne }) } as any;
let photo: string;
beforeAll(async () => {
 const bytes = await sharp({ create: { width: 30, height: 60, channels: 3, background: 'red' } }).png().toBuffer();
 photo = 'data:image/png;base64,' + bytes.toString('base64');
});
beforeEach(() => {
 jest.clearAllMocks();
 mockAccess.mockResolvedValue({ mightyId: 99 });
 mockUpload.mockResolvedValue({ ok: true, url: 'https://cdn.example.com/new.jpg' });
 mockAssign.mockResolvedValue({ ok: true });
 mockRead.mockResolvedValue({ avatar: 'https://cdn.example.com/new.jpg?width=1000' });
});
it('rejects invalid image bytes before calling Mighty', async () => {
 await expect(updateMemberPhoto(db, session, 'data:image/png;base64,aGVsbG8=')).rejects.toThrow('could not be read');
 expect(mockUpload).not.toHaveBeenCalled();
});
it('rejects oversized and non-image uploads', async () => {
 await expect(updateMemberPhoto(db, session, 'x'.repeat(7_000_001))).rejects.toThrow('under 5 MB');
 await expect(updateMemberPhoto(db, session, 'data:image/svg+xml;base64,AAAA')).rejects.toThrow('JPG');
 expect(mockAccess).not.toHaveBeenCalled();
});
it('does not mirror an ignored avatar update even when Mighty returns success', async () => {
 mockRead.mockResolvedValue({ avatar: 'https://cdn.example.com/old.jpg' });
 await expect(updateMemberPhoto(db, session, photo)).rejects.toThrow('did not confirm');
 expect(updateOne).not.toHaveBeenCalled();
 expect(mockAirtable).not.toHaveBeenCalled();
});
it('saves only the verified avatar and preserves the full portrait in the uploaded square', async () => {
 await expect(updateMemberPhoto(db, session, photo)).resolves.toEqual({ mightyId: 99, photoUrl: 'https://cdn.example.com/new.jpg?width=1000' });
 expect(mockAssign).toHaveBeenCalledWith({ mightyMemberId: 99, avatarUrl: 'https://cdn.example.com/new.jpg' });
 const uploaded = mockUpload.mock.calls[0][0].imageBytes;
 const { data, info } = await sharp(uploaded).raw().toBuffer({ resolveWithObject: true });
 expect(info.width).toBe(1000); expect(info.height).toBe(1000);
 expect(data[0]).toBeGreaterThan(240); expect(data[1]).toBeGreaterThan(240); // white margin, not a cropped red square
 expect(updateOne).toHaveBeenCalled(); expect(mockAirtable).toHaveBeenCalled(); expect(mockInvalidate).toHaveBeenCalled();
});
