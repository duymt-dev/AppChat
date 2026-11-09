// TIP-015d §5: thông báo chuyển phụ trách — luật hai bên (người mới + người cũ, không cho hoàn tác / phân bổ tự động / cùng người), bộ chiếu
// theo quyền hiện tại (bị gỡ → bỏ, mất scope → chữ chung không tên / link, còn thấy → tên + link), mail worker chiếu lại ngay trước khi
// gửi (job không mang PII), action bulk khai đúng quyền / duyệt bắt buộc.
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { getAction } from '@appchat/actions';
import type { AuthzContext } from '@appchat/shared';
import { notifyIntents } from '../src/notify/rules';
import '../src/crm/events/ownership.rules';
import { applyProjection, genericNoticeTitle, projectNotices } from '../src/notify/services/ownership-notice';
import { sendNotificationMail } from '../src/notify/jobs/notify-mail.processor';
import type { DomainEvent } from '../src/kernel/events/consumer';

const WS = '0190f000-0000-7000-8000-0000000000aa';
const A = '0190f000-0000-7000-8000-0000000000a1';
const B = '0190f000-0000-7000-8000-0000000000b1';
const C = '0190f000-0000-7000-8000-0000000000c1';
const T = '0190f000-0000-7000-8000-0000000000d1';
const N = '0190f000-0000-7000-8000-0000000000e1';
const MOVE = { conversations: false, quotes: false, appointments: false };
const ev = (payload: Record<string, unknown>): DomainEvent => ({ id: 'e1', topic: 'contact.owner_changed', workspaceId: WS, payload: { ws: WS, occurred_at: '2026-11-08T00:00:00Z', contact_id: C, move: MOVE, ...payload }, traceId: null });
const authz = (perms: string[]): AuthzContext => ({ userId: A, isOwner: false, permissions: new Set(perms), scope: { crm: 'own' }, writeScope: { crm: 'own' }, teamIds: [], teamUserIds: [] }) as never;

describe('luật thông báo hai bên', () => {
  const intents = (p: Record<string, unknown>) => notifyIntents(ev(p)).filter((i) => i.ownershipNotice);

  it('người mới (to) + người cũ (from) mỗi chiều một ý định, chỉ mang id lần chuyển', () => {
    const out = intents({ from: A, to: B, transfer_id: T });
    expect(out.map((i) => [i.to.userIds?.[0], i.ownershipNotice?.direction])).toEqual([
      [B, 'to'],
      [A, 'from'],
    ]);
    for (const i of out) expect(i).toMatchObject({ kind: 'crm_owner', params: {}, ownershipNotice: { transferId: T } });
    expect(out.every((i) => i.link === undefined && i.excludeUserId === undefined)).toBe(true);
  });

  it('khách chưa có người phụ trách → chỉ người mới; hoàn tác / phân bổ tự động (không transfer_id) / cùng người → không gì', () => {
    expect(intents({ from: null, to: B, transfer_id: T }).map((i) => i.ownershipNotice?.direction)).toEqual(['to']);
    expect(intents({ from: B, to: A, transfer_id: T, undo: true })).toEqual([]);
    expect(intents({ from: null, to: B })).toEqual([]);
    expect(intents({ from: B, to: B, transfer_id: T })).toEqual([]);
  });
});

function fakeDb(o: { visible: boolean }) {
  return {
    contactTransferNotice: { findMany: async () => [{ notificationId: N, transferId: T, recipientUserId: A, direction: 'from' }] },
    contactTransfer: { findMany: async () => [{ id: T, contactId: C, toUserId: B, actorId: A }] },
    $queryRaw: async () => (o.visible ? [{ id: C, name: 'Chị Lan' }] : []),
  } as never;
}
const platform = { user: { findMany: async () => [{ id: A, name: 'An', email: 'a@x.vn' }, { id: B, name: 'Bình', email: 'b@x.vn' }] } } as never;
const row = { id: N, type: 'crm_owner', title: 'gốc', link: null };

