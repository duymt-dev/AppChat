// TIP-034c §2.2 / §2.3 / §2.6 — phần thuần của ghi một ticket (không DB thật: tx giả ghi lại lệnh). Patch kết hợp chỉ UPDATE trường đổi,
// no-op không ghi / không event, biên nhận chỉ chứa trường đã đổi + dấu vân tay; hoàn tác có canh gác: lệch version / dấu (ABA) → 409,
// khôi phục chỉ trường đã đổi; map hoàn tác trung lập ở kernel; nguồn `$ref` GenUI đọc lại biên nhận theo quyền hiện hành. Luồng thật trên
// Postgres: apps/api/test/integration/ticket-bulk.test.ts.
import { describe, expect, it } from 'vitest';
import { applyTicketPatch, fieldValues, fingerprintOf, revertTicketPatch } from '../src/support/bulk/mutations';
import { registerUndoAction, undoActionOf } from '../src/kernel/actions/undo-action-registry';
import type { ActionContext, TenantTx } from '../src/kernel/actions/action-context';
import type { TenantDb } from '@appchat/db';
import { authzForRole } from '@appchat/shared';
import { REF_UNAVAILABLE, registerRefSource, resolveRefs } from '../src/ai/assistant/genui/refs';
import { bulkRefSource } from '../src/support/bulk/results';

const NOW = new Date('2026-11-13T08:00:00Z');
const U1 = '0190f3a2-7b1c-7d10-9a5e-4c2b1f0e9a01';
const U2 = '0190f3a2-7b1c-7d10-9a5e-4c2b1f0e9a02';
const ctx = { workspaceId: 'ws', source: 'ui', actor: { type: 'user', id: U1 }, authz: { isOwner: true } } as unknown as ActionContext;
const actor = { type: 'user', id: U1, name: 'Chủ' };

function ticket(over: Record<string, unknown> = {}) {
  return { id: 't1', code: 'TKT-1', title: 'A', contactId: null, conversationId: null, assigneeUserId: U1, assigneeAgentId: null, teamId: null, status: 'open', priority: 'medium', createdByType: 'user', createdById: U1, version: 3, ...over } as never;
}

function fakeTx(row: Record<string, unknown>) {
  const calls: { op: string; data: Record<string, unknown> }[] = [];
  const tx = {
    ticket: { update: async (a: { data: Record<string, unknown> }) => (calls.push({ op: 'update', data: a.data }), { ...row, ...a.data, version: (row.version as number) + 1 }) },
    ticketEvent: { create: async (a: { data: Record<string, unknown> }) => (calls.push({ op: 'event', data: a.data }), a.data) },
  } as unknown as TenantTx;
  return { tx, calls };
}

describe('applyTicketPatch', () => {
  it('patch kết hợp: một UPDATE chỉ trường đổi; lịch sử từng trường; biên nhận chỉ trường đã đổi', async () => {
    const t = ticket();
    const { tx, calls } = fakeTx(t);
    const r = await applyTicketPatch(ctx, tx, t, { cols: { assigneeUserId: U2, assigneeAgentId: null }, priority: 'high' }, actor, NOW);
    expect(calls.filter((c) => c.op === 'update')).toEqual([{ op: 'update', data: { assigneeUserId: U2, assigneeAgentId: null, priority: 'high', updatedAt: NOW } }]);
    expect(calls.filter((c) => c.op === 'event').map((c) => c.data.type)).toEqual(['assigned', 'priority']);
    expect(r.changed).toBe(true);
    expect(r.row.version).toBe(4);
    expect(r.receipt).toMatchObject({ fields: ['assignee', 'priority'], before: { assignee: { user: U1, agent: null }, priority: 'medium' }, after: { assignee: { user: U2, agent: null }, priority: 'high' } });
    expect(r.events.map((e) => e.topic)).toEqual(['ticket.assigned']);
    // Không lộ dữ liệu ngoài trường đã đổi (không title / mô tả trong biên nhận).
    expect(JSON.stringify(r.receipt)).not.toContain('"A"');
  });

  it('chỉ một trường đổi → biên nhận một trường; đã đúng giá trị → no-op (không UPDATE, không event)', async () => {
    const t = ticket({ priority: 'high' });
    const a = fakeTx(t);
    const r = await applyTicketPatch(ctx, a.tx, t, { cols: { assigneeUserId: U2, assigneeAgentId: null }, priority: 'high' }, actor, NOW);
    expect(r.receipt!.fields).toEqual(['assignee']);
    const b = fakeTx(t);
    const n = await applyTicketPatch(ctx, b.tx, t, { cols: { assigneeUserId: U1, assigneeAgentId: null }, priority: 'high' }, actor, NOW);
    expect(n).toMatchObject({ changed: false, receipt: null, events: [] });
    expect(b.calls).toEqual([]);
  });
});

