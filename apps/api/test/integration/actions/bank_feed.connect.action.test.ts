// Ma trận bank_feed.connect (TIP-023b): kết nối SePay (risk config, db platform) → nhà cung cấp + số TK (không hiện secret, không gọi provider
// trong preview); thiếu trường bắt buộc → 422 ở preview. 403 sales (không có finance.manage). Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('bank_feed.connect');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
}, 120_000);
afterAll(() => m?.close());

describe('bank_feed.connect', () => {
  it('403 sales · thiếu api_key → 422', async () => {
    expect((await m.act({ provider: 'sepay', fields: { api_key: 'sk', account_number: '1' }, mode: 'sandbox' }, m.sales)).status).toBe(403);
    expect((await m.act({ provider: 'sepay', fields: { account_number: '1' }, mode: 'sandbox' }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ api_key: 'required' });
  });

  it('preview Trợ lý → xác nhận; lần hai cảnh báo kết nối lại', async () => {
    const inp = { provider: 'sepay', fields: { api_key: 'sk_tenant', account_number: '0071 000 123 456' }, mode: 'sandbox' };
    const { preview, done } = await m.confirm(inp);
    expect(preview).toEqual({ summary: 'SePay · 0071000123456', risk: 'config', changes: [{ entity: 'bank_feed', after: { provider: 'sepay', account_no: '0071000123456' } }] });
    expect(JSON.stringify(preview)).not.toContain('sk_tenant');
    expect(done.body.data.result.webhook_path).toMatch(/^\/hooks\/tenant-payments\/sepay\//);
    expect((await m.act(inp, undefined, { 'x-action-source': 'assistant' })).body.data.preview.warnings).toEqual(['reconnect']);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
