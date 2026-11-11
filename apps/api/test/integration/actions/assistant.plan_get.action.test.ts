// Ma trận assistant.plan_get (TIP-023d §1.6): đọc kế hoạch của chính mình (revision, pha, bước, tiến độ thật); người khác / id lạ → 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { planSession, twoStepPlan } from '../fixtures/plan-matrix';

let m: Matrix;
let session: string;

beforeAll(async () => {
  m = await matrix('assistant.plan_get');
  session = await planSession(m);
}, 120_000);
afterAll(() => m?.close());

describe('assistant.plan_get', () => {
  it('chủ đọc được; người khác / id lạ → 404 như nhau', async () => {
    const p = await twoStepPlan(m, session);
    const r = await m.act({ plan_id: p.id });
    expect(r.status).toBe(200);
    expect(r.body.data.result).toMatchObject({ id: p.id, revision: 1, phase: 'active', progress: 0 });
    expect(r.body.data.result.steps).toHaveLength(2);
    expect((await m.act({ plan_id: p.id }, m.sales)).status).toBe(404);
    expect((await m.act({ plan_id: uuidv7() })).status).toBe(404);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'state')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
