// Cổng trích dẫn trước khi quyết gửi / gợi ý / chuyển người (TIP-020d §1.4, §4.2): chốt binding câu trả lời rồi mới dùng chữ. Trích dẫn
// hỏng → không tự gửi, chuyển người (`citation_invalid`) và KHÔNG giữ nháp mang trích dẫn giả; trả lời có tài liệu mà không nêu nguồn →
// không tự gửi như có căn cứ (`citation_missing`, nháp giữ để người xem lại); không có tài liệu / trích dẫn hợp lệ → luồng thường. Mất lease
// (huỷ / bị thay) → `superseded`. Chữ dùng tiếp = đúng chữ đã kiểm (đã trim + khôi phục PII) — không phải chữ khác.
import type { TenantDb } from '@appchat/db';
import type { AgentReply } from '@appchat/ai';
import { finalizeAnswer } from './publication';

export type AnswerGate =
  | { kind: 'pass'; reply: string | null }
  | { kind: 'handoff'; reason: 'citation_invalid' | 'citation_missing'; draft: string | null }
  | { kind: 'superseded' };

export async function gateAnswer(db: TenantDb, runId: string, raw: string, out: AgentReply & { ok: boolean }, reply: string | null, pii: Record<string, string>, now: Date): Promise<AnswerGate> {
  const r = await db.aiRun.findUnique({ where: { id: runId }, select: { citationPhase: true } });
  // Run không ở chế độ trích dẫn (run cũ / kiểu khác) hoặc không có câu trả lời → luồng thường.
  if (!r?.citationPhase || !out.ok || !reply) return { kind: 'pass', reply };
  const o = await finalizeAnswer(db, runId, raw, out, pii, now);
  if (!o) return { kind: 'superseded' };
  if (o.kind === 'invalid') return { kind: 'handoff', reason: 'citation_invalid', draft: null };
  if (o.kind === 'missing') return { kind: 'handoff', reason: 'citation_missing', draft: o.text };
  return { kind: 'pass', reply: o.text };
}
