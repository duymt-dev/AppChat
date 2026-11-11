// Mock Trợ lý AI (Blueprint §4.4 assistant / ai, §4.5): GET /assistant/home, /action-logs, /approvals (tác vụ tự chủ: ai-tasks.ts);
// POST /assistant/messages (kịch bản thay SSE: trả danh sách event) + /assistant/confirm. Dữ liệu = prototype L1178–1504
// (fixture sinh bởi tools/scripts/fixtures/gen-assistant.py).
import { ApiRequestError, can, authzForRole, type PermissionKey, type RunLifecycle } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/assistant.json';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';
import { createTasksState, type MockTask } from './ai-tasks';
import { genUiReply } from './assistant-genui';
import { recordTurn } from './assistant-sessions';
import { bindTurnInputs } from './assistant-input';
import { assertRecordIntent, recordAssistantPosts } from './record-assistant';

export type AssistantFixture = typeof fixture;
export type ActionLogRow = Omit<AssistantFixture['action_logs'][number], 'title' | 'object'> & {
  title?: string;
  object?: string;
  source?: 'ui' | 'assistant';
  undone?: boolean;
};
type Field = { key: string; type: 'string' | 'number' | 'boolean'; required: boolean };
type Approval = AssistantFixture['approvals'][number] & {
  status: 'pending' | 'approved' | 'edited' | 'rejected' | 'expired';
  note?: string;
  input: Record<string, unknown>;
  fields: Field[];
};
type Intent = AssistantFixture['intents'][number];
type Pending = { token: string; intent: Intent; status: 'pending' | 'done' | 'cancelled'; input: Record<string, unknown> };

/** Input mẫu của thẻ theo ý định (form Sửa — REQ-E03b) + khuôn như backend (schema-brief). */
const INTENT_INPUT: Record<string, { input: Record<string, unknown>; schema: Record<string, unknown> }> = {
  quote: { input: { contact_id: 'KH-1016', items: [{ name: 'HIFU nâng cơ', qty: 8, unit_price: '1500000', tax_rate: 8 }] }, schema: { contact_id: 'string', items: [{ name: 'string', qty: 'number', unit_price: 'string', 'tax_rate?': 'number' }] } },
  ticket: { input: { title: 'Khách báo lỗi', priority: 'normal' }, schema: { title: 'string', 'priority?': 'low|normal|high|urgent' } },
};
const inputOf = (i: Intent) => structuredClone(INTENT_INPUT[i.key]?.input ?? {});

/** Thẻ xác nhận theo hợp đồng backend: preview chuẩn (`changes`), input đã chuẩn hoá, khuôn cho form Sửa. */
const cardOf = (token: string, intent: Intent, input: Record<string, unknown>) => ({
  type: 'confirm' as const,
  confirm_token: token,
  ...intent,
  preview: { summary: intent.desc, risk: 'write', changes: [{ entity: intent.action_id.split('.')[0]!, after: input }] },
  input,
  ...(INTENT_INPUT[intent.key] ? { schema: INTENT_INPUT[intent.key]!.schema } : {}),
});

/** Hàng "Trợ lý AI đang điều phối" ở Cowork (REQ-E14) — nguồn GET /v1/runs?root_run_id=&status=. */
export interface Run {
  id: string;
  root_run_id: string;
  task: string;
  agent: string;
  meta: string;
  pct: number | null;
  status: 'running' | 'waiting_approval' | 'done';
  /** Trạng thái thật (TIP-019b, DC-380). */
  lifecycle: RunLifecycle;
  stop_reason: string | null;
  approval_id?: string;
}

export interface AssistantState {
  tasks: MockTask[];
  logs: ActionLogRow[];
  approvals: Approval[];
  runs: Run[];
  pending: Pending[];
  seq: number;
}

