// Ma trận message.unpin (TIP-025b P1, alias "bỏ" — bỏ ghim tin). Preview Trợ lý → xác nhận · 403 kế toán · scope (sales own sửa hội thoại người
// khác → 403) · id lạ → 404 · gỡ khi chưa có = không đổi (không bật lại) · ô không áp dụng có lý do theo ActionDef.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let c: { id: string; account: string; message: string };

beforeAll(async () => {
  m = await matrix('message.unpin');
  c = await m.conv();
  await m.seed('message.pin', { conversation_id: c.id, message_id: c.message, pinned: true });
}, 120_000);
afterAll(() => m?.close());

describe('message.unpin', () => {
  it('403 kế toán · scope sales own · id lạ → 404', async () => {
    expect((await m.act({ conversation_id: c.id, message_id: c.message }, await m.h.member('accountant'))).status).toBe(403);
    expect([403, 404]).toContain((await m.act({ conversation_id: c.id, message_id: c.message }, m.sales)).status);
    expect((await m.act({ ...{ conversation_id: c.id, message_id: c.message }, conversation_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → trạng thái mong muốn', async () => {
    const { preview, done } = await m.confirm({ conversation_id: c.id, message_id: c.message });
    expect(preview.risk).toBe('write');
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await (await m.db()).conversation.findUniqueOrThrow({ where: { id: c.id } })).pinnedMessageId).toBeNull();
  });

  it('gọi lại khi đã gỡ → 200 không đổi (không bật lại)', async () => {
    expect((await m.act({ conversation_id: c.id, message_id: c.message })).status).toBe(200);
    expect((await (await m.db()).conversation.findUniqueOrThrow({ where: { id: c.id } })).pinnedMessageId).toBeNull();
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
