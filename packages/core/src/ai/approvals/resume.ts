// Job `ai-resume` (Blueprint §5.1 "lưu và chạy tiếp run"): đọc duyệt →
//   approved: chạy action qua ActionExecutor với `approvalId` (gateway.consume chốt đúng một lần trong transaction của action) →
//             kết quả tool lưu `approval_request.result` (job chạy lại dùng lại, không chạy action lần hai);
//   rejected: kết quả tool `{ rejected: true, note }`;
//   expire:   còn `pending` mà quá `expires_at` → `expired` + run `handoff` (D52).
// Rồi `AiRunner.resume` nối kết quả vào run và chạy tiếp từ `stepIdx` — không giữ gì trong RAM. Duyệt đã xử lý / run không còn chờ → thoát.
import type { ToolOutcome, ToolSpec } from '@appchat/ai';
import { toJson } from '@appchat/ai';
import { AppError, serverMessages, type AuthzContext } from '@appchat/shared';
import { TenantContexts, type TenantDb, type TenantDbResolver } from '@appchat/db';
import type { ActionContext } from '../../kernel/actions/action-context';
import type { ActionExecutor } from '../../kernel/actions/executor';
import { markDirty, writeOutbox } from '../../kernel/outbox/outbox';
import type { KeyValueStore } from '../../kernel/redis';
import type { AppLogger } from '../../kernel/logger/logger';
import { MAX_STEPS, type AiRunner, type RunResult, type RunSpec } from '../runs/runner';
import { RunStore, type RunRow } from '../runs/run.store';
import { agentAuthz } from '../agents/agent-authz';
import { connectedKeys, runToolIds } from '../agents/agent-tools';
import { agentSystem, agentToolSpecs } from '../agents/agent.runtime';
import { blankConfig, merge, type AgentConfig } from '../agents/agent.store';

export interface ResumeDeps {
  tenants: TenantDbResolver;
  executor: Pick<ActionExecutor, 'execute'>;
  runner: AiRunner | null;
  kv: KeyValueStore;
  log: AppLogger;
  now: () => Date;
  /** AuthzContext hiện tại của người ra lệnh (mất quyền / rời workspace → null — §3.3b kiểm lại mỗi lần gọi). */
  commander(ws: string, userId: string): Promise<AuthzContext | null>;
}

type ApprovalRow = NonNullable<Awaited<ReturnType<TenantDb['approvalRequest']['findUnique']>>>;
type SpecFn = (db: TenantDb, run: RunRow, d: ResumeDeps, ws: string) => Promise<Omit<RunSpec, 'messages'>>;

/** Dựng lại system + tool khi chạy tiếp, theo loại run. TIP-023 (Trợ lý) / 035 (Cowork) đăng ký loại của mình. */
const SPECS = new Map<string, SpecFn>();
export const registerResumeSpec = (kind: string, fn: SpecFn) => SPECS.set(kind, fn);

/** Run của agent (trực kênh / được giao): cấu hình theo phiên bản đã chạy, tool = quyền agent ∩ người ra lệnh. */
const agentSpec: SpecFn = async (db, run, d, ws) => {
  const a = run.agentId ? await db.aiAgent.findUnique({ where: { id: run.agentId } }) : null;
  if (!a) return { system: '', tools: [], maxSteps: MAX_STEPS.agent, source: 'agent' };
  const v = run.agentVersion ? await db.aiAgentVersion.findUnique({ where: { agentId_version: { agentId: a.id, version: run.agentVersion } } }) : null;
  const cfg = merge(blankConfig(), (v?.config ?? {}) as Partial<AgentConfig>);
  const commander = run.initiatedByUserId ? ((await d.commander(ws, run.initiatedByUserId)) ?? undefined) : undefined;
  const ids = runToolIds(cfg.tools, await connectedKeys(db));
  const tools: ToolSpec[] = agentToolSpecs(d.executor, ids, { workspaceId: ws, agent: { id: a.id, toolIds: cfg.tools }, ...(commander ? { commander } : {}), runId: run.id, source: run.kind === 'task' ? 'task' : 'agent' });
  return { system: agentSystem(cfg), tools, maxSteps: MAX_STEPS.agent, source: run.kind === 'task' ? 'task' : 'agent' };
};
for (const k of ['delegate', 'consult', 'task']) registerResumeSpec(k, agentSpec);
// `agent_reply` / `suggestion`: spec riêng ở reply (TIP-022 — tool lượt trả lời + PII); thiếu đăng ký → agentSpec.

/** Việc sau khi run chạy tiếp xong, theo loại run (TIP-022: agent trực kênh gửi / chuyển người). */
type FinishFn = (db: TenantDb, run: RunRow, r: RunResult, d: ResumeDeps, ws: string) => Promise<unknown>;
const FINISH = new Map<string, FinishFn>();
export const registerResumeFinish = (kind: string, fn: FinishFn) => FINISH.set(kind, fn);

