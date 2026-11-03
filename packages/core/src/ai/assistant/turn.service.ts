// Lượt hội thoại của Trợ lý (Blueprint §4.5, §5.2): `POST /assistant/messages` → nối / tạo phiên của người gọi, lưu tin, run
// `assistant` (`assistant_session_id`, `initiated_by_user_id`), meta-tools theo chế độ → chạy tới khi xong hoặc cần xác nhận → trả
// `{ session_id, run_id, events }` một lần (FE chưa đọc SSE — DV-006). `POST /assistant/confirm`: chạy action với confirm_token
// (executor tiêu thụ — đúng một lần) hoặc huỷ → nối kết quả vào run → chạy tiếp → events. Credit trừ như mọi run; hết ví → `error`.
import { registry } from '@appchat/actions';
import type { ToolOutcome } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import { AI_TIERS, AppError, serverMessages, tierAllowed, type AiTierKey, type AssistantTurnDto, type AuthzContext, type TurnEventDto, type UiCommandDto } from '@appchat/shared';
import { implementedBy, type ToolExecutor } from '../../kernel/actions/executor';
import { uuidv7 } from '../../kernel/ids';
import type { GenUiIntents } from '../../kernel/actions/genui-intent';
import type { KeyValueStore } from '../../kernel/redis';
import { DEFAULT_RUN_BUDGET, MAX_STEPS, type AiRunner, type RunResult, type RunSpec } from '../runs/runner';
import { RunStore, type RunRow } from '../runs/run.store';
import { readAiSetting, tierFor } from '../settings/ai-settings.service';
import { assistantSystem, type AssistantContext, type AssistantRunInput } from './assistant-prompt';
import { confirmCard } from './card';
import type { AssistantMode } from './catalog';
import { ASSISTANT_TOOLS, assistantActionCtx, assistantIdemKey, assistantTools, type AssistantTurnCtx } from './meta-tools';
import { readBack } from './action-readback';
import { EventStore } from './genui/event-store';
import { presentUi, uiPartsOf } from './genui/history';
import { RequestStore, requestHash } from './genui/request-store';
import { RunStream, type Publisher } from './genui/stream';
import { replayEvents } from './genui/turn-queue';
import { bindToken, takePending } from './pending-action';
import { appendMessage, historyMessages, markCard, openSession, type Part } from './sessions';

const DEFS = new Map(registry.map((a) => [a.id, a]));

export interface AssistantDeps {
  executor: ToolExecutor;
  runner: AiRunner;
  kv: KeyValueStore;
  now: () => Date;
  /** Gói của workspace (hạ mức AI vượt gói). */
  planKey(ws: string): Promise<string>;
  /** Ký intent cho node action của cây GenUI (TIP-023c); thiếu → nút / form action bị ẩn. */
  intents?: GenUiIntents | null;
  /** Phát sự kiện lượt (Redis pub/sub) cho SSE — sự kiện luôn ghi sổ trước (TIP-023c). */
  pub?: Publisher | null;
}

export interface TurnRequest {
  ws: string;
  userId: string;
  userName: string;
  role: string;
  locale: string;
  authz: AuthzContext;
  text: string;
  mode: AssistantMode;
  sessionId?: string;
  context?: AssistantContext;
  tier?: AiTierKey;
  attachments?: { id: string; name: string }[];
  /** Khoá idempotent của lượt (TIP-023c): cùng khoá + cùng input → cùng run; khác input → 409. */
  requestId?: string;
}

/** Mức AI của lượt: chọn của người dùng (hoặc mặc định ở Cài đặt › Mô hình AI), hạ về mức cao nhất gói cho phép. */
async function tierOf(d: AssistantDeps, db: TenantDb, ws: string, want?: AiTierKey): Promise<AiTierKey> {
  const plan = await d.planKey(ws);
  if (!want) return tierFor(await readAiSetting(db), null, plan);
  for (let i = AI_TIERS.indexOf(want); i >= 0; i--) if (tierAllowed(AI_TIERS[i]!, plan)) return AI_TIERS[i]!;
  return 'standard';
}

