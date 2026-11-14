// Ma trận role.delete (TIP-042): xoá mềm vai trò tuỳ biến (risk delete) — còn thành viên / lời mời → HAS_DEPENDENCIES kèm số đếm (không tự đổi
// người dùng sang vai trò khác); hệ thống 422; 403 không phải Owner; không hoàn tác (cấp lại phải tạo / gán rõ).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let used: string;
let free: string;

beforeAll(async () => {
  m = await matrix('role.delete');
  used = (await m.seed('role.create', { name: 'Đang dùng', clone_from_key: 'cs' })).key;
  free = (await m.seed('role.create', { name: 'Bỏ đi', clone_from_key: 'cs' })).key;
  await m.h.member(used);
}, 120_000);
afterAll(() => m?.close());

describe('role.delete', () => {
  it('403 sales · hệ thống 422 · còn thành viên 409 kèm số đếm', async () => {
    expect((await m.act({ role_key: free, if_version: 1 }, m.sales)).status).toBe(403);
    expect((await m.act({ role_key: 'manager', if_version: 1 })).body.error.fields).toEqual({ role_key: 'system_role' });
    expect((await m.act({ role_key: used, if_version: 1 })).body.error).toMatchObject({ code: 'HAS_DEPENDENCIES', fields: { members: '1', invites: '0' } });
  });

  it('preview Trợ lý (cảnh báo không hoàn tác) → xác nhận → tombstone; xoá lại 404', async () => {
    const { preview, done } = await m.confirm({ role_key: free, if_version: 1 });
    expect(preview).toMatchObject({ summary: 'Bỏ đi', risk: 'delete', changes: [{ entity: 'role', id: free }], warnings: ['not_undoable'] });
    expect(done.body.data.result).toEqual({ ok: true });
    expect((await m.act({ role_key: free, if_version: 2 })).status).toBe(404);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
