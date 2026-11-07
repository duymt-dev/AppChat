// Ma trận workspace.update (TIP-023b): thông tin workspace (risk config, db platform) → trước / sau chỉ trường đổi; chưa khai báo DN mà đổi
// MST → 409 ở preview. 403 sales (không có settings.manage). Cấu hình workspace — không scope. Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('workspace.update');
}, 120_000);
afterAll(() => m?.close());

describe('workspace.update', () => {
  it('403 sales', async () => {
    expect((await m.act({ name: 'X' }, m.sales)).status).toBe(403);
  });

  it('preview Trợ lý → xác nhận; chưa khai báo DN mà đổi MST → 409', async () => {
    const { preview, done } = await m.confirm({ name: 'Spa Hương Sen', timezone: 'Asia/Ho_Chi_Minh', website: 'https://huongsen.vn' });
    expect(preview).toEqual({
      summary: 'Spa Hương Sen',
      risk: 'config',
      changes: [{ entity: 'workspace', id: m.h.ws, before: { name: 'WS test', website: null }, after: { name: 'Spa Hương Sen', website: 'https://huongsen.vn' } }],
    });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.h.platform.workspace.findUniqueOrThrow({ where: { id: m.h.ws } })).name).toBe('Spa Hương Sen');
    const r = await m.act({ tax_code: '0312345678' }, undefined, { 'x-action-source': 'assistant' });
    expect([r.status, r.body.error.fields]).toEqual([409, { business_profile: 'not_declared' }]);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
