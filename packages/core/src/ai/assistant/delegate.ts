// `delegate(role | agent_id, task, context)` của Trợ lý (Blueprint §5.1, §5.2): run con `kind=delegate` chạy agent chuyên trách đã
// xuất bản; tool = quyền agent ∩ quyền người ra lệnh (§3.3b — `runToolIds` lọc + `agentAuthz` để executor kiểm lại mỗi lần gọi);
// độ sâu ≤ 2; ngân sách = phần còn lại của run gốc (cả cây dùng chung). Kết quả: tóm tắt câu trả lời của agent; agent cần duyệt →
// run con chờ ở hàng chờ duyệt (khung "Trợ lý AI đang điều phối" hiện nút Duyệt), Trợ lý nhận `waiting_approval` và chạy tiếp.
import { can, type PermissionKey } from '@appchat/shared';
import type { ToolOutcome, ToolSpec } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import type { ToolExecutor } from '../../kernel/actions/executor';
import { connectedKeys, runToolIds } from '../agents/agent-tools';
import { agentSystem, agentToolSpecs } from '../agents/agent.runtime';
import { publishedAgent } from '../reply/reply-context';
import { MAX_DEPTH } from '../reply/reply-tools';
import { DEFAULT_RUN_BUDGET, MAX_STEPS, type AiRunner } from '../runs/runner';
import { RunStore } from '../runs/run.store';
import type { AssistantTurnCtx } from './types';

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
  const a = await target(d.db, input);
  if (!a) return err('NOT_FOUND', 'Không có agent đang chạy phù hợp');
  const root = parent.rootRunId === parent.id ? parent : await store.get(parent.rootRunId);
  const left = Math.max(0, (root?.maxCredits ?? DEFAULT_RUN_BUDGET) - (root?.creditsUsed ?? 0));
  if (left <= 0) return err('BUDGET', 'Hết ngân sách credit của lượt');
  const allowed = (x: { permission: string }) => x.permission === 'self' || can(t.authz, x.permission as PermissionKey);
  const ids = runToolIds(a.cfg.tools, await connectedKeys(d.db), allowed);
  const context = typeof input.context === 'string' ? input.context.slice(0, 2000) : input.context ? JSON.stringify(input.context).slice(0, 2000) : '';
  const row = await store.create({
    kind: 'delegate',
    title: task.slice(0, 200),
    tier: a.cfg.model_tier,
    input: { task, context },
    parentRunId: t.runId,
    initiatedByUserId: t.userId,
    agentId: a.agent.id,
    agentVersion: a.version,
    maxCredits: left,
  });
  const tools: ToolSpec[] = agentToolSpecs(d.executor, ids, { workspaceId: t.ws, agent: { id: a.agent.id, toolIds: a.cfg.tools }, commander: t.authz, runId: row.id, source: 'agent', db: d.db });
  const system = `${agentSystem(a.cfg)}\n\nTrợ lý AI của doanh nghiệp giao việc cho bạn thay mặt người dùng. Làm đúng việc được giao, trả lời bằng bản tóm tắt ngắn kết quả.`;
  const prompt = context ? `${task}\n\nNgữ cảnh: ${context}` : task;
  const r = await d.runner.start(t.ws, store, row, { system, messages: [{ role: 'user', content: prompt }], tools, maxSteps: MAX_STEPS.agent, source: 'assistant' });
  // Credit của run con tính vào ngân sách cả cây: cộng vào run gốc để lần giao sau thấy phần còn lại đúng.
  if (root && r.creditsUsed > 0) await store.addCredits(root.id, r.creditsUsed);
  if (r.status === 'waiting_approval') return ok({ agent: a.agent.name, run_id: row.id, status: 'waiting_approval', note: 'Agent cần người duyệt một thao tác — đã đưa vào hàng chờ duyệt.' });
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
