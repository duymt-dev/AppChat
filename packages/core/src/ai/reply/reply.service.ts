// Một lượt agent trực kênh (Blueprint §5.3): job `agent-reply` → còn tin khách nguồn chưa trả lời (receipt lượt — lời chào không làm xong
// lượt) → chọn agent (gán tay / chuyển giữ nguyên; chưa có → phân luồng từ khoá → mặc định tài khoản; trong giờ = lịch tài khoản ∩ lịch
// agent — TIP-022b) → lời chào một lần (nếu bật) → lắp ngữ cảnh (che PII) → run `agent_reply` (copilot: `suggestion`) → đọc output có cấu
// trúc (ý định đóng) → gửi qua `message.send` (hội thoại đang phục vụ — §3.3) hoặc chuyển người (nháp + tóm tắt có cấu trúc + event
// `ai.handoff`; khiếu nại ở auto → event `ai.complaint_detected`). `transfer_to_agent` ≤ 3 lần / lượt (A → B → A → sang người), đích phải đủ
// điều kiện kênh + giờ. Run chờ duyệt → `ai_state=waiting_approval`; job `ai-resume` chạy tiếp rồi gọi `finishResumedTurn`.
import { decideHandoff, parseAgentReply, unmaskPii, type Embedder } from '@appchat/ai';
import { isMeteringStop, queryEmbedder, type EmbedMeter } from '../runs/metered-embedding';
import { TenantContexts, type TenantDb, type TenantDbResolver } from '@appchat/db';
import { foldText } from '@appchat/shared';
import type { ActionContext } from '../../kernel/actions/action-context';
import type { ToolExecutor } from '../../kernel/actions/executor';
import type { KeyValueStore } from '../../kernel/redis';
import type { AppLogger } from '../../kernel/logger/logger';
import { uuidv7 } from '../../kernel/ids';
import { agentAuthz } from '../agents/agent-authz';
import { MAX_STEPS, type AiRunner, type RunResult } from '../runs/runner';
import { RunStore, type RunRow } from '../runs/run.store';
import { settingsOf } from '../../channels/public';
import { scheduleOf } from '../agents/schedule-config';
import { availability } from './availability';
import { pickAgent } from './agent-pick';
import { isComplaint, recordComplaintIntent } from './complaint-intent';
import { finalizeReceipt, openReceipt, pendingSource, sendGreeting, wantsGreeting } from './greeting';
import { normalizeIntent, recordIntent } from './intent';
import { buildReplyContext, publishedAgent, type ReplyContext } from './reply-context';
import { META, replyTools } from './reply-tools';
import { isSuperseded } from './send-fence';
import { handoff, reasonText, setState, type ReasonKey } from './turn-handoff';
import { acquireTurn, releaseTurn, renewTurn, stillOwns, TURN_LEASE_MS, type TurnLease } from './turn-lease';

/** Tối đa 3 lần `transfer_to_agent` mỗi lượt khách (agent-gateway §5). */
export const MAX_TRANSFERS = 3;
const TURN_BUDGET = 60;

export interface ReplyDeps {
  tenants: TenantDbResolver;
  executor: ToolExecutor;
  runner: AiRunner;
  embedder: Embedder | null;
  /** Đo embedding câu hỏi dưới gốc của lượt (TIP-019b §3.2). */
  meter?: EmbedMeter | null;
  kv: KeyValueStore;
  log: AppLogger;
  now: () => Date;
}

type Conv = NonNullable<Awaited<ReturnType<TenantDb['conversation']['findUnique']>>>;
type Agent = ReplyContext['agent'];
type Published = NonNullable<Awaited<ReturnType<typeof publishedAgent>>>;
export type TurnOutcome = 'sent' | 'suggested' | 'handoff' | 'waiting_approval' | 'skipped' | 'superseded';
/** Lượt khách nguồn đang xử lý (receipt) — null khi chạy tiếp run cũ không có receipt. */
type Source = { conversationId: string; sourceMessageId: string } | null;

