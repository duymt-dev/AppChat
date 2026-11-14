// Pha phân loại ý định khách với báo giá (TIP-022c §1.2–1.5): giải báo giá ĐÃ GỬI của chính họ khách (theo quyền ghi hiện hành của
// agent), gọi model MỘT lượt qua AiRunner (run con `consult` dưới gốc lượt — chung ngân sách / huỷ 019b, không tool, không SDK trong core),
// kiểm schema đóng + đoạn trích nguyên văn + ngưỡng 70% không làm tròn. Nhiều báo giá mà khách không nói rõ / không thấy mã → hỏi lại;
// không bao giờ tự chọn báo giá mới nhất. Kết quả (đã kiểm) dùng lại trong cùng lượt cho cùng nguồn + báo giá (không gọi lại để "cao hơn").
import { prompt } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import { parseModelJson, type AuthzContext } from '@appchat/shared';
import { CUSTOMER_INTENT_ACTIONS, CUSTOMER_INTENT_MIN_PCT, type CustomerIntentAction } from '../../kernel/actions/customer-intent';
import { familyIds } from '../../crm/lifecycle/lock';
import { visibleQuote, type QuoteRecord } from '../../sales/quotes/quote-access';
import { runOnce } from '../agents/agent.runtime';
import type { AiRunner } from '../runs/runner';
import type { Classification, ClassifiedIntent, Deny, TrustedSource } from './types';

const DECIDABLE = ['sent', 'viewed'] as const;
const INTENTS: readonly ClassifiedIntent[] = ['accept', 'revise', 'reject', 'none', 'ambiguous'];
const CODE = /^[A-Za-z]{1,6}-?\d{1,8}$/;

