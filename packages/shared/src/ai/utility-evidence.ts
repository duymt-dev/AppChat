// Kiểm đầu ra model cho kỹ năng tiện ích (TIP-019c §2): JSON ≤ 32 KiB, không khoá nguy hiểm / HTML / trường lạ; bằng chứng chỉ là
// {chunk_id, start, end} theo offset CODEPOINT trên đúng chunk server cấp — server tự cắt trích dẫn (model không bịa được câu trích /
// mã khách). Giá trị trích xuất kiểm theo kiểu khai báo: tiền là chuỗi số nguyên VND 0..999 999 999 999, phải có dấu tiền tệ trong bằng
// chứng; ngày lịch hợp lệ; không làm tròn / quy đổi. Bằng chứng chỉ cho biết ĐÃ ĐỌC gì — không chứng minh suy luận đúng.
import {
  DEFAULT_INTENTS, LEAD_CRITERIA, LEAD_RUBRIC_VERSION, UTILITY_LIMITS,
  type DetectIntentProposal, type Evidence, type ExtractField, type ExtractInfoProposal, type ScoreLeadProposal, type SummarizeProposal,
} from './utility-schemas';

export interface UtilityChunk {
  id: string;
  text: string;
}
export type UtilityOutputCode = 'too_large' | 'invalid_json' | 'unsafe_payload' | 'schema' | 'invalid_citation';
export class UtilityOutputError extends Error {
  constructor(readonly code: UtilityOutputCode, readonly detail?: string) {
    super(`utility_output:${code}${detail ? `:${detail}` : ''}`);
  }
}
const fail = (code: UtilityOutputCode, detail?: string): never => {
  throw new UtilityOutputError(code, detail);
};

const DANGEROUS = new Set(['__proto__', 'constructor', 'prototype']);
const HTML = /<\s*\/?\s*[a-z!][^>]*>/i;
type Obj = Record<string, unknown>;

/** JSON thô của model → giá trị đã kiểm an toàn (kích thước, khoá nguy hiểm, HTML). Bỏ rào ```json nếu có. */
export function parseModelJson(raw: string): unknown {
  if (new TextEncoder().encode(raw).length > UTILITY_LIMITS.modelJsonBytes) fail('too_large');
  const body = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let v: unknown;
  try {
    v = JSON.parse(body);
  } catch {
    return fail('invalid_json');
  }
  const walk = (x: unknown, depth: number): void => {
    if (depth > 8) fail('unsafe_payload', 'depth');
    if (typeof x === 'string' && HTML.test(x)) fail('unsafe_payload', 'html');
    if (typeof x === 'number' && !Number.isFinite(x)) fail('schema', 'number');
    if (Array.isArray(x)) x.forEach((y) => walk(y, depth + 1));
    else if (x && typeof x === 'object')
      for (const k of Object.keys(x)) {
        if (DANGEROUS.has(k)) fail('unsafe_payload', 'key');
        walk((x as Obj)[k], depth + 1);
      }
  };
  walk(v, 0);
  if (!v || typeof v !== 'object' || Array.isArray(v)) fail('schema', 'root');
  return v;
}

const obj = (x: unknown, at: string): Obj => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Obj) : fail('schema', at));
const only = (o: Obj, keys: string[], at: string) => {
  for (const k of Object.keys(o)) if (!keys.includes(k)) fail('schema', `${at}.${k}`);
};
const str = (x: unknown, max: number, at: string): string => (typeof x === 'string' && [...x].length <= max ? x : fail('schema', at));
const arr = (x: unknown, max: number, at: string): unknown[] => (x === undefined ? [] : Array.isArray(x) && x.length <= max ? x : fail('schema', at));

/** Một bằng chứng của model → trích dẫn server cắt trên chunk thật (offset codepoint, dài 1–300). Sai → invalid_citation. */
export function citeOf(raw: unknown, chunks: Map<string, string[]>, at: string): Evidence {
  const o = obj(raw, at);
  only(o, ['chunk_id', 'start', 'end'], at);
  const cps = typeof o.chunk_id === 'string' ? chunks.get(o.chunk_id) : undefined;
  const { start, end } = o;
  if (!cps || !Number.isInteger(start) || !Number.isInteger(end)) return fail('invalid_citation', at);
  const s = start as number;
  const e = end as number;
  if (s < 0 || e > cps.length || e - s < 1 || e - s > UTILITY_LIMITS.evidenceSpan) fail('invalid_citation', at);
  return { chunk_id: o.chunk_id as string, start: s, end: e, quote: cps.slice(s, e).join('') };
}
const citesOf = (x: unknown, chunks: Map<string, string[]>, max: number, at: string) => {
  const seen = new Set<string>();
  return arr(x, 20, at)
    .map((r, i) => citeOf(r, chunks, `${at}[${i}]`))
    .filter((e) => {
      const k = `${e.chunk_id}:${e.start}:${e.end}`;
      return seen.has(k) ? false : (seen.add(k), true);
    })
    .slice(0, max);
};
export const chunkMap = (chunks: UtilityChunk[]) => new Map(chunks.map((c) => [c.id, Array.from(c.text)]));
/** Trần 10 bằng chứng / kết quả: mỗi mục có bằng chứng giữ ít nhất 1 (mục đã trích luôn có trích dẫn), phần dư chia theo thứ tự. */
const capTotal = <T extends { evidence: Evidence[] }>(items: T[]) => {
  let left = UTILITY_LIMITS.evidencePerResult - items.filter((x) => x.evidence.length > 0).length;
  return items.map((x) => {
    const extra = Math.max(0, Math.min(x.evidence.length - 1, left));
    left -= extra;
    return { ...x, evidence: x.evidence.slice(0, x.evidence.length ? 1 + extra : 0) };
  });
};

