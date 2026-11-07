// Ma trận approval.edit_and_approve (TIP-023b): sửa input rồi duyệt (risk write) → pending → edited + input trước / sau chỉ trường đổi;
// input sửa sai schema action gốc → 422, đã quyết → 409 ở preview. 403 sales (không có approvals.decide). Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { approval } from '../helpers/ai-fixtures';

let m: Matrix;
let ap: string;

beforeAll(async () => {
  m = await matrix('approval.edit_and_approve');
  ap = await approval(m);
}, 120_000);
afterAll(() => m?.close());

describe('approval.edit_and_approve', () => {
  it('403 sales · input sai schema → 422', async () => {
    expect((await m.act({ approval_id: ap, edited_input: { name: 'X' } }, m.sales)).status).toBe(403);
    expect((await m.act({ approval_id: ap, edited_input: { name: '' } }, undefined, { 'x-action-source': 'assistant' })).status).toBe(422);
  });

  it('preview Trợ lý → xác nhận; đã quyết → 409', async () => {
    const { preview, done } = await m.confirm({ approval_id: ap, edited_input: { name: 'Khách VIP' } });
    expect(preview).toEqual({
      summary: 'Tạo thẻ · tag.create',
      risk: 'write',
      changes: [
        { entity: 'approval_request', id: ap, before: { status: 'pending' }, after: { status: 'edited' } },
        { entity: 'tag.create', before: { name: 'VIP' }, after: { name: 'Khách VIP' } },
      ],
      warnings: ['runs_action:tag.create'],
    });
    expect(done.body.data.result).toEqual({ approval_id: ap, status: 'edited' });
    expect((await m.act({ approval_id: ap, edited_input: { name: 'Y' } }, undefined, { 'x-action-source': 'assistant' })).status).toBe(409);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