/** 4 hàng mẫu của prototype (R0, L11420) — Operations/Sales/Support/Marketing Agent. */
const seedRuns = (): Run[] => [
  { id: 'run_1', root_run_id: 'run_root_1', task: 'Nhắc công nợ 6 khách quá hạn', agent: 'Operations Agent', meta: 'Misa · Zalo ZBS', pct: 60, status: 'running', lifecycle: 'running', stop_reason: null },
  {
    id: 'run_2',
    root_run_id: 'run_root_1',
    task: 'Soạn tin chốt 6 báo giá còn treo',
    agent: 'Sales Agent',
    meta: 'Bảng giá & Báo giá · Zalo ZBS',
    pct: null,
    status: 'waiting_approval',
    lifecycle: 'waiting_approval',
    stop_reason: null,
    approval_id: 'ap_4',
  },
  { id: 'run_3', root_run_id: 'run_root_1', task: 'Phân loại 18 hội thoại mới', agent: 'Support Agent', meta: 'Phân tích ý định', pct: 35, status: 'running', lifecycle: 'running', stop_reason: null },
  { id: 'run_4', root_run_id: 'run_root_1', task: 'Gửi ZNS nhắc lịch hẹn 42 khách', agent: 'Marketing Agent', meta: 'Zalo ZBS', pct: null, status: 'done', lifecycle: 'completed', stop_reason: null },
];

const seedRunApproval = (): Approval => ({
  id: 'ap_4',
  action_id: 'quote.send',
  risk: 'send',
  permission: 'quote.send',
  agent: 'Sales Agent',
  title: 'Soạn tin chốt 6 báo giá còn treo',
  summary: 'Gửi tin nhắc chốt 6 báo giá còn treo qua Zalo ZBS.',
  reason: 'Gửi ra ngoài — cần duyệt trước khi gửi',
  day: 'today',
  time: '09:40',
  status: 'pending',
  input: { quote_id: 'q_1024', channel: 'zalo_personal' },
  fields: [{ key: 'quote_id', type: 'string', required: true }],
});

/** Input agent xin chạy (fixture prototype chỉ có tiêu đề) — đủ để thử "Sửa & duyệt". */
const SEED_INPUT: Record<string, Pick<Approval, 'input' | 'fields'>> = {
  ap_1: { input: { campaign_id: 'cp_flash', note: 'Flash Sale cuối tuần' }, fields: [{ key: 'campaign_id', type: 'string', required: true }, { key: 'note', type: 'string', required: false }] },
};
const seedApproval = (a: AssistantFixture['approvals'][number]): Approval => ({ ...a, status: 'pending', ...(SEED_INPUT[a.id] ?? { input: {}, fields: [] }) });

export const createAssistantState = (): AssistantState => ({
  tasks: createTasksState(),
  logs: structuredClone(fixture.action_logs),
  approvals: [...fixture.approvals.map(seedApproval), seedRunApproval()],
  runs: seedRuns(),
  pending: [],
  seq: 0,
});

const nowTime = () => new Date().toTimeString().slice(0, 5);

/** Mọi action chạy qua mock ActionExecutor được ghi vào nhật ký (action_log = audit log, Blueprint §2.2). */
export const recordActionLog = (db: MockDb, actionId: string, logId: string, risk: string, undoable: boolean, source: 'ui' | 'assistant' = 'ui') => {
  const kind = risk === 'delete' ? 'delete' : risk === 'send' ? 'send' : actionId.endsWith('.create') ? 'create' : 'update';
  db.assistant.logs.unshift({ id: logId, kind, day: 'today', time: nowTime(), undoable, status: 'done', action_id: actionId, source });
};

export const markUndone = (db: MockDb, logId: string) => {
  const row = db.assistant.logs.find((l) => l.id === logId);
  if (row) row.undone = true;
};

const can_ = (db: MockDb, p: string) => can(authzForRole(db.role, 'u_tram'), p as PermissionKey);

export const assistantRoutes: Record<string, MockRoute> = {
  '/assistant/home': () => ({
    think_cards: fixture.think_cards,
    cowork_cards: fixture.cowork_cards,
    prompts: fixture.prompts,
  }),
  '/action-logs': (db, p) => {
    const q = String(p.q ?? '').trim().toLowerCase();
    const rows = db.assistant.logs.filter((l) => {
      const st = l.undone ? 'undone' : l.status;
      return (
        (!p.kind || p.kind === 'all' || l.kind === p.kind) &&
        (!p.status || p.status === 'all' || st === p.status) &&
        (!p.day || p.day === 'all' || l.day === p.day) &&
        (!q || [l.title, l.object, l.action_id].some((v) => v?.toLowerCase().includes(q)))
      );
    });
    return { data: rows, total: db.assistant.logs.length, next_cursor: null };
  },
  '/approvals': (db, p) => {
    const status = String(p.status ?? 'pending');
    return {
      data: db.assistant.approvals
        // Tab Đã duyệt gồm cả "sửa & duyệt" (như backend).
        .filter((a) => status === 'all' || a.status === status || (status === 'approved' && a.status === 'edited'))
        .map((a) => ({ ...a, can_decide: can_(db, 'approvals.decide') && can_(db, a.permission) })),
      next_cursor: null,
    };
  },
  // GET /v1/runs?root_run_id=&status= — khung "Trợ lý AI đang điều phối" ở Cowork (REQ-E14, Blueprint §4.4)
  '/runs': (db, p) => {
    // status=live (chưa có lượt Cowork) = đang chạy + chờ duyệt — như backend (TIP-023).
    const live = (s: Run['status']) => s === 'running' || s === 'waiting_approval';
    const rows = db.assistant.runs.filter(
      (r) => (!p.root_run_id || r.root_run_id === p.root_run_id) && (!p.status || p.status === 'all' || r.status === p.status || (p.status === 'live' && live(r.status))),
    );
    return { data: rows, next_cursor: null };
  },
};

