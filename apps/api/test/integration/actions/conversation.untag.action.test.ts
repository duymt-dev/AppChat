// Ma trận conversation.untag (TIP-025b P1, alias "bỏ" — gỡ đúng một thẻ). Preview Trợ lý → xác nhận · 403 kế toán · scope (sales own sửa hội thoại người
// khác → 403) · id lạ → 404 · gỡ khi chưa có = không đổi (không bật lại) · ô không áp dụng có lý do theo ActionDef.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let c: { id: string; account: string; message: string };

beforeAll(async () => {
  m = await matrix('conversation.untag');
  c = await m.conv();
  await m.seed('conversation.tag', { conversation_id: c.id, tag: 'VIP' });
  await m.seed('conversation.tag', { conversation_id: c.id, tag: 'Mới' });
}, 120_000);
afterAll(() => m?.close());

const tags = async () => {
  const t = await m.db();
  const ids = (await t.conversationTag.findMany({ where: { conversationId: c.id } })).map((x) => x.tagId);
  return (await t.tag.findMany({ where: { id: { in: ids } } })).map((x) => x.name);
};

describe('conversation.untag', () => {
  it('403 kế toán · scope sales own · id lạ → 404', async () => {
    expect((await m.act({ conversation_id: c.id, tag: 'VIP' }, await m.h.member('accountant'))).status).toBe(403);
    expect([403, 404]).toContain((await m.act({ conversation_id: c.id, tag: 'VIP' }, m.sales)).status);
    expect((await m.act({ ...{ conversation_id: c.id, tag: 'VIP' }, conversation_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → trạng thái mong muốn', async () => {
    const { preview, done } = await m.confirm({ conversation_id: c.id, tag: 'VIP' });
    expect(preview.risk).toBe('write');
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(await tags()).toEqual(['Mới']);
  });

  it('gọi lại khi đã gỡ → 200 không đổi (không bật lại)', async () => {
    expect((await m.act({ conversation_id: c.id, tag: 'VIP' })).status).toBe(200);
    expect(await tags()).toEqual(['Mới']);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
