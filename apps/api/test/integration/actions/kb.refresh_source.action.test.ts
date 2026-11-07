// Ma trận kb.refresh_source (TIP-023b): học lại một / tất cả nguồn (risk write) → số nguồn + trạng thái → pending; nguồn lạ → 404 ở preview.
// 403 sales (không có kb.manage). Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let src: string;

beforeAll(async () => {
  m = await matrix('kb.refresh_source');
  src = (await m.seed('kb.add_source', { name: 'Bảng giá 2026', text: 'Gội đầu 100k' })).source_id;
  await (await m.db()).kbSource.update({ where: { id: src }, data: { status: 'ready' } });
}, 120_000);
afterAll(() => m?.close());

describe('kb.refresh_source', () => {
  it('403 sales · nguồn lạ → 404', async () => {
    expect((await m.act({ source_id: src }, m.sales)).status).toBe(403);
    expect((await m.act({ source_id: '0190f000-0000-7000-8000-00000000beef' }, undefined, { 'x-action-source': 'assistant' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận; tất cả → đếm nguồn', async () => {
    const { preview, done } = await m.confirm({ source_id: src });
    expect(preview).toEqual({ summary: 'Bảng giá 2026', risk: 'write', count: 1, changes: [{ entity: 'kb_source', id: src, before: { status: 'ready' }, after: { status: 'pending' } }] });
    expect(done.body.data.result).toEqual({ queued: 1 });
    expect((await m.confirm({ source_id: 'all' })).preview).toMatchObject({ summary: '1', count: 1 });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
