// Meta-tools của Trợ lý (Blueprint §5.2): danh mục action quá lớn để đưa hết vào prompt → model chỉ thấy các tool này.
//   find_actions(query, module?)   — action trong quyền người dùng + chế độ (catalog.ts).
//   call_action(action_id, input)  — ActionExecutor `source='assistant'`, `onBehalfOfUserId` = người dùng: read chạy ngay, còn lại
//                                    executor trả preview + confirm_token → `needs_confirmation` → run dừng, FE hiện thẻ xác nhận.
//   ui(command)                    — UiCommand (zod) → sự kiện `ui_command` (kết quả tool, turn.service đọc lại từ bước run).
//   plan(steps)                    — TIP-023d §1.4: alias mỏng gọi canonical `assistant.plan_propose` qua Executor (cùng đường
//                                    callAction — preview/confirm giữ nguyên); update_step (§1.5) đổi thành chỉ đọc tiến độ thật.
//   query_data(metric, params)     — = call_action `insight.query` (TIP-038): metric allowlist, chỉ đọc, qua ActionExecutor với quyền người dùng.
//   delegate(role|agent_id, task)  — run con `delegate` (delegate.ts).
//   render(tree)                   — cây GenUI (genui/render.ts — TIP-023c): khối đóng, số liệu chỉ `$ref`, nút / form qua intent.
// Chế độ Chat: find_actions (chỉ read) + call_action (chỉ read) + query_data + ui. Cowork: đủ.
import { registry } from '@appchat/actions';
import type { ToolOutcome, ToolSpec } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import { AGENT_FIELD_ROLE, AppError, INSIGHT_LIMITS, METRIC_KEYS, uiCommandSchema } from '@appchat/shared';
import type { ActionContext } from '../../kernel/actions/action-context';
import { implementedBy, type ToolExecutor } from '../../kernel/actions/executor';
import { secretValuesPresent, stripSecrets } from '../../kernel/actions/secret-fields';
import { allowedFor, briefSchema, exampleInput, findActions, modeAllows } from './catalog';
import { ACTION_MODULES, runFindActions, type DiscoveryRuntime } from './discovery/find-tool';
import { resolveCodes } from './code-refs';
import { pinVersion } from './version-pin';
import { aiCustomErrors, withCustomSchema } from './custom-schema';
import { delegateTool, type DelegateDeps } from './delegate';
import { renderTool } from './genui/render';
import { planOfRoot } from './plans/repo';
import { dispatchOutcome } from './read-dispatch';
import type { AssistantTurnCtx } from './types';

export type { AssistantTurnCtx } from './types';

export const ASSISTANT_TOOLS = { find: 'find_actions', call: 'call_action', ui: 'ui', plan: 'plan', step: 'update_step', query: 'query_data', delegate: 'delegate' } as const;

const DEFS = new Map(registry.map((a) => [a.id, a]));
const ok = (output: unknown): ToolOutcome => ({ kind: 'ok', output });
const err = (code: string, message: string): ToolOutcome => ({ kind: 'error', code, message });
/** Input `query_data` → input `insight.query` (chỉ hai khoá — khoá lạ của model không đi tiếp). */
const queryInput = (raw: unknown) => {
  const i = (raw ?? {}) as { metric?: unknown; params?: unknown };
  return { metric: i.metric, ...(i.params && typeof i.params === 'object' ? { params: i.params } : {}) };
};
/** Vai trò cho trường tuỳ biến (FieldPolicy — TIP-045b annex C): Owner `owner`; còn lại vai trò membership hiện tại của người ra lệnh
 *  (authz.roleKey → t.role); không có → `agent` (chỉ trường AI không giới hạn vai trò). */
