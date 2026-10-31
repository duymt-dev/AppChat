// Lượt hội thoại của Trợ lý (Blueprint §4.5, §5.2): `POST /assistant/messages` → nối / tạo phiên của người gọi, lưu tin, run
// `assistant` (`assistant_session_id`, `initiated_by_user_id`), meta-tools theo chế độ → chạy tới khi xong hoặc cần xác nhận → trả
// `{ session_id, run_id, events }` một lần (FE chưa đọc SSE — DV-006). `POST /assistant/confirm`: chạy action với confirm_token
// (executor tiêu thụ — đúng một lần) hoặc huỷ → nối kết quả vào run → chạy tiếp → events. Credit trừ như mọi run; hết ví → `error`.
import { registry } from '@appchat/actions';
import type { PausedState, ToolOutcome } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import { AI_TIERS, AppError, interpolate, serverMessages, tierAllowed, type AiTierKey, type AssistantTurnDto, type AuthzContext, type TurnEventDto, type UiCommandDto } from '@appchat/shared';
import type { ActionExecutor } from '../../kernel/actions/executor';
import type { KeyValueStore } from '../../kernel/redis';
import { CONFIRM_TTL_MS } from '../../kernel/actions/confirm-token';
import { DEFAULT_RUN_BUDGET, MAX_STEPS, type AiRunner, type RunResult, type RunSpec } from '../runs/runner';
import { RunStore, type RunRow } from '../runs/run.store';
import { readAiSetting, tierFor } from '../settings/ai-settings.service';
import { assistantSystem, type AssistantContext, type AssistantRunInput } from './assistant-prompt';
import { confirmCard } from './card';
import type { AssistantMode } from './catalog';
import { ASSISTANT_TOOLS, assistantActionCtx, assistantTools, type AssistantTurnCtx } from './meta-tools';
import { appendMessage, historyMessages, markCard, openSession, type Part } from './sessions';

const DEFS = new Map(registry.map((a) => [a.id, a]));
const cfKey = (token: string) => `assistant:confirm:${token}`;

export interface AssistantDeps {
  executor: Pick<ActionExecutor, 'execute'>;
  runner: AiRunner;
  kv: KeyValueStore;
  now: () => Date;
  /** Gói của workspace (hạ mức AI vượt gói). */
  planKey(ws: string): Promise<string>;
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
  const t: AssistantTurnCtx = { ws, runId: run.id, userId: run.initiatedByUserId, authz, mode: input.mode, locale: input.locale };
  return specFor(d, db, t, await assistantSystem(db, input, authz));
}

/** Sự kiện của một đoạn chạy: ui_command (bước tool `ui` từ `fromIdx`), chữ, thẻ xác nhận / lỗi. Lưu thành tin của Trợ lý. */
async function eventsOf(d: AssistantDeps, db: TenantDb, run: RunRow, r: RunResult, fromIdx: number, locale: string, sessionId: string): Promise<TurnEventDto[]> {
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
      const card = confirmCard(def, paused.preview, paused.confirmToken, locale);
      await d.kv.set(cfKey(paused.confirmToken), run.id, 'PX', CONFIRM_TTL_MS);
      events.push(card);
      parts.push({ type: 'card', card, status: 'pending' });
    }
  } else if (r.status === 'failed' || r.status === 'cancelled') {
    const code = r.error?.code ?? r.status.toUpperCase();
    const message = code === 'CREDIT_EXHAUSTED' ? m.error.CREDIT_EXHAUSTED : interpolate(m.error.generic, { code });
    events.push({ type: 'error', code, message });
    parts.push({ type: 'text', text: message });
  }
  if (parts.length) await appendMessage(db, sessionId, 'assistant', parts, run.id, d.now());
  return events;
}

