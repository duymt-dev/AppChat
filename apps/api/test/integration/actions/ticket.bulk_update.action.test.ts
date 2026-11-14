// Ma trận ticket.bulk_update (TIP-023b, TIP-034c): hàng loạt (bulk → luôn xem trước, kể cả ui) — số ticket hợp lệ + thay đổi chung; kết quả
// TỪNG id (ticket người khác / id lạ → NOT_FOUND riêng id đó, không chặn cả đợt); hoàn tác thô → 409 UNDO_REQUIRES_ACTION (ticket.bulk_undo).
// 403 kế toán (không có ticket.view / ticket.manage). Luồng đầy đủ: ticket-bulk.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ActionExecutor } from '@appchat/core';
import { authzForRole } from '@appchat/shared';
import { matrix, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let t: { ticket_id: string; code: string };

beforeAll(async () => {
  m = await matrix('ticket.bulk_update');
  t = await m.seed('ticket.create', { title: 'Hoàn tiền buổi lỡ', channel: 'zalo_personal', category: 'Refund', priority: 'high' });
}, 120_000);
afterAll(() => m?.close());

describe('ticket.bulk_update', () => {
  it('403 kế toán · ticket người khác (sales own) / id lạ → NOT_FOUND riêng id, không chặn đợt', async () => {
    expect((await m.act({ ticket_ids: [t.ticket_id], priority: 'low' }, await m.h.member('accountant'))).status).toBe(403);
    const { done } = await m.confirm({ ticket_ids: [t.ticket_id, '0190f000-0000-7000-8000-00000000beef'], priority: 'low' }, m.sales);
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.data.result).toMatchObject({ updated: 0, changed_count: 0, failed: 2 });
    expect(done.body.data.result.outcomes).toEqual([
      { id: t.ticket_id, ok: false, error: { code: 'NOT_FOUND' } },
      { id: '0190f000-0000-7000-8000-00000000beef', ok: false, error: { code: 'NOT_FOUND' } },
    ]);
    expect((await (await m.db()).ticket.findUniqueOrThrow({ where: { id: t.ticket_id } })).priority).toBe('high');
  });

  it('bulk: ui cũng phải xem trước; preview Trợ lý → xác nhận; hoàn tác thô → 409 UNDO_REQUIRES_ACTION', async () => {
    expect((await m.act({ ticket_ids: [t.ticket_id], priority: 'low' })).body.data.status).toBe('preview_required');
    const { preview, done } = await m.confirm({ ticket_ids: [t.ticket_id], priority: 'low' });
    expect(preview).toEqual({ summary: '1', risk: 'write', count: 1, changes: [{ entity: 'ticket', after: { priority: 'low' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.data.result).toMatchObject({ updated: 1, changed_count: 1, failed: 0, outcomes: [{ id: t.ticket_id, ok: true, changed: true }] });
    const u = await m.undo(done.body.data.action_log_id);
    expect(u.status).toBe(409);
    expect(u.body.error).toMatchObject({ code: 'UNDO_REQUIRES_ACTION', fields: { undo_action: 'ticket.bulk_undo' } });
    expect((await (await m.db()).ticket.findUniqueOrThrow({ where: { id: t.ticket_id } })).priority).toBe('low');
  });

  it('bắt buộc Idempotency-Key; không agentGrantable', async () => {
    const r = await m.h.app.get(ActionExecutor, { strict: false }).execute({ workspaceId: m.h.ws, source: 'system', actor: { type: 'system', id: 'x' }, onBehalfOfUserId: m.h.user, authz: authzForRole('owner', m.h.user) }, 'ticket.bulk_update', { ticket_ids: [t.ticket_id], priority: 'low' }).catch((e) => e);
    expect(r).toMatchObject({ code: 'VALIDATION_FAILED', fields: { idempotency_key: 'required' } });
    expect(m.def.agentGrantable).toBe(false);
    expect(m.def.bulk).toBe(true);
  });
});
