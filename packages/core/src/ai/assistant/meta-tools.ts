// Meta-tools của Trợ lý (Blueprint §5.2): danh mục action quá lớn để đưa hết vào prompt → model chỉ thấy các tool này.
//   find_actions(query, module?)   — action trong quyền người dùng + chế độ (catalog.ts).
//   call_action(action_id, input)  — ActionExecutor `source='assistant'`, `onBehalfOfUserId` = người dùng: read chạy ngay, còn lại
//                                    executor trả preview + confirm_token → `needs_confirmation` → run dừng, FE hiện thẻ xác nhận.
//   ui(command)                    — UiCommand (zod) → sự kiện `ui_command` (kết quả tool, turn.service đọc lại từ bước run).
//   plan(steps) / update_step      — `ai_run.plan` (thẻ kế hoạch).
//   query_data(metric, params)     — NOT_IMPLEMENTED tới TIP-038 (`insight.query`).
//   delegate(role|agent_id, task)  — run con `delegate` (delegate.ts).
//   render(tree)                   — cây GenUI (genui/render.ts — TIP-023c): khối đóng, số liệu chỉ `$ref`, nút / form qua intent.
// Chế độ Chat: find_actions (chỉ read) + call_action (chỉ read) + query_data + ui. Cowork: đủ.
import { registry } from '@appchat/actions';
import type { ToolOutcome, ToolSpec } from '@appchat/ai';
import { toJson } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import { AGENT_FIELD_ROLE, AppError, serverMessages, uiCommandSchema } from '@appchat/shared';
import type { ActionContext } from '../../kernel/actions/action-context';
import { implementedBy, type ToolExecutor } from '../../kernel/actions/executor';
import { secretValuesPresent, stripSecrets } from '../../kernel/actions/secret-fields';
import { allowedFor, briefSchema, exampleInput, findActions, modeAllows } from './catalog';
import { resolveCodes } from './code-refs';
import { aiCustomErrors, withCustomSchema } from './custom-schema';
import { delegateTool, type DelegateDeps } from './delegate';
import { renderTool } from './genui/render';
import { dispatchOutcome } from './read-dispatch';
import type { AssistantTurnCtx } from './types';

export type { AssistantTurnCtx } from './types';

export const ASSISTANT_TOOLS = { find: 'find_actions', call: 'call_action', ui: 'ui', plan: 'plan', step: 'update_step', query: 'query_data', delegate: 'delegate' } as const;

const DEFS = new Map(registry.map((a) => [a.id, a]));
const ok = (output: unknown): ToolOutcome => ({ kind: 'ok', output });
const err = (code: string, message: string): ToolOutcome => ({ kind: 'error', code, message });
const STEP_STATUS = ['pending', 'running', 'done', 'failed', 'skipped'] as const;
/** Vai trò cho trường tuỳ biến (FieldPolicy — TIP-045b annex C): Owner `owner`; còn lại vai trò membership hiện tại của người ra lệnh
 *  (authz.roleKey → t.role); không có → `agent` (chỉ trường AI không giới hạn vai trò). */
const roleOf = (t: AssistantTurnCtx) => (t.authz.isOwner ? 'owner' : (t.authz.roleKey ?? t.role ?? AGENT_FIELD_ROLE));


