// Ma trận ai.translate_draft (TIP-025b §F.3, model giả): dịch bản nháp sang đích chọn · trả lại draft_revision nguyên văn · lần hai cùng
// nội dung là cache (không run mới) · sales không phụ trách → 404 · kế toán không có inbox.reply → 403 · đích ngoài danh sách → 422 ·
// không cấp cho agent. Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WalletService, uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let c: { id: string; message: string };

beforeAll(async () => {
  m = await matrix('ai.translate_draft');
  await m.h.app.get(WalletService, { strict: false }).topup(m.h.ws, 1000, { refType: 'test', refId: uuidv7() });
  c = await m.conv({ body: 'Hello shop' });
}, 120_000);
afterAll(() => m?.close());

describe('ai.translate_draft', () => {
  it('happy: bản dịch theo đích + revision; lần hai cache, không thêm run', async () => {
    const input = { conversation_id: c.id, text: 'Dạ giá 1.200.000đ ạ', to: 'ja', draft_revision: 7 };
    const r = await m.act(input);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toEqual({ text: '[JA] Dạ giá 1.200.000đ ạ', to: 'ja', draft_revision: 7, cached: false });
    const runs = await (await m.db()).aiRun.count({ where: { title: 'ai.translate_draft' } });
    const again = await m.act({ ...input, draft_revision: 8 });
    expect(again.body.data.result).toMatchObject({ draft_revision: 8, cached: true });
    expect(await (await m.db()).aiRun.count({ where: { title: 'ai.translate_draft' } })).toBe(runs);
  });

  it('scope / quyền / đích lạ', async () => {
    const input = { conversation_id: c.id, text: 'Hi', to: 'en', draft_revision: 1 };
    expect((await m.act(input, m.sales)).status).toBe(404);
    expect((await m.act(input, await m.h.member('accountant'))).status).toBe(403);
    expect((await m.act({ ...input, to: 'fr' })).status).toBe(422);
    expect((await m.act({ ...input, text: 'x'.repeat(4001) })).status).toBe(422);
  });

  it('không cấp cho agent; ô không áp dụng có lý do', () => {
    expect(m.def.agentGrantable).toBe(false);
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'state')).toMatch(/risk read/);
  });
});
