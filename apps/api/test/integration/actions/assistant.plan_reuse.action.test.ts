// Ma trận assistant.plan_reuse (TIP-023d §4.3): bản nháp mới từ ứng viên tái dùng của chính mình (mọi bước pending, không root); ứng viên
// / phiên của người khác → 404; cấu trúc tham chiếu action không còn → 409.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { planSession } from '../fixtures/plan-matrix';

let m: Matrix;
let session: string;

/** Ứng viên dựng ở DB (sinh thật khi kế hoạch hoàn tất — kiểm ở assistant-plan-reuse.test.ts). */
async function candidate(target: string): Promise<string> {
  const id = uuidv7();
  const at = new Date();
  await (await m.db()).assistantPlanReuseCandidate.create({ data: { id, ownerUserId: m.h.user, sourcePlanId: uuidv7(), sourceRevision: 1, genericTitle: 'Tạo khách hàng', structure: [{ kind: 'action', target, deps: [] }], eligible: true, createdAt: at, updatedAt: at } });
  return id;
}

beforeAll(async () => {
  m = await matrix('assistant.plan_reuse');
  session = await planSession(m);
}, 120_000);
afterAll(() => m?.close());

describe('assistant.plan_reuse', () => {
  it('ứng viên của mình → bản nháp mới pending; người khác → 404; action không còn → 409', async () => {
    const id = await candidate('contact.create');
    const r = await m.act({ candidate_id: id, session_id: session });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ phase: 'draft', revision: 1 });
    const plan = await (await m.db()).assistantPlan.findUniqueOrThrow({ where: { id: r.body.data.result.plan_id }, include: { steps: true } });
    expect(plan.rootRunId).toBeNull();
    expect(plan.steps.map((s) => s.state)).toEqual(['pending']);
    expect((await m.act({ candidate_id: id, session_id: session }, m.sales)).status).toBe(404);
    expect((await m.act({ candidate_id: await candidate('nope.gone'), session_id: session })).status).toBe(409);
  });

  it('ô không áp dụng có lý do', () => {
    expect(m.def.agentGrantable).toBe(false);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
