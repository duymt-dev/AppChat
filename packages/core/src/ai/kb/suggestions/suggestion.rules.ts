// Luật thuần của hàng chờ học từ hội thoại (TIP-043, rag §9): fingerprint chống trùng, kiểm cặp do model trả (mã tin phải thuộc tập đã
// gửi; câu hỏi từ tin khách; câu trả lời từ nhân viên, hoặc agent được chính khách xác nhận sau đó), loại cặp chỉ chứa dữ liệu biến động
// (giá / tồn / lịch trống / công nợ) và cặp còn dấu vết PII sau khi che. Không phụ thuộc DB — test ở packages/core/test/kb-suggestions.test.ts.
import { createHash } from 'node:crypto';
import { hasPrice, redactForKnowledge, sensitiveLeft, type KnowledgeContext } from '@appchat/ai';
import { KB_SUGGESTION_LIMITS, foldText } from '@appchat/shared';

export type Sender = 'contact' | 'user' | 'agent';
export interface InputMessage {
  id: string;
  sender: Sender;
  body: string;
}
export interface ProposedPair {
  question: string;
  answer: string;
  source_message_ids: string[];
}
export interface CheckedPair extends ProposedPair {
  fingerprint: string;
}

export const MAX_PAIRS = 5;
export const MAX_MESSAGES = 100;
/** Lời khách xác nhận câu trả lời của agent là đúng / hữu ích. */
const PRAISE = /(cảm ơn|cám ơn|thank|đúng rồi|chuẩn rồi|ok\b|oke|okay|tuyệt|hay quá|rõ rồi|hiểu rồi|great|perfect|that's right|got it)/iu;
/** Dữ liệu thay đổi theo thời điểm / từng khách — AI tra bằng công cụ, không lưu cố định (rag §2). */
const VOLATILE = /(còn hàng|hết hàng|tồn kho|in stock|out of stock|còn (?:lịch|chỗ|slot)|lịch trống|free slot|công nợ|còn nợ|receivable|mã đơn|order code)/iu;

const norm = (s: string) => foldText(s).replace(/\s+/g, ' ').trim();

/** Hash hội thoại + tin gốc + nội dung chuẩn hoá (không dấu, không phân biệt hoa thường) — event / job lặp không thêm cùng cặp. */
export function fingerprintOf(conversationId: string, p: ProposedPair): string {
  const ids = [...new Set(p.source_message_ids)].sort().join(',');
  return createHash('sha256').update(`${conversationId}|${ids}|${norm(p.question)}|${norm(p.answer)}`).digest('hex');
}

export type Rejection = 'unknown_message' | 'no_customer_question' | 'no_valid_answer' | 'volatile' | 'sensitive' | 'empty' | 'too_long' | 'duplicate';

/**
 * Kiểm một cặp model đề xuất trên tập tin đã gửi. Câu trả lời agent chỉ hợp lệ khi có tin KHÁCH đứng SAU nó trong tập id cặp, có lời
 * xác nhận — câu agent tự khen không tính. Sau đó che PII lần nữa (output model) và bỏ cặp còn dấu vết.
 */
export function checkPair(p: ProposedPair, msgs: readonly InputMessage[], ctx: KnowledgeContext): { ok: true; pair: ProposedPair } | { ok: false; reason: Rejection } {
  const order = new Map(msgs.map((m, i) => [m.id, i]));
  const ids = [...new Set(p.source_message_ids)];
  if (!ids.length || ids.some((id) => !order.has(id))) return { ok: false, reason: 'unknown_message' };
  const used = ids.map((id) => msgs[order.get(id)!]!).sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  const q = used.findIndex((m) => m.sender === 'contact');
  if (q < 0) return { ok: false, reason: 'no_customer_question' };
  const after = used.slice(q + 1);
  const staff = after.some((m) => m.sender === 'user');
  const agentAt = after.findIndex((m) => m.sender === 'agent');
  const confirmed = agentAt >= 0 && after.slice(agentAt + 1).some((m) => m.sender === 'contact' && PRAISE.test(m.body));
  if (!staff && !confirmed) return { ok: false, reason: 'no_valid_answer' };
  const question = redactForKnowledge(p.question, ctx).trim();
  const answer = redactForKnowledge(p.answer, ctx).trim();
  if (!question || !answer) return { ok: false, reason: 'empty' };
  if (question.length > KB_SUGGESTION_LIMITS.question || answer.length > KB_SUGGESTION_LIMITS.answer) return { ok: false, reason: 'too_long' };
  if (hasPrice(answer) || VOLATILE.test(answer) || VOLATILE.test(question)) return { ok: false, reason: 'volatile' };
  if (sensitiveLeft(question, ctx) || sensitiveLeft(answer, ctx)) return { ok: false, reason: 'sensitive' };
  return { ok: true, pair: { question, answer, source_message_ids: ids } };
}

/** Lọc + chống trùng trong cùng lô (tối đa MAX_PAIRS). */
export function checkPairs(conversationId: string, pairs: readonly ProposedPair[], msgs: readonly InputMessage[], ctx: KnowledgeContext): { pairs: CheckedPair[]; rejected: Rejection[] } {
  const out: CheckedPair[] = [];
  const rejected: Rejection[] = [];
  const seen = new Set<string>();
  for (const p of pairs.slice(0, MAX_PAIRS)) {
    const r = checkPair(p, msgs, ctx);
    if (!r.ok) {
      rejected.push(r.reason);
      continue;
    }
    const fingerprint = fingerprintOf(conversationId, r.pair);
    if (seen.has(fingerprint)) {
      rejected.push('duplicate');
      continue;
    }
    seen.add(fingerprint);
    out.push({ ...r.pair, fingerprint });
  }
  return { pairs: out, rejected };
}

/** Nội dung người duyệt sửa: che lại + kiểm còn PII (sensitive_data → 422), độ dài sau trim. */
export function reviewText(question: string, answer: string, ctx: KnowledgeContext): { question: string; answer: string } | { field: 'question' | 'answer'; code: string } {
  const q = question.trim();
  const a = answer.trim();
  if (!q) return { field: 'question', code: 'required' };
  if (!a) return { field: 'answer', code: 'required' };
  if (q.length > KB_SUGGESTION_LIMITS.question) return { field: 'question', code: 'too_long' };
  if (a.length > KB_SUGGESTION_LIMITS.answer) return { field: 'answer', code: 'too_long' };
  const sq = sensitiveLeft(q, ctx);
  if (sq) return { field: 'question', code: `sensitive_data:${sq}` };
  const sa = sensitiveLeft(a, ctx);
  if (sa) return { field: 'answer', code: `sensitive_data:${sa}` };
  return { question: q, answer: a };
}

/** Nguồn RAG từ đề xuất đã duyệt: hỏi + đáp (một đoạn). */
export const sourceBody = (question: string, answer: string, locale = 'vi') => (locale === 'en' ? `Question: ${question}\nAnswer: ${answer}` : `Câu hỏi: ${question}\nTrả lời: ${answer}`);
