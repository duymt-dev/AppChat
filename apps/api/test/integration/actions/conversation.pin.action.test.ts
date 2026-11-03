// Ma trận conversation.pin (TIP-023b): ghim hội thoại. Preview Trợ lý → xác nhận · 403 kế toán (không quyền hộp thư) · scope (sales own
// sửa hội thoại người khác → 403) · id lạ → 404 · ô không áp dụng có lý do theo ActionDef.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let c: { id: string; account: string; message: string };

beforeAll(async () => {
  m = await matrix('conversation.pin');
  c = await m.conv();
}, 120_000);
afterAll(() => m?.close());

describe('conversation.pin', () => {
  it('403 kế toán · scope sales own · id lạ → 404', async () => {
    expect((await m.act({ conversation_id: c.id, pinned: true }, await m.h.member('accountant'))).status).toBe(403);
    expect((await m.act({ conversation_id: c.id, pinned: true }, m.sales)).status).toBe(403);
    expect((await m.act({ ...{ conversation_id: c.id, pinned: true }, conversation_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận', async () => {
    const { preview, done } = await m.confirm({ conversation_id: c.id, pinned: true });
    expect(preview).toEqual({ summary: 'Khách web', risk: 'write', changes: [{ entity: 'conversation', id: c.id, before: { pinned: false }, after: { pinned: true } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await (await m.db()).conversation.findUniqueOrThrow({ where: { id: c.id } })).pinned).toBe(true);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
