// Ma trận assistant.plan_request_edit (TIP-023d §3.1, §3.4): kế hoạch đang chạy → epoch + 1 (không run gốc → dừng hẳn ngay); gọi lại →
// cùng epoch; revision cũ → 409; người khác → 404; cùng Idempotency-Key → cùng biên nhận. Model không gọi được (SYSTEM_ONLY).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { planSession, twoStepPlan } from '../fixtures/plan-matrix';

let m: Matrix;
let session: string;

beforeAll(async () => {
  m = await matrix('assistant.plan_request_edit');
  session = await planSession(m);
}, 120_000);
afterAll(() => m?.close());

describe('assistant.plan_request_edit', () => {
  it('active → paused, epoch 1; gọi lại cùng epoch; revision cũ → 409; người khác → 404', async () => {
    const p = await twoStepPlan(m, session);
    const r = await m.act({ plan_id: p.id, if_revision: 1 });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ plan_epoch: 1, phase: 'paused' });
    expect((await m.act({ plan_id: p.id, if_revision: 1 })).body.data.result).toMatchObject({ plan_epoch: 1 });
    expect((await m.act({ plan_id: p.id, if_revision: 7 })).status).toBe(409);
    expect((await m.act({ plan_id: p.id, if_revision: 1 }, m.sales)).status).toBe(404);
  });

  it('idempotency: cùng khoá → cùng biên nhận', async () => {
    const p = await twoStepPlan(m, session);
    const key = uuidv7();
    const a = await m.actWithKey(key, { plan_id: p.id, if_revision: 1 });
    const b = await m.actWithKey(key, { plan_id: p.id, if_revision: 1 });
    expect(b.body.data.action_log_id).toBe(a.body.data.action_log_id);
  });

  it('ô không áp dụng có lý do', () => {
    expect(m.def.agentGrantable).toBe(false);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
