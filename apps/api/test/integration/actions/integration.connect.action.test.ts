// Ma trận integration.connect (TIP-023b): kết nối connector (risk config) → tên + cấu hình không bí mật + cảnh báo kiểm kết nối; đã kết nối →
// cảnh báo kết nối lại; "Sắp có" / thiếu trường → 422 ở preview. 403 sales (không có integrations.manage). Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('integration.connect');
}, 120_000);
afterAll(() => m?.close());

describe('integration.connect', () => {
  it('403 sales · Sắp có / thiếu trường → 422', async () => {
    expect((await m.act({ provider: 'casso', fields: { webhook_secret: 'k', account_number: '0071000555666' }, mode: 'sandbox' }, m.sales)).status).toBe(403);
    expect((await m.act({ provider: 'kiotviet', fields: {} }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ provider: 'coming_soon' });
    expect((await m.act({ provider: 'sepay', fields: { api_key: 'sk_1' }, mode: 'sandbox' }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ account_number: 'required' });
  });

  it('preview Trợ lý → xác nhận (không lộ bí mật); kết nối lại → cảnh báo', async () => {
    const fields = { api_key: 'sk_live_SECRET123', account_number: '0123456789' };
    const { preview, done } = await m.confirm({ provider: 'sepay', fields });
    expect(preview).toMatchObject({ risk: 'config', changes: [{ entity: 'integration_connection', after: { connector_key: 'sepay', account_number: '0123456789' } }] });
    expect(JSON.stringify(preview)).not.toContain('SECRET123');
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.confirm({ provider: 'sepay', fields })).preview.warnings).toContain('reconnect');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
