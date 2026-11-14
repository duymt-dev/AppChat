// Ma trận ticket_categories.replace (TIP-034b §1.3–1.5): preview Trợ lý (trước / sau + thêm / bớt + cảnh báo ticket cũ giữ nguyên) →
// xác nhận · 403 (sales / cs không có settings.manage) · scope: cấu hình workspace · agent bị chặn (agentGrantable false) · 409 version lệch
// · idempotency (cùng khoá không thay hai lần) · undo 24h khôi phục bộ trước ở version mới.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_CATEGORY_LABELS } from '@appchat/shared';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('ticket_categories.replace');
}, 120_000);
afterAll(() => m?.close());

describe('ticket_categories.replace', () => {
  it('preview Trợ lý → xác nhận; undo khôi phục 8 nhãn ở version 2', async () => {
    const { preview, done } = await m.confirm({ labels: ['Hoàn tiền', 'Khác'], if_version: 0 });
    expect(preview).toMatchObject({ risk: 'config', count: 2, warnings: ['existing_tickets_unchanged'] });
    expect(preview.changes[0]).toMatchObject({ entity: 'ticket_category_config', before: { labels: [...DEFAULT_CATEGORY_LABELS], version: 0 }, after: { labels: ['Hoàn tiền', 'Khác'], default: 'Hoàn tiền' } });
    expect(preview.summary).not.toBe('');
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.data.result).toEqual({ version: 1, labels: ['Hoàn tiền', 'Khác'], default: 'Hoàn tiền' });
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    const row = await (await m.db()).ticketCategoryConfig.findFirstOrThrow();
    expect(row).toMatchObject({ version: 2, labels: [...DEFAULT_CATEGORY_LABELS] });
  });

  it('403 sales / cs; agent bị chặn', async () => {
    expect((await m.act({ labels: ['A'], if_version: 2 }, m.sales)).status).toBe(403);
    expect((await m.act({ labels: ['A'], if_version: 2 }, m.cs)).status).toBe(403);
    expect((await m.act({ labels: ['A'], if_version: 2 }, undefined, { 'x-action-source': 'agent' })).status).toBeGreaterThanOrEqual(400);
  });

  it('409 version lệch; cùng Idempotency-Key gọi hai lần → một lần thay', async () => {
    expect((await m.act({ labels: ['A'], if_version: 0 })).body.error).toMatchObject({ code: 'STALE_VERSION', fields: { version: '2' } });
    const key = uuidv7();
    const a = await m.actWithKey(key, { labels: ['Lặp'], if_version: 2 });
    const b = await m.actWithKey(key, { labels: ['Lặp'], if_version: 2 });
    expect(a.status, JSON.stringify(a.body)).toBe(200);
    expect(b.body.data.result).toEqual(a.body.data.result);
    expect((await (await m.db()).ticketCategoryConfig.findFirstOrThrow()).version).toBe(3);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
