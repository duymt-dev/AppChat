// Ma trận conversation.approvals (TIP-025b §G.1): đọc thẻ duyệt của một hội thoại — hội thoại không có run → rỗng · sales không phụ trách
// → 404 · không cấp cho agent · nguồn assistant chạy ngay (risk read). Dữ liệu thẻ đầy đủ: inbox-approval-cards.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let c: { id: string };

beforeAll(async () => {
  m = await matrix('conversation.approvals');
  c = await m.conv({ body: 'Xin chào' });
}, 120_000);
afterAll(() => m?.close());

describe('conversation.approvals', () => {
  it('happy: hội thoại chưa có run → rỗng; nguồn assistant chạy ngay', async () => {
    const r = await m.act({ conversation_id: c.id }, undefined, { 'x-action-source': 'assistant' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toEqual({ items: [], pending: 0 });
  });

  it('scope: sales không phụ trách → 404; id lạ → 404', async () => {
    expect((await m.act({ conversation_id: c.id }, m.sales)).status).toBe(404);
    expect((await m.act({ conversation_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('không cấp cho agent; ô không áp dụng có lý do', () => {
    expect(m.def.agentGrantable).toBe(false);
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'state')).toMatch(/risk read/);
  });
});
