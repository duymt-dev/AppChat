// TIP-025b §G.1 — conversationApprovals: hội thoại ngoài scope → 404 trước mọi truy vấn duyệt; không có approvals.decide → rỗng (không
// đọc hàng duyệt); chỉ lấy theo run của hội thoại (không dò input); can_decide = approvals.decide ∩ quyền duyệt action gốc; đã duyệt chưa
// chạy → executed false; pending quá hạn → expired; số truy vấn cố định (không theo từng dòng).
import { describe, expect, it } from 'vitest';
import type { AuthzContext } from '@appchat/shared';
import { conversationApprovals } from '../src/inbox/approvals/conversation-approvals';

const U = (n: number) => `0190f000-0000-7000-8000-${String(n).padStart(12, '0')}`;
const C = U(1);
const HID = U(2);
const me = U(99);
const now = new Date('2026-11-07T03:00:00Z');
const later = new Date(now.getTime() + 3_600_000);
const before = new Date(now.getTime() - 60_000);

const row = (id: number, o: Record<string, unknown>) => ({
  id: U(id), runId: U(50), agentId: null, actionId: 'quote.approve', input: {}, risk: 'money', permission: 'quote.approve', title: 't', summary: '', reason: '',
  status: 'pending', requestedAt: now, expiresAt: later, decisionNote: null, executedAt: null, ...o,
});

const ROWS = [row(10, {}), row(11, { status: 'approved' }), row(12, { status: 'approved', executedAt: now }), row(13, { expiresAt: before }), row(14, { permission: 'contract.sign' })];

function fakeTx() {
  const q: string[] = [];
  const tx = {
    q,
    conversation: { findUnique: async ({ where }: { where: { id: string } }) => (q.push('conv'), where.id === C ? { id: C, kind: 'direct', contactId: null, assigneeUserId: me, teamId: null } : where.id === HID ? { id: HID, kind: 'direct', contactId: null, assigneeUserId: U(98), teamId: null } : null) },
    aiRun: { findMany: async ({ where }: { where: { conversationId: string } }) => (q.push('runs'), where.conversationId === C ? [{ id: U(50) }] : []) },
    // TIP-015d: id chọn bằng SQL (vị từ domain trước LIMIT) rồi đọc dòng theo id — vẫn số truy vấn cố định.
    $queryRaw: async () => (q.push('approvals'), ROWS.map((r) => ({ id: r.id }))),
    approvalRequest: { findMany: async ({ where }: { where: { id: { in: string[] } } }) => (q.push('rows'), ROWS.filter((r) => where.id.in.includes(r.id))) },
    aiAgent: { findMany: async () => (q.push('agents'), []) },
    conversationAssignee: { findUnique: async () => null },
  };
  return tx;
}
const authz = (perms: string[], owner = false) => ({ userId: me, isOwner: owner, permissions: new Set(perms), scope: { inbox: 'own' }, teamIds: [] }) as unknown as AuthzContext;
const code = (p: Promise<unknown>) => p.then(() => 'ok', (e: { httpStatus?: number }) => e.httpStatus);

describe('conversationApprovals', () => {
  it('ngoài scope → 404 trước khi đọc hàng duyệt', async () => {
    const tx = fakeTx();
    expect(await code(conversationApprovals(tx as never, authz(['inbox.view', 'approvals.decide']), HID, now, 'Asia/Ho_Chi_Minh'))).toBe(404);
    expect(tx.q).toEqual(['conv']);
  });

  it('không có approvals.decide → rỗng, không đọc run / duyệt', async () => {
    const tx = fakeTx();
    expect(await conversationApprovals(tx as never, authz(['inbox.view']), C, now, 'Asia/Ho_Chi_Minh')).toEqual({ items: [], pending: 0 });
    expect(tx.q).toEqual(['conv']);
  });

  it('trạng thái, executed, can_decide theo quyền duyệt action gốc; số truy vấn cố định', async () => {
    const tx = fakeTx();
    const r = await conversationApprovals(tx as never, authz(['inbox.view', 'approvals.decide', 'quote.approve']), C, now, 'Asia/Ho_Chi_Minh');
    const by = Object.fromEntries(r.items.map((x) => [x.id, x]));
    expect(by[U(10)]).toMatchObject({ status: 'pending', can_decide: true });
    expect(by[U(11)]).toMatchObject({ status: 'approved', executed: false });
    expect(by[U(12)]).toMatchObject({ status: 'approved', executed: true });
    expect(by[U(13)]!.status).toBe('expired');
    expect(by[U(14)]!.can_decide).toBe(false);
    expect(r.pending).toBe(2);
    expect(tx.q).toEqual(['conv', 'runs', 'approvals', 'rows']);
  });
});
