// Ma trận onboarding.toggle_step (TIP-023b): checklist "Bắt đầu" (permission self, db platform) → bước + đã xong trước / sau. Quyền 'self' —
// mọi vai trò gọi được (checklist theo workspace). Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('onboarding.toggle_step');
}, 120_000);
afterAll(() => m?.close());

describe('onboarding.toggle_step', () => {
  it('sales (self) gọi được', async () => {
    expect((await m.act({ step: 'team', done: true }, m.sales)).body.data.result).toEqual({ done_count: 1 });
  });

  it('preview Trợ lý → xác nhận', async () => {
    const { preview, done } = await m.confirm({ step: 'channel', done: true });
    expect(preview).toEqual({ summary: 'channel', risk: 'write', changes: [{ entity: 'onboarding_step', id: 'channel', before: { done: false }, after: { done: true } }] });
    expect(done.body.data.result).toEqual({ done_count: 2 });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
