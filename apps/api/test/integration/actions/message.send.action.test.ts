// Ma trận message.send (TIP-023b): preview Trợ lý (người nhận + kênh + nội dung, risk send) · xác nhận → tin queued + outbox · idempotency
// (cùng khoá → một tin) · rỗng → 422 · 403 (kế toán) · scope (sales own → 403 SCOPE_FORBIDDEN). Undo: không khai (đã gửi ra kênh);
// trạng thái gửi (sent / failed) kiểm ở inbox test với worker.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let conv: string;

beforeAll(async () => {
  m = await matrix('message.send');
  conv = (await m.conv({ title: 'Chị Mai web' })).id;
}, 120_000);
afterAll(() => m?.close());

describe('message.send', () => {
  it('preview Trợ lý: người nhận + kênh + nội dung; xác nhận → một tin ra + outbox', async () => {
    const { preview, done } = await m.confirm({ conversation_id: conv, text: 'Dạ em chào chị' });
    expect(preview).toEqual({ summary: 'Chị Mai web · webchat · Dạ em chào chị', risk: 'send', changes: [{ entity: 'message', after: { to: 'Chị Mai web', channel: 'webchat', text: 'Dạ em chào chị' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    const db = await m.db();
    const msg = await db.message.findUniqueOrThrow({ where: { id: done.body.data.result.message_id } });
    expect(msg).toMatchObject({ direction: 'out', body: 'Dạ em chào chị' });
    expect(await db.outboxMessage.count({ where: { messageId: msg.id } })).toBe(1);
  });

  it('idempotency: cùng khoá → một tin', async () => {
    const a = await m.actWithKey('send-idem-1', { conversation_id: conv, text: 'Một lần' });
    const b = await m.actWithKey('send-idem-1', { conversation_id: conv, text: 'Một lần' });
    expect(b.body.data.result).toEqual(a.body.data.result);
    expect(await (await m.db()).message.count({ where: { conversationId: conv, body: 'Một lần' } })).toBe(1);
  });

  it('rỗng → 422 · 403 kế toán · scope sales own → 403 SCOPE_FORBIDDEN', async () => {
    expect((await m.act({ conversation_id: conv, text: '  ' })).status).toBe(422);
    expect((await m.act({ conversation_id: conv, text: 'x' }, await m.h.member('accountant'))).status).toBe(403);
    expect((await m.act({ conversation_id: conv, text: 'x' }, m.sales)).body.error.code).toBe('SCOPE_FORBIDDEN');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
