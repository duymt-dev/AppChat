// Ma trận kb.update_source (TIP-023b): sửa nguồn (risk write) → trước / sau chỉ trường đổi (thư mục theo tên); undo về cũ. Nguồn / thư mục lạ
// → 404 ở preview. 403 sales (không có kb.manage).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let src: string;
let folder: string;
const row = async () => (await m.db()).kbSource.findUniqueOrThrow({ where: { id: src } });

beforeAll(async () => {
  m = await matrix('kb.update_source');
  src = (await m.seed('kb.add_source', { name: 'Bảng giá 2026', text: 'Gội đầu 100k' })).source_id;
  folder = (await m.seed('kb.folder.create', { name: 'Bảng giá' })).folder_id;
}, 120_000);
afterAll(() => m?.close());

describe('kb.update_source', () => {
  it('403 sales · nguồn / thư mục lạ → 404', async () => {
    expect((await m.act({ source_id: src, starred: true }, m.sales)).status).toBe(403);
    expect((await m.act({ source_id: '0190f000-0000-7000-8000-00000000beef', starred: true }, undefined, { 'x-action-source': 'assistant' })).status).toBe(404);
    expect((await m.act({ source_id: src, folder_id: '0190f000-0000-7000-8000-00000000beef' }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ folder_id: 'not_found' });
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ source_id: src, folder_id: folder, visibility: 'internal' });
    expect(preview).toEqual({ summary: 'Bảng giá 2026', risk: 'write', changes: [{ entity: 'kb_source', id: src, before: { folder: null, visibility: 'public' }, after: { folder: 'Bảng giá', visibility: 'internal' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await row()).visibility).toBe('public');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