/** Khách của hội thoại đã xoá mềm (TIP-015f) — không bắt đầu / chạy tiếp lượt agent. */
const contactDeleted = async (db: TenantDb, c: Conv) =>
  !!c.contactId && !!(await db.contact.findUnique({ where: { id: c.contactId }, select: { deletedAt: true } }))?.deletedAt;
const blocked = (c: Conv) => c.aiMode === 'off' || c.aiState === 'handoff' || c.aiState === 'waiting_approval' || c.status === 'closed';

/** Gửi câu trả lời qua `message.send` với ngữ cảnh agent (hội thoại đang phục vụ — chạy luôn, §3.3). */
async function send(d: ReplyDeps, ws: string, c: Conv, agent: Agent, runId: string, text: string, turn: TurnLease | null): Promise<boolean> {
  const ctx: ActionContext = {
    // Fence lượt + epoch đi cùng tin → đặt chỗ gửi kiểm lại dưới khoá hội thoại (người tiếp quản trước → không gửi).
    ...(turn ? { agentTurn: { fence: turn.fence, epoch: turn.epoch } } : {}),
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

/** Chạy một agent cho hội thoại; trả kết quả run + ngữ cảnh. Tin khách nguồn lưu vào `ai_run.input` TRƯỚC khi tool chạy (TIP-022b D). */
async function runAgent(d: ReplyDeps, db: TenantDb, ws: string, c: Conv, a: Published, extra: { summary?: string; parentRunId?: string; sourceMessageId?: string | null; runId?: string; visited?: string[] } = {}) {
  const copilot = c.aiMode === 'copilot';
  const store = new RunStore(db, d.now);
  // Run (gốc của lượt) tạo TRƯỚC khi lắp ngữ cảnh: embedding câu hỏi kho tri thức trừ vào gốc này (TIP-019b §3.2); bảng PII ghi sau.
  const created = await store.create({
    ...(extra.runId ? { id: extra.runId } : {}),
    kind: copilot ? 'suggestion' : 'agent_reply',
    title: a.agent.name,
    tier: a.cfg.model_tier,
    input: { conversation_id: c.id, copilot, source_message_id: extra.sourceMessageId ?? null, ...(extra.summary ? { transfer_summary: extra.summary } : {}) },
    agentId: a.agent.id,
    agentVersion: a.version,
    conversationId: c.id,
    parentRunId: extra.parentRunId ?? null,
    maxCredits: TURN_BUDGET,
  });
  const embed = d.embedder ? queryEmbedder({ db: store.metered(), embedder: d.embedder, meter: d.meter ?? null, now: d.now }, { ws, runId: created.id, rootRunId: created.rootRunId, source: 'inbox' }) : null;
  let ctx: ReplyContext;
  try {
    ctx = await buildReplyContext(db, c, a, embed);
  } catch (err) {
    if (!isMeteringStop(err)) throw err;
    const code = String((err as { code?: string }).code);
    await store.stopReason(created.id, code === 'CREDIT_EXHAUSTED' ? 'credit_exhausted' : code === 'USAGE_UNKNOWN' ? 'usage_unknown' : code === 'CANCELLED' ? 'cancelled' : 'budget');
    await store.finish(created.id, 'failed', { error: code });
    return { r: { status: 'failed' as const, text: '', creditsUsed: 0, error: { code: code === 'CREDIT_EXHAUSTED' ? code : 'BUDGET', message: (err as Error).message } }, run: created, ctx: await buildReplyContext(db, c, a, null) };
  }
  const run = await db.aiRun.update({ where: { id: created.id }, data: { input: { ...(created.input as object), pii: ctx.pii }, ...(extra.visited?.length ? { transferCount: extra.visited.length, visitedAgents: extra.visited } : {}) } });
  const tools = await replyTools({ db, executor: d.executor, runner: d.runner, now: d.now }, { ws, runId: run.id, conversationId: c.id, agent: { id: a.agent.id, toolIds: a.cfg.tools }, cfg: a.cfg, pii: ctx.pii, dryRun: copilot });
  const system = extra.summary ? `${ctx.system}\n\n# ĐƯỢC CHUYỂN TỪ AGENT KHÁC\n${extra.summary}` : ctx.system;
  const r = await d.runner.start(ws, store, run, { system, messages: ctx.messages, tools, maxSteps: MAX_STEPS.agent, source: 'inbox' });
  return { r, run, ctx };
}

/** Đích chuyển còn đủ điều kiện: đang chạy, loại kênh cho phép, trong giờ (lịch tài khoản ∩ agent). */
async function transferTarget(db: TenantDb, c: Conv, agentId: string, now: Date): Promise<Published | null> {
  const next = await publishedAgent(db, agentId);
  if (!next || (next.cfg.channels.length && !next.cfg.channels.includes(c.channelType))) return null;
  const acc = await db.channelAccount.findUnique({ where: { id: c.channelAccountId }, select: { settings: true } });
  return availability(next.cfg, scheduleOf(acc ? settingsOf(acc).schedule ?? null : null), now).open ? next : null;
}

/** Quyết định sau khi run xong (lượt đầu hoặc sau khi chạy tiếp vì duyệt). */
async function decide(d: ReplyDeps, db: TenantDb, ws: string, c: Conv, run: RunRow, r: RunResult, ctx: Pick<ReplyContext, 'cfg' | 'agent' | 'pii' | 'lastCustomer' | 'previousCustomer' | 'banned'>, transfers: string[], turn: TurnLease | null, source: Source): Promise<TurnOutcome> {
  const copilot = run.kind === 'suggestion';
  const agent = ctx.agent;
  const off = (reason: ReasonKey | string, text: string, draft: string | null, extra: { intent?: ReturnType<typeof normalizeIntent> | null; note?: string | null } = {}) =>
    handoff(d, db, ws, c, { agent, runId: run.id, reason, text, draft, intent: extra.intent ?? null, note: extra.note ?? null, source });
  // Mất lượt (người tiếp quản / đổi chế độ / lượt khác giành sau khi hết hạn): không gửi, không ghi gợi ý / trạng thái — chỉ giữ nháp
  // không gửi kèm lý do khi chưa có nháp của người.
  if (turn && !(await stillOwns(db, turn, d.now()))) {
    const out = r.status === 'completed' ? parseAgentReply(r.text) : null;
    const draft = out?.reply ? unmaskPii(out.reply, ctx.pii) : null;
    if (draft) await db.conversation.updateMany({ where: { id: c.id, aiDraft: null }, data: { aiDraft: draft.slice(0, 4000) } });
    await new RunStore(db, d.now).finish(run.id, 'completed', { output: { superseded: true } }).catch(() => undefined);
    return 'superseded';
  }
  if (r.status === 'waiting_approval') {
    await setState(d, db, ws, c, { aiState: 'waiting_approval' }, 'ai_state');
    return 'waiting_approval';
  }
  if (r.status !== 'completed') {
    const credit = r.error?.code === 'CREDIT_EXHAUSTED';
    if (copilot) return 'skipped';
    await off(credit ? 'credit' : 'error', credit ? reasonText('credit') : reasonText('error', { detail: r.error?.code ?? r.status }), null);
    return 'handoff';
  }

  const coord = await coordination(db, run.id);
  if (coord?.kind === 'transfer' && !copilot) {
    // A → B → A hoặc quá 3 lần trong lượt → sang người.
    if (transfers.length >= MAX_TRANSFERS || transfers.includes(coord.agentId) || coord.agentId === agent.id) {
      await off('transfer_loop', reasonText('transfer_loop'), null, { note: coord.summary });
      return 'handoff';
    }
    // Đích phải đủ điều kiện kênh / giờ — không có thì chuyển người, không cấp agent tạm.
    const next = await transferTarget(db, c, coord.agentId, d.now());
    if (!next) {
      await off('no_target', reasonText('no_target'), null, { note: coord.summary });
      return 'handoff';
    }
    const store = new RunStore(db, d.now);
    await store.step(run.id, { idx: await store.nextIdx(run.id), type: 'handoff', input: { to: next.agent.id, reason: coord.reason }, output: { summary: coord.summary } });
    await store.finish(run.id, 'completed', { output: { transfer_to: next.agent.id } });
    const moved = await db.conversation.update({ where: { id: c.id }, data: { assigneeAgentId: next.agent.id } });
    if (source) await db.aiTurnReceipt.updateMany({ where: source, data: { agentId: next.agent.id, agentVersion: next.version, bindingSource: 'transfer', bindingReason: 'transfer', updatedAt: d.now() } });
    // Chuyển agent giữ CÙNG lượt (fence) và cùng gốc run (lineage) — không mở lượt thứ hai, không cấp ví gốc mới.
    // Lineage bền (TIP-019b §4.1): ghi lần chuyển + agent đã ghé lên run con TRƯỚC khi chạy — chạy tiếp / khởi động lại đọc lại từ đây.
    const visited = [...transfers, agent.id];
    const next0 = await runAgent(d, db, ws, moved, next, { summary: coord.summary, parentRunId: run.id, sourceMessageId: source?.sourceMessageId ?? null, visited });
    return decide(d, db, ws, moved, next0.run, next0.r, next0.ctx, visited, turn, source);
  }

  const out = parseAgentReply(r.text);
  const intent = out.ok && out.intent ? normalizeIntent(out.intent) : null;
  const reply = out.reply ? unmaskPii(out.reply, ctx.pii) : null;
  const rule = coord?.kind === 'handoff' ? 'needs_human' : decideHandoff({ out, threshold: ctx.cfg.threshold, lastCustomerFolded: ctx.lastCustomer, previousCustomerFolded: ctx.previousCustomer, banned: ctx.banned, replyFolded: foldText(reply ?? '') });
  await db.aiRun.update({ where: { id: run.id }, data: { confidence: out.confidence } });
  if (intent && turn) await recordIntent(db, c.id, intent, { source_message_id: source?.sourceMessageId ?? null, run_id: run.id, fence: turn.fence });

  if (copilot) {
    if (!reply) return 'skipped';
    await setState(d, db, ws, c, { aiSuggestion: { text: reply, confidence: Math.round(out.confidence * 100), run_id: run.id } }, 'ai_suggestion');
    return 'suggested';
  }
  if (rule) {
    const note = coord?.kind === 'handoff' ? coord.summary || coord.reason : (out.needs_human ?? null);
    const text = rule === 'needs_human' ? reasonText('needs_human', { detail: coord?.kind === 'handoff' ? coord.reason : (out.needs_human ?? '') }) : reasonText(rule, { pct: Math.round(out.confidence * 100), threshold: ctx.cfg.threshold });
    await off(rule, text, reply, { intent, note });
    // Khiếu nại ở auto: consumer support tạo ticket qua Executor (kiểm lại grant hiện hành) — một ticket mỗi tin nguồn.
    if (isComplaint(rule, intent) && source && turn) await recordComplaintIntent(db, d.kv, ws, { conversationId: c.id, sourceMessageId: source.sourceMessageId, runId: run.id, agentId: agent.id, fence: turn.fence }, d.now());
    return 'handoff';
  }
  try {
    await send(d, ws, c, agent, run.id, reply!, turn);
  } catch (err) {
    // Người tiếp quản giữa lúc soạn (epoch / fence lệch dưới khoá): không chuyển người, giữ nháp nếu người chưa có nháp.
    if (isSuperseded(err)) {
      await db.conversation.updateMany({ where: { id: c.id, aiDraft: null }, data: { aiDraft: reply!.slice(0, 4000) } });
      await new RunStore(db, d.now).finish(run.id, 'completed', { output: { superseded: true } }).catch(() => undefined);
      return 'superseded';
    }
    d.log.warn({ err, run: run.id }, 'agent reply send failed');
    await off('error', reasonText('error', { detail: (err as { code?: string }).code ?? 'send' }), reply, { intent });
    return 'handoff';
  }
  if (source) await finalizeReceipt(db, source, run.id, d.now());
  if (c.aiState !== 'idle') await setState(d, db, ws, c, { aiState: 'idle' }, 'ai_state');
  return 'sent';
}

/** Job `agent-reply`: một lượt cho hội thoại (sau debounce). */
export async function replyTurn(d: ReplyDeps, ws: string, conversationId: string, owner = `turn:${conversationId}:${Date.now()}`): Promise<TurnOutcome> {
  const db = await d.tenants.get(TenantContexts.system(ws, 'agent-reply'));
  // Một lượt mỗi hội thoại (lease bền, fence): job trùng / worker khác đang giữ → bỏ qua, không tạo run thứ hai.
  const turn = await acquireTurn(db, conversationId, owner, d.now());
  if (!turn) return 'skipped';
  const beat = setInterval(() => void renewTurn(db, turn, d.now()).catch(() => undefined), Math.floor(TURN_LEASE_MS / 3));
  try {
    return await ownedTurn(d, db, ws, conversationId, turn);
  } finally {
    clearInterval(beat);
    await releaseTurn(db, turn).catch(() => undefined);
  }
}

async function ownedTurn(d: ReplyDeps, db: TenantDb, ws: string, conversationId: string, turn: TurnLease): Promise<TurnOutcome> {
  const c = await db.conversation.findUnique({ where: { id: conversationId } });
  if (!c || blocked(c) || (await contactDeleted(db, c))) return 'skipped';
  const pending = await pendingSource(db, c.id);
  if (!pending) return 'skipped';
  const now = d.now();
  // Agent của lượt: receipt đã chọn thì giữ (không chọn lại giữa lượt / sau restart); chưa có → gán tay / phân luồng / mặc định.
  const binding = pending.receipt?.agentId ? { agentId: pending.receipt.agentId, source: pending.receipt.bindingSource as 'auto' | 'manual' | 'transfer' } : null;
  const pick = await pickAgent(db, c, pending.src.body, now, binding);
  // Ngoài giờ / không có agent: không gọi model, không trừ credit, không gửi — chờ nhân viên như kênh không có agent.
  if (!pick.agent) return 'skipped';
  const a = pick.agent;
  const receipt = await openReceipt(db, c.id, pending.src.id, turn, { agentId: a.agent.id, version: a.version, source: pick.source, reason: pick.reason }, now);
  if (!c.assigneeAgentId) await db.conversation.update({ where: { id: c.id }, data: { assigneeAgentId: a.agent.id } });
  const source = { conversationId: c.id, sourceMessageId: pending.src.id };
  // Lượt tự trả lời đang chạy → thư mục "AI đang xử lý" (TIP-025); `decide` đưa về idle / chờ duyệt / cần người. Gợi ý copilot
  // không đổi trạng thái (người vẫn đang xử lý).
  const live = c.aiMode === 'auto' && c.aiState === 'idle';
  if (live) await setState(d, db, ws, c, { aiState: 'running' }, 'ai_state');
  const cur = { ...c, assigneeAgentId: a.agent.id, ...(live ? { aiState: 'running' as const } : {}) };
  try {
    const runId = receipt.runId ?? undefined;
    const acc = await db.channelAccount.findUnique({ where: { id: c.channelAccountId }, select: { settings: true } });
    const st = acc ? settingsOf(acc) : null;
    // Lời chào trước câu trả lời đầu (một lần / hội thoại, chỉ khi bật tường minh) — không làm xong lượt.
    if (receipt.greetingPhase !== 'none' || (await wantsGreeting(db, cur, { enabled: !!st?.greeting_enabled, text: st?.greeting ?? '', inHours: true }))) {
      const rid = runId ?? uuidv7(now.getTime());
      if (!receipt.runId) await db.aiTurnReceipt.update({ where: { conversationId_sourceMessageId: source }, data: { runId: rid } });
      await sendGreeting(db, d.executor, ws, cur, { ...receipt, runId: rid }, { id: a.agent.id, toolIds: a.cfg.tools }, rid, st?.greeting ?? '', turn, now);
      const t = await runAgent(d, db, ws, cur, a, { sourceMessageId: pending.src.id, ...(receipt.runId ? {} : { runId: rid }) });
      return await decide(d, db, ws, cur, t.run, t.r, t.ctx, [], turn, source);
    }
    const t = await runAgent(d, db, ws, cur, a, { sourceMessageId: pending.src.id });
    return await decide(d, db, ws, cur, t.run, t.r, t.ctx, [], turn, source);
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
  // Chạy tiếp sau duyệt: giành lại lượt cho cùng run (owner theo run id) — lượt khác đang giữ → không chạy song song.
  // TIP-015f §4.2: khách đã xoá sau khi run dừng chờ duyệt → không chạy tiếp lượt cũ (khôi phục cũng không hồi sinh run đã rào).
  if (await contactDeleted(db, c)) return 'skipped';
  const turn = await acquireTurn(db, c.id, `resume:${run.id}`, d.now());
  if (!turn) return 'skipped';
  try {
    if (c.aiState === 'waiting_approval') c = await db.conversation.update({ where: { id: c.id }, data: { aiState: 'idle' } });
    const src = ((run.input ?? {}) as { source_message_id?: string | null }).source_message_id ?? null;
    const source = src ? { conversationId: c.id, sourceMessageId: src } : null;
    // Kiểm lại giờ theo THỜI ĐIỂM trước khi gửi (không theo lúc job bắt đầu): ngoài giờ → chuyển người kèm nháp, không tự gửi.
    const acc = await db.channelAccount.findUnique({ where: { id: c.channelAccountId }, select: { settings: true } });
    if (run.kind === 'agent_reply' && r.status === 'completed' && !availability(a.cfg, scheduleOf(acc ? settingsOf(acc).schedule ?? null : null), d.now()).open) {
      const out = parseAgentReply(r.text);
      await handoff(d, db, ws, c, { agent: a.agent, runId: run.id, reason: 'out_of_hours', text: reasonText('out_of_hours'), draft: out.reply ? unmaskPii(out.reply, ((run.input ?? {}) as { pii?: Record<string, string> }).pii ?? {}) : null, source });
      return 'handoff';
    }
    const ctx = await buildReplyContext(db, c, a, null, ((run.input ?? {}) as { pii?: Record<string, string> }).pii ?? {});
    // Chạy tiếp không đặt lại lịch sử chuyển (TIP-019b §4.1): A → B → (duyệt) → A vẫn là vòng lặp.
    return await decide(d, db, ws, c, run, r, ctx, run.visitedAgents ?? [], turn, source);
  } finally {
    await releaseTurn(db, turn).catch(() => undefined);
  }
}

/** Duyệt bị từ chối / hết hạn: chuyển người với tóm tắt đầy đủ (không chỉ đánh dấu run). */
export async function handoffAfterApproval(d: Pick<ReplyDeps, 'kv' | 'now'>, db: TenantDb, ws: string, run: RunRow, kind: 'approval_rejected' | 'approval_expired'): Promise<void> {
  if (!run.conversationId || run.kind !== 'agent_reply') return;
  const c = await db.conversation.findUnique({ where: { id: run.conversationId } });
  if (!c) return;
  const agent = run.agentId ? await db.aiAgent.findUnique({ where: { id: run.agentId }, select: { id: true, name: true } }) : null;
  const src = ((run.input ?? {}) as { source_message_id?: string | null }).source_message_id ?? null;
  await handoff(d, db, ws, c, { agent, runId: run.id, reason: kind, text: reasonText(kind), draft: null, source: src ? { conversationId: c.id, sourceMessageId: src } : null });
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
