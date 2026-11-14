// Ma trận ticket_categories.get (TIP-034b §1.3): happy (bản ảo version 0 — 8 nhãn prototype, không ghi) · 403 (sales / cs không có
// settings.manage) · scope: cấu hình workspace (không có bản ghi theo người) · nguồn agent bị chặn (agentGrantable false), assistant chạy
// ngay (risk read). Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_CATEGORY_LABELS } from '@appchat/shared';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('ticket_categories.get');
}, 120_000);
afterAll(() => m?.close());

describe('ticket_categories.get', () => {
  it('happy: version 0 = 8 nhãn prototype, không ghi dòng cấu hình', async () => {
    const r = await m.act({});
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toEqual({ version: 0, labels: [...DEFAULT_CATEGORY_LABELS], default: DEFAULT_CATEGORY_LABELS[0] });
    expect(await (await m.db()).ticketCategoryConfig.count()).toBe(0);
  });

  it('403: sales / cs không có settings.manage', async () => {
    expect((await m.act({}, m.sales)).status).toBe(403);
    expect((await m.act({}, m.cs)).status).toBe(403);
  });

  it('nguồn: agent bị chặn; assistant chạy ngay', async () => {
    expect((await m.act({}, undefined, { 'x-action-source': 'agent' })).status).toBeGreaterThanOrEqual(400);
    expect((await m.act({}, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'state')).toMatch(/risk read/);
  });
});
