// Mock Trợ lý AI (Blueprint §4.4 assistant / ai, §4.5): GET /assistant/home, /ai-tasks, /action-logs, /approvals;
// POST /assistant/messages (kịch bản thay SSE: trả danh sách event) + /assistant/confirm. Dữ liệu = prototype L1178–1504
// (fixture sinh bởi tools/scripts/fixtures/gen-assistant.py).
import { ApiRequestError, can, authzForRole, type PermissionKey } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/assistant.json';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';

export type AssistantFixture = typeof fixture;
type Task = AssistantFixture['tasks'][number] & { goal?: string; prompt?: string };
export type ActionLogRow = Omit<AssistantFixture['action_logs'][number], 'title' | 'object'> & {
  title?: string;
  object?: string;
  source?: 'ui' | 'assistant';
  undone?: boolean;
};
type Approval = AssistantFixture['approvals'][number] & { status: 'pending' | 'approved' | 'rejected'; note?: string };
type Intent = AssistantFixture['intents'][number];
type Pending = { token: string; intent: Intent; status: 'pending' | 'done' | 'cancelled' };

/** Hàng "Trợ lý AI đang điều phối" ở Cowork (REQ-E14) — nguồn GET /v1/runs?root_run_id=&status=. */
export interface Run {
  id: string;
  root_run_id: string;
  task: string;
  agent: string;
  meta: string;
  pct: number;
  status: 'running' | 'waiting_approval' | 'done';
  approval_id?: string;
}

export interface AssistantState {
  tasks: Task[];
  logs: ActionLogRow[];
  approvals: Approval[];
  runs: Run[];
  pending: Pending[];
  seq: number;
}

/** 4 hàng mẫu của prototype (R0, L11420) — Operations/Sales/Support/Marketing Agent. */
const seedRuns = (): Run[] => [
  { id: 'run_1', root_run_id: 'run_root_1', task: 'Nhắc công nợ 6 khách quá hạn', agent: 'Operations Agent', meta: 'Misa · Zalo ZBS', pct: 60, status: 'running' },
  {
    id: 'run_2',
    root_run_id: 'run_root_1',
    task: 'Soạn tin chốt 6 báo giá còn treo',
    agent: 'Sales Agent',
    meta: 'Bảng giá & Báo giá · Zalo ZBS',
    pct: 100,
    status: 'waiting_approval',
    approval_id: 'ap_4',
  },
  { id: 'run_3', root_run_id: 'run_root_1', task: 'Phân loại 18 hội thoại mới', agent: 'Support Agent', meta: 'Phân tích ý định', pct: 35, status: 'running' },
  { id: 'run_4', root_run_id: 'run_root_1', task: 'Gửi ZNS nhắc lịch hẹn 42 khách', agent: 'Marketing Agent', meta: 'Zalo ZBS', pct: 100, status: 'done' },
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
});

export const createAssistantState = (): AssistantState => ({
  tasks: structuredClone(fixture.tasks),
  logs: structuredClone(fixture.action_logs),
  approvals: [...fixture.approvals.map((a) => ({ ...a, status: 'pending' as const })), seedRunApproval()],
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
  '/ai-tasks': (db) => {
    const t = db.assistant.tasks;
    const runs = t.reduce((s, x) => s + x.runs, 0);
    return {
      tasks: t,
      stats: fixture.task_stats.map((s) => ({
        ...s,
        value:
          s.key === 'total' ? String(t.length)
          : s.key === 'active' ? `${t.filter((x) => x.active).length}/${t.length}`
          : s.key === 'runs' ? runs.toLocaleString('vi-VN')
          : fixture.task_kpi[s.key as keyof typeof fixture.task_kpi],
      })),
      templates: fixture.task_templates,
      departments: fixture.departments,
      data_options: fixture.task_data,
      tool_options: fixture.task_tools,
      drawer: fixture.drawer,
    };
  },
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
        .filter((a) => status === 'all' || a.status === status)
        .map((a) => ({ ...a, can_decide: can_(db, 'approvals.decide') && can_(db, a.permission) })),
      next_cursor: null,
    };
  },
  // GET /v1/runs?root_run_id=&status= — khung "Trợ lý AI đang điều phối" ở Cowork (REQ-E14, Blueprint §4.4)
  '/runs': (db, p) => {
    const rows = db.assistant.runs.filter(
      (r) => (!p.root_run_id || r.root_run_id === p.root_run_id) && (!p.status || p.status === 'all' || r.status === p.status),
    );
    return { data: rows, next_cursor: null };
  },
};

