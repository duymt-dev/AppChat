// TIP-030: route mock domain hợp đồng đúng shape đọc dùng chung với API thật (packages/shared/src/api/contracts.ts) + luồng ghi theo
// CONTRACT_FLOW (sai trạng thái → INVALID_TRANSITION; Duyệt & ký cần OTP đã gửi; trang ký công khai: sai OTP còn lượt, link sai → 410).
import { beforeEach, describe, expect, it } from 'vitest';
import { contractRowSchema, contractsMetaSchema, contractsPageSchema, signViewSchema } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { mockDb, setMockRole } from './store';
import { createContractsState } from './domains/contracts';
import { MOCK_OWNER_OTP, contractsHandlers } from './domains/contracts-actions';
import { MOCK_SIGN_OTP } from './domains/contracts-sign';

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

describe('mock hợp đồng — shape FE ↔ BE', () => {
  beforeEach(() => {
    mockDb().contracts = createContractsState();
    setMockRole('owner');
  });

  it('GET /contracts (D42) · /contracts/:id · /meta (+ theo hợp đồng) · PDF', async () => {
    expect(issues(contractsPageSchema.safeParse(await mockTransport.get('/contracts', { page: 1, limit: 5 })))).toEqual([]);
    expect(issues(contractRowSchema.safeParse(await mockTransport.get('/contracts/ctr_1181')))).toEqual([]);
    expect(issues(contractsMetaSchema.safeParse(await mockTransport.get('/contracts/meta')))).toEqual([]);
    expect(issues(contractsMetaSchema.safeParse(await mockTransport.get('/contracts/meta', { contract_id: 'ctr_1181' })))).toEqual([]);
    expect(await mockTransport.blob('/contracts/ctr_1181/pdf')).toBeInstanceOf(Blob);
  });

  it('luồng: nháp → trình duyệt; sửa khi chờ duyệt → INVALID_TRANSITION; Duyệt & ký cần OTP đã gửi; gửi ký → link', async () => {
    run('contract.submit', { contract_id: 'ctr_1182' });
    expect(await code(() => run('contract.update', { contract_id: 'ctr_1182', patch: { note: 'x' } }))).toBe('INVALID_TRANSITION');
    expect(await code(() => run('contract.approve_and_sign', { contract_id: 'ctr_1182', otp: MOCK_OWNER_OTP, signature_png: PNG }))).toBe('OTP_INVALID');
    await mockTransport.post('/contracts/ctr_1182/sign-otp', {});
    run('contract.approve_and_sign', { contract_id: 'ctr_1182', otp: MOCK_OWNER_OTP, signature_png: PNG });
    expect(await code(() => run('contract.extend_sign_link', { contract_id: 'ctr_1182' }))).toBe('INVALID_STATE');
    const s = run('contract.send_for_signature', { contract_id: 'ctr_1182', channel: 'zalo_personal' }) as { sign_url: string };
    expect(s.sign_url).toMatch(/^\/sign\//);
    expect(await code(() => run('contract.renew', { contract_id: 'ctr_1182' }))).toBe('INVALID_TRANSITION');
    expect(await code(() => run('contract.extend_sign_link', { contract_id: 'ctr_1180' }))).toBe('INVALID_TRANSITION');
  });

  it('trang ký công khai: open → shape; sai OTP → 422 còn lượt; ký → signed + sha; link giả → SIGN_LINK_INVALID', async () => {
    expect(issues(signViewSchema.safeParse(await mockTransport.post('/public/sign/tk_1181_demo/open', {})))).toEqual([]);
    await mockTransport.post('/public/sign/tk_1181_demo/otp', {});
    expect(await code(() => mockTransport.post('/public/sign/tk_1181_demo/sign', { otp: '000001', signature_png: PNG, consent: true }))).toBe('OTP_INVALID');
    const v = signViewSchema.parse(await mockTransport.post('/public/sign/tk_1181_demo/sign', { otp: MOCK_SIGN_OTP, signature_png: PNG, consent: true }));
    expect(v).toMatchObject({ status: 'signed' });
    expect(v.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(await code(() => mockTransport.post('/public/sign/nope/open', {}))).toBe('SIGN_LINK_INVALID');
  });

  it('scope: sales chỉ thấy hợp đồng mình làm', async () => {
    setMockRole('sales');
    const r = contractsPageSchema.parse(await mockTransport.get('/contracts', { page: 1, limit: 20 }));
    expect(r.data.every((c) => c.owner_user_id === 'u_tram')).toBe(true);
    expect(await code(() => mockTransport.get('/contracts/ctr_1180'))).toBe('NOT_FOUND');
  });
});