/** Báo giá có thể quyết định của họ khách mà agent ghi được (quyền hiện hành của lời gọi). Chỉ id + mã + trạng thái — không dòng / giá. */
export async function decidableQuotes(db: TenantDb, authz: AuthzContext, src: TrustedSource): Promise<QuoteRecord[]> {
  const family = await familyIds(db, src.rootContactId).catch(() => [src.rootContactId]);
  const rows = await db.quote.findMany({
    where: { contactId: { in: [...new Set([...family, src.contactId])] }, deletedAt: null, status: { in: [...DECIDABLE] } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 20,
    select: { id: true },
  });
  const out: QuoteRecord[] = [];
  for (const r of rows) {
    const q = await db.$transaction((tx) => visibleQuote(tx as never, authz, r.id, 'write')).catch(() => null);
    if (q) out.push(q);
  }
  return out;
}

/** Ghép prompt: luật cố định (system) + dữ liệu đã che PII (user) — tin khách / mã báo giá là DỮ LIỆU, không phải chỉ dẫn. */
export function intentPrompt(locale: 'vi' | 'en', src: TrustedSource, quotes: readonly Pick<QuoteRecord, 'code' | 'version' | 'status'>[]) {
  const msgs = src.messages.map((m) => `[${m.ref}] ${JSON.stringify(m.masked)}`).join('\n');
  const list = quotes.map((q) => `- ${q.code} (v${q.version}, ${q.status})`).join('\n') || '-';
  return { system: prompt('sales-intent', locale).text, user: `# TIN KHÁCH\n${msgs}\n\n# BÁO GIÁ ĐÃ GỬI CỦA KHÁCH\n${list}` };
}

/**
 * Kiểm đầu ra model (§1.3–1.4): schema đóng, `confidence_pct` là SỐ trong [0, 100] (chuỗi / NaN / ngoài khoảng → không thực thi được),
 * mọi đoạn trích phải là chuỗi con NGUYÊN VĂN của tin đã che tương ứng. Sai → null (không thực thi, hỏi lại / chuyển người).
 */
export function parseClassification(raw: string, src: TrustedSource): Classification | null {
  let v: unknown;
  try {
    v = parseModelJson(raw);
  } catch {
    return null;
  }
  const o = (v ?? {}) as Record<string, unknown>;
  if (typeof o.intent !== 'string' || !INTENTS.includes(o.intent as ClassifiedIntent)) return null;
  const pct = o.confidence_pct;
  if (typeof pct !== 'number' || !Number.isFinite(pct) || pct < 0 || pct > 100) return null;
  const code = o.quote_code === null || o.quote_code === undefined ? null : typeof o.quote_code === 'string' && CODE.test(o.quote_code.trim()) ? o.quote_code.trim().toUpperCase() : undefined;
  if (code === undefined || !Array.isArray(o.evidence) || o.evidence.length > 5) return null;
  const byRef = new Map(src.messages.map((m) => [m.ref, m.masked]));
  const evidence: Classification['evidence'] = [];
  for (const e of o.evidence) {
    const x = (e ?? {}) as { message?: unknown; quote?: unknown };
    if (typeof x.message !== 'string' || typeof x.quote !== 'string' || !x.quote.trim() || x.quote.length > 500) return null;
    const text = byRef.get(x.message);
    if (text === undefined || !text.includes(x.quote)) return null;
    evidence.push({ message: x.message, quote: x.quote });
  }
  return { intent: o.intent as ClassifiedIntent, quoteCode: code, evidence, confidencePct: pct };
}

export interface IntentDecision {
  quote: QuoteRecord;
  classification: Classification;
  classifierRunId: string;
}

/**
 * Báo giá đích từ phân loại: mã khách nhắc phải khớp đúng MỘT báo giá có thể quyết định; không mã + đúng một báo giá → báo giá đó; còn lại
 * → hỏi lại. Ý định phải khớp action được gọi và ≥ 70% (so số thực, không làm tròn) — không thì không có căn cứ.
 */
export function admitDecision(c: Classification, quotes: readonly QuoteRecord[], actionId: CustomerIntentAction): QuoteRecord | Deny {
  if (c.intent === 'none') return { deny: 'intent_unclear' };
  if (c.intent === 'ambiguous') return { deny: 'quote_ambiguous' };
  if (c.intent !== CUSTOMER_INTENT_ACTIONS[actionId]) return { deny: 'intent_mismatch' };
  if (!(c.confidencePct >= CUSTOMER_INTENT_MIN_PCT)) return { deny: 'low_confidence' };
  if (!c.evidence.length) return { deny: 'intent_invalid' };
  const hits = c.quoteCode ? quotes.filter((q) => q.code.toUpperCase() === c.quoteCode) : quotes;
  if (hits.length === 1) return hits[0]!;
  return { deny: hits.length ? 'quote_ambiguous' : quotes.length ? 'quote_not_found' : 'quote_not_open' };
}

export interface ClassifyDeps {
  db: TenantDb;
  runner: AiRunner;
  now: () => Date;
  ws: string;
  /** Run lượt agent đang gọi tool — run phân loại là con dưới run này (chung gốc / ngân sách). */
  parentRunId: string;
  locale: 'vi' | 'en';
  tier: string;
}

/** Một lượt model chỉ đọc (khoá con theo nguồn → gọi lại cùng nguồn trong lượt dùng lại kết quả, không gọi model lần hai). */
export async function classifyIntent(d: ClassifyDeps, src: TrustedSource, quotes: readonly QuoteRecord[]): Promise<{ c: Classification | null; runId: string; failed: boolean }> {
  const p = intentPrompt(d.locale, src, quotes);
  const r = await runOnce(d.db, d.runner, d.now, d.ws, {
    run: { kind: 'consult', title: 'sales-intent', tier: d.tier, conversationId: src.conversationId, input: { action_id: 'sales.intent', source_ids: src.messages.map((m) => m.id) } },
    system: p.system,
    prompt: p.user,
    source: 'inbox',
    parent: { parentRunId: d.parentRunId, childKey: `sales-intent:${src.digest.slice(0, 24)}` },
  });
  if (r.status !== 'completed') return { c: null, runId: r.runId, failed: true };
  return { c: parseClassification(r.text, src), runId: r.runId, failed: false };
}
