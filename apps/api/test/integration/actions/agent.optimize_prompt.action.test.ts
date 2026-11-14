// Ma trận agent.optimize_prompt (TIP-023b R2, model giả AI_ENGINE=mock): tối ưu prompt, gọi lại với kết quả → giữ nguyên · 403 (sales không có
// agents.manage) · nguồn assistant. Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WalletService, uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('agent.optimize_prompt');
  // Lượt model giả vẫn trừ credit (consult / test) — ví có sẵn để không 402.
  await m.h.app.get(WalletService, { strict: false }).topup(m.h.ws, 1000, { refType: 'test', refId: uuidv7() });
}, 120_000);
afterAll(() => m?.close());

describe('agent.optimize_prompt', () => {
  it('happy: kết quả ổn định khi tối ưu lại', async () => {
    const p1 = (await m.act({ prompt: 'Bạn là trợ lý' })).body.data.result.prompt;
    expect(p1.length).toBeGreaterThan(0);
    expect((await m.act({ prompt: p1 })).body.data.result.prompt).toBe(p1);
  });

  it('403: sales không có agents.manage', async () => {
    expect((await m.act({ prompt: 'x' }, m.sales)).status).toBe(403);
  });

  it('nguồn assistant: risk read chạy ngay (không thẻ xác nhận)', async () => {
    const r = await m.act({ prompt: 'Bạn là trợ lý' }, undefined, { 'x-action-source': 'assistant' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(typeof r.body.data.result.prompt).toBe('string');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'state')).toMatch(/risk read/);
  });
});