describe('revertTicketPatch — hoàn tác có canh gác', () => {
  const receipt = { fields: ['priority' as const], before: { priority: 'medium' }, after: { priority: 'high' }, fingerprint: fingerprintOf(['priority'], { priority: 'high' }) };
  const restore = async () => ({ assigneeUserId: U1, assigneeAgentId: null });

  it('đúng version + dấu → khôi phục CHỈ trường đã đổi', async () => {
    const t = ticket({ priority: 'high', version: 4, assigneeUserId: U2 });
    const { tx, calls } = fakeTx(t);
    await revertTicketPatch(tx, t, { receipt, afterVersion: 4 }, restore, NOW);
    expect(calls).toEqual([{ op: 'update', data: { priority: 'medium', updatedAt: NOW } }]);
  });

  it('version khác (ABA: giá trị giống nhưng đã sửa) → 409; dấu khác → 409; không ghi', async () => {
    for (const t of [ticket({ priority: 'high', version: 6 }), ticket({ priority: 'low', version: 4 })]) {
      const { tx, calls } = fakeTx(t);
      await expect(revertTicketPatch(tx, t, { receipt, afterVersion: 4 }, restore, NOW)).rejects.toMatchObject({ code: 'CONFLICT' });
      expect(calls).toEqual([]);
    }
  });

  it('dấu vân tay theo đúng trường + thứ tự; fieldValues tách người / agent', () => {
    expect(fingerprintOf(['priority'], { priority: 'high' })).not.toBe(fingerprintOf(['priority'], { priority: 'low' }));
    expect(fieldValues(ticket({ assigneeUserId: null, assigneeAgentId: U2 }))).toEqual({ assignee: { user: null, agent: U2 }, priority: 'medium' });
  });
});

describe('undo-action-registry (kernel trung lập)', () => {
  it('map cha → action hoàn tác; đăng ký lại cùng giá trị được, khác giá trị → lỗi', () => {
    registerUndoAction('x.bulk_update', 'x.bulk_undo');
    registerUndoAction('x.bulk_update', 'x.bulk_undo');
    expect(undoActionOf('x.bulk_update')).toBe('x.bulk_undo');
    expect(undoActionOf('x.update')).toBeUndefined();
    expect(() => registerUndoAction('x.bulk_update', 'y.undo')).toThrow(/Trùng/);
  });
});

describe('GenUI $ref — kết quả hàng loạt đọc lại từ biên nhận theo quyền hiện hành', () => {
  const JOB = '0190f3a2-7b1c-7d10-9a5e-4c2b1f0e9a99';
  const T1 = '0190f3a2-7b1c-7d10-9a5e-4c2b1f0e9b01';
  const T2 = '0190f3a2-7b1c-7d10-9a5e-4c2b1f0e9b02';
  const owner = authzForRole('owner', U1);
  const step = { idx: 3, actionId: 'call_action', input: { action_id: 'ticket.bulk_update', input: {} }, output: { kind: 'ok', output: { operation: { job_id: JOB } } }, status: 'ok' };
  function db(o: { actorId?: string; t2Assignee?: string } = {}) {
    return {
      aiRun: { findUnique: async () => ({ kind: 'assistant', initiatedByUserId: U1 }) },
      aiRunStep: { findMany: async () => [step] },
      dataJob: { findUnique: async () => ({ id: JOB, kind: 'ticket.bulk_update', status: 'completed', total: 2, input: { ids: [T1, T2], duplicates: 0 }, actorId: o.actorId ?? U1, actionId: 'ticket.bulk_update' }) },
      dataJobItem: { findMany: async () => [{ targetId: T1, status: 'done', outcomeCode: null, error: null, changed: true }, { targetId: T2, status: 'done', outcomeCode: null, error: null, changed: true }] },
      ticket: { findMany: async () => [{ id: T1, assigneeUserId: U1, teamId: null, createdByType: 'user', createdById: U1, contactId: null }, { id: T2, assigneeUserId: o.t2Assignee ?? U1, teamId: null, createdByType: 'user', createdById: U2, contactId: null }] },
      $queryRaw: async () => [],
    } as unknown as TenantDb;
  }
  registerRefSource('ticket.bulk_update', bulkRefSource);

  it('chủ run + người tạo việc: ref trả số đọc từ biên nhận (không bản output đã lưu)', async () => {
    const r = await resolveRefs(db(), { runId: 'r1', userId: U1, authz: owner, refs: ['step:3.changed_count', 'step:3.outcomes'] });
    expect(r['step:3.changed_count']).toBe(2);
    expect(r['step:3.outcomes']).toEqual([{ id: T1, ok: true, changed: true }, { id: T2, ok: true, changed: true }]);
  });

  it('ticket nay ngoài phạm vi (sales own) → chỉ id + NOT_FOUND, tổng đếm lại; việc của người khác / mất quyền → unavailable', async () => {
    const sales = authzForRole('sales', U1);
    const r = await resolveRefs(db({ t2Assignee: U2 }), { runId: 'r1', userId: U1, authz: sales, refs: ['step:3.changed_count', 'step:3.outcomes.1'] });
    expect(r['step:3.changed_count']).toBe(1);
    expect(r['step:3.outcomes.1']).toEqual({ id: T2, ok: false, error: { code: 'NOT_FOUND' } });
    expect(await resolveRefs(db({ actorId: U2 }), { runId: 'r1', userId: U1, authz: owner, refs: ['step:3.changed_count'] })).toEqual({ 'step:3.changed_count': REF_UNAVAILABLE });
    const none = { ...owner, isOwner: false, permissions: new Set<never>() };
    expect(await resolveRefs(db(), { runId: 'r1', userId: U1, authz: none, refs: ['step:3.changed_count'] })).toEqual({ 'step:3.changed_count': REF_UNAVAILABLE });
  });
});
