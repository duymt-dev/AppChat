// Ma trận agent.test (TIP-023b R2, model giả): chat thử cấu hình nháp (dryRun — tool ghi không chạy thật) · agent lạ → 404 · 403 (sales không
// có agents.manage) · nguồn assistant. Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WalletService, uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('agent.test');
  // Lượt model giả vẫn trừ credit (consult / test) — ví có sẵn để không 402.
  await m.h.app.get(WalletService, { strict: false }).topup(m.h.ws, 1000, { refType: 'test', refId: uuidv7() });
}, 120_000);
afterAll(() => m?.close());

describe('agent.test', () => {
  it('happy: trả lời, tool ghi không tạo dữ liệu', async () => {
    const r = await m.act({ config: { name: 'Thử', tools: ['ticket.create'] }, text: 'Giá liệu trình bao nhiêu?' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(typeof r.body.data.result.reply).toBe('string');
    expect(await (await m.db()).ticket.count()).toBe(0);
  });

  it('agent lạ → 404 · 403 sales', async () => {
    expect((await m.act({ agent_id: '0190f000-0000-7000-8000-00000000beef', text: 'x' })).status).toBe(404);
    expect((await m.act({ config: { name: 'X' }, text: 'x' }, m.sales)).status).toBe(403);
  });

  it('nguồn assistant: risk read chạy ngay (không thẻ xác nhận)', async () => {
    const r = await m.act({ config: { name: 'Thử' }, text: 'Chào' }, undefined, { 'x-action-source': 'assistant' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(typeof r.body.data.result.reply).toBe('string');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'state')).toMatch(/risk read/);
  });
});
