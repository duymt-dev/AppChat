// Dựng chung cho ma trận action kế hoạch Cowork (TIP-023d): phiên Trợ lý của Owner (dựng ở DB — không có action tạo phiên riêng) + kế
// hoạch hai bước phân tích qua assistant.plan_propose (UI, không run gốc).
import { uuidv7 } from '@appchat/core';
import type { Matrix } from '../helpers/action-matrix';

export async function planSession(m: Matrix): Promise<string> {
  const id = uuidv7();
  await (await m.db()).assistantSession.create({ data: { id, userId: m.h.user, title: 'Ma trận kế hoạch', mode: 'cowork' } });
  return id;
}

export async function twoStepPlan(m: Matrix, session: string): Promise<{ id: string; steps: string[] }> {
  const r = await m.seed('assistant.plan_propose', {
    session_id: session,
    steps: [
      { kind: 'analysis', title: 'Rà soát', instructions: 'Rà soát dữ liệu' },
      { kind: 'analysis', title: 'Tổng hợp', instructions: 'Tổng hợp', depends_on: ['1'] },
    ],
  });
  const got = await m.seed('assistant.plan_get', { plan_id: r.plan_id });
  return { id: r.plan_id as string, steps: (got.steps as { id: string }[]).map((s) => s.id) };
}
