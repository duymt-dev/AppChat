// Mock 4 kỹ năng tiện ích AI (TIP-019c) — như model giả backend: kết quả có khuôn + trích dẫn cắt từ đúng nguồn (offset codepoint), quyền
// nguồn kiểm trước (hội thoại / khách không có → 404, thiếu quyền → 403), cùng khoá gọi lại trả cùng handle. GET kết quả trả envelope đã
// kiểm (không chữ thô). Chữ chứa "__fail__" → failed (kiểm đường lỗi UI), "__pending__" → pending một nhịp rồi completed.
import { ApiRequestError, authzForRole, can, type PermissionKey } from '@appchat/shared';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';

type Envelope = { utility_run_id: string; schema_version: 1; state: string; proposal?: unknown; reason?: string };
type Chunk = { id: string; text: string };
type Src = { kind: 'text'; text: string } | { kind: 'conversation'; conversation_id: string; message_ids: string[] } | { kind: 'contact'; contact_id: string };

const results = new Map<string, Envelope>();
const pendingOnce = new Set<string>();
let seq = 0;
const runId = () => `0190f019-c000-7000-8000-${String(++seq).padStart(12, '0')}`;
const need = (db: MockDb, p: string) => {
  if (!can(authzForRole(db.role, 'u_tram'), p as PermissionKey)) throw new ApiRequestError(403, { code: 'FORBIDDEN', message: p, fields: { source: 'forbidden' } });
};
const notFound = (field: string) => new ApiRequestError(404, { code: 'NOT_FOUND', message: field, fields: { [field]: 'not_found' } });

function chunksOf(db: MockDb, src: Src): Chunk[] {
  need(db, 'assistant.use');
  if (src.kind === 'text') return [{ id: 't:0', text: src.text }];
  if (src.kind === 'conversation') {
    need(db, 'inbox.view');
    const msgs = db.inbox.messages[src.conversation_id];
    if (!msgs) throw notFound('conversation_id');
    return src.message_ids.map((id) => {
      const m = msgs.find((x) => x.id === id && x.kind === 'text');
      if (!m) throw notFound('message_ids');
      return { id: `m:${id}`, text: String(m.body ?? '') };
    });
  }
  need(db, 'crm.view');
  const c = db.inbox.conversations.find((x) => x.contact_id === src.contact_id);
  if (!c) throw notFound('contact_id');
  return [{ id: `c:${src.contact_id}:name`, text: c.title.split(' — ')[0]! }];
}

const cite = (c: Chunk, n = 60) => {
  const cps = [...c.text];
  const end = Math.min(cps.length, n);
  return { chunk_id: c.id, start: 0, end, quote: cps.slice(0, end).join('') };
};
const find = (chunks: Chunk[], re: RegExp) => {
  for (const c of chunks) {
    const m = c.text.match(re);
    if (m && m.index !== undefined) {
      const start = [...c.text.slice(0, m.index)].length;
      return { value: m[0], ev: { chunk_id: c.id, start, end: start + [...m[0]].length, quote: m[0] } };
    }
  }
  return null;
};

