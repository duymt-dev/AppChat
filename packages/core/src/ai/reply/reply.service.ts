// Một lượt agent trực kênh (Blueprint §5.3): job `agent-reply` → kiểm còn cần trả lời (chế độ AI, chưa chuyển người, chưa có lượt
// agent sau tin khách) → lắp ngữ cảnh (che PII) → run `agent_reply` (copilot: `suggestion`) → đọc output có cấu trúc → gửi qua
// `message.send` (hội thoại đang phục vụ, chạy luôn — §3.3) hoặc chuyển người (lưu nháp, `ai_state=handoff`, event `ai.handoff`).
// `transfer_to_agent` đổi agent rồi agent mới chạy ngay trong lượt (≤ 3 lần, A → B → A → sang người). Run dừng chờ duyệt →
// `ai_state=waiting_approval`; job `ai-resume` chạy tiếp rồi gọi `finishTurn` (registerResumeFinish) cho phần quyết định.
import { decideHandoff, parseAgentReply, unmaskPii, type Embedder, type HandoffReason } from '@appchat/ai';
import { TenantContexts, TenantSql, type TenantDb, type TenantDbResolver } from '@appchat/db';
import { foldText, interpolate, serverMessages } from '@appchat/shared';
import type { ActionContext } from '../../kernel/actions/action-context';
import type { ToolExecutor } from '../../kernel/actions/executor';
import type { KeyValueStore } from '../../kernel/redis';
import { markDirty, writeOutbox } from '../../kernel/outbox/outbox';
import type { AppLogger } from '../../kernel/logger/logger';
import { agentAuthz } from '../agents/agent-authz';
import { withinHours } from '../agents/agent.runtime';
import { MAX_STEPS, type AiRunner, type RunResult } from '../runs/runner';
import { RunStore, type RunRow } from '../runs/run.store';
import { buildReplyContext, publishedAgent, type ReplyContext } from './reply-context';
import { META, replyTools } from './reply-tools';

/** Tối đa 3 lần `transfer_to_agent` mỗi lượt khách (agent-gateway §5). */
export const MAX_TRANSFERS = 3;
const TURN_BUDGET = 60;

export interface ReplyDeps {
  tenants: TenantDbResolver;
  executor: ToolExecutor;
  runner: AiRunner;
  embedder: Embedder | null;
  kv: KeyValueStore;
  log: AppLogger;
  now: () => Date;
}

type Conv = NonNullable<Awaited<ReturnType<TenantDb['conversation']['findUnique']>>>;
type Agent = ReplyContext['agent'];
export type TurnOutcome = 'sent' | 'suggested' | 'handoff' | 'waiting_approval' | 'skipped';

const msgs = () => serverMessages('vi').ai.handoff;

/** Agent phụ trách: `assignee_agent_id`, không có thì agent mặc định của tài khoản kênh. */
async function agentIdOf(db: TenantDb, c: Conv): Promise<string | null> {
  if (c.assigneeAgentId) return c.assigneeAgentId;
  const acc = await db.channelAccount.findUnique({ where: { id: c.channelAccountId }, select: { settings: true } });
  return ((acc?.settings ?? {}) as { agent_id?: string | null }).agent_id ?? null;
}

