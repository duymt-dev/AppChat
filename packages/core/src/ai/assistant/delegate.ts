// `delegate(role | agent_id, task, context)` của Trợ lý (Blueprint §5.1, §5.2): run con `kind=delegate` chạy agent chuyên trách đã
// xuất bản; tool = quyền agent ∩ quyền người ra lệnh (§3.3b — `runToolIds` lọc + `agentAuthz` để executor kiểm lại mỗi lần gọi);
// độ sâu ≤ 2; ngân sách = phần còn lại của run gốc (cả cây dùng chung). Kết quả: tóm tắt câu trả lời của agent; agent cần duyệt →
// run con chờ ở hàng chờ duyệt, run Trợ lý dừng `waiting_child` (TIP-019b) và chạy tiếp khi con kết thúc (runs/child-continuation).
import { can, type PermissionKey } from '@appchat/shared';
import type { ToolOutcome, ToolSpec } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import type { ToolExecutor } from '../../kernel/actions/executor';
import { connectedKeys, runToolIds } from '../agents/agent-tools';
import { agentSystem, agentToolSpecs } from '../agents/agent.runtime';
import { publishedAgent } from '../reply/reply-context';
import { MAX_DEPTH } from '../reply/reply-tools';
import { DEFAULT_RUN_BUDGET, MAX_STEPS, type AiRunner } from '../runs/runner';
import { RunStore, TERMINAL } from '../runs/run.store';
import { existingChild, isChildRace, reuseChild } from '../runs/run-lineage';
import type { AssistantTurnCtx } from './types';
import { agentKnowledge } from '../kb/scope/context';
import { childPlanGuard, pinnedAgent, selectedChildKey } from './plans/selected-agent';

export interface DelegateDeps {
  db: TenantDb;
  executor: ToolExecutor;
  runner: AiRunner;
  now: () => Date;
}

