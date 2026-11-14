// Ma trận message.react (TIP-023b; TIP-014b: Zalo = lệnh bền 202 chờ ACK nhà cung cấp): thả cảm xúc (Zalo hỗ trợ; web chat → 409). Preview Trợ lý → xác nhận · 403 kế toán (không quyền hộp thư) · scope (sales own
// sửa hội thoại người khác → 403) · id lạ → 404 · ô không áp dụng có lý do theo ActionDef.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let c: { id: string; account: string; message: string };

beforeAll(async () => {
  m = await matrix('message.react');
  c = await m.conv({ channel: 'zalo_personal' });
}, 120_000);
afterAll(() => m?.close());

describe('message.react', () => {
  it('403 kế toán · scope sales own · id lạ → 404', async () => {
    expect((await m.act({ conversation_id: c.id, message_id: c.message, emoji: '❤️' }, await m.h.member('accountant'))).status).toBe(403);
    expect((await m.act({ conversation_id: c.id, message_id: c.message, emoji: '❤️' }, m.sales)).status).toBe(403);
    expect((await m.act({ ...{ conversation_id: c.id, message_id: c.message, emoji: '❤️' }, conversation_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận: Zalo = lệnh bền 202 job_accepted (TIP-014b); thiếu tham chiếu phía kênh → 409; web chat → 409', async () => {
    const db = await m.db();
    await db.messageProviderRef.create({ data: { messageId: c.message, partNo: 0, channelAccountId: c.account, threadId: 'zl_khach', isGroup: false, msgId: '7300000001', cliMsgId: '9300000001' } });
    const { preview, done } = await m.confirm({ conversation_id: c.id, message_id: c.message, emoji: '❤️' });
    expect(preview).toEqual({ summary: 'Khách web · ❤️ · Chào shop', risk: 'write', changes: [{ entity: 'message', id: c.message, after: { reaction: '❤️' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(202);
    expect(done.body.data).toMatchObject({ status: 'job_accepted', status_url: `/v1/inbox/channel-operations/${done.body.data.job_id}` });
    expect(await db.channelOperation.findUniqueOrThrow({ where: { id: done.body.data.job_id } })).toMatchObject({ kind: 'react', status: 'queued', desired: { emoji: '❤️' }, revision: 1 });
    // Revision thẻ xem trước đã cũ → 409, xem trước lại.
    expect((await m.act({ conversation_id: c.id, message_id: c.message, emoji: '👍', if_revision: 0 })).status).toBe(409);
    const bare = await m.conv({ channel: 'zalo_personal' });
    expect((await m.act({ conversation_id: bare.id, message_id: bare.message, emoji: '❤️' })).body.error?.fields).toEqual({ message_id: 'provider_ref_missing' });
    const web = await m.conv();
    expect((await m.act({ conversation_id: web.id, message_id: web.message, emoji: '❤️' })).status).toBe(409);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
