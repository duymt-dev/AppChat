// Ma trận business_profile.update (TIP-023b): khai báo DN lần đầu → hồ sơ mới (+ cảnh báo đổi tên workspace tự tạo); cập nhật → trước / sau
// chỉ trường đổi. 403 sales (không có settings.manage). Cấu hình workspace — không scope. Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
const base = { kind: 'enterprise', tax_code: '0312345678', legal_name: 'CÔNG TY TNHH HƯƠNG SEN', address: '12 Lê Lợi, Q1', business_description: 'Spa' } as const;

beforeAll(async () => {
  m = await matrix('business_profile.update');
  await m.h.platform.workspace.update({ where: { id: m.h.ws }, data: { settings: { auto_named: true } } });
}, 120_000);
afterAll(() => m?.close());

describe('business_profile.update', () => {
  it('403 sales', async () => {
    expect((await m.act(base, m.sales)).status).toBe(403);
  });

  it('khai báo lần đầu → hồ sơ mới + đổi tên workspace; cập nhật → trước / sau', async () => {
    const first = await m.confirm(base);
    expect(first.preview).toEqual({
      summary: 'CÔNG TY TNHH HƯƠNG SEN',
      risk: 'config',
      changes: [{ entity: 'business_profile', after: { kind: 'enterprise', tax_code: '0312345678', legal_name: 'CÔNG TY TNHH HƯƠNG SEN', address: '12 Lê Lợi, Q1', business_description: 'Spa' } }],
      warnings: ['workspace_renamed'],
    });
    expect(first.done.status, JSON.stringify(first.done.body)).toBe(200);
    expect((await m.h.platform.workspace.findUniqueOrThrow({ where: { id: m.h.ws } })).name).toBe('CÔNG TY TNHH HƯƠNG SEN');
    const { preview, done } = await m.confirm({ ...base, address: '30 Hai Bà Trưng, Q1', phone: '0909000111' });
    expect(preview).toEqual({
      summary: 'CÔNG TY TNHH HƯƠNG SEN',
      risk: 'config',
      changes: [{ entity: 'business_profile', id: m.h.ws, before: { address: '12 Lê Lợi, Q1', phone: null }, after: { address: '30 Hai Bà Trưng, Q1', phone: '0909000111' } }],
    });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
