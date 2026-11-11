// TIP-023d pha 4 (unit): chọn bước hiện hành (một bước một lúc, phụ thuộc phải succeeded / skipped, bước lỗi chặn dependent), quyết định
// cho lời gọi ghi (đúng action → bound; khác action → PLAN_UNDECLARED; plan dừng → PLAN_PAUSED; không plan / đã xong → free), đọc binding
// từ trạng thái dừng (khuôn lạ → bỏ), hook executor (claim trước handler, replay không chạy handler, settle sau action_log), và giữ run
// gốc khi lượt xong mà kế hoạch còn bước (§2.5).
import { describe, expect, it } from 'vitest';
import { bindingOf, currentStep, decideStep } from '../src/ai/assistant/plans/driver';
import type { PlanStepRow } from '../src/ai/assistant/plans/repo';
import { planHoldOf } from '../src/ai/assistant/plans/checkpoint';

const step = (position: number, state: string, o: Partial<PlanStepRow> = {}): PlanStepRow =>
  ({ planId: 'p', id: `s${position}`, position, kind: 'action', title: `B${position}`, instructions: '', actionOrAgentId: 'contact.create', dependsOn: [], state, executionGeneration: 1, createdAt: new Date(0), updatedAt: new Date(0), ...o }) as PlanStepRow;

describe('currentStep', () => {
  it('bước đầu chưa xong mà phụ thuộc đã succeeded / skipped', () => {
    expect(currentStep([step(1, 'succeeded'), step(2, 'pending', { dependsOn: ['s1'] }), step(3, 'pending')])?.id).toBe('s2');
    expect(currentStep([step(1, 'skipped'), step(2, 'pending', { dependsOn: ['s1'] })])?.id).toBe('s2');
  });
  it('bước trước lỗi / chưa rõ → dependent bị chặn (null), không nhảy qua', () => {
    expect(currentStep([step(1, 'failed'), step(2, 'pending', { dependsOn: ['s1'] })])).toBeNull();
    expect(currentStep([step(1, 'unknown'), step(2, 'pending')])?.id).toBe('s1');
  });
  it('hết bước → null', () => {
    expect(currentStep([step(1, 'succeeded')])).toBeNull();
  });
});

function db(plan: Record<string, unknown> | null, steps: PlanStepRow[]) {
  return {
    assistantPlan: { findUnique: async () => plan },
    assistantPlanStep: { findMany: async () => steps },
  } as never;
}
const PLAN = { id: 'p', phase: 'active', planEpoch: 3 };

describe('decideStep', () => {
  it('không plan / plan đã xong → free', async () => {
    expect(await decideStep(db(null, []), 'r', 'contact.create')).toEqual({ kind: 'free' });
    expect(await decideStep(db({ ...PLAN, phase: 'completed' }, []), 'r', 'contact.create')).toEqual({ kind: 'free' });
  });
  it('plan đang dừng để sửa → PLAN_PAUSED', async () => {
    expect(await decideStep(db({ ...PLAN, phase: 'pause_requested' }, [step(1, 'pending')]), 'r', 'contact.create')).toMatchObject({ kind: 'reject', code: 'PLAN_PAUSED' });
  });
  it('đúng action → binding (plan, bước, thế hệ, epoch); khác action → PLAN_UNDECLARED', async () => {
    const steps = [step(1, 'pending', { executionGeneration: 2 })];
    expect(await decideStep(db(PLAN, steps), 'r', 'contact.create')).toMatchObject({ kind: 'bound', binding: { planId: 'p', stepId: 's1', generation: 2, epoch: 3 } });
    expect(await decideStep(db(PLAN, steps), 'r', 'order.create')).toMatchObject({ kind: 'reject', code: 'PLAN_UNDECLARED' });
  });
  it('bước hiện hành phân tích / giao việc → free; bị chặn → PLAN_BLOCKED', async () => {
    expect(await decideStep(db(PLAN, [step(1, 'pending', { kind: 'analysis', actionOrAgentId: null })]), 'r', 'contact.create')).toEqual({ kind: 'free' });
    expect(await decideStep(db(PLAN, [step(1, 'failed'), step(2, 'pending', { dependsOn: ['s1'] })]), 'r', 'contact.create')).toMatchObject({ kind: 'reject', code: 'PLAN_BLOCKED' });
  });
});

describe('bindingOf', () => {
  it('đúng khuôn → binding; khuôn lạ / thiếu → undefined (không tin dữ liệu lạ)', () => {
    expect(bindingOf({ planId: 'p', stepId: 's', generation: 1, epoch: 0, extra: 1 })).toEqual({ planId: 'p', stepId: 's', generation: 1, epoch: 0 });
    expect(bindingOf({ planId: 'p', stepId: 's', generation: '1', epoch: 0 })).toBeUndefined();
    expect(bindingOf(null)).toBeUndefined();
  });
});

describe('planHoldOf (§2.5)', () => {
  const hold = (plan: Record<string, unknown> | null, open: number) =>
    planHoldOf({ assistantPlan: { findUnique: async () => plan }, assistantPlanStep: { count: async () => open } } as never, 'r');
  it('kế hoạch active còn bước chưa xong thật → giữ run (epoch hiện hành)', async () => {
    expect(await hold(PLAN, 2)()).toEqual({ epoch: 3 });
  });
  it('hết bước / không plan / plan không active → không giữ (lượt kết thúc như thường)', async () => {
    expect(await hold(PLAN, 0)()).toBeNull();
    expect(await hold(null, 1)()).toBeNull();
    expect(await hold({ ...PLAN, phase: 'completed' }, 1)()).toBeNull();
    expect(await hold({ ...PLAN, phase: 'paused' }, 1)()).toBeNull();
  });
});
