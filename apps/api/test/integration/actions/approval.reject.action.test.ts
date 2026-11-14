// Ma trận approval.reject (TIP-023b): quyết định yêu cầu duyệt (risk write) → pending → rejected; đã quyết → 409, id lạ → 404 ở preview. 403
// sales (không có approvals.decide). Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { approval } from '../helpers/ai-fixtures';

let m: Matrix;
let ap: string;

beforeAll(async () => {
  m = await matrix('approval.reject');
  ap = await approval(m);
}, 120_000);
afterAll(() => m?.close());

describe('approval.reject', () => {
  it('403 sales · id lạ → 404', async () => {
    expect((await m.act({ approval_id: ap }, m.sales)).status).toBe(403);
    expect((await m.act({ approval_id: '0190f000-0000-7000-8000-00000000beef' }, undefined, { 'x-action-source': 'assistant' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận; đã quyết → 409', async () => {
    const { preview, done } = await m.confirm({ approval_id: ap });
    expect(preview).toEqual({
      summary: 'Tạo thẻ · tag.create',
      risk: 'write',
      changes: [{ entity: 'approval_request', id: ap, before: { status: 'pending' }, after: { status: 'rejected' } }],
    });
    expect(done.body.data.result).toEqual({ approval_id: ap, status: 'rejected' });
    expect((await m.act({ approval_id: ap }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ approval: 'rejected' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
