/** @jest-environment node */
import httpMocks from 'node-mocks-http';
import handler from '@/pages/api/member-legacy-asset';
import { resolveLegacyRosterAsset } from '@/lib/domain/members/legacyRosterAsset';
jest.mock('@/lib/redis', () => ({ __esModule: true, default: { get: jest.fn().mockResolvedValue(null), setex: jest.fn().mockResolvedValue('OK') } }));
const oldEnv = process.env;
const oldFetch = global.fetch;
beforeEach(() => {
  process.env = { ...oldEnv, LEGACY_AIRTABLE_ACCESS_TOKEN: 'private-token', LEGACY_AIRTABLE_BASE_ID: 'legacy-base', LEGACY_AIRTABLE_TABLE_ID: 'legacy-table' };
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ fields: { PHOTO: [{ url: 'https://cdn.example/photo' }], LOGO: [{ url: 'https://cdn.example/logo' }] } }) });
});
afterEach(() => { process.env = oldEnv; global.fetch = oldFetch; });
test.each(['photo','logo'])('resolves fresh %s from the legacy table', async kind => {
  expect(await resolveLegacyRosterAsset('recABCDEF123456', kind)).toBe(`https://cdn.example/${kind}`);
  expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/legacy-base/legacy-table/'), expect.anything());
});
test.each([{ kind: 'email', recordId: 'recABCDEF123456' }, { kind: 'photo', recordId: 'bad' }])('rejects invalid asset requests', async query => {
  const res=httpMocks.createResponse(); await handler(httpMocks.createRequest({ method:'GET', query }) as any,res as any);
  expect(res.statusCode).toBe(400); expect(global.fetch).not.toHaveBeenCalled();
});
test('redirects to fresh image and keeps cache lifetime short', async () => {
  const res=httpMocks.createResponse();await handler(httpMocks.createRequest({method:'GET',query:{kind:'logo',recordId:'recABCDEF123456'}}) as any,res as any);
  expect(res.statusCode).toBe(302);expect(res.getHeader('Location')).toBe('https://cdn.example/logo');
});
test('does not expose upstream error details', async () => {
  global.fetch=jest.fn().mockRejectedValue(new Error('private-token'));
  const res=httpMocks.createResponse();await handler(httpMocks.createRequest({method:'GET',query:{kind:'photo',recordId:'recABCDEF123456'}}) as any,res as any);
  expect(res.statusCode).toBe(503);expect(res._getData()).not.toContain('private-token');
});
test('missing attachment is not replaced with another type', async () => {
  global.fetch=jest.fn().mockResolvedValue({ok:true,json:async()=>({fields:{LOGO:[{url:'https://cdn.example/logo'}]}})});
  expect(await resolveLegacyRosterAsset('recABCDEF123456','photo')).toBeNull();
});
