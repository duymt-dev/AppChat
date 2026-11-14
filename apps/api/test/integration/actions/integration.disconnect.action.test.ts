// Ma trận integration.disconnect (TIP-023b): ngắt connector (risk delete) → trạng thái → disconnected + cảnh báo xoá bí mật / webhook ngừng;
// chưa kết nối → 404 ở preview. 403 sales (không có integrations.manage). Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('integration.disconnect');
  await m.seed('integration.connect', { provider: 'casso', fields: { webhook_secret: 'ck_1', account_number: '0071000555666' }, mode: 'sandbox' });
}, 120_000);
afterAll(() => m?.close());

describe('integration.disconnect', () => {
  it('403 sales · chưa kết nối → 404', async () => {
    expect((await m.act({ provider: 'casso' }, m.sales)).status).toBe(403);
    expect((await m.act({ provider: 'sepay' }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ provider: 'not_connected' });
  });

  it('preview Trợ lý → xác nhận', async () => {
    const { preview, done } = await m.confirm({ provider: 'casso' });
    expect(preview).toMatchObject({ risk: 'delete', changes: [{ entity: 'integration_connection', before: { connector_key: 'casso', status: 'connected' }, after: { status: 'disconnected' } }], warnings: ['secrets_erased', 'webhook_stopped'] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