/** Còn cần agent trả lời: AI bật, chưa chuyển người / chờ duyệt, tin cuối là của khách. */
async function needsReply(db: TenantDb, c: Conv): Promise<boolean> {
  if (c.aiMode === 'off' || c.aiState === 'handoff' || c.aiState === 'waiting_approval' || c.status === 'closed') return false;
  const last = await db.message.findFirst({ where: { conversationId: c.id, deletedAt: null, kind: { not: 'note' } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { direction: true } });
  return last?.direction === 'in';
}

async function convEventBase(db: TenantDb, c: Conv) {
  const owner = c.contactId ? await db.contact.findUnique({ where: { id: c.contactId }, select: { ownerUserId: true, name: true } }) : null;
  return {
    base: { conversation_id: c.id, channel_account_id: c.channelAccountId, contact_id: c.contactId, assignee_user_id: c.assigneeUserId, contact_owner_user_id: owner?.ownerUserId ?? null },
    title: c.title ?? owner?.name ?? '',
  };
}

async function setState(d: ReplyDeps, db: TenantDb, ws: string, c: Conv, data: Parameters<TenantDb['conversation']['update']>[0]['data'], change: string) {
  const { base } = await convEventBase(db, c);
  await db.$transaction(async (tx) => {
    await tx.conversation.update({ where: { id: c.id }, data });
    await writeOutbox(tx, ws, [{ topic: 'conversation.updated', payload: { ...base, change } }], d.now());
  });
  await markDirty(d.kv, ws);
}

/** Chuyển sang người: không gửi, lưu nháp, `ai_state=handoff` + lý do, event `ai.handoff` (thông báo `ai_escalate`). */
async function handoff(d: ReplyDeps, db: TenantDb, ws: string, c: Conv, agent: Pick<Agent, 'id' | 'name'> | null, runId: string | null, reason: string, text: string, draft: string | null) {
  const { base, title } = await convEventBase(db, c);
  await db.$transaction(async (tx) => {
    await tx.conversation.update({ where: { id: c.id }, data: { aiState: 'handoff', handoffReason: text.slice(0, 300), aiDraft: draft?.slice(0, 4000) ?? null, aiSuggestion: TenantSql.DbNull } });
    await writeOutbox(tx, ws, [{ topic: 'ai.handoff', payload: { ...base, run_id: runId, agent_id: agent?.id ?? null, agent: agent?.name ?? '', reason, title } }], d.now());
  });
  await markDirty(d.kv, ws);
  if (runId) await new RunStore(db, d.now).finish(runId, 'handoff', { error: reason });
}

const reasonText = (r: HandoffReason | 'error' | 'credit' | 'transfer_loop' | 'approval_rejected', vars: Record<string, string | number> = {}) =>
  interpolate(msgs()[r], { detail: '', pct: 0, threshold: 0, ...vars });

/** Gửi câu trả lời qua `message.send` với ngữ cảnh agent (hội thoại đang phục vụ — chạy luôn, §3.3). */
async function send(d: ReplyDeps, ws: string, c: Conv, agent: Agent, runId: string, text: string): Promise<boolean> {
  const ctx: ActionContext = {
    workspaceId: ws,
    source: 'agent',
    actor: { type: 'agent', id: agent.id },
    runId,
    servedConversationId: c.id,
    idempotencyKey: `agent-reply:${runId}`,
    authz: agentAuthz({ id: agent.id, toolIds: [...agent.toolIds, 'message.send'] }),
  };
  const out = await d.executor.execute(ctx, 'message.send', { conversation_id: c.id, text });
  return out.status === 200;
}

/** Bước `transfer_to_agent` / `handoff` cuối cùng của run (đọc từ ai_run_step — đúng cả khi run chạy tiếp ở process khác). */
async function coordination(db: TenantDb, runId: string) {
  const steps = await db.aiRunStep.findMany({ where: { runId, type: 'tool', actionId: { in: [META.transfer, META.handoff] }, status: 'ok' }, orderBy: { idx: 'asc' }, select: { actionId: true, output: true } });
  for (const s of steps.reverse()) {
    const o = (s.output ?? {}) as { kind?: string; output?: Record<string, unknown> };
    if (o.kind !== 'ok' || !o.output) continue;
    if (s.actionId === META.handoff) return { kind: 'handoff' as const, reason: String(o.output.reason ?? ''), summary: String(o.output.summary ?? '') };
    return { kind: 'transfer' as const, agentId: String(o.output.agent_id), summary: String(o.output.summary ?? ''), reason: String(o.output.reason ?? '') };
  }
  return null;
}

/** Chạy một agent cho hội thoại; trả kết quả run + ngữ cảnh. */
async function runAgent(d: ReplyDeps, db: TenantDb, ws: string, c: Conv, a: NonNullable<Awaited<ReturnType<typeof publishedAgent>>>, extra: { summary?: string; parentRunId?: string } = {}) {
  const copilot = c.aiMode === 'copilot';
  const ctx = await buildReplyContext(db, c, a, d.embedder);
  const store = new RunStore(db, d.now);
  const run = await store.create({
    kind: copilot ? 'suggestion' : 'agent_reply',
    title: a.agent.name,
    tier: a.cfg.model_tier,
    input: { conversation_id: c.id, pii: ctx.pii, copilot, ...(extra.summary ? { transfer_summary: extra.summary } : {}) },
    agentId: a.agent.id,
    agentVersion: a.version,
    conversationId: c.id,
    parentRunId: extra.parentRunId ?? null,
    maxCredits: TURN_BUDGET,
  });
  const tools = await replyTools({ db, executor: d.executor, runner: d.runner, now: d.now }, { ws, runId: run.id, conversationId: c.id, agent: { id: a.agent.id, toolIds: a.cfg.tools }, cfg: a.cfg, pii: ctx.pii, dryRun: copilot });
  const system = extra.summary ? `${ctx.system}\n\n# ĐƯỢC CHUYỂN TỪ AGENT KHÁC\n${extra.summary}` : ctx.system;
  const r = await d.runner.start(ws, store, run, { system, messages: ctx.messages, tools, maxSteps: MAX_STEPS.agent, source: 'inbox' });
  return { r, run, ctx };
}

/** Quyết định sau khi run xong (lượt đầu hoặc sau khi chạy tiếp vì duyệt). */
async function decide(d: ReplyDeps, db: TenantDb, ws: string, c: Conv, run: RunRow, r: RunResult, ctx: Pick<ReplyContext, 'cfg' | 'agent' | 'pii' | 'lastCustomer' | 'previousCustomer' | 'banned'>, transfers: string[]): Promise<TurnOutcome> {
  const copilot = run.kind === 'suggestion';
  const agent = ctx.agent;
  if (r.status === 'waiting_approval') {
    await setState(d, db, ws, c, { aiState: 'waiting_approval' }, 'ai_state');
    return 'waiting_approval';
  }
  if (r.status !== 'completed') {
    const credit = r.error?.code === 'CREDIT_EXHAUSTED';
    const text = credit ? reasonText('credit') : reasonText('error', { detail: r.error?.code ?? r.status });
    if (copilot) return 'skipped';
    await handoff(d, db, ws, c, agent, run.id, credit ? 'credit' : 'error', text, null);
    return 'handoff';
  }

  const coord = await coordination(db, run.id);
  if (coord?.kind === 'transfer' && !copilot) {
    // A → B → A hoặc quá 3 lần trong lượt → sang người.
    if (transfers.length >= MAX_TRANSFERS || transfers.includes(coord.agentId) || coord.agentId === agent.id) {
      await handoff(d, db, ws, c, agent, run.id, 'transfer_loop', reasonText('transfer_loop'), null);
      return 'handoff';
    }
    const next = await publishedAgent(db, coord.agentId);
    if (!next) {
      await handoff(d, db, ws, c, agent, run.id, 'error', reasonText('error', { detail: 'transfer' }), null);
      return 'handoff';
    }
    const idx = await new RunStore(db, d.now).nextIdx(run.id);
    await new RunStore(db, d.now).step(run.id, { idx, type: 'handoff', input: { to: next.agent.id, reason: coord.reason }, output: { summary: coord.summary } });
    await new RunStore(db, d.now).finish(run.id, 'completed', { output: { transfer_to: next.agent.id } });
    const moved = await db.conversation.update({ where: { id: c.id }, data: { assigneeAgentId: next.agent.id } });
    const turn = await runAgent(d, db, ws, moved, next, { summary: coord.summary, parentRunId: run.id });
    return decide(d, db, ws, moved, turn.run, turn.r, turn.ctx, [...transfers, agent.id]);
  }

  const out = parseAgentReply(r.text);
  const reply = out.reply ? unmaskPii(out.reply, ctx.pii) : null;
  const rule = coord?.kind === 'handoff' ? 'needs_human' : decideHandoff({ out, threshold: ctx.cfg.threshold, lastCustomerFolded: ctx.lastCustomer, previousCustomerFolded: ctx.previousCustomer, banned: ctx.banned, replyFolded: foldText(reply ?? '') });
  await db.aiRun.update({ where: { id: run.id }, data: { confidence: out.confidence } });

  if (copilot) {
    if (!reply) return 'skipped';
    await setState(d, db, ws, c, { aiSuggestion: { text: reply, confidence: Math.round(out.confidence * 100), run_id: run.id } }, 'ai_suggestion');
    return 'suggested';
  }
  if (rule) {
    const text = rule === 'needs_human' ? reasonText('needs_human', { detail: coord?.kind === 'handoff' ? coord.reason : (out.needs_human ?? '') }) : reasonText(rule, { pct: Math.round(out.confidence * 100), threshold: ctx.cfg.threshold });
    await handoff(d, db, ws, c, agent, run.id, rule, text, reply);
    return 'handoff';
  }
  try {
    await send(d, ws, c, agent, run.id, reply!);
  } catch (err) {
    d.log.warn({ err, run: run.id }, 'agent reply send failed');
    await handoff(d, db, ws, c, agent, run.id, 'error', reasonText('error', { detail: (err as { code?: string }).code ?? 'send' }), reply);
    return 'handoff';
  }
  if (c.aiState !== 'idle') await setState(d, db, ws, c, { aiState: 'idle' }, 'ai_state');
  return 'sent';
}

/** Job `agent-reply`: một lượt cho hội thoại (sau debounce). */
export async function replyTurn(d: ReplyDeps, ws: string, conversationId: string): Promise<TurnOutcome> {
  const db = await d.tenants.get(TenantContexts.system(ws, 'agent-reply'));
  const c = await db.conversation.findUnique({ where: { id: conversationId } });
  if (!c || !(await needsReply(db, c))) return 'skipped';
  const agentId = await agentIdOf(db, c);
  const a = agentId ? await publishedAgent(db, agentId) : null;
  if (!a) return 'skipped';
  // Kênh của agent: rỗng = mọi kênh; có danh sách thì phải chứa loại kênh của hội thoại.
  if (a.cfg.channels.length && !a.cfg.channels.includes(c.channelType)) return 'skipped';
  // Ngoài khung giờ hoạt động của agent: không trả lời — hội thoại chờ nhân viên như kênh không có agent.
  if (!withinHours(a.cfg.working_hours, d.now())) return 'skipped';
  if (!c.assigneeAgentId) await db.conversation.update({ where: { id: c.id }, data: { assigneeAgentId: a.agent.id } });
  // Lượt tự trả lời đang chạy → thư mục "AI đang xử lý" (TIP-025); `decide` đưa về idle / chờ duyệt / cần người. Gợi ý copilot
  // không đổi trạng thái (người vẫn đang xử lý).
  const live = c.aiMode === 'auto' && c.aiState === 'idle';
  if (live) await setState(d, db, ws, c, { aiState: 'running' }, 'ai_state');
  const cur = { ...c, assigneeAgentId: a.agent.id, ...(live ? { aiState: 'running' as const } : {}) };
  try {
    const turn = await runAgent(d, db, ws, cur, a);
    return await decide(d, db, ws, cur, turn.run, turn.r, turn.ctx, []);
  } finally {
    // Lượt dừng giữa chừng (lỗi / đã gửi) mà còn `running` → về idle; trạng thái khác (chờ duyệt / cần người) giữ nguyên.
    if (live) await db.conversation.updateMany({ where: { id: c.id, aiState: 'running' }, data: { aiState: 'idle' } });
  }
}

/** Sau khi job `ai-resume` chạy tiếp run `agent_reply` / `suggestion` xong: quyết định gửi / chuyển người như lượt thường. */
export async function finishResumedTurn(d: ReplyDeps, db: TenantDb, ws: string, run: RunRow, r: RunResult): Promise<TurnOutcome> {
  if (!run.conversationId || !run.agentId) return 'skipped';
  let c = await db.conversation.findUnique({ where: { id: run.conversationId } });
  const a = await publishedAgent(db, run.agentId);
  if (!c || !a) return 'skipped';
  if (c.aiState === 'waiting_approval') c = await db.conversation.update({ where: { id: c.id }, data: { aiState: 'idle' } });
  const ctx = await buildReplyContext(db, c, a, null, ((run.input ?? {}) as { pii?: Record<string, string> }).pii ?? {});
  return decide(d, db, ws, c, run, r, ctx, []);
}

/** Dựng lại system + tool khi chạy tiếp run trả lời (job `ai-resume`): cùng phiên bản agent, cùng bảng PII của lượt. */
export async function resumeReplySpec(d: Pick<ReplyDeps, 'executor' | 'runner' | 'now'>, db: TenantDb, run: RunRow, ws: string) {
  const a = run.agentId ? await publishedAgent(db, run.agentId) : null;
  const c = run.conversationId ? await db.conversation.findUnique({ where: { id: run.conversationId } }) : null;
  if (!a || !c) return { system: '', tools: [], maxSteps: MAX_STEPS.agent, source: 'inbox' };
  const pii = ((run.input ?? {}) as { pii?: Record<string, string> }).pii ?? {};
  const ctx = await buildReplyContext(db, c, a, null, pii);
  const tools = await replyTools({ db, executor: d.executor, runner: d.runner, now: d.now }, { ws, runId: run.id, conversationId: c.id, agent: { id: a.agent.id, toolIds: a.cfg.tools }, cfg: a.cfg, pii, dryRun: run.kind === 'suggestion' });
  return { system: ctx.system, tools, maxSteps: MAX_STEPS.agent, source: 'inbox' };
}
