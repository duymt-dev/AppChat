// Chạy run AI (Blueprint §5.1): engine (AiSdkEngine — @appchat/ai) + lưu run. Mỗi bước LLM: kiểm ví > 0 TRƯỚC, `CreditMeter.charge`
// (DB nền tảng, idempotent `runId:stepIdx`) rồi mới ghi `ai_run_step(llm)` + `credits_used` ở DB tenant; bước tool ghi
// `ai_run_step(tool)`. Tool cần người → `waiting_approval` + `state` (không giữ RAM); `resume` nạp state ở bất kỳ process nào.
// Huỷ: `run.cancel` đổi trạng thái cả cây + phát lệnh huỷ (pub/sub) → runner đang chạy run đó dừng ở bước kế tiếp.
import { resumeMessages, type AgentEngine, type PlanCheckpoint, type InputResolver, type ResponseSchema, type PausedState, type RunEvent, type RunMessage, type ToolOutcome, type ToolSpec } from '@appchat/ai';
import { recordLlmError, recordLlmUsage } from '../../kernel/metrics/ai';
import { AppError, utcToWall } from '@appchat/shared';
import type { CreditMeter } from '../../billing/public';
import type { AppLogger } from '../../kernel/logger/logger';
import { WAITING, type RunRow, type RunStore, type WaitStatus } from './run.store';
import type { KeyValueStore } from '../../kernel/redis';
import { toolActionId } from './tools';
import { attemptHooks } from './attempt-hooks';
import { ensureRootBudget } from './root-budget';

export { DEFAULT_RUN_BUDGET, MAX_STEPS } from './budget-defaults';
import { DEFAULT_RUN_BUDGET } from './budget-defaults';
import { knowledgeStop } from '../kb/scope/recovery';

export interface RunSpec {
  system: string;
  messages: RunMessage[];
  tools: ToolSpec[];
  maxSteps: number;
  /** Nguồn hiển thị ở lịch sử ví (assistant, inbox, marketing…). */
  source: string;
  /** Sự kiện engine của riêng lượt này (Trợ lý stream delta — TIP-023c); không ảnh hưởng ghi run. */
  onEvent?: (e: RunEvent) => void;
  /** TIP-023f §3.1: dựng tham chiếu tệp trước mỗi lời gọi thật (quyền / nguồn hiện hành) — dùng cho lượt đầu, chạy tiếp, xác nhận. */
  inputs?: InputResolver | null;
  /** TIP-023d §3.2: cổng sửa kế hoạch (engine hỏi trước mỗi lời gọi model / tool). */
  planGate?: () => Promise<{ paused: number } | null>;
  /** TIP-023d §2.5: model trả lời xong mà kế hoạch gắn run còn bước chưa xong → run gốc KHÔNG `completed`; giữ checkpoint chờ bước kế. */
  planHold?: () => Promise<{ epoch: number } | null>;
  /** TIP-021b §2.2: sinh theo schema do server sở hữu (không tool). */
  responseSchema?: ResponseSchema;
  /** TIP-021b §2.3 (mẫu 019c): chữ model là kết quả RIÊNG — không ghi `output` công khai của run; người gọi lưu vào binding và công bố sau
   *  khi kiểm theo quyền hiện hành. Run vẫn kết thúc `completed` (usage / trạng thái thật), đọc run chung không thấy chữ. */
  protectedOutput?: boolean;
}

export interface RunResult {
  /** `waiting_child` (TIP-019b §4.3): run con đang chờ — run này dừng, chạy tiếp khi con kết thúc; không phải xong. */
  /** `waiting_operation` (TIP-023d §3.3): dừng để sửa kế hoạch — `plan` mang checkpoint; chạy tiếp chỉ qua plan_resume. */
  status: 'completed' | 'failed' | 'cancelled' | 'waiting_approval' | 'waiting_child' | 'waiting_operation';
  text: string;
  creditsUsed: number;
  stopReason?: string;
  error?: { code: string; message: string };
  paused?: Extract<RunEvent, { type: 'paused' }>;
  plan?: PlanCheckpoint;
  /** Lý do chờ của `plan`: `plan_edit` (người bấm Sửa) / `plan_next` (kế hoạch còn bước — §2.5). */
  planWait?: PlanWait;
}

export type PlanWait = 'plan_edit' | 'plan_next';

const WEEKDAY_VI = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật'];

/** Dòng "bây giờ" cuối system prompt — model không tự biết ngày; "ngày mai", "tuần này", "3 ngày tới" tính từ đây (giờ workspace). */
export function nowLine(at: Date, timeZone: string): string {
  const w = utcToWall(at, timeZone);
  return `# THỜI GIAN HIỆN TẠI\n${WEEKDAY_VI[w.weekday] ?? ''}, ${w.date} ${w.hm} (${timeZone}, ${w.iso.slice(-6)}). Ngày dùng định dạng YYYY-MM-DD khi gọi công cụ.`;
}

