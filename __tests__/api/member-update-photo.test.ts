import handler from '@/pages/api/member/update-photo';
import { createMocks } from 'node-mocks-http';
const mockSession = jest.fn();
jest.mock('@/lib/bsnSession', () => ({getBsnSessionFromReq: () => mockSession()}));
beforeEach(() => { mockSession.mockReturnValue({email:'me@example.com',mightyId:12}); });
it('requires authentication', () => { mockSession.mockReturnValue(null); const {req,res}=createMocks({method:'POST'}); handler(req as any,res as any); expect(res.statusCode).toBe(401); });
it('tells stale clients to use Mighty without attempting an upload', () => { const {req,res}=createMocks({method:'POST',body:{photo:'image'}}); handler(req as any,res as any); expect(res.statusCode).toBe(409); expect(res._getJSONData().error).toContain('Personal Settings'); });
it('rejects GET', () => {const {req,res}=createMocks({method:'GET'}); handler(req as any,res as any); expect(res.statusCode).toBe(405);});