const ROLES = ['sales', 'cs', 'booking', 'marketing', 'accounting', 'ops', 'custom'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ok = (output: unknown): ToolOutcome => ({ kind: 'ok', output });
const err = (code: string, message: string): ToolOutcome => ({ kind: 'error', code, message });

/** Kết quả run con đã có của agent đã chọn (giao lại cùng epoch) — không chạy lại. */
const settled = (agent: string, r: { runId: string; status: string; text: string }): ToolOutcome =>
  r.status === 'completed' ? ok({ agent, run_id: r.runId, status: 'completed', summary: r.text.slice(0, 2000) }) : err('DELEGATE_FAILED', r.status);

/** Agent đích: theo id, hoặc agent đang chạy theo vai trò (sửa gần nhất trước). */
async function target(db: TenantDb, ref: { agent_id?: unknown; role?: unknown }) {
  if (typeof ref.agent_id === 'string' && UUID.test(ref.agent_id)) return publishedAgent(db, ref.agent_id);
  if (typeof ref.role !== 'string' || !ROLES.includes(ref.role)) return null;
  const rows = await db.aiAgent.findMany({ where: { role: ref.role, status: 'active', deletedAt: null, publishedVersion: { gt: 0 } }, orderBy: { updatedAt: 'desc' }, take: 1, select: { id: true } });
  return rows[0] ? publishedAgent(db, rows[0].id) : null;
}

export async function runDelegate(d: DelegateDeps, t: AssistantTurnCtx, input: { agent_id?: unknown; role?: unknown; task?: unknown; context?: unknown }): Promise<ToolOutcome> {
  const task = typeof input.task === 'string' ? input.task.trim().slice(0, 2000) : '';
  if (!task) return err('VALIDATION_FAILED', 'task rỗng');
  const store = new RunStore(d.db, d.now);
  const parent = await store.get(t.runId);
  if (!parent || parent.depth + 1 > MAX_DEPTH) return err('DEPTH_LIMIT', 'Quá độ sâu giao việc');
  // TIP-023d §5.3: đã chọn agent → chỉ giao đúng agent + bản đã ghim (bỏ qua agent_id / role model gửi), không rơi về agent khác.
  const s = t.selected;
  if (s && typeof input.agent_id === 'string' && input.agent_id !== s.id) return err('SELECTED_AGENT_ONLY', 'Người dùng đã chọn agent khác — chỉ giao việc cho agent đã chọn');
  const a = s ? await pinnedAgent(d.db, s) : await target(d.db, input);
  if (!a) return err(s ? 'AGENT_UNAVAILABLE' : 'NOT_FOUND', s ? 'Agent đã chọn không còn chạy đúng phiên bản đã chọn — báo người dùng bỏ chọn hoặc chọn agent khác' : 'Không có agent đang chạy phù hợp');
  // Một run con của agent đã chọn mỗi (gốc, plan_epoch): giao lại → kết quả của run con đó, không sinh con thứ hai.
  const childKey = s ? await selectedChildKey(d.db, parent.rootRunId) : null;
  const prior = childKey ? await existingChild(d.db, { parentRunId: t.runId, childKey }) : null;
  if (prior && !(TERMINAL as readonly string[]).includes(prior.status)) return { kind: 'waiting_child', runId: prior.id };
  if (prior) return settled(a.agent.name, (await reuseChild(d.db, { parentRunId: t.runId, childKey: childKey! }))!);
  const root = parent.rootRunId === parent.id ? parent : await store.get(parent.rootRunId);
  // TIP-019b: phần còn lại theo usage đã định giá của cả cây (kể cả phần ví không đủ); run con chỉ là hạn mức nhỏ hơn trong ví gốc.
  const budget = await d.db.aiRootBudget.findUnique({ where: { rootRunId: parent.rootRunId }, select: { maxCredits: true, observed: true } });
  const left = budget ? Math.max(0, budget.maxCredits - budget.observed) : Math.max(0, (root?.maxCredits ?? DEFAULT_RUN_BUDGET) - (root?.subtreeCredits ?? 0));
  if (left <= 0) return err('BUDGET', 'Hết ngân sách credit của lượt');
  const allowed = (x: { permission: string }) => x.permission === 'self' || can(t.authz, x.permission as PermissionKey);
  const ids = runToolIds(a.cfg.tools, await connectedKeys(d.db), allowed);
  const context = typeof input.context === 'string' ? input.context.slice(0, 2000) : input.context ? JSON.stringify(input.context).slice(0, 2000) : '';
  const create = () => store.create({
    kind: 'delegate',
    title: task.slice(0, 200),
    // Agent đã chọn: mức cấu hình đã xuất bản hạ theo gói lúc nhận lượt (§5.5) — không lấy mức người dùng chọn cho Trợ lý.
    tier: s?.tier ?? a.cfg.model_tier,
    ...(childKey ? { childKey } : {}),
    input: { task, context },
    parentRunId: t.runId,
    initiatedByUserId: t.userId,
    agentId: a.agent.id,
    agentVersion: a.version,
    maxCredits: left,
    // TIP-020c: phạm vi agent đích ∧ quyền người ra lệnh hiện hành — không thừa hưởng phạm vi rộng của Trợ lý.
    knowledge: agentKnowledge({ agentId: a.agent.id, version: a.version, cfg: a.cfg }, { commanderId: t.userId, parentRunId: t.runId }),
  });
  let row;
  try {
    row = await create();
  } catch (e) {
    // Hai lời gọi delegate cùng lúc: unique (cha, khoá) chặn một — bên thua dùng kết quả run con đã có.
    const again = childKey && isChildRace(e) ? await reuseChild(d.db, { parentRunId: t.runId, childKey }) : null;
    if (!again) throw e;
    return settled(a.agent.name, again);
  }
  // §5.4: lời gọi ghi của run con qua cùng cổng bước kế hoạch của gốc (claim một lần ở executor); agent đã chọn → khoá đúng bản đã ghim.
  const tools: ToolSpec[] = agentToolSpecs(d.executor, ids, {
    workspaceId: t.ws, agent: { id: a.agent.id, toolIds: a.cfg.tools }, commander: t.authz, runId: row.id, source: 'agent', db: d.db,
    bindStep: childPlanGuard(d.db, parent.rootRunId),
    ...(s ? { authority: { commanderId: t.userId, commander: async () => t.authz, version: s.version } } : {}),
  });
  const system = `${agentSystem(a.cfg)}\n\nTrợ lý AI của doanh nghiệp giao việc cho bạn thay mặt người dùng. Làm đúng việc được giao, trả lời bằng bản tóm tắt ngắn kết quả.`;
  const prompt = context ? `${task}\n\nNgữ cảnh: ${context}` : task;
  const r = await d.runner.start(t.ws, store, row, { system, messages: [{ role: 'user', content: prompt }], tools, maxSteps: MAX_STEPS.agent, source: 'assistant' });
  // Credit của run con đã cộng vào subtree mọi tổ tiên + ngân sách gốc ở lượt quyết toán (TIP-019b) — không cộng tay lần hai.
  // Run con chờ (duyệt / thao tác — TIP-019b §4.3): cha dừng `waiting_child`, không coi là xong; con kết thúc thì cha chạy tiếp.
  if (r.status === 'waiting_approval' || r.status === 'waiting_child') return { kind: 'waiting_child', runId: row.id };
  if (r.status !== 'completed') return err(r.error?.code ?? 'DELEGATE_FAILED', r.error?.message ?? r.status);
  return ok({ agent: a.agent.name, run_id: row.id, status: 'completed', summary: r.text.slice(0, 2000) });
}

export function delegateTool(d: DelegateDeps, t: AssistantTurnCtx): ToolSpec {
  return {
    name: 'delegate',
    description: 'Delegate a task to a specialist AI agent (by agent_id, or by role: sales, cs, booking, marketing, accounting, ops). The agent acts with the user permissions and returns a summary.',
    inputSchema: { type: 'object', properties: { agent_id: { type: 'string' }, role: { type: 'string', enum: ROLES }, task: { type: 'string' }, context: { type: 'string' } }, required: ['task'] },
    origin: 'meta',
    execute: (input) => runDelegate(d, t, (input ?? {}) as Record<string, unknown>),
  };
}