function propose(actionId: string, chunks: Chunk[], input: Record<string, unknown>, origin: 'server' | 'caller_supplied'): unknown {
  const first = chunks[0]!;
  if (actionId === 'ai.summarize') {
    const max = Number(input.max_bullets ?? 5);
    return { summary: [...first.text].slice(0, 120).join(''), bullets: chunks.slice(1, max + 1).map((c) => [...c.text].slice(0, 80).join('')), uncertainties: [], evidence: [cite(first)] };
  }
  if (actionId === 'ai.detect_intent') {
    const all = chunks.map((c) => c.text).join(' ').toLowerCase();
    const label = /đặt lịch|hẹn|book/.test(all) ? 'booking' : /giá|bao nhiêu|price/.test(all) ? 'inquiry' : /mua|order/.test(all) ? 'purchase_interest' : 'unknown';
    return { label, model_confidence: label === 'unknown' ? null : 0.8, uncertainties: [], evidence: label === 'unknown' ? [] : [cite(first)], taxonomy_version: 'default-v1' };
  }
  if (actionId === 'ai.extract_info') {
    const fields = (input.fields as { key: string; type: string; required?: boolean }[]) ?? [];
    const RE: Record<string, RegExp> = { money: /\d[\d.]*\s?(?:đ|vnđ|vnd)/i, date: /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}/, number: /\d+/, string: /0\d{9}/, boolean: /có|không/i };
    const out = fields.map((f) => {
      const hit = find(chunks, RE[f.type] ?? RE.string!);
      if (!hit) return { key: f.key, value: null, status: 'missing', reason_code: 'missing_value', evidence: [] };
      const value = f.type === 'money' ? hit.value.replace(/\D/g, '') : f.type === 'number' ? Number(hit.value) : hit.value;
      return { key: f.key, value, status: 'extracted', reason_code: null, evidence: [hit.ev] };
    });
    return { fields: out, missing_required: fields.filter((f) => f.required && out.find((o) => o.key === f.key)?.status !== 'extracted').map((f) => f.key), origin };
  }
  const msgs = chunks.filter((c) => c.id.startsWith('m:'));
  const crit = ['buying_intent', 'service_need', 'timing', 'engagement'].map((key) => ({ key, score: msgs.length ? 15 : null, reason: msgs.length ? key : null, evidence: msgs.length ? [cite(msgs[0]!, 30)] : [] }));
  return msgs.length
    ? { rubric_version: 'lead-fit-v1', status: 'scored', score: 60, criteria: crit, uncertainties: [] }
    : { rubric_version: 'lead-fit-v1', status: 'insufficient_evidence', score: null, criteria: crit, uncertainties: [] };
}

const handler = (actionId: string): MockHandler => ({
  execute: (db: MockDb, input: Record<string, unknown>) => {
    const src: Src =
      actionId === 'ai.score_lead'
        ? { kind: 'contact', contact_id: String(input.contact_id) }
        : (input.source as Src);
    let chunks = chunksOf(db, src);
    if (actionId === 'ai.score_lead' && input.conversation_id && Array.isArray(input.message_ids))
      chunks = [...chunks, ...chunksOf(db, { kind: 'conversation', conversation_id: String(input.conversation_id), message_ids: input.message_ids as string[] })];
    const total = chunks.reduce((n, c) => n + [...c.text].length, 0);
    if (total > 16_000) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'source', fields: { source: 'too_large' } });
    const id = runId();
    const text = chunks.map((c) => c.text).join(' ');
    const env: Envelope = text.includes('__fail__')
      ? { utility_run_id: id, schema_version: 1, state: 'failed', reason: 'invalid_citation' }
      : { utility_run_id: id, schema_version: 1, state: 'completed', proposal: propose(actionId, chunks, input, src.kind === 'text' ? 'caller_supplied' : 'server') };
    results.set(id, env);
    if (text.includes('__pending__')) {
      pendingOnce.add(id);
      return { utility_run_id: id, schema_version: 1, state: 'pending' };
    }
    return env;
  },
});

export const aiUtilityHandlers: Record<string, MockHandler> = {
  'ai.summarize': handler('ai.summarize'),
  'ai.detect_intent': handler('ai.detect_intent'),
  'ai.extract_info': handler('ai.extract_info'),
  'ai.score_lead': handler('ai.score_lead'),
};

/** GET /ai-utilities/:runId/result — envelope đã kiểm; không có → 404 đồng nhất. */
export const aiUtilityParamRoute = (path: string): MockRoute | null => {
  const m = path.match(/^\/ai-utilities\/([^/]+)\/result$/);
  if (!m) return null;
  const id = decodeURIComponent(m[1]!);
  return () => {
    const env = results.get(id);
    if (!env) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: 'run' });
    if (pendingOnce.delete(id)) return { utility_run_id: id, schema_version: 1, state: 'pending' };
    return env;
  };
};
