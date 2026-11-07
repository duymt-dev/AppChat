// Ma trận conversation.unhide (TIP-025b P1, alias "bỏ" — hiện lại hội thoại đã ẩn). Preview Trợ lý → xác nhận · 403 kế toán · scope (sales own sửa hội thoại người
// khác → 403) · id lạ → 404 · gỡ khi chưa có = không đổi (không bật lại) · ô không áp dụng có lý do theo ActionDef.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let c: { id: string; account: string; message: string };

beforeAll(async () => {
  m = await matrix('conversation.unhide');
  c = await m.conv();
  await m.seed('conversation.hide', { conversation_id: c.id, hidden: true });
}, 120_000);
afterAll(() => m?.close());

describe('conversation.unhide', () => {
  it('403 kế toán · scope sales own · id lạ → 404', async () => {
    expect((await m.act({ conversation_id: c.id }, await m.h.member('accountant'))).status).toBe(403);
    expect([403, 404]).toContain((await m.act({ conversation_id: c.id }, m.sales)).status);
    expect((await m.act({ ...{ conversation_id: c.id }, conversation_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → trạng thái mong muốn', async () => {
    const { preview, done } = await m.confirm({ conversation_id: c.id });
    expect(preview.risk).toBe('write');
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await (await m.db()).conversation.findUniqueOrThrow({ where: { id: c.id } })).hiddenAt).toBeNull();
  });

  it('gọi lại khi đã gỡ → 200 không đổi (không bật lại)', async () => {
    expect((await m.act({ conversation_id: c.id })).status).toBe(200);
    expect((await (await m.db()).conversation.findUniqueOrThrow({ where: { id: c.id } })).hiddenAt).toBeNull();
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