const roleOf = (t: AssistantTurnCtx) => (t.authz.isOwner ? 'owner' : (t.authz.roleKey ?? t.role ?? AGENT_FIELD_ROLE));
/** Khuôn input `plan` (TIP-023d §1.4) — đúng `steps` của assistant.plan_propose; `session_id`/root run do server gắn, model không gửi. */
const PLAN_STEP_SCHEMA = {
  type: 'object',
  properties: {
    kind: { type: 'string', enum: ['action', 'delegate', 'analysis'] },
    title: { type: 'string' },
    instructions: { type: 'string' },
    action_or_agent_id: { type: 'string' },
    depends_on: { type: 'array', items: { type: 'string' } },
  },
  required: ['kind', 'title', 'instructions'],
} as const;
interface PlanStepIn {
  kind?: unknown;
  title?: unknown;
  instructions?: unknown;
  action_or_agent_id?: unknown;
  depends_on?: unknown;
}


export interface MetaDeps extends DelegateDeps {
  db: TenantDb;
  executor: ToolExecutor;
  /** TIP-023e: route embed + ví — vắng thì find_actions luôn keyword fallback (no_model_route). */
  discovery?: DiscoveryRuntime | null;
}

/** Ngữ cảnh action của Trợ lý: quyền = quyền người dùng (§3.3b), run / bước để log nối về run. */
export const assistantActionCtx = (t: AssistantTurnCtx, stepIdx: number, extra: Partial<ActionContext> = {}): ActionContext => ({
  workspaceId: t.ws,
  source: 'assistant',
  actor: { type: 'assistant', id: t.userId },
  onBehalfOfUserId: t.userId,
  runId: t.runId,
  stepId: String(stepIdx),
  authz: t.authz,
  ...extra,
});

/** Khoá idempotent của lời gọi Trợ lý: run + bước + id lời gọi (một bước gọi nhiều action); action đọc không cần khoá. */
export const assistantIdemKey = (runId: string, stepIdx: number, toolCallId: string) => `assistant:${runId}:${stepIdx}:${toolCallId}`;

/** Action không gọi được → gợi ý action gần tên (cùng bộ lọc quyền / chế độ / handler như find_actions — không lộ action ngoài quyền).
 *  ai:live 023c: model gọi `quote.read` (không có) nhận FORBIDDEN trơn rồi bỏ cuộc thay vì gọi `quote.get` (DC-359). */
function forbiddenMessage(d: MetaDeps, t: AssistantTurnCtx, actionId: unknown): string {
  const id = String(actionId);
  const near = findActions(t.authz, t.mode, id.replace(/[._]/g, ' '), undefined, 3, implementedBy(d.executor)).map((a) => a.id);
  const hint = near.length ? ` — action gần nhất được dùng: ${near.join(', ')} (gọi find_actions nếu chưa đúng)` : ' — gọi find_actions để tìm action đúng';
  return `Không gọi được action ${id} (không tồn tại hoặc ngoài quyền)${hint}`;
}