/** TIP-020c: run thiếu binding / nguồn đã dùng hết hiệu lực → dừng trước lời gọi model (không gọi provider, không trừ credit). */
async function gateKnowledge(store: RunStore, runId: string): Promise<void> {
  const stop = await store.knowledgeGate(runId);
  if (stop) throw knowledgeStop(stop);
}

export interface RunnerDeps {
  engine: AgentEngine;
  meter: Pick<CreditMeter, 'assertBalance' | 'charge'> & Partial<Pick<CreditMeter, 'price' | 'usage'>> | null;
  log: AppLogger;
  /** Mỗi sự kiện engine (SSE / WS `run.step` — TIP-023 nối). */
  onEvent?: (run: RunRow, e: RunEvent) => void;
  /** Giờ hiện tại + múi giờ workspace → dòng thời gian trong system prompt; thiếu → không chèn (test đơn vị). */
  clock?: { now: () => Date; timeZone: (ws: string) => Promise<string> };
  /** Workspace còn hoạt động (TIP-040, DC-373) — kiểm trước MỖI bước model; tạm dừng → dừng run (lỗi 423), bước đã gửi không thu hồi. */
  assertOpen?: (ws: string) => Promise<void>;
  /** Đánh dấu outbox bẩn sau khi ghi sự kiện run (relay phát `run.step` / `run.done` ngay — TIP-019b §5.3). */
  kv?: Pick<KeyValueStore, 'sadd'> | null;
}

export class AiRunner {
  /** Run đang chạy trong process này → huỷ khi nhận lệnh. */
  private readonly live = new Map<string, AbortController>();

  constructor(private readonly d: RunnerDeps) {}

  /** Huỷ run đang chạy ở process này (lệnh từ `run.cancel` qua pub/sub). */
  abort(runIds: string[]): void {
    for (const id of runIds) this.live.get(id)?.abort();
  }

  /** Chạy run `queued` từ đầu. */
  async start(ws: string, base: RunStore, run: RunRow, spec: RunSpec): Promise<RunResult> {
    const store = base.observed(ws, this.d.kv);
    if (!(await store.claim(run.id, ['queued']))) throw new AppError('INVALID_STATE', 409, { run: run.status });
    return this.loop(ws, store, run, spec, spec.messages, 0);
  }

  /**
   * Chạy tiếp run `waiting_approval` với kết quả của tool đang chờ (đã chạy sau khi người duyệt / xác nhận, hoặc bị từ chối).
   * Idempotent: run không còn chờ (đã chạy tiếp / huỷ) → null.
   */
  async resume(ws: string, base: RunStore, runId: string, outcome: ToolOutcome, spec: Omit<RunSpec, 'messages'>): Promise<RunResult | null> {
    const store = base.observed(ws, this.d.kv);
    const run = await store.get(runId);
    if (!run || !(WAITING as readonly string[]).includes(run.status) || !run.state) return null;
    if (!(await store.claim(run.id, [run.status as WaitStatus]))) return null;
    const state = run.state as unknown as PausedState;
    const idx = await store.nextIdx(run.id);
    await store.step(run.id, { idx, type: 'tool', actionId: toolActionId(state.pendingToolCall.toolName), input: state.pendingToolCall.input, output: outcome, status: outcome.kind === 'error' ? 'error' : 'ok', meta: { resumed: true } });
    return this.loop(ws, store, run, { ...spec, messages: [] }, resumeMessages(state, outcome), state.stepIdx);
  }

  /**
   * TIP-023d §3.6: chạy tiếp run `waiting_operation` (lý do `plan_edit`) từ checkpoint — cùng bộ đếm bước / ngân sách / root, tin kế hoạch
   * mới nối cuối. Claim CAS: đã chạy tiếp / huỷ → null. Không phát lại tool của batch cũ.
   */
  async continuePlan(ws: string, base: RunStore, runId: string, messages: RunMessage[], startStep: number, spec: Omit<RunSpec, 'messages'>): Promise<RunResult | null> {
    const store = base.observed(ws, this.d.kv);
    const run = await store.get(runId);
    if (!run || run.status !== 'waiting_operation') return null;
    if (!(await store.claim(run.id, ['waiting_operation']))) return null;
    return this.loop(ws, store, run, { ...spec, messages: [] }, messages, startStep);
  }

