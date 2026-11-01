// Mock Tác vụ tự chủ (TIP-035 — cùng shape `packages/shared/src/api/ai-tasks.ts` với GET /v1/ai-tasks thật): thẻ tác vụ + 6 chỉ số +
// mẫu chủ động + nhóm dữ liệu / công cụ + agent chọn được + drawer theo tác vụ; ai_task.create / update / pause / delete / run_now theo
// luật server (cron theo giờ workspace, sự kiện bắt buộc topic, chưa có agent → 422, đang có lượt dở → 409). Dữ liệu thẻ = prototype.
import { AI_TASK_DATA_KEYS, AI_TASK_TEMPLATES, AI_TASK_TEMPLATE_DEFS, AI_TASK_TOOL_KEYS, ApiRequestError, interpolate, isValidCron, nextCronRun, serverMessages, type AiTaskRowDto, type AiTasksPayloadDto } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/assistant.json';

/**
 * Phần state mock mà tác vụ đụng tới — kiểu cấu trúc (không import store / handlers / routes để không tạo vòng import; handlers.ts và
 * routes.ts gộp các bảng dưới đây).
 */
interface TasksDb {
  assistant: { tasks: MockTask[]; runs: { id: string; root_run_id: string; task: string; agent: string; meta: string; pct: number; status: 'running' | 'waiting_approval' | 'done' }[]; seq: number };
  agents: { agents: { id: string; name: string; status: string; deleted?: boolean }[] };
}
type Handler = { execute(db: TasksDb, input: never): unknown; undo?(db: TasksDb, input: never): void };

export type MockTask = AiTaskRowDto & { deleted?: boolean; running?: boolean };
const TZ = 'Asia/Ho_Chi_Minh';
/** Mốc "bây giờ" cố định của mock (khớp dữ liệu mẫu). */
const NOW = new Date('2026-10-30T02:00:00.000Z');
const tx = serverMessages('vi').tasks;

const seed = (t: AssistantTask): MockTask => ({
  ...t,
  model_tier: t.model_tier as MockTask['model_tier'],
  goal: t.role,
  prompt: '',
  trigger: 'schedule',
  cron: '0 8 * * *',
  event_type: null,
  template: null,
  agent_id: null,
  agent_name: t.name,
  data_scope: ['customers', 'conversations'],
  tools: ['read', 'message', 'report'],
  ask_before_send: true,
  credit_limit_per_run: 2000,
  next_run_at: t.active ? nextCronRun('0 8 * * *', NOW, TZ)!.toISOString() : null,
  last_run_at: null,
});
type AssistantTask = (typeof fixture)['tasks'][number];

export const createTasksState = (): MockTask[] => fixture.tasks.map(seed);

const live = (db: TasksDb) => db.assistant.tasks.filter((t) => !t.deleted);
const find = (db: TasksDb, id: string) => {
  const t = live(db).find((x) => x.id === id);
  if (!t) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  return t;
};
const invalid = (fields: Record<string, string>): never => {
  throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'VALIDATION_FAILED', fields });
};
const agentsOf = (db: TasksDb) => db.agents.agents.filter((a) => !a.deleted && a.status === 'active').map((a) => ({ id: a.id, name: a.name }));

function schedule(trigger: string, cron: string | undefined | null, event: string | undefined | null) {
  if (trigger === 'schedule') {
    const c = cron?.trim() || '0 8 * * *';
    if (!isValidCron(c)) invalid({ cron: 'invalid' });
    return { cron: c, event_type: null };
  }
  if (trigger === 'event') return event ? { cron: null, event_type: event } : invalid({ event_type: 'required' });
  return { cron: null, event_type: null };
}
const nextOf = (t: Pick<MockTask, 'trigger' | 'cron' | 'active'>) => (t.trigger === 'schedule' && t.active && t.cron ? (nextCronRun(t.cron, NOW, TZ)?.toISOString() ?? null) : null);

const drawerOf = (t: MockTask): AiTasksPayloadDto['drawer'] => ({
  ...fixture.drawer,
  prompt: t.prompt || fixture.drawer.prompt,
  tools: fixture.drawer.tools,
});

export const aiTasksRoutes = {
  '/ai-tasks': (db: TasksDb): AiTasksPayloadDto => {
    const t = live(db);
    const runs = t.reduce((s, x) => s + x.runs, 0);
    const kpi = fixture.task_kpi as Record<string, string>;
    return {
      tasks: t,
      stats: fixture.task_stats.map((s) => ({
        ...s,
        value: s.key === 'total' ? String(t.length) : s.key === 'active' ? `${t.filter((x) => x.active).length}/${t.length}` : s.key === 'runs' ? runs.toLocaleString('vi-VN') : kpi[s.key]!,
      })),
      // Mẫu nhanh: 3 mẫu của prototype + 5 mẫu chủ động (§5.4).
      templates: [
        ...fixture.task_templates,
        ...AI_TASK_TEMPLATES.map((k) => ({ label: tx.template[k].label, name: tx.template[k].name, goal: interpolate(tx.template[k].goal, AI_TASK_TEMPLATE_DEFS[k].params), department: AI_TASK_TEMPLATE_DEFS[k].department, template: k })),
      ],
      departments: fixture.departments,
      data_options: [...AI_TASK_DATA_KEYS],
      tool_options: [...AI_TASK_TOOL_KEYS],
      agents: agentsOf(db),
      drawers: Object.fromEntries(t.map((x) => [x.id, drawerOf(x)])),
      drawer: fixture.drawer,
    };
  },
};