/** Kịch bản trả lời (omiIntent / omiReply L8340–8366): ý định có action → thẻ xác nhận; còn lại → câu trả lời mẫu. */
export const scriptReply = (db: MockDb, text: string, route?: string) => {
  const low = text.toLowerCase();
  const ui = genUiReply(low, route);
  if (ui) return ui;
  const intent = fixture.intents.find((i) => new RegExp(i.re).test(low));
  if (intent) {
    const token = `cf_${++db.assistant.seq}`;
    const input = inputOf(intent);
    db.assistant.pending.push({ token, intent, status: 'pending', input });
    return [cardOf(token, intent, input)];
  }
  const reply = fixture.replies.find((r) => new RegExp(r.re).test(low))?.text ?? fixture.fallback;
  return [{ type: 'delta' as const, text: reply }];
};

/** Nháp Hộp thư (REQ-C05c) — như server: chỉ chữ đề xuất, không event / lệnh UI; hội thoại lạ → 404, viết lại cần nháp. */
const inboxDraft = (db: MockDb, body: Record<string, unknown>) => {
  const id = String(body.conversation_id ?? '');
  if (!db.inbox.conversations.some((c) => c.id === id)) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: 'conversation', fields: { conversation_id: 'not_found' } });
  const draft = String(body.draft ?? '').trim();
  if (body.purpose === 'inbox_rewrite' && !draft) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'draft', fields: { draft: 'required' } });
  const text = body.purpose === 'inbox_rewrite' ? `Dạ, ${draft.charAt(0).toLowerCase()}${draft.slice(1)} ạ.` : 'Dạ em chào anh/chị, em có thể hỗ trợ gì thêm ạ?';
  return { purpose: body.purpose, conversation_id: id, base_version: Number(body.base_version ?? 0), proposed_text: text, run_id: `run_draft_${++db.assistant.seq}`, credits_used: 1 };
};