export interface MetaDeps extends DelegateDeps {
  db: TenantDb;
  executor: ToolExecutor;
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

async function callAction(d: MetaDeps, t: AssistantTurnCtx, raw: unknown, stepIdx: number, toolCallId: string): Promise<ToolOutcome> {
  const i = (raw ?? {}) as { action_id?: unknown; input?: unknown };
  const def = typeof i.action_id === 'string' ? DEFS.get(i.action_id) : undefined;
  // Action chưa có handler thật: chặn trước executor, như action không tồn tại (không lộ cho model — TIP-023b R1.2).
  if (!def || !allowedFor(def, t.authz) || !implementedBy(d.executor)(def.id)) return err('FORBIDDEN', `Không gọi được action ${String(i.action_id)} (không tồn tại hoặc ngoài quyền)`);
  if (!modeAllows(def, t.mode)) return err('FORBIDDEN', 'Chế độ Chat chỉ được tra cứu — chuyển sang Cowork để thực hiện thao tác ghi');
  // Ô bí mật (DC-227): model không bao giờ mang giá trị — người dùng nhập ở form GenUI gửi thẳng executor từ trình duyệt.
  const leaked = secretValuesPresent(def, i.input ?? {});
  if (leaked.length) return err('SECRET_FIELD', `Không gửi ô bí mật (${leaked.join(', ')}) qua công cụ — dựng form bằng render với action_id ${def.id}, để người dùng tự nhập.`);
  try {
    // Model nói theo mã hiển thị (KH-1016, BG-1003) → đổi sang id trước khi chạy.
    const { input } = await resolveCodes(d.db, def.id, i.input ?? {}, t.authz);
    // Trường tuỳ biến: Trợ lý chỉ ghi trường `ai = true` của workspace (D56) — kiểu / bắt buộc domain kiểm lại lúc execute.
    const notAi = await aiCustomErrors(d.db, def, input, roleOf(t));
    if (Object.keys(notAi).length) throw new AppError('VALIDATION_FAILED', 422, notAi);
    // Lệnh tạo / gửi / tiền cần Idempotency-Key: gắn theo run + bước + lời gọi (chạy lại cùng lời gọi không tạo hai lần).
    const idem = def.risk === 'read' ? {} : { idempotencyKey: assistantIdemKey(t.runId, stepIdx, toolCallId) };
    return dispatchOutcome(await d.executor.execute(assistantActionCtx(t, stepIdx, idem), def.id, input), stripSecrets(def, input));
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

async function savePlan(db: TenantDb, runId: string, change: (steps: { id: string; title: string; status: string }[]) => { id: string; title: string; status: string }[] | string) {
  const run = await db.aiRun.findUnique({ where: { id: runId }, select: { plan: true } });
  const cur = ((run?.plan ?? {}) as { steps?: { id: string; title: string; status: string }[] }).steps ?? [];
  const next = change(cur);
  if (typeof next === 'string') return err('NOT_FOUND', next);
  await db.aiRun.update({ where: { id: runId }, data: { plan: toJson({ steps: next }) as object } });
  return ok({ steps: next });
}

export function assistantTools(d: MetaDeps, t: AssistantTurnCtx): ToolSpec[] {
  const m = serverMessages(t.locale).ai.assistant;
  const tools: ToolSpec[] = [
    {
      name: ASSISTANT_TOOLS.find,
      description: 'Search the AppChat actions the user may run (by keywords, Vietnamese or English; optional module). Returns id, risk, description and input fields.',
      inputSchema: { type: 'object', properties: { query: { type: 'string' }, module: { type: 'string' } }, required: ['query'] },
      origin: 'meta',
      execute: async (input) => {
        const i = (input ?? {}) as { query?: unknown; module?: unknown };
        const found = findActions(t.authz, t.mode, String(i.query ?? '').slice(0, 200), typeof i.module === 'string' ? i.module : undefined, undefined, implementedBy(d.executor));
        // Ô `custom` → trường tuỳ biến hiện hành của workspace mà người dùng được ghi (SPEC A.5).
        return ok({ actions: await Promise.all(found.map(async (a) => ({ ...a, input: await withCustomSchema(d.db, a, a.input, roleOf(t)) }))) });
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
      description: 'Query a predefined business metric (read-only).',
      inputSchema: { type: 'object', properties: { metric: { type: 'string' }, params: { type: 'object' } }, required: ['metric'] },
      origin: 'meta',
      execute: async () => err('NOT_IMPLEMENTED', m.queryData),
    },
    renderTool({ db: d.db, implemented: implementedBy(d.executor) }, t),
  ];
  if (t.mode === 'chat') return tools;
  return [
    ...tools,
    {
      name: ASSISTANT_TOOLS.plan,
      description: 'Show a step-by-step plan card for multi-step work. Each step: id, title.',
      inputSchema: { type: 'object', properties: { steps: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' } }, required: ['id', 'title'] } } }, required: ['steps'] },
      origin: 'meta',
      execute: (input) => {
        const steps = ((input as { steps?: { id?: unknown; title?: unknown }[] } | null)?.steps ?? []).slice(0, 12).map((s, n) => ({ id: String(s.id ?? n + 1).slice(0, 40), title: String(s.title ?? '').slice(0, 200), status: 'pending' }));
        return savePlan(d.db, t.runId, () => steps);
      },
    },
    {
      name: ASSISTANT_TOOLS.step,
      description: 'Update the status of a plan step: pending | running | done | failed | skipped.',
      inputSchema: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string', enum: [...STEP_STATUS] } }, required: ['id', 'status'] },
      origin: 'meta',
      execute: (input) => {
        const i = (input ?? {}) as { id?: unknown; status?: unknown };
        const status = STEP_STATUS.find((s) => s === i.status) ?? 'running';
        return savePlan(d.db, t.runId, (cur) => (cur.some((s) => s.id === i.id) ? cur.map((s) => (s.id === i.id ? { ...s, status } : s)) : `Không có bước ${String(i.id)}`));
      },
    },
    delegateTool(d, t),
  ];
}
