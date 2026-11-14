// Mock AI Agents (Blueprint §4.4 ai, D29): GET /agents, /agents/:id, /agents/:id/versions, /agent-templates, /agents/meta. Thẻ kèm
// `stats` (TIP-038 — agent-stats.ts, cùng shape API).
// Dữ liệu = prototype L2227–2450 (fixture sinh bởi tools/scripts/fixtures/gen-assistant.py). Tên model → mức AI (D29).
import { ApiRequestError } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/agents.json';
import { channelBindingPreview } from './channel-behavior';
import { statsOf } from './agent-stats';
import { checkVersion } from './commerce-edit';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';

export type AgentsFixture = typeof fixture;
export type Agent = AgentsFixture['agents'][number] & { deleted?: boolean; template_id?: string; dirty?: boolean; row_version?: number };
type Config = Partial<Omit<Agent, 'id' | 'version' | 'status'>>;
export type AgentVersion = { version: number; published_at: string; published_by: string; note: string; config: Config };

export interface AgentsState {
  agents: Agent[];
  versions: Record<string, AgentVersion[]>;
  seq: number;
}

/** Giới hạn gói (plan.max_agents) của gói đang dùng thử — vượt thì PLAN_LIMIT_REACHED. */
export const MAX_AGENTS = 10;

const RUNTIME_KEYS = ['id', 'version', 'row_version', 'status', 'deleted', 'dirty'] as const;
const snapshot = (a: Agent): Config =>
  structuredClone(Object.fromEntries(Object.entries(a).filter(([k]) => !(RUNTIME_KEYS as readonly string[]).includes(k)))) as Config;

const seedVersions = (a: Agent): AgentVersion[] =>
  Array.from({ length: a.version }, (_, i) => ({
    version: i + 1,
    published_at: `2026-06-${String(10 + i * 3).padStart(2, '0')}T09:00:00+07:00`,
    published_by: 'Trâm',
    note: fixture.version_notes[i] ?? fixture.version_notes[0]!,
    config: { ...snapshot(a), threshold: a.threshold + (a.version - 1 - i) * 5 },
  })).reverse();

export const createAgentsState = (): AgentsState => {
  const agents = structuredClone(fixture.agents) as Agent[];
  return { agents, versions: Object.fromEntries(agents.map((a) => [a.id, seedVersions(a)])), seq: 0 };
};

const live = (db: MockDb) => db.agents.agents.filter((a) => !a.deleted);
/** `custom` cũ chưa có lịch có cấu trúc → needs_configuration (như server agents.read — TIP-022b A). */
const withScheduleState = (a: Agent) => ({ ...a, row_version: a.row_version ?? 1, stats: statsOf(a), schedule_state: a.working_hours === 'custom' && !(a as { weekly_schedule?: unknown }).weekly_schedule ? 'needs_configuration' : 'ok' });

export const agentsRoutes: Record<string, MockRoute> = {
  '/agents': (db) => ({ data: live(db).map(withScheduleState), next_cursor: null }),
  // Cảnh báo gán tài khoản khi xuất bản (TIP-022b E): đọc agent đang gán THẬT của từng tài khoản, không suy từ danh sách loại kênh.
  '/agents/channel-binding-preview': (db, p) => channelBindingPreview(db, String(p.types ?? '').split(',').filter(Boolean)),
  '/agent-templates': (_db, p) => {
    const q = String(p.q ?? '').trim().toLowerCase();
    const group = fixture.taxonomy.find((g) => g.group === p.group);
    const rows = fixture.templates.filter(
      (t) =>
        (!group || group.industries.includes(t.tag)) &&
        (!p.industry || p.industry === 'all' || t.tag === p.industry) &&
        (!p.name || p.name === 'all' || t.name === p.name) &&
        (!p.role || p.role === 'all' || t.role === p.role) &&
        (!q || [t.name, t.desc, t.tag].some((v) => v.toLowerCase().includes(q))),
    );
    return { data: rows, total: rows.length };
  },
  '/agents/meta': () => ({
    taxonomy: fixture.taxonomy,
    emojis: fixture.emojis,
    intents: fixture.intents,
    channels: fixture.channels,
    tools: fixture.tools,
    prompt_templates: fixture.prompt_templates,
    test_seed: fixture.test_seed,
    // Mục khác "create" mang câu hỏi gửi sang Trợ lý (backend tính từ dữ liệu thật — TIP-024).
    ai_suggests: fixture.ai_suggests.map((s) => (s.key === 'create' ? s : { ...s, ask: s.title })),
    template_names: fixture.templates.slice(0, 20).map((t) => ({ name: t.name, tag: t.tag })),
  }),
};

export const agentsParamRoute = (path: string): MockRoute | undefined => {
  const m = path.match(/^\/agents\/([^/]+)(\/versions)?$/);
  if (!m || m[1] === 'meta') return undefined;
  const id = m[1]!;
  return (db) => {
    const a = live(db).find((x) => x.id === id);
    if (!a) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
    return m[2] ? { data: db.agents.versions[id] ?? [], next_cursor: null } : withScheduleState(a);
  };
};

const find = (db: MockDb, id: string) => {
  const a = db.agents.agents.find((x) => x.id === id && !x.deleted);
  if (!a) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  return a;
};

