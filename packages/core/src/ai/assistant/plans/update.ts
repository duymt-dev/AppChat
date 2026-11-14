// Sửa kế hoạch đang dừng (TIP-023d §3.5): chỉ bước CHƯA bắt đầu (state `pending`, chưa có claim nào) mới sửa / xoá / dời được; bước đã
// admitted / đã xong giữ nguyên id + nội dung + biên nhận. Sửa đích / nội dung một bước tăng `execution_generation` của bước đó → thẻ xem
// trước cũ (gắn thế hệ cũ) không chạy được, phải xem trước lại. Lưu tăng revision; không tự chạy tiếp (plan_resume riêng).
import type { ActionInput, assistantPlanUpdate } from '@appchat/actions';
import { AppError, PLAN_MAX_STEPS, PLAN_SERIALIZED_MAX_BYTES } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { uuidv7 } from '../../../kernel/ids';
import type { PlanStepRow } from './repo';
import { validatePlanSteps } from './validation';

type Op = ActionInput<typeof assistantPlanUpdate>['ops'][number];
type Draft = { id: string; kind: PlanStepRow['kind']; title: string; instructions: string; actionOrAgentId: string | null; dependsOn: string[]; state: string; generation: number; fresh: boolean; touched: boolean; locked: boolean };

const bad = (field: string, code: string) => new AppError('VALIDATION_FAILED', 422, { [field]: code });

/** Áp các phép sửa lên bản nháp theo thứ tự; bước khoá (đã bắt đầu) → 409. */
export function applyOps(steps: readonly PlanStepRow[], claimed: ReadonlySet<string>, ops: readonly Op[], newId: () => string): Draft[] {
  const list: Draft[] = steps.map((s) => ({ id: s.id, kind: s.kind, title: s.title, instructions: s.instructions, actionOrAgentId: s.actionOrAgentId, dependsOn: [...s.dependsOn], state: s.state, generation: s.executionGeneration, fresh: false, touched: false, locked: s.state !== 'pending' || claimed.has(s.id) }));
  const at = (id: string) => {
    const i = list.findIndex((s) => s.id === id);
    if (i < 0) throw bad('ops.step_id', 'not_found');
    return i;
  };
  const editable = (i: number) => {
    if (list[i]!.locked) throw new AppError('CONFLICT', 409, { step_id: 'already_started' }, 'Bước đã bắt đầu / đã xong không sửa được');
    return list[i]!;
  };
  const insertAfter = (d: Draft, after: string | null) => list.splice(after === null ? 0 : at(after) + 1, 0, d);
  for (const op of ops) {
    if (op.op === 'update') {
      const s = editable(at(op.step_id));
      if (op.patch.title !== undefined) s.title = op.patch.title;
      if (op.patch.instructions !== undefined) s.instructions = op.patch.instructions;
      if (op.patch.action_or_agent_id !== undefined) s.actionOrAgentId = op.patch.action_or_agent_id;
      s.touched = true;
    } else if (op.op === 'remove') {
      const i = at(op.step_id);
      editable(i);
      list.splice(i, 1);
    } else if (op.op === 'add') {
      const st = op.step;
      insertAfter({ id: newId(), kind: st.kind, title: st.title, instructions: st.instructions, actionOrAgentId: st.action_or_agent_id ?? null, dependsOn: st.depends_on ?? [], state: 'pending', generation: 1, fresh: true, touched: true, locked: false }, op.after_step_id);
    } else {
      const i = at(op.step_id);
      const s = editable(i);
      list.splice(i, 1);
      insertAfter(s, op.after_step_id);
      s.touched = true;
    }
  }
  // Bước khoá giữ nguyên thứ tự tương đối (không dời bước đã chạy ra sau bước chưa chạy để giấu tiến độ).
  const lockedOrder = list.filter((s) => s.locked).map((s) => s.id);
  const before = steps.filter((s) => lockedOrder.includes(s.id)).map((s) => s.id);
  if (lockedOrder.join() !== before.join()) throw new AppError('CONFLICT', 409, { ops: 'reorders_started_steps' });
  if (!list.length || list.length > PLAN_MAX_STEPS) throw bad('ops', 'step_count');
  const pos = new Map(list.map((s, i) => [s.id, i]));
  list.forEach((s, i) => {
    for (const d of s.dependsOn) {
      const p = pos.get(d);
      if (p === undefined) throw bad('ops', 'dangling_dependency');
      if (p >= i) throw bad('ops', 'must_reference_earlier_step');
    }
  });
  return list;
}

/** Ghi bản nháp: xoá bước đã bỏ, cập nhật / thêm còn lại theo vị trí mới; bước sửa tăng thế hệ thực thi. */
export async function saveDraft(tx: TenantTx, planId: string, before: readonly PlanStepRow[], list: readonly Draft[], isImplemented: (id: string) => boolean, now: Date): Promise<void> {
  const changed = list.filter((s) => s.touched && !s.locked).map((s) => ({ kind: s.kind, title: s.title, instructions: s.instructions, ...(s.actionOrAgentId ? { action_or_agent_id: s.actionOrAgentId } : {}) }));
  await validatePlanSteps(tx, isImplemented, changed);
  if (Buffer.byteLength(JSON.stringify(list.map((s) => [s.title, s.instructions])), 'utf8') > PLAN_SERIALIZED_MAX_BYTES) throw bad('ops', 'too_large');
  const keep = new Set(list.map((s) => s.id));
  for (const s of before) if (!keep.has(s.id)) await tx.assistantPlanStep.delete({ where: { planId_id: { planId, id: s.id } } });
  for (let i = 0; i < list.length; i++) {
    const s = list[i]!;
    if (s.fresh) {
      await tx.assistantPlanStep.create({ data: { planId, id: s.id, position: i + 1, kind: s.kind, title: s.title, instructions: s.instructions, actionOrAgentId: s.actionOrAgentId, dependsOn: s.dependsOn, state: 'pending', executionGeneration: 1, createdAt: now, updatedAt: now } });
    } else {
      await tx.assistantPlanStep.update({
        where: { planId_id: { planId, id: s.id } },
        data: { position: i + 1, ...(s.locked ? {} : { title: s.title, instructions: s.instructions, actionOrAgentId: s.actionOrAgentId, dependsOn: s.dependsOn }), ...(s.touched && !s.locked ? { executionGeneration: s.generation + 1 } : {}), updatedAt: now },
      });
    }
  }
}

export const newStepId = (now: Date) => () => uuidv7(now.getTime());
