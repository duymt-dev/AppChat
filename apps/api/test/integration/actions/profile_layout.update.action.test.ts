// Ma trận profile_layout.update (TIP-023b): preview Trợ lý (tên trước / sau) → xác nhận · id lạ → 404 · 403 (sales). Scope: cấu hình
// workspace. Undo: không khai; trạng thái: không có. Gọi lặp cùng giá trị cùng kết quả.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SYSTEM_LAYOUTS } from '@appchat/shared';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let id: string;

beforeAll(async () => {
  m = await matrix('profile_layout.update');
  id = (await m.seed('profile_layout.create', { name: 'Spa VIP', tabs: SYSTEM_LAYOUTS[0]!.tabs() })).layout_id;
}, 120_000);
afterAll(() => m?.close());

describe('profile_layout.update', () => {
  it('preview Trợ lý: tên trước / sau → xác nhận', async () => {
    const { preview, done } = await m.confirm({ layout_id: id, patch: { name: 'Spa Kim Cương' } });
    expect(preview).toEqual({ summary: 'Spa VIP', risk: 'config', changes: [{ entity: 'profile_layout', id, before: { name: 'Spa VIP' }, after: { name: 'Spa Kim Cương' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.act({ layout_id: id, patch: { name: 'Spa Kim Cương' } })).body.data.result).toEqual({ layout_id: id });
  });

  it('id lạ → 404 · 403 sales', async () => {
    expect((await m.act({ layout_id: 'pl_khong_co', patch: { name: 'X' } })).status).toBe(404);
    expect((await m.act({ layout_id: id, patch: { name: 'X' } }, m.sales)).status).toBe(403);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