export function validateSummarize(raw: unknown, chunks: UtilityChunk[], maxBullets: number): SummarizeProposal {
  const o = obj(raw, 'root');
  only(o, ['summary', 'bullets', 'uncertainties', 'evidence'], 'root');
  const bullets = arr(o.bullets, maxBullets, 'bullets').map((b, i) => str(b, 300, `bullets[${i}]`));
  return {
    summary: str(o.summary, 2000, 'summary'),
    bullets,
    uncertainties: arr(o.uncertainties, 5, 'uncertainties').map((u, i) => str(u, 300, `uncertainties[${i}]`)),
    evidence: citesOf(o.evidence, chunkMap(chunks), UTILITY_LIMITS.evidencePerResult, 'evidence'),
  };
}

export function validateIntent(raw: unknown, chunks: UtilityChunk[], keys: readonly string[] = DEFAULT_INTENTS, version = 'default-v1'): DetectIntentProposal {
  const o = obj(raw, 'root');
  only(o, ['label', 'model_confidence', 'uncertainties', 'evidence'], 'root');
  const label = str(o.label, 40, 'label');
  if (label !== 'unknown' && !keys.includes(label)) fail('schema', 'label');
  const c = o.model_confidence;
  if (c !== null && c !== undefined && !(typeof c === 'number' && c >= 0 && c <= 1)) fail('schema', 'model_confidence');
  const evidence = citesOf(o.evidence, chunkMap(chunks), UTILITY_LIMITS.evidencePerResult, 'evidence');
  // Không bằng chứng → không đủ căn cứ cho nhãn: ép `unknown` (không suy nhãn từ câu chữ).
  const known = label !== 'unknown' && evidence.length > 0;
  return {
    label: known ? label : 'unknown',
    model_confidence: known ? ((c as number | undefined) ?? null) : null,
    uncertainties: arr(o.uncertainties, 5, 'uncertainties').map((u, i) => str(u, 300, `uncertainties[${i}]`)),
    evidence: known ? evidence : [],
    taxonomy_version: version,
  };
}

const MONEY_MAX = 999_999_999_999;
const CURRENCY = /(?<!\p{L})(?:VND|VNĐ|đồng)(?!\p{L})|₫|\d\s*(?:đ|k|tr)(?!\p{L})/iu;
type Field = ExtractInfoProposal['fields'][number];

function checkDate(v: unknown): string | null {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v ? v : null;
}

/** Giá trị đã trích của một trường → đúng kiểu, hoặc lý do không hợp lệ (không ép kiểu / làm tròn). */
function typed(f: ExtractField, v: unknown, quotes: string[]): { value: Field['value']; reason: Field['reason_code']; status?: Field['status'] } {
  switch (f.type) {
    case 'money': {
      const s = typeof v === 'number' ? String(v) : typeof v === 'string' ? v.trim() : '';
      if (!/^-?\d+(?:\.\d+)?$/.test(s)) return { value: null, reason: 'type_mismatch' };
      if (s.startsWith('-')) return { value: null, reason: 'negative_money' };
      if (s.includes('.')) return { value: null, reason: 'fractional_money' };
      if (s.length > 12 || Number(s) > MONEY_MAX) return { value: null, reason: 'amount_overflow' };
      if (!quotes.some((q) => CURRENCY.test(q))) return { value: null, reason: 'currency_ambiguous', status: 'ambiguous' };
      return { value: String(BigInt(s)), reason: null };
    }
    case 'number':
      return typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1e15 ? { value: v, reason: null } : { value: null, reason: 'type_mismatch' };
    case 'boolean':
      return typeof v === 'boolean' ? { value: v, reason: null } : { value: null, reason: 'type_mismatch' };
    case 'date': {
      const d = checkDate(v);
      return d ? { value: d, reason: null } : { value: null, reason: typeof v === 'string' ? 'invalid_date' : 'type_mismatch' };
    }
    case 'enum':
      return typeof v === 'string' && f.values!.includes(v) ? { value: v, reason: null } : { value: null, reason: 'type_mismatch' };
    default:
      return typeof v === 'string' && [...v].length <= 500 ? { value: v, reason: null } : { value: null, reason: 'type_mismatch' };
  }
}

