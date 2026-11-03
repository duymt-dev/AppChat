// Ma trận integration.register_interest (TIP-023b): đăng ký quan tâm connector "Sắp có" (risk write) → dòng quan tâm mới; gọi lại → không
// đổi; connector đang dùng được → 422, lạ → 404 ở preview. 403 sales (không có integrations.manage). Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('integration.register_interest');
}, 120_000);
afterAll(() => m?.close());

describe('integration.register_interest', () => {
  it('403 sales · lạ → 404 · dùng được → 422', async () => {
    expect((await m.act({ provider: 'kiotviet' }, m.sales)).status).toBe(403);
    expect((await m.act({ provider: 'nope' }, undefined, { 'x-action-source': 'assistant' })).status).toBe(404);
    expect((await m.act({ provider: 'sepay' }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ provider: 'available' });
  });

  it('preview Trợ lý → xác nhận; gọi lại → không đổi', async () => {
    const { preview, done } = await m.confirm({ provider: 'kiotviet' });
    expect(preview).toMatchObject({ risk: 'write', changes: [{ entity: 'integration_interest', after: { connector_key: 'kiotviet' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.confirm({ provider: 'kiotviet' })).preview.changes).toEqual([]);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