type SpecDeps = Pick<AssistantDeps, 'executor' | 'runner' | 'now'>;

function specFor(d: SpecDeps, db: TenantDb, t: AssistantTurnCtx, system: string): Omit<RunSpec, 'messages'> {
  return { system, tools: assistantTools({ db, executor: d.executor, runner: d.runner, now: d.now }, t), maxSteps: MAX_STEPS.assistant, source: 'assistant' };
}

/** Dựng lại system + tool của run `assistant` từ `ai_run.input` với quyền HIỆN TẠI của người ra lệnh (job `ai-resume`). */
export async function assistantResumeSpec(d: SpecDeps, db: TenantDb, run: RunRow, ws: string, authz: AuthzContext | null): Promise<Omit<RunSpec, 'messages'>> {
  const input = run.input as unknown as AssistantRunInput;
  if (!authz || !run.initiatedByUserId) return { system: '', tools: [], maxSteps: MAX_STEPS.assistant, source: 'assistant' };
  const t: AssistantTurnCtx = { ws, runId: run.id, userId: run.initiatedByUserId, authz, mode: input.mode, locale: input.locale, role: input.role };
  return specFor(d, db, t, await assistantSystem(db, input, authz));
}

/** Sự kiện của một đoạn chạy: ui_command (bước tool `ui` từ `fromIdx`), cây GenUI, chữ, thẻ xác nhận / lỗi. Lưu thành tin của Trợ lý. */
async function eventsOf(d: AssistantDeps, db: TenantDb, run: RunRow, r: RunResult, fromIdx: number, locale: string, sessionId: string, viewer: { ws: string; authz: AuthzContext }): Promise<TurnEventDto[]> {
  const m = serverMessages(locale).ai.assistant;
  const events: TurnEventDto[] = [];
  const parts: Part[] = [];
  const steps = await db.aiRunStep.findMany({ where: { runId: run.id, type: 'tool', actionId: ASSISTANT_TOOLS.ui, status: 'ok', idx: { gte: fromIdx } }, orderBy: { idx: 'asc' }, select: { output: true } });
  for (const s of steps) {
    const cmd = ((s.output ?? {}) as { output?: { ui_command?: UiCommandDto } }).output?.ui_command;
    if (!cmd) continue;
    events.push({ type: 'ui_command', command: cmd });
    parts.push({ type: 'ui_command', command: cmd });
  }
  // Cây GenUI: lưu cây + run (không lưu payload ref); sự kiện kèm refs + intent theo người xem (genui/history.ts).
  for (const ui of await uiPartsOf(db, run.id, fromIdx)) {
    events.push(await presentUi(db, d.intents ?? null, { ws: viewer.ws, userId: run.initiatedByUserId ?? '', authz: viewer.authz, implemented: implementedBy(d.executor) }, ui));
    parts.push(ui);
  }
  const text = r.text.trim();
  if (text) {
    events.push({ type: 'delta', text });
    parts.push({ type: 'text', text });
  }
  const paused = r.paused?.outcome;
  if (r.status === 'waiting_approval' && paused?.kind === 'needs_confirmation') {
    const call = r.paused!.state.pendingToolCall.input as { action_id?: string };
    const def = DEFS.get(call.action_id ?? '');
    if (def) {
      const card = confirmCard(def, paused.preview, paused.confirmToken, locale, r.paused!.state.canonicalInput ?? (call as { input?: unknown }).input ?? {});
      await bindToken(d.kv, paused.confirmToken, run.id);
      events.push(card);
      parts.push({ type: 'card', card, status: 'pending' });
    }
  } else if (r.status === 'failed' || r.status === 'cancelled') {
    const code = r.error?.code ?? r.status.toUpperCase();
    // Mã lỗi chỉ ở `code` của sự kiện + log / ai_run.error; câu hiện cho người dùng không kèm mã (DC-133).
    const message = code === 'CREDIT_EXHAUSTED' ? m.error.CREDIT_EXHAUSTED : m.error.generic;
    events.push({ type: 'error', code, message });
    parts.push({ type: 'text', text: message });
  }
  if (parts.length) await appendMessage(db, sessionId, 'assistant', parts, run.id, d.now());
  return events;
}