export function validateExtract(raw: unknown, chunks: UtilityChunk[], fields: ExtractField[], origin: 'caller_supplied' | 'server'): ExtractInfoProposal {
  const o = obj(raw, 'root');
  only(o, ['fields'], 'root');
  const map = chunkMap(chunks);
  const byKey = new Map<string, Obj>();
  for (const [i, r] of arr(o.fields, 20, 'fields').entries()) {
    const x = obj(r, `fields[${i}]`);
    only(x, ['key', 'value', 'status', 'alternatives', 'evidence'], `fields[${i}]`);
    const k = str(x.key, 40, `fields[${i}].key`);
    if (!fields.some((f) => f.key === k) || byKey.has(k)) fail('schema', `fields[${i}].key`);
    byKey.set(k, x);
  }
  const out: Field[] = fields.map((f) => {
    const x = byKey.get(f.key);
    const evidence = x ? citesOf(x.evidence, map, UTILITY_LIMITS.evidencePerCriterion, `${f.key}.evidence`) : [];
    const claimed = x?.status;
    if (!x || claimed === 'missing' || x.value === null || x.value === undefined) {
      if (claimed === 'ambiguous') {
        const alts = arr(x!.alternatives, 3, `${f.key}.alternatives`).map((a) => typed(f, a, evidence.map((e) => e.quote)).value).filter((a) => a !== null);
        return { key: f.key, value: null, status: 'ambiguous', reason_code: 'conflicting_values', alternatives: alts, evidence };
      }
      return { key: f.key, value: null, status: 'missing', reason_code: 'missing_value', evidence: [] };
    }
    if (evidence.length === 0) return { key: f.key, value: null, status: 'invalid', reason_code: 'evidence_missing', evidence: [] };
    const t = typed(f, x.value, evidence.map((e) => e.quote));
    if (t.reason) return { key: f.key, value: null, status: t.status ?? 'invalid', reason_code: t.reason, evidence };
    return { key: f.key, value: t.value, status: 'extracted', reason_code: null, evidence };
  });
  const capped = capTotal(out);
  return { fields: capped, missing_required: fields.filter((f) => f.required && capped.find((x) => x.key === f.key)?.status !== 'extracted').map((f) => f.key), origin };
}

/** Đánh giá độ phù hợp cơ hội (KHÔNG phải xác suất chuyển đổi / tín dụng): đủ 4 tiêu chí có bằng chứng mới cộng điểm, thiếu → null. */
export function validateLead(raw: unknown, chunks: UtilityChunk[]): ScoreLeadProposal {
  const o = obj(raw, 'root');
  only(o, ['criteria', 'uncertainties'], 'root');
  const map = chunkMap(chunks);
  const got = new Map<string, Obj>();
  for (const [i, r] of arr(o.criteria, 4, 'criteria').entries()) {
    const x = obj(r, `criteria[${i}]`);
    only(x, ['key', 'score', 'reason', 'evidence'], `criteria[${i}]`);
    if (!(LEAD_CRITERIA as readonly unknown[]).includes(x.key) || got.has(x.key as string)) fail('schema', `criteria[${i}].key`);
    got.set(x.key as string, x);
  }
  const criteria = LEAD_CRITERIA.map((key) => {
    const x = got.get(key);
    const evidence = x ? citesOf(x.evidence, map, UTILITY_LIMITS.evidencePerCriterion, `${key}.evidence`) : [];
    const s = x?.score;
    if (s !== null && s !== undefined && !(Number.isInteger(s) && (s as number) >= 0 && (s as number) <= 25)) fail('schema', `${key}.score`);
    const ok = typeof s === 'number' && evidence.length > 0;
    const reason = x?.reason == null ? null : str(x.reason, 300, `${key}.reason`);
    return { key, score: ok ? (s as number) : null, reason: ok ? reason : null, evidence: ok ? evidence : [] };
  });
  const capped = capTotal(criteria);
  const full = capped.every((c) => c.score !== null);
  return {
    rubric_version: LEAD_RUBRIC_VERSION,
    status: full ? 'scored' : 'insufficient_evidence',
    score: full ? capped.reduce((n, c) => n + c.score!, 0) : null,
    criteria: capped,
    uncertainties: arr(o.uncertainties, 5, 'uncertainties').map((u, i) => str(u, 300, `uncertainties[${i}]`)),
  };
}
