// Ma trận governance.update (TIP-023b): AI Governance (risk config) → trước / sau chỉ phần đổi (khoá lạ bỏ qua); tóm tắt = số chính sách
// khuyến nghị đang áp dụng. 403 sales (không có ai.governance). Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('governance.update');
}, 120_000);
afterAll(() => m?.close());

describe('governance.update', () => {
  it('403 sales', async () => {
    expect((await m.act({ filter: 'balanced' }, m.sales)).status).toBe(403);
  });

  it('preview Trợ lý → xác nhận; khoá lạ bỏ qua', async () => {
    const { preview, done } = await m.confirm({ scopes: { pii: true, nope: true }, filter: 'balanced' });
    expect(preview).toEqual({ summary: '15/15', risk: 'config', changes: [{ entity: 'ai_governance', id: '1', before: { pii: false, filter: 'strict' }, after: { pii: true, filter: 'balanced' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.confirm({ bounds: { nope: true } })).preview.changes).toEqual([]);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
