// Factory AI trong DB tenant (TIP-045b annex E): agent và run + bước llm có credit (đối soát ví / audit AI dùng).
import type { TenantDb } from '../../src';
import { newId, type FactoryClock } from './clock';

export function aiFactory(db: TenantDb, clock: FactoryClock) {
  return {
    async agent(p: { name?: string; status?: 'draft' | 'active' } = {}) {
      const id = newId();
      await db.aiAgent.create({ data: { id, name: p.name ?? 'Agent fixture', status: p.status ?? 'draft', createdAt: clock.now(), updatedAt: clock.now() } });
      return { id };
    },
    async run(initiatedByUserId: string, steps: number[] = []) {
      const id = newId();
      await db.aiRun.create({ data: { id, rootRunId: id, kind: 'assistant', status: 'completed', title: 'Run fixture', initiatedByUserId, startedAt: clock.now() } });
      for (const [i, credits] of steps.entries()) {
        await db.aiRunStep.create({ data: { id: newId(), runId: id, idx: i, type: 'llm', credits, meta: { llm_step: i }, createdAt: clock.now() } });
      }
      return { id };
    },
  };
}
