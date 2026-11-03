// Ma trận custom_field.update (TIP-023b): preview Trợ lý (trước / sau theo khoá) → xác nhận · khoá lạ → 404 · đổi nhãn trường hệ thống → 422
// · 403 (sales). Scope: cấu hình workspace. Undo: không khai; trạng thái: không có.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let key: string;

beforeAll(async () => {
  m = await matrix('custom_field.update');
  key = (await m.seed('custom_field.define', { entity: 'contact', label: 'Size áo', type: 'text' })).key;
}, 120_000);
afterAll(() => m?.close());

describe('custom_field.update', () => {
  it('preview Trợ lý: trước / sau theo khoá → xác nhận', async () => {
    const { preview, done } = await m.confirm({ entity: 'contact', fields: [{ key, required: true }] });
    expect(preview).toEqual({ summary: 'contact · 1', risk: 'config', count: 1, changes: [{ entity: 'custom_field', id: key, before: { required: false }, after: { required: true } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await (await m.db()).customFieldDef.findFirstOrThrow({ where: { entity: 'contact', key } })).required).toBe(true);
  });

  it('khoá lạ → 404 · nhãn trường hệ thống → 422 · 403 sales', async () => {
    expect((await m.act({ entity: 'contact', fields: [{ key: 'khong_co', required: true }] })).status).toBe(404);
    const sys = await (await m.db()).customFieldDef.findFirstOrThrow({ where: { entity: 'contact', sys: true } });
    expect((await m.act({ entity: 'contact', fields: [{ key: sys.key, label: 'Đổi tên' }] })).status).toBe(422);
    expect((await m.act({ entity: 'contact', fields: [{ key, required: false }] }, m.sales)).status).toBe(403);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
