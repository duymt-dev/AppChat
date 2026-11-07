// Ma trận bank_feed.disconnect (TIP-023b): ngắt SePay (risk config, db platform) → nhà cung cấp + số TK + cảnh báo giao dịch mới không tự khớp;
// chưa kết nối → 404 ở preview. 403 sales. Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('bank_feed.disconnect');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
}, 120_000);
afterAll(() => m?.close());

describe('bank_feed.disconnect', () => {
  it('403 sales · chưa kết nối → 404', async () => {
    expect((await m.act({ provider: 'sepay' }, m.sales)).status).toBe(403);
    expect((await m.act({ provider: 'sepay' }, undefined, { 'x-action-source': 'assistant' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận', async () => {
    const feed = (await m.seed('bank_feed.connect', { provider: 'sepay', fields: { api_key: 'sk_tenant', account_number: '0071000123456' } })).feed_id;
    const { preview, done } = await m.confirm({ provider: 'sepay' });
    expect(preview).toEqual({ summary: 'SePay · 0071000123456', risk: 'config', changes: [{ entity: 'bank_feed', id: feed, before: { provider: 'sepay', status: 'active' }, after: { status: 'disconnected' } }], warnings: ['auto_match_off'] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(await m.h.platform.tenantBankFeedRoute.count({ where: { feedId: feed } })).toBe(0);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
