// TIP-023d pha 1 (unit, DB giả trong bộ nhớ): validatePlanSteps (action đã đăng ký, delegate agent published, depends_on chỉ trỏ
// bước TRƯỚC, kích thước ≤ 64KiB), createPlan/ownPlan (commit revision 1, sai owner → 404), planToDto/stepProgress (tiến độ thật).
import { describe, expect, it } from 'vitest';
import { AppError } from '@appchat/shared';
import { createPlan, ownPlan } from '../src/ai/assistant/plans/repo';
import { planToDto, stepProgress } from '../src/ai/assistant/plans/progress';
import { validatePlanSteps, type PlanStepInput } from '../src/ai/assistant/plans/validation';

type Rec = Record<string, unknown>;
function table(key: (r: Rec) => string) {
  const rows = new Map<string, Rec>();
  return {
    rows,
    findUnique: async ({ where }: { where: Rec }) => rows.get(key(where)) ?? null,
    findMany: async ({ where, orderBy }: { where: Rec; orderBy?: { position?: 'asc' | 'desc' } }) => {
      const list = [...rows.values()].filter((r) => Object.entries(where).every(([k, v]) => r[k] === v));
      if (orderBy?.position === 'asc') list.sort((a, b) => (a.position as number) - (b.position as number));
      return list;
    },
    create: async ({ data }: { data: Rec }) => {
      rows.set(key(data), { ...data });
      return { ...data };
    },
  };
}

function fakeTx() {
  const aiAgent = table((r) => r.id as string);
  const assistantPlan = table((r) => r.id as string);
  const assistantPlanStep = table((r) => `${r.planId}:${r.id}`);
  const assistantSession = table((r) => r.id as string);
  return { aiAgent, assistantPlan, assistantPlanStep, assistantSession } as never;
}

const IMPLEMENTED = new Set(['contact.add_note', 'order.create']);
const isImplemented = (id: string) => IMPLEMENTED.has(id);

describe('validatePlanSteps', () => {
  it('action chưa đăng ký / chưa có handler → 422', async () => {
    const tx = fakeTx();
    const steps: PlanStepInput[] = [{ kind: 'action', title: 'A', instructions: '', action_or_agent_id: 'no.such.action' }];
    await expect(validatePlanSteps(tx, isImplemented, steps)).rejects.toMatchObject({ code: 'VALIDATION_FAILED', httpStatus: 422 });
  });

  it('action đã đăng ký + có handler → hợp lệ', async () => {
    const tx = fakeTx();
    const steps: PlanStepInput[] = [{ kind: 'action', title: 'Ghi chú', instructions: 'Ghi chú khách', action_or_agent_id: 'contact.add_note' }];
    await expect(validatePlanSteps(tx, isImplemented, steps)).resolves.toBeUndefined();
  });

  it('delegate thiếu action_or_agent_id → 422; agent đã xoá / chưa publish → 422; agent published → hợp lệ', async () => {
    const tx = fakeTx();
    await (tx as unknown as { aiAgent: ReturnType<typeof table> }).aiAgent.create({ data: { id: 'a1', deletedAt: null, publishedVersion: 1 } });
    await (tx as unknown as { aiAgent: ReturnType<typeof table> }).aiAgent.create({ data: { id: 'a2', deletedAt: null, publishedVersion: 0 } });
    await expect(validatePlanSteps(tx, isImplemented, [{ kind: 'delegate', title: 'Giao', instructions: '' }])).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    await expect(validatePlanSteps(tx, isImplemented, [{ kind: 'delegate', title: 'Giao', instructions: '', action_or_agent_id: 'a2' }])).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    await expect(validatePlanSteps(tx, isImplemented, [{ kind: 'delegate', title: 'Giao', instructions: '', action_or_agent_id: 'a1' }])).resolves.toBeUndefined();
  });

  it('analysis không cần action_or_agent_id', async () => {
    const tx = fakeTx();
    await expect(validatePlanSteps(tx, isImplemented, [{ kind: 'analysis', title: 'Phân tích', instructions: '' }])).resolves.toBeUndefined();
  });

  it('depends_on trỏ bước SAU hoặc chính nó → 422; trỏ bước TRƯỚC → hợp lệ', async () => {
    const tx = fakeTx();
    const two: PlanStepInput[] = [
      { kind: 'analysis', title: 'B1', instructions: '' },
      { kind: 'analysis', title: 'B2', instructions: '', depends_on: ['2'] },
    ];
    await expect(validatePlanSteps(tx, isImplemented, two)).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    const ok: PlanStepInput[] = [
      { kind: 'analysis', title: 'B1', instructions: '' },
      { kind: 'analysis', title: 'B2', instructions: '', depends_on: ['1'] },
    ];
    await expect(validatePlanSteps(tx, isImplemented, ok)).resolves.toBeUndefined();
  });

  it('plan serialize vượt 64KiB → 422', async () => {
    const tx = fakeTx();
    const huge: PlanStepInput[] = [{ kind: 'analysis', title: 'X', instructions: 'a'.repeat(70 * 1024) }];
    await expect(validatePlanSteps(tx, isImplemented, huge)).rejects.toMatchObject({ code: 'VALIDATION_FAILED', fields: { steps: 'too_large' } });
  });
});

