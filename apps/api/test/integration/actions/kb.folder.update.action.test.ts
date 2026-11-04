// Ma trận kb.folder.update (TIP-020b): sửa thư mục (risk write) → trước / sau chỉ trường đổi; đổi mặc định visibility khi thư mục có nguồn
// → cảnh báo nguồn cũ giữ quyền; tên trùng → 409, cha vòng → 422, version cũ → STALE_VERSION ngay ở preview. 403 sales. Undo 24h trả về.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let f: string;
let other: string;
const row = async () => (await m.db()).kbFolder.findUniqueOrThrow({ where: { id: f } });

beforeAll(async () => {
  m = await matrix('kb.folder.update');
  f = (await m.seed('kb.folder.create', { name: 'Quy trình' })).folder_id;
  other = (await m.seed('kb.folder.create', { name: 'Bảng giá' })).folder_id;
  await m.seed('kb.add_source', { name: 'Đón khách', text: 'Chào hỏi', folder_id: f });
}, 120_000);
afterAll(() => m?.close());

describe('kb.folder.update', () => {
  it('403 sales · lạ 404 · trùng 409 · tự làm cha 422 · version cũ 409', async () => {
    const src = { 'x-action-source': 'assistant' };
    expect((await m.act({ folder_id: f, name: 'X' }, m.sales)).status).toBe(403);
    expect((await m.act({ folder_id: '0190f000-0000-7000-8000-00000000beef', name: 'X' }, undefined, src)).status).toBe(404);
    expect((await m.act({ folder_id: f, name: 'bang gia' }, undefined, src)).body.error.fields).toEqual({ name: 'duplicate' });
    expect((await m.act({ folder_id: f, parent_id: f }, undefined, src)).body.error.fields).toEqual({ parent_id: 'self' });
    expect((await m.act({ folder_id: f, name: 'Y', if_version: 99 }, undefined, src)).body.error.code).toBe('STALE_VERSION');
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ folder_id: f, name: 'Quy trình dịch vụ', visibility: 'internal', parent_id: other, if_version: 1 });
    expect(preview).toEqual({
      summary: 'Quy trình',
      risk: 'write',
      count: 1,
      changes: [{ entity: 'kb_folder', id: f, before: { name: 'Quy trình', visibility: 'public', parent_id: null }, after: { name: 'Quy trình dịch vụ', visibility: 'internal', parent_id: other } }],
      warnings: ['existing_sources_keep_visibility'],
    });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.data.result).toEqual({ folder_id: f, version: 2 });
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await row()).toMatchObject({ name: 'Quy trình', visibility: 'public', parentId: null, version: 3 });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