type CreateIn = {
  name: string;
  goal: string;
  department?: string;
  agent_id?: string;
  template?: (typeof AI_TASK_TEMPLATES)[number];
  trigger: 'manual' | 'schedule' | 'event';
  cron?: string;
  event_type?: string;
  data_scope?: string[];
  tools?: string[];
  model_tier: MockTask['model_tier'];
  ask_before_send: boolean;
  credit_limit_per_run: number;
};

export const aiTasksHandlers: Record<string, Handler> = {
  'ai_task.create': {
    execute: (db, i: CreateIn) => {
      const tpl = i.template ? AI_TASK_TEMPLATE_DEFS[i.template] : null;
      const agents = agentsOf(db);
      const agent = i.agent_id ? agents.find((a) => a.id === i.agent_id) : i.template === 'briefing' ? null : agents[0];
      if (agent === undefined) invalid({ agent_id: i.agent_id ? 'not_active' : 'none_active' });
      const id = `tk_n${++db.assistant.seq}`;
      const t: MockTask = {
        id,
        name: i.name,
        role: i.goal.length > 60 ? `${i.goal.slice(0, 60)}…` : i.goal,
        goal: i.goal,
        prompt: '',
        runs: 0,
        success: '—',
        cost: '0₫',
        active: true,
        model_tier: i.model_tier,
        department: i.department ?? tpl?.department ?? 'Vận hành',
        channels: (i.tools ?? tpl?.tools ?? []).includes('message') ? ['Zalo cá nhân'] : [tx.channelInternal],
        conf: 70,
        trigger: i.trigger,
        ...schedule(i.trigger, i.cron ?? (i.trigger === 'schedule' ? tpl?.cron : undefined), i.event_type),
        template: i.template ?? null,
        agent_id: agent?.id ?? null,
        agent_name: agent?.name ?? '',
        data_scope: i.data_scope ?? tpl?.data ?? [],
        tools: i.tools ?? tpl?.tools ?? ['read', 'report'],
        ask_before_send: i.ask_before_send,
        credit_limit_per_run: i.credit_limit_per_run,
        next_run_at: null,
        last_run_at: null,
      };
      t.next_run_at = nextOf(t);
      db.assistant.tasks.unshift(t);
      return { task_id: id };
    },
    undo: (db) => {
      const t = db.assistant.tasks[0];
      if (t) t.deleted = true;
    },
  },
  'ai_task.update': {
    execute: (db, i: { task_id: string; patch: Partial<CreateIn> & { prompt?: string } }) => {
      const t = find(db, i.task_id);
      const p = i.patch;
      const trigger = p.trigger ?? t.trigger;
      if (p.trigger || p.cron !== undefined || p.event_type !== undefined) Object.assign(t, { trigger }, schedule(trigger, p.cron ?? t.cron, p.event_type ?? t.event_type));
      for (const k of ['name', 'goal', 'prompt', 'department', 'model_tier', 'ask_before_send', 'credit_limit_per_run', 'data_scope', 'tools'] as const) if (p[k] !== undefined) Object.assign(t, { [k]: p[k] });
      if (p.goal) t.role = p.goal.length > 60 ? `${p.goal.slice(0, 60)}…` : p.goal;
      t.next_run_at = nextOf(t);
      return { task_id: t.id };
    },
  },
  'ai_task.pause': {
    execute: (db, i: { task_id: string; paused: boolean }) => {
      const t = find(db, i.task_id);
      t.active = !i.paused;
      t.next_run_at = nextOf(t);
      return { task_id: t.id, active: t.active };
    },
  },
  'ai_task.delete': {
    execute: (db, i: { task_id: string }) => {
      find(db, i.task_id).deleted = true;
      return { task_id: i.task_id };
    },
    undo: (db, i: { task_id: string }) => {
      const t = db.assistant.tasks.find((x) => x.id === i.task_id);
      if (t) t.deleted = false;
    },
  },
  'ai_task.run_now': {
    execute: (db, i: { task_id: string }) => {
      const t = find(db, i.task_id);
      if (t.running) throw new ApiRequestError(409, { code: 'CONFLICT', message: 'running', fields: { task_id: 'running' } });
      t.runs += 1;
      t.last_run_at = NOW.toISOString();
      const run = `run_t${++db.assistant.seq}`;
      db.assistant.runs.unshift({ id: run, root_run_id: run, task: t.name, agent: t.agent_name, meta: '0 bước · 0 credit', pct: 5, status: 'running' });
      return { task_id: t.id, run_id: run };
    },
  },
};
