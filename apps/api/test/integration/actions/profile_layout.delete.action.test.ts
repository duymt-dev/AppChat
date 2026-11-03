// Ma trận profile_layout.delete (TIP-023b): preview Trợ lý (risk delete: tên + vai trò đang dùng → về mặc định) → xác nhận · mẫu hệ thống →
// preview cảnh báo + execute 422 · id lạ → 404 · 403 (sales). Undo: không khai; trạng thái: không có.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_LAYOUT_ID, SYSTEM_LAYOUTS } from '@appchat/shared';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let id: string;

beforeAll(async () => {
  m = await matrix('profile_layout.delete');
  id = (await m.seed('profile_layout.create', { name: 'Spa VIP', tabs: SYSTEM_LAYOUTS[0]!.tabs() })).layout_id;
  await m.seed('profile_layout.assign_role', { role: 'cs', layout_id: id });
}, 120_000);
afterAll(() => m?.close());

describe('profile_layout.delete', () => {
  it('preview Trợ lý: vai trò đang dùng → xác nhận → vai trò về mặc định', async () => {
    const { preview, done } = await m.confirm({ layout_id: id });
    expect(preview).toEqual({ summary: 'Spa VIP', risk: 'delete', count: 1, changes: [{ entity: 'profile_layout', id, before: { name: 'Spa VIP', roles: ['cs'] } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await (await m.db()).profileLayoutRole.findUniqueOrThrow({ where: { roleKey: 'cs' } })).layoutId).toBe(DEFAULT_LAYOUT_ID);
  });

  it('mẫu hệ thống → 422 · id lạ → 404 · 403 sales', async () => {
    expect((await m.act({ layout_id: DEFAULT_LAYOUT_ID })).status).toBe(422);
    expect((await m.act({ layout_id: 'pl_khong_co' })).status).toBe(404);
    expect((await m.act({ layout_id: DEFAULT_LAYOUT_ID }, m.sales)).status).toBe(403);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