/** `POST /assistant/messages`. Sự kiện ghi sổ + phát (SSE) trong lúc chạy; JSON trả cùng run khi xong / dừng chờ. */
export async function assistantTurn(d: AssistantDeps, db: TenantDb, q: TurnRequest): Promise<AssistantTurnDto> {
  const now = d.now();
  const viewer = { ws: q.ws, userId: q.userId, authz: q.authz, implemented: implementedBy(d.executor) };
  const hash = requestHash(q.sessionId, { text: q.text, mode: q.mode, context: q.context ?? null, attachments: (q.attachments ?? []).map((a) => a.id), tier: q.tier ?? null });
  const ledger = new RequestStore(db, d.now);
  if (q.requestId) {
    const prev = await db.assistantRequest.findUnique({ where: { userId_requestId: { userId: q.userId, requestId: q.requestId } } });
    if (prev) {
      // Gửi lại cùng yêu cầu (mạng rớt, F5, tab khác): cùng run — không tạo tin / run mới, không gọi lại model.
      const r = await ledger.claim({ userId: q.userId, requestId: q.requestId, sessionId: prev.sessionId, runId: prev.runId, inputHash: hash });
      return { session_id: r.row.sessionId, run_id: r.row.runId, events: await replayEvents(db, r.row.runId, (p) => presentUi(db, d.intents ?? null, viewer, p)) };
    }
  }
  const session = await openSession(db, q.userId, q.mode, q.text, q.sessionId, now);
  const runId = uuidv7(now.getTime());
  if (q.requestId) {
    const c = await ledger.claim({ userId: q.userId, requestId: q.requestId, sessionId: session.id, runId, inputHash: hash });
    if (c.kind === 'replay') return { session_id: c.row.sessionId, run_id: c.row.runId, events: await replayEvents(db, c.row.runId, (p) => presentUi(db, d.intents ?? null, viewer, p)) };
  }
  await appendMessage(db, session.id, 'user', [{ type: 'text', text: q.text }], null, now);
  const input: AssistantRunInput = {
    text: q.text,
    mode: q.mode,
    session_id: session.id,
    locale: q.locale,
    user_name: q.userName,
    role: q.role,
    ...(q.context ? { context: q.context } : {}),
    ...(q.attachments?.length ? { attachments: q.attachments } : {}),
  };
  const store = new RunStore(db, d.now);
  const run = await store.create({ id: runId, kind: 'assistant', title: q.text.slice(0, 200), tier: await tierOf(d, db, q.ws, q.tier), input, initiatedByUserId: q.userId, assistantSessionId: session.id, maxCredits: DEFAULT_RUN_BUDGET });
  const t: AssistantTurnCtx = { ws: q.ws, runId: run.id, userId: q.userId, authz: q.authz, mode: q.mode, locale: q.locale, role: q.role };
  const spec = specFor(d, db, t, await assistantSystem(db, input, q.authz));
  const live = new RunStream(run.id, new EventStore(db, d.now), d.pub ?? null);
  const r = await d.runner.start(q.ws, store, run, { ...spec, messages: await historyMessages(db, session.id), onEvent: (e) => e.type === 'delta' && live.delta(e.text) });
  const events = await eventsOf(d, db, run, r, 0, q.locale, session.id, { ws: q.ws, authz: q.authz });
  await finishStream(live, events, r, session.id);
  return { session_id: session.id, run_id: run.id, events };
}

/** Phát phần còn lại của lượt lên luồng (delta đã phát trực tiếp) + `done`. */
async function finishStream(live: RunStream, events: TurnEventDto[], r: RunResult, sessionId: string): Promise<void> {
  for (const e of events) if (e.type !== 'delta') await live.emit(e);
  const status = r.status === 'waiting_approval' ? 'waiting_approval' : r.status === 'completed' ? 'completed' : r.status;
  await live.emit({ type: 'done', status, session_id: sessionId });
  await live.close();
}

