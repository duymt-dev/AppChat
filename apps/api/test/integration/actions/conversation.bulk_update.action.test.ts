// Ma trận conversation.bulk_update (TIP-023b): đổi hàng loạt hội thoại → số hội thoại + thay đổi; undo về trạng thái cũ. bulk: true → gọi
// từ UI cũng qua preview. Không gì để đổi → 422; sales chỉ chọn hội thoại không thấy → 404 (TIP-025b: lỗi từng id, không lộ tồn tại).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let a: { id: string };
let b: { id: string };

beforeAll(async () => {
  m = await matrix('conversation.bulk_update');
  a = await m.conv({ title: 'Khách A' });
  b = await m.conv({ title: 'Khách B' });
}, 120_000);
afterAll(() => m?.close());

describe('conversation.bulk_update', () => {
  it('không gì để đổi → 422 · sales chỉ chọn hội thoại không thấy → 404', async () => {
    expect((await m.act({ conversation_ids: [a.id] }, undefined, { 'x-action-source': 'assistant' })).status).toBe(422);
    const r = await m.act({ conversation_ids: [a.id], status: 'closed' }, m.sales);
    expect([r.status, r.body.error.code]).toEqual([404, 'NOT_FOUND']);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ conversation_ids: [a.id, b.id], status: 'closed' });
    expect(preview).toEqual({ summary: '2', risk: 'write', count: 2, changes: [{ entity: 'conversation', after: { status: 'closed' } }] });
    expect(done.body.data.result).toMatchObject({ updated: 2, failed: 0 });
    expect(done.body.data.result.items.map((x: { status: string }) => x.status)).toEqual(['done', 'done']);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).conversation.findUniqueOrThrow({ where: { id: a.id } })).status).toBe('open');
  });

  it('bulk: gọi từ UI cũng phải qua preview kèm số bản ghi', async () => {
    const r = await m.act({ conversation_ids: [a.id], archive: true });
    expect(r.status, JSON.stringify(r.body)).toBe(202);
    expect(r.body.data.preview.count).toBe(1);
  });
});
