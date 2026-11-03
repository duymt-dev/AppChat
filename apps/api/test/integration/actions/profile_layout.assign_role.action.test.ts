// Ma trận profile_layout.assign_role (TIP-023b): preview Trợ lý (mẫu trước / sau của vai trò) → xác nhận · mẫu lạ → 404 · 403 (sales). Undo:
// không khai; trạng thái: không có. Gọi lặp cùng giá trị cùng kết quả.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SYSTEM_LAYOUTS } from '@appchat/shared';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let id: string;

beforeAll(async () => {
  m = await matrix('profile_layout.assign_role');
  id = (await m.seed('profile_layout.create', { name: 'Spa VIP', tabs: SYSTEM_LAYOUTS[0]!.tabs() })).layout_id;
}, 120_000);
afterAll(() => m?.close());

describe('profile_layout.assign_role', () => {
  it('preview Trợ lý: mẫu trước / sau → xác nhận', async () => {
    const { preview, done } = await m.confirm({ role: 'sales', layout_id: id });
    expect(preview).toMatchObject({ summary: 'sales · Spa VIP', risk: 'config', changes: [{ entity: 'profile_layout_role', id: 'sales', after: { layout: 'Spa VIP' } }] });
    expect(preview.changes[0].before.layout).not.toBe('Spa VIP');
    expect(done.body.data.result).toEqual({ role: 'sales', layout_id: id });
    expect((await m.act({ role: 'sales', layout_id: id })).body.data.result).toEqual({ role: 'sales', layout_id: id });
  });

  it('mẫu lạ → 404 · 403 sales', async () => {
    expect((await m.act({ role: 'cs', layout_id: 'pl_khong_co' })).status).toBe(404);
    expect((await m.act({ role: 'cs', layout_id: id }, m.sales)).status).toBe(403);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