const blank = (db: MockDb, cfg: Config): Agent => {
  if (live(db).length >= MAX_AGENTS) throw new ApiRequestError(402, { code: 'PLAN_LIMIT_REACHED', message: 'max_agents', fields: { resource: 'agents', limit: String(MAX_AGENTS) } });
  const base = fixture.agents[0]!;
  return {
    ...structuredClone(base),
    id: `ag_n${++db.agents.seq}`,
    name: cfg.name ?? '',
    emoji: '🤖',
    role: 'custom',
    role_label: '',
    status: 'draft',
    conversations: 0,
    resolve_rate: 0,
    csat: 0,
    persona: '',
    version: 0,
    ...cfg,
  } as Agent;
};

const publish = (db: MockDb, a: Agent, note: string, rollback = false) => {
  if (!rollback && withScheduleState(a).schedule_state === 'needs_configuration') {
    throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'weekly_schedule', fields: { weekly_schedule: 'needs_configuration' } });
  }
  a.version += 1;
  a.row_version = (a.row_version ?? 1) + 1;
  a.status = 'active';
  a.dirty = false;
  (db.agents.versions[a.id] ??= []).unshift({ version: a.version, published_at: new Date().toISOString(), published_by: 'Trâm', note, config: snapshot(a) });
  return { agent_id: a.id, version: a.version };
};

/** Chat thử (dryRun): trả lời theo kịch bản agbTestSend L8252; không gọi action thật. */
export const testReply = (text: string) =>
  fixture.test_replies.find((r) => new RegExp(r.re).test(text.toLowerCase()))?.text ?? fixture.test_fallback;

/** Lần soạn theo request_id (TIP-021b) — trong phiên mock. */
const drafts = new Map<string, { description: string; out: unknown }>();

export const agentsHandlers: Record<string, MockHandler> = {
  // TIP-021b: cùng request_id → cùng kết quả (không soạn lại); cùng request_id + mô tả khác → 409. Mock không có model: nói thật là mẫu.
  'agent.draft_from_description': {
    execute: (_db, i: { description: string; request_id: string }) => {
      const prior = drafts.get(i.request_id);
      if (prior && prior.description !== i.description.trim()) throw new ApiRequestError(409, { code: 'CONFLICT', message: 'request_id', fields: { request_id: 'description_changed' } });
      if (prior) return prior.out;
      const d = fixture.ai_draft;
      const out = {
        draft: { ...d, prompt: fixture.prompt_templates[d.prompt_template]!.text, persona: i.description },
        generation_info: { schema_version: 1, operation_id: `op-${i.request_id.slice(0, 8)}`, mode: 'deterministic', discovery_strategy: 'keyword', fallback_reason: 'no_model_route', warnings: ['keyword_discovery'], candidate_version: 'mock' },
      };
      drafts.set(i.request_id, { description: i.description.trim(), out });
      return out;
    },
  },
  'agent.create': {
    execute: (db, i: Config) => {
      const a = blank(db, i);
      a.dirty = true;
      db.agents.agents.unshift(a);
      return { agent_id: a.id };
    },
  },
  'agent.create_and_publish': {
    execute: (db, i: Config) => {
      const a = blank(db, i);
      db.agents.agents.unshift(a);
      return publish(db, a, fixture.version_notes[0]!);
    },
    undo: (db) => {
      const a = db.agents.agents.shift();
      if (a) delete db.agents.versions[a.id];
    },
  },
  'agent.update': {
    execute: (db, i: { agent_id: string; patch: Config; if_version?: number }) => {
      const a = find(db, i.agent_id);
      // TIP-003e: `if_version` so với `row_version` (khoá lạc quan dòng), không phải phiên bản đã xuất bản.
      checkVersion({ version: a.row_version ?? 1 }, i.if_version);
      Object.assign(a, i.patch, { dirty: true, row_version: (a.row_version ?? 1) + 1 });
      return { agent_id: a.id };
    },
  },
  'agent.publish': {
    execute: (db, i: { agent_id: string; note?: string }) => publish(db, find(db, i.agent_id), i.note ?? ''),
  },
  'agent.rollback': {
    execute: (db, i: { agent_id: string; version: number }) => {
      const a = find(db, i.agent_id);
      const v = db.agents.versions[a.id]?.find((x) => x.version === i.version);
      if (!v) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: `v${i.version}` });
      Object.assign(a, structuredClone(v.config));
      return publish(db, a, `↩ v${i.version}`, true);
    },
  },
  'agent.pause': {
    execute: (db, i: { agent_id: string; paused: boolean }) => {
      const a = find(db, i.agent_id);
      a.status = i.paused ? 'paused' : 'active';
      a.row_version = (a.row_version ?? 1) + 1;
      return { agent_id: a.id, status: a.status };
    },
  },
  'agent.delete': {
    execute: (db, i: { agent_id: string }) => {
      find(db, i.agent_id).deleted = true;
      return { agent_id: i.agent_id };
    },
    undo: (db, i: { agent_id: string }) => {
      const a = db.agents.agents.find((x) => x.id === i.agent_id);
      if (a) a.deleted = false;
    },
  },
  'agent.test': {
    execute: (_db, i: { text: string }) => ({ reply: testReply(i.text) }),
  },
  'agent.optimize_prompt': {
    execute: (_db, i: { prompt: string }) => ({
      prompt: i.prompt.includes(fixture.optimize_suffix.trim().split('\n')[0]!) ? i.prompt : i.prompt + fixture.optimize_suffix,
    }),
  },
};