export const assistantPosts: Record<string, (db: MockDb, body: Record<string, unknown>) => unknown> = {
  // POST /v1/assistant/messages — mock: không stream, trả cả danh sách event của lượt
  '/assistant/messages': (db, body) => {
    if (body.purpose === 'inbox_compose' || body.purpose === 'inbox_rewrite') return inboxDraft(db, body);
    const hasInputs = Array.isArray(body.inputs) && body.inputs.length > 0;
    // Chỉ gửi tệp (TIP-023f §4.1): như server — câu hỏi trung tính, không bịa việc.
    const text = String(body.text ?? '').trim() || (hasInputs ? 'Tệp đính kèm nói gì?' : '');
    if (!text) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'text' });
    const session = String(body.session_id ?? `as_${++db.assistant.seq}`);
    const files = hasInputs ? bindTurnInputs(body.inputs, session) : null;
    // Mock không gọi model: tệp đã chuẩn bị → trả đoạn trích tất định (hợp đồng), không phải chứng minh hiểu nội dung.
    // TIP-023g: lối vào theo bản ghi — kiểm cặp / bản ghi như server (422 / 404), mock không gọi model.
    if (body.record_intent !== undefined) assertRecordIntent(db, body.record_intent);
    const events = files ? [{ type: 'delta' as const, text: `[mock] Đã nhận ${files.names.map((f) => f.name).join(', ')}${files.excerpt ? `: ${files.excerpt}` : ''}` }] : scriptReply(db, text, (body.context as { route?: string } | undefined)?.route);
    recordTurn(session, String(body.mode ?? 'chat'), text, events as never, files?.names);
    return { session_id: session, run_id: null, events };
  },
  ...recordAssistantPosts,
  // POST /v1/assistant/preview-edit — Sửa thẻ: chỉ xem trước lại, token cũ mất hiệu lực (REQ-E03b)
  '/assistant/preview-edit': (db, body) => {
    const p = db.assistant.pending.find((x) => x.token === body.confirm_token);
    if (!p || p.status !== 'pending') throw new ApiRequestError(409, { code: 'CONFLICT', message: 'CONFIRM_EXPIRED' });
    const input = (body.input ?? {}) as Record<string, unknown>;
    if (p.intent.key === 'ticket' && !String(input.title ?? '').trim()) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'title', fields: { title: 'required' } });
    p.status = 'cancelled';
    const token = `cf_${++db.assistant.seq}`;
    db.assistant.pending.push({ token, intent: p.intent, status: 'pending', input });
    return { card: cardOf(token, p.intent, input) };
  },
  // POST /v1/assistant/confirm — xác nhận thẻ: chạy action đã preview, ghi nhật ký nguồn assistant
  '/assistant/confirm': (db, body) => {
    const p = db.assistant.pending.find((x) => x.token === body.confirm_token);
    if (!p || p.status !== 'pending') throw new ApiRequestError(409, { code: 'CONFLICT', message: 'CONFIRM_EXPIRED' });
    if (body.decision === 'cancel') {
      p.status = 'cancelled';
      return { status: 'cancelled', events: [] };
    }
    p.status = 'done';
    const logId = `al_as_${++db.assistant.seq}`;
    recordActionLog(db, p.intent.action_id, logId, 'write', true, 'assistant');
    const row = db.assistant.logs[0]!;
    row.title = p.intent.title;
    row.object = p.intent.dest;
    return { status: 'done', action_log_id: logId, ui_target: { type: 'navigate', route: p.intent.route }, events: [] };
  },
};


const findApproval = (db: MockDb, id: string) => {
  const a = db.assistant.approvals.find((x) => x.id === id && x.status === 'pending');
  if (!a) throw new ApiRequestError(409, { code: 'CONFLICT', message: 'APPROVAL_DECIDED' });
  // duyệt cần thêm permission duyệt của action gốc (Blueprint §3.4 approval.approve)
  if (!can_(db, a.permission)) throw new ApiRequestError(403, { code: 'FORBIDDEN', message: a.permission });
  return a;
};

export const assistantHandlers: Record<string, MockHandler> = {
  'approval.approve': {
    execute: (db, i: { approval_id: string; note?: string }) => {
      const a = findApproval(db, i.approval_id);
      a.status = 'approved';
      a.note = i.note;
      const seed = db.assistant.logs.find((l) => l.action_id === a.action_id && l.status === 'pending');
      if (seed) seed.status = 'done';
      const run = db.assistant.runs.find((r) => r.approval_id === a.id);
      if (run) Object.assign(run, { status: 'done', lifecycle: 'completed', pct: null });
      return { approval_id: a.id, status: a.status };
    },
  },
  'approval.edit_and_approve': {
    execute: (db, i: { approval_id: string; edited_input: Record<string, unknown>; note?: string }) => {
      const a = findApproval(db, i.approval_id);
      a.input = { ...a.input, ...i.edited_input };
      a.status = 'edited';
      a.note = i.note;
      const run = db.assistant.runs.find((r) => r.approval_id === a.id);
      if (run) Object.assign(run, { status: 'done', lifecycle: 'completed', pct: null });
      return { approval_id: a.id, status: a.status };
    },
  },
  'approval.reject': {
    execute: (db, i: { approval_id: string; note?: string }) => {
      const a = findApproval(db, i.approval_id);
      a.status = 'rejected';
      a.note = i.note;
      return { approval_id: a.id, status: a.status };
    },
  },
  'run.cancel': {
    execute: (db, i: { run_id: string }) => {
      const r = db.assistant.runs.find((x) => x.id === i.run_id);
      if (!r) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: i.run_id });
      Object.assign(r, { status: 'done', lifecycle: 'cancelled', stop_reason: 'cancelled', pct: null });
      return { run_id: r.id, status: r.status };
    },
  },
};