describe('bộ chiếu theo quyền hiện tại', () => {
  it('còn thấy khách → tiêu đề có tên + link Hồ sơ 360°', async () => {
    const p = (await projectNotices(fakeDb({ visible: true }), platform, authz(['crm.view']), [row], 'vi')).get(N)!;
    expect(p.title).toContain('Chị Lan');
    expect(p.title).toContain('Bình');
    expect(p.link).toBe(`/customers?c=${C}`);
  });

  it('mất scope / mất crm.view → chữ chung, không tên / id / link', async () => {
    for (const [db, perms] of [[fakeDb({ visible: false }), ['crm.view']], [fakeDb({ visible: true }), []]] as const) {
      const p = (await projectNotices(db, platform, authz([...perms]), [row], 'vi')).get(N)!;
      expect(p).toEqual({ title: genericNoticeTitle('vi'), link: null, params: { variant: 'generic' } });
      expect(p.title).not.toContain(C);
    }
  });

  it('người nhận bị gỡ → bỏ dòng; dòng không phải chuyển phụ trách giữ nguyên', async () => {
    const p = await projectNotices(fakeDb({ visible: true }), platform, null, [row], 'vi');
    const other = { id: 'x', type: 'sla_warn', title: 'SLA', link: '/tickets' };
    expect(applyProjection([row, other], p)).toEqual([other]);
  });
});

describe('mail worker chiếu lại ngay trước khi gửi', () => {
  const job = { notification_id: N, workspace_id: WS, user_id: A, kind: 'crm_owner' as const, params: {}, link: null };
  const deps = (status: string, visible: boolean) => {
    const sent: { subject: string; html: string }[] = [];
    return {
      sent,
      d: {
        platform: {
          user: { findUnique: async () => ({ email: 'a@x.vn', locale: 'vi' }), findMany: (platform as { user: { findMany: unknown } }).user.findMany },
          workspace: { findUnique: async () => ({ name: 'Spa' }) },
          membership: { findUnique: async () => ({ roleKey: 'sales', delegations: [], status }) },
        } as never,
        mail: { send: async (m: { subject: string; html: string }) => void sent.push(m) } as never,
        publicUrl: 'https://app.x.vn',
        tenants: { get: async () => fakeDb({ visible }) },
        authz: { resolve: async () => authz(['crm.view']) },
      },
    };
  };

  it('bị gỡ trước khi gửi → không gửi; mất scope → chữ chung; còn thấy → tên khách', async () => {
    const gone = deps('removed', true);
    expect(await sendNotificationMail(gone.d, job)).toBe('skipped');
    expect(gone.sent).toEqual([]);
    const blind = deps('active', false);
    expect(await sendNotificationMail(blind.d, job)).toBe('sent');
    expect(blind.sent[0]!.html).not.toContain('Chị Lan');
    expect(blind.sent[0]!.html).toContain(genericNoticeTitle('vi'));
    const ok = deps('active', true);
    await sendNotificationMail(ok.d, job);
    expect(ok.sent[0]!.html).toContain('Chị Lan');
  });
});

describe('contact.transfer_owner_bulk', () => {
  it('crm.reassign · bulk · ≤ 1000 · không cấp cho agent · Trợ lý / agent / tác vụ luôn duyệt', () => {
    const def = getAction('contact.transfer_owner_bulk')!;
    expect(def).toMatchObject({ permission: 'crm.reassign', risk: 'write', bulk: true, agentGrantable: false });
    expect([...(def.requiredApprovalSources ?? [])].sort()).toEqual(['agent', 'assistant', 'task']);
    const base = { to_user_id: 'u', move: MOVE };
    expect(def.input.safeParse({ ...base, contact_ids: Array.from({ length: 1000 }, (_, i) => `c${i}`) }).success).toBe(true);
    expect(def.input.safeParse({ ...base, contact_ids: Array.from({ length: 1001 }, (_, i) => `c${i}`) }).success).toBe(false);
  });
});
