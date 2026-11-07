// Ma trận channel_operation.cancel (TIP-014b B): huỷ lệnh thu hồi / cảm xúc còn `queued` trên tin Zalo. Preview Trợ lý → xác nhận · 403 kế
// toán (không quyền hộp thư) · scope (sales own không sửa hội thoại người khác) · id lạ → 404 · lệnh đã gọi kênh (dispatch_reserved) → 409 ·
// (loại lệnh khác bị CHECK của bảng chặn từ DB) · huỷ cảm xúc đưa ý định tài khoản về bản đã xác nhận · ô không áp dụng có lý do.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let c: { id: string; account: string; message: string };

async function op(over: Record<string, unknown> = {}) {
  const id = uuidv7();
  await (await m.db()).channelOperation.create({
    data: { id, kind: 'recall', channelAccountId: c.account, conversationId: c.id, messageId: c.message, actorId: m.h.user, desired: {}, revision: 0, status: 'queued', createdAt: m.h.clock.now(), ...over },
  });
  return id;
}

beforeAll(async () => {
  m = await matrix('channel_operation.cancel');
  c = await m.conv({ channel: 'zalo_personal' });
}, 120_000);
afterAll(() => m?.close());

describe('channel_operation.cancel', () => {
  it('403 kế toán · scope sales own · id lạ → 404', async () => {
    const id = await op();
    expect((await m.act({ operation_id: id }, await m.h.member('accountant'))).status).toBe(403);
    expect((await m.act({ operation_id: id }, m.sales)).status).toBe(403);
    expect((await m.act({ operation_id: uuidv7() })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận: queued → cancelled; lặp lại trả đúng trạng thái', async () => {
    const id = await op();
    const { preview, done } = await m.confirm({ operation_id: id });
    expect(preview).toEqual({ summary: 'Khách web · recall', risk: 'write', changes: [{ entity: 'channel_operation', id, before: { status: 'queued' }, after: { status: 'cancelled' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.data.result).toEqual({ operation_id: id, state: 'cancelled' });
    expect((await (await m.db()).channelOperation.findUniqueOrThrow({ where: { id } })).status).toBe('cancelled');
    expect((await m.act({ operation_id: id })).body.data.result).toEqual({ operation_id: id, state: 'cancelled' });
  });

  it('đã gọi kênh (dispatch_reserved / confirmed) → 409, không đổi', async () => {
    for (const status of ['dispatch_reserved', 'confirmed'] as const) {
      const id = await op({ status });
      const r = await m.act({ operation_id: id });
      expect(r.status).toBe(409);
      expect(r.body.error.fields).toEqual({ operation_id: status });
      expect((await (await m.db()).channelOperation.findUniqueOrThrow({ where: { id } })).status).toBe(status);
    }
  });

  it('huỷ cảm xúc → ý định tài khoản về bản đã xác nhận, revision tăng', async () => {
    const db = await m.db();
    await db.messageAccountReaction.create({ data: { messageId: c.message, channelAccountId: c.account, desiredEmoji: '❤️', desiredRevision: 2, confirmedEmoji: '👍', confirmedRevision: 1 } });
    const id = await op({ kind: 'react', desired: { emoji: '❤️' }, revision: 2 });
    expect((await m.act({ operation_id: id })).status).toBe(200);
    expect(await db.messageAccountReaction.findUniqueOrThrow({ where: { messageId: c.message } })).toMatchObject({ desiredEmoji: '👍', desiredRevision: 3, confirmedRevision: 1 });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