  private async loop(ws: string, store: RunStore, run: RunRow, spec: RunSpec, messages: RunMessage[], startStep: number): Promise<RunResult> {
    const ac = new AbortController();
    this.live.set(run.id, ac);
    const meter = this.d.meter;
    let creditsUsed = run.creditsUsed;
    let text = '';
    // TIP-019b: biên nhận từng lời gọi + ngân sách gốc khi có DB nền tảng (ví theo ref) và bảng tenant; không thì cách cũ.
    const mdb = store.metered();
    const metered =
      mdb && meter?.usage && meter.price
        ? attemptHooks({ db: mdb, meter: { assertBalance: (w) => meter.assertBalance(w), price: (p, m) => meter.price!(p, m), usage: meter.usage }, ws, run, source: spec.source ?? run.kind, now: this.d.clock?.now ?? (() => new Date()), signal: ac.signal, beforeEach: async () => {
            const cur = await store.get(run.id);
            if (cur?.status === 'cancelled') ac.abort();
          } })
        : null;
    try {
      if (mdb && metered) await ensureRootBudget(mdb, run.rootRunId);
      const events = this.d.engine.run(
        {
          runId: run.id,
          workspaceId: ws,
          // Thời gian ở CUỐI: phần đầu system giữ nguyên (mock model / prompt cache nhận diện theo đầu prompt).
          system: this.d.clock ? `${spec.system}\n\n${nowLine(this.d.clock.now(), await this.d.clock.timeZone(ws))}` : spec.system,
          messages,
          tools: spec.tools,
          tier: run.tier as 'standard',
          maxSteps: spec.maxSteps,
          budget: { maxCredits: run.maxCredits ?? DEFAULT_RUN_BUDGET, spent: metered ? run.subtreeCredits : run.creditsUsed },
          startStep,
          ...(spec.inputs ? { inputs: spec.inputs } : {}),
          ...(spec.responseSchema ? { responseSchema: spec.responseSchema } : {}),
          hooks: metered
            ? {
                beforeStep: async () => {
                  const cur = await store.get(run.id);
                  if (cur?.status === 'cancelled') ac.abort();
                  await this.d.assertOpen?.(ws);
                  await gateKnowledge(store, run.id);
                },
                ...metered,
                ...(spec.planGate ? { planGate: spec.planGate } : {}),
              }
            : {
                beforeStep: async () => {
                  const cur = await store.get(run.id);
                  if (cur?.status === 'cancelled') ac.abort();
                  await this.d.assertOpen?.(ws);
                  await gateKnowledge(store, run.id);
                  await meter?.assertBalance(ws);
                },
                onUsage: async (u) => {
                  // Không có DB nền tảng / bảng biên nhận (test đơn vị): nền tảng trước (idempotent runId:stepIdx), tenant sau.
                  const charged = meter ? await meter.charge({ workspaceId: ws, provider: u.provider, model: u.model, tokensIn: u.tokensIn, tokensOut: u.tokensOut, runId: run.id, stepIdx: u.stepIdx, source: spec.source }) : { credits: 0 };
                  const idx = await store.nextIdx(run.id);
                  await store.step(run.id, { idx, type: 'llm', provider: u.provider, model: u.model, tokensIn: u.tokensIn, tokensOut: u.tokensOut, credits: charged.credits, latencyMs: u.latencyMs, meta: { llm_step: u.stepIdx } });
                  await store.addCredits(run.id, charged.credits);
                  recordLlmUsage({ provider: u.provider, model: u.model, purpose: spec.source ?? run.kind, tokensIn: u.tokensIn, tokensOut: u.tokensOut, latencyMs: u.latencyMs, credits: charged.credits });
                  return { credits: charged.credits };
                },
                ...(spec.planGate ? { planGate: spec.planGate } : {}),
              },
        },
        ac.signal,
      );
      for await (const e of events) {
        this.d.onEvent?.(run, e);
        spec.onEvent?.(e);
        if (e.type === 'delta') text += e.text;
        else if (e.type === 'usage') creditsUsed += e.credits;
        else if (e.type === 'tool_result' && e.outcome.kind !== 'needs_confirmation' && e.outcome.kind !== 'needs_approval' && e.outcome.kind !== 'waiting_child') {
          const idx = await store.nextIdx(run.id);
          await store.step(run.id, { idx, type: 'tool', actionId: toolActionId(e.call.toolName), input: e.call.input, output: e.outcome, status: e.outcome.kind === 'error' ? 'error' : 'ok', latencyMs: e.latencyMs });
        } else if (e.type === 'paused') {
          const idx = await store.nextIdx(run.id);
          await store.step(run.id, { idx, type: 'tool', actionId: toolActionId(e.state.pendingToolCall.toolName), input: e.state.pendingToolCall.input, output: e.outcome, status: 'paused' });
          if (e.outcome.kind === 'waiting_child') {
            // Run con đang chờ: run này dừng `waiting_child`, state giữ lời gọi delegate — con kết thúc thì chạy tiếp đúng một lần.
            await store.wait(run.id, 'waiting_child', { ...e.state, child_run_id: e.outcome.runId });
            return { status: 'waiting_child', text, creditsUsed, paused: e };
          }
          await store.pause(run.id, e.state, e.outcome.kind === 'needs_approval' ? e.outcome.approvalId : undefined);
          return { status: 'waiting_approval', text, creditsUsed, paused: e };
        } else if (e.type === 'plan_paused') {
          // TIP-023d §3.3: run gốc giữ KHÔNG kết thúc — `waiting_operation` lý do `plan_edit`; checkpoint đủ chạy tiếp (không phát lại batch).
          await store.wait(run.id, 'waiting_operation', { wait_reason: 'plan_edit', plan_checkpoint: e.checkpoint });
          return { status: 'waiting_operation', text, creditsUsed, plan: e.checkpoint, planWait: 'plan_edit' };
        } else if (e.type === 'error' && (e.code === 'CANCELLED' || e.code === 'BUDGET')) {
          // TIP-019b: cổng gốc từ chối lời gọi / tool kế tiếp — dừng sạch như engine tự dừng (bảng trạng thái thật ở pha 2).
          const reason = e.code === 'CANCELLED' ? 'cancelled' : 'budget';
          await store.stopReason(run.id, reason);
          if (reason === 'cancelled') {
            await store.finish(run.id, 'cancelled');
            return { status: 'cancelled', text, creditsUsed, stopReason: reason };
          }
          return safetyStop(store, run.id, text, creditsUsed, reason);
        } else if (e.type === 'error') {
          recordLlmError(undefined, undefined, spec.source ?? run.kind);
          await store.stopReason(run.id, e.code === 'CREDIT_EXHAUSTED' ? 'credit_exhausted' : e.code === 'USAGE_UNKNOWN' ? 'usage_unknown' : e.code === 'SCOPE_UNAVAILABLE' ? 'scope_unavailable' : e.code === 'KNOWLEDGE_REVOKED' ? 'knowledge_revoked' : 'provider_error');
          await store.finish(run.id, 'failed', { error: `${e.code}: ${e.message}` });
          return { status: 'failed', text, creditsUsed, error: { code: e.code, message: e.message } };
        } else if (e.type === 'finish') {
          await store.stopReason(run.id, e.reason === 'stop' ? 'success' : e.reason);
          if (e.reason === 'cancelled') {
            await store.finish(run.id, 'cancelled');
            return { status: 'cancelled', text: e.text, creditsUsed, stopReason: e.reason };
          }
          // Chỉ dừng tự nhiên (model trả lời xong) là thành công; max_steps / loop_guard / budget là dừng an toàn (DC-380).
          if (e.reason !== 'stop') return safetyStop(store, run.id, e.text, creditsUsed, e.reason);
          // TIP-023d §2.5: còn bước chưa xong thật → chờ (`plan_next`) với checkpoint đủ chạy tiếp cùng bộ đếm bước, không báo thành công.
          const hold = await spec.planHold?.();
          if (hold) {
            const cp: PlanCheckpoint = { messages: e.messages, stepIdx: e.steps, superseded: [], epoch: hold.epoch };
            await store.wait(run.id, 'waiting_operation', { wait_reason: 'plan_next', plan_checkpoint: cp });
            return { status: 'waiting_operation', text: e.text, creditsUsed, plan: cp, planWait: 'plan_next' };
          }
          await store.finish(run.id, 'completed', { output: spec.protectedOutput ? { protected: true, stop: e.reason } : { text: e.text, stop: e.reason } });
          return { status: 'completed', text: e.text, creditsUsed, stopReason: e.reason };
        }
      }
      await store.finish(run.id, 'failed', { error: 'engine_ended' });
      return { status: 'failed', text, creditsUsed, error: { code: 'ENGINE_ENDED', message: 'engine ended without finish' } };
    } catch (err) {
      this.d.log.error({ err, run: run.id }, 'ai run failed');
      await store.finish(run.id, 'failed', { error: err instanceof Error ? err.message : 'error' }).catch(() => undefined);
      throw err;
    } finally {
      this.live.delete(run.id);
    }
  }
}

/** Mã lỗi theo lý do dừng an toàn — người gọi (Trợ lý: lỗi có lý do; agent trực kênh: chuyển người 022b; tác vụ: lỗi) đọc mã này. */
const SAFETY_CODE: Record<string, string> = { max_steps: 'MAX_STEPS', loop_guard: 'LOOP_GUARD', budget: 'BUDGET' };

/** Dừng an toàn → `failed` + `stop_reason` + chữ đã có (không bao giờ là `completed`). */
async function safetyStop(store: RunStore, runId: string, text: string, creditsUsed: number, reason: string): Promise<RunResult> {
  const code = SAFETY_CODE[reason] ?? 'STOPPED';
  await store.finish(runId, 'failed', { output: { text, stop: reason }, error: code });
  return { status: 'failed', text, creditsUsed, stopReason: reason, error: { code, message: reason } };
}

