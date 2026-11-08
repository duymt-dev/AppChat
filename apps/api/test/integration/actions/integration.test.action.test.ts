// Ma trận integration.test (TIP-023c G3, DEF-012-1): kiểm thông tin đăng nhập KHÔNG lưu — bản nháp ok / failed (lý do đã làm sạch),
// thiếu trường → 422, "Sắp có" → unsupported, không có kết nối → not_connected, kết nối hiện có → ok. Không tạo dòng kết nối; bí mật
// bị che ở action_log. 403 sales (không có integrations.manage, chặn trước adapter). Undo / idempotency: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('integration.test');
}, 120_000);
afterAll(() => m?.close());

describe('integration.test', () => {
  it('bản nháp: ok / failed đã làm sạch / thiếu trường 422 — không lưu, che bí mật', async () => {
    const db = await m.db();
    const ok = await m.act({ provider: 'sepay', fields: { api_key: 'sk_SECRET_OK', account_number: '0123' }, mode: 'sandbox' }, undefined, { 'x-action-source': 'assistant' });
    expect(ok.status, JSON.stringify(ok.body)).toBe(200);
    expect(ok.body.data.result).toEqual({ status: 'ok' });
    const bad = await m.act({ provider: 'sepay', fields: { api_key: 'bad_key', account_number: '0123' }, mode: 'sandbox' });
    expect(bad.body.data.result).toEqual({ status: 'failed', reason: 'rejected' });
    expect(JSON.stringify(bad.body)).not.toContain('bị từ chối');
    expect((await m.act({ provider: 'sepay', fields: { api_key: 'k' }, mode: 'sandbox' })).body.error.fields).toEqual({ account_number: 'required' });
    expect(await db.integrationConnection.count()).toBe(0);
    const logs = await db.actionLog.findMany({ where: { actionId: 'integration.test' }, select: { input: true } });
    expect(logs.length).toBeGreaterThan(0);
    expect(JSON.stringify(logs)).not.toContain('sk_SECRET_OK');
  });

  it('Sắp có → unsupported · chưa kết nối → not_connected · kết nối hiện có → ok', async () => {
    expect((await m.act({ provider: 'kiotviet', fields: {} })).body.data.result).toEqual({ status: 'unsupported', reason: 'coming_soon' });
    expect((await m.act({ provider: 'casso' })).body.data.result).toEqual({ status: 'not_connected' });
    await m.seed('integration.connect', { provider: 'casso', fields: { webhook_secret: 'ck_live', account_number: '9' }, mode: 'sandbox' });
    expect((await m.act({ provider: 'casso' })).body.data.result).toEqual({ status: 'ok' });
  });

  it('403 sales (trước adapter)', async () => {
    expect((await m.act({ provider: 'sepay', fields: { api_key: 'bad', account_number: '1' }, mode: 'sandbox' }, m.sales)).status).toBe(403);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
