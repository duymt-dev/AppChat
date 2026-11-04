// TIP-045b annex A3: mock đổi Chủ sở hữu đúng shape + luật server (packages/shared/src/api/ownership-transfer.ts) — chỉ Owner, mã gắn người
// nhận, sai mã / đổi người nhận → OTP_INVALID cùng lý do, đúng mã → người nhận owner, Owner cũ manager.
import { beforeEach, describe, expect, it } from 'vitest';
import { ApiRequestError, ownershipTransferredSchema, transferOtpSentSchema } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { setMockRole } from './store';
import { MOCK_TRANSFER_OTP, resetTransferMock } from './domains/ownership-transfer';

const fail = async (p: Promise<unknown>) => {
  try {
    await p;
    return 'ok';
  } catch (e) {
    return e instanceof ApiRequestError ? `${e.error.code}:${JSON.stringify(e.error.fields)}` : String(e);
  }
};
type Page = { data: { id: string; role: string; invite: boolean; status: string }[] };

describe('mock đổi Chủ sở hữu', () => {
  beforeEach(() => {
    setMockRole('owner');
    resetTransferMock();
  });

  it('không phải Owner → 403; mã gắn người nhận; đúng mã → owner / manager', async () => {
    const page = await mockTransport.get<Page>('/settings/members');
    const [a, b] = page.data.filter((m) => m.role !== 'owner' && !m.invite && m.status !== 'pending');
    setMockRole('manager');
    expect(await fail(mockTransport.action('workspace.request_transfer_otp', { to_user_id: a!.id }))).toMatch(/^FORBIDDEN/);
    setMockRole('owner');
    const sent = await mockTransport.action('workspace.request_transfer_otp', { to_user_id: a!.id });
    expect(transferOtpSentSchema.safeParse((sent.data as { result: unknown }).result).success).toBe(true);
    expect(await fail(mockTransport.action('workspace.transfer_ownership', { to_user_id: b!.id, otp: MOCK_TRANSFER_OTP }))).toBe('OTP_INVALID:{"otp":"stale"}');
    expect(await fail(mockTransport.action('workspace.transfer_ownership', { to_user_id: a!.id, otp: '000000' }))).toBe('OTP_INVALID:{"otp":"invalid"}');
    const done = await mockTransport.action('workspace.transfer_ownership', { to_user_id: a!.id, otp: MOCK_TRANSFER_OTP });
    expect(ownershipTransferredSchema.parse((done.data as { result: unknown }).result)).toEqual({ owner_user_id: a!.id, previous_owner_role: 'manager' });
    const after = await mockTransport.get<Page>('/settings/members');
    expect(after.data.filter((m) => m.role === 'owner').map((m) => m.id)).toEqual([a!.id]);
  });
});
