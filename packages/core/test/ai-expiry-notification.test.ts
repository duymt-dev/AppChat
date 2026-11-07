// TIP-019b §4.5 (đơn vị): hết hạn duyệt → ý định thông báo Owner HIỆN TẠI một lần (ownerOnly + onceKey), không kèm input / preview;
// người nhận đọc lúc gửi (Owner đổi → người mới); biên nhận đã gửi → không gửi lại khi event phát lại.
import { describe, expect, it } from 'vitest';
import { notifyIntents } from '../src/notify/rules';
import '../src/notify/events/domain.rules';
import { resolveRecipients } from '../src/notify/services/recipients';
import { receiptFor } from '../src/notify/delivery-receipts';
import { EXPIRY_ONCE } from '../src/ai/public';

const ev = (status: string) => ({ id: 'e1', workspaceId: 'w', topic: 'approval.decided', payload: { ws: '00000000-0000-7000-8000-0000000000aa', occurred_at: new Date().toISOString(), approval_id: '00000000-0000-7000-8000-000000000001', run_id: null, status }, createdAt: new Date() }) as never;

describe('hết hạn duyệt → Owner hiện tại', () => {
  it('chỉ trạng thái expired sinh ý định ownerOnly + onceKey, không có input / tiêu đề yêu cầu', () => {
    const out = notifyIntents(ev('expired')).filter((i) => i.onceKey?.startsWith(EXPIRY_ONCE));
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: 'ai_review', to: { ownerOnly: true }, params: { variant: 'expired' } });
    expect(Object.keys(out[0]!.params)).toEqual(['variant']);
    expect(notifyIntents(ev('approved')).filter((i) => i.onceKey)).toHaveLength(0);
  });

  it('người nhận = Owner đọc lúc gửi, phải còn active', async () => {
    let owner = 'u1';
    const platform = {
      workspace: { findUnique: async () => ({ ownerUserId: owner }) },
      membership: { findMany: async ({ where }: { where: { userId: { in: string[] } } }) => where.userId.in.filter((u) => u !== 'gone').map((userId) => ({ userId, roleKey: 'owner', delegations: [] })) },
      user: { findMany: async ({ where }: { where: { id: { in: string[] } } }) => where.id.in.map((id) => ({ id, email: `${id}@x`, locale: 'vi' })) },
    } as never;
    const authz = { resolve: async () => ({}) } as never;
    expect((await resolveRecipients(platform, authz, 'w', { ownerOnly: true })).map((r) => r.userId)).toEqual(['u1']);
    owner = 'u2';
    expect((await resolveRecipients(platform, authz, 'w', { ownerOnly: true })).map((r) => r.userId)).toEqual(['u2']);
    owner = 'gone';
    expect(await resolveRecipients(platform, authz, 'w', { ownerOnly: true })).toEqual([]);
  });

  it('biên nhận đăng ký theo tiền tố; đã gửi → bỏ qua', async () => {
    const { receipt, id } = receiptFor(`${EXPIRY_ONCE}:a1`);
    expect(id).toBe('a1');
    const rows = new Map<string, { phase: string }>();
    const db = { aiExpiryDelivery: { findUnique: async ({ where }: { where: { approvalId: string } }) => rows.get(where.approvalId) ?? null } } as never;
    expect(await receipt!.sent(db, 'a1')).toBe(false);
    rows.set('a1', { phase: 'sent' });
    expect(await receipt!.sent(db, 'a1')).toBe(true);
  });
});
