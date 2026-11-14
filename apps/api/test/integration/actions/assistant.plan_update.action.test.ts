// Ma trận assistant.plan_update (TIP-023d §3.5): chỉ khi đã dừng; bỏ / sửa bước chưa bắt đầu → revision + 1, pha editing; kế hoạch đang
// chạy → 409; phụ thuộc trỏ bước sau → 422; người khác → 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { planSession, twoStepPlan } from '../fixtures/plan-matrix';

let m: Matrix;
let session: string;

beforeAll(async () => {
  m = await matrix('assistant.plan_update');
  session = await planSession(m);
}, 120_000);
afterAll(() => m?.close());

describe('assistant.plan_update', () => {
  it('đang chạy → 409; đã dừng → sửa được (revision 2, editing); phụ thuộc sai → 422; người khác → 404', async () => {
    const p = await twoStepPlan(m, session);
    const remove2 = { plan_id: p.id, if_revision: 1, ops: [{ op: 'remove', step_id: p.steps[1]! }] };
    expect((await m.act(remove2)).status).toBe(409);
    await m.seed('assistant.plan_request_edit', { plan_id: p.id, if_revision: 1 });
    expect((await m.act({ plan_id: p.id, if_revision: 1, ops: [{ op: 'move', step_id: p.steps[1]!, after_step_id: null }] })).status).toBe(422);
    expect((await m.act(remove2, m.sales)).status).toBe(404);
    const r = await m.act({ ...remove2, ops: [...remove2.ops, { op: 'update', step_id: p.steps[0]!, patch: { title: 'Rà soát kỹ' } }] });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ revision: 2, phase: 'editing' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(m.def.agentGrantable).toBe(false);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