async function callAction(d: MetaDeps, t: AssistantTurnCtx, raw: unknown, stepIdx: number, toolCallId: string, maxRows?: number): Promise<ToolOutcome> {
  const i = (raw ?? {}) as { action_id?: unknown; input?: unknown };
  const def = typeof i.action_id === 'string' ? DEFS.get(i.action_id) : undefined;
  // Action chưa có handler thật: chặn trước executor, như action không tồn tại (không lộ cho model — TIP-023b R1.2).
  if (!def || !allowedFor(def, t.authz) || !implementedBy(d.executor)(def.id)) return err('FORBIDDEN', forbiddenMessage(d, t, i.action_id));
  if (!modeAllows(def, t.mode)) return err('FORBIDDEN', 'Chế độ Chat chỉ được tra cứu — chuyển sang Cowork để thực hiện thao tác ghi');
  // Ô bí mật (DC-227): model không bao giờ mang giá trị — người dùng nhập ở form GenUI gửi thẳng executor từ trình duyệt.
  const leaked = secretValuesPresent(def, i.input ?? {});
  if (leaked.length) return err('SECRET_FIELD', `Không gửi ô bí mật (${leaked.join(', ')}) qua công cụ — dựng form bằng render với action_id ${def.id}, để người dùng tự nhập.`);
  try {
    // Model nói theo mã hiển thị (KH-1016, BG-1003) → đổi sang id trước khi chạy.
    const { input: named } = await resolveCodes(d.db, def.id, i.input ?? {}, t.authz);
    const input = await pinVersion(d.db, def.id, named);
    // Trường tuỳ biến: Trợ lý chỉ ghi trường `ai = true` của workspace (D56) — kiểu / bắt buộc domain kiểm lại lúc execute.
    const notAi = await aiCustomErrors(d.db, def, input, roleOf(t));
    if (Object.keys(notAi).length) throw new AppError('VALIDATION_FAILED', 422, notAi);
    // Lệnh tạo / gửi / tiền cần Idempotency-Key: gắn theo run + bước + lời gọi (chạy lại cùng lời gọi không tạo hai lần).
    const idem = def.risk === 'read' ? {} : { idempotencyKey: assistantIdemKey(t.runId, stepIdx, toolCallId) };
    return dispatchOutcome(await d.executor.execute(assistantActionCtx(t, stepIdx, idem), def.id, input), stripSecrets(def, input), maxRows);
  } catch (e) {
    if (e instanceof AppError && e.code === 'VALIDATION_FAILED') {
      // Sai khuôn input → kèm khuôn đúng + ví dụ để model tự gọi lại (không bỏ cuộc, không bắt người dùng tự sửa).
      const brief = await withCustomSchema(d.db, def, briefSchema(def), roleOf(t));
      return { kind: 'error', code: e.code, message: `${e.message} ${JSON.stringify(e.fields ?? {})} — gọi lại call_action với input đúng khuôn: ${JSON.stringify(brief)}, ví dụ ${JSON.stringify(exampleInput(def))}. ${def.description}` };
    }
    if (e instanceof AppError) return err(e.code, e.fields ? `${e.message} ${JSON.stringify(e.fields)}` : e.message);
    throw e;
  }
}

/** `plan` alias (§1.4): model gọi `plan(steps)` → đi đúng đường callAction tới `assistant.plan_propose` (preview/confirm giữ
 *  nguyên như mọi action ghi khác — plan_propose risk=write). `session_id` lấy từ phiên hiện hành của lượt, model không tự gửi. */
async function proposePlan(d: MetaDeps, t: AssistantTurnCtx, raw: unknown, stepIdx: number, toolCallId: string): Promise<ToolOutcome> {
  if (!t.sessionId) return err('NOT_FOUND', 'Chưa có phiên Trợ lý hiện hành để gắn kế hoạch');
  const steps = ((raw as { steps?: PlanStepIn[] } | null)?.steps ?? []).slice(0, 12).map((s) => ({
    kind: s.kind,
    title: s.title,
    instructions: s.instructions,
    ...(typeof s.action_or_agent_id === 'string' ? { action_or_agent_id: s.action_or_agent_id } : {}),
    ...(Array.isArray(s.depends_on) ? { depends_on: s.depends_on } : {}),
  }));
  return callAction(d, t, { action_id: 'assistant.plan_propose', input: { session_id: t.sessionId, steps } }, stepIdx, toolCallId);
}

/** `update_step` (§1.5): KHÔNG còn ghi trạng thái theo lời model — chỉ đọc tiến độ thật của plan đang gắn run hiện hành
 *  (receipt đã admitted, không phải lời model tự nhận "done"). Chưa propose plan nào ở lượt này → báo rõ, không giả 404 im lặng. */
async function stepProgress(d: MetaDeps, t: AssistantTurnCtx): Promise<ToolOutcome> {
  const found = await planOfRoot(d.db, t.userId, t.runId, t.sessionId);
  if (!found) return err('NOT_FOUND', 'Chưa có kế hoạch nào gắn với lượt này — gọi plan để tạo trước');
  return ok({
    plan_id: found.plan.id,
    phase: found.plan.phase,
    steps: found.steps.map((s) => ({ id: s.id, position: s.position, title: s.title, state: s.state })),
  });
}

