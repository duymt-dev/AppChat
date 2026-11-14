// Chạy tiếp lượt Trợ lý sau `plan_resume` (TIP-023d §3.6, §7.1): consumer ROLE=jobs nghe `assistant.plan_resumed` → job `assistant-turn`
// (cùng hàng đợi lượt, jobId theo run + epoch) → worker ROLE=ai gọi hàm này: đọc checkpoint đã lưu trong run gốc (`waiting_operation` +
// `plan_edit`), dựng lại spec với quyền HIỆN HÀNH của người ra lệnh, nối tin kế hoạch mới (server dựng), `runner.continuePlan` claim CAS
// (job lặp → null, không gọi model lần hai). Cùng root / ngân sách / bộ đếm bước — không cấp ngân sách mới vì đã sửa.
import type { PlanCheckpoint } from '@appchat/ai';
import { resumeFromCheckpoint } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import type { AuthzContext } from '@appchat/shared';
import { RunStore } from '../../runs/run.store';
import { assistantSystem, type AssistantRunInput } from '../assistant-prompt';
import { eventsOf, finishStream, specFor, type RunDeps } from '../turn.service';
import type { AssistantTurnCtx } from '../types';
import { planBrief } from './resume';
import { selectedCtx } from './selected-agent';
import { tabCtx } from '../ui-command';
import { PLAN_WAITS } from './checkpoint';
import { RunStream } from '../genui/stream';
import { EventStore } from '../genui/event-store';

/** `at` = checkpoint đã được resume (job mang theo): run đã chạy tiếp rồi lại chờ ở checkpoint khác → bỏ qua (đúng một lần mỗi lần chờ). */
export async function continuePlanTurn(d: RunDeps, db: TenantDb, ws: string, rootRunId: string, authz: AuthzContext | null, at?: { epoch: number; step?: number }): Promise<'done' | 'skipped'> {
  const store = new RunStore(db, d.now);
  const run = await store.get(rootRunId);
  const state = run?.state as { wait_reason?: string; plan_checkpoint?: PlanCheckpoint } | null;
  if (!run || run.kind !== 'assistant' || !run.initiatedByUserId || run.status !== 'waiting_operation' || !PLAN_WAITS.has(state?.wait_reason ?? '') || !state?.plan_checkpoint) return 'skipped';
  if (at && (state.plan_checkpoint.epoch !== at.epoch || (at.step !== undefined && state.plan_checkpoint.stepIdx !== at.step))) return 'skipped';
  const plan = await db.assistantPlan.findUnique({ where: { rootRunId }, select: { id: true, phase: true } });
  if (!plan || plan.phase !== 'active' || !authz) return 'skipped';
  const input = run.input as unknown as AssistantRunInput;
  const t: AssistantTurnCtx = { ws, runId: run.id, userId: run.initiatedByUserId, authz, mode: input.mode, locale: input.locale, role: input.role, sessionId: input.session_id, ...selectedCtx(input), ...tabCtx(input) };
  const steps = await db.assistantPlanStep.findMany({ where: { planId: plan.id }, orderBy: { position: 'asc' } });
  const cp = state.plan_checkpoint;
  const fromIdx = await store.nextIdx(run.id);
  const r = await d.runner.continuePlan(ws, store, run.id, resumeFromCheckpoint(cp, planBrief(steps, input.locale)), cp.stepIdx, specFor(d, db, t, await assistantSystem(db, input, authz)));
  if (!r) return 'skipped';
  const fresh = (await store.get(run.id)) ?? run;
  const events = await eventsOf(d, db, fresh, r, fromIdx, input.locale, input.session_id, { ws, authz });
  await finishStream(new RunStream(run.id, new EventStore(db, d.now), d.pub ?? null), events, r, input.session_id);
  return 'done';
}
