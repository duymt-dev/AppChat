// TIP-030b F3: mock phụ lục đúng shape đọc dùng chung với API thật (packages/shared/src/api/contract-appendix.ts) + luồng APPENDIX_FLOW
// (chỉ hợp đồng đã ký; PL-n; cùng request_key → cùng phụ lục; sửa → version +1 và CAS; Owner ký trước bằng OTP riêng; link khách ký riêng).
import { beforeEach, describe, expect, it } from 'vitest';
import { appendixSchema, appendixSignViewSchema } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { mockDb, setMockRole } from './store';
import { createContractsState } from './domains/contracts';
import { contractsHandlers } from './domains/contracts-actions';
import { MOCK_APPENDIX_OTP, MOCK_APPENDIX_OWNER_OTP, MOCK_APPENDIX_TOKEN, resetAppendixMock } from './domains/contracts-appendix';

const issues = (r: { success: boolean; error?: { issues: unknown[] } }) => (r.success ? [] : r.error!.issues);
const run = (id: string, input: unknown) => contractsHandlers[id]!.execute(mockDb(), input as never) as Record<string, unknown>;
const code = async (fn: () => unknown) => {
  try {
    await fn();
    return null;
  } catch (e) {
    return (e as { error?: { code: string } }).error?.code ?? 'throw';
  }
};
const PNG = 'data:image/png;base64,iVBORw0KGgo=';

describe('mock phụ lục hợp đồng — shape FE ↔ BE + luồng', () => {
  beforeEach(() => {
    mockDb().contracts = createContractsState();
    resetAppendixMock();
    setMockRole('owner');
  });

  it('GET /contracts/:id/appendices + trang ký phụ lục mẫu đúng shape', async () => {
    const list = (await mockTransport.get('/contracts/ctr_1180/appendices')) as unknown[];
    expect(list).toHaveLength(1);
    for (const a of list) expect(issues(appendixSchema.safeParse(a))).toEqual([]);
    expect(issues(appendixSignViewSchema.safeParse(await mockTransport.post(`/public/appendix-sign/${MOCK_APPENDIX_TOKEN}/open`, {})))).toEqual([]);
  });

  it('chỉ hợp đồng đã ký; PL-n; request_key lặp → cùng phụ lục; CAS version; Owner OTP riêng → gửi → khách ký', async () => {
    expect(await code(() => run('contract.create_appendix', { contract_id: 'ctr_1182', title: 'X', content: 'Y', request_key: 'k0' }))).toBe('INVALID_STATE');
    const a = run('contract.create_appendix', { contract_id: 'ctr_1180', title: 'Đổi lịch', content: 'Dời buổi 3', request_key: 'k1' });
    expect(a.code).toBe('HĐ-1180/PL-2');
    expect(run('contract.create_appendix', { contract_id: 'ctr_1180', title: 'Đổi lịch', content: 'Dời buổi 3', request_key: 'k1' }).appendix_id).toBe(a.appendix_id);
    const id = a.appendix_id as string;
    expect(run('contract.appendix_update', { appendix_id: id, if_version: 1, patch: { content: 'Dời buổi 3 sang thứ 7' } }).version).toBe(2);
    expect(await code(() => run('contract.appendix_update', { appendix_id: id, if_version: 1, patch: { title: 'Z' } }))).toBe('CONFLICT');
    run('contract.appendix_submit', { appendix_id: id });
    expect(await code(() => run('contract.appendix_send', { appendix_id: id, channel: 'zalo_personal' }))).toBe('INVALID_TRANSITION');
    expect(await code(() => run('contract.appendix_approve_and_sign', { appendix_id: id, if_version: 2, otp: MOCK_APPENDIX_OWNER_OTP, signature_png: PNG }))).toBe('OTP_INVALID');
    run('contract.appendix_owner_otp', { appendix_id: id });
    run('contract.appendix_approve_and_sign', { appendix_id: id, if_version: 2, otp: MOCK_APPENDIX_OWNER_OTP, signature_png: PNG });
    const s = run('contract.appendix_send', { appendix_id: id, channel: 'zalo_personal' }) as { sign_url: string };
    const token = s.sign_url.replace('/sign/appendix/', '');
    expect(await code(() => mockTransport.post(`/public/appendix-sign/${token}/sign`, { otp: '000000', signature_png: PNG, consent: true }))).toBe('OTP_INVALID');
    const v = (await mockTransport.post(`/public/appendix-sign/${token}/sign`, { otp: MOCK_APPENDIX_OTP, signature_png: PNG, consent: true })) as { status: string; sha256: string };
    expect(v.status).toBe('signed');
    expect(v.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(await code(() => mockTransport.post(`/public/appendix-sign/${token}/open`, {}))).toBe('SIGN_LINK_INVALID');
  });

  it('không phải Owner → không ký / gửi được; hợp đồng ngoài phạm vi → 404', async () => {
    setMockRole('sales');
    expect(await code(() => run('contract.appendix_owner_otp', { appendix_id: 'apx_1' }))).toBe('FORBIDDEN');
    expect(await code(() => mockTransport.get('/contracts/ctr_1180/appendices'))).toBe('NOT_FOUND');
  });
});
