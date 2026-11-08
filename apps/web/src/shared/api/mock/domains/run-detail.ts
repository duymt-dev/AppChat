// Mock chi tiết run (TIP-019b §5.2): GET /v1/runs/:id · /:id/steps · /:id/children — dựng từ hàng run của khung điều phối, cùng hình
// `runDetailSchema` / `runStepSchema` / `runChildSchema` (packages/shared/api/ai-runs). Run không có → 404 như backend.
import { ApiRequestError, type RunChildDto, type RunDetailDto, type RunStepDto } from '@appchat/shared';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';

type Row = MockDb['assistant']['runs'][number];

const STARTED = '2026-11-07T09:30:00.000Z';
const stepCount = (r: Row) => Number(/^(\d+) bước/.exec(r.meta)?.[1] ?? (r.lifecycle === 'completed' ? 3 : 2));

function steps(r: Row): RunStepDto[] {
  const n = stepCount(r);
  return Array.from({ length: n }, (_, i) => {
    const tool = i % 2 === 1;
    const last = i === n - 1;
    const paused = last && r.lifecycle === 'waiting_approval';
    return {
      idx: i,
      type: tool ? 'tool' : 'llm',
      status: paused ? 'paused' : 'ok',
      action_id: tool ? (paused ? 'quote.send' : 'crm.contact.search') : null,
      credits: tool ? 0 : 2,
      created_at: new Date(Date.parse(STARTED) + i * 4000).toISOString(),
      outcome: tool ? (paused ? 'needs_approval' : 'ok') : null,
    };
  });
}

function detail(db: MockDb, r: Row): RunDetailDto {
  const kids = db.assistant.runs.filter((x) => x.root_run_id === r.id && x.id !== r.id);
  const st = steps(r);
  const credits = st.reduce((a, s) => a + s.credits, 0);
  const done = r.lifecycle === 'completed' || r.lifecycle === 'failed' || r.lifecycle === 'cancelled' || r.lifecycle === 'handoff';
  return {
    id: r.id,
    root_run_id: r.root_run_id,
    parent_run_id: r.root_run_id === r.id ? null : r.root_run_id,
    depth: r.root_run_id === r.id ? 0 : 1,
    kind: r.root_run_id === r.id ? 'assistant' : 'delegate',
    task: r.task,
    agent: r.agent,
    lifecycle: r.lifecycle,
    stop_reason: r.stop_reason,
    error_code: r.lifecycle === 'failed' ? (r.stop_reason ?? 'ERROR').toUpperCase() : null,
    started_at: STARTED,
    finished_at: done ? new Date(Date.parse(STARTED) + st.length * 4000).toISOString() : null,
    credits_local: credits,
    credits_subtree: credits,
    credits_unbilled: r.root_run_id === r.id ? 0 : null,
    accounting_pending: false,
    approval_id: r.lifecycle === 'waiting_approval' ? (r.approval_id ?? null) : null,
    children: kids.length,
    steps: st.length,
    result_text: r.lifecycle === 'completed' ? `Đã xong: ${r.task}.` : null,
    event_seq: st.length + 1,
  };
}

const find = (db: MockDb, id: string) => {
  const r = db.assistant.runs.find((x) => x.id === id);
  if (!r) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  return r;
};

export const runDetailParamRoute = (path: string): MockRoute | null => {
  const m = path.match(/^\/runs\/([^/?]+)(\/steps|\/children)?$/);
  if (!m) return null;
  const id = decodeURIComponent(m[1]!);
  if (m[2] === '/steps') return (db) => ({ data: steps(find(db, id)), next_cursor: null });
  if (m[2] === '/children')
    return (db): { data: RunChildDto[]; next_cursor: null } => {
      find(db, id);
      const kids = db.assistant.runs.filter((x) => x.root_run_id === id && x.id !== id);
      return { data: kids.map((k) => ({ id: k.id, kind: 'delegate', task: k.task, agent: k.agent, lifecycle: k.lifecycle, credits_subtree: 0, started_at: STARTED })), next_cursor: null };
    };
  return (db) => ({ data: detail(db, find(db, id)) });
};