/** Kịch bản trả lời (omiIntent / omiReply L8340–8366): ý định có action → thẻ xác nhận; còn lại → câu trả lời mẫu. */
export const scriptReply = (db: MockDb, text: string) => {
  const low = text.toLowerCase();
  const intent = fixture.intents.find((i) => new RegExp(i.re).test(low));
  if (intent) {
    const token = `cf_${++db.assistant.seq}`;
    db.assistant.pending.push({ token, intent, status: 'pending' });
    return [{ type: 'confirm' as const, confirm_token: token, ...intent }];
  }
  const reply = fixture.replies.find((r) => new RegExp(r.re).test(low))?.text ?? fixture.fallback;
  return [{ type: 'delta' as const, text: reply }];
};

export const assistantPosts: Record<string, (db: MockDb, body: Record<string, unknown>) => unknown> = {
  // POST /v1/assistant/messages — mock: không stream, trả cả danh sách event của lượt
  '/assistant/messages': (db, body) => {
    const text = String(body.text ?? '').trim();
    if (!text) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'text' });
    const session = String(body.session_id ?? `as_${++db.assistant.seq}`);
    return { session_id: session, events: scriptReply(db, text) };
  },
  // POST /v1/assistant/confirm — xác nhận thẻ: chạy action đã preview, ghi nhật ký nguồn assistant
  '/assistant/confirm': (db, body) => {
    const p = db.assistant.pending.find((x) => x.token === body.confirm_token);
    if (!p || p.status !== 'pending') throw new ApiRequestError(409, { code: 'CONFLICT', message: 'CONFIRM_EXPIRED' });
    if (body.decision === 'cancel') {
      p.status = 'cancelled';
      return { status: 'cancelled' };
    }
    p.status = 'done';
    const logId = `al_as_${++db.assistant.seq}`;
    recordActionLog(db, p.intent.action_id, logId, 'write', true, 'assistant');
    const row = db.assistant.logs[0]!;
    row.title = p.intent.title;
    row.object = p.intent.dest;
    return { status: 'done', action_log_id: logId, ui_target: { type: 'navigate', route: p.intent.route } };
  },
};

const findTask = (db: MockDb, id: string) => {
  const t = db.assistant.tasks.find((x) => x.id === id);
  if (!t) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  return t;
};

const findApproval = (db: MockDb, id: string) => {
  const a = db.assistant.approvals.find((x) => x.id === id && x.status === 'pending');
  if (!a) throw new ApiRequestError(409, { code: 'CONFLICT', message: 'APPROVAL_DECIDED' });
  // duyệt cần thêm permission duyệt của action gốc (Blueprint §3.4 approval.approve)
  if (!can_(db, a.permission)) throw new ApiRequestError(403, { code: 'FORBIDDEN', message: a.permission });
  return a;
};

const dept = (k: string) => fixture.departments.find((d) => d.key === k) ?? fixture.departments[0]!;

export const assistantHandlers: Record<string, MockHandler> = {
  'ai_task.create': {
    execute: (
      db,
      i: { name: string; goal: string; department?: string; trigger: 'manual' | 'schedule' | 'event'; data_scope?: string[]; model_tier: string; credit_limit_per_run: number },
    ) => {
      const id = `tk_n${++db.assistant.seq}`;
      const d = dept(i.department ?? 'Vận hành');
      db.assistant.tasks.unshift({
        id,
        name: i.name,
        role: i.goal.length > 60 ? `${i.goal.slice(0, 60)}…` : i.goal,
        goal: i.goal,
        runs: 0,
        success: '—',
        cost: '0₫',
        active: true,
        model_tier: i.model_tier,
        department: d.key,
        channels: (i.data_scope ?? []).slice(0, 2),
        conf: 70,
      });
      return { task_id: id };
    },
  },
  'ai_task.update': {
    execute: (db, i: { task_id: string; patch: Partial<Task> }) => {
      Object.assign(findTask(db, i.task_id), i.patch);
      return { task_id: i.task_id };
    },
  },
  'ai_task.pause': {
    execute: (db, i: { task_id: string; paused: boolean }) => {
      const t = findTask(db, i.task_id);
      t.active = !i.paused;
      return { task_id: t.id, active: t.active };
    },
  },
  'approval.approve': {
    execute: (db, i: { approval_id: string; note?: string }) => {
      const a = findApproval(db, i.approval_id);
      a.status = 'approved';
      a.note = i.note;
      const seed = db.assistant.logs.find((l) => l.action_id === a.action_id && l.status === 'pending');
      if (seed) seed.status = 'done';
      const run = db.assistant.runs.find((r) => r.approval_id === a.id);
      if (run) run.status = 'done';
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
      r.status = 'done';
      r.pct = 100;
      return { run_id: r.id, status: r.status };
    },
  },
};