/** `POST /assistant/messages`. */
export async function assistantTurn(d: AssistantDeps, db: TenantDb, q: TurnRequest): Promise<AssistantTurnDto> {
  const now = d.now();
  const session = await openSession(db, q.userId, q.mode, q.text, q.sessionId, now);
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
  const run = await store.create({ kind: 'assistant', title: q.text.slice(0, 200), tier: await tierOf(d, db, q.ws, q.tier), input, initiatedByUserId: q.userId, assistantSessionId: session.id, maxCredits: DEFAULT_RUN_BUDGET });
  const t: AssistantTurnCtx = { ws: q.ws, runId: run.id, userId: q.userId, authz: q.authz, mode: q.mode, locale: q.locale };
  const spec = specFor(d, db, t, await assistantSystem(db, input, q.authz));
  const r = await d.runner.start(q.ws, store, run, { ...spec, messages: await historyMessages(db, session.id) });
  return { session_id: session.id, run_id: run.id, events: await eventsOf(d, db, run, r, 0, q.locale, session.id) };
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
  const runId = await d.kv.getdel(cfKey(q.token));
  if (!runId) throw new AppError('CONFLICT', 409, { confirm_token: 'expired' }, 'CONFIRM_EXPIRED');
  const store = new RunStore(db, d.now);
  const run = await store.get(runId);
  if (!run || run.kind !== 'assistant' || run.initiatedByUserId !== q.userId) {
    // Không phải người tạo: trả token lại cho chủ (đoán token của người khác không làm mất thẻ của họ).
    if (run) await d.kv.set(cfKey(q.token), runId, 'PX', CONFIRM_TTL_MS);
    throw new AppError('NOT_FOUND', 404, { confirm_token: 'not_found' });
  }
  if (run.status !== 'waiting_approval' || !run.state) throw new AppError('CONFLICT', 409, { confirm_token: 'expired' }, 'CONFIRM_EXPIRED');
  const input = run.input as unknown as AssistantRunInput;
  const state = run.state as unknown as PausedState;
  const call = state.pendingToolCall.input as { action_id: string; input?: unknown };
  const t: AssistantTurnCtx = { ws: q.ws, runId: run.id, userId: q.userId, authz: q.authz, mode: input.mode, locale: input.locale };

  let outcome: ToolOutcome;
  let logId: string | undefined;
  let ui: UiCommandDto | undefined;
  if (q.decision === 'cancel') outcome = { kind: 'ok', output: { cancelled: true } };
  else {
    try {
      const ctx = assistantActionCtx(t, state.stepIdx - 1, { confirmToken: q.token, idempotencyKey: `assistant:${run.id}:${state.stepIdx - 1}` });
      const out = await d.executor.execute(ctx, call.action_id, call.input ?? {});
      if (out.status === 200) {
        outcome = { kind: 'ok', output: out.data.result };
        logId = out.data.action_log_id;
        ui = out.data.ui_target as UiCommandDto | undefined;
      } else outcome = { kind: 'error', code: 'CONFIRM_EXPIRED', message: 'Xác nhận đã hết hạn' };
    } catch (e) {
      if (!(e instanceof AppError)) throw e;
      outcome = { kind: 'error', code: e.code, message: e.message };
    }
  }
  const done = q.decision === 'confirm' && !!logId;
  await markCard(db, run.id, q.token, done ? 'done' : 'cancelled');
  const def = DEFS.get(call.action_id);
  const fromIdx = await store.nextIdx(run.id);
  const spec = specFor(d, db, t, await assistantSystem(db, input, q.authz));
  const r = await d.runner.resume(q.ws, store, run.id, outcome, spec);
  const fresh = (await store.get(run.id)) ?? run;
  const events = r ? await eventsOf(d, db, fresh, r, fromIdx, input.locale, input.session_id) : [];
  if (done && logId) events.unshift({ type: 'result', action_log_id: logId, summary: def ? confirmCard(def, null, q.token, input.locale).title : call.action_id });
  const target = ui ?? (def && done ? { type: 'navigate' as const, route: confirmCard(def, null, q.token).route } : undefined);
  return { status: done ? ('done' as const) : ('cancelled' as const), ...(logId ? { action_log_id: logId } : {}), ...(target ? { ui_target: target } : {}), events };
}
