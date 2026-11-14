// Ma trận assistant.plan_resume (TIP-023d §3.6): chỉ từ paused / editing (không run gốc → active ngay); đang chạy → 409; revision cũ →
// 409; người khác → 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { planSession, twoStepPlan } from '../fixtures/plan-matrix';

let m: Matrix;
let session: string;

beforeAll(async () => {
  m = await matrix('assistant.plan_resume');
  session = await planSession(m);
}, 120_000);
afterAll(() => m?.close());

describe('assistant.plan_resume', () => {
  it('đang chạy → 409; đã dừng → active; revision cũ → 409; người khác → 404', async () => {
    const p = await twoStepPlan(m, session);
    expect((await m.act({ plan_id: p.id, if_revision: 1 })).status).toBe(409);
    await m.seed('assistant.plan_request_edit', { plan_id: p.id, if_revision: 1 });
    expect((await m.act({ plan_id: p.id, if_revision: 2 })).status).toBe(409);
    expect((await m.act({ plan_id: p.id, if_revision: 1 }, m.sales)).status).toBe(404);
    const r = await m.act({ plan_id: p.id, if_revision: 1 });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ phase: 'active', plan_epoch: 1 });
  });

  it('ô không áp dụng có lý do', () => {
    expect(m.def.agentGrantable).toBe(false);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
