// Ma trận assistant.plan_propose (TIP-023d §1.3-1.5): tạo kế hoạch revision 1 trong phiên của chính mình; phiên người khác → 404; action
// không có handler → 422; Trợ lý → xem trước (thẻ xác nhận). Undo / hàng loạt không áp dụng.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { planSession } from '../fixtures/plan-matrix';

let m: Matrix;
let session: string;

beforeAll(async () => {
  m = await matrix('assistant.plan_propose');
  session = await planSession(m);
}, 120_000);
afterAll(() => m?.close());

const one = (title: string) => [{ kind: 'analysis', title, instructions: title }];

describe('assistant.plan_propose', () => {
  it('UI tạo plan revision 1 active; phiên của người khác → 404; action lạ → 422', async () => {
    const r = await m.act({ session_id: session, steps: one('Một') });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ revision: 1, phase: 'active' });
    expect((await m.act({ session_id: session, steps: one('Một') }, m.sales)).status).toBe(404);
    expect((await m.act({ session_id: session, steps: [{ kind: 'action', title: 'Lạ', instructions: 'x', action_or_agent_id: 'nope.nope' }] })).status).toBe(422);
  });

  it('Trợ lý → xem trước rồi xác nhận', async () => {
    const { preview, done } = await m.confirm({ session_id: session, steps: one('Hai') });
    expect(preview).toMatchObject({ risk: 'write', count: 1 });
    expect(done.status).toBe(200);
  });

  it('ô không áp dụng có lý do', () => {
    expect(m.def.agentGrantable).toBe(false);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