describe('createPlan / ownPlan', () => {
  const now = new Date('2026-11-10T00:00:00Z');
  const steps: PlanStepInput[] = [
    { kind: 'action', title: 'Tạo báo giá', instructions: 'Soạn báo giá', action_or_agent_id: 'contact.add_note' },
    { kind: 'analysis', title: 'Tóm tắt', instructions: '', depends_on: ['1'] },
  ];

  it('commit NGAY ở revision 1, phase active, step depends_on chuyển từ vị trí sang UUID thật', async () => {
    const tx = fakeTx();
    const plan = await createPlan(tx as unknown as Parameters<typeof createPlan>[0], { id: 'p1', ownerUserId: 'u1', sessionId: 's1', steps, now });
    expect(plan).toMatchObject({ id: 'p1', revision: 1, phase: 'active', ownerUserId: 'u1' });
    const { plan: reread, steps: rows } = await ownPlan(tx as unknown as Parameters<typeof ownPlan>[0], 'u1', 'p1');
    expect(reread.id).toBe('p1');
    expect(rows).toHaveLength(2);
    expect(rows[0]!.position).toBe(1);
    expect(rows[1]!.dependsOn).toEqual([rows[0]!.id]);
    expect(rows[1]!.dependsOn[0]).not.toBe('1');
  });

  it('sai owner / plan không tồn tại → NOT_FOUND 404 (không phân biệt "có nhưng không phải của bạn")', async () => {
    const tx = fakeTx();
    await createPlan(tx as unknown as Parameters<typeof createPlan>[0], { id: 'p2', ownerUserId: 'u1', sessionId: 's1', steps, now });
    await expect(ownPlan(tx as unknown as Parameters<typeof ownPlan>[0], 'u2', 'p2')).rejects.toMatchObject({ code: 'NOT_FOUND', httpStatus: 404 });
    await expect(ownPlan(tx as unknown as Parameters<typeof ownPlan>[0], 'u1', 'no-such-plan')).rejects.toThrow(AppError);
  });
});

describe('stepProgress / planToDto', () => {
  it('tiến độ = succeeded/total; failed/cancelled/skipped không tính vào tử số', () => {
    expect(stepProgress([])).toBe(0);
    expect(stepProgress([{ state: 'succeeded' }, { state: 'pending' }])).toBe(0.5);
    expect(stepProgress([{ state: 'succeeded' }, { state: 'failed' }, { state: 'cancelled' }, { state: 'skipped' }])).toBe(0.25);
  });

  it('planToDto chiếu đúng field, không lộ gì ngoài title/instructions đã nhập', () => {
    const plan = { id: 'p1', ownerUserId: 'u1', sessionId: 's1', rootRunId: null, revision: 2, planEpoch: 1, phase: 'active', selectedAgentId: null, selectedAgentVersion: null, sourcePlanId: null, sourceRevision: null, createdAt: new Date('2026-11-10T00:00:00Z'), updatedAt: new Date('2026-11-10T00:01:00Z') } as never;
    const steps = [{ planId: 'p1', id: 's1', position: 1, kind: 'action', title: 'A', instructions: 'B', actionOrAgentId: 'contact.add_note', dependsOn: [], state: 'succeeded', createdAt: new Date(), updatedAt: new Date() }] as never;
    const dto = planToDto(plan, steps);
    expect(dto).toMatchObject({ id: 'p1', revision: 2, plan_epoch: 1, phase: 'active', progress: 1 });
    expect(dto.steps).toHaveLength(1);
    expect(dto.steps[0]).toMatchObject({ id: 's1', title: 'A', instructions: 'B', state: 'succeeded' });
  });
});