/** Chạy action đã duyệt → kết quả tool. Lỗi nghiệp vụ (hết quyền, sai trạng thái) → `error` cho model biết, run vẫn tiếp. */
async function executeApproved(d: ResumeDeps, db: TenantDb, ws: string, a: ApprovalRow): Promise<ToolOutcome> {
  let authz: AuthzContext | null = null;
  const commander = a.onBehalfOfUserId ? await d.commander(ws, a.onBehalfOfUserId) : undefined;
  if (a.onBehalfOfUserId && !commander) return { kind: 'error', code: 'FORBIDDEN', message: 'Người ra lệnh không còn quyền' };
  const agent = a.agentId ? await db.aiAgent.findUnique({ where: { id: a.agentId }, select: { id: true, toolIds: true, deletedAt: true } }) : null;
  if (agent && !agent.deletedAt) authz = agentAuthz(agent, commander ?? undefined);
  else if (commander) authz = commander;
  if (!authz) return { kind: 'error', code: 'FORBIDDEN', message: 'Agent không còn tồn tại' };
  const ctx: ActionContext = {
    workspaceId: ws,
    source: a.source as ActionContext['source'],
    actor: agent ? { type: 'agent', id: agent.id } : { type: 'system', id: 'ai-resume' },
    ...(a.onBehalfOfUserId ? { onBehalfOfUserId: a.onBehalfOfUserId } : {}),
    ...(a.runId ? { runId: a.runId } : {}),
    approvalId: a.id,
    idempotencyKey: `approval:${a.id}`,
    authz,
  };
  try {
    const out = await d.executor.execute(ctx, a.actionId, a.input);
    return out.status === 200 ? { kind: 'ok', output: out.data.result } : { kind: 'error', code: 'APPROVAL_LOOP', message: 'Action vẫn cần duyệt' };
  } catch (err) {
    if (err instanceof AppError) return { kind: 'error', code: err.code, message: err.message };
    throw err;
  }
}

export async function resumeApproval(d: ResumeDeps, ws: string, approvalId: string, kind: 'decided' | 'expire'): Promise<'done' | 'skipped'> {
  const db = await d.tenants.get(TenantContexts.system(ws, 'ai-resume'));
  let a = await db.approvalRequest.findUnique({ where: { id: approvalId } });
  if (!a) return 'skipped';
  const now = d.now();
  if (kind === 'expire') {
    if (a.status !== 'pending' || a.expiresAt > now) return 'skipped';
    const events = await db.$transaction(async (tx) => {
      const r = await tx.approvalRequest.updateMany({ where: { id: a!.id, status: 'pending' }, data: { status: 'expired', decidedAt: now } });
      if (r.count !== 1) return null;
      return writeOutbox(tx, ws, [{ topic: 'approval.decided', payload: { approval_id: a!.id, run_id: a!.runId, status: 'expired' } }], now);
    });
    if (!events) return 'skipped';
    await markDirty(d.kv, ws);
    if (a.runId) await new RunStore(db, d.now).finish(a.runId, 'handoff', { error: serverMessages('vi').ai.approval.expired });
    return 'done';
  }
  if (a.status === 'pending' || a.status === 'expired') return 'skipped';

  let outcome: ToolOutcome;
  if (a.status === 'rejected') outcome = { kind: 'ok', output: { rejected: true, note: a.decisionNote ?? serverMessages('vi').ai.approval.rejected } };
  else if (a.result) outcome = a.result as unknown as ToolOutcome;
  else if (a.executedAt) outcome = { kind: 'ok', output: { executed: true } };
  else {
    outcome = await executeApproved(d, db, ws, a);
    // Hai tiến trình cùng chạy một duyệt (job chạy lại / gọi tay): bên thua nhận CONFLICT vì bên kia đã chốt (`executed_at`) — không
    // ghi đè kết quả thật, chờ bên thắng ghi kết quả rồi dùng lại (chạy tiếp run vẫn idempotent nhờ claim).
    if (outcome.kind === 'error' && outcome.code === 'CONFLICT' && (await db.approvalRequest.findUnique({ where: { id: a.id }, select: { executedAt: true } }))?.executedAt) {
      const won = await winnerResult(db, a.id);
      if (!won) return 'done';
      outcome = won;
    } else await db.approvalRequest.update({ where: { id: a.id }, data: { result: toJson(outcome) as object } });
    a = { ...a, result: outcome as never };
  }

  if (!a.runId || !d.runner) return 'done';
  const run = await db.aiRun.findUnique({ where: { id: a.runId } });
  if (!run || run.status !== 'waiting_approval') return 'done';
  const spec = await (SPECS.get(run.kind) ?? agentSpec)(db, run, d, ws);
  const r = await d.runner.resume(ws, new RunStore(db, d.now), run.id, outcome, spec);
  const fresh = r ? await db.aiRun.findUnique({ where: { id: run.id } }) : null;
  if (r && fresh) await FINISH.get(run.kind)?.(db, fresh, r, d, ws);
  return 'done';
}

/** Kết quả do tiến trình đã chốt duyệt ghi (chờ tối đa ~5 giây); không có → null. */
async function winnerResult(db: TenantDb, id: string): Promise<ToolOutcome | null> {
  for (let i = 0; i < 50; i++) {
    const r = await db.approvalRequest.findUnique({ where: { id }, select: { result: true } });
    if (r?.result) return r.result as unknown as ToolOutcome;
    await new Promise((ok) => setTimeout(ok, 100));
  }
  return null;
}