export interface ConfirmRequest {
  ws: string;
  userId: string;
  authz: AuthzContext;
  token: string;
  decision: 'confirm' | 'cancel';
}

/** `POST /assistant/confirm`: token lạ / hết hạn → 409; run của người khác → 404. */
export async function assistantConfirm(d: AssistantDeps, db: TenantDb, q: ConfirmRequest) {
  const { run, state, input: canonical } = await takePending(d.kv, db, d.now, q.userId, q.token);
  const store = new RunStore(db, d.now);
  const input = run.input as unknown as AssistantRunInput;
  const call = state.pendingToolCall.input as { action_id: string; input?: unknown };
  const t: AssistantTurnCtx = { ws: q.ws, runId: run.id, userId: q.userId, authz: q.authz, mode: input.mode, locale: input.locale, role: input.role };

  let outcome: ToolOutcome;
  let logId: string | undefined;
  let ui: UiCommandDto | undefined;
  let approvalId: string | undefined;
  if (q.decision === 'cancel') outcome = { kind: 'ok', output: { cancelled: true } };
  else {
    try {
      // Chạy đúng input chuẩn hoá đã gắn token lúc xem trước (mã đã đổi → id); không tra lại mã → tránh đổi đích giữa hai bước.
      const stepIdx = state.stepIdx - 1;
      const idem = DEFS.get(call.action_id)?.risk === 'read' ? {} : { idempotencyKey: assistantIdemKey(run.id, stepIdx, state.pendingToolCall.toolCallId) };
      const ctx = assistantActionCtx(t, stepIdx, { confirmToken: q.token, ...idem });
      const out = await d.executor.execute(ctx, call.action_id, canonical);
      if (out.status === 200) {
        logId = out.data.action_log_id;
        ui = out.data.ui_target as UiCommandDto | undefined;
        // Đọc lại bản ghi vừa ghi bằng action get (cùng query + scope của màn) → model trả lời theo trạng thái thật.
        const readback = await readBack(d.executor, t, stepIdx, ui);
        outcome = { kind: 'ok', output: readback ? { result: out.data.result, readback } : out.data.result };
      } else if (out.data.status === 'approval_required') {
        // Governance đẩy sang duyệt (vd. vượt ngưỡng): CHƯA thực hiện — model / thẻ nói rõ đang chờ duyệt, không báo đã xong.
        approvalId = out.data.approval_id;
        outcome = { kind: 'ok', output: { status: 'approval_required', approval_id: approvalId } };
      } else outcome = { kind: 'error', code: 'CONFIRM_EXPIRED', message: 'Xác nhận đã hết hạn' };
    } catch (e) {
      if (!(e instanceof AppError)) throw e;
      outcome = { kind: 'error', code: e.code, message: e.message };
    }
  }
  const done = q.decision === 'confirm' && !!logId;
  await markCard(db, run.id, q.token, done ? 'done' : approvalId ? 'approval' : 'cancelled');
  const def = DEFS.get(call.action_id);
  const fromIdx = await store.nextIdx(run.id);
  const spec = specFor(d, db, t, await assistantSystem(db, input, q.authz));
  const r = await d.runner.resume(q.ws, store, run.id, outcome, spec);
  const fresh = (await store.get(run.id)) ?? run;
  const live = new RunStream(run.id, new EventStore(db, d.now), d.pub ?? null);
  const events = r ? await eventsOf(d, db, fresh, r, fromIdx, input.locale, input.session_id, { ws: q.ws, authz: q.authz }) : [];
  if (r) await finishStream(live, events, r, input.session_id);
  if (done && logId) events.unshift({ type: 'result', action_log_id: logId, summary: def ? confirmCard(def, null, q.token, input.locale).title : call.action_id });
  const target = ui ?? (def && done ? { type: 'navigate' as const, route: confirmCard(def, null, q.token).route } : undefined);
  const status = done ? ('done' as const) : approvalId ? ('approval_required' as const) : ('cancelled' as const);
  return { status, ...(logId ? { action_log_id: logId } : {}), ...(approvalId ? { approval_id: approvalId } : {}), ...(target ? { ui_target: target } : {}), events };
}
