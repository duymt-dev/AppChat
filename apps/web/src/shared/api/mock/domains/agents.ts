// Mock AI Agents (Blueprint §4.4 ai, D29): GET /agents, /agents/:id, /agents/:id/versions, /agent-templates, /agents/meta.
// Dữ liệu = prototype L2227–2450 (fixture sinh bởi tools/scripts/fixtures/gen-assistant.py). Tên model → mức AI (D29).
import { ApiRequestError } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/agents.json';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';

export type AgentsFixture = typeof fixture;
export type Agent = AgentsFixture['agents'][number] & { deleted?: boolean; template_id?: string; dirty?: boolean };
type Config = Partial<Omit<Agent, 'id' | 'version' | 'status'>>;
export type AgentVersion = { version: number; published_at: string; published_by: string; note: string; config: Config };

export interface AgentsState {
  agents: Agent[];
  versions: Record<string, AgentVersion[]>;
  seq: number;
}

/** Giới hạn gói (plan.max_agents) của gói đang dùng thử — vượt thì PLAN_LIMIT_REACHED. */
export const MAX_AGENTS = 10;

const snapshot = (a: Agent): Config => {
  const { id: _id, version: _v, status: _s, deleted: _d, dirty: _dt, ...cfg } = a;
  return structuredClone(cfg);
};

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

export const agentsRoutes: Record<string, MockRoute> = {
  '/agents': (db) => ({ data: live(db), next_cursor: null }),
  '/agent-templates': (_db, p) => {
    const q = String(p.q ?? '').trim().toLowerCase();
    const group = fixture.taxonomy.find((g) => g.group === p.group);
    const rows = fixture.templates.filter(
      (t) =>
        (!group || group.industries.includes(t.tag)) &&
        (!p.industry || p.industry === 'all' || t.tag === p.industry) &&
        (!p.name || p.name === 'all' || t.name === p.name) &&
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
    ai_suggests: fixture.ai_suggests,
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
    return m[2] ? { data: db.agents.versions[id] ?? [], next_cursor: null } : a;
  };
};

const find = (db: MockDb, id: string) => {
  const a = db.agents.agents.find((x) => x.id === id && !x.deleted);
  if (!a) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  return a;
};

const blank = (db: MockDb, cfg: Config): Agent => {
  if (live(db).length >= MAX_AGENTS) throw new ApiRequestError(409, { code: 'PLAN_LIMIT_REACHED', message: 'max_agents' });
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

const publish = (db: MockDb, a: Agent, note: string) => {
  a.version += 1;
  a.status = 'active';
  a.dirty = false;
  (db.agents.versions[a.id] ??= []).unshift({ version: a.version, published_at: new Date().toISOString(), published_by: 'Trâm', note, config: snapshot(a) });
  return { agent_id: a.id, version: a.version };
};

/** Chat thử (dryRun): trả lời theo kịch bản agbTestSend L8252; không gọi action thật. */
export const testReply = (text: string) =>
  fixture.test_replies.find((r) => new RegExp(r.re).test(text.toLowerCase()))?.text ?? fixture.test_fallback;

export const agentsHandlers: Record<string, MockHandler> = {
  'agent.draft_from_description': {
    execute: (_db, i: { description: string }) => {
      const d = fixture.ai_draft;
      return { draft: { ...d, prompt: fixture.prompt_templates[d.prompt_template]!.text, persona: i.description } };
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
    execute: (db, i: { agent_id: string; patch: Config }) => {
      const a = find(db, i.agent_id);
      Object.assign(a, i.patch, { dirty: true });
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
      return publish(db, a, `↩ v${i.version}`);
    },
  },
  'agent.pause': {
    execute: (db, i: { agent_id: string; paused: boolean }) => {
      const a = find(db, i.agent_id);
      a.status = i.paused ? 'paused' : 'active';
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