export function assistantTools(d: MetaDeps, t: AssistantTurnCtx): ToolSpec[] {
  const tools: ToolSpec[] = [
    {
      name: ASSISTANT_TOOLS.find,
      description: 'Search the AppChat actions the user may run (by keywords, Vietnamese or English; optional module). Returns id, risk, description and input fields.',
      inputSchema: { type: 'object', properties: { query: { type: 'string' }, module: { type: 'string', enum: ACTION_MODULES } }, required: ['query'] },
      origin: 'meta',
      execute: async (input) => {
        const i = (input ?? {}) as { query?: unknown; module?: unknown };
        const r = await runFindActions(d, t, { query: String(i.query ?? ''), ...(typeof i.module === 'string' ? { module: i.module } : {}) }, implementedBy(d.executor));
        // Ô `custom` → trường tuỳ biến hiện hành của workspace mà người dùng được ghi (SPEC A.5).
        return ok({ actions: await Promise.all(r.actions.map(async (a) => ({ ...a, input: await withCustomSchema(d.db, a, a.input, roleOf(t)) }))), discovery: r.discovery });
      },
    },
    {
      name: ASSISTANT_TOOLS.call,
      description: 'Run an action found with find_actions. Read actions return data now; any other action shows a confirmation card to the user and waits.',
      inputSchema: { type: 'object', properties: { action_id: { type: 'string' }, input: { type: 'object' } }, required: ['action_id', 'input'] },
      origin: 'meta',
      execute: (input, meta) => callAction(d, t, input, meta.stepIdx, meta.toolCallId),
    },
    {
      name: ASSISTANT_TOOLS.ui,
      description: 'Drive the user interface: navigate to a route, open a record, prefill a form, filter a table or highlight an element.',
      inputSchema: { type: 'object', properties: { command: { type: 'object' } }, required: ['command'] },
      origin: 'meta',
      execute: async (input) => {
        const p = uiCommandSchema.safeParse((input as { command?: unknown } | null)?.command);
        return p.success ? ok({ ui_command: p.data }) : err('VALIDATION_FAILED', 'UiCommand không hợp lệ');
      },
    },
    {
      name: ASSISTANT_TOOLS.query,
      description: `${DEFS.get('insight.query')?.description ?? 'Query a predefined business metric (read-only).'} Returns rows + sources; render a chart with $ref to rows.`,
      inputSchema: { type: 'object', properties: { metric: { type: 'string', enum: [...METRIC_KEYS] }, params: { type: 'object' } }, required: ['metric'] },
      origin: 'meta',
      // Cùng đường call_action (executor, quyền người dùng / Cowork ∩ agent, log nối run) — không SQL, không bỏ actor.
      execute: (input, meta) => callAction(d, t, { action_id: 'insight.query', input: queryInput(input) }, meta.stepIdx, meta.toolCallId, INSIGHT_LIMITS.maxRows),
    },
    renderTool({ db: d.db, implemented: implementedBy(d.executor) }, t),
  ];
  if (t.mode === 'chat') return tools;
  return [
    ...tools,
    {
      name: ASSISTANT_TOOLS.plan,
      description: 'Propose a step-by-step plan (1-12 steps) for multi-step work. Each step: kind action|delegate|analysis, title, instructions, optional action_or_agent_id, depends_on (earlier step positions). Shows a confirmation card like any write action.',
      inputSchema: { type: 'object', properties: { steps: { type: 'array', items: PLAN_STEP_SCHEMA, minItems: 1, maxItems: 12 } }, required: ['steps'] },
      origin: 'meta',
      execute: (input, meta) => proposePlan(d, t, input, meta.stepIdx, meta.toolCallId),
    },
    {
      name: ASSISTANT_TOOLS.step,
      description: 'Read the real progress of the plan bound to this run (actual persisted step states) — this does not set step status; status only changes from real execution receipts.',
      inputSchema: { type: 'object', properties: {} },
      origin: 'meta',
      execute: () => stepProgress(d, t),
    },
    delegateTool(d, t),
  ];
}
