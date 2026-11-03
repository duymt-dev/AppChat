// Ma trận ai.translate (TIP-023b R2, model giả): dịch tin trong hội thoại được phép · tin không thuộc hội thoại → 404 · scope (sales own không
// đọc hội thoại không phụ trách) · nguồn assistant. Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WalletService, uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let c: { id: string; message: string };

beforeAll(async () => {
  m = await matrix('ai.translate');
  // Lượt model giả vẫn trừ credit (consult / test) — ví có sẵn để không 402.
  await m.h.app.get(WalletService, { strict: false }).topup(m.h.ws, 1000, { refType: 'test', refId: uuidv7() });
  c = await m.conv({ body: 'Chào shop' });
}, 120_000);
afterAll(() => m?.close());

describe('ai.translate', () => {
  it('happy: bản dịch theo `to`', async () => {
    expect((await m.act({ conversation_id: c.id, message_id: c.message, to: 'en' })).body.data.result).toEqual({ text: '[EN] Chào shop', to: 'en' });
  });

  it('tin lạ → 404 · sales không phụ trách → 404', async () => {
    expect((await m.act({ conversation_id: c.id, message_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
    expect((await m.act({ conversation_id: c.id, message_id: c.message, to: 'en' }, m.sales)).status).toBe(404);
  });

  it('nguồn assistant: risk read chạy ngay (không thẻ xác nhận)', async () => {
    const r = await m.act({ conversation_id: c.id, message_id: c.message, to: 'en' }, undefined, { 'x-action-source': 'assistant' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.to).toBe('en');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'state')).toMatch(/risk read/);
  });
});
