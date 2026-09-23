/** @jest-environment node */
jest.mock('@/lib/airtableMightyMembers', () => ({
  patchAirtableMightyMemberFromPayload: jest.fn().mockResolvedValue({ skipped: false, action: 'updated', recordId: 'rec1' }),
  upsertAirtableMightyMember: jest.fn().mockResolvedValue({ skipped: false, action: 'created', recordId: 'rec2' }),
}));
jest.mock('@/lib/mightyAdmin', () => ({
  fetchMightyMemberById: jest.fn().mockResolvedValue({ id: 123, email: 'member@example.org', first_name: 'Name' }),
  listMemberPlans: jest.fn().mockResolvedValue([]),
  readMightyCustomFieldAnswer: jest.fn().mockResolvedValue({ loaded: false }),
}));
jest.mock('@/lib/domain/members/memberMightyCustomFields', () => ({
  fetchMightyProfileCustomFields: jest.fn().mockResolvedValue({ bioLoaded: false, organizationLoaded: false }),
}));
import { syncMightyMemberToAirtable } from '@/lib/domain/sync/mightyToAirtableMemberSync';
import { patchAirtableMightyMemberFromPayload, upsertAirtableMightyMember } from '@/lib/airtableMightyMembers';
test('cron enables profile protection for known rows and discovered members', async () => {
  await syncMightyMemberToAirtable(123, { recordId: 'rec1' });
  expect(patchAirtableMightyMemberFromPayload).toHaveBeenCalledWith('rec1', expect.objectContaining({ mightyId: 123 }), { preserveExistingProfile: true });
  await syncMightyMemberToAirtable(123);
  expect(upsertAirtableMightyMember).toHaveBeenCalledWith(expect.objectContaining({ mightyId: 123 }), { preserveExistingProfile: true });
});
