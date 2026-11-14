// Ma trận integration.update_settings (TIP-031c): cập nhật cấu hình đồng bộ `stock_master` (risk config) cho kết nối `order_sync`.
// 200 Owner + preview assistant · 403 sales · 404 chưa kết nối / workspace khác · 422 kết nối không phải port order_sync (sepay).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startApi, call, type Harness } from '../setup';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let other: Harness;

beforeAll(async () => {
  m = await matrix('integration.update_settings');
  other = await startApi();
}, 120_000);
afterAll(async () => {
  await other?.close();
  await m?.close();
});

describe('integration.update_settings', () => {
  it('chưa kết nối → 404; không phải order_sync (sepay) → 422; sales → 403', async () => {
    expect((await m.act({ provider: 'mock_marketplace', stock_master: 'external' })).status).toBe(404);
    await m.seed('integration.connect', { provider: 'sepay', fields: { api_key: 'sk_live_1', account_number: '0123456789' }, mode: 'sandbox' });
    const badPort = await m.act({ provider: 'sepay', stock_master: 'external' });
    expect(badPort.status).toBe(422);
    expect(badPort.body.error.fields).toEqual({ provider: 'not_order_sync' });
    expect((await m.act({ provider: 'sepay', stock_master: 'external' }, m.sales)).status).toBe(403);
  });

  it('preview Trợ lý → xác nhận (risk config, không chạm bí mật) + cô lập tenant khác → 404', async () => {
    await m.seed('integration.connect', { provider: 'mock_marketplace', fields: { api_key: 'mk_s1', shop_id: 'shop_1' }, mode: 'sandbox' });
    const { preview, done } = await m.confirm({ provider: 'mock_marketplace', stock_master: 'external' });
    expect(preview).toMatchObject({
      risk: 'config',
      changes: [{ entity: 'integration_connection', before: { stock_master: 'appchat' }, after: { stock_master: 'external' } }],
    });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.data.result).toMatchObject({ stock_master: 'external' });

    const r = await call(other, '/actions/integration.update_settings', { input: { provider: 'mock_marketplace', stock_master: 'appchat' } }, { 'idempotency-key': 'iso-1' });
    expect(r.status).toBe(404);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
