// Ma trận custom_field.delete (TIP-023b): preview Trợ lý (risk delete: nhãn + số khách đang có giá trị — giá trị giữ nguyên) → xác nhận →
// undo khôi phục · trường hệ thống → 422 · khoá lạ → 404 · 403 (sales). Scope: cấu hình workspace.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let key: string;

beforeAll(async () => {
  m = await matrix('custom_field.delete');
  key = (await m.seed('custom_field.define', { entity: 'contact', label: 'Size áo', type: 'text' })).key;
  await m.seed('contact.create', { full_name: 'Chị Size', phone: '0909450001', custom: { [key]: 'M' } });
}, 120_000);
afterAll(() => m?.close());

describe('custom_field.delete', () => {
  it('403 sales · khoá lạ → 404 · trường hệ thống → 422', async () => {
    expect((await m.act({ entity: 'contact', key }, m.sales)).status).toBe(403);
    expect((await m.act({ entity: 'contact', key: 'khong_co' })).status).toBe(404);
    const sys = await (await m.db()).customFieldDef.findFirstOrThrow({ where: { entity: 'contact', sys: true } });
    expect((await m.act({ entity: 'contact', key: sys.key })).status).toBe(422);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ entity: 'contact', key });
    expect(preview).toEqual({ summary: 'contact · Size áo', risk: 'delete', count: 1, changes: [{ entity: 'custom_field', id: key, before: { label: 'Size áo', type: 'text', records: 1 } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    const db = await m.db();
    expect((await db.customFieldDef.findFirstOrThrow({ where: { entity: 'contact', key } })).deletedAt).not.toBeNull();
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await db.customFieldDef.findFirstOrThrow({ where: { entity: 'contact', key } })).deletedAt).toBeNull();
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
