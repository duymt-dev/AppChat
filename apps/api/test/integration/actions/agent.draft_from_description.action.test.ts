// Ma trận agent.draft_from_description (TIP-023b R2, model giả): bản nháp cấu hình agent từ mô tả (không ghi DB) · 403 (sales không có
// agents.manage) · nguồn assistant. Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WalletService, uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('agent.draft_from_description');
  // Lượt model giả vẫn trừ credit (consult / test) — ví có sẵn để không 402.
  await m.h.app.get(WalletService, { strict: false }).topup(m.h.ws, 1000, { refType: 'test', refId: uuidv7() });
}, 120_000);
afterAll(() => m?.close());

describe('agent.draft_from_description', () => {
  it('happy: bản nháp có tên, không tạo agent', async () => {
    const r = await m.act({ description: 'Agent CSKH cho spa, đặt lịch qua Zalo' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.draft.name.length).toBeGreaterThan(0);
    expect(await (await m.db()).aiAgent.count()).toBe(0);
  });

  it('403: sales không có agents.manage', async () => {
    expect((await m.act({ description: 'Agent bán hàng' }, m.sales)).status).toBe(403);
  });

  it('nguồn assistant: risk read chạy ngay (không thẻ xác nhận)', async () => {
    const r = await m.act({ description: 'Agent bán hàng' }, undefined, { 'x-action-source': 'assistant' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.draft).toBeDefined();
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'state')).toMatch(/risk read/);
  });
});
