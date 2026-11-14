// Ma trận ticket.bulk_item (TIP-034c): con RIÊNG (003c exposure=internal) của thao tác ticket hàng loạt. HTTP (ui / assistant) → 403 dù là Owner;
// header system → 422 (HTTP chỉ nhận ui / assistant / api); ẩn khỏi Trợ lý + tool agent; không ticket nào đổi. Luồng thật (capability
// niêm phong, biên nhận, chạy lại / hai worker): ticket-bulk.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assistantAllows, uuidv7 } from '@appchat/core';
import { authzForRole } from '@appchat/shared';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let t: { ticket_id: string; code: string };

beforeAll(async () => {
  m = await matrix('ticket.bulk_item');
  t = await m.seed('ticket.create', { title: 'Con riêng', channel: 'email', category: 'Refund', priority: 'medium' });
}, 120_000);
afterAll(() => m?.close());

describe('ticket.bulk_item', () => {
  it('Owner qua HTTP (ui / assistant) → 403; header system → 422; ticket không đổi', async () => {
    const input = { job_id: uuidv7(), seq: 0, ticket_id: t.ticket_id, fence: 1 };
    expect((await m.act(input)).status).toBe(403);
    expect((await m.act(input, undefined, { 'x-action-source': 'assistant' })).status).toBe(403);
    expect((await m.act(input, undefined, { 'x-action-source': 'system' })).status).toBe(422);
    expect((await (await m.db()).ticket.findUniqueOrThrow({ where: { id: t.ticket_id } })).version).toBe(1);
  });

  it('internal, không agentGrantable, ẩn khỏi Trợ lý kể cả Owner', () => {
    expect(m.def.exposure).toBe('internal');
    expect(m.def.agentGrantable).toBe(false);
    expect(assistantAllows(m.def, authzForRole('owner', 'u1'))).toBe(false);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
